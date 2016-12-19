import _ from 'lodash'

export function computeUniques (fields) {
  let [ mixed, uniques ] = [ {}, [] ]
  _.forEach(fields, (fieldDef, field) => {
    let type = _.isArray(fieldDef.type) ? _.get(fieldDef, 'type[0]') : fieldDef.type
    if (fieldDef.unique === true) {
      uniques.push([ { field, type } ])
    } else if (_.isString(fieldDef.uniqueWith)) {
      if (!_.isArray(mixed[fieldDef.uniqueWith])) mixed[fieldDef.uniqueWith] = [ { field, type } ]
      else mixed[fieldDef.uniqueWith].push({ field, type })
    }
  })
  _.forEach(mixed, (compound) => uniques.push(compound))
  return _.uniq(uniques)
}

export default class GraphQLFactoryBackendCompiler {
  constructor (backend) {
    this.backend = backend
    this.compiled = backend.definition.compile()
  }

  compile () {
    return this.normalizeExtension().value()
  }

  value () {
    return this.compiled
  }

  normalizeExtension () {
    _.forEach(this.compiled.types, (definition) => {
      let { fields, _backend } = definition
      let { schema, table, collection, store, db, mutation, query } = _backend || {}
      if (!_.isObject(fields) || !_.isObject(_backend)) return true

      _backend.collection = `${this._prefix}${collection || table}`
      _backend.store = store || db || this.defaultStore

      // check that the type has a schema identified, otherwise create a schema with the namespace
      _backend.schemaName = _.isString(schema) ? schema : this.namespace
      _backend.queryName = `${schemaName}Query`
      _backend.mutationName = `${schemaName}Mutation`

      // get the primary key name
      let primary = _backend.primary = this.getPrimary(fields)
      _backend.primaryKey = _backend.primaryKey || _.isArray(primary) ? _.camelCase(primary.join('-')) : primary

      // get the uniques
      _backend.uniques = computeUniques(fields)
      _backend.before = {}

      // add queries
      if (query !== false && collection) {

      }

      return this
    })
  }
}