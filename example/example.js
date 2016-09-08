import { rethinkdb as RethinkDBBackend } from '../src/rethinkdb'
import rethinkdbdash from 'rethinkdbdash'
import * as graphql from 'graphql'

let config = {
  options: {},
  types: {
    List: {
      table: 'list',
      definition: {
        fields: {
          id: 'String',
          name: 'String'
        }
      },
      mutation: {
        create: {
          unique: ['name']
        }
      },
      query: {

      }
    }
  }
}


let backend = RethinkDBBackend('List', rethinkdbdash(), graphql, config)