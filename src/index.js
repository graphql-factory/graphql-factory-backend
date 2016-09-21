import base from './base/index'
import { GraphQLFactoryBaseBackend } from './base/index'
import knex from './knex/index'
import { GraphQLFactoryKnexBackend } from './knex/index'
import mongodb from './mongodb/index'
import { GraphQLFactoryMongoDBBackend } from './mongodb/index'
import rethinkdb from './rethinkdb/index'
import { GraphQLFactoryRethinkDBBackend } from './rethinkdb/index'

export { base }
export { GraphQLFactoryBaseBackend }
export { knex }
export { GraphQLFactoryKnexBackend }
export { mongodb }
export { GraphQLFactoryMongoDBBackend }
export { rethinkdb }
export { GraphQLFactoryRethinkDBBackend }

export default {
  base,
  GraphQLFactoryBaseBackend,
  knex,
  GraphQLFactoryKnexBackend,
  mongodb,
  GraphQLFactoryMongoDBBackend,
  rethinkdb,
  GraphQLFactoryRethinkDBBackend
}