import _ from 'lodash'
import { violatesUnique } from './filter'
import Q from './q'

export default function create (backend, type) {
  return function (source, args, context = {}, info) {
    let { r, connection } = backend
    let q = Q(backend)
    let { collection, store, before } = backend.getTypeInfo(type, info)
    let table = r.db(store).table(collection)
    let beforeHook = _.get(before, `create${type}`)

    // main query
    let query = () => {
      let filter = violatesUnique(backend, type, args, table)
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
    if (_.isPromise(resolveBefore)) return resolveBefore.then(query)
    return query()
  }
}