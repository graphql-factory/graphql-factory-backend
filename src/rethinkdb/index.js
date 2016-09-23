import _ from 'lodash'
import GraphQLFactoryBaseBackend from '../base/index'
import create from './create'
import read from './read'
import update from './update'
import del from './delete'
import initStore from './initStore'
import filter from './filter'
import util from './util'
import q from './q'

// rethinkdb specific modules
let crud = { create, read, update, delete: del, initStore, filter, util, q }

// extended backend class for RethinkDB
export class GraphQLFactoryRethinkDBBackend extends GraphQLFactoryBaseBackend {
  constructor (namespace, graphql, factory, r, config, connection) {
    super(namespace, graphql, factory, config, crud)
    this.type = 'GraphQLFactoryRethinkDBBackend'

    // check for a top-level rethinkdb namespace
    if (!r) throw new Error('a rethinkdb or rethinkdbdash top-level namespace is required')

    // store database objects
    this.r = r
    this.connection = connection
    this.defaultStore = 'test'

    this.getTypeStore = (type) => {
      let { store } = this.getTypeComputed(type)
      return this.r.db(store)
    }

    this.getTypeCollection = (type) => {
      let { store, collection } = this.getTypeComputed(type)
      return this.r.db(store).table(collection)
    }

    // add values to the globals namespace
    _.merge(this._definition.globals, { [namespace]: { r, connection } })
  }
}

// helper function to instantiate a new backend
export default function (namespace, graphql, factory, r, config, connection) {
  return new GraphQLFactoryRethinkDBBackend(namespace, graphql, factory, r, config, connection)
}