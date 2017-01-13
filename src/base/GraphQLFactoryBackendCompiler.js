import _ from 'lodash'

// constant values - should be centralized at some point
export const CREATE = 'create'
export const READ = 'read'
export const UPDATE = 'update'
export const DELETE = 'delete'
export const BATCH_CREATE = 'batchCreate'
export const BATCH_UPDATE = 'batchUpdate'
export const BATCH_DELETE = 'batchDelete'
export const QUERY = 'query'
export const MUTATION = 'mutation'
export const SUBSCRIPTION = 'subscription'
export const SUBSCRIBE = 'subscribe'
export const UNSUBSCRIBE = 'unsubscribe'
export const STRING = 'String'
export const INT = 'Int'
export const FLOAT = 'Float'
export const BOOLEAN = 'Boolean'
export const ID = 'ID'
export const INPUT = 'Input'
export const OBJECT = 'Object'
export const SCALAR = 'Scalar'
export const ENUM = 'Enum'
export const PRIMITIVES = [STRING, INT, FLOAT, BOOLEAN, ID]

/**
 * Determines if the operation is a batch operation
 * @param {String} op - operation type
 * @return {Boolean}
 */
function isBatchOperation (op) {
  return _.includes([BATCH_CREATE, BATCH_UPDATE, BATCH_DELETE], op)
}

/**
 * Creates an input name
 * @param {String} typeName - graphql type name
 * @param {String} opName - batch operation name
 * @return {string}
 */
function makeInputName (typeName, opName) {
  switch (opName) {
    case CREATE:
      return `backendCreate${typeName}Input`
    case BATCH_CREATE:
      return `backendCreate${typeName}Input`

    case UPDATE:
      return `backendUpdate${typeName}Input`
    case BATCH_UPDATE:
      return `backendUpdate${typeName}Input`

    case DELETE:
      return `backendDelete${typeName}Input`
    case BATCH_DELETE:
      return `backendDelete${typeName}Input`

    default:
      return `${typeName}Input`
  }
}

/**
 * Generates a schema operation object name
 * @param {String} schema - schema name
 * @param {String} op - operation type: QUERY || MUTATION || SUBSCRIPTION
 * @return {string}
 */
function makeObjectName (schema, op) {
  return `backend${_.capitalize(schema)}${_.capitalize(op)}`
}

/**
 * Determines the primary key(s) for a type from its field definition
 * @param {Object} fields - field definition
 * @return {null|String|Array<String>}
 */
function getPrimary (fields) {
  let primary = _(fields).pickBy((v) => v.primary === true).keys().value()
  return !primary.length ? null : primary.length === 1 ? primary[0] : primary
}

/**
 * Extracts the type name, since a type name enclosed in an array means it is a list type
 * @param {String|Array<String>} type
 * @return {String}
 */
function getTypeName (type) {
  return _.isArray(type) ? _.first(type) : type
}

/**
 * Determines if the type is a graphql primitive
 * @param {String} type
 * @return {Boolean}
 */
function isPrimitive (type) {
  if (_.isArray(type)) {
    if (type.length !== 1) return false
    type = type[0]
  }
  return _.includes(PRIMITIVES, type)
}

/**
 * Gets the type from a field definition
 * @param {Object|String|Array<String>} fieldDef - field definition
 * @return {String|Array<String>}
 */
function getType (fieldDef) {
  if ((_.isArray(fieldDef) && fieldDef.length === 1) || _.isString(fieldDef)) return fieldDef
  else if (_.has(fieldDef, 'type')) return fieldDef.type
}

/**
 * Ensures that the field definition is an Object with a type field
 * @param {Object|String|Array<String>} fieldDef
 * @return {Object}
 */
function makeFieldDef (fieldDef) {
  let def = _.merge({}, _.isObject(fieldDef) ? fieldDef : {})
  let type = getType(fieldDef)
  if (type) def.type = type
  return def
}

