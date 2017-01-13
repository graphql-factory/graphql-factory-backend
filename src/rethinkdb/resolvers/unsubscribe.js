import _ from 'lodash'
import Promise from 'bluebird'

export default function unsubscribe (backend, type) {
  return function (source, args, context = {}, info) {
    let { subscription, subscriber } = args
    let { before, after, error, timeout } = backend.getTypeInfo(type, info)
    let fnPath = `backend_unsubscribe${type}`

    return new Promise((resolve, reject) => {
      let beforeHook = _.get(before, fnPath)
      let afterHook = _.get(after, fnPath)
      let errorHook = _.get(error, fnPath)
      let hookArgs = { source, args, context, info }
      let result = { unsubscribed: true }

      return backend.beforeMiddleware(this, beforeHook, hookArgs, backend, (error) => {
        if (error) return backend.errorMiddleware(this, errorHook, error, hookArgs, backend, reject)

        try {
          return backend.subscriptionManager.unsubscribe(subscription, subscriber, (error) => {
            if (error) return backend.errorMiddleware(this, errorHook, error, hookArgs, backend, reject)
            return backend.afterMiddleware(this, afterHook, result, hookArgs, backend, (error, result) => {
              if (error) return backend.errorMiddleware(this, errorHook, error, hookArgs, backend, reject)
              return resolve(result)
            })
          })
        } catch (error) {
          return backend.errorMiddleware(this, errorHook, error, hookArgs, backend, reject)
        }
      })
    })
      .timeout(timeout || 10000)
  }
}