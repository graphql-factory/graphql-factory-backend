import _ from 'lodash'
import { rethinkdb as RethinkDBBackend } from '../src/index'
import rethinkdbdash from 'rethinkdbdash'
import * as graphql from 'graphql'
import factory from 'graphql-factory'


let config = {
  options: {},
  types: {
    Person: {
      fields: {
        id: { type: 'String', primary: true },
        name: 'String',
        list: { type: 'List', has: 'id' }
      },
      _backend: {
        collection: 'person'
      }
    },
    List: {
      fields: {
        id: { type: 'String', primary: true },
        name: { type: 'String'},
        items: { type: ['Item'] }
      },
      _backend: {
        collection: 'list',
        mutation: {
        },
        query: {
        }
      }
    },
    Item: {
      fields: {
        id: { type: 'String', primary: true },
        name: 'String',
        list: { type: 'String', belongsTo: { List: { items: 'id' } } }
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

lib.List('{ readPerson { id, name, list { id, name, items { id, name } } } }')
// lib.List('{ readList {id, name, items { id, name } } }')
  .then((results) => {
    console.log(JSON.stringify(results, null, '  '))
    process.exit()
  })
  .catch((err) => {
    throw err
  })


// console.log(backend.lib._definitions.definition.types.ListQuery.fields.readList)


// process.exit()