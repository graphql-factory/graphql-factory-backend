import _ from 'lodash'
import Bluebird from 'bluebird'

export function isPromise (obj) {
  if (obj instanceof Promise || obj instanceof Bluebird) return true
  if (_.isFunction(_.get(obj, 'then')) && _.isFunction(_.get(obj, 'catch'))) return true
  return false
}

export function reqlPath (base, pathStr) {
  _.forEach(_.toPath(pathStr), (p) => {
    base = base(p)
  })
  return base
}

// gets relationships defined in the type definition and also
export function getRelationFilter (backend, type, source, info, filter) {
  filter = filter || backend.getCollection(type)

  // temporal plugin details
  let { r, definition, _temporalExtension } = backend
  let temporalDef = _.get(definition, `types["${type}"]["${_temporalExtension}"]`, {})
  let { versioned, readMostCurrent } = temporalDef
  let isVersioned = Boolean(versioned) && definition.hasPlugin('GraphQLFactoryTemporal')
  let date = _.get(info, `rootValue["${_temporalExtension}"].date`, null)
  let temporalFilter = _.get(this, `globals["${_temporalExtension}"].temporalFilter`)
  let temporalArgs = {}
  let versionArgs = _.get(source, 'versionArgs')
  if (date) temporalArgs.date = date
  temporalArgs = _.isEmpty(versionArgs) ? temporalArgs : versionArgs

  // standard plugin details
  let id = null
  let many = true
  let { fields, nested, currentPath, belongsTo, has } = backend.getTypeInfo(type, info)

  // check for nested relations
  if (nested) {
    // check for belongsTo relation
    if (_.has(fields, belongsTo.primary)
      && (_.has(source, belongsTo.foreign)
      || (isVersioned && has.foreign === `${_temporalExtension}.recordId`))) {
      many = belongsTo.many

      // get the relates source id(s)
      id = _.get(source, belongsTo.foreign)

      // if there is no has id, or the hasId is an empty array, return an empty array
      if (!id || (_.isArray(id) && !id.length)) return { filter: r.expr([]), many }

      // if versioned filter the correct versions
      filter = (isVersioned && belongsTo.foreign === `${_temporalExtension}.recordId`)
        ? temporalFilter(type, temporalArgs)
        : filter

      filter = filter.filter((rec) => reqlPath(rec, belongsTo.primary).eq(id))
    }

    // check for has
    else if (_.has(fields, has.foreign) || (isVersioned && has.foreign === `${_temporalExtension}.recordId`)) {
      many = has.many

      // get the related source id(s)
      id = _.get(source, currentPath)

      // if there is no has id, or the hasId is an empty array, return an empty array
      if (!id || (_.isArray(id) && !id.length)) return { filter: r.expr([]), many }

      // if versioned filter the correct versions
      filter = (isVersioned && has.foreign === `${_temporalExtension}.recordId`)
        ? filter = temporalFilter(type, temporalArgs)
        : filter

      filter = many
        ? filter.filter((rec) => r.expr(id).contains(reqlPath(rec, has.foreign)))
        : filter.filter((rec) => reqlPath(rec, has.foreign).eq(id))
    }
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
  let unique = _.isArray(args)
    ? _.map((arg) => backend.getUniqueArgs(type, args))
    : [backend.getUniqueArgs(type, args)]

  let uniqueViolation = _.reduce(unique, (result, value) => {
    return result && _.filter(unique, value).length > 1
  }, true)

  if (uniqueViolation) return r.error('unique field violation')

  if (unique.length) {
    return filter.filter((obj) => {
      return r.expr(unique)
        .prepend(true)
        .reduce((prevArg, arg) => {
          return prevArg.and(
            arg.prepend(true)
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