/**
 * Determines fields that should be unique. uniqueWith fields are grouped by the provided group name
 * @param {Object} fields - field definition
 * @return {Array}
 */
function computeUniques (fields) {
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
  _.forEach(mixed, (compound) => uniques.push(_.sortBy(compound, ['field'])))
  return _.uniq(uniques)
}

/**
 * Determines if the type is an object
 * @param type
 */
function isObjectType (type) {
  return !type
    || type === 'Object'
    || _.includes(type, 'Object')
    || type.Object !== undefined
}

/**
 * GraphQL Factory Backend Compiler - updates the schema definition and generates resolvers
 * based on backend extension definition for each type
 */
export default class GraphQLFactoryBackendCompiler {
  /**
   * Initializes the compiler
   * @param {GraphQLFactoryBackend} backend - instance of GraphQLFactoryBackend
   */
  constructor (backend) {
    this.backend = backend
    this.defaultStore = backend._defaultStore
    this.temporalExtension = backend._temporalExtension
    this.extension = backend._extension
    this.prefix = _.isString(backend._prefix) ? backend._prefix : ''
    this.definition = backend.definition
    this.queryArgs = {}
  }

  /**
   * Compiles the definition and returns the compiler
   * @return {GraphQLFactoryBackendCompiler}
   */
  compileDefinition () {
    this.definition.compile()
    return this
  }

  /**
   * Performs the definition compile in a specific order
   * @return {GraphQLFactoryDefinition}
   */
  compile () {
    return this.extendTemporal()
      .compileDefinition()
      .computeExtension()
      .addInputTypes()
      .buildRelations()
      .buildQueries()
      .buildMutations()
      .buildSubscriptions()
      .setListArgs()
      .value()
  }

  /**
   * Returns the current definition value
   * @return {GraphQLFactoryDefinition}
   */
  value () {
    return this.definition
  }

