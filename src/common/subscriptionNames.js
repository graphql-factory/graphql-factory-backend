import _ from 'lodash'

export default function subscriptionNames (graphql, requestString) {
  let names = []
  let Kind = graphql.Kind
  let request = graphql.parse(requestString)

  _.forEach(request.definitions, (definition, idx) => {
    let { kind, name, operation } = definition

    if (kind === Kind.OPERATION_DEFINITION && operation === 'subscription') {
      names.push(_.get(name, 'value', `${idx}`))
    }
  })

  return names
}