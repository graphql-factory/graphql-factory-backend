import _ from 'lodash'
import md5 from 'js-md5'

export default function subscriptionEvent (name, args = {}) {
  if (!name) throw new Error('subscriptionEvent creation requires a subscription name')

  let subArgs = _.cloneDeep(args)

  _.forEach(subArgs, (arg) => {
    if (arg.subscriber) arg.subscriber = undefined
  })

  try {
    return 'subscription:' + md5(`name:${JSON.stringify(subArgs)}`)
  } catch (err) {
    throw new Error('Unable to create subscription event, arguments may have a cyclical reference')
  }
}