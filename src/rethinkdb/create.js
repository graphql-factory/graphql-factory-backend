import _ from 'lodash'
import Promise from 'bluebird'
import Q from './q'
import { violatesUnique } from './filter'

export default function create (backend, type) {
  // temporal plugin details
  let hasTemporalPlugin = backend.definition.hasPlugin('GraphQLFactoryTemporal')
  let temporalExt = backend._temporalExtension
  let typeDef = _.get(backend.definition, `types["${type}"]`)
  let temporalDef = _.get(typeDef, `["${temporalExt}"]`)
  let isVersioned = _.get(temporalDef, `versioned`) === true

  return function (source, args, context = {}, info) {
    let { r, connection, definition } = backend
    let { collection, store, before, after, timeout } = backend.getTypeInfo(type, info)
    let q = Q(backend)
    let table = r.db(store).table(collection)
    let fnPath = `backend_create${type}`
    let beforeHook = _.get(before, fnPath, (args, backend, done) => done())
    let afterHook = _.get(after, fnPath, (result, args, backend, done) => done(result))

    return new Promise((resolve, reject) => {
      return beforeHook.call(this, { source, args, context, info }, backend, (err) => {
        if (err) return reject(err)
        let create = null

        // handle temporal plugin
        if (hasTemporalPlugin && isVersioned && temporalDef.create !== false) {
          if (_.isFunction(temporalDef.create)) {
            create = temporalDef.create.call(this, source, args, context, info)
          } else if (_.isString(temporalDef.read)) {
            let temporalCreate = _.get(definition, `functions["${temporalDef.create}"]`)
            if (!_.isFunction(temporalCreate)) {
              return reject(new Error(`cannot find function "${temporalDef.create}"`))
            }
            create = temporalCreate.call(this, source, args, context, info)
          } else {
            let versionCreate = _.get(this, `globals["${temporalExt}"]["createTemporal${type}"]`)
            if (!_.isFunction(versionCreate)) {
              return reject(new Error(`could not find "createTemporal${type}" in globals`))
            }
            create = versionCreate(args)
          }
        } else {
          create = violatesUnique(backend, type, args, table)
            .branch(
              r.error('unique field violation'),
              q.type(type)
                .insert(args, { exists: backend.getRelatedValues(type, args) })
                .value()
            )
        }

        return create.run(connection)
          .then((result) => {
            return afterHook.call(this, result, args, backend, (err, result) => {
              if (err) return reject(err)
              return resolve(result)
            })
          })
          .catch(reject)
      })
    })
      .timeout(timeout || 10000)
  }
}