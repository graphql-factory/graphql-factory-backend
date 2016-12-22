import _ from 'lodash'
import rethinkdbdash from 'rethinkdbdash'
import r from 'rethinkdb'
import test1 from '../../data/test1'
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
  })
}