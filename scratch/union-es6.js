import _ from 'lodash'
import dash from 'rethinkdbdash'
let r = dash()

let table = r.db('test').table('Animals')

let search = {
  $and: [
    { owner: { $eq: 'you' } },
    { name: 'Cat' }
  ]
}

let search2 = {
  $or: [
    { name: 'Cat' },
    { name: 'Pig' }
  ]
}

function buildSearch (rec, sub) {
  let TRU = rec.eq(rec)
  let FAL = rec.eq(rec).not()
  return _.reduce(sub, (accum, cur, key) => {
    switch (key) {
      case '$and':
        return _.reduce(cur, (accum, cur) => {
          return accum.and(buildSearch(rec, cur))
        }, TRU)

      case '$or':
        return _.reduce(cur, (accum, cur) => {
          return accum.or(buildSearch(rec, cur))
        }, FAL)

      default:
        let op = _.first(_.keys(cur))
        let val = cur[op]

        switch (op) {
          case '$eq':
            return rec(key).eq(val)
          case '$ne':
            return rec(key).ne(val)
          default:
            return rec(key).eq(cur)
        }

    }
  }, TRU)
}

function doSearch () {
  return table.filter((rec) => {
    let srch = buildSearch(rec, search)

    return srch
  })
}

doSearch().run().then((res) => {
  console.log(res)
}, console.log)