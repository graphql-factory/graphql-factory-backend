import _ from 'lodash'

export class GraphQLFactoryBackendQueryBuilder {
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
    let q = new GraphQLFactoryBackendQueryBuilder(this._b, t)
    q._value = q._collection
    return q
  }

  value (v) {
    if (v === undefined) return this._value
    let q = new GraphQLFactoryBackendQueryBuilder(this._b)
    q._value = v
    return q
  }

  error (msg) {
    return this._b.r.error(msg)
  }

  run () {
    if (this._value) return this._value.run(this._connection)
    throw new Error('no operations to run')
  }

  add () {
    this._value = this._value.add.apply(this._value, [...arguments])
    return this
  }

  sub () {
    this._value = this._value.sub.apply(this._value, [...arguments])
    return this
  }

  eq () {
    this._value = this._value.eq.apply(this._value, [...arguments])
    return this
  }

  ne () {
    this._value = this._value.ne.apply(this._value, [...arguments])
    return this
  }

  gt () {
    this._value = this._value.gt.apply(this._value, [...arguments])
    return this
  }

  ge () {
    this._value = this._value.ge.apply(this._value, [...arguments])
    return this
  }

  lt () {
    this._value = this._value.lt.apply(this._value, [...arguments])
    return this
  }

  le () {
    this._value = this._value.le.apply(this._value, [...arguments])
    return this
  }

  not () {
    this._value = this._value.not()
    return this
  }

  count () {
    this._value = this._value.count()
    return this
  }

  now () {
    let q = new GraphQLFactoryBackendQueryBuilder(this._b)
    q._value = this._b.r.now()
    return q
  }

  get (id) {
    id = _.isObject(id) && !_.isArray(id) ? this._b.getPrimaryFromArgs(this._type, id) : id
    this._value = this._collection.get(id)
    return this
  }

  prop (path) {
    path = _.isArray(path) ? path : _.toPath(path)
    for (const p of path) {
      this._value = this._value(p)
    }
    return this
  }

  merge () {
    this._value = this._value.merge.apply(this._value, [...arguments])
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

    if (this._value && this._value !== this._r) {
      this._value = this._value.update(args)
      return this
    }

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

    if (!id) {
      this._value = this._value.delete()
      return this
    }

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
    this._value = this._r.expr.apply(this._b.r, [...arguments])
    return this
  }

  coerceTo (type) {
    this._value = this._value.coerceTo(type)
    return this
  }

  filter () {
    this._value = this._value.filter.apply(this._value, [...arguments])
    return this
  }

  do () {
    this._value = this._value.do.apply(this._value, [...arguments])
    return this
  }

  and () {
    this._value = this._value.and.apply(this._value, [...arguments])
    return this
  }

  or () {
    this._value = this._value.or.apply(this._value, [...arguments])
    return this
  }

  nth () {
    this._value = this._value.nth.apply(this._value, [...arguments])
    return this
  }

  branch () {
    this._value = this._value.branch.apply(this._value, [...arguments])
    return this
  }

  map () {
    this._value = this._value.map.apply(this._value, [...arguments])
    return this
  }

  reduce () {
    this._value = this._value.reduce.apply(this._value, [...arguments])
    return this
  }
}

export default function (backend) {
  return new GraphQLFactoryBackendQueryBuilder(backend)
}