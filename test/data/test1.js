import _ from 'lodash'

export default {
  definition: {
    types: {
      Person: {
        fields: {
          id: { type: 'String', primary: true },
          name: { type: 'String' },
          address: { type: 'Address' }
        },
        _backend: {
          collection: 'person',
          schema: ['All', 'People']
        }
      },
      Pet: {
        fields: {
          id: { type: 'String', primary: true },
          name: { type: 'String' },
          type: { type: 'PetTypeEnum' }
        },
        _backend: {
          collection: 'pet',
          schema: ['All', 'Pets']
        }
      },
      Address: {
        type: ['Object', 'Input'],
        fields: {
          street: 'String',
          city: 'String',
          state: 'String',
          zipcode: 'Int'
        }
      },
      PetTypeEnum: {
        type: 'Enum',
        values: {
          DOG: 'DOG',
          CAT: 'CAT',
          SNAKE: 'SNAKE',
          HAMSTER: 'HAMSTER',
          LIZZARD: 'LIZZARD',
          GOLDFISH: 'GOLDFISH'
        }
      }
    }
  },
  data: {
    Person: [
      { id: 'person1', name: 'Person1' },
      { id: 'person2', name: 'Person2' }
    ],
    Pet: [
      { id: 'pet1', name: 'Pet1', type: 'DOG' },
      { id: 'pet2', name: 'Pet2', type: 'CAT' },
      { id: 'pet3', name: 'Pet3', type: 'HAMSTER' },
      { id: 'pet4', name: 'Pet4', type: 'DOG' }
    ]
  },
  functionNames: [
    'backend_createPerson',
    'backend_readPerson',
    'backend_updatePerson',
    'backend_deletePerson',
    'backend_createPet',
    'backend_readPet',
    'backend_updatePet',
    'backend_deletePet'
  ],
  compiled: {
    schemas: {
      "All": {
        "query": "backendAllQuery",
        "mutation": "backendAllMutation"
      },
      "People": {
        "query": "backendPeopleQuery",
        "mutation": "backendPeopleMutation"
      },
      "Pets": {
        "query": "backendPetsQuery",
        "mutation": "backendPetsMutation"
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
            "address": {
              "type": "Address"
            }
          },
          "_backend": {
            "collection": "person",
            "schema": [
              "All",
              "People"
            ],
            "computed": {
              "collection": "person",
              "store": "test",
              "schemas": [
                "All",
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
        "Pet": {
          "type": "Object",
          "fields": {
            "id": {
              "type": "String",
              "primary": true
            },
            "name": {
              "type": "String"
            },
            "type": {
              "type": "PetTypeEnum"
            }
          },
          "_backend": {
            "collection": "pet",
            "schema": [
              "All",
              "Pets"
            ],
            "computed": {
              "collection": "pet",
              "store": "test",
              "schemas": [
                "All",
                "Pets"
              ],
              "primary": "id",
              "primaryKey": "id",
              "uniques": [],
              "before": {
                "backend_createPet": _.get(types, 'Pet._backend.computed.before.backend_createPet'),
                "backend_deletePet": _.get(types, 'Pet._backend.computed.before.backend_deletePet'),
                "backend_readPet": _.get(types, 'Pet._backend.computed.before.backend_readPet'),
                "backend_updatePet": _.get(types, 'Pet._backend.computed.before.backend_updatePet')
              }
            }
          }
        },
        "Address": {
          "type": "Object",
          "fields": {
            "street": {
              "type": "String"
            },
            "city": {
              "type": "String"
            },
            "state": {
              "type": "String"
            },
            "zipcode": {
              "type": "Int"
            }
          }
        },
        "AddressInput": {
          "type": "Input",
          "fields": {
            "street": {
              "type": "String"
            },
            "city": {
              "type": "String"
            },
            "state": {
              "type": "String"
            },
            "zipcode": {
              "type": "Int"
            }
          }
        },
        "PetTypeEnum": {
          "type": "Enum",
          "values": {
            "DOG": {
              "value": "DOG"
            },
            "CAT": {
              "value": "CAT"
            },
            "SNAKE": {
              "value": "SNAKE"
            },
            "HAMSTER": {
              "value": "HAMSTER"
            },
            "LIZZARD": {
              "value": "LIZZARD"
            },
            "GOLDFISH": {
              "value": "GOLDFISH"
            }
          }
        },
        "backendAllQuery": {
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
                "address": {
                  "type": "Address"
                }
              },
              "resolve": "backend_readPerson"
            },
            "readPet": {
              "type": [
                "Pet"
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
                "type": {
                  "type": "PetTypeEnum"
                }
              },
              "resolve": "backend_readPet"
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
                "address": {
                  "type": "Address"
                }
              },
              "resolve": "backend_readPerson"
            }
          }
        },
        "backendPetsQuery": {
          "fields": {
            "readPet": {
              "type": [
                "Pet"
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
                "type": {
                  "type": "PetTypeEnum"
                }
              },
              "resolve": "backend_readPet"
            }
          }
        },
        "backendAllMutation": {
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
                },
                "address": {
                  "type": "AddressInput"
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
                },
                "address": {
                  "type": "AddressInput"
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
                },
                "address": {
                  "type": "AddressInput"
                }
              },
              "resolve": "backend_deletePerson"
            },
            "createPet": {
              "type": [
                "Pet"
              ],
              "args": {
                "id": {
                  "type": "String"
                },
                "name": {
                  "type": "String"
                },
                "type": {
                  "type": "PetTypeEnum"
                }
              },
              "resolve": "backend_createPet"
            },
            "updatePet": {
              "type": [
                "Pet"
              ],
              "args": {
                "id": {
                  "type": "String"
                },
                "name": {
                  "type": "String"
                },
                "type": {
                  "type": "PetTypeEnum"
                }
              },
              "resolve": "backend_updatePet"
            },
            "deletePet": {
              "type": "Boolean",
              "args": {
                "id": {
                  "type": "String"
                },
                "name": {
                  "type": "String"
                },
                "type": {
                  "type": "PetTypeEnum"
                }
              },
              "resolve": "backend_deletePet"
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
                },
                "address": {
                  "type": "AddressInput"
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
                },
                "address": {
                  "type": "AddressInput"
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
                },
                "address": {
                  "type": "AddressInput"
                }
              },
              "resolve": "backend_deletePerson"
            }
          }
        },
        "backendPetsMutation": {
          "fields": {
            "createPet": {
              "type": [
                "Pet"
              ],
              "args": {
                "id": {
                  "type": "String"
                },
                "name": {
                  "type": "String"
                },
                "type": {
                  "type": "PetTypeEnum"
                }
              },
              "resolve": "backend_createPet"
            },
            "updatePet": {
              "type": [
                "Pet"
              ],
              "args": {
                "id": {
                  "type": "String"
                },
                "name": {
                  "type": "String"
                },
                "type": {
                  "type": "PetTypeEnum"
                }
              },
              "resolve": "backend_updatePet"
            },
            "deletePet": {
              "type": "Boolean",
              "args": {
                "id": {
                  "type": "String"
                },
                "name": {
                  "type": "String"
                },
                "type": {
                  "type": "PetTypeEnum"
                }
              },
              "resolve": "backend_deletePet"
            }
          }
        }
      }
    }
  }
}