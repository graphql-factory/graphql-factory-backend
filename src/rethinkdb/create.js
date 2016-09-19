import _ from 'lodash'

export default function create (type) {
  let backend = this
  return function (source, args, context = {}, info) {
    let { r, connection, util, q } = backend
    let { collection, store, before } = backend.getTypeInfo(type, info)
    let table = r.db(store).table(collection)
    let beforeHook = _.get(before, `create${type}`)

    // main query
    let query = () => {
      let filter = backend.filter.violatesUnique(type, backend, args, table)
        .branch(
          r.error('unique field violation'),
          q.type(type)
            .insert(args, { exists: backend.getRelatedValues(type, args) })
            .value()
        )

      // do the update
      return filter.run(connection)
    }

    // run before stub
    let resolveBefore = beforeHook(source, args, _.merge({}, { factory: this }, context), info)
    if (util.isPromise(resolveBefore)) return resolveBefore.then(query)
    return query()
  }
}