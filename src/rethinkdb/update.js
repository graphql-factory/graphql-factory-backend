import _ from 'lodash'
import Promise from 'bluebird'
import Q from './q'
import { notThisRecord, violatesUnique } from './filter'

export default function update (backend, type) {
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
    let id = backend.getPrimaryFromArgs(type, args)
    let fnPath = `backend_update${type}`
    let beforeHook = _.get(before, fnPath, (args, backend, done) => done())
    let afterHook = _.get(after, fnPath, (result, args, backend, done) => done(null, result))

    return new Promise((resolve, reject) => {
      return beforeHook.call(this, { source, args, context, info }, backend, (err) => {
        if (err) return reject(err)
        let update = null

        // handle temporal plugin
        if (hasTemporalPlugin && isVersioned) {
          if (temporalDef.update === false) return reject(new Error('update is not allowed on this temporal type'))
          if (_.isFunction(temporalDef.update)) {
            return resolve(temporalDef.update.call(this, source, args, context, info))
          } else if (_.isString(temporalDef.update)) {
            let temporalUpdate = _.get(definition, `functions["${temporalDef.update}"]`)
            if (!_.isFunction(temporalUpdate)) {
              return reject(new Error(`cannot find function "${temporalDef.update}"`))
            }
            return resolve(temporalUpdate.call(this, source, args, context, info))
          } else {
            let versionUpdate = _.get(this, `globals["${temporalExt}"].temporalUpdate`)
            if (!_.isFunction(versionUpdate)) {
              return reject(new Error(`could not find "temporalUpdate" in globals`))
            }
            update = versionUpdate(type, args)
          }
        } else {
          let notThis = notThisRecord(backend, type, args, collection)
          update = violatesUnique(backend, type, args, notThis)
            .branch(
              r.error('unique field violation'),
              q.type(type)
                .update(args, { exists: backend.getRelatedValues(type, args) })
                .do(() => q.type(type).get(id).value())
                .value()
            )
        }

        return update.run(connection)
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