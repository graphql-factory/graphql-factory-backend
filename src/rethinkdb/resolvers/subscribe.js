import _ from 'lodash'
import Promise from 'bluebird'
import * as graphql from 'graphql'
import { SUBSCRIBE } from '../../base/GraphQLFactoryBackendCompiler'
import { subscriptionEvent, subscriptionArguments } from '../../common/index'
import { getRelationFilter, getArgsFilter } from '../common/filter'

export default function subscribe (backend, type) {
  return function (source, args, context = {}, info) {
    let { r, connection, definition, asError, _temporalExtension } = backend
    let { subscriber } = args
    delete args.subscriber
    let requestFields = backend.getRequestFields(type, info, { maxDepth: 1, includeRelated: false })

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

        filter = getArgsFilter(backend, type, args, filter)

        // if not a many relation, return only a single result or null
        filter = many ? filter : filter.nth(0).default(null)

        // finally pluck the desired fields
        filter = _.isEmpty(requestFields)
          ? filter
          : filter.pluck(requestFields)

        try {

          // create the subscriptionId and the response payload
          let subscriptionId = subscriptionEvent(
            `${SUBSCRIBE}${type}`,
            subscriptionArguments(backend.graphql, info.operation, 0).argument
          )

          // if the request is a bypass, run the regular query
          if (backend.subscriptionManager.isBypass(subscriptionId, subscriber)) {
            return filter.run(connection)
              .then((result) => {
                return resolve(result)
              })
              .catch((error) => {
                return reject(asError(error))
              })
          }

          // run the query to ensure it is valid before setting up the subscription
          return filter.run(connection)
            .then((result) => {
              // since there a valid response, subscribe via the manager
              return backend.subscriptionManager.subscribe(
                subscriptionId,
                subscriber,
                null,
                filter,
                {
                  schema: info.schema,
                  requestString: graphql.print({
                    kind: graphql.Kind.DOCUMENT,
                    definitions: [info.operation]
                  }),
                  rootValue: info.rootValue,
                  context,
                  variableValues: info.variableValues
                },
                (err) => {
                  if (err) {
                    // on error, attempt to unsubscribe. it doesnt matter if it fails, reject the promise
                    return backend.subscriptionManager.unsubscribe(subscriptionId, subscriber, () => {
                      return reject(err)
                    })
                  }
                  return resolve(result)
                })
            })
            .catch((error) => {
              return reject(asError(error))
            })
        } catch (err) {
          return reject(asError(err))
        }
      })
    })
      .timeout(timeout || 10000)
  }
}