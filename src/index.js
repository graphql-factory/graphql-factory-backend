import knex from './knex/index'
import mongodb from './mongodb/index'
import rethinkdb from './rethinkdb/index'

export { knex }
export { mongodb }
export { rethinkdb }

export default {
  knex,
  mongodb,
  rethinkdb
}