export default function del (type) {
  let backend = this
  return function (source, args, context, info) {
    let { r, connection } = backend
    let { collection, store } = backend.getTypeBackend(type)
    let table = r.db(store).table(collection)
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
}