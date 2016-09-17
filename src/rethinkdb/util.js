import _ from 'lodash'
/*
 * The goal of the util lib is to create modular functions that can be
 * used together to create almost any action the developer may need so
 * that custom resolve functions can be composed generically regardless
 * of the backend db/store
 */

export function getTable (type) {
  let { store, collection } = this.getTypeComputed(type)
  return this.r.db(store).table(collection)
}

export class BackendUtil {
  constructor (backend, type) {
    this._r = backend.r
    this._connection = backend.connection
    this._b = backend
    this._value = this._r

    if (type) {
      let { store, collection } = backend.getTypeComputed(type)
      this._type = type
      this._storeName = store
      this._collectionName = collection
      this._store = this._r.db(this._storeName)
      this._collection = this._store.table(this._collectionName)
    }
  }

  type (t) {
    return new BackendUtil(this._b, t)
  }

  value () {
    return this._value
  }

  run () {
    if (this._value) return this._value.run(this._connection)
    throw new Error('no operations to run')
  }

  now () {
    this._value = this._r.now()
    return this
  }

  get (id) {
    id = _.isObject(id) && !_.isArray(id) ? this._b.getPrimaryFromArgs(this._type, id) : id
    this._value = this._collection.get(id)
    return this
  }

  exists (id) {
    id = _.isObject(id) && !_.isArray(id) ? this._b.getPrimaryFromArgs(this._type, id) : id
    this._value = this._collection.get(id).eq(null)
    return this
  }

  insert (args, options = {}) {
    let r = this._r
    let table = this._collection
    let throwErrors = options.throwErrors === false ? false : true

    // map the types store and collection
    let exists = _.isArray(options.exists) ?  options.exists : []

    this._value = r.expr(exists).prepend(true)
      .reduce((prev, cur) => prev.and(r.db(cur('store')).table(cur('collection')).get(cur('id')).ne(null)))
      .not()
      .branch(
        throwErrors ? r.error('One or more related records were not found') : null,
        table.insert(this._b.updateArgsWithPrimary(this._type, args), { returnChanges: true })('changes')
          .do((changes) => {
            return changes.count().eq(0).branch(
              throwErrors ? r.error('Failed to insert') : null,
              changes.nth(0)('new_val')
            )
          })
      )
    return this
  }

  update (args, options = {}) {
    let r = this._r
    let table = this._collection
    let throwErrors = options.throwErrors === false ? false : true
    let id = this._b.getPrimaryFromArgs(this._type, args)

    // map the types store and collection
    let exists = _.isArray(options.exists) ?  options.exists : []

    this._value = table.get(id).eq(null).branch(
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
    return this
  }

  delete (id, options = {}) {
    id = _.isObject(id) && !_.isArray(id) ? this._b.getPrimaryFromArgs(this._type, id) : id
    let r = this._r
    let table = this._collection
    let throwErrors = options.throwErrors === false ? false : true
    this._value = table.get(id).eq(null).branch(
      throwErrors ? r.error('unable to delete, record not found') : false,
      table.get(id).delete()('deleted')
        .eq(0)
        .branch(
          throwErrors ? r.error('failed to delete record') : false,
          true
        )
    )
    return this
  }

  expr () {
    this._value = this._r.expr.apply(null, [...arguments])
    return this
  }

  coerceTo (type) {
    this._value = this._value.coerceTo(type)
    return this
  }

  filter () {
    this._value = this._value.filter.apply(null, [...arguments])
    return this
  }

  do () {
    this._value = this._value.do.apply(null, [...arguments])
    return this
  }

  and () {
    this._value = this._value.and.apply(null, [...arguments])
    return this
  }

  or () {
    this._value = this._value.or.apply(null, [...arguments])
    return this
  }

  branch () {
    this._value = this._value.branch.apply(null, [...arguments])
    return this
  }

  map () {
    this._value = this._value.map.apply(null, [...arguments])
    return this
  }

  reduce () {
    this._value = this._value.reduce.apply(null, [...arguments])
    return this
  }
}

export function now () {
  return this.r.now()
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