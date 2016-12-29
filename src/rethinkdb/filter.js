import _ from 'lodash'
import Bluebird from 'bluebird'

export function isPromise (obj) {
  if (obj instanceof Promise || obj instanceof Bluebird) return true
  if (_.isFunction(_.get(obj, 'then')) && _.isFunction(_.get(obj, 'catch'))) return true
  return false
}

// gets relationships defined in the type definition and also
export function getRelationFilter (backend, type, source, info, filter) {
  filter = filter || backend.getCollection(type)
  let many = true
  let { r } = backend
  let { fields, nested, currentPath, belongsTo, has } = backend.getTypeInfo(type, info)

  // check for nested with belongsTo relationship
  if (nested && _.has(fields, belongsTo.primary) && _.has(source, belongsTo.foreign)) {
    many = belongsTo.many
    filter = filter.filter({ [belongsTo.primary]: source[belongsTo.foreign] })
  } else if (nested && _.has(fields, has.foreign)) {
    many = has.many

    console.log({ nested, many, has })

    // get the source id or ids
    let hasId = _.get(source, currentPath)
    hasId = !many && _.isArray(hasId) ? _.get(hasId, '[0]') : hasId
    if (!hasId || (_.isArray(hasId) && !hasId.length)) return { filter: r.expr([]), many }

    // do an array or field search
    if (many) filter = filter.filter((obj) => r.expr(hasId).contains(obj(has.foreign)))
    else filter = filter.filter({ [has.foreign]: hasId })
  }
  return { filter, many }
}

// creates a filter based on the arguments
export function getArgsFilter (backend, type, args, filter) {
  filter = filter || backend.getCollection(backend)
  let argKeys = _.keys(args)
  let { primary } = backend.getTypeComputed(type)

  // check if the primary keys were supplied
  if (_.intersection(primary, argKeys).length === argKeys.length && argKeys.length > 0) {
    let priArgs = backend.getPrimaryFromArgs(type, args)
    filter = filter.get(priArgs).do((result) => result.eq(null).branch([], [result]))
  } else if (argKeys.length) {
    filter = filter.filter(args)
  }

  return filter
}

// determines unique constraints and if any have been violated
export function violatesUnique (backend, type, args, filter) {
  filter = filter || backend.getCollection(type)
  let { r } = backend
  let unique = backend.getUniqueArgs(type, args)

  if (unique.length) {
    return filter.filter((obj) => {
      return r.expr(unique)
        .prepend(true)
        .reduce((prevUniq, uniq) => {
          return prevUniq.and(
            uniq.prepend(true)
              .reduce((prevField, field) => {
                return prevField.and(field('type').eq('String').branch(
                  obj(field('field')).match(r.add('(?i)^', field('value'), '$')),
                  obj(field('field')).eq(field('value'))
                ))
              })
          )
        })
    })
      .count()
      .ne(0)
  }
  return filter.coerceTo('array').do(() => r.expr(false))
}

// get records that are not this one from a previous filter
export function notThisRecord (backend, type, args, filter) {
  filter = filter || backend.getCollection(backend)
  let { primaryKey } = backend.getTypeComputed(type)
  let id = backend.getPrimaryFromArgs(type, args)
  return filter.filter((obj) => obj(primaryKey).ne(id))
}

export default {
  getRelationFilter,
  getArgsFilter,
  violatesUnique,
  notThisRecord
}