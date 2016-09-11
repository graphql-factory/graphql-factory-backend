import _ from 'lodash'

export default function read (type) {
  let backend = this
  return function (source, args, context, info) {
    let { r, connection } = backend
    let { collection, store } = backend.getTypeInfo(type, info)
    let table = r.db(store).table(collection)
    let { filter, many } = backend.filter.getRelationFilter (type, backend, source, info, table)

    // filter args
    filter = backend.filter.getArgsFilter(type, backend, args, filter)

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
}