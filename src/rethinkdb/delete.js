import _ from 'lodash'
import Promise from 'bluebird'
import Q from './q'

export default function del (backend, type) {
  return function (source, args, context = {}, info) {
    let { connection } = backend
    let { before, after, timeout } = backend.getTypeInfo(type, info)
    let q = Q(backend)
    let fnPath = `backend_delete${type}`
    let beforeHook = _.get(before, fnPath, (args, backend, done) => done())
    let afterHook = _.get(after, fnPath, (result, args, backend, done) => done(result))

    return new Promise((resolve, reject) => {
      return beforeHook.call(this, { source, args, context, info }, backend, (err) => {
        if (err) return reject(err)

        return q.type(type).delete(args)
          .run(connection)
          .then((result) => {
            return afterHook.call(this, result, args, backend, (err, result) => {
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