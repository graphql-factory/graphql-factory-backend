import _ from 'lodash'
import GraphQLFactoryBaseBackend from '../base/index'
import create from './create'
import read from './read'
import update from './update'
import del from './delete'

let crud = { create, read, update, delete: del }

// extended backend class for RethinkDB
class GraphQLFactoryKnexBackend extends GraphQLFactoryBaseBackend {
  constructor (namespace, graphql, factory, knex, config) {
    super(namespace, graphql, factory, config, crud)
    this.type = 'GraphQLFactoryKnexBackend'

    // check for a top-level rethinkdb namespace
    if (!knex) throw new Error('an instance of knex is required')

    // store database objects
    this.knex = knex

    // add values to the globals namespace
    _.merge(this.globals, { [namespace]: { knex } })
  }
}

// helper function to instantiate a new backend
export default function (namespace, graphql, factory, knex, config) {
  return new GraphQLFactoryKnexBackend(namespace, graphql, factory, knex, config)
}