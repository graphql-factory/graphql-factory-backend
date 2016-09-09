import _ from 'lodash'

/*
Relationship notes:

hasOne - one2one - this table has a field that references a pk in other table
hasMany - one2many - this table has list that references pks in other table
belongsTo - one2one/many2one - pk on self, other table should reference this table
belongsToMany - many2many - join table that has a pk from this table and another
  - handled by belongsTo with multiple type:foreign pairs defined
 */

export const PRIMITIVES = ['String', 'Int', 'Float', 'Boolean', 'ID']

export function isPrimitive (type) {
  if (_.isArray(type)) {
    if (type.length !== 1) return false
    type = type[0]
  }
  return _.includes(PRIMITIVES, type)
}

export function getType (fieldDef) {
  if ((_.isArray(fieldDef) && fieldDef.length === 1) || _.isString(fieldDef)) return fieldDef
  else if (_.has(fieldDef, 'type')) return fieldDef.type
}

export function makeFieldDef (fieldDef) {
  let newDef = _.merge({}, _.isObject(fieldDef) ? fieldDef : {})
  let type = getType(fieldDef)
  if (type) newDef.type = type
  return newDef
}

export function getArgs (opType, definition, cfg, name) {
  let args = {}
  let { fields, _backend } = definition

  if (opType === 'query') {
    args.limit = { type: 'Int' }
  }

  // examine each field
  _.forEach(fields, (fieldDef, fieldName) => {
    let type = getType(fieldDef)
    if (!type) return true
    fieldDef = fields[fieldName] = makeFieldDef(fieldDef)
    let { belongsTo, has } = fieldDef

    // add belongsTo relationship
    if (belongsTo) {
      _.forEach(belongsTo, (bCfg, bType) => {
        _.forEach(bCfg, (bKey, bField) => {
          let foreignFieldDef = _.get(this._types, `["${bType}"].fields["${bField}"]`)
          _.set(_backend, `computed.relations.belongsTo["${bType}"]["${bField}"]`, {
            primary: fieldName,
            foreign: bKey,
            many: _.isArray(getType(foreignFieldDef))
          })
        })
      })
    }
    if (has) {
      _.forEach(has, (hField, hType) => {
        _.set(_backend, `computed.relations.has["${hType}"]`, {
          primary: fieldName,
          foreign: hField.key,
          many: _.isArray(fieldDef.type)
        })
      })
    }

    if (isPrimitive(type)) {
      args[fieldName] = { type }
    } else if (fieldDef.resolve !== false && opType === 'query') {
      fieldDef.resolve = fieldDef.resolve || `read${type}`
    }
  })

  return args
}

export function makeRelations (definition) {

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
    let { schema, table, collection, store, db, mutation, query } = _backend

    // allow the collection to be specified as the collection or table field
    collection = collection || table
    store = store || db || this.defaultStore

    // check that the type has a schema identified, otherwise create a schema with the namespace
    let schemaName = _.isString(schema) ? schema : this.namespace
    let queryName = `${schemaName}Query`
    let mutationName = `${schemaName}Mutation`

    // update the backend
    _backend.computed = { schemaName, queryName, mutationName, collection, store, relations: {} }

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
          args: q.args || getArgs.call(this, 'query', definition, q, qname),
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
          args: m.args || getArgs.call(this, 'mutation', definition, m, mname),
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