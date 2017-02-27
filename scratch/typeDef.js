export default {
  fields: {
    id: {
      type: 'String',
      primary: true
    },
    name: {
      type: 'String',
      nullable: false
    },
    email: {
      type: 'String'
    }
  },
  _backend: {
    query: {
      readPerson: {
        type: 'Person',
        args: {},
        resolve () {
        }
      },
      listPerson: {
        resolve: {
          type: 'list',
          before () {

          },
          after () {

          },
          error () {
            
          }
        }

      }
    },
    mutation: {

    },
    subscription: {

    }
  }
}