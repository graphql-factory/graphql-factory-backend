import _ from 'lodash'
import make from './make'
import { promiseMap, isPromise } from './common'


/*
 * Options
 * {
 *   store: 'store name to default to'
 * }
 */

// base class for factory backend, all backends should extend this class
export class GraphQLFactoryBaseBackend {
  constructor (namespace, graphql, factory, config = {}, crud = {}) {
    this.type = 'GraphQLFactoryBaseBackend'

    // check for namespace, graphql
    if (!_.isString(namespace)) throw new Error('a namespace is required')
    if (!graphql) throw new Error('an instance of graphql is required')
    if (!factory) throw new Error('an instance of graphql-factory is required')
    if (!_.isObject(config.types)) throw new Error('no types were found in the configuration')
    if (!crud.create || !crud.read || !crud.update || !crud.delete) throw new Error('missing CRUD operation')

    // get any plugins, the backend will be merged into these plugins before it is exported
    let _plugin = _.get(config, 'plugin', [])

    // get collection prefix
    this._prefix = _.get(config, 'options.prefix', '')

    // set crud methods
    this._create = crud.create.bind(this)
    this._read = crud.read.bind(this)
    this._update = crud.update.bind(this)
    this._delete = crud.delete.bind(this)
    this.initStore = crud.initStore.bind(this)
    this.filter = crud.filter
    this.util = crud.util(this)
    this.q = crud.q(this)

    // check the config object
    this._plugin = _.isArray(_plugin) ? _plugin : [_plugin]
    this._types = _.get(config, 'types', {})
    this._functions = _.get(config, 'functions', {})
    this._globals = _.get(config, 'globals', {})
    this._fields = _.get(config, 'fields', {})
    this._externalTypes = _.get(config, 'externalTypes', {})
    this._installData = {}

    // set mandatory properties
    this.options = _.get(config, 'options', {})
    this.namespace = namespace
    this.graphql = graphql
    this.factory = factory(this.graphql)
    this.queries = {}
    this.defaultStore = this.options.store || this.defaultStore || 'test'

    // tools
    this.util.isPromise = isPromise

    // factory properties
    this._definition = {
      globals: _.merge(this._globals, {[namespace]: {config}}),
      types: {},
      schemas: {},
      fields: this._fields,
      functions: this._functions,
      externalTypes: this._externalTypes
    }

    // make graphql-factory definitions
    make.call(this)

    // add methods if they do not conflict with existing properties
    _.forEach(config.methods, (method, name) => {
      if (!_.has(this, name) && _.isFunction(method)) this[name] = method.bind(this)
    })
  }

  addInstallData (data) {
    if (!_.isObject(data)) return
    this._installData = _.merge({}, this._installData, data)
  }

  addQuery (fn, name) {
    if (_.isString(name) && _.isFunction(fn)) _.set(this.queries, name, fn.bind(this))
  }

  addQueries (queries) {
    _.forEach(queries, (fn, name) => this.addQuery(fn, name))
  }

  addFunction (fn, name) {
    if (_.isString(name) && _.isFunction(fn)) _.set(this._definition.functions, name, fn(this))
  }

  addFunctions (functions) {
    _.forEach(functions, (fn, name) => this.addFunction(fn, name))
  }

  addGlobal (obj, path) {
    if (_.isString(path) && obj) _.set(this._definition.globals, path, obj)
  }

  addField (def, name) {
    if (_.isString(name) && _.isObject(def)) _.set(this._definition.fields, name, def)
  }

  addExternalType (type, name) {
    if (_.isString(name) && _.isObject(type)) _.set(this._definition.externalTypes, name, type)
  }

  // returns a graphql-factory plugin
  get plugin () {
    let [_plugin, obj ] = [ {}, {} ]

    // merge all plugins
    _.forEach(this._plugin, (p) => _.merge(_plugin, p))

    // create current backend plugin
    _.forEach(this._definition, (def, field) => {
      if (_.keys(def).length) {
        if (field === 'types') obj[field] = _.mapValues(def, (v) => _.omit(v, '_backend'))
        else obj[field] = def
      }
    })

    // return a merged backend and plugin
    return _.merge(_plugin, obj)
  }

  // get the primary key or keys
  getPrimary (fields) {
    let primary = _(fields).pickBy((v) => v.primary === true).keys().value()
    return !primary.length ? 'id' : primary.length === 1 ? primary[0] : primary.sort()
  }

  // create a unique args object
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

