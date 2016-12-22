import _ from 'lodash'

export const QUERY = 'query'
export const MUTATION = 'mutation'
export const PRIMITIVES = ['String', 'Int', 'Float', 'Boolean', 'ID']

function makeObjectName (schema, op) {
  return `backend${_.capitalize(schema)}${_.capitalize(op)}`
}

function getTypeName (type) {
  return _.isArray(type) ? _.first(type) : type
}

function isPrimitive (type) {
  if (_.isArray(type)) {
    if (type.length !== 1) return false
    type = type[0]
  }
  return _.includes(PRIMITIVES, type)
}

function getType (fieldDef) {
  if ((_.isArray(fieldDef) && fieldDef.length === 1) || _.isString(fieldDef)) return fieldDef
  else if (_.has(fieldDef, 'type')) return fieldDef.type
}

function makeFieldDef (fieldDef) {
  let def = _.merge({}, _.isObject(fieldDef) ? fieldDef : {})
  let type = getType(fieldDef)
  if (type) def.type = type
  return def
}

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

/*
 * Main compiler class
 */
export default class GraphQLFactoryBackendCompiler {
  constructor (backend) {
    this.backend = backend
    this.definition = backend.definition
    this.definition.compile()
  }

  compile () {
    return this.computeExtension()
      .buildQueries()
      .buildMutations()
      .buildRelations()
      .value()
  }

  value () {
    return this.definition
  }

  computeExtension () {
    _.forEach(this.definition.types, (definition) => {
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
    _.forEach(this.definition.types, (definition, typeName) => {
      let _backend = _.get(definition, `["${this.backend._extension}"]`, {})
      let computed = _.get(_backend, 'computed', {})
      let { query } = _backend
      let { collection, schemas } = computed
      if (query === false || !collection) return

      query = _.isObject(query) ? query : {}
      query.read = !query.read && query.read !== false ? true : query.read

      // add properties for each schema type
      _.forEach(schemas, (schema) => {
        let objName = makeObjectName(schema, QUERY)
        _.set(this.definition.schemas, `["${schema}"].query`, objName)

        _.forEach(query, (opDef, name) => {
          let { type, args, resolve, before } = opDef
          let fieldName = name === 'read' ? `${name}${typeName}` : name

          _.set(this.definition.types, `["${objName}"].fields["${fieldName}"]`, {
            type: type || [name],
            args: args || this.buildArgs(definition, QUERY),
            resolve: resolve || fieldName
          })

          if (opDef === true || !resolve) {
            _.set(this.definition, `functions.${fieldName}`, this.readResolver(typeName))
          } else if (_.isFunction(resolve)) {
            _.set(this.definition, `functions.${fieldName}`, resolve)
          }

          // check for before stub
          before = _.isFunction(before) ? before.bind(this) : () => Promise.resolve()
          _.set(_backend, `computed.before["${fieldName}"]`, before)
        })
      })
    })

    // support chaining
    return this
  }

  buildMutations () {
    _.forEach(this.definition.types, (definition, typeName) => {
      let _backend = _.get(definition, `["${this.backend._extension}"]`, {})
      let computed = _.get(_backend, 'computed', {})
      let { mutation } = _backend
      let { collection, schemas } = computed
      if (mutation === false || !collection) return

      mutation = _.isObject(mutation) ? mutation : {}
      mutation.create = !mutation.create && mutation.create !== false ? true : mutation.create
      mutation.update = !mutation.update && mutation.update !== false ? true : mutation.update
      mutation.delete = !mutation.delete && mutation.delete !== false ? true : mutation.delete

      // add properties for each schema type
      _.forEach(schemas, (schema) => {
        let objName = makeObjectName(schema, MUTATION)
        _.set(this.definition.schemas, `["${schema}"].query`, objName)

        _.forEach(query, (opDef, name) => {
          let { type, args, resolve, before } = opDef
          let fieldName = _.includes(['create', 'update', 'delete'], name) ? `${name}${typeName}` : name

          _.set(this.definition.types, `["${objName}"].fields["${fieldName}"]`, {
            type: type || [name],
            args: args || this.buildArgs(definition, MUTATION),
            resolve: resolve || fieldName
          })

          if (opDef === true || !resolve) {
            _.set(this.definition, `functions.${fieldName}`, this.readResolver(typeName))
          } else if (_.isFunction(resolve)) {
            _.set(this.definition, `functions.${fieldName}`, resolve)
          }

          // check for before stub
          before = _.isFunction(before) ? before.bind(this) : () => Promise.resolve()
          _.set(_backend, `computed.before["${fieldName}"]`, before)
        })
      })
    })

    // support chaining
    return this
  }

  buildRelations () {
    _.forEach(this.definition.types, (definition, name) => {
      let fields = _.get(definition, 'fields', {})
      let _backend = _.get(definition, `["${this.backend._extension}"]`, {})

      // examine each field
      _.forEach(fields, (fieldDef, fieldName) => {
        let type = getType(fieldDef)
        if (!type) return true
        let typeName = getTypeName(type)

        fieldDef = fields[fieldName] = makeFieldDef(fieldDef)
        let { belongsTo, has } = fieldDef

        // add belongsTo relationship to the current type
        if (belongsTo) {
          _.forEach(belongsTo, (config, type) => {
            _.forEach(config, (key, field) => {
              let foreignFieldDef = _.get(this._types, `["${type}"].fields["${field}"]`)
              _.set(_backend, `computed.relations.belongsTo["${type}"]["${field}"]`, {
                primary: fieldName,
                foreign: key,
                many: _.isArray(getType(foreignFieldDef))
              })
            })
          })
        }

        // add a has relationship to the nested type. this is because the nested types resolve
        // will determine how it returns data
        if (has) {
          let relationPath = `["${typeName}"]["${this.backend._extension}"].computed.relations`
          _.set(this.definition.types, `["${relationPath}"].has["${name}"]["${fieldName}"]`, {
            foreign: has,
            many: _.isArray(type)
          })
        }
      })
    })

    // support chaining
    return this
  }

  /*
   * Helper methods
   */
  buildArgs (definition, operation) {
    let args = {}
    let fields = _.get(definition, 'fields', {})
    let _backend = _.get(definition, `["${this.backend._extension}"]`, {})

    if (operation === QUERY) args.limit = {type: 'Int'}

    _.forEach(fields, (fieldDef, fieldName) => {
      let type = getType(fieldDef)
      if (!type) return true
      let typeName = getTypeName(type)
      fieldDef = fields[fieldName] = makeFieldDef(fieldDef)

      if (isPrimitive(type)) {
        args[fieldName] = { type }
      } else {
        let typeBackend = _.get(this.definition.types, `["${typeName}"]["${this.backend._extension}"]`)

        if (fieldDef.resolve !== false && operation === QUERY && typeBackend) {
          fieldDef.resolve = fieldDef.resolve || `read${type}`
        } else {
          // add args for related types
          if (fieldDef.belongsTo) {
            args[fieldName]  = { type: 'String' }
          } else if (fieldDef.has) {
            args[fieldName] = _.isArray(fieldDef.type) ? ['String'] : 'String'
          } else {
            args[fieldName] = { type }
          }
        }
      }
    })
    return args
  }
}