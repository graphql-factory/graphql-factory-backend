import _ from 'lodash'
import make from './make'
import { promiseMap } from './common'

// base class for factory backend, all backends should extend this class
export default class GraphQLFactoryBaseBackend {
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

    // set crud methods
    this._create = crud.create.bind(this)
    this._read = crud.read.bind(this)
    this._update = crud.update.bind(this)
    this._delete = crud.delete.bind(this)
    this.initStore = crud.initStore.bind(this)
    this.filter = crud.filter

    // check the config object
    this._plugin = _.isArray(_plugin) ? _plugin : [_plugin]
    this._types = config.types

    // set mandatory properties
    this.options = _.get(config, 'options', {})
    this.namespace = namespace
    this.graphql = graphql
    this.factory = factory(this.graphql)
    this.defaultStore = 'test'

    // factory properties
    this._definition = {
      globals: { [namespace]: { config } },
      types: {},
      schemas: {},
      fields: {},
      functions: {},
      externalTypes: {}
    }

    // make graphql-factory definitions
    make.call(this)

    // add methods if they do not conflict with existing properties
    _.forEach(config.methods, (method, name) => {
      if (!_.has(this, name) && _.isFunction(method)) this[name] = () => method.apply(this, arguments)
    })
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

  // get keys marked with unique
  getUnique (fields, args) {
    return _.without(_.map(_.pickBy(fields, (v) => v.unique === true), (v, field) => {
      let value = _.get(args, field)
      if (value === undefined) return
      return {
        field,
        type: _.isArray(v.type) ? _.get(v, 'type[0]', 'Undefined') : _.get(v, 'type', 'Undefined'),
        value
      }
    }), undefined)

  }

  // determine if the resolve is nested
  isNested (info) {
    return _.get(info, 'path', []).length > 1
  }

  // get parent type
  getParentType (info) {
    return _.get(info, 'parentType')
  }

  // current path
  getCurrentPath (info) {
    return _.last(_.get(info, 'path'))
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

  // get type info
  getTypeInfo (type, info) {
    let { _backend: { computed: { primary, primaryKey, collection, store } }, fields } = this.getTypeDefinition(type)
    let nested = this.isNested(info)
    let currentPath = this.getCurrentPath(info)
    let { belongsTo, has } = this.getRelations(type, info)
    return { collection, store, fields, primary, primaryKey, nested, currentPath, belongsTo, has }
  }

  // get primary args as a single value
  getPrimaryFromArgs (type, args) {
    let { primary } = this.getTypeComputed(type)
    let pk = _.map(primary, (k) => _.get(args, k))
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