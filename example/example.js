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
//lib.List('mutation Mutation { updateItem (id: "3da3517b-213f-43d8-b794-5d6928e27edf", name: "Coal") { id, name } }')
// lib.List('mutation Mutation { createCompound (fname: "Shooter2", lname: "McGaven", nickname: "douchebag") { fname, lname, nickname } }')
//lib.List('{ readCompound { fname, lname, nickname } }')
lib.List('{ readPerson (id: "9ab4d292-222c-433a-8dd0-e20c03d89cec") { id, name, list { id, name, items { id, name } } } }')
//lib.List('{ readList {id, name, items { id, name } } }')
//lib.List('mutation Mutation { createItem (name: "test") { id, name } }')
  .then((results) => {
    console.log(JSON.stringify(results, null, '  '))
    process.exit()
  })
  .catch((err) => {
    throw err
  })


// console.log(backend.lib._definitions.definition.types.ListQuery.fields.readList)

