import _ from 'lodash'
import { plugin, setTypes, setSchemas } from '../common'
import getQuery from './getQuery'

export function RethinkDBBackend (namespace, r, graphql, config = {}, connection) {
  // instantiate a new backend if a new one was not created
  if (!(this instanceof RethinkDBBackend)) {
    return new RethinkDBBackend(namespace, r, graphql, config, connection)
  }

  // check for namespace, rethinkdb, and graphql
  if (!_.isString(namespace)) throw new Error('a namespace is required')
  if (!r) throw new Error('a rethinkdb or rethinkdbdash top-level namespace is required')
  if (!graphql) throw new Error('an instance of graphql is required')
  if (!_.isObject(config.types)) throw new Error('no types were found in the configuration object, t least 1 is required')

  // get any plugins, the backend will be merged into these plugins before it is exported
  let _plugin = _.get(config, 'plugin', [])

  // check the config object
  this._plugin = _.isArray(_plugin) ? _plugin : [_plugin]
  this._types = config.types

  // set mandatory properties
  this.options = _.get(config, 'options', {})
  this.namespace = namespace
  this.r = r
  this.graphql = graphql
  this.options = options
  this.connection = connection

  // factory properties
  this.globals = {}
  this.types = {}
  this.schemas = {}
  this.fields = {}
  this.functions = {}
  this.externalTypes = {}

  // getters
  this.getQuery()

  // setters
  this.setTypes()
  this.setSchemas()
}

// extend prototype
RethinkDBBackend.prototype.plugin = plugin
RethinkDBBackend.prototype.setTypes = setTypes
RethinkDBBackend.prototype.setSchemas = setSchemas
RethinkDBBackend.prototype.getQuery = getQuery

// export the backend
export default RethinkDBBackend