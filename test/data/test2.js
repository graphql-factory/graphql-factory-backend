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
    "backend_readPerson",
    "backend_createPerson",
    "backend_updatePerson",
    "backend_deletePerson",
    "backend_batchCreatePerson",
    "backend_batchUpdatePerson",
    "backend_batchDeletePerson",
    "backend_subscribePerson",
    "backend_unsubscribePerson"
  ],
  compiled: {
    schemas: {
      "People": {
        "query": "backendPeopleQuery",
        "mutation": "backendPeopleMutation",
        "subscription": "backendPeopleSubscription"
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
              "before": {},
              "after": {}
            }
          }
        },
        "GraphQLFactoryUnsubscribeResponse": {
          "type": "Object",
          "fields": {
            "unsubscribed": {
              "type": "Boolean",
              "nullable": false
            }
          }
        },
        "backendCreatePersonInput": {
          "type": "Input",
          "fields": {
            "id": {
              "type": "String",
              "nullable": true
            },
            "name": {
              "type": "String",
              "nullable": true
            },
            "ssn": {
              "type": "String",
              "nullable": true
            }
          }
        },
        "backendUpdatePersonInput": {
          "type": "Input",
          "fields": {
            "id": {
              "type": "String",
              "nullable": false
            },
            "name": {
              "type": "String"
            }
          }
        },
        "backendDeletePersonInput": {
          "type": "Input",
          "fields": {
            "id": {
              "type": "String",
              "nullable": false
            }
          }
        },
        "backendCreateGraphQLFactoryUnsubscribeResponseInput": {
          "type": "Input",
          "fields": {
            "unsubscribed": {
              "type": "Boolean",
              "nullable": false
            }
          }
        },
        "backendUpdateGraphQLFactoryUnsubscribeResponseInput": {
          "type": "Input",
          "fields": {
            "unsubscribed": {
              "type": "Boolean"
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
              "type": "Person",
              "args": {
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
              "resolve": "backend_createPerson"
            },
            "updatePerson": {
              "type": "Person",
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
              "type": "Int",
              "args": {
                "id": {
                  "type": "String"
                }
              },
              "resolve": "backend_deletePerson"
            },
            "batchCreatePerson": {
              "type": [
                "Person"
              ],
              "args": {
                "batch": {
                  "type": [
                    "backendCreatePersonInput"
                  ],
                  "nullable": false
                }
              },
              "resolve": "backend_batchCreatePerson"
            },
            "batchUpdatePerson": {
              "type": [
                "Person"
              ],
              "args": {
                "batch": {
                  "type": [
                    "backendUpdatePersonInput"
                  ],
                  "nullable": false
                }
              },
              "resolve": "backend_batchUpdatePerson"
            },
            "batchDeletePerson": {
              "type": "Int",
              "args": {
                "batch": {
                  "type": [
                    "backendDeletePersonInput"
                  ],
                  "nullable": false
                }
              },
              "resolve": "backend_batchDeletePerson"
            }
          }
        },
        "backendPeopleSubscription": {
          "fields": {
            "subscribePerson": {
              "type": [
                "Person"
              ],
              "args": {
                "id": {
                  "type": "String"
                },
                "name": {
                  "type": "String"
                },
                "ssn": {
                  "type": "String"
                },
                "limit": {
                  "type": "Int"
                },
                "subscriber": {
                  "type": "String",
                  "nullable": false
                }
              },
              "resolve": "backend_subscribePerson"
            },
            "unsubscribePerson": {
              "type": "GraphQLFactoryUnsubscribeResponse",
              "args": {
                "subscription": {
                  "type": "String",
                  "nullable": false
                },
                "subscriber": {
                  "type": "String",
                  "nullable": false
                }
              },
              "resolve": "backend_unsubscribePerson"
            }
          }
        }
      }
    }
  }
}