# graphql-factory-backend

Backend Plugin for graphql-factory

### Overview

`graphql-factory-backend` builds off of the JSON definitions used in `graphql-factory` to dynamically build relationships and handler functions or give complete control to the developer.

### Goal

To provide an extended definition to `graphql-factory` that allows developers to produce APIs faster and across multiple database/storage platforms using a common backend class that can be extended for added functionality

### Notes

Full documentation is available in the [`WIKI`](https://github.com/graphql-factory/graphql-factory-backend/wiki)

This project is still under development and should not be used in production

Currently `RethinkDB` is the only backend database supported. Future plans include `MongoDB` and `knex` compatible databases

### Features

* Relationship aware resolve functions
* Automatic schema definition construction
* Overridable resolve functions
* 

### Example Projects

* [`YellowJacket - Scalable Task Runner`](https://github.com/bhoriuchi/yellowjacket)
* [`S2F - Workflow Engine`](https://github.com/bhoriuchi/s2f)
