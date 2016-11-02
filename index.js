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

function computeUniques(fields) {
  var mixed = {},
      uniques = [];

  _.forEach(fields, function (fieldDef, field) {
    var type = _.isArray(fieldDef.type) ? _.get(fieldDef, 'type[0]') : fieldDef.type;
    if (fieldDef.unique === true) {
      uniques.push([{ field: field, type: type }]);
    } else if (_.isString(fieldDef.uniqueWith)) {
      if (!_.isArray(mixed[fieldDef.uniqueWith])) mixed[fieldDef.uniqueWith] = [{ field: field, type: type }];else mixed[fieldDef.uniqueWith].push({ field: field, type: type });
    }
  });
  _.forEach(mixed, function (compound) {
    return uniques.push(compound);
  });
  return _.uniq(uniques);
}

function getArgs(opType, definition) {
  var _this = this;

  var args = {};
  var fields = definition.fields,
      _backend = definition._backend;


  if (opType === 'query') {
    args.limit = { type: 'Int' };
  }

  // examine each field
  _.forEach(fields, function (fieldDef, fieldName) {
    var type = getType(fieldDef);
    var typeName = _.isArray(type) && type.length === 1 ? type[0] : type;
    if (!type) return true;
    fieldDef = fields[fieldName] = makeFieldDef(fieldDef);

    if (isPrimitive(type)) {
      args[fieldName] = { type: type };
    } else {
      var fieldTypeBackend = _.get(_this._types, '["' + typeName + '"]._backend');

      if (fieldDef.resolve !== false && opType === 'query' && fieldTypeBackend) {
        fieldDef.resolve = fieldDef.resolve || 'read' + type;
      } else {
        // add args for related types
        if (fieldDef.belongsTo) {
          args[fieldName] = { type: 'String' };
        } else if (fieldDef.has) {
          args[fieldName] = _.isArray(fieldDef.type) ? ['String'] : 'String';
        } else {
          args[fieldName] = { type: type };
        }
      }
    }
  });
  return args;
}

