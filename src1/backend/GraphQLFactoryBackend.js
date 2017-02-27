import _ from 'lodash'
import EventEmitter from 'events'
import GraphQLFactoryTypes from 'graphql-factory-types'
import Joi from 'joi'
import LogMiddleware from './LogMiddleware'
import Promise from 'bluebird'
import { configSchema } from '../common/objectSchemas'

export default class GraphQLFactoryBackend extends EventEmitter {
  constructor (graphql, factory, config) {
    super()
    let { error, value } = Joi.validate(config, configSchema)
    if (error) throw error
    if (!graphql) throw new Error('missing required parameter: graphql')
    if (!factory) throw new Error('missing required parameter: factory')

    let { definition, name, namespace, options, plugin } = value
    let { prefix, extension, temporalExtension, store, log } = options

    // merge the supplied plugin with factory types plugin
    plugin = _.union(plugin, GraphQLFactoryTypes)

    // set props
    this.type = 'GraphQLFactoryBackend'
    this.graphql = graphql
    this.GraphQLError = graphql.GraphQLError
    this.factory = factory(graphql)
    this.name = name || 'GraphQLFactoryBackend'
    this.options = options
    this.queries = {}
    this.subscriptions = {}

    // set non-overridable properties
    this._extension = extension || '_backend'
    this._temporalExtension = temporalExtension || '_temporal'
    this._namespace = namespace
    this._prefix = _.isString(prefix) ? prefix : ''
    this._defaultStore = store || 'test'
    this._lib = null
    this._plugin = null
    this._middleware = {
      before: [],
      after: [],
      error: []
    }

    // throw error if namespace and extensions are the same
    if (this._extension === this.namespace) throw new Error('namespace and extension cannot be the same')

    // create a definition
    this.definition = new factory.GraphQLFactoryDefinition(definition, { plugin })
    this.definition.merge({
      globals: {
        [this._namespace]: config,
        [this._extension]: this
      }
    })

    // add logger and streams
    this.logger = new LogMiddleware()
    _.forEach(log, (options, stream) => {
      let { level, handler } = options || { level: 'info' }
      this.logger.addStream(stream, level, handler)
    })
  }

  make (callback) {
    callback = _.isFunction(callback)
      ? callback
      : _.noop

    return new Promise((resolve, reject) => {
      try {
        callback(null, this)
        return resolve(this)
      } catch (error) {
        callback(error)
        return reject(error)
      }
    })
  }
}