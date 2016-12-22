import _ from 'lodash'

export default {
  definition: {
    types: {
      Person: {
        fields: {
          id: { type: 'String', primary: true },
          name: { type: 'String' },
          ssn: { type: 'String', protect: true }
        },
        _backend: {
          collection: 'person',
          schema: 'People'
        }
      }
    }
  },
  data: {
    Person: [
      { id: 'person1', name: 'Person1', ssn: '555-55-5555' },
      { id: 'person2', name: 'Person2', ssn: '123-45-6789' }
    ]
  },
  functionNames: [
    'backend_createPerson',
    'backend_readPerson',
    'backend_updatePerson',
    'backend_deletePerson'
  ],
  compiled: {
    schemas: {
      "People": {
        "query": "backendPeopleQuery",
        "mutation": "backendPeopleMutation"
      }
    },
    types (types) {
      return {
        "Person": {
          "type": "Object",
          "fields": {
            "id": {
              "type": "String",
              "primary": true
            },
            "name": {
              "type": "String"
            },
            "ssn": {
              "type": "String",
              "protect": true
            }
          },
          "_backend": {
            "collection": "person",
            "schema": "People",
            "computed": {
              "collection": "person",
              "store": "test",
              "schemas": [
                "People"
              ],
              "primary": "id",
              "primaryKey": "id",
              "uniques": [],
              "before": {
                "backend_createPerson": _.get(types, 'Person._backend.computed.before.backend_createPerson'),
                "backend_deletePerson": _.get(types, 'Person._backend.computed.before.backend_deletePerson'),
                "backend_readPerson": _.get(types, 'Person._backend.computed.before.backend_readPerson'),
                "backend_updatePerson": _.get(types, 'Person._backend.computed.before.backend_updatePerson')
              }
            }
          }
        },
        "backendPeopleQuery": {
          "fields": {
            "readPerson": {
              "type": [
                "Person"
              ],
              "args": {
                "limit": {
                  "type": "Int"
                },
                "id": {
                  "type": "String"
                },
                "name": {
                  "type": "String"
                },
                "ssn": {
                  "type": "String"
                }
              },
              "resolve": "backend_readPerson"
            }
          }
        },
        "backendPeopleMutation": {
          "fields": {
            "createPerson": {
              "type": [
                "Person"
              ],
              "args": {
                "id": {
                  "type": "String"
                },
                "name": {
                  "type": "String"
                }
              },
              "resolve": "backend_createPerson"
            },
            "updatePerson": {
              "type": [
                "Person"
              ],
              "args": {
                "id": {
                  "type": "String"
                },
                "name": {
                  "type": "String"
                }
              },
              "resolve": "backend_updatePerson"
            },
            "deletePerson": {
              "type": "Boolean",
              "args": {
                "id": {
                  "type": "String"
                },
                "name": {
                  "type": "String"
                }
              },
              "resolve": "backend_deletePerson"
            }
          }
        }
      }
    }
  }
}