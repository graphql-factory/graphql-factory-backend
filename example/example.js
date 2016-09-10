import _ from 'lodash'
import { rethinkdb as RethinkDBBackend } from '../src/index'
import rethinkdbdash from 'rethinkdbdash'
import * as graphql from 'graphql'
import factory from 'graphql-factory'
import { config } from './config/index'

// create backend
let backend = RethinkDBBackend('List', graphql, factory, rethinkdbdash(), config)
let lib = backend.lib

// lib.List('mutation Mutation { deleteItem (id: "965a4c0c-2611-46a1-b57b-bd2cb3626458") }')
// lib.List('mutation Mutation { updateItem (id: "965a4c0c-2611-46a1-b57b-bd2cb3626458", name: "item10") { id, name } }')
// lib.List('mutation Mutation { createItem (name: "item10") { id, name } }')

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

