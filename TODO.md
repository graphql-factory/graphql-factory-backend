# TODO

Here lies a summary of things that I would like to investigate and/or implement

---

### Testing

* Build advanced compile tests
* Build basic query/mutation tests for standard and batch operations
* Build subscription tests
* build tests for rethinkdb and rethindbdash drivers

---

### Middleware

* introduce an express style middleware for before, after, and error hooks

---

### Logging

* add ability to define log streams and integrate logging more tightly

---

### Cluster

* look into clustering solutions, although this might be better suited in an extended class like yellowjacket

---

### Subscriptions

* Add temporal support to subscribe methods
* Test unsubscribe
* Potentially add @live directive similar to cashay

---

### Potential Backends supported

* mongodb
* knex (tsql)
* probably not any key/value store type databases but requires research to determine
