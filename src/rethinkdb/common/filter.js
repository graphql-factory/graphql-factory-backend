import _ from 'lodash'

/**
 * Gets a nested property from a reql object
 * @param {Object} base - base reql object
 * @param {String} pathStr - path string to the property
 * @return {Object} - reql object
 */
export function reqlPath (base, pathStr) {
  _.forEach(_.toPath(pathStr), (p) => {
    base = base(p)
  })
  return base
}

/**
 * Gets nested relationships defined on the type and wether or not they are a many relationship
 * @param {Object} backend - factory backend instance
 * @param {String} type - graphql type name
 * @param {Object} source - source from a field resolve
 * @param {Object} info - info from a field resolve
 * @param {Object} [filter] - starting filter
 * @return {{filter: Object, many: Boolean}}
 */
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

/**
 * Creates a reql filter based on the arguments object
 * @param {Object} backend - factory backend instance
 * @param {String} type - graphql type name
 * @param {Object} args - args from a field resolve
 * @param {Object} [filter] - starting filter
 * @return {Object} - reql filter
 */
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
/**
 * determines if any unique constraints will be violated by the args
 * @param {Object} backend - factory backend instance
 * @param {String} type - graphql type name
 * @param {Object} args - args from a field resolve
 * @param {Object} [filter] - starting filter
 * @return {Object} - reql filter
 */
export function violatesUnique (backend, type, args, filter) {
  filter = filter || backend.getCollection(type)
  let { r } = backend

  let unique = _.isArray(args)
    ? _.map(args, (arg) => backend.getUniqueArgs(type, arg))
    : [backend.getUniqueArgs(type, args)]

  // if there are no uniques, return false
  if (!_.flatten(unique).length) return r.expr(false)

  let uniqueViolation = _.reduce(unique, (result, value) => {
    return result && _.filter(unique, value).length > 1
  }, true)

  if (uniqueViolation) return r.error('unique field violation')

  if (unique.length) {
    return filter.filter((obj) => {
      return r.expr(unique)
        .prepend(false)
        .reduce((prevArg, arg) => {
          return prevArg.or(
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
  return filter.coerceTo('ARRAY').do(() => r.expr(false))
}

/**
 * Validates that related ids exist
 * @param {Object} backend - factory backend instance
 * @param {String} type - graphql type name
 * @param {Object} args - args from a field resolve
 * @param {Object} [filter] - starting filter
 * @return {Object} - reql filter
 */
export function existsFilter (backend, type, args) {
  let { r } = backend

  // reduce the related values to a flat array
  let exists = _(args).map((arg) => backend.getRelatedValues(type, arg)).flatten()
    .reduce((result, value) => _.find(result, value) ? result : _.union(result, [value]), [])

  // if there are no exists to check, tryutn true
  if (!exists.length) return r.expr(true)

  // otherwise perform a reduce
  return r.expr(exists).prepend(true)
    .reduce((prev, cur) => prev.and(r.db(cur('store')).table(cur('collection')).get(cur('id')).ne(null)))
}

function search (r, rec, search) {
  _.forEach(search, (sub, operator) => {
    switch (operator) {
      case '$and':
        return _.reduce(sub, (accum, cur) => {
          accum.and(search(r, rec, cur))
        }, rec)

      default:
        return rec(operator).default(null)
    }
  })
}

/**
 * creates a filter from a json/mongodb style search
 * @param backend
 * @param type
 * @param search
 * @param filter
 */
export function searchFilter (backend, type, search, filter) {
  filter = filter || backend.getCollection(type)
  let { r } = backend

  if (_.isEmpty(search)) return filter

  return filter((rec) => {

  })
}

export default {
  reqlPath,
  existsFilter,
  getRelationFilter,
  getArgsFilter,
  violatesUnique
}