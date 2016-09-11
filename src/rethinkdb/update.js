import _ from 'lodash'

export default function update (type) {
  let backend = this
  return function (source, args, context, info) {

    let { r, connection } = backend
    let { collection, store, primary, primaryKey } = backend.getTypeBackend(type)
    let table = r.db(store).table(collection)
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
}