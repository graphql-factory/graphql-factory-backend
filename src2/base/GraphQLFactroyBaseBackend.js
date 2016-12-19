import _ from 'lodash'
import Events from 'events'

export default class GraphQLFactoryBaseBackend extends Events {
  constructor (namespace, graphql, factory, config = {}, crud = {}) {
    super()

    this.type = 'GraphQLFactoryBaseBackend'

    let { plugin, options, methods, globals, fields, functions, types, externalTypes } = config
    let { store, prefix } = options || {}

    // check for namespace, graphql, etc
    if (!_.isString(namespace)) throw new Error('a namespace is required')
    if (!graphql) throw new Error('an instance of graphql is required')
    if (!factory) throw new Error('an instance of graphql-factory is required')
    if (!_.isObject(config.types)) throw new Error('no types were found in the configuration')
    if (!crud.create || !crud.read || !crud.update || !crud.delete) throw new Error('missing CRUD operation')

    // bind backend specific methods
    this.createResolver = crud.create(this)
    this.readResolver = crud.read(this)
    this.updateResolver = crud.update(this)
    this.deleteResolver = crud.delete(this)
    this.initStore = crud.initStore(this)

    // set properties
    this.namespace = namespace
    this.graphql = graphql
    this.factory = factory(graphql)
    this.prefix = prefix || ''
    this.options = options || {}
    this.defaultStore = store || this.defaultStore || 'test'
    this.installData = {}
    this.queries = {}

    // create a definition
    this.definition = new factory.GraphQLFactoryDefinition(config, { plugin })
    this.definition.merge({ globals: { [namespace]: config } })

    // add custom methods
    _.forEach(methods, (method, name) => {
      if (!_.has(this, name) && _.isFunction(method)) this[name] = method.bind(this)
    })
  }

  make () {

  }
}