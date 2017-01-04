import _ from 'lodash'
import md5 from 'md5'

export default function subscriptionEvent (name, args = {}) {
  if (!name) throw new Error('subscriptionEvent creation requires a subscription name')

  try {
    return 'subscription:' + md5(`name:${JSON.stringify(_.omit(args, ['subscriber']))}`)
  } catch (err) {
    throw new Error('Unable to create subscription event, arguments may have a cyclical reference')
  }
}