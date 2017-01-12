// core modules
import Events from 'events'

// npm modules
import _ from 'lodash'
import Promise from 'bluebird'

// local modules
import FactoryBackendDefinition from '../graphql/index'
import GraphQLFactoryBackendCompiler from './GraphQLFactoryBackendCompiler'

/**
 * Base GraphQL Factory Backend
 * @extends Events
 */
export default class GraphQLFactoryBaseBackend extends Events {
  /**
   * Initializes a backend instance
   * @param {String} namespace - namespace to using in globals
   * @param {Object} graphql - instance of graphql
   * @param {Object} factory - instance of graphql-factory
   * @param {Object} config - configuration object
   * @param {String} [config.name="GraphQLFactoryBackend"] - plugin name
   * @param {String} [config.extension="_backend"] - plugin extension
   * @param {Object} [config.options] - options hash
   * @param {String} [config.options.store="test"] - default store name
   * @param {String} [config.options.prefix=""] - prefix for collections
   * @param {Array<String>|String} [config.plugin] - additional plugins to merge
   * @param {String} [config.temporalExtension="_temporal"] - temporal plugin extension
   * @param {Object} [config.globals] - Factory globals definition
   * @param {Object} [config.fields] - Factory fields definition
   * @param {Object} config.types - Factory types definition
   * @param {Object} [config.schemas] - Factory schemas definition
   * @param {Object} [config.functions] - Factory functions definition
   * @param {Object} [config.externalTypes] - Factory externalTypes definition
   * @param {Object} [config.installData] - Seed data
   * @callback callback
   */
  constructor (namespace, graphql, factory, config) {
    super()

    let { name, extension, plugin, options, temporalExtension, globals, types, installData } = config
    let { prefix } = options || {}

    // check for required properties
    if (!_.isString(namespace)) throw new Error('a namespace is required')
    if (!graphql) throw new Error('an instance of graphql is required')
    if (!factory) throw new Error('an instance of graphql-factory is required')
    if (!_.isObject(types)) throw new Error('no types were found in the configuration')

    // set props
    this.type = 'GraphQLFactoryBaseBackend'
    this.graphql = graphql
    this.GraphQLError = graphql.GraphQLError
    this.factory = factory(graphql)
    this.name = name || 'GraphQLFactoryBackend'
    this.options = options || {}
    this.queries = {}

    /*
     * Subscription objects should be keyed on their hashed query value
     * they should also keep track of how many users are subscribed so that
     * when all users unsubscribe, the subscription can be removed
     */
    this.subscriptions = {}

    // create a definition
    this.definition = new factory.GraphQLFactoryDefinition(config, { plugin })
    this.definition.merge({ globals: { [namespace]: config } })
    this.definition.merge(FactoryBackendDefinition)

    // set non-overridable properties
    this._extension = extension || '_backend'
    this._temporalExtension = temporalExtension || '_temporal'
    this._namespace = namespace
    this._prefix = _.isString(prefix) ? prefix : ''
    this._defaultStore = _.get(config, 'options.store', 'test')
    this._installData = installData || {}
    this._lib = null
    this._plugin = null

    // add the backend to the globals
    _.set(this.definition, `globals["${this._extension}"]`, this)
  }

  /**
   * Compiled the backend
   * @private
   */
  _compile () {
    let compiler = new GraphQLFactoryBackendCompiler(this)
    compiler.compile()
  }

  /**
   * Overridable make method, can accept a callback and returns a promise
   * This should be used in the event your code requires some additional async
   * code to be performed before considering the backend created
   * @param callback
   */
  make (callback = () => true) {
    return new Promise((resolve, reject) => {
      try {
        this._compile()
        callback(null, this)
        return resolve(this)
      } catch (error) {
        callback(error)
        return reject(error)
      }
    })
  }

  /******************************************************************
   * Methods that should be overriden when extended
   ******************************************************************/
  now (callback) {
    throw new Error('the now method has not been overriden on the backend')
  }

  createResolver () {
    throw new Error('the createResolver method has not been overriden on the backend')
  }

  readResolver () {
    throw new Error('the readResolver method has not been overriden on the backend')
  }

  updateResolver () {
    throw new Error('the updateResolver method has not been overriden on the backend')
  }

  deleteResolver () {
    throw new Error('the deleteResolver method has not been overriden on the backend')
  }

  batchCreateResolver () {
    throw new Error('the batchCreateResolver method has not been overriden on the backend')
  }

  batchUpdateResolver () {
    throw new Error('the batchUpdateResolver method has not been overriden on the backend')
  }

  batchDeleteResolver () {
    throw new Error('the batchDeleteResolver method has not been overriden on the backend')
  }

