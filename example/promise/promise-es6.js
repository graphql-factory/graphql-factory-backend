import _ from 'lodash'

function isPromise (obj) {
  return _.isFunction(_.get(obj, 'then')) && _.isFunction(_.get(obj, 'catch'))
}

function createPromiseMap (list, values) {
  return _.map(list, (value, key) => {
    if (isPromise(value)) {
      return value.then((result) => {
        console.log(result)
        values[key] = result
      })
    }
    else {
      return Promise.resolve(value).then((result) => {
        console.log(result)
        values[key] = result
      })
    }
  })
}

function promiseMap (list) {
  let map = []
  return Promise.all(createPromiseMap(list, map)).then(() => map)
}

function waitPromise () {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve('wait promise')
    }, 1000)
  })
}


let myMap = [
  1,
  2,
  waitPromise(),
  3
]


promiseMap(myMap)
  .then((result) => {
    console.log(result)
  })
  .catch((err) => console.log)


/*
let p = Promise.resolve(1)
p = p.then(() => {
  console.log(1)
  return Promise.resolve(2)
})

p = p.then(() => {
  console.log(2)
  return waitPromise()
})

p = p.then(() => {
  console.log('wait promise')
  return Promise.resolve(3)
})

p.then(() => {
  console.log(3)
})
*/
/*
Promise.resolve(1)
.then(() => {
  console.log(1)
  return Promise.resolve(2)
})
.then(() => {
  console.log(2)
  return waitPromise()
})
.then(() => {
  console.log('wait promise')
  return Promise.resolve(3)
})
.then(() => {
  console.log(3)
})
  */