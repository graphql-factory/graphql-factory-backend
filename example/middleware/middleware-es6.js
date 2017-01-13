import _ from 'lodash'

function handleAfter (context, result, args, backend, hooks, done) {
  let handlers = {}

  hooks = _.isFunction(hooks)
    ? [hooks]
    : _.isArray(hooks)
      ? _.filter(hooks, _.isFunction)
      : []

  if (!hooks.length) return done(null, result)

  handlers.after = (err, res) => {
    hooks = hooks.splice(1)
    result = res

    if (err) return done(err)
    if (!hooks.length) return done(null, res)

    return hooks[0].call(context, result, args, backend, handlers.after, handlers.next)
  }

  handlers.next = (err) => {
    return err
      ? done(err)
      : handlers.after(null, result)
  }

  return hooks[0].call(context, result, args, backend, handlers.after, handlers.next)
}

let context = {
  context: true
}
let result = {
  result: true
}
let args = {
  args: true
}
let backend = {
  backend: true
}

let hooks = [
  function hook1 (result, args, backend, done) {
    console.log('in hook 1')
    done(null, result)
  },
  function next1 (result, args, backend, done, next) {
    console.log('in next1')
    return next()
  },
  function hook2 (result, args, backend, done) {
    console.log('in hook 2')
    result.hook2 = 'modified'
    done(new Error('error2'))
  },
  function hook3 (result, args, backend, done) {
    console.log('in hook 3')
    done(null, result)
  }
]

handleAfter(context, result, args, backend, hooks, (err, res) => {
  if (err) {
    console.log('ERROR', err)
    process.exit()
  }
  console.log('In done callback')
  console.log(res)
  process.exit()
})

setTimeout(() => {
  console.log('Callback timeout')
  process.exit()
}, 500)