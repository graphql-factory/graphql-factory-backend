import _ from 'lodash'
import Promise from 'bluebird'
import Q from './q'
import { notThisRecord, violatesUnique } from './filter'

export default function update (backend, type) {
  return function (source, args, context = {}, info) {
    let { r, connection } = backend
    let { before, after, timeout } = backend.getTypeInfo(type, info)
    let q = Q(backend)
    let table = backend.getCollection(type)
    let id = backend.getPrimaryFromArgs(type, args)
    let fnPath = `backend_update${type}`
    let beforeHook = _.get(before, fnPath, (args, backend, done) => done())
    let afterHook = _.get(after, fnPath, (result, args, backend, done) => done(result))

    return new Promise((resolve, reject) => {
      return beforeHook({ source, args, context, info }, backend, (err) => {
        if (err) return reject(err)

        let notThis = notThisRecord(backend, type, args, table)
        return violatesUnique(backend, type, args, notThis)
          .branch(
            r.error('unique field violation'),
            q.type(type)
              .update(args, { exists: backend.getRelatedValues(type, args) })
              .do(() => q.type(type).get(id).value())
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