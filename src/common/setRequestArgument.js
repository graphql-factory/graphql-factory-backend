import _ from 'lodash'

export default function setRequestArgument (graphql, requestString, argument, value) {
  let request = graphql.parse(requestString)

  _.forEach(request.definitions, (definition) => {

  })
}