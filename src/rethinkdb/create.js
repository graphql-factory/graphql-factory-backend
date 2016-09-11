import _ from 'lodash'

export default function create (type) {
  let backend = this
  return function (source, args, context, info) {
    let { r, connection } = backend
    let { collection, store, primary } = backend.getTypeInfo(type, info)
    let table = r.db(store).table(collection)

    let filter = backend.filter.violatesUnique(type, backend, args, table)
      .branch(
        r.error('unique field violation'),
        table.insert(_.omit(args, primary), { returnChanges: true })('changes').nth(0)('new_val')
      )

    // do the update
    return filter.run(connection)
  }
}