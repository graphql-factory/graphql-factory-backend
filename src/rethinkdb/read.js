import _ from 'lodash'
import Promise from 'bluebird'
import { getRelationFilter, getArgsFilter } from './filter'

export default function read (backend, type) {
  return function (source, args, context = {}, info) {
    let { r, connection, definition, asError, _temporalExtension } = backend

    // temporal plugin details
    let hasTemporalPlugin = definition.hasPlugin('GraphQLFactoryTemporal')
    let temporalDef = _.get(definition, `types["${type}"]["${_temporalExtension}"]`, {})
    let { versioned, readMostCurrent } = temporalDef
    let isVersioned = Boolean(versioned) && definition.hasPlugin('GraphQLFactoryTemporal')

    // type details
    let { before, after, timeout, nested } = backend.getTypeInfo(type, info)
    let temporalMostCurrent = _.get(this, `globals["${_temporalExtension}"].temporalMostCurrent`)
    let collection = backend.getCollection(type)

    // add the date argument to the rootValue
    if (isVersioned) {
      _.set(info, `rootValue["${_temporalExtension}"].date`, args.date)
    }

    let { filter, many } = getRelationFilter.call(this, backend, type, source, info, collection)
    let fnPath = `backend_read${type}`
    let beforeHook = _.get(before, fnPath, (args, backend, done) => done())
    let afterHook = _.get(after, fnPath, (result, args, backend, done) => done(null, result))

    // handle basic read
    return new Promise((resolve, reject) => {
      return beforeHook.call(this, { source, args, context, info }, backend, (err) => {
        if (err) return reject(asError(err))

        // handle temporal plugin
        if (isVersioned && !nested) {
          if (temporalDef.read === false) return reject(new Error('read is not allowed on this temporal type'))
          if (_.isFunction(temporalDef.read)) {
            return resolve(temporalDef.read.call(this, source, args, context, info))
          } else if (_.isString(temporalDef.read)) {
            let temporalRead = _.get(definition, `functions["${temporalDef.read}"]`)
            if (!_.isFunction(temporalRead)) {
              return reject(new Error(`cannot find function "${temporalDef.read}"`))
            }
            return resolve(temporalRead.call(this, source, args, context, info))
          } else {
            if (!_.keys(args).length && readMostCurrent === true) {
              filter = temporalMostCurrent(type)
            } else {
              let versionFilter = _.get(this, `globals["${_temporalExtension}"].temporalFilter`)
              if (!_.isFunction(versionFilter)) {
                return reject(new Error(`could not find "temporalFilter" in globals`))
              }
              filter = versionFilter(type, args)
              args = _.omit(args, ['version', 'recordId', 'date', 'id'])
            }
          }
        }

        filter = getArgsFilter(backend, type, args, filter)

        // add standard query modifiers
        if (_.isNumber(args.limit)) filter = filter.limit(args.limit)

        // if not a many relation, return only a single result or null
        if (!many) {
          filter = filter.coerceTo('array').do((objs) => {
            return objs.count().eq(0).branch(r.expr(null), r.expr(objs).nth(0))
          })
        }

        return filter.run(connection)
          .then((result) => {
            return afterHook.call(this, result, args, backend, (err, result) => {
              if (err) return reject(asError(err))
              return resolve(result)
            })
          })
          .catch((err) => {
            return reject(asError(err))
          })
      })
    })
      .timeout(timeout || 10000)
  }
}