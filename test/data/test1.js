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
    'backend_createPet',
    'backend_readPerson',
    'backend_readPet',
    'backend_updatePerson',
    'backend_updatePet',
    'backend_deletePerson',
    'backend_deletePet',
    'backend_batchCreatePerson',
    'backend_batchCreatePet',
    'backend_batchUpdatePerson',
    'backend_batchUpdatePet',
    'backend_batchDeletePerson',
    'backend_batchDeletePet',
    'backend_subscribePerson',
    'backend_subscribePet',
    'backend_unsubscribePerson',
    'backend_unsubscribePet',
  ],
  compiled: {
    schemas: {
      "All": {
        "query": "backendAllQuery",
        "mutation": "backendAllMutation",
        "subscription": "backendAllSubscription"
      },
      "People": {
        "query": "backendPeopleQuery",
        "mutation": "backendPeopleMutation",
        "subscription": "backendPeopleSubscription"
      },
      "Pets": {
        "query": "backendPetsQuery",
        "mutation": "backendPetsMutation",
        "subscription": "backendPetsSubscription"
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
              "before": {},
              "after": {}
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
              "before": {},
              "after": {}
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
            "address": {
              "type": "backendCreateAddressInput",
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
            },
            "address": {
              "type": "backendUpdateAddressInput"
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
        "backendCreatePetInput": {
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
            "type": {
              "type": "PetTypeEnum",
              "nullable": true
            }
          }
        },
        "backendUpdatePetInput": {
          "type": "Input",
          "fields": {
            "id": {
              "type": "String",
              "nullable": false
            },
            "name": {
              "type": "String"
            },
            "type": {
              "type": "PetTypeEnum"
            }
          }
        },
        "backendDeletePetInput": {
          "type": "Input",
          "fields": {
            "id": {
              "type": "String",
              "nullable": false
            }
          }
        },
        "backendCreateAddressInput": {
          "type": "Input",
          "fields": {
            "street": {
              "type": "String",
              "nullable": true
            },
            "city": {
              "type": "String",
              "nullable": true
            },
            "state": {
              "type": "String",
              "nullable": true
            },
            "zipcode": {
              "type": "Int",
              "nullable": true
            }
          }
        },
        "backendUpdateAddressInput": {
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
              "type": "Person",
              "args": {
                "id": {
                  "type": "String"
                },
                "name": {
                  "type": "String"
                },
                "address": {
                  "type": "backendCreateAddressInput"
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
                },
                "address": {
                  "type": "backendUpdateAddressInput"
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
            },
            "createPet": {
              "type": "Pet",
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
              "type": "Pet",
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
              "type": "Int",
              "args": {
                "id": {
                  "type": "String"
                }
              },
              "resolve": "backend_deletePet"
            },
            "batchCreatePet": {
              "type": [
                "Pet"
              ],
              "args": {
                "batch": {
                  "type": [
                    "backendCreatePetInput"
                  ],
                  "nullable": false
                }
              },
              "resolve": "backend_batchCreatePet"
            },
            "batchUpdatePet": {
              "type": [
                "Pet"
              ],
              "args": {
                "batch": {
                  "type": [
                    "backendUpdatePetInput"
                  ],
                  "nullable": false
                }
              },
              "resolve": "backend_batchUpdatePet"
            },
            "batchDeletePet": {
              "type": "Int",
              "args": {
                "batch": {
                  "type": [
                    "backendDeletePetInput"
                  ],
                  "nullable": false
                }
              },
              "resolve": "backend_batchDeletePet"
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
                "address": {
                  "type": "backendCreateAddressInput"
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
                },
                "address": {
                  "type": "backendUpdateAddressInput"
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
        "backendPetsMutation": {
          "fields": {
            "createPet": {
              "type": "Pet",
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
              "type": "Pet",
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
              "type": "Int",
              "args": {
                "id": {
                  "type": "String"
                }
              },
              "resolve": "backend_deletePet"
            },
            "batchCreatePet": {
              "type": [
                "Pet"
              ],
              "args": {
                "batch": {
                  "type": [
                    "backendCreatePetInput"
                  ],
                  "nullable": false
                }
              },
              "resolve": "backend_batchCreatePet"
            },
            "batchUpdatePet": {
              "type": [
                "Pet"
              ],
              "args": {
                "batch": {
                  "type": [
                    "backendUpdatePetInput"
                  ],
                  "nullable": false
                }
              },
              "resolve": "backend_batchUpdatePet"
            },
            "batchDeletePet": {
              "type": "Int",
              "args": {
                "batch": {
                  "type": [
                    "backendDeletePetInput"
                  ],
                  "nullable": false
                }
              },
              "resolve": "backend_batchDeletePet"
            }
          }
        },
        "backendAllSubscription": {
          "fields": {
            "subscribePerson": {
              "type": [
                "Person"
              ],
              "args": {
                "id": {
                  "type": "String"
                },
                "limit": {
                  "type": "Int"
                },
                "name": {
                  "type": "String"
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
            },
            "subscribePet": {
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
                },
                "limit": {
                  "type": "Int"
                },
                "subscriber": {
                  "type": "String",
                  "nullable": false
                }
              },
              "resolve": "backend_subscribePet"
            },
            "unsubscribePet": {
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
              "resolve": "backend_unsubscribePet"
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
        },
        "backendPetsSubscription": {
          "fields": {
            "subscribePet": {
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
                },
                "limit": {
                  "type": "Int"
                },
                "subscriber": {
                  "type": "String",
                  "nullable": false
                }
              },
              "resolve": "backend_subscribePet"
            },
            "unsubscribePet": {
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
              "resolve": "backend_unsubscribePet"
            }
          }
        }
      }
    }
  }
}