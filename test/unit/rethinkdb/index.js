import compileUnitTest from './compile'

export default function rethinkdbUnitTests () {
  describe('rethinkdb', () => {
    compileUnitTest()
  })
}