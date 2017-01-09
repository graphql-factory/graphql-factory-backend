import _ from 'lodash'
import md5 from 'md5'
import Events from 'events'

export default class SubscriptionManager extends Events {
  constructor (backend) {
    super()
    this.backend = backend
    this.subscriptions = {}
  }
  subscribe (subscription, subscriber, parent, filter, query, callback) {
    let graphql = this.backend.graphql

    // if the subscription is already running, add the subscriber and return
    if (_.has(this.subscriptions, subscription)) {
      let sub = this.subscriptions[subscription]
      sub.subscribers = _.union(sub.subscribers, [subscriber])
      return callback()
    }

    // if the subscription is new, create a change feed and register the subscription
    return filter.changes()
      .run(this.backend._connection)
      .then((cursor) => {
        let { schema, requestString, rootValue, context, variableValues } = query

        // create a bypass subscriber, this will be used to make the request without
        // creating a new subscription
        let bypass = md5(`${subscription}:${Date.now()}:${Math.random()}`)
        let bypassedRequest = this.setBypassSubscriber(requestString, bypass)

        // add the new subscription
        this.subscriptions[subscription] = {
          bypass,
          cursor,
          debounce: null,
          subscribers: [subscriber],
          parents: parent ? [parent] : []
        }

        // execute the code
        let execute = () => {
          // clear the debounce
          _.set(this.subscriptions, `["${subscription}"].debounce`, null)

          // do graphql query and emit to backend
          return graphql.graphql(
            schema,
            bypassedRequest,
            _.cloneDeep(rootValue),
            _.cloneDeep(context),
            _.cloneDeep(variableValues)
          )
            .then((result) => {
              return this.backend.emit(subscription, result)
            })
            .catch((error) => {
              return this.backend.emit(subscription, {
                errors: _.isArray(error) ? error : [error]
              })
            })
        }

        // listen for local events
        this.on(subscription, () => {
          let debounce = _.get(this.subscriptions, `["${subscription}"].debounce`)
          if (debounce) clearTimeout(debounce)
          _.set(this.subscriptions, `["${subscription}"].debounce`, setTimeout(execute, 500))
        })

        // call the callback
        callback()

        // add the event monitor
        return cursor.each((err, change) => {
          if (err) {
            return this.backend.emit(subscription, {
              errors: _.isArray(err) ? err : [err]
            })
          }

          // emit to all of the parent subscription events
          _.forEach(this.subscriptions[subscription].parents, (parentSubscription) => {
            this.emit(parentSubscription)
          })

          // emit this event
          return this.emit(subscription)
        })
      })
      .catch((error) => {
        return callback(error)
      })
  }

  isBypass (subscription, subscriber) {
    return _.get(this.subscriptions, `["${subscription}"].bypass`) === subscriber
  }

  unsubscribe (subscription, subscriber, callback) {
    let GraphQLError = this.backend.graphql.GraphQLError
    let sub = _.get(this.subscriptions, `["${subscription}"]`)
    if (!sub) {
      return callback(new GraphQLError(`subscription ${subscription} was not found`))
    }
    if (!_.includes(sub.subscribers, subscriber)) {
      return callback(new GraphQLError(`subscriber ${subscriber} is not subscribed to subscription ${subscription}`))
    }
    sub.subscribers = _.without(sub.subscribers, subscriber)
    if (!sub.subscribers.length) {
      sub.cursor.close()
      delete this.subscriptions[subscription]
    }
    return callback()
  }

  setBypassSubscriber (requestString, bypass) {
    let graphql = this.backend.graphql
    let Kind = graphql.Kind
    let request = graphql.parse(requestString)

    _.forEach(request.definitions, (definition) => {
      let { kind, operation, selectionSet } = definition
      if (kind === Kind.OPERATION_DEFINITION && operation === 'subscription' && selectionSet) {
        _.forEach(selectionSet.selections, (selection) => {
          _.forEach(selection.arguments, (argument) => {
            if (_.get(argument, 'name.value') === 'subscriber') {
              _.set(argument, 'value.value', bypass)
            }
          })
        })
      }
    })

    // return the recompiled request
    return graphql.print(request)
  }
}