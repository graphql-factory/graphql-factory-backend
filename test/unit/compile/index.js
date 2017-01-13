import basic from '../compile/basic'

export default function rethinkdbUnitTests () {
  describe('Compile Tests', () => {
    basic()
  })
}