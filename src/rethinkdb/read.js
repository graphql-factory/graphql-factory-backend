import _ from 'lodash'

export default function read (type) {
  let backend = this
  let { namespace, _types, getPrimary } = this
  let definition = _.get(_types, type, {})
  let { _backend, fields } = definition
  let collection = _backend.collection || _backend.table

  return function (source, args, context, info) {
    let { r, connection } = backend
    let primary = getPrimary(fields)
    let table = r.table(collection)
    let filter = table
    let argKeys = _.keys(args)
    let priKeys = _.isArray(primary) ? primary : [primary]

    // check if the primary keys were supplied
    if (_.intersection(priKeys, argKeys).length === argKeys.length && argKeys.length > 0) {
      let priArgs = _.map(priKeys, (pk) => args[pk])
      priArgs = priArgs.length === 1 ? priArgs[0] : priArgs
      filter = table.get(priArgs).do((result) => result.eq(null).branch([], [result]))
    } else if (argKeys.length) {
      filter = table.filter(args)
    }

    // add standard query modifiers
    if (_.isNumber(args.limit)) filter = filter.limit(args.limit)

    // run the query
    return filter.run(connection)
  }
}