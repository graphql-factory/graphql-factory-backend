import _ from 'lodash'
import Promise from 'bluebird'
import { violatesUnique, existsFilter } from '../common/filter'

/**
 * Create resolver - used as a standard create resolver function
 * @param {Object} backend - factory backend instance
 * @param {String} type - GraphQL type name to create
 * @param {Boolean} [batchMode=false] - allow batch changes
 * @returns {Function}
 */
export default function create (backend, type, batchMode = false) {
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
    let fnPath = `backend_${batchMode ? 'batchC' : 'c'}reate${type}`

    // ensure that the args are an array
    args = batchMode
      ? args.batch
      : [args]


    // create new promise
    return new Promise((resolve, reject) => {
      let beforeHook = _.get(before, fnPath, (args, backend, done) => done())
      let afterHook = _.get(after, fnPath, (result, args, backend, done) => done(null, result))
      let errorHook = _.get(error, fnPath, (err, args, backend, done) => reject(err))
      let hookArgs = { source, args: batchMode ? args : _.first(args), context, info }
      let create = null

      // run before hook
      return beforeHook.call(this, hookArgs, backend, (error) => {
        if (error) return errorHook(error, hookArgs, backend, reject)

        // handle temporal plugin
        if (hasTemporalPlugin && isVersioned) {
          // check that temporal create is allowed
          if (temporalDef.create === false) {
            return errorHook(
              new Error('create is not allowed on this temporal type'),
              hookArgs,
              backend,
              reject
            )
          }

          // if a function was specified, use it
          if (_.isFunction(temporalDef.create)) {
            return resolve(temporalDef.create.call(this, source, args, context, info))
          }

          // if a resolver reference, use that if it exists
          else if (_.isString(temporalDef.create)) {
            let temporalCreate = _.get(definition, `functions["${temporalDef.create}"]`)
            if (!_.isFunction(temporalCreate)) {
              return errorHook(
                new Error(`cannot find function "${temporalDef.create}"`),
                hookArgs,
                backend,
                reject
              )
            }
            return resolve(temporalCreate.call(this, source, args, context, info))
          }

          // otherwise use the default version update function
          else {
            let versionCreate = _.get(this, `globals["${temporalExt}"].temporalCreate`)
            if (!_.isFunction(versionCreate)) {
              return errorHook(
                new Error(`could not find "temporalCreate" in globals`),
                hookArgs,
                backend,
                reject
              )
            }
            create = batchMode
              ? versionCreate(type, args).coerceTo('ARRAY')
              : versionCreate(type, args).coerceTo('ARRAY').nth(0)
          }
        }

        // handle standard create
        else {
          // generate a create query with checks
          create = violatesUnique(backend, type, args, collection)
            .branch(
              r.error('unique field violation'),
              existsFilter(backend, type, args)
                .not()
                .branch(
                  r.error('one or more related records were not found'),
                  collection.insert(args, { returnChanges: true })
                    .do((summary) => {
                      return summary('errors').ne(0).branch(
                        r.error(summary('first_error')),
                        summary('changes')('new_val')
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
        return create.run(_connection)
          .then((result) => {
            return afterHook.call(this, result, hookArgs, backend, (error, result) => {
              if (error) return errorHook(error, hookArgs, backend, reject)
              return resolve(result)
            })
          })
          .catch((error) => {
            return errorHook(error, hookArgs, backend, reject)
          })
      })
    })
      .timeout(timeout || 10000)
  }
}