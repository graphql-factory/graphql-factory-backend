import _ from 'lodash'
import hat from 'hat'
import Promise from 'bluebird'
import { getRelationFilter, getArgsFilter } from './filter'

export default function subscribe (backend, type) {
  return function (source, args, context = {}, info) {
    let { r, connection, definition, asError, _temporalExtension, subscriptions } = backend
    let subscriber = _.get(args, 'subscriber', hat())
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
          console.log('ADDING SUBSCRIPTION', filter.toString())
          let subscriptionId = backend.toMD5Hash(JSON.stringify(args) + filter.toString())
          let payload = { subscription: `subscription:${subscriptionId}`, subscriber }

          // check if the subscript is already active
          // if it is, add a subscriber to the count
          // potentially add a ping to the client to determine if they are still listening
          if (_.has(subscriptions, subscriptionId)) {
            console.log('found subscription id')
            subscriptions[subscriptionId].subscribers = _.union(
              subscriptions[subscriptionId].subscribers,
              [subscriber]
            )
            return resolve(payload)
          }

          return filter.changes().run(connection)
            .then((cursor) => {
              // add the new subscription
              subscriptions[subscriptionId] = {
                data: {},
                cursor,
                subscribers: [subscriber]
              }

              // send the payload before starting the cursor read
              resolve(payload)

              // add the event monitor
              return cursor.each((err, change) => {
                if (err) {
                  console.log('err', err)
                  return backend.emit(`subscription:${subscriptionId}`, {
                    errors: _.isArray(err) ? err : [err]
                  })
                }

                console.log('changes', change)

                // run the after hook on each change
                return afterHook.call(this, change, args, backend, (err, data) => {
                  if (err) {
                    return backend.emit(`subscription:${subscriptionId}`, {
                      data,
                      errors: _.isArray(err) ? err : [err]
                    })
                  }
                  subscriptions[subscriptionId].data = data
                  backend.emit(`subscription:${subscriptionId}`, { data })
                })
              })
            })
            .catch((err) => {
              reject(asError(err))
            })
        } catch (err) {
          return reject(asError(err))
        }

        /*
        return filter.do((query) => r.error(r.expr('SUBSCRIPTION:').add(query.coerceTo('STRING'))))
          .run(connection)
          .then((result) => {
            throw result
          })
          .catch((error) => {

            console.log(error)
            if (!_.has(error, 'msg')) return reject(asError(error))
            if (!error.msg.match(/^SUBSCRIPTION:.+/)) return reject(asError(error))


          })
          */
      })
    })
      .timeout(timeout || 10000)
  }
}