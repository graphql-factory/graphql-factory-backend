import _ from 'lodash'

export function getPrimary (fields) {
  let primary = _(fields).pick((v) => v.primary === true).keys().value()
  return !primary.length ? null : primary.length === 1 ? primary[0] : primary
}

export function isPromise (obj) {
  return _.isFunction(_.get(obj, 'then')) && _.isFunction(_.get(obj, 'catch'))
}

export function createPromiseMap (list, values) {
  return _.map(list, (value, key) => {
    if (isPromise(value)) return value.then((result) => values[key] = result)
    else return Promise.resolve(value).then((result) => values[key] = result)
  })
}

export function promiseMap (list) {
  let map = []
  return Promise.all(createPromiseMap(list, map)).then(() => map)
}

export default {
  getPrimary,
  isPromise,
  createPromiseMap,
  promiseMap
}