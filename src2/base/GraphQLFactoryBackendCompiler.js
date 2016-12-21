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
    return this.computeExtension().value()
  }

  value () {
    return this.compiled
  }

  computeExtension () {
    _.forEach(this.compiled.types, (definition) => {
      let fields = _.get(definition, 'fields', {})
      let ext = _.get(definition, `["${this.backend._extension}"]`, {})
      let { schema, table, collection, store, db, mutation, query } = ext

      if (!_.isObject(fields) || !_.isObject(ext)) return true
      let computed = ext.computed = {}

      computed.collection = `${this._prefix}${collection || table}`
      computed.store = store || db || this.defaultStore

      // check that the type has a schema identified, otherwise create a schema with the namespace
      // allow schemas to be an array so that queries/mutations can belong to multiple schemas
      computed.schemas = !schema ? [this.backend._namespace] : _.isArray(schema) ? schema : [schema]
      computed.queries = _.map(computed.schemas, (schema) => {
        return {
          schema,
          name: `backend${_.capitalize(schema)}Query`
        }
      })
      computed.mutations = _.map(computed.schemas, (schema) => {
        return {
          schema,
          name: `backend${_.capitalize(schema)}Mutation`
        }
      })

      // get the primary key name
      let primary = computed.primary = this.getPrimary(fields)
      computed.primaryKey = ext.primaryKey || _.isArray(primary) ? _.camelCase(primary.join('-')) : primary

      // get the uniques
      computed.uniques = computeUniques(fields)
      computed.before = {}

      // support chaining
      return this
    })
  }

  buildQueries () {
    _.forEach(this.compiled.types, (definition) => {
      let _backend = _.get(definition, `["${this.backend._extension}"]`, {})
      let computed = _.get(_backend, 'computed', {})
      let { query } = _backend
      let { collection } = computed

      if (query && collection) {

      }
    })
  }
}