  /**
   * Adds input types for each object that has a collection backing it
   * @return {GraphQLFactoryBackendCompiler}
   */
  addInputTypes () {
    let be = this.backend
    let types = this.definition.types

    _.forEach(types, (typeDef, typeName) => {
      let { type, fields } = typeDef
      let { relations, collection, primaryKey } = be.getTypeComputed(typeName) || {}
      let versioned = this.isVersioned(typeDef)

      // initialize the create and update input types
      // both are created because update should require different fields
      let create = { type: 'Input', fields: {} }
      let update = { type: 'Input', fields: {} }
      let remove = { type: 'Input', fields: {} }
      let query = {}

      if (isObjectType(type)) {
        // get the computed belongsTo relations
        let belongsToRelations = _(_.get(relations, 'belongsTo'))
          .map((val) => _.keys(val))
          .flatten()
          .value()

        // analyze each field
        _.forEach(fields, (fieldDef, fieldName) => {
          let def = null

          // get the fieldDef
          if (_.isArray(fieldDef) || _.isString(fieldDef) || _.has(fieldDef, 'type')) {
            def = makeFieldDef(fieldDef)
          } else if (_.isObject(fieldDef) && _.isObject(fieldDef.Object)) {
            def = makeFieldDef(fieldDef.Object)
          } else {
            return true
          }

          // get the type name and if it is a list
          let { primary, nullable, has, belongsTo, protect } = def
          let type = getType(def)
          let fieldTypeName = getTypeName(type)
          let isList = _.isArray(type)

          // determine if the field is nullable
          nullable = _.isBoolean(nullable)
            ? nullable
            : _.isBoolean(primary)
              ? !primary
              : true

          // check for primary key which is always required for update and remove
          if (fieldName === primaryKey) {
            _.set(create, `fields["${fieldName}"]`, { type, nullable: true })
            _.set(update, `fields["${fieldName}"]`, { type, nullable: false })
            _.set(remove, `fields["${fieldName}"]`, { type, nullable: false })
            _.set(query, `["${fieldName}"]`, { type })
          }

          // check for belongsTo which should not be included because it is a resolved field
          // also ignore the temporal extension
          else if (
            !has
            && (
              belongsTo
              || (this.isVersioned(typeDef) && fieldName === this.temporalExtension)
              || _.includes(belongsToRelations, fieldName)
            )
          ) {
            return true
          }

          // check for primitive that requires no extra processing
          else if (isPrimitive(fieldTypeName)
            || be.extendsType(fieldTypeName, ['Input', 'Enum', 'Scalar']).length) {
            _.set(create, `fields["${fieldName}"]`, { type, nullable })
            _.set(update, `fields["${fieldName}"]`, { type })
            _.set(query, `["${fieldName}"]`, { type })
          }

          // check for valid extended types
          else if (be.extendsType(fieldTypeName, ['Object']).length) {
            // if the field is a relation, the type should be the fields foreign key
            if (has) {
              let relatedFk = _.get(has, 'foreignKey', has)
              let relatedFields = _.get(types, `["${fieldTypeName}"].fields`)
              let relatedDef = _.get(relatedFields, relatedFk)
              let relatedType = getTypeName(getType(makeFieldDef(relatedDef)))

              // if the related type cannot be resolved return
              if (!relatedType) return true

              // otherwise set the create and update fields
              _.set(create, `fields["${fieldName}"]`, {
                type: isList ? [relatedType] : relatedType,
                nullable
              })
              _.set(update, `fields["${fieldName}"]`, {
                type: isList ? [relatedType] : relatedType
              })
            }

            // other types should use the generated input type
            else {
              let createInputName = makeInputName(fieldTypeName, CREATE)
              let updateInputName = makeInputName(fieldTypeName, UPDATE)

              _.set(create, `fields["${fieldName}"]`, {
                type: isList ? [createInputName] : createInputName,
                nullable
              })
              _.set(update, `fields["${fieldName}"]`, {
                type: isList ? [updateInputName] : updateInputName
              })
            }
          }

          // check for protected and remove from update
          if (protect === true) delete update.fields[fieldName]
        })

        // if versioned, add extra fields
        if (versioned) {
          create.fields = _.merge(create.fields, {
            useCurrent: { type: 'Boolean', defaultValue: false }
          })
          update.fields = _.merge(update.fields, {
            useCurrent: { type: 'Boolean' }
          })
          query = _.merge(query, {
            id: { type: 'String' },
            version: { type: 'String' },
            recordId: { type: 'String' },
            date: { type: 'TemporalDateTime' }
          })
        }

        // add the types to the definition
        if (!_.isEmpty(create.fields)) types[makeInputName(typeName, CREATE)] = create
        if (!_.isEmpty(update.fields)) types[makeInputName(typeName, UPDATE)] = update
        if (!_.isEmpty(remove.fields)) types[makeInputName(typeName, DELETE)] = remove
        this.queryArgs[typeName] = query
      }
    })

    return this
  }

