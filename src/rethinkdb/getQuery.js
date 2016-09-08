import _ from 'lodash'

export default function getQuery () {
  _.forEach(this._types, (cfg, name) => {
    let { table, query } = cfg
    if (query === false) return
    if (!query) {
      // make the create function
    } else {
      _.forEach(query, (q, qName) => {
        // add each custom defined query
      })
    }
  })
}