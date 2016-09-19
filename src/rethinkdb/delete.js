import _ from 'lodash'

export default function del (type) {
  let backend = this
  return function (source, args, context = {}, info) {
    let { util, q } = backend
    let beforeHook = _.get(before, `delete${type}`)
    let query = () => q.type(type).delete(args).run()

    // run before stub
    let resolveBefore = beforeHook(source, args, _.merge({}, { factory: this }, context), info)
    if (util.isPromise(resolveBefore)) return resolveBefore.then(query)
    return query()
  }
}