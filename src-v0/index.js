import base from './base/index'
import { GraphQLFactoryBaseBackend } from './base/index'
import rethinkdb from './rethinkdb/index'
import { GraphQLFactoryRethinkDBBackend } from './rethinkdb/index'

export { base }
export { GraphQLFactoryBaseBackend }
export { rethinkdb }
export { GraphQLFactoryRethinkDBBackend }

export default {
  base,
  GraphQLFactoryBaseBackend,
  rethinkdb,
  GraphQLFactoryRethinkDBBackend
}