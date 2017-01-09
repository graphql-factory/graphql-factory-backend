import _ from 'lodash'
import q from './common/q'
import filter from './common/filter'
import createResolver from './resolvers/create'
import readResolver from './resolvers/read'
import updateResolver from './resolvers/update'
import deleteResolver from './resolvers/delete'
import subscribeResolver from './resolvers/subscribe'
import unsubscribeResolver from './resolvers/unsubscribe'
import initStore from './install/initStore'
import SubscriptionManager from './subscription/SubscriptionManager'

import GraphQLFactoryBaseBackend from '../base/GraphQLFactroyBaseBackend'

// extended backend class for RethinkDB
export default class GraphQLFactoryRethinkDBBackend extends GraphQLFactoryBaseBackend {
  constructor (namespace, graphql, factory, r, config, connection) {
    super(namespace, graphql, factory, config)

    this.type = 'GraphQLFactoryRethinkDBBackend'

    // check for a top-level rethinkdb namespace
    if (!r) throw new Error('a rethinkdb or rethinkdbdash top-level namespace is required')

    // store database objects
    this.r = r
    this._connection = connection
    this._defaultStore = _.get(config, 'options.store', 'test')

    // utils
    this.filter = filter
    this.q = q(this)

    // subscription manager
    this.subscriptionManager = new SubscriptionManager(this)

    // add values to the globals namespace
    _.merge(this.definition.globals, { [namespace]: { r, connection } })
  }

  /*******************************************************************
   * Helper methods
   *******************************************************************/

  /*******************************************************************
   * Required methods
   *******************************************************************/
  now (callback) {
    return new Promise((resolve, reject) => {
      return this.r.now()
        .run(this._connection)
        .then((d) => {
          callback(null, d)
          resolve(d)
          return d
        })
        .catch((err) => {
          callback(err)
          return reject(err)
        })
    })
  }

  createResolver (type) {
    return createResolver(this, type)
  }

  readResolver (type) {
    return readResolver(this, type)
  }

  updateResolver (type) {
    return updateResolver(this, type)
  }

  deleteResolver (type) {
    return deleteResolver(this, type)
  }

  batchCreateResolver (type) {
    return createResolver(this, type, true)
  }

  batchUpdateResolver (type) {
    return updateResolver(this, type, true)
  }

  batchDeleteResolver (type) {
    return deleteResolver(this, type, true)
  }

  subscribeResolver (type) {
    return subscribeResolver(this, type)
  }

  unsubscribeResolver () {
    return unsubscribeResolver(this)
  }

  getStore (type) {
    let { store } = this.getTypeComputed(type)
    return this.r.db(store)
  }

  getCollection (type) {
    let { store, collection } = this.getTypeComputed(type)
    return this.r.db(store).table(collection)
  }

  initStore (type, rebuild, seedData) {
    return initStore.call(this, type, rebuild, seedData)
  }
}