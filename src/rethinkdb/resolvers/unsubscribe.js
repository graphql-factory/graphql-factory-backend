import _ from 'lodash'
import Promise from 'bluebird'

export default function unsubscribe (backend, type) {
  return function (source, args, context = {}, info) {
    let { subscription, subscriber } = args
    let { before, after, error, timeout } = backend.getTypeInfo(type, info)
    let fnPath = `backend_unsubscribe${type}`

    return new Promise((resolve, reject) => {
      let beforeHook = _.get(before, fnPath, (args, backend, done) => done())
      let afterHook = _.get(after, fnPath, (result, args, backend, done) => done(null, result))
      let errorHook = _.get(error, fnPath, (err, args, backend, done) => reject(err))
      let hookArgs = { source, args: batchMode ? args : _.first(args), context, info }

      return beforeHook.call(this, hookArgs, backend, (error) => {
        if (error) return errorHook(error, hookArgs, backend, reject)

        try {
          return backend.subscriptionManager.unsubscribe(subscription, subscriber, (error) => {
            if (error) return errorHook(error, hookArgs, backend, reject)
            return afterHook.call(this, { unsubscribed: true }, hookArgs, backend, (error, result) => {
              if (error) return errorHook(error, hookArgs, backend, reject)
              return resolve(result)
            })
          })
        } catch (error) {
          return errorHook(error, hookArgs, backend, reject)
        }
      })
    })
      .timeout(timeout || 10000)
  }
}