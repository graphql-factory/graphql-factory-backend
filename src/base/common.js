import _ from 'lodash'

export function getPrimary (fields) {
  let primary = _(fields).pick((v) => v.primary === true).keys().value()
  return !primary.length ? null : primary.length === 1 ? primary[0] : primary
}

export default {
  getPrimary
}