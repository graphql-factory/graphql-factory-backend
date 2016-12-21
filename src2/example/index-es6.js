import * as graphql from 'graphql'
import GraphQLFactory from 'graphql-factory'
import rethinkdbdash from 'rethinkdbdash'
import RethinkDBBackend from '../rethinkdb/GraphQLFactoryRethinkDBBackend'
import { config } from '../../example/config/index'

const namespace = '_api'
const r = rethinkdbdash()

class APIBackend extends RethinkDBBackend {
  constructor (ns, gql, factory, db, cfg) {
    super(ns, gql, factory, db, cfg)
  }

  custom () {
    console.log('custom method')
  }
}

let backend = new APIBackend(namespace, graphql, GraphQLFactory, r, config)

backend.custom()

setTimeout(() => {
  process.exit()
}, 3000)