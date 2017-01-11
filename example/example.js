import _ from 'lodash'
import { GraphQLFactoryRethinkDBBackend } from '../src/index'
import rethinkdbdash from 'rethinkdbdash'
import * as graphql from 'graphql'
import factory from 'graphql-factory'
import { config } from './config/index'

// create backend
let backend = new GraphQLFactoryRethinkDBBackend('List', graphql, factory, rethinkdbdash(), config)

backend.make((err) => {
  if (err) return console.error(err)
  setTimeout(() => {
    console.log(JSON.stringify(backend.lib._definitions.definition.types.backendDeleteCompoundInput, null, '  '))
    // _.forEach(backend.lib._definitions.definition.types, (t, name) => console.log(name, t.fields))
    /*
    _.forEach(backend.lib._definitions.definition.types, (t, name) => {
      _.forEach(t.fields, (f, fname) => {
        _.forEach(f.args, (a, aname) => {
          if (!a.type) console.log({ name, fname, aname })
        })
      })
    })
    */
  }, 500)
  setTimeout(process.exit, 2000)
})

// lib.List('mutation Mutation { deleteItem (id: "965a4c0c-2611-46a1-b57b-bd2cb3626458") }')
//lib.List('mutation Mutation { updateItem (id: "3da3517b-213f-43d8-b794-5d6928e27edf", name: "Coal") { id, name } }')
// lib.List('mutation Mutation { createCompound (fname: "Shooter2", lname: "McGaven", nickname: "douchebag") { fname, lname, nickname } }')
//lib.List('{ readCompound { fname, lname, nickname } }')
// lib.List('{ readPerson (id: "9ab4d292-222c-433a-8dd0-e20c03d89cec") { id, name, list { id, name, items { id, name } } } }')
//lib.List('{ readList {id, name, items { id, name } } }')
//lib.List('mutation Mutation { createItem (name: "test") { id, name } }')
  /*
  .then((results) => {
    console.log(JSON.stringify(results, null, '  '))
    process.exit()
  })
  .catch((err) => {
    throw err
  })
*/

// console.log(backend.lib._definitions.definition.types.ListQuery.fields.readList)

