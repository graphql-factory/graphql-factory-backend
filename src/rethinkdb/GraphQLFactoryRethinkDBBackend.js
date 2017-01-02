import _ from 'lodash'
import q from './q'
import filter from './filter'
import createResolver from './create'
import readResolver from './read'
import updateResolver from './update'
import deleteResolver from './delete'
import initStore from './initStore'

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