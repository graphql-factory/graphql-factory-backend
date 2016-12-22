import _ from 'lodash'
import rethinkdbdash from 'rethinkdbdash'
import r from 'rethinkdb'
import test1 from '../../data/test1'
import test2 from '../../data/test2'
import { GraphQLFactoryRethinkDBBackend as Backend } from '../../../index'

export default function compileUnitTest () {
  describe('compile', () => {
    it('Should compile a simple definition', (done) => {
      let backend = new Backend('_rethindbdash', graphql, factory, () => true, _.merge({}, test1.definition, {
        options: {}
      }))
      let { functions, types, schemas } = _.get(backend, 'definition')
      let fnNames = test1.functionNames

      expect(_.intersection(fnNames, _.keys(functions)).length).to.equal(fnNames.length)
      expect(schemas).to.deep.equal(test1.compiled.schemas)
      expect(types).to.deep.equal(test1.compiled.types(types))

      done()
    })

    it('Should exclude protected fields from mutation arguments', (done) => {
      let backend = new Backend('_rethindbdash', graphql, factory, () => true, _.merge({}, test2.definition, {
        options: {}
      }))
      let { functions, types, schemas } = _.get(backend, 'definition')
      let fnNames = test2.functionNames

      expect(_.intersection(fnNames, _.keys(functions)).length).to.equal(fnNames.length)
      expect(schemas).to.deep.equal(test2.compiled.schemas)
      expect(types).to.deep.equal(test2.compiled.types(types))

      done()
    })
  })
}