import _ from 'lodash'

// gets relationships defined in the type definition and also
export function getRelationFilter (type, backend, source, info, filter) {
  let many = true
  let { fields, nested, currentPath, belongsTo, has } = backend.getTypeInfo(type, info)

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
  return { filter, many }
}

// creates a filter based on the arguments
export function getArgsFilter (type, backend, args, filter) {

  let argKeys = _.keys(args)
  let primaryKey = backend.getPrimary(type)

  // check if the primary keys were supplied
  if (_.intersection(primaryKey, argKeys).length === argKeys.length && argKeys.length > 0) {
    let priArgs = _.map(primaryKey, (pk) => args[pk])
    priArgs = priArgs.length === 1 ? priArgs[0] : priArgs
    filter = filter.get(priArgs).do((result) => result.eq(null).branch([], [result]))
  } else if (argKeys.length) {
    filter = filter.filter(args)
  }

  return filter
}

// determines unique constraints and if any have been violated
export function violatesUnique (type, backend, args, filter) {
  let { r } = backend
  let { fields } = backend.getTypeDefinition(type)
  let unique = backend.getUnique(fields, args)

  // do a unique field check if any are specified
  if (unique.length) {
    return filter.filter((obj) => {
      return r.expr(unique)
        .prepend(obj)
        .reduce((left, right) => {
          return left.and(
            right('type').eq('String').branch(
              obj(right('field')).match(r.add('(?i)^', right('value'), '$')),
              obj(right('field')).eq(right('value'))
            )
          )
        })
    })
      .count()
      .ne(0)
  }
  return filter.do(() => r.expr(false))
}

export default {
  getRelationFilter,
  getArgsFilter,
  violatesUnique
}