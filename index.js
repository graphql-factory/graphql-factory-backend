'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _ = _interopDefault(require('lodash'));

// primitive graphql types
var PRIMITIVES = ['String', 'Int', 'Float', 'Boolean', 'ID'];

function defaultBefore() {
  return Promise.resolve();
}

function isPrimitive(type) {
  if (_.isArray(type)) {
    if (type.length !== 1) return false;
    type = type[0];
  }
  return _.includes(PRIMITIVES, type);
}

function getType(fieldDef) {
  if (_.isArray(fieldDef) && fieldDef.length === 1 || _.isString(fieldDef)) return fieldDef;else if (_.has(fieldDef, 'type')) return fieldDef.type;
}

function makeFieldDef(fieldDef) {
  var newDef = _.merge({}, _.isObject(fieldDef) ? fieldDef : {});
  var type = getType(fieldDef);
  if (type) newDef.type = type;
  return newDef;
}

function getArgs(opType, definition, cfg, name) {
  var args = {};
  var fields = definition.fields;


  if (opType === 'query') {
    args.limit = { type: 'Int' };
  }

  // examine each field
  _.forEach(fields, function (fieldDef, fieldName) {
    var type = getType(fieldDef);
    if (!type) return true;
    fieldDef = fields[fieldName] = makeFieldDef(fieldDef);

    if (isPrimitive(type)) {
      args[fieldName] = { type: type };
    } else if (fieldDef.resolve !== false && opType === 'query') {
      fieldDef.resolve = fieldDef.resolve || 'read' + type;
    }
  });
  return args;
}

// updates definitions with relationship data
function makeRelations() {
  var _this = this;

  _.forEach(this._types, function (definition, name) {
    var fields = definition.fields;
    var _backend = definition._backend;

    // examine each field

    _.forEach(fields, function (fieldDef, fieldName) {
      var type = getType(fieldDef);
      var typeName = _.isArray(type) ? type[0] : type;
      if (!type) return true;
      fieldDef = fields[fieldName] = makeFieldDef(fieldDef);
      var _fieldDef = fieldDef;
      var belongsTo = _fieldDef.belongsTo;
      var has = _fieldDef.has;

      // add belongsTo relationship to the current type

      if (belongsTo) {
        _.forEach(belongsTo, function (bCfg, bType) {
          _.forEach(bCfg, function (bKey, bField) {
            var foreignFieldDef = _.get(_this._types, '["' + bType + '"].fields["' + bField + '"]');
            _.set(_backend, 'computed.relations.belongsTo["' + bType + '"]["' + bField + '"]', {
              primary: fieldName,
              foreign: bKey,
              many: _.isArray(getType(foreignFieldDef))
            });
          });
        });
      }

      // add a has relationship to the nested type. this is because the nested types resolve
      // will determine how it returns data
      if (has) {
        _.set(_this._types, '["' + typeName + '"]._backend.computed.relations.has["' + name + '"]["' + fieldName + '"]', {
          foreign: has,
          many: _.isArray(type)
        });
      }
    });
  });
}

