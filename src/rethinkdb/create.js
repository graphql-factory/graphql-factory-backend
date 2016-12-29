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
    let { before, after, timeout } = backend.getTypeInfo(type, info)
    let q = Q(backend)
    let collection = backend.getCollection(type)
    let fnPath = `backend_create${type}`
    let beforeHook = _.get(before, fnPath, (args, backend, done) => done())
    let afterHook = _.get(after, fnPath, (result, args, backend, done) => done(null, result))

    return new Promise((resolve, reject) => {
      return beforeHook.call(this, { source, args, context, info }, backend, (err) => {
        if (err) return reject(err)
        let create = null

        // handle temporal plugin
        if (hasTemporalPlugin && isVersioned) {
          if (temporalDef.create === false) return reject(new Error('create is not allowed on this temporal type'))
          if (_.isFunction(temporalDef.create)) {
            return resolve(temporalDef.create.call(this, source, args, context, info))
          } else if (_.isString(temporalDef.create)) {
            let temporalCreate = _.get(definition, `functions["${temporalDef.create}"]`)
            if (!_.isFunction(temporalCreate)) {
              return reject(new Error(`cannot find function "${temporalDef.create}"`))
            }
            return resolve(temporalCreate.call(this, source, args, context, info))
          } else {
            let versionCreate = _.get(this, `globals["${temporalExt}"].temporalCreate`)
            if (!_.isFunction(versionCreate)) {
              return reject(new Error(`could not find "temporalCreate" in globals`))
            }
            create = versionCreate(type, args)
          }
        } else {
          create = violatesUnique(backend, type, args, collection)
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