import _ from 'lodash'

/**
 * Determines if the rethink driver has already been connected and connects it if not
 * @callback callback
 * @private
 */
export function connectDatabase (callback) {
  callback = _.isFunction(callback) ? callback : _.noop

  try {
    let options = _.get(this.options, 'database', {})
    // determine if uninitialized rethinkdbdash
    if (!_.isFunction(_.get(this.r, 'connect'))) {
      this.r = this.r(options)
      return callback()
    }

    // check that r is not a connected rethinkdbdash instance and should be a rethinkdb driver
    else if (!_.has(this.r, '_poolMaster')) {
      // check for an open connection
      if (_.get(this._connection, 'open') !== true) {
        return this.r.connect(options, (error, connection) => {
          if (error) {
            return callback(error)
          }
          this._connection = connection
          return callback()
        })
      }
      return callback()
    }
    return callback()
  } catch (error) {
    callback(error)
  }
}