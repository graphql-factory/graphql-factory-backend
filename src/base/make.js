import _ from 'lodash'

export function getArgs (type, definition, cfg) {
  let args = {}

  // examine each field
  _.forEach(definition.fields, (fieldDef, fieldName) => {
    if (_.isString(fieldDef) || _.isArray(fieldDef)) {
      args[fieldName] = { type: fieldDef }
    } else if (_.has(fieldDef, 'type')) {
      if (!_.isString(fieldDef) && !_.isArray(fieldDef)) return true

    }
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
        if (qname === 'read' && q === true) {
          _.set(this._definition.types, `${queryName}.fields.${qname}${tname}`, {
            type: [tname],
            args: getArgs('query', definition, q),
            resolve: `${qname}${tname}`
          })
          _.set(this._definition, `functions.${qname}${tname}`, this[`_${qname}`](tname))
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
        if (_.includes(['create', 'update', 'delete'], mname) && m === true) {
          _.set(this._definition.types, `${mutationName}.fields.${mname}${tname}`, {
            type: mname === 'delete' ? 'Boolean' : tname,
            args: getArgs('mutation', definition, m),
            resolve: `${mname}${tname}`
          })
          _.set(this._definition.functions, `${mname}${tname}`, this[`_${mname}`](tname))
        }
      })
    }
  })
}

export default make