  // determine if the resolve is nested
  isNested (info) {
    // support for current and previous graphql info objects
    let infoPath = _.get(info, 'path', [])
    return _.isArray(infoPath) ? infoPath.length > 1 : infoPath.prev !== undefined
  }

  // get parent type
  getParentType (info) {
    return _.get(info, 'parentType')
  }

  // current path
  getCurrentPath (info) {
    // support for current and previous graphql info objects
    let infoPath = _.get(info, 'path')
    return _.isArray(infoPath) ? _.last(infoPath) : infoPath.key
  }

  // get type definition
  getTypeDefinition (type) {
    return _.get(this._types, type, {})
  }

  // get type backend
  getTypeBackend (type) {
    return _.get(this.getTypeDefinition(type), '_backend')
  }

  // get type fields
  getTypeFields (type) {
    return _.get(this.getTypeDefinition(type), 'fields')
  }

  // get computed
  getTypeComputed (type) {
    return _.get(this.getTypeDefinition(type), '_backend.computed')
  }

  // get relations
  getRelations (type, info) {
    let _backend = this.getTypeBackend(type)
    let parentType = this.getParentType(info)
    let cpath = this.getCurrentPath(info)
    let belongsTo = _.get(_backend, `computed.relations.belongsTo["${parentType.name}"]["${cpath}"]`, {})
    let has = _.get(_backend, `computed.relations.has["${parentType.name}"]["${cpath}"]`, {})
    return { has, belongsTo }
  }

  // get related values
  getRelatedValues (type, args) {
    let values = []
    let { fields } = this.getTypeDefinition(type)

    _.forEach(args, (arg, name) => {
      let fieldDef = _.get(fields, name, {})
      let related = _.has(fieldDef, 'has') || _.has(fieldDef, 'belongsTo')
      let fieldType = _.get(fieldDef, 'type', fieldDef)
      let isList = _.isArray(fieldType)
      let typeName = isList && fieldType.length === 1 ? fieldType[0] : fieldType
      let typeDef = _.get(this._types, typeName, {})
      let computed = _.get(typeDef, '_backend.computed')
      if (computed && related) {
        let { store, collection } = computed
        values = _.union(values, _.map(isList ? arg : [ arg ], (id) => {
          return { store, collection, id }
        }))
      }
    })
    return values
  }

  // get type info
  getTypeInfo (type, info) {
    let { _backend, fields } = this.getTypeDefinition(type)
    let { computed: { primary, primaryKey, collection, store, before } } = _backend
    let nested = this.isNested(info)
    let currentPath = this.getCurrentPath(info)
    let { belongsTo, has } = this.getRelations(type, info)
    return {
      _backend,
      before,
      collection,
      store,
      fields,
      primary,
      primaryKey,
      nested,
      currentPath,
      belongsTo,
      has
    }
  }

  // get primary args as a single value
  getPrimaryFromArgs (type, args) {
    let { primary } = this.getTypeComputed(type)
    if (!primary) throw 'Unable to obtain primary'
    let pk = _.map(_.isArray(primary) ? primary : [primary], (k) => _.get(args, k))
    return pk.length === 1 ? pk[0] : pk
  }

  // update the args with potential compound primary
  updateArgsWithPrimary (type, args) {
    let newArgs = _.cloneDeep(args)
    let { primary, primaryKey } = this.getTypeComputed(type)
    let pk = this.getPrimaryFromArgs(type, args)
    if (primary.length > 1 && _.without(pk, undefined).length === primary.length) {
      newArgs = _.merge(newArgs, { [primaryKey]: pk })
    }
    return newArgs
  }

  // maps promise results
  mapPromise (list) {
    return promiseMap(list)
  }

  // init all stores
  initAllStores (rebuild, seedData) {
    if (!_.isBoolean(rebuild)) {
      seedData = _.isObject(rebuild) ? rebuild : {}
      rebuild = false
    }

    // only init definitions with a collection and store specified
    let canInit = () => {
      return _.pickBy(this._types, (t) => {
        return _.has(t, '_backend.computed.collection') && _.has(t, '_backend.computed.store')
      })
    }

    let ops = _.map(canInit(), (t, type) => {
      let data = _.get(seedData, type, [])
      return this.initStore(type, rebuild, _.isArray(data) ? data : [])
    })

    return promiseMap(ops)
  }

  // returns a lib object lazily, make it only once
  get lib () {
    if (!this._lib) this._lib = this.factory.make(this.plugin)
    return this._lib
  }
}

export default function (namespace, graphql, factory, config = {}, crud = {}) {
  return new GraphQLFactoryBaseBackend(namespace, graphql, factory, config, crud)
}