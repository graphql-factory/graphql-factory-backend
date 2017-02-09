function identity(value) {
  return value
}

function parseLiteral (ast) {
  let boundParseLiteral = parseLiteral.bind(this)
  let { Kind } = this.graphql
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value
    case Kind.INT:
    case Kind.FLOAT:
      return parseFloat(ast.value)
    case Kind.OBJECT: {
      const value = Object.create(null)
      ast.fields.forEach(field => {
        value[field.name.value] = boundParseLiteral(field.value)
      })
      return value
    }
    case Kind.LIST:
      return ast.values.map(boundParseLiteral)
    default:
      return null
  }
}

export default {
  type: 'Scalar',
  name: 'GraphQLFactoryJSON',
  description: 'The `JSON` scalar type represents JSON values as specified by ' +
  '[ECMA-404](http://www.ecma-international.org/ publications/files/ECMA-ST/ECMA-404.pdf).',
  serialize: identity,
  parseValue: identity,
  parseLiteral
}