import _ from 'lodash'

export default function read (type) {
  let backend = this

  // resolve function
  return function (source, args, context, info) {
    let { r, connection } = backend
    let { collection, store, fields, primaryKey, nested, currentPath, belongsTo, has } = backend.getTypeInfo(type, info)
    let table = r.db(store).table(collection)
    let filter = table
    let argKeys = _.keys(args)
    let many = true

    // check for nested with belongsTo relationship
    if (nested && _.has(fields, belongsTo.primary) && _.has(source, belongsTo.foreign)) {
      many = belongsTo.many
      filter = filter.filter({ [belongsTo.primary]: source[belongsTo.foreign] })
    } else if (nested && _.has(fields, has.foreign)) {
      many = has.many

      // get the source id or ids
      let hasId = _.get(source, currentPath)
      hasId = !many && _.isArray(hasId) ? _.get(hasId, '[0]') : hasId
      if (!hasId || (_.isArray(hasId) && !hasId.length)) return many ? [] : null

      // do an array or field search
      if (many) filter = filter.filter((obj) => r.expr(hasId).contains(obj(has.foreign)))
      else filter = filter.filter({ [has.foreign]: hasId })
    }

    // check if the primary keys were supplied
    if (_.intersection(primaryKey, argKeys).length === argKeys.length && argKeys.length > 0) {
      let priArgs = _.map(primaryKey, (pk) => args[pk])
      priArgs = priArgs.length === 1 ? priArgs[0] : priArgs
      filter = filter.get(priArgs).do((result) => result.eq(null).branch([], [result]))
    } else if (argKeys.length) {
      filter = filter.filter(args)
    }

    // add standard query modifiers
    if (_.isNumber(args.limit)) filter = filter.limit(args.limit)

    // if not a many relation, return only a single result or null
    if (!many) {
      filter = filter.coerceTo('array').do((objs) => {
        return objs
          .count()
          .eq(0)
          .branch(
            r.expr(null),
            r.expr(objs).nth(0)
          )
      })
    }

    // run the query
    return filter.run(connection)
  }
}