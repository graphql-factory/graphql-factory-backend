import _ from 'lodash'

export default function create (type) {
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

    // do a unique field check if any are specified
    if (unique.length) {
      filter = filter.filter((obj) => {
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
          table.insert(_.omit(args, primary), { returnChanges: true })
        )
    } else {
      filter = filter.insert(_.omit(args, primary), { returnChanges: true })
    }

    // do the update
    return filter('changes').nth(0)('new_val').run(connection)
  }
}