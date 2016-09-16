import _ from 'lodash'

export default function del (type) {
  let backend = this
  return function (source, args, context, info) {
    let { util } = backend
    let beforeHook = _.get(before, `delete${type}`)
    let query = () => util.exec(util.delete(type, args))

    // run before stub
    let resolveBefore = beforeHook.call({ factory: this, backend }, source, args, context, info)
    if (util.isPromise(resolveBefore)) return resolveBefore.then(query)
    return query()
  }
}