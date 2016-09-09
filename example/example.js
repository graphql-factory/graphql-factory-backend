import _ from 'lodash'
import { rethinkdb as RethinkDBBackend } from '../src/index'
import rethinkdbdash from 'rethinkdbdash'
import * as graphql from 'graphql'
import factory from 'graphql-factory'


let config = {
  options: {},
  types: {
    List: {
      fields: {
        id: { type: 'String', primary: true },
        name: { type: 'String'},
        items: ['Item']
      },
      _backend: {
        collection: 'list',
        mutation: {
        },
        query: {
          read: {
            args: {
              id: { type: 'String' }
            }
          }
        }
      }
    },
    Item: {
      fields: {
        id: { type: 'String', primary: true },
        name: 'String'
      },
      _backend: {
        collection: 'item'
      }
    }
  },
  methods: {
    hello: function () {
      console.log(this.type)
    }
  }
}


let backend = RethinkDBBackend('List', graphql, factory, rethinkdbdash(), config)
// console.log(JSON.stringify(_.omit(backend.plugin, 'globals'), null, '  '))
let lib = backend.lib

lib.List('{ readList (id: "728a5bec-a686-4537-9583-44d162eaa845") {id, name} }')
  .then((results) => {
    console.log(JSON.stringify(results, null, '  '))
    process.exit()
  })
  .catch((err) => {
    throw err
  })


// console.log(backend.lib._definitions.definition.types.ListQuery.fields.readList)


// process.exit()