import _ from 'lodash'

export const FATAL = 'fatal'
export const ERROR = 'error'
export const WARN = 'warn'
export const INFO = 'info'
export const DEBUG = 'debug'
export const TRACE = 'trace'
export const SILENT = 'silent'

export const LogLevelEnum = {
  FATAL,
  ERROR,
  WARN,
  INFO,
  DEBUG,
  TRACE,
  SILENT
}

export const LOG_LEVELS = {
  [FATAL]: 60,
  [ERROR]: 50,
  [WARN]: 40,
  [INFO]: 30,
  [DEBUG]: 20,
  [TRACE]: 10,
  [SILENT]: -1
}

export class Logger {
  constructor (middleware, stream, level = INFO, handler) {
    this.middleware = middleware
    this.stream = stream
    this.handler = handler
    this.level = _.isNumber(level)
      ? Math.floor(level)
      : _.get(LOG_LEVELS, level)

    if (!_.isNumber(this.level)) throw new Error('invalid log level')

  }

  fatal () {
    let level = FATAL
    if (this.level >= 0 && this.level <= LOG_LEVELS[level]) {
      let log = this.middleware.logify(this.stream, LOG_LEVELS[level], [...arguments])
      if (_.isFunction(_.get(this.handler, level))) return this.handler[level].apply(this.handler, log)
      return console.error.apply(console, log)
    }
  }

  error () {
    let level = ERROR
    if (this.level >= 0 && this.level <= LOG_LEVELS[level]) {
      let log = this.middleware.logify(this.stream, LOG_LEVELS[level], [...arguments])
      if (_.isFunction(_.get(this.handler, level))) return this.handler[level].apply(this.handler, log)
      return console.error.apply(console, log)
    }
  }

  warn () {
    let level = WARN
    if (this.level >= 0 && this.level <= LOG_LEVELS[level]) {
      let log = this.middleware.logify(this.stream, LOG_LEVELS[level], [...arguments])
      if (_.isFunction(_.get(this.handler, level))) return this.handler[level].apply(this.handler, log)
      return console.warn.apply(console, log)
    }
  }

  info () {
    let level = INFO
    if (this.level >= 0 && this.level <= LOG_LEVELS[level]) {
      let log = this.middleware.logify(this.stream, LOG_LEVELS[level], [...arguments])
      if (_.isFunction(_.get(this.handler, level))) return this.handler[level].apply(this.handler, log)
      return console.info.apply(console, log)
    }
  }

  debug () {
    let level = DEBUG
    if (this.level >= 0 && this.level <= LOG_LEVELS[level]) {
      let log = this.middleware.logify(this.stream, LOG_LEVELS[level], [...arguments])
      if (_.isFunction(_.get(this.handler, level))) return this.handler[level].apply(this.handler, log)
      return console.log.apply(console, log)
    }
  }

  trace () {
    let level = TRACE
    if (this.level >= 0 && this.level <= LOG_LEVELS[level]) {
      let log = this.middleware.logify(this.stream, LOG_LEVELS[level], [...arguments])
      if (_.isFunction(_.get(this.handler, level))) return this.handler[level].apply(this.handler, log)
      return console.log.apply(console, log)
    }
  }
}

export default class LogMiddleware {
  constructor () {
    this.streams = {}
  }

  logify (stream, level, args) {
    let timestamp = new Date()
    if (_.isObject(_.get(args, '[0]'))) {
      args[0].level = level
      args[0].stream = stream
      args[0].timestamp = timestamp
    } else {
      args = [{ level, stream, timestamp }].concat(args)
    }
    return args
  }

  addStream (stream, level, handler) {
    this.streams[stream] = new Logger(this, stream, level, handler)
    return this.streams[stream]
  }

  fatal () {
    let args = [...arguments]
    let stream = _.get(args, '[0].stream')
    return _.has(this.streams, stream)
      ? this.streams[stream].fatal.apply(this.streams[stream], args)
      : null
  }

  error () {
    let args = [...arguments]
    let stream = _.get(args, '[0].stream')
    return _.has(this.streams, stream)
      ? this.streams[stream].error.apply(this.streams[stream], args)
      : null
  }

  warn () {
    let args = [...arguments]
    let stream = _.get(args, '[0].stream')
    return _.has(this.streams, stream)
      ? this.streams[stream].warn.apply(this.streams[stream], args)
      : null
  }

  info () {
    let args = [...arguments]
    let stream = _.get(args, '[0].stream')
    return _.has(this.streams, stream)
      ? this.streams[stream].info.apply(this.streams[stream], args)
      : null
  }

  debug () {
    let args = [...arguments]
    let stream = _.get(args, '[0].stream')
    return _.has(this.streams, stream)
      ? this.streams[stream].debug.apply(this.streams[stream], args)
      : null
  }

  trace () {
    let args = [...arguments]
    let stream = _.get(args, '[0].stream')
    return _.has(this.streams, stream)
      ? this.streams[stream].trace.apply(this.streams[stream], args)
      : null
  }
}