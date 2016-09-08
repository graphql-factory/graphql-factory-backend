import _ from 'lodash'
import GraphQLFactoryBaseBackend from '../base/index'
import create from './create'
import read from './read'
import update from './update'
import del from './delete'

let crud = { create, read, update, delete: del }

// extended backend class for RethinkDB
class GraphQLFactoryMongoDBBackend extends GraphQLFactoryBaseBackend {
  constructor (namespace, graphql, factory, db, config, connection) {
    super(namespace, graphql, factory, config, crud)
    this.type = 'GraphQLFactoryMongoDBBackend'

    // check for a top-level rethinkdb namespace
    if (!db) throw new Error('a MongoDB connection is required')

    // store database objects
    this.db = db

    // add values to the globals namespace
    _.merge(this._definition.globals, { [namespace]: { db } })
  }
}

// helper function to instantiate a new backend
export default function (namespace, graphql, factory, db, config, connection) {
  return new GraphQLFactoryMongoDBBackend(namespace, graphql, factory, db, config, connection)
}