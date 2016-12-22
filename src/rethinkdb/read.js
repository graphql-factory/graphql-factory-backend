import _ from 'lodash'
import Promise from 'bluebird'
import { getRelationFilter, getArgsFilter } from './filter'

export default function read (backend, type) {
  return function (source, args, context = {}, info) {
    let { r, connection } = backend
    let { collection, store, before, after, timeout } = backend.getTypeInfo(type, info)
    let table = r.db(store).table(collection)

    let { filter, many } = getRelationFilter(backend, type, source, info, table)
    let fnPath = `backend_read${type}`
    let beforeHook = _.get(before, fnPath, (args, backend, done) => done())
    let afterHook = _.get(after, fnPath, (result, args, backend, done) => done(result))

    return new Promise((resolve, reject) => {
      return beforeHook({ source, args, context, info }, backend, (err) => {
        if (err) return reject(err)

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
            return afterHook(result, args, backend, (err, result) => {
              if (err) return reject(err)
              return resolve(result)
            })
          })
          .catch(reject)
      })
    })
      .timeout(timeout || 10000)
  }
}