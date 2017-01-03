import _ from 'lodash'

export const CREATE = 'create'
export const READ = 'read'
export const UPDATE = 'update'
export const DELETE = 'delete'
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

function makeObjectName (schema, op) {
  return `backend${_.capitalize(schema)}${_.capitalize(op)}`
}

function getPrimary (fields) {
  let primary = _(fields).pickBy((v) => v.primary === true).keys().value()
  return !primary.length ? null : primary.length === 1 ? primary[0] : primary
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

/*
 * Main compiler class
 */
export default class GraphQLFactoryBackendCompiler {
  constructor (backend) {
    this.backend = backend
    this.defaultStore = backend._defaultStore
    this.temporalExtension = backend._temporalExtension
    this.extension = backend._extension
    this.prefix = _.isString(backend._prefix) ? backend._prefix : ''
    this.definition = backend.definition
  }

  compileDefinition () {
    this.definition.compile()
    return this
  }

  compile () {
    return this.extendTemporal()
      .compileDefinition()
      .computeExtension()
      .buildRelations()
      .buildQueries()
      .buildMutations()
      .buildSubscriptions()
      .setListArgs()
      .value()
  }

  value () {
    return this.definition
  }

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

  computeExtension () {
    _.forEach(this.definition.types, (definition) => {
      if (definition.type && definition.type !== OBJECT) {
        delete definition[this.extension]
        return
      }

      let fields = _.get(definition, 'fields', {})
      let ext = _.get(definition, `["${this.extension}"]`, {})
      let { schema, table, collection, store, db, mutation, query } = ext

      if (!_.isObject(fields) || !_.isObject(ext)) return true
      let computed = ext.computed = {}

      computed.collection = `${this.prefix}${collection || table}`
      computed.store = store || db || this.defaultStore

      // check that the type has a schema identified, otherwise create a schema with the namespace
      // allow schemas to be an array so that queries/mutations can belong to multiple schemas
      computed.schemas = !schema ? [this.backend._namespace] : _.isArray(schema) ? schema : [schema]

      // get the primary key name
      let primary = computed.primary = getPrimary(fields)
      computed.primaryKey = ext.primaryKey || _.isArray(primary) ? _.camelCase(primary.join('-')) : primary

      // get the uniques
      computed.uniques = computeUniques(fields)
      computed.before = {}
      computed.after = {}
    })

    // support chaining
    return this
  }

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

        _.forEach(query, (opDef, name) => {
          let { type, args, resolve, before, after } = opDef
          let fieldName = name === READ ? `${name}${typeName}` : name
          let resolveName = _.isString(resolve) ? resolve : `backend_${fieldName}`

          _.set(this.definition.types, `["${objName}"].fields["${fieldName}"]`, {
            type: type || [typeName],
            args: args || this.buildArgs(definition, QUERY, typeName, name),
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
        })
      })
    })

    // support chaining
    return this
  }

  buildMutations () {
    _.forEach(this.definition.types, (definition, typeName) => {
      let _backend = _.get(definition, `["${this.extension}"]`, {})
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
        if (!schema) return true

        let objName = makeObjectName(schema, MUTATION)
        _.set(this.definition.schemas, `["${schema}"].mutation`, objName)

        _.forEach(mutation, (opDef, name) => {
          let { type, args, resolve, before, after } = opDef
          let ops = [CREATE, UPDATE, DELETE]
          let fieldName = _.includes(ops, name) ? `${name}${typeName}` : name
          let resolveName = _.isString(resolve) ? resolve : `backend_${fieldName}`

          _.set(this.definition.types, `["${objName}"].fields["${fieldName}"]`, {
            type: name === DELETE ? BOOLEAN : type || typeName,
            args: args || this.buildArgs(definition, MUTATION, typeName, name),
            resolve: resolveName
          })

          if (opDef === true || !resolve) {
            _.set(this.definition, `functions.${resolveName}`, this.backend[`${name}Resolver`](typeName))
          } else if (_.isFunction(resolve)) {
            _.set(this.definition, `functions.${resolveName}`, resolve)
          }

          // check for before and after hooks
          if (_.isFunction(before)) _.set(_backend, `computed.before["${resolveName}"]`, before)
          if (_.isFunction(after)) _.set(_backend, `computed.after["${resolveName}"]`, after)
        })
      })
    })

    // support chaining
    return this
  }

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

        _.forEach(subscription, (opDef, name) => {
          let { type, args, resolve, before, after } = opDef
          let ops = [SUBSCRIBE, UNSUBSCRIBE]
          let fieldName = _.includes(ops, name) ? `${name}${typeName}` : name
          let resolveName = _.isString(resolve) ? resolve : `backend_${fieldName}`
          let returnType = type

          // get the proper response type
          switch (name) {
            case SUBSCRIBE:
              returnType = 'GraphQLFactorySubscribeResponse'
              break
            case UNSUBSCRIBE:
              returnType = 'GraphQLFactoryUnsubscribeResponse'
              break
            default:
              break
          }

          _.set(this.definition.types, `["${objName}"].fields["${fieldName}"]`, {
            type: returnType,
            args: args || this.buildArgs(definition, SUBSCRIPTION, typeName, name),
            resolve: resolveName
          })

          if (opDef === true || !resolve) {
            _.set(this.definition, `functions.${resolveName}`, this.backend[`${name}Resolver`](typeName))
          } else if (_.isFunction(resolve)) {
            _.set(this.definition, `functions.${resolveName}`, resolve)
          }

          // check for before and after hooks
          if (_.isFunction(before)) _.set(_backend, `computed.before["${resolveName}"]`, before)
          if (_.isFunction(after)) _.set(_backend, `computed.after["${resolveName}"]`, after)
        })
      })
    })

    // support chaining
    return this
  }

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
      })
    })

    // support chaining
    return this
  }

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

  /*
   * Helper methods
   */
  isVersioned (typeDef) {
    return _.get(typeDef, `["${this.backend._temporalExtension}"].versioned`) === true
  }

  buildArgs (definition, operation, rootName, opName) {
    let args = {}
    let fields = _.get(definition, 'fields', {})
    let _backend = _.get(definition, `["${this.extension}"]`, {})

    // unsubscribe default gets set args
    if (operation === SUBSCRIPTION && opName === UNSUBSCRIBE) {
      return {
        subscription: { type: 'String', nullable: false },
        subscriber: { type: 'String' }
      }
    }

    if (operation === QUERY) args.limit = { type: 'Int' }
    if (operation === SUBSCRIPTION && opName === SUBSCRIBE) args.subscriber = { type: 'String' }

    _.forEach(fields, (fieldDef, fieldName) => {
      let type = getType(fieldDef)
      if (!type) return true
      let typeName = getTypeName(type)
      let typeDef = _.get(this.definition.types, `["${typeName}"]`, {})
      let relations = _.get(typeDef, `${this.extension}.computed.relations`, {})
      fieldDef = fields[fieldName] = makeFieldDef(fieldDef)
      let nullable = operation === MUTATION ? fieldDef.nullable : true

      // support protected fields which get removed from the args build
      if (fieldDef.protect === true && operation === MUTATION) return

      // primitives get added automatically
      if (isPrimitive(type)) {
        args[fieldName] = { type, nullable }
      } else {
        let typeBackend = _.get(this.definition.types, `["${typeName}"]["${this.extension}"]`)

        if (fieldDef.resolve !== false && operation === QUERY && typeBackend) {
          fieldDef.resolve = fieldDef.resolve || `backend_read${type}`
        } else {
          // add args for related types
          if (_.has(relations, `belongsTo["${rootName}"]["${fieldName}"]`)) {
            args[fieldName]  = { type: 'String', nullable }
          } else if (fieldDef.has) {
            args[fieldName] = { type: _.isArray(fieldDef.type) ? ['String'] : 'String', nullable }
          } else {
            // look for an input type
            if (typeDef.type !== ENUM) {
              if (typeDef.type === INPUT || typeDef.type === SCALAR ) {
                args[fieldName] = { type, nullable }
              } else {
                let inputName = `${typeName}${INPUT}`
                let inputMatch = _.get(this.definition.types, `["${inputName}"]`, {})

                if (inputMatch.type === INPUT || inputMatch.type === SCALAR) {
                  args[fieldName] = { type: _.isArray(type) ? [inputName] : inputName, nullable }
                } else {
                  console.warn('[backend warning]: calculation of type "' + rootName + '" argument "' + fieldName +
                    '" could not find an input type and will not be added. please create type "' + inputName + '"')
                }
              }
            } else {
              args[fieldName] = { type, nullable }
            }
          }
        }
      }
    })

    // check for versioned and set version specific args
    if (this.isVersioned(definition)) {
      delete args[this.temporalExtension]

      if (operation === QUERY) {
        args.id = { type: 'String' }
        args.version = { type: 'String' }
        args.recordId = { type: 'String' }
        args.date = { type: 'TemporalDateTime' }
      } else if (opName === CREATE) {
        args.useCurrent = { type: 'Boolean', defaultValue: false }
      } else if (opName === UPDATE) {
        args.useCurrent = { type: 'Boolean' }
      }
    }
    return args
  }
}