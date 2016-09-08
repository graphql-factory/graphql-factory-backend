import _ from 'lodash'

export default function read (type) {
  let backend = this
  let namespace = backend.namespace
  let config = _.get(backend, `_types["${type}"]._backend`, {})
  let collection = config.collection || config.table

  return function (source, args, context, info) {
    console.log(this.globals)

    let { r, connection } = this.globals[namespace]
    let table = backend.r.table(collection)
    return table.run(connection)
  }
}