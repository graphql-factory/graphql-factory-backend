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
    let { before, after, timeout, primaryKey } = backend.getTypeInfo(type, info)
    let collection = backend.getCollection(type)
    let fnPath = `backend_${batchMode ? 'batchC' : 'c'}reate${type}`
    let beforeHook = _.get(before, fnPath, (args, backend, done) => done())
    let afterHook = _.get(after, fnPath, (result, args, backend, done) => done(null, result))

    // ensure that the args are an array
    args = batchMode
      ? args.batch
      : [args]


    // create new promise
    return new Promise((resolve, reject) => {
      let create = null

      // run before hook
      return beforeHook.call(this, {
        source,
        args: batchMode ? args : _.first(args),
        context,
        info
      }, backend, (error) => {
        if (error) return reject(error)

        // handle temporal plugin
        if (hasTemporalPlugin && isVersioned) {
          // check that temporal create is allowed
          if (temporalDef.create === false) return reject(new Error('create is not allowed on this temporal type'))

          // if a function was specified, use it
          if (_.isFunction(temporalDef.create)) {
            return resolve(temporalDef.create.call(this, source, args, context, info))
          }

          // if a resolver reference, use that if it exists
          else if (_.isString(temporalDef.create)) {
            let temporalCreate = _.get(definition, `functions["${temporalDef.create}"]`)
            if (!_.isFunction(temporalCreate)) {
              return reject(new Error(`cannot find function "${temporalDef.create}"`))
            }
            return resolve(temporalCreate.call(this, source, args, context, info))
          }

          // otherwise use the default version update function
          else {
            let versionCreate = _.get(this, `globals["${temporalExt}"].temporalCreate`)
            if (!_.isFunction(versionCreate)) {
              return reject(new Error(`could not find "temporalCreate" in globals`))
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
              existsFilter(backend, type, args, collection)
                .not()
                .branch(
                  r.error('one or more related records were not found'),
                  collection.insert(args, { returnChanges: true })
                    .pluck('errors', 'first_error', 'changes')
                    .do((summary) => {
                      return summary('errors').ne(0).branch(
                        r.error(summary('first_error')),
                        summary('changes')('new_val')
                          .coerceTo('ARRAY')
                          .do((results) => {
                            return r.expr(batchMode).branch(
                              results,
                              results.nth(0)
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
            return afterHook.call(this, result, batchMode ? args : _.first(args), backend, (error, result) => {
              if (error) return reject(error)
              return resolve(result)
            })
          })
          .catch(reject)
      })
    })
      .timeout(timeout || 10000)
  }
}