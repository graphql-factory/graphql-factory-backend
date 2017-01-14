import _ from 'lodash'
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
  /**
   * Initializes a rethinkdb backend instance
   * @param {String} namespace - namespace to using in globals
   * @param {Object} graphql - instance of graphql
   * @param {Object} factory - instance of graphql-factory
   * @param {Object} config - configuration object
   * @param {String} [config.name="GraphQLFactoryBackend"] - plugin name
   * @param {String} [config.extension="_backend"] - plugin extension
   * @param {Object} [config.options] - options hash
   * @param {String} [config.options.store="test"] - default store name
   * @param {String} [config.options.prefix=""] - prefix for collections
   * @param {Object} [config.options.database] - database connection options
   * @param {Array<String>|String} [config.plugin] - additional plugins to merge
   * @param {String} [config.temporalExtension="_temporal"] - temporal plugin extension
   * @param {Object} [config.globals] - Factory globals definition
   * @param {Object} [config.fields] - Factory fields definition
   * @param {Object} config.types - Factory types definition
   * @param {Object} [config.schemas] - Factory schemas definition
   * @param {Object} [config.functions] - Factory functions definition
   * @param {Object} [config.externalTypes] - Factory externalTypes definition
   * @param {Object} [config.installData] - Seed data
   * @param {Object} r - rethinkdb driver
   * @param {Object} [connection] - connection for rethinkdb driver
   * @callback callback
   */
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

    // subscription manager
    this.subscriptionManager = new SubscriptionManager(this)

    // add values to the globals namespace
    _.merge(this.definition.globals, { [namespace]: { r, connection } })
  }

  /*******************************************************************
   * Helper methods
   *******************************************************************/
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

  /**
   * Determines if the rethink driver has already been connected and connects it if not
   * @callback callback
   * @private
   */
  _connectDatabase (callback = () => true) {
    return new Promise((resolve, reject) => {
      try {
        let options = _.get(this.options, 'database', {})
        // determine if uninitialized rethinkdbdash
        if (!_.isFunction(_.get(this.r, 'connect'))) {
          this.r = this.r(options)
          callback()
          return resolve()
        }

        // check that r is not a connected rethinkdbdash instance and should be a rethinkdb driver
        else if (!_.has(this.r, '_poolMaster')) {
          // check for an open connection
          if (_.get(this._connection, 'open') !== true) {
            return this.r.connect(options, (error, connection) => {
              if (error) {
                callback(error)
                return reject(error)
              }
              this._connection = connection
              callback()
              return resolve()
            })
          }
          callback()
          return resolve()
        }
        callback()
        return resolve()
      } catch (error) {
        callback(error)
        reject(error)
      }
    })
  }

  /**
   * Overrides the make function to include a database connection check
   * @param callback
   * @return {Promise.<TResult>}
   */
  make (callback) {
    this.logger.info({ stream: 'backend' }, 'making backend')
    return this._connectDatabase()
      .then(() => {
        try {
          this._compile()
          this.logger.info({ stream: 'backend' }, 'successfully made backend')
          callback(null, this)
          return this
        } catch (error) {
          this.logger.error({ stream: 'backend', error }, 'failed to make backend')
          callback(error)
        }
      })
      .catch((error) => {
        this.logger.error({ stream: 'backend', error }, 'failed to make backend')
        callback(error)
        return Promise.reject(error)
      })
  }

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

  unsubscribeResolver (type) {
    return unsubscribeResolver(this, type)
  }
}