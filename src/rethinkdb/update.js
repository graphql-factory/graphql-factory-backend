import _ from 'lodash'

// TODO: support for array primary key

export default function update (type) {
  let backend = this
  let { namespace, _types, getPrimary, getUnique } = this
  let definition = _.get(_types, type, {})
  let { _backend, fields } = definition
  let { collection, store } = _backend.computed

  return function (source, args, context, info) {
    let { r, connection } = backend
    let primary = getPrimary(fields)
    let table = r.db(store).table(collection)
    let filter = table
    let unique = getUnique(fields, args)
    let id = args[primary]

    // do a unique field check if any are specified
    if (unique.length) {
      filter = filter.filter((obj) => obj(primary).ne(id)).filter((obj) => {
        return r.expr(unique)
          .prepend(obj)
          .reduce((left, right) => {
            return left.and(
              right('type').eq('String').branch(
                obj(right('field')).match(r.add('(?i)^', right('value'), '$')),
                obj(right('field')).eq(right('value'))
              )
            )
          })
      })
        .count()
        .ne(0)
        .branch(
          r.error('Unique field violation'),
          table.get(id).update(_.omit(args, primary))
        )
    } else {
      filter = filter.get(id).update(_.omit(args, primary))
    }

    // do the update
    return filter.do(() => table.get(id)).run(connection)
  }
}