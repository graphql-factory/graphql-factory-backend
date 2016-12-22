import rethinkdbUnitTest from './rethinkdb/index'

export default function unitTests () {
  describe('Unit Tests', () => {
    rethinkdbUnitTest()
  })
}