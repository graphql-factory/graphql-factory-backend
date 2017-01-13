import _ from 'lodash'
import Promise from 'bluebird'
import { getRelationFilter, getArgsFilter } from '../common/filter'

export default function read (backend, type) {
  return function (source, args, context = {}, info) {
    let { r, connection, definition, _temporalExtension } = backend

    // temporal plugin details
    let temporalDef = _.get(definition, `types["${type}"]["${_temporalExtension}"]`, {})
    let { versioned, readMostCurrent } = temporalDef
    let isVersioned = Boolean(versioned) && definition.hasPlugin('GraphQLFactoryTemporal')

    // type details
    let { before, after, error, timeout, nested } = backend.getTypeInfo(type, info)
    let temporalMostCurrent = _.get(this, `globals["${_temporalExtension}"].temporalMostCurrent`)
    let collection = backend.getCollection(type)
    let fnPath = `backend_read${type}`
    let { filter, many } = getRelationFilter.call(this, backend, type, source, info, collection)

    // add the date argument to the rootValue if not nested, otherwise pull it from the rootValue
    if (isVersioned && !nested) _.set(info, `rootValue["${_temporalExtension}"].date`, args.date)
    args.date = args.data || _.get(info, `rootValue["${_temporalExtension}"].date`)

    // handle basic read
    return new Promise((resolve, reject) => {
      let beforeHook = _.get(before, fnPath, (args, backend, done) => done())
      let afterHook = _.get(after, fnPath, (result, args, backend, done) => done(null, result))
      let errorHook = _.get(error, fnPath, (err, args, backend, done) => reject(err))
      let hookArgs = { source, args: batchMode ? args : _.first(args), context, info }

      return beforeHook.call(this, hookArgs, backend, (error) => {
        if (error) return errorHook(error, hookArgs, backend, reject)

        // handle temporal plugin
        if (isVersioned && !nested) {
          if (temporalDef.read === false) {
            return errorHook(
              new Error('read is not allowed on this temporal type'),
              hookArgs,
              backend,
              reject
            )
          }
          if (_.isFunction(temporalDef.read)) {
            return resolve(temporalDef.read.call(this, source, args, context, info))
          } else if (_.isString(temporalDef.read)) {
            let temporalRead = _.get(definition, `functions["${temporalDef.read}"]`)
            if (!_.isFunction(temporalRead)) {
              return errorHook(
                new Error(`cannot find function "${temporalDef.read}"`),
                hookArgs,
                backend,
                reject
              )
            }
            return resolve(temporalRead.call(this, source, args, context, info))
          } else {
            if (!_.keys(args).length && readMostCurrent === true) {
              filter = temporalMostCurrent(type)
            } else {
              let versionFilter = _.get(this, `globals["${_temporalExtension}"].temporalFilter`)
              if (!_.isFunction(versionFilter)) {
                return errorHook(
                  new Error(`could not find "temporalFilter" in globals`),
                  hookArgs,
                  backend,
                  reject
                )
              }
              filter = versionFilter(type, args)
              args = _.omit(args, ['version', 'recordId', 'date', 'id'])
            }
          }
        }

        // compose a filter from the arguments
        filter = getArgsFilter(backend, type, args, filter)

        // add standard query modifiers
        filter = _.isNumber(args.limit)
          ? filter.limit(args.limit)
          : filter

        // if not a many relation, return only a single result or null
        // otherwise an array of results
        filter = many
          ? filter.coerceTo('ARRAY')
          : filter.nth(0).default(null)

        return filter.run(connection)
          .then((result) => {
            return afterHook.call(this, result, hookArgs, backend, (error, result) => {
              if (error) return errorHook(error, hookArgs, backend, reject)
              return resolve(result)
            })
          })
          .catch((error) => {
            return errorHook(error, hookArgs, backend, reject)
          })
      })
    })
      .timeout(timeout || 10000)
  }
}