function make() {
  var _this2 = this;

  // analyze each type and construct graphql schemas
  _.forEach(this._types, function (definition, tname) {
    var fields = definition.fields;
    var _backend = definition._backend;

    // verify that the type at least has fields

    if (!_.isObject(fields)) return true;
    _this2._definition.types[tname] = definition;

    // check for a backend object config, if one doesnt exist this type is done
    if (!_.isObject(_backend)) return true;

    // get deconstruct the backend config
    var schema = _backend.schema;
    var table = _backend.table;
    var collection = _backend.collection;
    var store = _backend.store;
    var db = _backend.db;
    var mutation = _backend.mutation;
    var query = _backend.query;

    // allow the collection to be specified as the collection or table field

    collection = '' + _this2._prefix + (collection || table);
    store = store || db || _this2.defaultStore;

    // check that the type has a schema identified, otherwise create a schema with the namespace
    var schemaName = _.isString(schema) ? schema : _this2.namespace;
    var queryName = schemaName + 'Query';
    var mutationName = schemaName + 'Mutation';

    // get the primary key name
    var primary = _this2.getPrimary(fields);
    var primaryKey = _backend.primaryKey || _.isArray(primary) ? _.camelCase(primary.join('-')) : primary;

    // update the backend
    _backend.computed = {
      primary: primary,
      primaryKey: primaryKey,
      schemaName: schemaName,
      queryName: queryName,
      mutationName: mutationName,
      collection: collection,
      store: store,
      before: {}
    };

    // add to the queries
    if (query !== false && collection) {
      _.set(_this2._definition.schemas, schemaName + '.query', queryName);
      query = _.isObject(query) ? query : {};

      if (!query.read && query.read !== false) query.read = true;

      // add each query method
      _.forEach(query, function (q, qname) {
        var queryFieldName = qname === 'read' ? '' + qname + tname : qname;

        _.set(_this2._definition.types, queryName + '.fields.' + queryFieldName, {
          type: q.type || [tname],
          args: q.args || getArgs.call(_this2, 'query', definition, q, qname),
          resolve: '' + queryFieldName
        });

        if (q === true || !_.has(q, 'resolve')) {
          _.set(_this2._definition, 'functions.' + queryFieldName, _this2._read(tname));
        } else if (_.isFunction(_.get(q, 'resolve'))) {
          _.set(_this2._definition, 'functions.' + queryFieldName, q.resolve);
        }

        // check for before stub
        var before = _.isFunction(q.before) ? q.before.bind(_this2) : defaultBefore;
        _.set(_backend, 'computed.before["' + queryFieldName + '"]', before);
      });
    }

    // add to the mutations
    if (mutation !== false && collection) {
      _.set(_this2._definition.schemas, schemaName + '.mutation', mutationName);
      mutation = _.isObject(mutation) ? mutation : {};
      if (!mutation.create && mutation.create !== false) mutation.create = true;
      if (!mutation.update && mutation.update !== false) mutation.update = true;
      if (!mutation.delete && mutation.delete !== false) mutation.delete = true;

      // add each mutation method
      _.forEach(mutation, function (m, mname) {
        var mutationFieldName = _.includes(['create', 'update', 'delete'], mname) ? '' + mname + tname : mname;

        _.set(_this2._definition.types, mutationName + '.fields.' + mutationFieldName, {
          type: m.type || mname === 'delete' ? 'Boolean' : tname,
          args: m.args || getArgs.call(_this2, 'mutation', definition, m, mname),
          resolve: '' + mutationFieldName
        });

        // check for mutation resolve
        if (m === true || !_.has(m, 'resolve')) {
          _.set(_this2._definition, 'functions.' + mutationFieldName, _this2['_' + mname](tname));
        } else if (_.isFunction(_.get(m, 'resolve'))) {
          _.set(_this2._definition, 'functions.' + mutationFieldName, m.resolve);
        }

        // check for before stub
        var before = _.isFunction(m.before) ? m.before.bind(_this2) : defaultBefore;
        _.set(_backend, 'computed.before["' + mutationFieldName + '"]', before);
      });
    }
  });

  // update the definitions with relations
  makeRelations.call(this);
}

function isPromise(obj) {
  return _.isFunction(_.get(obj, 'then')) && _.isFunction(_.get(obj, 'catch'));
}

function createPromiseMap(list, values) {
  return _.map(list, function (value, key) {
    if (isPromise(value)) return value.then(function (result) {
      return values[key] = result;
    });else return Promise.resolve(value).then(function (result) {
      return values[key] = result;
    });
  });
}

function promiseMap(list) {
  var map = [];
  return Promise.all(createPromiseMap(list, map)).then(function () {
    return map;
  });
}

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
};

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var defineProperty = function (obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
};

var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};

var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

// base class for factory backend, all backends should extend this class

