import _ from 'lodash'

export default function del (type) {
  let backend = this
  return function (source, args, context, info) {
    let { r, connection } = backend
    let { collection, store, before } = backend.getTypeInfo(type, info)
    let table = r.db(store).table(collection)
    let beforeHook = _.get(before, `delete${type}`)

    // main query
    let query = () => {
      let id = backend.getPrimaryFromArgs(type, args)

      // TODO: smart delete options to remove references on has relations

      return table.get(id).delete()('deleted')
        .eq(0)
        .branch(
          r.error('Could not delete'),
          true
        )
        .run(connection)
    }

    // run before stub
    let resolveBefore = beforeHook(source, args, context, info)
    if (backend.util.isPromise(resolveBefore)) return resolveBefore.then(query)
    return query()
  }
}