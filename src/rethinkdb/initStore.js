import _ from 'lodash'

export function createTable (dbc, name) {
  return dbc.tableCreate(name)
    .run()
    .then(() => `${name} Created`)
    .catch((err) => {
      if (err.msg.match(/^Table.*already\s+exists\.$/i) !== null) return `${name} Exists`
      throw err
    })
}

export default function initStore (type, rebuild, seedData) {
  let { r, connection } = this
  let { computed: { collection, store } } = this.getTypeBackend(type)

  let dbc = r.db(store)

  if (!collection) throw new Error('Invalid store init config')

  // analyze the arguments
  if (!_.isBoolean(rebuild)) {
    seedData = _.isArray(rebuild) ? rebuild : []
    rebuild = false
  }

  return dbc.tableList()
    .filter((name) => name.eq(collection))
    .forEach((name) => rebuild ? dbc.tableDrop(name) : dbc.table(collection).delete())
    .run(connection)
    .then(() => createTable(dbc, collection))
    .then((tablesCreated) => {
      if (seedData) return dbc.table(collection).insert(seedData).run(connection).then(() => tablesCreated)
      return tablesCreated
    })
}