var GraphQLFactoryBaseBackend = function () {
  function GraphQLFactoryBaseBackend(namespace, graphql, factory) {
    var _this = this,
        _arguments = arguments;

    var config = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];
    var crud = arguments.length <= 4 || arguments[4] === undefined ? {} : arguments[4];
    classCallCheck(this, GraphQLFactoryBaseBackend);

    this.type = 'GraphQLFactoryBaseBackend';

    // check for namespace, graphql
    if (!_.isString(namespace)) throw new Error('a namespace is required');
    if (!graphql) throw new Error('an instance of graphql is required');
    if (!factory) throw new Error('an instance of graphql-factory is required');
    if (!_.isObject(config.types)) throw new Error('no types were found in the configuration');
    if (!crud.create || !crud.read || !crud.update || !crud.delete) throw new Error('missing CRUD operation');

    // get any plugins, the backend will be merged into these plugins before it is exported
    var _plugin = _.get(config, 'plugin', []);

    // get collection prefix
    this._prefix = _.get(config, 'options.prefix', '');

    // set crud methods
    this._create = crud.create.bind(this);
    this._read = crud.read.bind(this);
    this._update = crud.update.bind(this);
    this._delete = crud.delete.bind(this);
    this.initStore = crud.initStore.bind(this);
    this.filter = crud.filter;
    this.util = crud.util(this);

    // check the config object
    this._plugin = _.isArray(_plugin) ? _plugin : [_plugin];
    this._types = config.types;

    // set mandatory properties
    this.options = _.get(config, 'options', {});
    this.namespace = namespace;
    this.graphql = graphql;
    this.factory = factory(this.graphql);
    this.defaultStore = 'test';

    // tools
    this.util.isPromise = isPromise;

    // factory properties
    this._definition = {
      globals: defineProperty({}, namespace, { config: config }),
      types: {},
      schemas: {},
      fields: {},
      functions: {},
      externalTypes: {}
    };

    // make graphql-factory definitions
    make.call(this);

    // add methods if they do not conflict with existing properties
    _.forEach(config.methods, function (method, name) {
      if (!_.has(_this, name) && _.isFunction(method)) _this[name] = function () {
        return method.apply(_this, _arguments);
      };
    });
  }

  // returns a graphql-factory plugin


  createClass(GraphQLFactoryBaseBackend, [{
    key: 'getPrimary',


    // get the primary key or keys
    value: function getPrimary(fields) {
      var primary = _(fields).pickBy(function (v) {
        return v.primary === true;
      }).keys().value();
      return !primary.length ? 'id' : primary.length === 1 ? primary[0] : primary.sort();
    }

    // get keys marked with unique

  }, {
    key: 'getUnique',
    value: function getUnique(fields, args) {
      return _.without(_.map(_.pickBy(fields, function (v) {
        return v.unique === true;
      }), function (v, field) {
        var value = _.get(args, field);
        if (value === undefined) return;
        return {
          field: field,
          type: _.isArray(v.type) ? _.get(v, 'type[0]', 'Undefined') : _.get(v, 'type', 'Undefined'),
          value: value
        };
      }), undefined);
    }

    // determine if the resolve is nested

  }, {
    key: 'isNested',
    value: function isNested(info) {
      return _.get(info, 'path', []).length > 1;
    }

    // get parent type

  }, {
    key: 'getParentType',
    value: function getParentType(info) {
      return _.get(info, 'parentType');
    }

    // current path

  }, {
    key: 'getCurrentPath',
    value: function getCurrentPath(info) {
      return _.last(_.get(info, 'path'));
    }

    // get type definition

  }, {
    key: 'getTypeDefinition',
    value: function getTypeDefinition(type) {
      return _.get(this._types, type, {});
    }

    // get type backend

  }, {
    key: 'getTypeBackend',
    value: function getTypeBackend(type) {
      return _.get(this.getTypeDefinition(type), '_backend');
    }

    // get type fields

  }, {
    key: 'getTypeFields',
    value: function getTypeFields(type) {
      return _.get(this.getTypeDefinition(type), 'fields');
    }

    // get computed

  }, {
    key: 'getTypeComputed',
    value: function getTypeComputed(type) {
      return _.get(this.getTypeDefinition(type), '_backend.computed');
    }

    // get relations

  }, {
    key: 'getRelations',
    value: function getRelations(type, info) {
      var _backend = this.getTypeBackend(type);
      var parentType = this.getParentType(info);
      var cpath = this.getCurrentPath(info);
      var belongsTo = _.get(_backend, 'computed.relations.belongsTo["' + parentType.name + '"]["' + cpath + '"]', {});
      var has = _.get(_backend, 'computed.relations.has["' + parentType.name + '"]["' + cpath + '"]', {});
      return { has: has, belongsTo: belongsTo };
    }

    // get type info

  }, {
    key: 'getTypeInfo',
    value: function getTypeInfo(type, info) {
      var _getTypeDefinition = this.getTypeDefinition(type);

      var _backend = _getTypeDefinition._backend;
      var fields = _getTypeDefinition.fields;
      var _backend$computed = _backend.computed;
      var primary = _backend$computed.primary;
      var primaryKey = _backend$computed.primaryKey;
      var collection = _backend$computed.collection;
      var store = _backend$computed.store;
      var before = _backend$computed.before;

      var nested = this.isNested(info);
      var currentPath = this.getCurrentPath(info);

      var _getRelations = this.getRelations(type, info);

      var belongsTo = _getRelations.belongsTo;
      var has = _getRelations.has;

      return {
        _backend: _backend,
        before: before,
        collection: collection,
        store: store,
        fields: fields,
        primary: primary,
        primaryKey: primaryKey,
        nested: nested,
        currentPath: currentPath,
        belongsTo: belongsTo,
        has: has
      };
    }

    // get primary args as a single value

  }, {
    key: 'getPrimaryFromArgs',
    value: function getPrimaryFromArgs(type, args) {
      var _getTypeComputed = this.getTypeComputed(type);

      var primary = _getTypeComputed.primary;

      var pk = _.map(primary, function (k) {
        return _.get(args, k);
      });
      return pk.length === 1 ? pk[0] : pk;
    }

    // update the args with potential compound primary

  }, {
    key: 'updateArgsWithPrimary',
    value: function updateArgsWithPrimary(type, args) {
      var newArgs = _.cloneDeep(args);

      var _getTypeComputed2 = this.getTypeComputed(type);

      var primary = _getTypeComputed2.primary;
      var primaryKey = _getTypeComputed2.primaryKey;

      var pk = this.getPrimaryFromArgs(type, args);
      if (primary.length > 1 && _.without(pk, undefined).length === primary.length) {
        newArgs = _.merge(newArgs, defineProperty({}, primaryKey, pk));
      }
      return newArgs;
    }

    // maps promise results

  }, {
    key: 'mapPromise',
    value: function mapPromise(list) {
      return promiseMap(list);
    }

    // init all stores

  }, {
    key: 'initAllStores',
    value: function initAllStores(rebuild, seedData) {
      var _this2 = this;

      if (!_.isBoolean(rebuild)) {
        seedData = _.isObject(rebuild) ? rebuild : {};
        rebuild = false;
      }

      // only init definitions with a collection and store specified
      var canInit = function canInit() {
        return _.pickBy(_this2._types, function (t) {
          return _.has(t, '_backend.computed.collection') && _.has(t, '_backend.computed.store');
        });
      };

      var ops = _.map(canInit(), function (t, type) {
        var data = _.get(seedData, type, []);
        return _this2.initStore(type, rebuild, _.isArray(data) ? data : []);
      });

      return promiseMap(ops);
    }

    // returns a lib object lazily, make it only once

  }, {
    key: 'plugin',
    get: function get() {
      var _plugin = {};
      var obj = {};

      // merge all plugins

      _.forEach(this._plugin, function (p) {
        return _.merge(_plugin, p);
      });

      // create current backend plugin
      _.forEach(this._definition, function (def, field) {
        if (_.keys(def).length) {
          if (field === 'types') obj[field] = _.mapValues(def, function (v) {
            return _.omit(v, '_backend');
          });else obj[field] = def;
        }
      });

      // return a merged backend and plugin
      return _.merge(_plugin, obj);
    }
  }, {
    key: 'lib',
    get: function get() {
      if (!this._lib) this._lib = this.factory.make(this.plugin);
      return this._lib;
    }
  }]);
  return GraphQLFactoryBaseBackend;
}();

