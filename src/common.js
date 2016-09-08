import _ from 'lodash'

export const FACTORY_FIELDS = [
  'globals',
  'types',
  'schemas',
  'fields',
  'functions',
  'externalTypes'
]

export function plugin () {
  let _plugin = {}
  let obj = {}

  // merge all plugins
  _.forEach(this._plugin, (p) => _.merge(_plugin, p))

  // create current backend plugin
  _.forEach(FACTORY_FIELDS, (field) => {
    if (_.keys(this[field]).length) obj[field] = this[field]
  })

  // return a merged backend and plugin
  return _.merge(_plugin, obj)
}


export function setTypes () {
  _.forEach(this._types, (cfg, name) => {
    let { definition } = cfg
    if (definition) this.types[name] = definition
  })
}

export function setSchemas () {
  this.schemas[`${this.namespace}`] = {
    query: `${this.namespace}Query`,
    mutation: `${this.namespace}Mutation`
  }
}

export default {
  FACTORY_FIELDS,
  plugin,
  setTypes,
  setSchemas
}