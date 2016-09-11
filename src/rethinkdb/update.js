import _ from 'lodash'

// TODO: support for array primary key

export default function update (type) {
  let backend = this
  return function (source, args, context, info) {

    let { r, connection } = backend
    let { collection, store, primary } = backend.getTypeInfo(type, info)
    let table = r.db(store).table(collection)
    let id = args[primary]
    let notThis = table.filter((obj) => obj(primary).ne(id))

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