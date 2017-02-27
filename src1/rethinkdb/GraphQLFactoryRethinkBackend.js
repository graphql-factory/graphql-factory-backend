import _ from 'lodash'
import GraphQLFactoryBackend from '../backend/GraphQLFactoryBackend'
import { connectDatabase } from './utils'

export default class GraphQLFactoryRethinkBackend extends GraphQLFactoryBackend {
  constructor (graphql, factory, config, r, connection) {
    super(graphql, factory, config)
    if (!r) throw new Error('rethinkdb driver no provided')

    this.type = 'GraphQLFactoryRethinkBackend'
    this._connection = connection
  }

  make (callback) {
    callback = _.isFunction(callback)
      ? callback
      : _.noop

    this.logger.debug({ stream: 'backend' }, 'making backend')

    return new Promise((resolve, reject) => {
      try {
        return connectDatabase.call(this, error => {
          if (error) {
            this.logger.error({ stream: 'backend', error }, 'failed to make backend')
            callback(error)
            return reject(error)
          }
          this.logger.debug({ stream: 'backend' }, 'successfully made backend')
          callback(null, this)
          return resolve(this)
        })
      } catch (error) {
        this.logger.error({ stream: 'backend', error }, 'failed to make backend')
        callback(error)
        return reject(error)
      }
    })
  }
}