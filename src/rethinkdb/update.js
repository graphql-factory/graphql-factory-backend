import _ from 'lodash'

export default function update (type) {
  let backend = this
  return function (source, args, context, info) {

    let { r, connection, util } = backend
    let { collection, store, primary, before } = backend.getTypeInfo(type, info)
    let table = r.db(store).table(collection)
    let beforeHook = _.get(before, `update${type}`)

    // main query
    let query = () => {
      let notThis = backend.filter.notThisRecord(type, backend, args, table)
      return backend.filter.violatesUnique(type, backend, args, notThis)
        .branch(
          r.error('unique field violation'),
          util.update(type, args, { exists: backend.getRelatedValues(type, args) })
        )
        .run(connection)
    }

    // run before stub
    let resolveBefore = beforeHook.call({ factory: this, backend }, source, args, context, info)
    if (util.isPromise(resolveBefore)) return resolveBefore.then(query)
    return query()
  }
}