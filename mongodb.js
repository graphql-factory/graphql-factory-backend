'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _ = _interopDefault(require('lodash'));

function getArgs(type, definition, cfg) {
  var args = {};

  // examine each field
  _.forEach(definition.fields, function (fieldDef, fieldName) {
    if (_.isString(fieldDef) || _.isArray(fieldDef)) {
      args[fieldName] = { type: fieldDef };
    } else if (_.has(fieldDef, 'type')) {
      if (!_.isString(fieldDef) && !_.isArray(fieldDef)) return true;
    }
  });

  return args;
}

function make() {
  var _this = this;

  // analyze each type and construct graphql schemas
  _.forEach(this._types, function (definition, tname) {
    var fields = definition.fields;
    var _backend = definition._backend;

    // verify that the type at least has fields

    if (!_.isObject(fields)) return true;
    _this._definition.types[tname] = definition;

    // check for a backend object config, if one doesnt exist this type is done
    if (!_.isObject(_backend)) return true;

    // get deconstruct the backend config
    var schema = _backend.schema;
    var table = _backend.table;
    var collection = _backend.collection;
    var mutation = _backend.mutation;
    var query = _backend.query;

    // allow the collection to be specified as the collection or table field

    collection = collection || table;

    // check that the type has a schema identified, otherwise create a schema with the namespace
    var schemaName = _.isString(schema) ? schema : _this.namespace;
    var queryName = schemaName + 'Query';
    var mutationName = schemaName + 'Mutation';

    // add to the queries
    if (query !== false && collection) {
      _.set(_this._definition.schemas, schemaName + '.query', queryName);
      query = _.isObject(query) ? query : {};
      if (!query.read && query.read !== false) query.read = true;

      // add each query method
      _.forEach(query, function (q, qname) {
        if (qname === 'read' && q === true) {
          _.set(_this._definition.types, queryName + '.fields.' + qname + tname, {
            type: [tname],
            args: getArgs('query', definition, q),
            resolve: '' + qname + tname
          });
          _.set(_this._definition, 'functions.' + qname + tname, _this['_' + qname](tname));
        }
      });
    }

    // add to the mutations
    if (mutation !== false && collection) {
      _.set(_this._definition.schemas, schemaName + '.mutation', mutationName);
      mutation = _.isObject(mutation) ? mutation : {};
      if (!mutation.create && mutation.create !== false) mutation.create = true;
      if (!mutation.update && mutation.update !== false) mutation.update = true;
      if (!mutation.delete && mutation.delete !== false) mutation.delete = true;

      // add each mutation method
      _.forEach(mutation, function (m, mname) {
        if (_.includes(['create', 'update', 'delete'], mname) && m === true) {
          _.set(_this._definition.types, mutationName + '.fields.' + mname + tname, {
            type: mname === 'delete' ? 'Boolean' : tname,
            args: getArgs('mutation', definition, m),
            resolve: '' + mname + tname
          });
          _.set(_this._definition.functions, '' + mname + tname, _this['_' + mname](tname));
        }
      });
    }
  });
}

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

    // set crud methods
    this._create = crud.create;
    this._read = crud.read;
    this._update = crud.update;
    this._delete = crud.delete;

    // check the config object
    this._plugin = _.isArray(_plugin) ? _plugin : [_plugin];
    this._types = config.types;

    // set mandatory properties
    this.options = _.get(config, 'options', {});
    this.namespace = namespace;
    this.graphql = graphql;
    this.factory = factory(this.graphql);

    // factory properties
    this._definition = {
      globals: {},
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

    // returns a lib object lazily, make it only once

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

var GraphQLFactoryMongoDBBackend = function (_GraphQLFactoryBaseBa) {
  inherits(GraphQLFactoryMongoDBBackend, _GraphQLFactoryBaseBa);

  function GraphQLFactoryMongoDBBackend(namespace, graphql, factory, db, config, connection) {
    classCallCheck(this, GraphQLFactoryMongoDBBackend);

    var _this = possibleConstructorReturn(this, (GraphQLFactoryMongoDBBackend.__proto__ || Object.getPrototypeOf(GraphQLFactoryMongoDBBackend)).call(this, namespace, graphql, factory, config, crud));

    _this.type = 'GraphQLFactoryMongoDBBackend';

    // check for a top-level rethinkdb namespace
    if (!db) throw new Error('a MongoDB connection is required');

    // store database objects
    _this.db = db;

    // add values to the globals namespace
    _.merge(_this.globals, defineProperty({}, namespace, { db: db }));
    return _this;
  }

  return GraphQLFactoryMongoDBBackend;
}(GraphQLFactoryBaseBackend);

// helper function to instantiate a new backend


function index (namespace, graphql, factory, db, config, connection) {
  return new GraphQLFactoryMongoDBBackend(namespace, graphql, factory, db, config, connection);
}

module.exports = index;