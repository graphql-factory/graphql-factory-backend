import _ from 'lodash'
import Promise from 'bluebird'
import Events from 'events'
import GraphQLFactoryBackendCompiler from './GraphQLFactoryBackendCompiler'

export default class GraphQLFactoryBaseBackend extends Events {
  constructor (namespace, graphql, factory, config = {}) {
    super()

    let { name, extension, plugin, options, methods, globals, fields, functions, types, externalTypes } = config
    let { temporalExtension } = config
    let { prefix } = options || {}

    // check for required properties
    if (!_.isString(namespace)) throw new Error('a namespace is required')
    if (!graphql) throw new Error('an instance of graphql is required')
    if (!factory) throw new Error('an instance of graphql-factory is required')
    if (!_.isObject(types)) throw new Error('no types were found in the configuration')

    // set props
    this.type = 'GraphQLFactoryBaseBackend'
    this.graphql = graphql
    this.factory = factory(graphql)
    this.name = name || 'GraphQLFactoryBackend'
    this.options = options || {}
    this.queries = {}

    // create a definition
    this.definition = new factory.GraphQLFactoryDefinition(config, { plugin })
    this.definition.merge({ globals: { [namespace]: config } })

    // set non-overridable properties
    this._extension = extension || '_backend'
    this._temporalExtension = temporalExtension || '_temporal'
    this._namespace = namespace
    this._prefix = _.isString(prefix) ? prefix : ''
    this._defaultStore = _.get(config, 'options.store', 'test')
    this._installData = {}
    this._lib = null
    this._plugin = null

    // add the backend to the globals
    _.set(this.definition, `globals["${this._extension}"]`, this)
  }

  make () {
    // make the backend definition
    let compiler = new GraphQLFactoryBackendCompiler(this)
    compiler.compile()
    return this
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
    let { primary } = this.getTypeComputed(type)
    if (!primary) throw 'Unable to obtain primary'
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
    let { primary, primaryKey, collection, store, before, after, timeout } = this.getTypeComputed(type)
    let nested = this.isNested(info)
    let currentPath = this.getCurrentPath(info)
    let { belongsTo, has } = this.getRelations(type, info)
    return {
      [this._extension]: typeDef[this._extension],
      before,
      after,
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
    let { computed: { uniques } } = this.getTypeBackend(type)
    _.forEach(uniques, (unique) => {
      let ufields = _.map(unique, (u) => u.field)
      if (_.intersection(_.keys(args), ufields).length === ufields.length) {
        filters.push(_.map(unique, (u) => _.merge({}, u, { value: _.get(args, u.field) })))
      }
    })
    return filters
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