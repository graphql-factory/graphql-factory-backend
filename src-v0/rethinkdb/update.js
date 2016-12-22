import _ from 'lodash'

export default function update (type) {
  let backend = this
  return function (source, args, context = {}, info) {

    let { r, connection, util, q } = backend
    let { collection, store, before } = backend.getTypeInfo(type, info)
    let table = r.db(store).table(collection)
    let id = backend.getPrimaryFromArgs(type, args)
    let beforeHook = _.get(before, `update${type}`)

    // main query
    let query = () => {
      let notThis = backend.filter.notThisRecord(type, backend, args, table)
      return backend.filter.violatesUnique(type, backend, args, notThis)
        .branch(
          r.error('unique field violation'),
          q.type(type)
            .update(args, { exists: backend.getRelatedValues(type, args) })
            .do(() => q.type(type).get(id).value())
            .value()
        )
        .run(connection)
    }

    // run before stub
    let resolveBefore = beforeHook(source, args, _.merge({}, { factory: this }, context), info)
    if (util.isPromise(resolveBefore)) return resolveBefore.then(query)
    return query()
  }
}