  /**
   * Extends the definition with temporal fields if using the GraphQLFactoryTemporal plugin
   * @return {GraphQLFactoryBackendCompiler}
   */
  extendTemporal () {
    if (this.definition.hasPlugin('GraphQLFactoryTemporal')) {
      _.forEach(this.definition.types, (typeDef, typeName) => {
        let { versioned, fork, branch, publish } = _.get(typeDef, `["${this.temporalExtension}"]`, {})

        if (versioned === true) {
          // extend the temporal fields
          typeDef.extendFields = typeDef.extendFields || []
          typeDef.extendFields = _.isArray(typeDef.extendFields)
            ? typeDef.extendFields
            : [typeDef.extendFields]
          typeDef.extendFields = _.union(typeDef.extendFields, ['TemporalType'])

          // add version mutations
          if (fork !== false) {
            if (_.isString(fork)) {
              let forkFn = _.get(this.definition.functions, `["${fork}"]`)
              if (!_.isFunction(forkFn)) throw new Error(`cannot find function "${fork}"`)
              fork = forkFn
            } else if (fork === true || fork === undefined) {
              fork = `forkTemporal${typeName}`
            } else if (_.isFunction(fork)) {
              fork = fork
            } else {
              throw new Error('invalid value for fork resolve')
            }

            _.set(typeDef, `["${this.extension}"].mutation["fork${typeName}"]`, {
              type: typeName,
              args: {
                id: { type: 'String', nullable: 'false' },
                name: { type: 'String', nullable: 'false' },
                owner: { type: 'String' },
                changeLog: { type: 'TemporalChangeLogInput' }
              },
              resolve: fork
            })
          }

          if (branch !== false) {
            if (_.isString(branch)) {
              let branchFn = _.get(this.definition.functions, `["${branch}"]`)
              if (!_.isFunction(branchFn)) throw new Error(`cannot find function "${branch}"`)
              branch = branchFn
            } else if (branch === true || branch === undefined) {
              branch = `branchTemporal${typeName}`
            } else if (_.isFunction(branch)) {
              branch = branch
            } else {
              throw new Error('invalid value for branch resolve')
            }

            _.set(typeDef, `["${this.extension}"].mutation["branch${typeName}"]`, {
              type: typeName,
              args: {
                id: { type: 'String', nullable: 'false' },
                name: { type: 'String', nullable: 'false' },
                owner: { type: 'String' },
                changeLog: { type: 'TemporalChangeLogInput' }
              },
              resolve: branch
            })
          }

          if (publish !== false) {
            if (_.isString(publish)) {
              let publishFn = _.get(this.definition.functions, `["${publish}"]`)
              if (!_.isFunction(publishFn)) throw new Error(`cannot find function "${publish}"`)
              publish = publishFn
            } else if (publish === true || publish === undefined) {
              publish = `publishTemporal${typeName}`
            } else if (_.isFunction(publish)) {
              publish = publish
            } else {
              throw new Error('invalid value for publish resolve')
            }

            _.set(typeDef, `["${this.extension}"].mutation["publish${typeName}"]`, {
              type: typeName,
              args: {
                id: { type: 'String', nullable: 'false' },
                version: { type: 'String' },
                changeLog: { type: 'TemporalChangeLogInput' }
              },
              resolve: publish
            })
          }
        }
      })
    }
    return this
  }

  /**
   * Calculates PrimaryKey, collection, store, uniques, etc for each type and stores it in the backend extension
   * @return {GraphQLFactoryBackendCompiler}
   */
  computeExtension () {
    _.forEach(this.definition.types, (definition) => {
      if (definition.type && definition.type !== OBJECT) {
        delete definition[this.extension]
        return
      }

      let fields = _.get(definition, 'fields', {})
      let ext = _.get(definition, `["${this.extension}"]`)

      if (!_.isObject(fields) || !_.isObject(ext)) return true

      let { schema, table, collection, store, db, mutation, query } = ext
      let computed = ext.computed = {}

      computed.collection = `${this.prefix}${collection || table}`
      computed.store = store || db || this.defaultStore

      // check that the type has a schema identified, otherwise create a schema with the namespace
      // allow schemas to be an array so that queries/mutations can belong to multiple schemas
      computed.schemas = !schema ? [this.backend._namespace] : _.isArray(schema) ? schema : [schema]

      // get the primary key name
      let primary = computed.primary = getPrimary(fields)
      computed.primaryKey = ext.primaryKey || _.isArray(primary) ? _.camelCase(primary.join('-')) : primary

      // determine the type of the primary
      let primarySample = _.isArray(primary) ? _.first(primary) : primary
      let primaryDef = _.get(fields, `["${primarySample}"]`)
      let primaryType = (_.isString(primaryDef) || _.isArray(primaryDef))
        ? primaryDef
        : _.has(primaryDef, 'type')
          ? primaryDef.type
          : 'String'
      let primaryTypeName = _.isArray(primaryType)
        ? _.first(primaryType)
        : primaryType

      _.set(fields, `["${computed.primaryKey}"].type`, _.isArray(primary) ? [primaryTypeName] : primaryTypeName)

      // get the uniques
      computed.uniques = computeUniques(fields)
      computed.before = {}
      computed.after = {}
    })

    // support chaining
    return this
  }

