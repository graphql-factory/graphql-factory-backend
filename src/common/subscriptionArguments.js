import _ from 'lodash'

function selectionArguments (selections) {
  let args = {}

  _.forEach(selections, (selection, idx) => {
    let { name, selectionSet } = selection

    let key = _.get(name, 'value', `${idx}`)
    args[key] = {}
    _.forEach(selection.arguments, (arg) => {
      args[key][_.get(arg, 'name.value')] = _.get(arg, 'value.value')
    })

    if (selectionSet) args._subquery = selectionArguments(selectionSet.selections)
  })

  return args
}

export default function subscriptionArguments (graphql, requestString) {
  let args = []
  let Kind = graphql.Kind
  let request = _.isObject(requestString)
    ? { definitions: [requestString] }
    : graphql.parse(requestString)

  _.forEach(request.definitions, (definition, idx) => {
    let { kind, name, operation, selectionSet } = definition

    if (kind === Kind.OPERATION_DEFINITION && operation === 'subscription') {
      args.push({
        name: _.get(name, 'value', `${idx}`),
        argument: selectionArguments(selectionSet.selections)
      })
    }
  })

  return args
}