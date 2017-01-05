import _ from 'lodash'
import subscriptionDetails from './subscriptionDetails'

export default function getSubscriptionEvents (graphql, requestString) {
  return _.map(subscriptionDetails(graphql, requestString).subscribe, 'subscription')
}