  subscribeResolver () {
    throw new Error('the subscribeResolver method has not been overriden on the backend')
  }

  unsubscribeResolver () {
    throw new Error('the unsubscribeResolver method has not been overriden on the backend')
  }


  getStore () {
    throw new Error('the getStore method has not been overriden on the backend')
  }

  getCollection () {
    throw new Error('the getCollection method has not been overriden on the backend')
  }

  initStore () {
    throw new Error('the initStore method has not been overriden on the backend')
  }

  /******************************************************************
   * Utility methods
   ******************************************************************/
  addExternalType (type, name) {
    if (_.isString(name) && _.isObject(type)) _.set(this.definition.externalTypes, name, type)
  }

  addField (def, name) {
    if (_.isString(name) && _.isObject(def)) _.set(this.definition.fields, name, def)
  }

  addFunction (fn, name) {
    if (_.isString(name) && _.isFunction(fn)) _.set(this.definition.functions, name, fn(this))
  }

  addFunctions (functions) {
    _.forEach(functions, (fn, name) => this.addFunction(fn, name))
  }

  addGlobal (obj, path) {
    if (_.isString(path) && obj) _.set(this.definition.globals, path, obj)
  }

  addInstallData (data) {
    if (!_.isObject(data)) return
    this._installData = _.merge({}, this._installData, data)
  }

  addQueries (queries) {
    _.forEach(queries, (fn, name) => this.addQuery(fn, name))
  }

  addQuery (fn, name) {
    if (_.isString(name) && _.isFunction(fn)) _.set(this.queries, name, fn.bind(this))
  }

  asError (err) {
    return err instanceof Error ? err : new Error(err)
  }

  getCurrentPath (info) {
    // support for current and previous graphql info objects
    let infoPath = _.get(info, 'path', [])
    return _.isArray(infoPath) ? _.last(infoPath) : infoPath.key
  }

  getParentType (info) {
    return _.get(info, 'parentType')
  }

  getPrimary (fields) {
    let primary = _(fields).pickBy((v) => v.primary === true).keys().value()
    return !primary.length ? 'id' : primary.length === 1 ? primary[0] : primary.sort()
  }

  getPrimaryFromArgs (type, args) {
    let { primary, primaryKey } = this.getTypeComputed(type)
    if (!primary || !primaryKey) throw 'Unable to obtain primary'
    if (_.has(args, `[${primaryKey}"]`)) return args[primaryKey]
    let pk = _.map(_.isArray(primary) ? primary : [primary], (k) => _.get(args, k))
    return pk.length === 1 ? pk[0] : pk
  }

  getRelations (type, info) {
    let relations = this.getTypeRelations(type)
    let parentType = this.getParentType(info)
    let cpath = this.getCurrentPath(info)
    let belongsTo = _.get(relations, `belongsTo["${parentType.name}"]["${cpath}"]`, {})
    let has = _.get(relations, `has["${parentType.name}"]["${cpath}"]`, {})
    return { has, belongsTo }
  }

  getTypeBackend (type) {
    return _.get(this.definition.types, `["${type}"]["${this._extension}"]`)
  }

  getTypeComputed (type) {
    return _.get(this.definition.types, `["${type}"]["${this._extension}"]computed`)
  }

  getTypeDefinition (type) {
    return _.get(this.definition.types, `["${type}"]`, {})
  }

  getTypeFields (type) {
    return _.get(this.definition.types, `["${type}"].fields`)
  }

  getTypeInfo (type, info) {
    let typeDef = this.getTypeDefinition(type)
    let { primary, primaryKey, collection, store, before, after, error, timeout } = this.getTypeComputed(type)
    let nested = this.isNested(info)
    let currentPath = this.getCurrentPath(info)
    let { belongsTo, has } = this.getRelations(type, info)
    return {
      [this._extension]: typeDef[this._extension],
      before,
      after,
      error,
      timeout,
      collection,
      store,
      fields: typeDef.fields,
      primary,
      primaryKey,
      nested,
      currentPath,
      belongsTo,
      has
    }
  }

