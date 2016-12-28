import _ from 'lodash'
import Promise from 'bluebird'
import Q from './q'

export default function del (backend, type) {
  // temporal plugin details
  let hasTemporalPlugin = backend.definition.hasPlugin('GraphQLFactoryTemporal')
  let temporalExt = backend._temporalExtension
  let typeDef = _.get(backend.definition, `types["${type}"]`)
  let temporalDef = _.get(typeDef, `["${temporalExt}"]`)
  let isVersioned = _.get(temporalDef, `versioned`) === true

  return function (source, args, context = {}, info) {
    let { connection, definition } = backend
    let { before, after, timeout } = backend.getTypeInfo(type, info)
    let q = Q(backend)
    let fnPath = `backend_delete${type}`
    let beforeHook = _.get(before, fnPath, (args, backend, done) => done())
    let afterHook = _.get(after, fnPath, (result, args, backend, done) => done(result))

    return new Promise((resolve, reject) => {
      return beforeHook.call(this, { source, args, context, info }, backend, (err) => {
        if (err) return reject(err)
        let del = null

        // handle temporal plugin
        if (hasTemporalPlugin && isVersioned) {
          if (temporalDef.delete === false) return reject(new Error('delete is not allowed on this temporal type'))
          if (_.isFunction(temporalDef.delete)) {
            del = temporalDef.delete.call(this, source, args, context, info)
          } else if (_.isString(temporalDef.delete)) {
            let temporalDelete = _.get(definition, `functions["${temporalDef.delete}"]`)
            if (!_.isFunction(temporalDelete)) {
              return reject(new Error(`cannot find function "${temporalDef.delete}"`))
            }
            del = temporalDelete.call(this, source, args, context, info)
          } else {
            let versionDelete = _.get(this, `globals["${temporalExt}"].temporalDelete`)
            if (!_.isFunction(versionDelete)) {
              return reject(new Error(`could not find "temporalDelete" in globals`))
            }
            del = versionDelete(type, args)
          }
        } else {
          del = q.type(type).delete(args)
        }

        return del.run(connection)
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