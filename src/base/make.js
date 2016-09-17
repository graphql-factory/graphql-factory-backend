import _ from 'lodash'

// primitive graphql types
export const PRIMITIVES = ['String', 'Int', 'Float', 'Boolean', 'ID']

export function defaultBefore () {
  return Promise.resolve()
}

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

export function computeUniques (fields) {
  let [ mixed, uniques ] = [ {}, [] ]
  _.forEach(fields, (fieldDef, field) => {
    let type = _.isArray(fieldDef.type) ? _.get(fieldDef, 'type[0]') : fieldDef.type
    if (fieldDef.unique === true) {
      uniques.push([ { field, type } ])
    } else if (_.isString(fieldDef.uniqueWith)) {
      if (!_.isArray(mixed[fieldDef.uniqueWith])) mixed[fieldDef.uniqueWith] = [ { field, type } ]
      else mixed[fieldDef.uniqueWith].push({ field, type })
    }
  })
  _.forEach(mixed, (compound) => uniques.push(compound))
  return _.uniq(uniques)
}

export function getArgs (opType, definition) {
  let args = {}
  let { fields, _backend } = definition

  if (opType === 'query') {
    args.limit = { type: 'Int' }
  }

  // examine each field
  _.forEach(fields, (fieldDef, fieldName) => {
    let type = getType(fieldDef)
    let typeName = _.isArray(type) && type.length === 1 ? type[0] : type
    if (!type) return true
    fieldDef = fields[fieldName] = makeFieldDef(fieldDef)

    if (isPrimitive(type)) {
      args[fieldName] = { type }
    } else {
      let fieldTypeBackend = _.get(this._types, `["${typeName}"]._backend`)

      if (fieldDef.resolve !== false && opType === 'query' && fieldTypeBackend) {
        fieldDef.resolve = fieldDef.resolve || `read${type}`
      } else {
        // add args for related types
        if (fieldDef.belongsTo) {
          args[fieldName]  = { type: 'String' }
        } else if (fieldDef.has) {
          args[fieldName] = _.isArray(fieldDef.type) ? ['String'] : 'String'
        } else {
          args[fieldName] = { type }
        }
      }
    }
  })
  return args
}

// updates definitions with relationship data
export function makeRelations () {
  _.forEach(this._types, (definition, name) => {
    let { fields, _backend } = definition

    // examine each field
    _.forEach(fields, (fieldDef, fieldName) => {
      let type = getType(fieldDef)
      let typeName = _.isArray(type) ? type[0] : type
      if (!type) return true
      fieldDef = fields[fieldName] = makeFieldDef(fieldDef)
      let { belongsTo, has } = fieldDef

      // add belongsTo relationship to the current type
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

      // add a has relationship to the nested type. this is because the nested types resolve
      // will determine how it returns data
      if (has) {
        _.set(this._types, `["${typeName}"]._backend.computed.relations.has["${name}"]["${fieldName}"]`, {
          foreign: has,
          many: _.isArray(type)
        })
      }
    })
  })
}

export function make () {

  // analyze each type and construct graphql schemas
  _.forEach(this._types, (definition, tname) => {

    let { fields, _backend } = definition
    this._definition.types[tname] = definition

    // verify that the type at least has fields
    // also check for a backend object config, if one doesnt exist this type is done
    if (!_.isObject(fields) || !_.isObject(_backend)) return true

    // get deconstruct the backend config
    let { schema, table, collection, store, db, mutation, query } = _backend

    // allow the collection to be specified as the collection or table field
    collection = `${this._prefix}${collection || table}`
    store = store || db || this.defaultStore

    // check that the type has a schema identified, otherwise create a schema with the namespace
    let schemaName = _.isString(schema) ? schema : this.namespace
    let queryName = `${schemaName}Query`
    let mutationName = `${schemaName}Mutation`

    // get the primary key name
    let primary = this.getPrimary(fields)
    let primaryKey = _backend.primaryKey || _.isArray(primary) ? _.camelCase(primary.join('-')) : primary

    // get the uniques
    let uniques = computeUniques(fields)

    // update the backend
    _backend.computed = {
      primary,
      primaryKey,
      schemaName,
      queryName,
      mutationName,
      collection,
      store,
      uniques,
      before: {}
    }


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

        // check for before stub
        let before = _.isFunction(q.before) ? q.before.bind(this) : defaultBefore
        _.set(_backend, `computed.before["${queryFieldName}"]`, before)
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
          type: m.type || mname === 'delete' ? 'Boolean' : tname,
          args: m.args || getArgs.call(this, 'mutation', definition, m, mname),
          resolve: `${mutationFieldName}`
        })

        // check for mutation resolve
        if (m === true || !_.has(m, 'resolve')) {
          _.set(this._definition, `functions.${mutationFieldName}`, this[`_${mname}`](tname))
        } else if (_.isFunction(_.get(m, 'resolve'))) {
          _.set(this._definition, `functions.${mutationFieldName}`, m.resolve)
        }

        // check for before stub
        let before = _.isFunction(m.before) ? m.before.bind(this) : defaultBefore
        _.set(_backend, `computed.before["${mutationFieldName}"]`, before)
      })
    }
  })

  // update the definitions with relations
  makeRelations.call(this)

  // finally add args to sub fields for list types
  _.forEach(this._types, (typeDef, typeName) => {
    _.forEach(typeDef.fields, (fieldDef, fieldName) => {
      let fieldType = getType(fieldDef)
      let queryName = _.get(typeDef, '_backend.computed.queryName')

      if (queryName && _.isArray(fieldType) && fieldType.length === 1 && fieldDef.args === undefined) {
        let type = fieldType[0]
        let field = _.get(this._definition.types, `["${queryName}"].fields["read${type}"]`, {})

        if (field.resolve === `read${type}` && _.isObject(field.args)) {
          _.set(this._definition.types, `["${typeName}"].fields["${fieldName}"].args`, field.args)
        }
      }
    })
  })
}

export default make