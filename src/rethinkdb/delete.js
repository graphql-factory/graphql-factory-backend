import _ from 'lodash'

export default function del (type) {
  let backend = this
  let { namespace, _types, getPrimary } = this
  let definition = _.get(_types, type, {})
  let { _backend, fields } = definition
  let { collection, store } = _backend.computed

  // TODO: smart delete options to remove references on has relations

  return function (source, args, context, info) {
    let { r, connection } = backend
    let primary = getPrimary(fields)
    let table = r.db(store).table(collection)
    let id = args[primary]

    return table.get(id).delete()('deleted')
      .eq(0)
      .branch(
        r.error('Could not delete'),
        true
      )
      .run(connection)
  }
}