function create() {
  return function () {};
}

function read() {
  return function () {};
}

function update() {
  return function () {};
}

function del() {
  return function () {};
}

var crud = { create: create, read: read, update: update, delete: del };

// extended backend class for RethinkDB

var GraphQLFactoryKnexBackend = function (_GraphQLFactoryBaseBa) {
  inherits(GraphQLFactoryKnexBackend, _GraphQLFactoryBaseBa);

  function GraphQLFactoryKnexBackend(namespace, graphql, factory, knex, config) {
    classCallCheck(this, GraphQLFactoryKnexBackend);

    var _this = possibleConstructorReturn(this, (GraphQLFactoryKnexBackend.__proto__ || Object.getPrototypeOf(GraphQLFactoryKnexBackend)).call(this, namespace, graphql, factory, config, crud));

    _this.type = 'GraphQLFactoryKnexBackend';

    // check for a top-level rethinkdb namespace
    if (!knex) throw new Error('an instance of knex is required');

    // store database objects
    _this.knex = knex;

    // add values to the globals namespace
    _.merge(_this._definition.globals, defineProperty({}, namespace, { knex: knex }));
    return _this;
  }

  return GraphQLFactoryKnexBackend;
}(GraphQLFactoryBaseBackend);

// helper function to instantiate a new backend


