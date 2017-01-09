export default function unsubscribe (backend) {
  return function (source, args, context = {}, info) {
    let { subscription, subscriber } = args

    return new Promise((resolve, reject) => {
      try {
        return backend.subscriptionManager.unsubscribe(subscription, subscriber, (err) => {
          if (err) return reject(err)
          return resolve({ unsubscribed: true })
        })
      } catch (err) {
        return reject(err)
      }
    })
  }
}