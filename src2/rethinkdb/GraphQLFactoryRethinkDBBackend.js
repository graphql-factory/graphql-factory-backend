import _ from 'lodash'
import GraphQLFactoryBaseBackend from '../base/GraphQLFactroyBaseBackend'

// extended backend class for RethinkDB
export default class GraphQLFactoryRethinkDBBackend extends GraphQLFactoryBaseBackend {
  constructor (namespace, graphql, factory, r, config, connection) {
    super(namespace, graphql, factory, config, {
      create: () => true,
      read: () => true,
      update: () => true,
      delete: () => true
    }, () => true)

    this.type = 'GraphQLFactoryRethinkDBBackend'

    // check for a top-level rethinkdb namespace
    if (!r) throw new Error('a rethinkdb or rethinkdbdash top-level namespace is required')

    // store database objects
    this.r = r
    this._connection = connection
    this._defaultStore = 'test'

    // add values to the globals namespace
    _.merge(this.definition.globals, { [namespace]: { r, connection } })

    // make the backend
    this.make()
  }

  getStore (type) {
    let { store } = this.getTypeComputed(type)
    return this.r.db(store)
  }

  getCollection (type) {
    let { store, collection } = this.getTypeComputed(type)
    return this.r.db(store).table(collection)
  }
}