function knex (namespace, graphql, factory, knex, config) {
  return new GraphQLFactoryKnexBackend(namespace, graphql, factory, knex, config);
}

function create$1() {
  return function () {};
}

function read$1() {
  return function () {};
}

function update$1() {
  return function () {};
}

function del$1() {
  return function () {};
}

var crud$1 = { create: create$1, read: read$1, update: update$1, delete: del$1 };

// extended backend class for RethinkDB

var GraphQLFactoryMongoDBBackend = function (_GraphQLFactoryBaseBa) {
  inherits(GraphQLFactoryMongoDBBackend, _GraphQLFactoryBaseBa);

  function GraphQLFactoryMongoDBBackend(namespace, graphql, factory, db, config, connection) {
    classCallCheck(this, GraphQLFactoryMongoDBBackend);

    var _this = possibleConstructorReturn(this, (GraphQLFactoryMongoDBBackend.__proto__ || Object.getPrototypeOf(GraphQLFactoryMongoDBBackend)).call(this, namespace, graphql, factory, config, crud$1));

    _this.type = 'GraphQLFactoryMongoDBBackend';

    // check for a top-level rethinkdb namespace
    if (!db) throw new Error('a MongoDB connection is required');

    // store database objects
    _this.db = db;

    // add values to the globals namespace
    _.merge(_this._definition.globals, defineProperty({}, namespace, { db: db }));
    return _this;
  }

  return GraphQLFactoryMongoDBBackend;
}(GraphQLFactoryBaseBackend);

// helper function to instantiate a new backend


function mongodb (namespace, graphql, factory, db, config, connection) {
  return new GraphQLFactoryMongoDBBackend(namespace, graphql, factory, db, config, connection);
}

