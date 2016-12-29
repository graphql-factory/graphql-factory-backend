import _ from 'lodash'
import Promise from 'bluebird'
import { getRelationFilter, getArgsFilter } from './filter'

export default function read (backend, type) {
  // temporal plugin details
  let hasTemporalPlugin = backend.definition.hasPlugin('GraphQLFactoryTemporal')
  let temporalExt = backend._temporalExtension
  let typeDef = _.get(backend.definition, `types["${type}"]`)
  let temporalDef = _.get(typeDef, `["${temporalExt}"]`)
  let readMostCurrent = _.get(temporalDef, 'readMostCurrent', false)
  let isVersioned = _.get(temporalDef, `versioned`) === true

  // helpers
  let asError = backend.asError

  // field resolve function
  return function (source, args, context = {}, info) {
    let { r, connection, definition } = backend
    let { before, after, timeout } = backend.getTypeInfo(type, info)
    let temporalMostCurrent = _.get(this, `globals["${temporalExt}"].temporalMostCurrent`)
    let collection = backend.getCollection(type)

    let { filter, many } = getRelationFilter(backend, type, source, info, collection)
    let fnPath = `backend_read${type}`
    let beforeHook = _.get(before, fnPath, (args, backend, done) => done())
    let afterHook = _.get(after, fnPath, (result, args, backend, done) => done(null, result))

    // handle basic read
    return new Promise((resolve, reject) => {
      return beforeHook.call(this, { source, args, context, info }, backend, (err) => {
        if (err) return reject(asError(err))

        // handle temporal plugin
        if (hasTemporalPlugin && isVersioned) {
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
              let versionFilter = _.get(this, `globals["${temporalExt}"].temporalFilter`)
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