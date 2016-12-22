import _ from 'lodash'
import Promise from 'bluebird'
import Q from './q'
import { violatesUnique } from './filter'

export default function create (backend, type) {
  return function (source, args, context = {}, info) {
    let { r, connection } = backend
    let { collection, store, before, after, timeout } = backend.getTypeInfo(type, info)
    let q = Q(backend)
    let table = r.db(store).table(collection)
    let fnPath = `backend_create${type}`
    let beforeHook = _.get(before, fnPath, (args, backend, done) => done())
    let afterHook = _.get(after, fnPath, (result, args, backend, done) => done(result))

    return new Promise((resolve, reject) => {
      return beforeHook({ source, args, context, info }, backend, (err) => {
        if (err) return reject(err)

        return violatesUnique(backend, type, args, table)
          .branch(
            r.error('unique field violation'),
            q.type(type)
              .insert(args, { exists: backend.getRelatedValues(type, args) })
              .value()
          )
          .run(connection)
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