function create$2(type) {
  var backend = this;
  return function (source, args, context, info) {
    var r = backend.r;
    var connection = backend.connection;

    var _backend$getTypeInfo = backend.getTypeInfo(type, info);

    var collection = _backend$getTypeInfo.collection;
    var store = _backend$getTypeInfo.store;
    var before = _backend$getTypeInfo.before;

    var table = r.db(store).table(collection);
    var beforeHook = _.get(before, 'create' + type);

    // main query
    var query = function query() {
      var filter = backend.filter.violatesUnique(type, backend, args, table).branch(r.error('unique field violation'), table.insert(backend.updateArgsWithPrimary(type, args), { returnChanges: true })('changes').do(function (changes) {
        return changes.count().eq(0).branch(r.error('unable to create, possible primary key violation'), changes.nth(0)('new_val'));
      }));

      // do the update
      return filter.run(connection);
    };

    // run before stub
    var resolveBefore = beforeHook(source, args, context, info);
    if (backend.util.isPromise(resolveBefore)) return resolveBefore.then(query);
    return query();
  };
}

function read$2(type) {
  var backend = this;
  return function (source, args, context, info) {
    var r = backend.r;
    var connection = backend.connection;

    var _backend$getTypeInfo = backend.getTypeInfo(type, info);

    var collection = _backend$getTypeInfo.collection;
    var store = _backend$getTypeInfo.store;
    var before = _backend$getTypeInfo.before;

    var table = r.db(store).table(collection);

    var _backend$filter$getRe = backend.filter.getRelationFilter(type, backend, source, info, table);

    var filter = _backend$filter$getRe.filter;
    var many = _backend$filter$getRe.many;

    var beforeHook = _.get(before, 'read' + type);

    // main query
    var query = function query() {
      // filter args
      filter = backend.filter.getArgsFilter(type, backend, args, filter);

      // add standard query modifiers
      if (_.isNumber(args.limit)) filter = filter.limit(args.limit);

      // if not a many relation, return only a single result or null
      if (!many) {
        filter = filter.coerceTo('array').do(function (objs) {
          return objs.count().eq(0).branch(r.expr(null), r.expr(objs).nth(0));
        });
      }

      // run the query
      return filter.run(connection);
    };

    // run before stub
    var resolveBefore = beforeHook(source, args, context, info);
    if (backend.util.isPromise(resolveBefore)) return resolveBefore.then(query);
    return query();
  };
}

function update$2(type) {
  var backend = this;
  return function (source, args, context, info) {
    var r = backend.r;
    var connection = backend.connection;

    var _backend$getTypeInfo = backend.getTypeInfo(type, info);

    var collection = _backend$getTypeInfo.collection;
    var store = _backend$getTypeInfo.store;
    var primary = _backend$getTypeInfo.primary;
    var before = _backend$getTypeInfo.before;

    var table = r.db(store).table(collection);
    var beforeHook = _.get(before, 'update' + type);

    // main query
    var query = function query() {
      var id = backend.getPrimaryFromArgs(type, args);
      var notThis = backend.filter.notThisRecord(type, backend, args, table);

      var filter = backend.filter.violatesUnique(type, backend, args, notThis).branch(r.error('unique field violation'), table.get(id).eq(null).branch(r.error(type + ' not found'), table.get(id).update(_.omit(args, primary))));

      // do the update
      return filter.do(function () {
        return table.get(id);
      }).run(connection);
    };

    // run before stub
    var resolveBefore = beforeHook(source, args, context, info);
    if (backend.util.isPromise(resolveBefore)) return resolveBefore.then(query);
    return query();
  };
}

function del$2(type) {
  var backend = this;
  return function (source, args, context, info) {
    var r = backend.r;
    var connection = backend.connection;

    var _backend$getTypeInfo = backend.getTypeInfo(type, info);

    var collection = _backend$getTypeInfo.collection;
    var store = _backend$getTypeInfo.store;
    var before = _backend$getTypeInfo.before;

    var table = r.db(store).table(collection);
    var beforeHook = _.get(before, 'delete' + type);

    // main query
    var query = function query() {
      var id = backend.getPrimaryFromArgs(type, args);

      // TODO: smart delete options to remove references on has relations

      return table.get(id).delete()('deleted').eq(0).branch(r.error('Could not delete'), true).run(connection);
    };

    // run before stub
    var resolveBefore = beforeHook(source, args, context, info);
    if (backend.util.isPromise(resolveBefore)) return resolveBefore.then(query);
    return query();
  };
}

