import _ from 'lodash'
import Promise from 'bluebird'

/**
 * Delete resolver - used as a standard delete resolver function
 * @param {Object} backend - factory backend instance
 * @param {String} type - GraphQL type name to create
 * @param {Boolean} [batchMode=false] - allow batch changes
 * @returns {Function}
 */
export default function del (backend, type, batchMode = false) {
  return function (source, args, context = {}, info) {
    // temporal plugin details
    let hasTemporalPlugin = backend.definition.hasPlugin('GraphQLFactoryTemporal')
    let temporalExt = backend._temporalExtension
    let typeDef = _.get(backend.definition, `types["${type}"]`)
    let temporalDef = _.get(typeDef, `["${temporalExt}"]`)
    let isVersioned = _.get(temporalDef, `versioned`) === true

    // standard details
    let { r, _connection, definition } = backend
    let { before, after, error, timeout, primaryKey } = backend.getTypeInfo(type, info)
    let collection = backend.getCollection(type)
    let fnPath = `backend_${batchMode ? 'batchD' : 'd'}elete${type}`

    // ensure that the args are an array
    args = batchMode
      ? args.batch
      : [args]

    // create a new promise
    return new Promise((resolve, reject) => {
      let beforeHook = _.get(before, fnPath)
      let afterHook = _.get(after, fnPath)
      let errorHook = _.get(error, fnPath)
      let hookArgs = { source, args: batchMode ? args : _.first(args), context, info }

      return backend.beforeMiddleware(this, beforeHook, hookArgs, backend, (error) => {
        if (error) return backend.errorMiddleware(this, errorHook, error, hookArgs, backend, reject)

        // pull the ids from the args
        let del = null
        let ids = _.map(_.filter(args, primaryKey), primaryKey)
        if (ids.length !== args.length) {
          return backend.errorMiddleware(
            this,
            errorHook,
            new Error(`missing primaryKey "${primaryKey}" in update argument`),
            hookArgs,
            backend,
            reject
          )
        }

        // handle temporal plugin
        if (hasTemporalPlugin && isVersioned) {
          // check that temporal update is allowed
          if (temporalDef.delete === false) {
            return backend.errorMiddleware(
              this,
              errorHook,
              new Error('delete is not allowed on this temporal type'),
              hookArgs,
              backend,
              reject
            )
          }

          // if a function was specified, use it
          if (_.isFunction(temporalDef.delete)) {
            return resolve(temporalDef.delete.call(this, source, args, context, info))
          }

          // if a resolver reference, use that if it exists
          else if (_.isString(temporalDef.delete)) {
            let temporalDelete = _.get(definition, `functions["${temporalDef.delete}"]`)
            if (!_.isFunction(temporalDelete)) {
              return backend.errorMiddleware(
                this,
                errorHook,
                new Error(`cannot find function "${temporalDef.delete}"`),
                hookArgs,
                backend,
                reject
              )
            }
            return resolve(temporalDelete.call(this, source, args, context, info))
          }

          // otherwise use the default version update function
          else {
            let versionDelete = _.get(this, `globals["${temporalExt}"].temporalDelete`)
            if (!_.isFunction(versionDelete)) {
              return backend.errorMiddleware(
                this,
                errorHook,
                new Error(`could not find "temporalDelete" in globals`),
                hookArgs,
                backend,
                reject
              )
            }
            del = versionDelete(type, args)
          }
        }

        // handle standard delete
        else {
          del = r.expr(ids).forEach((id) => {
            return collection.get(id).eq(null).branch(
              r.error(`${type} with id ${id} was not found and cannot be deleted`),
              collection.get(id).delete({ returnChanges: true })
            )
          })
            .do((summary) => {
              return summary('errors').ne(0).branch(
                r.error(summary('first_error')),
                summary('deleted')
              )
            })
        }

        // run the query
        del.run(_connection)
          .then((result) => {
            return backend.afterMiddleware(this, afterHook, result, hookArgs, backend, (error, result) => {
              if (error) return backend.errorMiddleware(this, errorHook, error, hookArgs, backend, reject)
              return resolve(result)
            })
          })
          .catch((error) => {
            return backend.errorMiddleware(this, errorHook, error, hookArgs, backend, reject)
          })
      })
    })
      .timeout(timeout || 10000)
  }
}