  /**
   * Sets the appropriate query resolvers/hooks and adds any custom queries
   * @return {GraphQLFactoryBackendCompiler}
   */
  buildQueries () {
    _.forEach(this.definition.types, (definition, typeName) => {
      let _backend = _.get(definition, `["${this.extension}"]`, {})
      let computed = _.get(_backend, 'computed', {})
      let { query } = _backend
      let { collection, schemas } = computed
      if (query === false || !collection) return

      query = _.isObject(query) ? query : {}
      query.read = !query.read && query.read !== false ? true : query.read

      // add properties for each schema type
      _.forEach(schemas, (schema) => {
        if (!schema) return true

        let objName = makeObjectName(schema, QUERY)
        _.set(this.definition.schemas, `["${schema}"].query`, objName)

        _.forEach(query, (opDef, opName) => {
          let { type, args, resolve, before, after, error } = opDef
          let fieldName = opName === READ ? `${opName}${typeName}` : opName
          let resolveName = _.isString(resolve) ? resolve : `backend_${fieldName}`

          _.set(this.definition.types, `["${objName}"].fields["${fieldName}"]`, {
            type: type || [typeName],
            args: args || this.buildArgs(definition, QUERY, typeName, opName),
            resolve: resolveName
          })

          if (opDef === true || !resolve) {
            _.set(this.definition, `functions.${resolveName}`, this.backend.readResolver(typeName))
          } else if (_.isFunction(resolve)) {
            _.set(this.definition, `functions.${resolveName}`, resolve)
          }

          // check for before and after hooks
          if (_.isFunction(before)) _.set(_backend, `computed.before["${resolveName}"]`, before)
          if (_.isFunction(after)) _.set(_backend, `computed.after["${resolveName}"]`, after)
          if (_.isFunction(error)) _.set(_backend, `computed.error["${resolveName}"]`, error)
        })
      })
    })

    // support chaining
    return this
  }

  /**
   * Sets the appropriate mutation resolvers/hooks and adds any custom mutations
   * @return {GraphQLFactoryBackendCompiler}
   */
  buildMutations () {
    _.forEach(this.definition.types, (definition, typeName) => {
      let _backend = _.get(definition, `["${this.extension}"]`, {})
      let computed = _.get(_backend, 'computed', {})
      let { mutation } = _backend
      let { collection, schemas } = computed
      if (mutation === false || !collection) return

      mutation = _.isObject(mutation) ? mutation : {}

      // set single mutations
      mutation.create = (!mutation.create && mutation.create !== false)
        ? true
        : mutation.create
      mutation.update = (!mutation.update && mutation.update !== false)
        ? true
        : mutation.update
      mutation.delete = (!mutation.delete && mutation.delete !== false)
        ? true
        : mutation.delete

      // set batch mutations
      mutation.batchCreate = (!mutation.batchCreate && mutation.batchCreate !== false)
        ? true
        : mutation.batchCreate
      mutation.batchUpdate = (!mutation.batchUpdate && mutation.batchUpdate !== false)
        ? true
        : mutation.batchUpdate
      mutation.batchDelete = (!mutation.batchDelete && mutation.batchDelete !== false)
        ? true
        : mutation.batchDelete

      // add properties for each schema type
      _.forEach(schemas, (schema) => {
        if (!schema) return true

        let objName = makeObjectName(schema, MUTATION)
        _.set(this.definition.schemas, `["${schema}"].mutation`, objName)

        _.forEach(mutation, (opDef, opName) => {
          let { type, args, resolve, before, after, error } = opDef
          let ops = [CREATE, UPDATE, DELETE, BATCH_CREATE, BATCH_UPDATE, BATCH_DELETE]
          let fieldName = _.includes(ops, opName) ? `${opName}${typeName}` : opName
          let resolveName = _.isString(resolve) ? resolve : `backend_${fieldName}`
          let isBatchOp = isBatchOperation(opName)

          _.set(this.definition.types, `["${objName}"].fields["${fieldName}"]`, {
            type: (opName === DELETE || opName === BATCH_DELETE)
              ? INT
              : type
                ? type
                : isBatchOp
                  ? [typeName]
                  : typeName,
            args: args || this.buildArgs(definition, MUTATION, typeName, opName),
            resolve: resolveName
          })

          if (opDef === true || !resolve) {
            _.set(this.definition, `functions.${resolveName}`, this.backend[`${opName}Resolver`](typeName))
          } else if (_.isFunction(resolve)) {
            _.set(this.definition, `functions.${resolveName}`, resolve)
          }

          // check for hooks
          if (_.isFunction(before)) _.set(_backend, `computed.before["${resolveName}"]`, before)
          if (_.isFunction(after)) _.set(_backend, `computed.after["${resolveName}"]`, after)
          if (_.isFunction(error)) _.set(_backend, `computed.error["${resolveName}"]`, error)
        })
      })
    })

    // support chaining
    return this
  }

