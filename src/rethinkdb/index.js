import _ from 'lodash'
import GraphQLFactoryBaseBackend from '../base/index'
import create from './create'
import read from './read'
import update from './update'
import del from './delete'

let crud = { create, read, update, delete: del }

// extended backend class for RethinkDB
class GraphQLFactoryRethinkDBBackend extends GraphQLFactoryBaseBackend {
  constructor (namespace, graphql, factory, r, config, connection) {
    super(namespace, graphql, factory, config, crud)

    // check for a top-level rethinkdb namespace
    if (!r) throw new Error('a rethinkdb or rethinkdbdash top-level namespace is required')

    // store database objects
    this.r = r
    this.connection = connection

    // add values to the globals namespace
    _.merge(this.globals, { [namespace]: { r, connection } })
  }
}

export default function (namespace, graphql, factory, r, config, connection) {
  return new GraphQLFactoryRethinkDBBackend(namespace, graphql, factory, r, config, connection)
}