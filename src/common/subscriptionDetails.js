import _ from 'lodash'
import subscriptionArguments from './subscriptionArguments'
import subscriptionEvent from './subscriptionEvent'

export default function subscriptionDetails (graphql, requestString) {
  return _.map(subscriptionArguments(graphql, requestString), (arg) => {
    let { name, argument } = arg
    return _.merge({}, arg, {
      subscription: subscriptionEvent(name, argument)
    })
  })
}