import compileUnitTest from '../compile/compile'

export default function rethinkdbUnitTests () {
  describe('rethinkdb', () => {
    compileUnitTest()
  })
}