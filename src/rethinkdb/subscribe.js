import _ from 'lodash'
import Promise from 'bluebird'
import * as graphql from 'graphql'
import { SUBSCRIBE } from '../base/GraphQLFactoryBackendCompiler'
import { subscriptionEvent, subscriptionArguments } from '../common/index'
import { getRelationFilter, getArgsFilter } from './filter'

export default function subscribe (backend, type) {
  return function (source, args, context = {}, info) {
    let { r, connection, definition, asError, _temporalExtension, subscriptions } = backend
    let { subscriber } = args
    delete args.subscriber

    // temporal plugin details
    let temporalDef = _.get(definition, `types["${type}"]["${_temporalExtension}"]`, {})
    let { versioned, readMostCurrent } = temporalDef
    let isVersioned = Boolean(versioned) && definition.hasPlugin('GraphQLFactoryTemporal')

    // type details
    let { before, after, timeout, nested } = backend.getTypeInfo(type, info)
    let temporalMostCurrent = _.get(this, `globals["${_temporalExtension}"].temporalMostCurrent`)
    let collection = backend.getCollection(type)
    let filter = collection
    let many = true

    // add the date argument to the rootValue
    if (isVersioned) {
      _.set(info, `rootValue["${_temporalExtension}"].date`, args.date)
    }

    // let { filter, many } = getRelationFilter.call(this, backend, type, source, info, collection)
    let fnPath = `backend_subscribe${type}`
    let beforeHook = _.get(before, fnPath, (args, backend, done) => done())
    let afterHook = _.get(after, fnPath, (result, args, backend, done) => done(null, result))

    // handle basic subscribe
    return new Promise((resolve, reject) => {
      return beforeHook.call(this, { source, args, context, info }, backend, (err) => {
        if (err) return reject(asError(err))

        // handle temporal plugin
        /*
        if (isVersioned && !nested) {
          if (temporalDef.subscribe === false) {
            return reject(new Error('subscribe is not allowed on this temporal type'))
          }
          if (_.isFunction(temporalDef.subscribe)) {
            return resolve(temporalDef.subscribe.call(this, source, args, context, info))
          } else if (_.isString(temporalDef.subscribe)) {
            let temporalSubscribe = _.get(definition, `functions["${temporalDef.subscribe}"]`)
            if (!_.isFunction(temporalSubscribe)) {
              return reject(new Error(`cannot find function "${temporalDef.subscribe}"`))
            }
            return resolve(temporalSubscribe.call(this, source, args, context, info))
          } else {
            let versionFilter = _.get(this, `globals["${_temporalExtension}"].temporalFilter`)
            if (!_.isFunction(versionFilter)) {
              return reject(new Error(`could not find "temporalFilter" in globals`))
            }
            filter = versionFilter(type, args)
            args = _.omit(args, ['version', 'recordId', 'date', 'id'])

            if (!_.keys(args).length && readMostCurrent === true) {
              filter = temporalMostCurrent(type)
            } else {
              let versionFilter = _.get(this, `globals["${_temporalExtension}"].temporalFilter`)
              if (!_.isFunction(versionFilter)) {
                return reject(new Error(`could not find "temporalFilter" in globals`))
              }
              filter = versionFilter(type, args)
              args = _.omit(args, ['version', 'recordId', 'date', 'id'])
            }
          }
        }
        */

        filter = getArgsFilter(backend, type, args, filter)

        // if not a many relation, return only a single result or null
        filter = many ? filter : filter.nth(0).default(null)

        try {

          // create the subscriptionId and the response payload
          let subscriptionId = subscriptionEvent(
            `${SUBSCRIBE}${type}`,
            subscriptionArguments(backend.graphql, info.operation, 0).argument
          )
          let payload = { subscription: subscriptionId, subscriber }

          // check if the subscript is already active
          // if it is, add a subscriber to the count
          // potentially add a ping to the client to determine if they are still listening
          if (_.has(subscriptions, subscriptionId)) {
            subscriptions[subscriptionId].subscribers = _.union(
              subscriptions[subscriptionId].subscribers,
              [subscriber]
            )
            console.log('found subscription, sending results')
            let requestString = graphql.print({ kind: graphql.Kind.DOCUMENT, definitions: [info.operation] })

            return graphql.graphql(info.schema, requestString, info.rootValue, context, info.variableValues)
              .then((result) => {
                return resolve(result)
              })
              .catch((error) => {
                return reject(asError(error))
              })
          }

          return filter.changes()('new_val').run(connection)
            .then((cursor) => {
              // add the new subscription
              subscriptions[subscriptionId] = {
                data: {},
                cursor,
                subscribers: [subscriber]
              }

              // add the event monitor
              cursor.each((err, change) => {
                if (err) {
                  console.log('err', err)
                  return backend.emit(subscriptionId, {
                    errors: _.isArray(err) ? err : [err]
                  })
                }

                console.log('changes', change)

                // run the after hook on each change
                return filter.run(connection)
                  .then((result) => {
                    return afterHook.call(this, change, args, backend, (err, data) => {
                      if (err) {
                        return backend.emit(subscriptionId, {
                          data,
                          errors: _.isArray(err) ? err : [err]
                        })
                      }
                      backend.emit(subscriptionId, result)
                    })
                  })
                  .catch((error) => {
                    backend.emit(subscriptionId, {
                      errors: _.isArray(error) ? error : [error]
                    })
                  })
              })

              // send initial query
              return filter.run(connection)
                .then((result) => {
                  return resolve(result)
                })
                .catch((error) => {
                  return reject(asError(error))
                })
            })
            .catch((err) => {
              reject(asError(err))
            })
        } catch (err) {
          return reject(asError(err))
        }
      })
    })
      .timeout(timeout || 10000)
  }
}