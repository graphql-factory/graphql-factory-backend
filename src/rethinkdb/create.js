export default function create (type) {
  let backend = this
  return function (source, args, context, info) {
    let { r, connection } = backend
    let { collection, store } = backend.getTypeInfo(type, info)
    let table = r.db(store).table(collection)

    let filter = backend.filter.violatesUnique(type, backend, args, table)
      .branch(
        r.error('unique field violation'),
        table.insert(backend.updateArgsWithPrimary(type, args), { returnChanges: true })('changes')
          .do((changes) => {
            return changes.count().eq(0).branch(
              r.error('unable to create, possible primary key violation'),
              changes.nth(0)('new_val')
            )
          })
      )

    // do the update
    return filter.run(connection)
  }
}