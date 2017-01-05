import _ from 'lodash'
import subscriptionArguments from './subscriptionArguments'
import subscriptionEvent from './subscriptionEvent'

export default function subscriptionDetails (graphql, requestString) {
  let details = {
    subscribe: [],
    unsubscribe: []
  }

  _.forEach(subscriptionArguments(graphql, requestString), (arg) => {
    let { name, argument } = arg
    console.log(JSON.stringify(argument, null, '  '))
    let subscription = subscriptionEvent(name, argument)

    if (name.match(/^unsubscribe.*/)) {
      details.unsubscribe.push(subscription)
    } else {
      details.subscribe.push(_.merge({}, arg, {
        subscription
      }))
    }
  })
  details.operations = details.subscribe.length + details.unsubscribe.length

  return details
}