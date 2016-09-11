import _ from 'lodash'

export default function update (type) {
  let backend = this
  return function (source, args, context, info) {

    let { r, connection } = backend
    let { collection, store, primary, before } = backend.getTypeInfo(type, info)
    let table = r.db(store).table(collection)
    let beforeHook = _.get(before, `update${type}`)

    // main query
    let query = () => {
      let id = backend.getPrimaryFromArgs(type, args)
      let notThis = backend.filter.notThisRecord(type, backend, args, table)

      let filter = backend.filter.violatesUnique(type, backend, args, notThis)
        .branch(
          r.error('unique field violation'),
          table.get(id).eq(null).branch(
            r.error(`${type} not found`),
            table.get(id).update(_.omit(args, primary))
          )
        )

      // do the update
      return filter.do(() => table.get(id)).run(connection)
    }

    // run before stub
    let resolveBefore = beforeHook(source, args, context, info)
    if (backend.util.isPromise(resolveBefore)) return resolveBefore.then(query)
    return query()
  }
}