import _ from 'lodash'

export function createTable (dbc, name, primaryKey) {
  return dbc.tableCreate(name, { primaryKey })
    .run()
    .then(() => `${name} Created`)
    .catch((err) => {
      if (err.msg.match(/^Table.*already\s+exists\.$/i) !== null) return `${name} Exists`
      throw err
    })
}

export default function initStore (type, rebuild, seedData) {
  let { r, connection } = this
  let { computed: { primaryKey, collection, store } } = this.getTypeBackend(type)

  if (!collection || !store) throw new Error('Invalid store init config')

  let dbc = r.db(store)

  // analyze the arguments
  if (!_.isBoolean(rebuild)) {
    seedData = _.isArray(rebuild) ? rebuild : []
    rebuild = false
  }

  return dbc.tableList()
    .filter((name) => name.eq(collection))
    .forEach((name) => rebuild ? dbc.tableDrop(name) : dbc.table(collection).delete())
    .run(connection)
    .then(() => createTable(dbc, collection, primaryKey))
    .then((tablesCreated) => {
      if (seedData) return dbc.table(collection).insert(seedData).run(connection).then(() => tablesCreated)
      return tablesCreated
    })
}