  /**
   * Creates pub-sub subscriptions for each type
   * @return {GraphQLFactoryBackendCompiler}
   */
  buildSubscriptions () {
    _.forEach(this.definition.types, (definition, typeName) => {
      let _backend = _.get(definition, `["${this.extension}"]`, {})
      let computed = _.get(_backend, 'computed', {})
      let { subscription } = _backend
      let { collection, schemas } = computed
      if (subscription === false || !collection) return

      subscription = _.isObject(subscription)
        ? subscription
        : {}
      subscription.subscribe = !subscription.subscribe && subscription.subscribe !== false
        ? true
        : subscription.subscribe
      subscription.unsubscribe = !subscription.unsubscribe && subscription.unsubscribe !== false
        ? true
        : subscription.unsubscribe

      // add properties for each schema type
      _.forEach(schemas, (schema) => {
        if (!schema) return true

        let objName = makeObjectName(schema, SUBSCRIPTION)
        _.set(this.definition.schemas, `["${schema}"].subscription`, objName)

        _.forEach(subscription, (opDef, opName) => {
          let { type, args, resolve, before, after, error } = opDef
          let ops = [SUBSCRIBE, UNSUBSCRIBE]
          let fieldName = _.includes(ops, opName) ? `${opName}${typeName}` : opName
          let resolveName = _.isString(resolve) ? resolve : `backend_${fieldName}`
          let returnType = opName === UNSUBSCRIBE
            ? 'GraphQLFactoryUnsubscribeResponse'
            : type
              ? type
              : [typeName]

          _.set(this.definition.types, `["${objName}"].fields["${fieldName}"]`, {
            type: returnType,
            args: args || this.buildArgs(definition, SUBSCRIPTION, typeName, opName),
            resolve: resolveName
          })

          if (opDef === true || !resolve) {
            _.set(this.definition, `functions.${resolveName}`, this.backend[`${opName}Resolver`](typeName))
          } else if (_.isFunction(resolve)) {
            _.set(this.definition, `functions.${resolveName}`, resolve)
          }

          // check for before and after hooks
          if (_.isFunction(before)) _.set(_backend, `computed.before["${resolveName}"]`, before)
          if (_.isFunction(after)) _.set(_backend, `computed.after["${resolveName}"]`, after)
          if (_.isFunction(error)) _.set(_backend, `computed.error["${resolveName}"]`, error)
        })
      })
    })

    // support chaining
    return this
  }