  getRequestFields (type, info, options = {}) {
    let { maxDepth, includeRelated } = options
    let { fields } = this.getTypeDefinition(type)
    let fieldNode = _.first(_.filter(info.fieldNodes || info.fieldASTs, (node) => {
      return _.get(node, 'name.value') === info.fieldName
    }))
    includeRelated = _.isBoolean(includeRelated) ? includeRelated : true

    // parses the selection set recursively building a REQL style pluck filter
    let parseSelection = (selectionSet, level) => {
      let obj = {}
      level += 1

      _.forEach(selectionSet.selections, (selection) => {
        let name = _.get(selection, 'name.value')
        let fieldType = _.get(fields, `["${name}"].type`)
        let fieldTypeName = _.isArray(fieldType) ? _.first(fieldType) : fieldType
        let isRelation = _.has(this.definition.getType(fieldTypeName), `["${this._extension}"].computed.collection`)

        // check relation
        if (!isRelation || (isRelation && includeRelated)) {
          if (!selection.selectionSet) {
            obj[name] = true
          } else {
            obj[name] = (_.isNumber(maxDepth) && level >= maxDepth)
              ? true
              : parseSelection(selection.selectionSet, level)
          }
        }
      })
      return obj
    }

    // call parse on main field node selection set with an inital level of 0
    return (fieldNode.selectionSet)
      ? parseSelection(fieldNode.selectionSet, 0)
      : {}
  }

  getRelatedValues (type, args) {
    let values = []
    let { fields } = this.getTypeDefinition(type)

    _.forEach(args, (arg, name) => {
      let fieldDef = _.get(fields, name, {})
      let related = _.has(fieldDef, 'has') || _.has(fieldDef, 'belongsTo')
      let fieldType = _.get(fieldDef, 'type', fieldDef)
      let isList = _.isArray(fieldType)
      let type = isList && fieldType.length === 1 ? fieldType[0] : fieldType
      let computed = this.getTypeComputed(type)
      if (computed && related) {
        let { store, collection } = computed
        values = _.union(values, _.map(isList ? arg : [ arg ], (id) => {
          return { store, collection, id }
        }))
      }
    })
    return values
  }

  getTypeRelations (type) {
    return _.get(this.getTypeComputed(type), 'relations')
  }

  getUniqueArgs (type, args) {
    let filters = []
    let { uniques } = this.getTypeComputed(type)
    _.forEach(uniques, (unique) => {
      let ufields = _.map(unique, (u) => u.field)
      if (_.intersection(_.keys(args), ufields).length === ufields.length) {
        filters.push(_.map(unique, (u) => _.merge({}, u, { value: _.get(args, u.field) })))
      }
    })
    return filters
  }

  extendsType (type, types) {
    let typeDef = _.get(this.getTypeDefinition(type), 'type', ['Object'])
    let rawTypes = []

    // pull the types from the type field
    if (_.isArray(typeDef)) rawTypes = _.map(typeDef, (def) => _.isString(def) ? def : _.first(_.keys(def)))
    else if (_.isObject(typeDef)) rawTypes = _.keys(typeDef)
    else if (_.isString(typeDef)) rawTypes = [typeDef]

    return _.intersection(rawTypes, _.isArray(types) ? types : [types])
  }

  isNested (info) {
    // support for current and previous graphql info objects
    let infoPath = _.get(info, 'path', [])
    return _.isArray(infoPath) ? infoPath.length > 1 : infoPath.prev !== undefined
  }

  updateArgsWithPrimary (type, args) {
    let newArgs = _.cloneDeep(args)
    let { primary, primaryKey } = this.getTypeComputed(type)
    let pk = this.getPrimaryFromArgs(type, args)
    if (primary.length > 1 && _.without(pk, undefined).length === primary.length) {
      newArgs = _.merge(newArgs, { [primaryKey]: pk })
    }
    return newArgs
  }

  /******************************************************************
   * Installer methods
   ******************************************************************/
  initAllStores (rebuild, seedData) {
    if (!_.isBoolean(rebuild)) {
      seedData = _.isObject(rebuild) ? rebuild : {}
      rebuild = false
    }

    // only init definitions with a collection and store specified
    let canInit = () => {
      return _.keys(_.pickBy(this.definition.types, (typeDef) => {
        let computed = _.get(typeDef, `${this._extension}.computed`, {})
        return _.has(computed, 'collection') && _.has(computed, 'store')
      }))
    }

    return Promise.map(canInit(), (type) => {
      let data = _.get(seedData, type, [])
      return this.initStore(type, rebuild, _.isArray(data) ? data : [])
    })
      .then((res) => {
        return res
      })
      .catch((err) => {
        console.error(err)
        return Promise.reject(err)
      })
  }

  /******************************************************************
   * Getters
   ******************************************************************/
  get plugin () {
    if (!this._plugin) {
      // remove the backend from non-object types
      this.definition.types = _.mapValues(this.definition.types, (definition) => {
        return definition.type === 'Object' ? definition : _.omit(definition, this._extension)
      })
      this._plugin = _.merge({}, this.definition.plugin, { name: this.name })
    }
    return this._plugin
  }

  get lib () {
    if (!this._lib) this._lib = this.factory.make(this.plugin)
    return this._lib
  }
}