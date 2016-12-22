import _ from 'lodash'
import { getRelationFilter, getArgsFilter } from './filter'

export default function read (backend, type) {
  return function (source, args, context = {}, info) {
    let { r, connection } = backend
    let { collection, store, before } = backend.getTypeInfo(type, info)
    let table = r.db(store).table(collection)

    let { filter, many } = getRelationFilter(backend, type, source, info, table)
    let beforeHook = _.get(before, `read${type}`)

    // main query
    let query = () => {
      // filter args
      filter = getArgsFilter(backend, type, args, filter)

      // add standard query modifiers
      if (_.isNumber(args.limit)) filter = filter.limit(args.limit)

      // if not a many relation, return only a single result or null
      if (!many) {
        filter = filter.coerceTo('array').do((objs) => {
          return objs.count().eq(0).branch(r.expr(null), r.expr(objs).nth(0))
        })
      }

      // run the query
      return filter.run(connection)
    }

    // run before stub
    let resolveBefore = beforeHook(source, args, _.merge({}, { factory: this }, context), info)
    if (_.isPromise(resolveBefore)) return resolveBefore.then(query)
    return query()
  }
}