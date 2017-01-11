export const seedData = {
  Person: [
    { id: '9ab4d292-222c-433a-8dd0-e20c03d89cec', name: 'John', list: '86924e37-2953-4f5a-abf2-f9e5e615975f' },
    { id: 'c9dc3a54-68f6-42f5-ab26-afe241cf4b4d', name: 'Jane', list: 'c26e4c0e-cb1e-4109-9b3f-383cd987a5f7' }
  ],
  List: [
    { id: '86924e37-2953-4f5a-abf2-f9e5e615975f', name: 'Shopping' },
    { id: 'c26e4c0e-cb1e-4109-9b3f-383cd987a5f7', name: 'Christmas' }
  ],
  Item: [
    { id: '129f7a03-8422-406d-bf8a-2f3b699129f2', name: 'Apple', list: '86924e37-2953-4f5a-abf2-f9e5e615975f', misc: 1 },
    { id: '645d1698-72a6-45e7-87fb-9da222c36bab', name: 'Egg', list: '86924e37-2953-4f5a-abf2-f9e5e615975f', misc: 2 },
    { id: 'b09573ae-70ac-42af-91c0-4f13abe7cd70', name: 'Bread', list: '86924e37-2953-4f5a-abf2-f9e5e615975f', misc: 3 },
    { id: '3da3517b-213f-43d8-b794-5d6928e27edf', name: 'Playstation', list: 'c26e4c0e-cb1e-4109-9b3f-383cd987a5f7', misc: 4 }
  ],
  Compound: [
    { fnameLname: ['Doe', 'John'], fname: 'John', lname: 'Doe', nickname: 'Johnny' },
    { fnameLname: ['Doe', 'Jane'], fname: 'Jane', lname: 'Doe', nickname: 'Janey' }
  ]
}

export const config = {
  options: {},
  types: {
    Host: {
      fields: {
        id: { type: 'String', primary: true },
        host: { type: 'String', uniqueWith: 'hostport' },
        port: { type: 'String', uniqueWith: 'hostport' },
        location: 'String'
      },
      _backend: {
        collection: 'host'
      }
    },
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
        collection: 'item',
        mutation: {
          create: {
            before (source, args, context, info) {
              args.name = `${args.name}${Date.now()}`
            }
          }
        }
      }
    },
    Compound: {
      fields: {
        fname: { type: 'String', primary: true },
        lname: { type: 'String', primary: true },
        nickname: { type: 'String' }
      },
      _backend: {
        collection: 'compound'
      }
    }
  },
  methods: {
    hello: function () {
      console.log(this.type)
    }
  }
}

export default {
  seedData,
  config
}