function createTable(dbc, name, primaryKey) {
  return dbc.tableCreate(name, { primaryKey: primaryKey }).run().then(function () {
    return name + ' Created';
  }).catch(function (err) {
    if (err.msg.match(/^Table.*already\s+exists\.$/i) !== null) return name + ' Exists';
    throw err;
  });
}

function initStore(type, rebuild, seedData) {
  var r = this.r;
  var connection = this.connection;

  var _getTypeBackend = this.getTypeBackend(type);

  var _getTypeBackend$compu = _getTypeBackend.computed;
  var primaryKey = _getTypeBackend$compu.primaryKey;
  var collection = _getTypeBackend$compu.collection;
  var store = _getTypeBackend$compu.store;


  if (!collection || !store) throw new Error('Invalid store init config');

  var dbc = r.db(store);

  // analyze the arguments
  if (!_.isBoolean(rebuild)) {
    seedData = _.isArray(rebuild) ? rebuild : [];
    rebuild = false;
  }

  return dbc.tableList().filter(function (name) {
    return name.eq(collection);
  }).forEach(function (name) {
    return rebuild ? dbc.tableDrop(name) : dbc.table(collection).delete();
  }).run(connection).then(function () {
    return createTable(dbc, collection, primaryKey);
  }).then(function (tablesCreated) {
    if (seedData) return dbc.table(collection).insert(seedData).run(connection).then(function () {
      return tablesCreated;
    });
    return tablesCreated;
  });
}

function getCollectionFilter(type, backend) {
  var r = backend.r;

  var _backend$getTypeBacke = backend.getTypeBackend(type);

  var collection = _backend$getTypeBacke.collection;
  var store = _backend$getTypeBacke.store;

  return r.db(store).collection(collection);
}

// gets relationships defined in the type definition and also
function getRelationFilter(type, backend, source, info, filter) {
  filter = filter || getCollectionFilter(type, backend);
  var many = true;

  var _backend$getTypeInfo = backend.getTypeInfo(type, info);

  var fields = _backend$getTypeInfo.fields;
  var nested = _backend$getTypeInfo.nested;
  var currentPath = _backend$getTypeInfo.currentPath;
  var belongsTo = _backend$getTypeInfo.belongsTo;
  var has = _backend$getTypeInfo.has;

  // check for nested with belongsTo relationship

  if (nested && _.has(fields, belongsTo.primary) && _.has(source, belongsTo.foreign)) {
    many = belongsTo.many;
    filter = filter.filter(defineProperty({}, belongsTo.primary, source[belongsTo.foreign]));
  } else if (nested && _.has(fields, has.foreign)) {
    var _ret = function () {
      many = has.many;

      // get the source id or ids
      var hasId = _.get(source, currentPath);
      hasId = !many && _.isArray(hasId) ? _.get(hasId, '[0]') : hasId;
      if (!hasId || _.isArray(hasId) && !hasId.length) return {
          v: many ? [] : null
        };

      // do an array or field search
      if (many) filter = filter.filter(function (obj) {
        return r.expr(hasId).contains(obj(has.foreign));
      });else filter = filter.filter(defineProperty({}, has.foreign, hasId));
    }();

    if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
  }
  return { filter: filter, many: many };
}