// updates definitions with relationship data
function makeRelations() {
  var _this2 = this;

  _.forEach(this._types, function (definition, name) {
    var fields = definition.fields,
        _backend = definition._backend;

    // examine each field

    _.forEach(fields, function (fieldDef, fieldName) {
      var type = getType(fieldDef);
      var typeName = _.isArray(type) ? type[0] : type;
      if (!type) return true;
      fieldDef = fields[fieldName] = makeFieldDef(fieldDef);
      var _fieldDef = fieldDef,
          belongsTo = _fieldDef.belongsTo,
          has = _fieldDef.has;

      // add belongsTo relationship to the current type

      if (belongsTo) {
        _.forEach(belongsTo, function (bCfg, bType) {
          _.forEach(bCfg, function (bKey, bField) {
            var foreignFieldDef = _.get(_this2._types, '["' + bType + '"].fields["' + bField + '"]');
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
        _.set(_this2._types, '["' + typeName + '"]._backend.computed.relations.has["' + name + '"]["' + fieldName + '"]', {
          foreign: has,
          many: _.isArray(type)
        });
      }
    });
  });
}

function make() {
  var _this3 = this;

  // analyze each type and construct graphql schemas
  _.forEach(this._types, function (definition, tname) {
    var fields = definition.fields,
        _backend = definition._backend;

    _this3._definition.types[tname] = definition;

    // verify that the type at least has fields
    // also check for a backend object config, if one doesnt exist this type is done
    if (!_.isObject(fields) || !_.isObject(_backend)) return true;

    // get deconstruct the backend config
    var schema = _backend.schema,
        table = _backend.table,
        collection = _backend.collection,
        store = _backend.store,
        db = _backend.db,
        mutation = _backend.mutation,
        query = _backend.query;

    // allow the collection to be specified as the collection or table field

    collection = '' + _this3._prefix + (collection || table);
    store = store || db || _this3.defaultStore;

    // check that the type has a schema identified, otherwise create a schema with the namespace
    var schemaName = _.isString(schema) ? schema : _this3.namespace;
    var queryName = schemaName + 'Query';
    var mutationName = schemaName + 'Mutation';

    // get the primary key name
    var primary = _this3.getPrimary(fields);
    var primaryKey = _backend.primaryKey || _.isArray(primary) ? _.camelCase(primary.join('-')) : primary;

    // get the uniques
    var uniques = computeUniques(fields);

    // update the backend
    _backend.computed = {
      primary: primary,
      primaryKey: primaryKey,
      schemaName: schemaName,
      queryName: queryName,
      mutationName: mutationName,
      collection: collection,
      store: store,
      uniques: uniques,
      before: {}
    };

    // add to the queries
    if (query !== false && collection) {
      _.set(_this3._definition.schemas, schemaName + '.query', queryName);
      query = _.isObject(query) ? query : {};

      if (!query.read && query.read !== false) query.read = true;

      // add each query method
      _.forEach(query, function (q, qname) {
        var queryFieldName = qname === 'read' ? '' + qname + tname : qname;

        _.set(_this3._definition.types, queryName + '.fields.' + queryFieldName, {
          type: q.type || [tname],
          args: q.args || getArgs.call(_this3, 'query', definition, q, qname),
          resolve: '' + queryFieldName
        });

        if (q === true || !_.has(q, 'resolve')) {
          _.set(_this3._definition, 'functions.' + queryFieldName, _this3._read(tname));
        } else if (_.isFunction(_.get(q, 'resolve'))) {
          _.set(_this3._definition, 'functions.' + queryFieldName, q.resolve);
        }

        // check for before stub
        var before = _.isFunction(q.before) ? q.before.bind(_this3) : defaultBefore;
        _.set(_backend, 'computed.before["' + queryFieldName + '"]', before);
      });
    }

    // add to the mutations
    if (mutation !== false && collection) {
      _.set(_this3._definition.schemas, schemaName + '.mutation', mutationName);
      mutation = _.isObject(mutation) ? mutation : {};
      if (!mutation.create && mutation.create !== false) mutation.create = true;
      if (!mutation.update && mutation.update !== false) mutation.update = true;
      if (!mutation.delete && mutation.delete !== false) mutation.delete = true;

      // add each mutation method
      _.forEach(mutation, function (m, mname) {
        var mutationFieldName = _.includes(['create', 'update', 'delete'], mname) ? '' + mname + tname : mname;

        _.set(_this3._definition.types, mutationName + '.fields.' + mutationFieldName, {
          type: mname === 'delete' && !m.type ? 'Boolean' : m.type || tname,
          args: m.args || getArgs.call(_this3, 'mutation', definition, m, mname),
          resolve: '' + mutationFieldName
        });

        // check for mutation resolve
        if (m === true || !_.has(m, 'resolve')) {
          _.set(_this3._definition, 'functions.' + mutationFieldName, _this3['_' + mname](tname));
        } else if (_.isFunction(_.get(m, 'resolve'))) {
          _.set(_this3._definition, 'functions.' + mutationFieldName, m.resolve);
        }

        // check for before stub
        var before = _.isFunction(m.before) ? m.before.bind(_this3) : defaultBefore;
        _.set(_backend, 'computed.before["' + mutationFieldName + '"]', before);
      });
    }
  });

  // update the definitions with relations
  makeRelations.call(this);

  // finally add args to sub fields for list types
  _.forEach(this._types, function (typeDef, typeName) {
    _.forEach(typeDef.fields, function (fieldDef, fieldName) {
      var fieldType = getType(fieldDef);
      var queryName = _.get(typeDef, '_backend.computed.queryName');

      if (queryName && _.isArray(fieldType) && fieldType.length === 1 && fieldDef.args === undefined) {
        var type = fieldType[0];
        var field = _.get(_this3._definition.types, '["' + queryName + '"].fields["read' + type + '"]', {});

        if (field.resolve === 'read' + type && _.isObject(field.args)) {
          _.set(_this3._definition.types, '["' + typeName + '"].fields["' + fieldName + '"].args', field.args);
        }
      }
    });
  });
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
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};

var asyncGenerator = function () {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function (resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };

        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;

        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function (arg) {
            resume("next", arg);
          }, function (arg) {
            resume("throw", arg);
          });
        } else {
          settle(result.done ? "return" : "normal", result.value);
        }
      } catch (err) {
        settle("throw", err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({
            value: value,
            done: true
          });
          break;

        case "throw":
          front.reject(value);
          break;

        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }

      front = front.next;

      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }

    this._invoke = send;

    if (typeof gen.return !== "function") {
      this.return = undefined;
    }
  }

  if (typeof Symbol === "function" && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function () {
      return this;
    };
  }

  AsyncGenerator.prototype.next = function (arg) {
    return this._invoke("next", arg);
  };

  AsyncGenerator.prototype.throw = function (arg) {
    return this._invoke("throw", arg);
  };

  AsyncGenerator.prototype.return = function (arg) {
    return this._invoke("return", arg);
  };

  return {
    wrap: function (fn) {
      return function () {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function (value) {
      return new AwaitValue(value);
    }
  };
}();

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

/*
 * Options
 * {
 *   store: 'store name to default to'
 * }
 */

// base class for factory backend, all backends should extend this class
var GraphQLFactoryBaseBackend = function () {
  function GraphQLFactoryBaseBackend(namespace, graphql, factory) {
    var _this = this;

    var config = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    var crud = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
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
    this.q = crud.q(this);

    // check the config object
    this._plugin = _.isArray(_plugin) ? _plugin : [_plugin];
    this._types = _.get(config, 'types', {});
    this._functions = _.get(config, 'functions', {});
    this._globals = _.get(config, 'globals', {});
    this._fields = _.get(config, 'fields', {});
    this._externalTypes = _.get(config, 'externalTypes', {});
    this._installData = {};

    // set mandatory properties
    this.options = _.get(config, 'options', {});
    this.namespace = namespace;
    this.graphql = graphql;
    this.factory = factory(this.graphql);
    this.queries = {};
    this.defaultStore = this.options.store || this.defaultStore || 'test';

    // tools
    this.util.isPromise = isPromise;

    // factory properties
    this._definition = {
      globals: _.merge(this._globals, defineProperty({}, namespace, { config: config })),
      types: {},
      schemas: {},
      fields: this._fields,
      functions: this._functions,
      externalTypes: this._externalTypes
    };

    // make graphql-factory definitions
    make.call(this);

    // add methods if they do not conflict with existing properties
    _.forEach(config.methods, function (method, name) {
      if (!_.has(_this, name) && _.isFunction(method)) _this[name] = method.bind(_this);
    });
  }

  createClass(GraphQLFactoryBaseBackend, [{
    key: 'addInstallData',
    value: function addInstallData(data) {
      if (!_.isObject(data)) return;
      this._installData = _.merge({}, this._installData, data);
    }
  }, {
    key: 'addQuery',
    value: function addQuery(fn, name) {
      if (_.isString(name) && _.isFunction(fn)) _.set(this.queries, name, fn.bind(this));
    }
  }, {
    key: 'addQueries',
    value: function addQueries(queries) {
      var _this2 = this;

      _.forEach(queries, function (fn, name) {
        return _this2.addQuery(fn, name);
      });
    }
  }, {
    key: 'addFunction',
    value: function addFunction(fn, name) {
      if (_.isString(name) && _.isFunction(fn)) _.set(this._definition.functions, name, fn(this));
    }
  }, {
    key: 'addFunctions',
    value: function addFunctions(functions) {
      var _this3 = this;

      _.forEach(functions, function (fn, name) {
        return _this3.addFunction(fn, name);
      });
    }
  }, {
    key: 'addGlobal',
    value: function addGlobal(obj, path) {
      if (_.isString(path) && obj) _.set(this._definition.globals, path, obj);
    }
  }, {
    key: 'addField',
    value: function addField(def, name) {
      if (_.isString(name) && _.isObject(def)) _.set(this._definition.fields, name, def);
    }
  }, {
    key: 'addExternalType',
    value: function addExternalType(type, name) {
      if (_.isString(name) && _.isObject(type)) _.set(this._definition.externalTypes, name, type);
    }

    // returns a graphql-factory plugin

  }, {
    key: 'getPrimary',


    // get the primary key or keys
    value: function getPrimary(fields) {
      var primary = _(fields).pickBy(function (v) {
        return v.primary === true;
      }).keys().value();
      return !primary.length ? 'id' : primary.length === 1 ? primary[0] : primary.sort();
    }

    // create a unique args object

  }, {
    key: 'getUniqueArgs',
    value: function getUniqueArgs(type, args) {
      var filters = [];

      var _getTypeBackend = this.getTypeBackend(type),
          uniques = _getTypeBackend.computed.uniques;

      _.forEach(uniques, function (unique) {
        var ufields = _.map(unique, function (u) {
          return u.field;
        });
        if (_.intersection(_.keys(args), ufields).length === ufields.length) {
          filters.push(_.map(unique, function (u) {
            return _.merge({}, u, { value: _.get(args, u.field) });
          }));
        }
      });
      return filters;
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

    // get related values

  }, {
    key: 'getRelatedValues',
    value: function getRelatedValues(type, args) {
      var _this4 = this;

      var values = [];

      var _getTypeDefinition = this.getTypeDefinition(type),
          fields = _getTypeDefinition.fields;

      _.forEach(args, function (arg, name) {
        var fieldDef = _.get(fields, name, {});
        var related = _.has(fieldDef, 'has') || _.has(fieldDef, 'belongsTo');
        var fieldType = _.get(fieldDef, 'type', fieldDef);
        var isList = _.isArray(fieldType);
        var typeName = isList && fieldType.length === 1 ? fieldType[0] : fieldType;
        var typeDef = _.get(_this4._types, typeName, {});
        var computed = _.get(typeDef, '_backend.computed');
        if (computed && related) {
          (function () {
            var store = computed.store,
                collection = computed.collection;

            values = _.union(values, _.map(isList ? arg : [arg], function (id) {
              return { store: store, collection: collection, id: id };
            }));
          })();
        }
      });
      return values;
    }

    // get type info

  }, {
    key: 'getTypeInfo',
    value: function getTypeInfo(type, info) {
      var _getTypeDefinition2 = this.getTypeDefinition(type),
          _backend = _getTypeDefinition2._backend,
          fields = _getTypeDefinition2.fields;

      var _backend$computed = _backend.computed,
          primary = _backend$computed.primary,
          primaryKey = _backend$computed.primaryKey,
          collection = _backend$computed.collection,
          store = _backend$computed.store,
          before = _backend$computed.before;

      var nested = this.isNested(info);
      var currentPath = this.getCurrentPath(info);

      var _getRelations = this.getRelations(type, info),
          belongsTo = _getRelations.belongsTo,
          has = _getRelations.has;

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
      var _getTypeComputed = this.getTypeComputed(type),
          primary = _getTypeComputed.primary;

      if (!primary) throw 'Unable to obtain primary';
      var pk = _.map(_.isArray(primary) ? primary : [primary], function (k) {
        return _.get(args, k);
      });
      return pk.length === 1 ? pk[0] : pk;
    }

    // update the args with potential compound primary

  }, {
    key: 'updateArgsWithPrimary',
    value: function updateArgsWithPrimary(type, args) {
      var newArgs = _.cloneDeep(args);

      var _getTypeComputed2 = this.getTypeComputed(type),
          primary = _getTypeComputed2.primary,
          primaryKey = _getTypeComputed2.primaryKey;

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
      var _this5 = this;

      if (!_.isBoolean(rebuild)) {
        seedData = _.isObject(rebuild) ? rebuild : {};
        rebuild = false;
      }

      // only init definitions with a collection and store specified
      var canInit = function canInit() {
        return _.pickBy(_this5._types, function (t) {
          return _.has(t, '_backend.computed.collection') && _.has(t, '_backend.computed.store');
        });
      };

      var ops = _.map(canInit(), function (t, type) {
        var data = _.get(seedData, type, []);
        return _this5.initStore(type, rebuild, _.isArray(data) ? data : []);
      });

      return promiseMap(ops);
    }

    // returns a lib object lazily, make it only once

  }, {
    key: 'plugin',
    get: function get() {
      var _plugin = {},
          obj = {};

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

function GraphQLFactoryBaseBackend$1 (namespace, graphql, factory) {
  var config = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  var crud = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};

  return new GraphQLFactoryBaseBackend(namespace, graphql, factory, config, crud);
}

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
}(GraphQLFactoryBaseBackend$1);

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
}(GraphQLFactoryBaseBackend$1);

// helper function to instantiate a new backend
function mongodb (namespace, graphql, factory, db, config, connection) {
  return new GraphQLFactoryMongoDBBackend(namespace, graphql, factory, db, config, connection);
}

function create$2(type) {
  var backend = this;
  return function (source, args) {
    var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var info = arguments[3];
    var r = backend.r,
        connection = backend.connection,
        util = backend.util,
        q = backend.q;

    var _backend$getTypeInfo = backend.getTypeInfo(type, info),
        collection = _backend$getTypeInfo.collection,
        store = _backend$getTypeInfo.store,
        before = _backend$getTypeInfo.before;

    var table = r.db(store).table(collection);
    var beforeHook = _.get(before, 'create' + type);

    // main query
    var query = function query() {
      var filter = backend.filter.violatesUnique(type, backend, args, table).branch(r.error('unique field violation'), q.type(type).insert(args, { exists: backend.getRelatedValues(type, args) }).value());

      // do the update
      return filter.run(connection);
    };

    // run before stub
    var resolveBefore = beforeHook(source, args, _.merge({}, { factory: this }, context), info);
    if (util.isPromise(resolveBefore)) return resolveBefore.then(query);
    return query();
  };
}

function read$2(type) {
  var backend = this;
  return function (source, args) {
    var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var info = arguments[3];
    var r = backend.r,
        connection = backend.connection,
        util = backend.util;

    var _backend$getTypeInfo = backend.getTypeInfo(type, info),
        collection = _backend$getTypeInfo.collection,
        store = _backend$getTypeInfo.store,
        before = _backend$getTypeInfo.before;

    var table = r.db(store).table(collection);

    var _backend$filter$getRe = backend.filter.getRelationFilter(type, backend, source, info, table),
        filter = _backend$filter$getRe.filter,
        many = _backend$filter$getRe.many;

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
    var resolveBefore = beforeHook(source, args, _.merge({}, { factory: this }, context), info);
    if (util.isPromise(resolveBefore)) return resolveBefore.then(query);
    return query();
  };
}

function update$2(type) {
  var backend = this;
  return function (source, args) {
    var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var info = arguments[3];
    var r = backend.r,
        connection = backend.connection,
        util = backend.util,
        q = backend.q;

    var _backend$getTypeInfo = backend.getTypeInfo(type, info),
        collection = _backend$getTypeInfo.collection,
        store = _backend$getTypeInfo.store,
        before = _backend$getTypeInfo.before;

    var table = r.db(store).table(collection);
    var id = backend.getPrimaryFromArgs(type, args);
    var beforeHook = _.get(before, 'update' + type);

    // main query
    var query = function query() {
      var notThis = backend.filter.notThisRecord(type, backend, args, table);
      return backend.filter.violatesUnique(type, backend, args, notThis).branch(r.error('unique field violation'), q.type(type).update(args, { exists: backend.getRelatedValues(type, args) }).do(function () {
        return q.type(type).get(id).value();
      }).value()).run(connection);
    };

    // run before stub
    var resolveBefore = beforeHook(source, args, _.merge({}, { factory: this }, context), info);
    if (util.isPromise(resolveBefore)) return resolveBefore.then(query);
    return query();
  };
}

function del$2(type) {
  var backend = this;
  return function (source, args) {
    var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var info = arguments[3];
    var util = backend.util,
        q = backend.q;

    var _backend$getTypeInfo = backend.getTypeInfo(type, info),
        before = _backend$getTypeInfo.before;

    var beforeHook = _.get(before, 'delete' + type);
    var query = function query() {
      return q.type(type).delete(args).run();
    };

    // run before stub
    var resolveBefore = beforeHook(source, args, _.merge({}, { factory: this }, context), info);
    if (util.isPromise(resolveBefore)) return resolveBefore.then(query);
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
  var r = this.r,
      connection = this.connection;

  var _getTypeBackend = this.getTypeBackend(type),
      _getTypeBackend$compu = _getTypeBackend.computed,
      primaryKey = _getTypeBackend$compu.primaryKey,
      collection = _getTypeBackend$compu.collection,
      store = _getTypeBackend$compu.store;

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

  var _backend$getTypeBacke = backend.getTypeBackend(type),
      collection = _backend$getTypeBacke.collection,
      store = _backend$getTypeBacke.store;

  return r.db(store).collection(collection);
}

// gets relationships defined in the type definition and also
function getRelationFilter(type, backend, source, info, filter) {
  filter = filter || getCollectionFilter(type, backend);
  var many = true;
  var r = backend.r;

  var _backend$getTypeInfo = backend.getTypeInfo(type, info),
      fields = _backend$getTypeInfo.fields,
      nested = _backend$getTypeInfo.nested,
      currentPath = _backend$getTypeInfo.currentPath,
      belongsTo = _backend$getTypeInfo.belongsTo,
      has = _backend$getTypeInfo.has;

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
          v: { filter: r.expr([]), many: many }
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

  var _backend$getTypeCompu = backend.getTypeComputed(type),
      primary = _backend$getTypeCompu.primary;

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

  var unique = backend.getUniqueArgs(type, args);

  if (unique.length) {
    return filter.filter(function (obj) {
      return r.expr(unique).prepend(true).reduce(function (prevUniq, uniq) {
        return prevUniq.and(uniq.prepend(true).reduce(function (prevField, field) {
          return prevField.and(field('type').eq('String').branch(obj(field('field')).match(r.add('(?i)^', field('value'), '$')), obj(field('field')).eq(field('value'))));
        }));
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

  var _backend$getTypeCompu2 = backend.getTypeComputed(type),
      primaryKey = _backend$getTypeCompu2.primaryKey;

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

function util (backend) {
  return {};
}

var GraphQLFactoryBackendQueryBuilder = function () {
  function GraphQLFactoryBackendQueryBuilder(backend, type) {
    classCallCheck(this, GraphQLFactoryBackendQueryBuilder);

    this._r = backend.r;
    this._connection = backend.connection;
    this._b = backend;
    this._value = this._r;

    if (type) {
      var _backend$getTypeCompu = backend.getTypeComputed(type),
          store = _backend$getTypeCompu.store,
          collection = _backend$getTypeCompu.collection;

      this._type = type;
      this._storeName = store;
      this._collectionName = collection;
      this._store = this._r.db(this._storeName);
      this._collection = this._store.table(this._collectionName);
    }
  }

  createClass(GraphQLFactoryBackendQueryBuilder, [{
    key: 'type',
    value: function type(t) {
      var q = new GraphQLFactoryBackendQueryBuilder(this._b, t);
      q._value = q._collection;
      return q;
    }
  }, {
    key: 'value',
    value: function value(v) {
      if (v === undefined) return this._value;
      var q = new GraphQLFactoryBackendQueryBuilder(this._b);
      q._value = v;
      return q;
    }
  }, {
    key: 'error',
    value: function error(msg) {
      return this._b.r.error(msg);
    }
  }, {
    key: 'run',
    value: function run() {
      if (this._value) return this._value.run(this._connection);
      throw new Error('no operations to run');
    }
  }, {
    key: 'forEach',
    value: function forEach() {
      this._value = this._value.forEach.apply(this._value, [].concat(Array.prototype.slice.call(arguments)));
      return this;
    }
  }, {
    key: 'add',
    value: function add() {
      this._value = this._value.add.apply(this._value, [].concat(Array.prototype.slice.call(arguments)));
      return this;
    }
  }, {
    key: 'sub',
    value: function sub() {
      this._value = this._value.sub.apply(this._value, [].concat(Array.prototype.slice.call(arguments)));
      return this;
    }
  }, {
    key: 'eq',
    value: function eq() {
      this._value = this._value.eq.apply(this._value, [].concat(Array.prototype.slice.call(arguments)));
      return this;
    }
  }, {
    key: 'ne',
    value: function ne() {
      this._value = this._value.ne.apply(this._value, [].concat(Array.prototype.slice.call(arguments)));
      return this;
    }
  }, {
    key: 'gt',
    value: function gt() {
      this._value = this._value.gt.apply(this._value, [].concat(Array.prototype.slice.call(arguments)));
      return this;
    }
  }, {
    key: 'ge',
    value: function ge() {
      this._value = this._value.ge.apply(this._value, [].concat(Array.prototype.slice.call(arguments)));
      return this;
    }
  }, {
    key: 'lt',
    value: function lt() {
      this._value = this._value.lt.apply(this._value, [].concat(Array.prototype.slice.call(arguments)));
      return this;
    }
  }, {
    key: 'le',
    value: function le() {
      this._value = this._value.le.apply(this._value, [].concat(Array.prototype.slice.call(arguments)));
      return this;
    }
  }, {
    key: 'not',
    value: function not() {
      this._value = this._value.not();
      return this;
    }
  }, {
    key: 'count',
    value: function count() {
      this._value = this._value.count();
      return this;
    }
  }, {
    key: 'now',
    value: function now() {
      var q = new GraphQLFactoryBackendQueryBuilder(this._b);
      q._value = this._b.r.now();
      return q;
    }
  }, {
    key: 'get',
    value: function get(id) {
      id = _.isObject(id) && !_.isArray(id) ? this._b.getPrimaryFromArgs(this._type, id) : id;
      this._value = this._collection.get(id);
      return this;
    }
  }, {
    key: 'prop',
    value: function prop(path) {
      path = _.isArray(path) ? path : _.toPath(path);
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = path[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var p = _step.value;

          this._value = this._value(p);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      return this;
    }
  }, {
    key: 'merge',
    value: function merge() {
      this._value = this._value.merge.apply(this._value, [].concat(Array.prototype.slice.call(arguments)));
    }
  }, {
    key: 'exists',
    value: function exists(id) {
      id = _.isObject(id) && !_.isArray(id) ? this._b.getPrimaryFromArgs(this._type, id) : id;
      this._value = this._collection.get(id).eq(null);
      return this;
    }
  }, {
    key: 'insert',
    value: function insert(args) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var r = this._r;
      var table = this._collection;
      var throwErrors = options.throwErrors === false ? false : true;

      // map the types store and collection
      var exists = _.isArray(options.exists) ? options.exists : [];

      this._value = r.expr(exists).prepend(true).reduce(function (prev, cur) {
        return prev.and(r.db(cur('store')).table(cur('collection')).get(cur('id')).ne(null));
      }).not().branch(throwErrors ? r.error('One or more related records were not found') : null, table.insert(this._b.updateArgsWithPrimary(this._type, args), { returnChanges: true })('changes').do(function (changes) {
        return changes.count().eq(0).branch(throwErrors ? r.error('Failed to insert') : null, changes.nth(0)('new_val'));
      }));
      return this;
    }
  }, {
    key: 'update',
    value: function update(args) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var r = this._r;
      var table = this._collection;
      var throwErrors = options.throwErrors === false ? false : true;
      var id = this._b.getPrimaryFromArgs(this._type, args);

      // map the types store and collection
      var exists = _.isArray(options.exists) ? options.exists : [];

      var filter = id ? table.get(id) : this._value;
      var not = id ? filter.eq(null) : r.expr(false);

      this._value = not.branch(throwErrors ? r.error('The record was not found') : null, r.expr(exists).prepend(true).reduce(function (prev, cur) {
        return prev.and(r.db(cur('store')).table(cur('collection')).get(cur('id')).ne(null));
      }).not().branch(throwErrors ? r.error('One or more related records were not found') : null, filter.update(args)));
      return this;
    }
  }, {
    key: 'delete',
    value: function _delete(id) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      id = _.isObject(id) && !_.isArray(id) ? this._b.getPrimaryFromArgs(this._type, id) : id;
      var r = this._r;
      var table = this._collection;
      var throwErrors = options.throwErrors === false ? false : true;

      if (!id) {
        this._value = this._value.delete();
        return this;
      }

      this._value = table.get(id).eq(null).branch(throwErrors ? r.error('unable to delete, record not found') : false, table.get(id).delete()('deleted').eq(0).branch(throwErrors ? r.error('failed to delete record') : false, true));
      return this;
    }
  }, {
    key: 'expr',
    value: function expr() {
      this._value = this._r.expr.apply(this._b.r, [].concat(Array.prototype.slice.call(arguments)));
      return this;
    }
  }, {
    key: 'coerceTo',
    value: function coerceTo(type) {
      this._value = this._value.coerceTo(type);
      return this;
    }
  }, {
    key: 'filter',
    value: function filter() {
      this._value = this._value.filter.apply(this._value, [].concat(Array.prototype.slice.call(arguments)));
      return this;
    }
  }, {
    key: 'do',
    value: function _do() {
      this._value = this._value.do.apply(this._value, [].concat(Array.prototype.slice.call(arguments)));
      return this;
    }
  }, {
    key: 'and',
    value: function and() {
      this._value = this._value.and.apply(this._value, [].concat(Array.prototype.slice.call(arguments)));
      return this;
    }
  }, {
    key: 'or',
    value: function or() {
      this._value = this._value.or.apply(this._value, [].concat(Array.prototype.slice.call(arguments)));
      return this;
    }
  }, {
    key: 'nth',
    value: function nth() {
      this._value = this._value.nth.apply(this._value, [].concat(Array.prototype.slice.call(arguments)));
      return this;
    }
  }, {
    key: 'branch',
    value: function branch() {
      this._value = this._value.branch.apply(this._value, [].concat(Array.prototype.slice.call(arguments)));
      return this;
    }
  }, {
    key: 'map',
    value: function map() {
      this._value = this._value.map.apply(this._value, [].concat(Array.prototype.slice.call(arguments)));
      return this;
    }
  }, {
    key: 'reduce',
    value: function reduce() {
      this._value = this._value.reduce.apply(this._value, [].concat(Array.prototype.slice.call(arguments)));
      return this;
    }
  }]);
  return GraphQLFactoryBackendQueryBuilder;
}();

function q (backend) {
  return new GraphQLFactoryBackendQueryBuilder(backend);
}

// rethinkdb specific modules
var crud$2 = { create: create$2, read: read$2, update: update$2, delete: del$2, initStore: initStore, filter: filter, util: util, q: q };

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

    _this.getTypeStore = function (type) {
      var _this$getTypeComputed = _this.getTypeComputed(type),
          store = _this$getTypeComputed.store;

      return _this.r.db(store);
    };

    _this.getTypeCollection = function (type) {
      var _this$getTypeComputed2 = _this.getTypeComputed(type),
          store = _this$getTypeComputed2.store,
          collection = _this$getTypeComputed2.collection;

      return _this.r.db(store).table(collection);
    };

    // add values to the globals namespace
    _.merge(_this._definition.globals, defineProperty({}, namespace, { r: r, connection: connection }));
    return _this;
  }

  return GraphQLFactoryRethinkDBBackend;
}(GraphQLFactoryBaseBackend$1);

// helper function to instantiate a new backend
function rethinkdb (namespace, graphql, factory, r, config, connection) {
  return new GraphQLFactoryRethinkDBBackend(namespace, graphql, factory, r, config, connection);
}

var index = {
  base: GraphQLFactoryBaseBackend$1,
  GraphQLFactoryBaseBackend: GraphQLFactoryBaseBackend,
  knex: knex,
  GraphQLFactoryKnexBackend: GraphQLFactoryKnexBackend,
  mongodb: mongodb,
  GraphQLFactoryMongoDBBackend: GraphQLFactoryMongoDBBackend,
  rethinkdb: rethinkdb,
  GraphQLFactoryRethinkDBBackend: GraphQLFactoryRethinkDBBackend
};

exports.base = GraphQLFactoryBaseBackend$1;
exports.GraphQLFactoryBaseBackend = GraphQLFactoryBaseBackend;
exports.knex = knex;
exports.GraphQLFactoryKnexBackend = GraphQLFactoryKnexBackend;
exports.mongodb = mongodb;
exports.GraphQLFactoryMongoDBBackend = GraphQLFactoryMongoDBBackend;
exports.rethinkdb = rethinkdb;
exports.GraphQLFactoryRethinkDBBackend = GraphQLFactoryRethinkDBBackend;
exports['default'] = index;