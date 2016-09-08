import _ from 'lodash'
import make from './make'

export const FACTORY_FIELDS = [
  'globals',
  'types',
  'schemas',
  'fields',
  'functions',
  'externalTypes'
]

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
    this._create = crud.create
    this._read = crud.read
    this._update = crud.update
    this._delete = crud.delete

    // check the config object
    this._plugin = _.isArray(_plugin) ? _plugin : [_plugin]
    this._types = config.types

    // set mandatory properties
    this.options = _.get(config, 'options', {})
    this.namespace = namespace
    this.graphql = graphql
    this.factory = factory(this.graphql)

    // factory properties
    this._definition = {
      globals: {},
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

  // returns a lib object lazily, make it only once
  get lib () {
    if (!this._lib) this._lib = this.factory.make(this.plugin)
    return this._lib
  }
}