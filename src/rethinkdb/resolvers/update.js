import _ from 'lodash'
import Promise from 'bluebird'
import Q from '../common/q'
import { notThisRecord, violatesUnique } from '../common/filter'

export default function update (backend, type, batchMode = false) {
  // temporal plugin details
  let hasTemporalPlugin = backend.definition.hasPlugin('GraphQLFactoryTemporal')
  let temporalExt = backend._temporalExtension
  let typeDef = _.get(backend.definition, `types["${type}"]`)
  let temporalDef = _.get(typeDef, `["${temporalExt}"]`)
  let isVersioned = _.get(temporalDef, `versioned`) === true

  return function (source, args, context = {}, info) {
    let { r, connection, definition } = backend
    let { before, after, timeout, primaryKey } = backend.getTypeInfo(type, info)
    let q = Q(backend)
    let collection = backend.getCollection(type)
    let fnPath = `backend_${batchMode ? 'batchU' : 'u'}pdate${type}`
    let beforeHook = _.get(before, fnPath, (args, backend, done) => done())
    let afterHook = _.get(after, fnPath, (result, args, backend, done) => done(null, result))
    args = batchMode ? args.batch : args
    let argArr = _.isArray(args) ? args : [args]

    let ids = _.map(_.filter(argArr, primaryKey), primaryKey)
    if (ids.length !== argArr.length) return r.error('missing primary key on one or more inputs')

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
            update = batchMode
              ? versionUpdate(type, args).coerceTo('ARRAY')
              : versionUpdate(type, args).coerceTo('ARRAY').nth(0)
          }
        } else {
          let notThis = collection.filter((f) => r.expr(ids).contains(f(primaryKey)).not())

          update = violatesUnique(backend, type, args, notThis)
            .branch(
              r.error('unique field violation'),
              q.type(type)
                .update(args, {
                  exists: _.isArray(args)
                    ? _.map((args) => backend.getRelatedValues(type, arg))
                    : [backend.getRelatedValues(type, args)]
                })
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