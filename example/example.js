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
        name: { type: 'String', unique: true, ex: { args: {} } }
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

console.log(backend.lib._definitions.functions)


process.exit()