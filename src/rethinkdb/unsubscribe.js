import _ from 'lodash'

export default function unsubscribe (backend) {
  return function (source, args, context = {}, info) {
    let { subscription, subscriber } = args
    let { subscriptions, GraphQLError } = backend

    // check for subscription id
    if (!_.has(subscriptions, subscription)) throw new GraphQLError('invalid subscription id')

    // check that user is actually subscribed
    if (!_.includes(_.get(subscriptions, subscription), subscriber)) {
      throw new GraphQLError(`subscriber ${subscriber} not found on subscription ${subscription}`)
    }

    // remove the user from the subscribers list
    subscriptions[subscription].subscribers = _.without(
      subscriptions[subscription].subscribers,
      subscriber
    )

    // if there are no more subscribers, close the cursor and remove the subscription
    if (!subscriptions[subscription].subscribers.length) {
      subscriptions[subscription].cursor.close()
      delete subscriptions[subscription]
    }

    // tell the user they are unsubscribed
    return {
      unsubscribed: true
    }
  }
}