// creates a filter based on the arguments
function getArgsFilter(type, backend, args, filter) {
  filter = filter || getCollectionFilter(type, backend);
  var argKeys = _.keys(args);

  var _backend$getTypeCompu = backend.getTypeComputed(type);

  var primary = _backend$getTypeCompu.primary;

  // check if the primary keys were supplied

  if (_.intersection(primary, argKeys).length === argKeys.length && argKeys.length > 0) {
    var priArgs = backend.getPrimaryFromArgs(type, args);
    filter = filter.get(priArgs).do(function (result) {
      return result.eq(null).branch([], [result]);
    });
  } else if (argKeys.length) {
    filter = filter.filter(args);
  }

  return filter;
}

// determines unique constraints and if any have been violated
function violatesUnique(type, backend, args, filter) {
  filter = filter || getCollectionFilter(type, backend);
  var r = backend.r;

  var _backend$getTypeDefin = backend.getTypeDefinition(type);

  var fields = _backend$getTypeDefin.fields;

  var unique = backend.getUnique(fields, args);

  // do a unique field check if any are specified
  if (unique.length) {
    return filter.filter(function (obj) {
      return r.expr(unique).prepend(obj).reduce(function (left, right) {
        return left.and(right('type').eq('String').branch(obj(right('field')).match(r.add('(?i)^', right('value'), '$')), obj(right('field')).eq(right('value'))));
      });
    }).count().ne(0);
  }
  return filter.coerceTo('array').do(function () {
    return r.expr(false);
  });
}

// get records that are not this one from a previous filter
function notThisRecord(type, backend, args, filter) {
  filter = filter || getCollectionFilter(type, backend);

  var _backend$getTypeBacke2 = backend.getTypeBackend(type);

  var primaryKey = _backend$getTypeBacke2.primaryKey;

  var id = backend.getPrimaryFromArgs(type, args);
  return filter.filter(function (obj) {
    return obj(primaryKey).ne(id);
  });
}

var filter = {
  getCollectionFilter: getCollectionFilter,
  getRelationFilter: getRelationFilter,
  getArgsFilter: getArgsFilter,
  violatesUnique: violatesUnique,
  notThisRecord: notThisRecord
};

function now() {
  return this.r.now();
}

function util (backend) {
  return {
    now: now.bind(backend)
  };
}

// rethinkdb specific modules
var crud$2 = { create: create$2, read: read$2, update: update$2, delete: del$2, initStore: initStore, filter: filter, util: util };

// extended backend class for RethinkDB

var GraphQLFactoryRethinkDBBackend = function (_GraphQLFactoryBaseBa) {
  inherits(GraphQLFactoryRethinkDBBackend, _GraphQLFactoryBaseBa);

  function GraphQLFactoryRethinkDBBackend(namespace, graphql, factory, r, config, connection) {
    classCallCheck(this, GraphQLFactoryRethinkDBBackend);

    var _this = possibleConstructorReturn(this, (GraphQLFactoryRethinkDBBackend.__proto__ || Object.getPrototypeOf(GraphQLFactoryRethinkDBBackend)).call(this, namespace, graphql, factory, config, crud$2));

    _this.type = 'GraphQLFactoryRethinkDBBackend';

    // check for a top-level rethinkdb namespace
    if (!r) throw new Error('a rethinkdb or rethinkdbdash top-level namespace is required');

    // store database objects
    _this.r = r;
    _this.connection = connection;
    _this.defaultStore = 'test';

    // add values to the globals namespace
    _.merge(_this._definition.globals, defineProperty({}, namespace, { r: r, connection: connection }));
    return _this;
  }

  return GraphQLFactoryRethinkDBBackend;
}(GraphQLFactoryBaseBackend);

// helper function to instantiate a new backend


function rethinkdb (namespace, graphql, factory, r, config, connection) {
  return new GraphQLFactoryRethinkDBBackend(namespace, graphql, factory, r, config, connection);
}

var index = {
  base: GraphQLFactoryBaseBackend,
  knex: knex,
  mongodb: mongodb,
  rethinkdb: rethinkdb
};

exports.base = GraphQLFactoryBaseBackend;
exports.knex = knex;
exports.mongodb = mongodb;
exports.rethinkdb = rethinkdb;
exports['default'] = index;