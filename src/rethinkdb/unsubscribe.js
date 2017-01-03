import _ from 'lodash'

export default function unsubscribe (backend) {
  return function (source, args, context = {}, info) {
    let { subscription, subscriber } = args
    let { subscriptions, GraphQLError } = backend

    let subscriptionId = subscription.replace(/^subscription:/i, '')

    if (!_.has(subscriptions, subscriptionId)) throw new GraphQLError('invalid subscription id')
    subscriptions[subscriptionId].subscribers = _.without(
      subscriptions[subscriptionId].subscribers,
      subscriber
    )

    if (!subscriptions[subscriptionId].subscribers.length) {
      subscriptions[subscriptionId].cursor.close()
      delete subscriptions[subscriptionId]
    }
    return {
      unsubscribed: true
    }
  }
}