  /**
   * Generates relation data for each type that can be used during read queries
   * @return {GraphQLFactoryBackendCompiler}
   */
  buildRelations () {
    _.forEach(this.definition.types, (definition, name) => {
      let fields = _.get(definition, 'fields', {})
      let _backend = _.get(definition, `["${this.extension}"]`, {})

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
              let foreignFieldDef = _.get(this.definition.types, `["${type}"].fields["${field}"]`)
              _.set(_backend, `computed.relations.belongsTo["${type}"]["${field}"]`, {
                primary: fieldName,
                foreign: _.isString(key) ? key : _.get(key, 'foreignKey', 'id'),
                many: _.isArray(getType(foreignFieldDef))
              })
            })
          })
        }

        // add a has relationship to the nested type. this is because the nested types resolve
        // will determine how it returns data
        if (has) {
          let relationPath = `["${typeName}"]["${this.extension}"].computed.relations`
          _.set(this.definition.types, `${relationPath}.has["${name}"]["${fieldName}"]`, {
            foreign: _.isString(has) ? has : _.get(has, 'foreignKey', 'id'),
            many: _.isArray(type)
          })
        }

        // add field resolves for types with collections
        if (_.has(this, `definition.types["${typeName}"]["${this.extension}"].collection`)) {
          fieldDef.resolve = fieldDef.resolve || `backend_read${typeName}`
        }
      })
    })

    // support chaining
    return this
  }

  /**
   * For each argument in a query that is not a primitive, add sub query args to the field
   * @return {GraphQLFactoryBackendCompiler}
   */
  setListArgs () {
    _.forEach(this.definition.types, (typeDef, typeName) => {
      let schema = _.get(typeDef, `["${this.extension}"].computed.schemas[0]`)
      let name = makeObjectName(schema, QUERY)

      _.forEach(typeDef.fields, (fieldDef, fieldName) => {
        let fieldType = getType(fieldDef)

        if (name && _.isArray(fieldType) && fieldType.length === 1 && fieldDef.args === undefined) {
          let type = _.get(fieldType, '[0]')
          let field = _.get(this.definition.types, `["${name}"].fields["read${type}"]`, {})

          if (field.resolve === `backend_read${type}` && _.isObject(field.args)) {
            _.set(this.definition.types, `["${typeName}"].fields["${fieldName}"].args`, field.args)
          }
        }
      })
    })

    // support chaining
    return this
  }

  /**
   * Determines if the type is versioned using the temporal plugin
   * @param typeDef
   * @return {boolean}
   */
  isVersioned (typeDef) {
    return _.get(typeDef, `["${this.backend._temporalExtension}"].versioned`) === true
  }

  /**
   * Generates an arguments object based on the type definition
   * @param {Object} definition - type definition
   * @param {String} operation - query || mutation || subscription
   * @param {String} rootName - name of the type for the current field
   * @param {String} opName - operation name
   * @return {Object}
   */
  buildArgs (definition, operation, rootName, opName) {
    let fields = _.get(definition, 'fields', {})

    // check for batch operations and use the generated inputs
    if (operation === MUTATION && isBatchOperation(opName)) {
      return {
        batch: {
          type: [makeInputName(rootName, opName)],
          nullable: false
        }
      }
    }

    // unsubscribe default gets set args
    if (operation === SUBSCRIPTION && opName === UNSUBSCRIBE) {
      return {
        subscription: { type: 'String', nullable: false },
        subscriber: { type: 'String', nullable: false }
      }
    }

    // if a query, copy a create without its nullables and add an overridable limit
    if (operation === QUERY) {
      return _.merge({ limit: { type: 'Int' } }, this.queryArgs[rootName])
    }

    // if a subscription, cope a create without its nullables and add a subscriber
    if (operation === SUBSCRIPTION && opName === SUBSCRIBE) {
      return _.merge(
        { limit: { type: 'Int' } },
        this.queryArgs[rootName],
        { subscriber: { type: 'String', nullable: false } }
      )
    }

    // check for mutation
    if (operation === MUTATION) {
      let typeMutationInput = _.get(this.definition.types, `["${makeInputName(rootName, opName)}"].fields`)
      return _.mapValues(typeMutationInput, (def) => {
        let { type } = def
        return { type }
      })
    }

    // this code should never be executed
    throw new Error('invalid arg calculation request')
  }
}