/**
 * @module graphql-factory-backend
 * @description graphql-factory extension that creates generic resolver functions that handle
 * nested relationships, unique constraints, and basic crud operations as well as
 * subscriptions. Also serves as an extendable class
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 *
 */
import GraphQLFactoryBaseBackend from './base/GraphQLFactroyBaseBackend'
import GraphQLFactoryRethinkDBBackend from './rethinkdb/GraphQLFactoryRethinkDBBackend'
import subscriptionEvent from './common/subscriptionEvent'

export { GraphQLFactoryBaseBackend }
export { GraphQLFactoryRethinkDBBackend }
export { subscriptionEvent }

export default {
  GraphQLFactoryBaseBackend,
  GraphQLFactoryRethinkDBBackend,
  subscriptionEvent
}