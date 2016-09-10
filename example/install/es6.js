import { rethinkdb as RethinkDBBackend } from '../../src/index'
import rethinkdbdash from 'rethinkdbdash'
import * as graphql from 'graphql'
import factory from 'graphql-factory'
import { seedData, config } from '../config/index'

// create backend
let backend = RethinkDBBackend('List', graphql, factory, rethinkdbdash(), config)

// init all stores
backend.initAllStores(true, seedData).then((res) => {
  console.log(res)
  process.exit()
})