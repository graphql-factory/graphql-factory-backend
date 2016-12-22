import _ from 'lodash'
import Q from './q'
import { notThisRecord, violatesUnique } from './filter'

export default function update (backend, type) {
  return function (source, args, context = {}, info) {
    let { r, connection } = backend
    let q = Q(backend)
    let { before } = backend.getTypeInfo(type, info)
    let table = backend.getCollection(type)
    let id = backend.getPrimaryFromArgs(type, args)
    let beforeHook = _.get(before, `update${type}`)

    // main query
    let query = () => {
      let notThis = notThisRecord(backend, type, args, table)
      return violatesUnique(backend, type, args, notThis)
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
    if (_.isPromise(resolveBefore)) return resolveBefore.then(query)
    return query()
  }
}