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

  forEach () {
    this._value = this._value.forEach.apply(this._value, [...arguments])
    return this
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
    let isBatch = _.isArray(args)
    args = isBatch
      ? args
      : args
        ? [args]
        : []

    // reduce the exists selection to a flat list of unique values
    let exists = _.reduce(_.flatten(_.isArray(options.exists) ?  options.exists : []), (result, value) => {
      return _.find(result, value) ? result : _.union(result, [value])
    }, [])

    this._value = r.expr(exists).prepend(true)
      .reduce((prev, cur) => prev.and(r.db(cur('store')).table(cur('collection')).get(cur('id')).ne(null)))
      .not()
      .branch(
        throwErrors ? r.error('one or more related records were not found') : null,
        table.insert(args, { returnChanges: true })
          .pluck('errors', 'first_error', 'changes')
          .do((summary) => {
            return summary('errors').ne(0).branch(
              r.error(summary('first_error')),
              summary('changes')('new_val')
            )
          })
          .do((changes) => {
            return r.branch(
              changes.count().ne(args.length),
              r.error(`only created ${changes.count()} of ${args.length} requested records`),
              r.expr(isBatch),
              changes,
              changes.nth(0)
            )
          })
      )
    return this
  }

  update (args, options = {}) {
    let r = this._r
    let table = this._collection
    let throwErrors = options.throwErrors === false ? false : true
    let isBatch = _.isArray(args)
    let { primaryKey } = this._b.getTypeComputed(this._type)

    console.log('ARGS PRE', args)

    args = isBatch
      ? args
      : args
        ? [args]
        : []

    console.log('ARGS POST', args)

    let id = isBatch
      ? _.map((arg) => this._b.getPrimaryFromArgs(this._type, arg))
      : [this._b.getPrimaryFromArgs(this._type, args)]

    console.log('ID', id)

    // reduce the exists selection to a flat list of unique values
    let exists = _.reduce(_.flatten(_.isArray(options.exists) ?  options.exists : []), (result, value) => {
      return _.find(result, value) ? result : _.union(result, [value])
    }, [])

    this._value = r.expr(exists).prepend(true)
      .reduce((prev, cur) => prev.and(r.db(cur('store')).table(cur('collection')).get(cur('id')).ne(null)))
      .not()
      .branch(
        throwErrors ? r.error('one or more related records were not found') : null,
        r.expr(args).forEach((arg) => {
          return table.get(arg(primaryKey)).eq(null).branch(
            r.error(`${this._type} with id ${arg(primaryKey)} was not found, and could not be updated`),
            table.get(arg(primaryKey)).update(arg, { returnChanges: true })
          )
        })
          .pluck('errors', 'first_error')
          .do((summary) => {
            return summary('errors').ne(0).branch(
              r.error(summary('first_error')),
              table.filter((f) => r.expr(id).contains(f(primaryKey)))
                .coerceTo('ARRAY')
                .do((results) => {
                  return r.expr(isBatch).branch(
                    results,
                    results.nth(0)
                  )
                })
            )
          })
      )
    return this
  }

  delete (args, options = {}) {
    let r = this._r
    let table = this._collection
    let throwErrors = options.throwErrors === false ? false : true
    let isBatch = _.isArray(args)
    args = isBatch
      ? args
      : args
        ? [args]
        : []

    let ids = isBatch
      ? _.map((arg) => this._b.getPrimaryFromArgs(this._type, arg))
      : [this._b.getPrimaryFromArgs(this._type, args)]

    this._value = r.expr(ids).forEach((id) => {
      return table.get(id).eq(null).branch(
        r.error(`${this._type} with id ${id} was not found and cannot be deleted`),
        table.get(id).delete({ returnChanges: true })
      )
    })
      .pluck('errors', 'first_error')
      .do((summary) => {
        return summary('errors').ne(0).branch(
          r.error(summary('first_error')),
          true
        )
      })
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