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
        name: { type: 'String' },
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
        name: { type: 'String', unique: true },
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

let seedData = {
  Person: [
    { id: '9ab4d292-222c-433a-8dd0-e20c03d89cec', name: 'John', list: '86924e37-2953-4f5a-abf2-f9e5e615975f' },
    { id: 'c9dc3a54-68f6-42f5-ab26-afe241cf4b4d', name: 'Jane', list: 'c26e4c0e-cb1e-4109-9b3f-383cd987a5f7' }
  ],
  List: [
    { id: '86924e37-2953-4f5a-abf2-f9e5e615975f', name: 'Shopping' },
    { id: 'c26e4c0e-cb1e-4109-9b3f-383cd987a5f7', name: 'Christmas' }
  ],
  Item: [
    { id: '129f7a03-8422-406d-bf8a-2f3b699129f2', name: 'Apple', list: '86924e37-2953-4f5a-abf2-f9e5e615975f' },
    { id: '645d1698-72a6-45e7-87fb-9da222c36bab', name: 'Egg', list: '86924e37-2953-4f5a-abf2-f9e5e615975f' },
    { id: 'b09573ae-70ac-42af-91c0-4f13abe7cd70', name: 'Bread', list: '86924e37-2953-4f5a-abf2-f9e5e615975f' },
    { id: '3da3517b-213f-43d8-b794-5d6928e27edf', name: 'Playstation', list: 'c26e4c0e-cb1e-4109-9b3f-383cd987a5f7' }
  ]
}


let backend = RethinkDBBackend('List', graphql, factory, rethinkdbdash(), config)
// console.log(JSON.stringify(_.omit(backend.plugin, 'globals'), null, '  '))
let lib = backend.lib

/*
backend.initAllStores(true, seedData).then((res) => {
  console.log(res)
  process.exit()
})
*/


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

