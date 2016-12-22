import _ from 'lodash'
import Q from './q'

export default function del (backend, type) {
  return function (source, args, context = {}, info) {
    let q = Q(backend)
    let { before } = backend.getTypeInfo(type, info)
    let beforeHook = _.get(before, `backend_delete${type}`)
    let query = () => q.type(type).delete(args).run()

    // run before stub
    let resolveBefore = beforeHook(source, args, _.merge({}, { factory: this }, context), info)
    if (_.isPromise(resolveBefore)) return resolveBefore.then(query)
    return query()
  }
}