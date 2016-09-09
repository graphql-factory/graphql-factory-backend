import _ from 'lodash'

export const PRIMITIVES = ['String', 'Int', 'Float', 'Boolean', 'ID']

export function isPrimitive (type) {
  if (_.isArray(type)) {
    if (type.length !== 1) return false
    type = type[0]
  }
  return _.includes(PRIMITIVES, type)
}

export function getArgs (type, definition, cfg, name) {
  let args = {}

  if (type === 'query') {
    args.limit = { type: 'Int' }
  }

  // examine each field
  _.forEach(definition.fields, (fieldDef, fieldName) => {
    let type = _.has(fieldDef, 'type') ? fieldDef.type : fieldDef
    if (isPrimitive(type)) args[fieldName] = { type }
  })

  return args
}

export function make () {

  // analyze each type and construct graphql schemas
  _.forEach(this._types, (definition, tname) => {
    let { fields, _backend } = definition

    // verify that the type at least has fields
    if (!_.isObject(fields)) return true
    this._definition.types[tname] = definition

    // check for a backend object config, if one doesnt exist this type is done
    if (!_.isObject(_backend)) return true

    // get deconstruct the backend config
    let { schema, table, collection, mutation, query } = _backend

    // allow the collection to be specified as the collection or table field
    collection = collection || table

    // check that the type has a schema identified, otherwise create a schema with the namespace
    let schemaName = _.isString(schema) ? schema : this.namespace
    let queryName = `${schemaName}Query`
    let mutationName = `${schemaName}Mutation`

    // add to the queries
    if (query !== false && collection) {
      _.set(this._definition.schemas, `${schemaName}.query`, queryName)
      query = _.isObject(query) ? query : {}

      if (!query.read && query.read !== false) query.read = true

      // add each query method
      _.forEach(query, (q, qname) => {
        let queryFieldName = qname === 'read' ? `${qname}${tname}` : qname

        _.set(this._definition.types, `${queryName}.fields.${queryFieldName}`, {
          type: q.type || [tname],
          args: q.args || getArgs('query', definition, q, qname),
          resolve: `${queryFieldName}`
        })

        if (q === true || !_.has(q, 'resolve')) {
          _.set(this._definition, `functions.${queryFieldName}`, this._read(tname))
        } else if (_.isFunction(_.get(q, 'resolve'))) {
          _.set(this._definition, `functions.${queryFieldName}`, q.resolve)
        }
      })
    }

    // add to the mutations
    if (mutation !== false && collection) {
      _.set(this._definition.schemas, `${schemaName}.mutation`, mutationName)
      mutation = _.isObject(mutation) ? mutation : {}
      if (!mutation.create && mutation.create !== false) mutation.create = true
      if (!mutation.update && mutation.update !== false) mutation.update = true
      if (!mutation.delete && mutation.delete !== false) mutation.delete = true

      // add each mutation method
      _.forEach(mutation, (m, mname) => {
        let mutationFieldName = _.includes(['create', 'update', 'delete'], mname) ? `${mname}${tname}` : mname

        _.set(this._definition.types, `${mutationName}.fields.${mutationFieldName}`, {
          type: m.type || [tname],
          args: m.args || getArgs('mutation', definition, m, mname),
          resolve: `${mutationFieldName}`
        })

        if (m === true || !_.has(m, 'resolve')) {
          _.set(this._definition, `functions.${mutationFieldName}`, this[`_${mname}`](tname))
        } else if (_.isFunction(_.get(m, 'resolve'))) {
          _.set(this._definition, `functions.${mutationFieldName}`, m.resolve)
        }
      })
    }
  })
}

export default make