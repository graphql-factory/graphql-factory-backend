import _ from 'lodash'
import Promise from 'bluebird'
import { violatesUnique, existsFilter } from '../common/filter'

/**
 * Update resolver - used as a standard update resolver function
 * @param {Object} backend - factory backend instance
 * @param {String} type - GraphQL type name to create
 * @param {Boolean} [batchMode=false] - allow batch changes
 * @returns {Function}
 */
export default function (backend, type, batchMode = false) {
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
    let fnPath = `backend_${batchMode ? 'batchU' : 'u'}pdate${type}`

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

      // run before hook
      return backend.beforeMiddleware(this, beforeHook, hookArgs, backend, (error) => {
        if (error) return backend.errorMiddleware(this, errorHook, error, hookArgs, backend, reject)

        // pull the ids from the args
        let update = null
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
          if (temporalDef.update === false) {
            return backend.errorMiddleware(
              this,
              errorHook,
              new Error('update is not allowed on this temporal type'),
              hookArgs,
              backend,
              reject
            )
          }

          // if a function was specified, use it
          if (_.isFunction(temporalDef.update)) {
            return resolve(temporalDef.update.call(this, source, args, context, info))
          }

          // if a resolver reference, use that if it exists
          else if (_.isString(temporalDef.update)) {
            let temporalUpdate = _.get(definition, `functions["${temporalDef.update}"]`)
            if (!_.isFunction(temporalUpdate)) {
              return backend.errorMiddleware(
                this,
                errorHook,
                new Error(`cannot find function "${temporalDef.update}"`),
                hookArgs,
                backend,
                reject
              )
            }
            return resolve(temporalUpdate.call(this, source, args, context, info))
          }

          // otherwise use the default version update function
          else {
            let versionUpdate = _.get(this, `globals["${temporalExt}"].temporalUpdate`)
            if (!_.isFunction(versionUpdate)) {
              return backend.errorMiddleware(
                this,
                errorHook,
                new Error(`could not find "temporalUpdate" in globals`),
                hookArgs,
                backend,
                reject
              )
            }
            update = versionUpdate(type, args)
          }
        }

        // handle standard update
        else {
          // filter out the current selections
          let notThese = collection.filter((f) => r.expr(ids).contains(f(primaryKey)).not())

          // generate an update query with checks
          update = violatesUnique(backend, type, args, notThese)
            .branch(
              r.error('unique field violation'),
              existsFilter(backend, type, args)
                .not()
                .branch(
                  r.error('one or more related records were not found'),
                  r.expr(args).forEach((arg) => {
                    return collection.get(arg(primaryKey)).eq(null).branch(
                      r.error(`${type} with id ${arg(primaryKey)} was not found, and could not be updated`),
                      collection.get(arg(primaryKey)).update(arg, { returnChanges: true })
                    )
                  })
                    .do((summary) => {
                      return summary('errors').ne(0).branch(
                        r.error(summary('first_error')),
                        collection.filter((f) => r.expr(ids).contains(f(primaryKey)))
                          .coerceTo('ARRAY')
                          .do((results) => {
                            return r.expr(batchMode).branch(
                              results,
                              results.nth(0).default(null)
                            )
                          })
                      )
                    })
                )
            )
        }

        // run the query
        update.run(_connection)
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