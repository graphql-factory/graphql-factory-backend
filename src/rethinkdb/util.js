import _ from 'lodash'
/*
 * The goal of the util lib is to create modular functions that can be
 * used together to create almost any action the developer may need so
 * that custom resolve functions can be composed generically regardless
 * of the backend db/store
 */

export function now () {
  return this.r.now()
}

export function getTable (type) {
  let { store, collection } = this.getTypeComputed(type)
  return this.r.db(store).table(collection)
}

export function exists (type, id) {
  id = _.isObject(id) && !_.isArray(id) ? this.getPrimaryFromArgs(type, id) : id
  let table = getTable.call(this, type)
  return table.get(id).eq(null)
}

export function get (type, id) {
  id = _.isObject(id) && !_.isArray(id) ? this.getPrimaryFromArgs(type, id) : id
  let table = getTable.call(this, type)
  if (id) return table.get(id)
  else return table
}

export function insert (type, args, options = {}) {
  let r = this.r
  let table = getTable.call(this, type)
  let throwErrors = options.throwErrors === false ? false : true

  // map the types store and collection
  let exists = _.isArray(options.exists) ?  options.exists : []

  return r.expr(exists).prepend(true)
    .reduce((prev, cur) => prev.and(r.db(cur('store')).table(cur('collection')).get(cur('id')).ne(null)))
    .not()
    .branch(
      throwErrors ? r.error('One or more related records were not found') : null,
      table.insert(this.updateArgsWithPrimary(type, args), { returnChanges: true })('changes')
        .do((changes) => {
          return changes.count().eq(0).branch(
            throwErrors ? r.error('Failed to insert') : null,
            changes.nth(0)('new_val')
          )
        })
    )
}

export function update (type, args, options = {}) {
  let r = this.r
  let table = getTable.call(this, type)
  let throwErrors = options.throwErrors === false ? false : true
  let id = this.getPrimaryFromArgs(type, args)

  // map the types store and collection
  let exists = _.isArray(options.exists) ?  options.exists : []

  return table.get(id).eq(null).branch(
    throwErrors ? r.error('The record was not found') : null,
    r.expr(exists).prepend(true)
      .reduce((prev, cur) => prev.and(r.db(cur('store')).table(cur('collection')).get(cur('id')).ne(null)))
      .not()
      .branch(
        throwErrors ? r.error('One or more related records were not found') : null,
        table.get(id).update(args)
          .do(() => table.get(id))
      )
  )
}

export function del (type, id, options = {}) {
  id = _.isObject(id) && !_.isArray(id) ? this.getPrimaryFromArgs(type, id) : id
  let r = this.r
  let table = getTable.call(this, type)
  let throwErrors = options.throwErrors === false ? false : true
  return table.get(id).eq(null).branch(
    throwErrors ? r.error('unable to delete, record not found') : false,
    table.get(id).delete()('deleted')
      .eq(0)
      .branch(
        throwErrors ? r.error('failed to delete record') : false,
        true
      )
  )
}

export function exec (expr) {
  expr.run(this.connection)
}

export default function (backend) {
  return {
    now: now.bind(backend),
    insert: insert.bind(backend),
    exists: exists.bind(backend),
    update: update.bind(backend),
    delete: del.bind(backend),
    exec: exec.bind(backend)
  }
}