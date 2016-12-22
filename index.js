'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _ = _interopDefault(require('lodash'));
var Promise$1 = _interopDefault(require('bluebird'));
var Events = _interopDefault(require('events'));

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
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

var CREATE = 'create';
var READ = 'read';
var UPDATE = 'update';
var DELETE = 'delete';
var QUERY = 'query';
var MUTATION = 'mutation';
var STRING = 'String';
var INT = 'Int';
var FLOAT = 'Float';
var BOOLEAN = 'Boolean';
var ID = 'ID';
var INPUT = 'Input';
var ENUM = 'Enum';
var PRIMITIVES = [STRING, INT, FLOAT, BOOLEAN, ID];

function makeObjectName(schema, op) {
  return 'backend' + _.capitalize(schema) + _.capitalize(op);
}

function getPrimary$1(fields) {
  var primary = _(fields).pickBy(function (v) {
    return v.primary === true;
  }).keys().value();
  return !primary.length ? null : primary.length === 1 ? primary[0] : primary;
}

function getTypeName(type) {
  return _.isArray(type) ? _.first(type) : type;
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
  var def = _.merge({}, _.isObject(fieldDef) ? fieldDef : {});
  var type = getType(fieldDef);
  if (type) def.type = type;
  return def;
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

function defaultBefore() {
  return Promise.resolve();
}

/*
 * Main compiler class
 */

var GraphQLFactoryBackendCompiler = function () {
  function GraphQLFactoryBackendCompiler(backend) {
    classCallCheck(this, GraphQLFactoryBackendCompiler);

    this.backend = backend;
    this.defaultStore = backend._defaultStore;
    this.extension = backend._extension;
    this.prefix = _.isString(backend._prefix) ? backend._prefix : '';
    this.definition = backend.definition;
    this.definition.compile();
  }

  createClass(GraphQLFactoryBackendCompiler, [{
    key: 'compile',
    value: function compile() {
      return this.computeExtension().buildQueries().buildMutations().buildRelations().setListArgs().value();
    }
  }, {
    key: 'value',
    value: function value() {
      return this.definition;
    }
  }, {
    key: 'computeExtension',
    value: function computeExtension() {
      var _this = this;

      _.forEach(this.definition.types, function (definition) {
        var fields = _.get(definition, 'fields', {});
        var ext = _.get(definition, '["' + _this.extension + '"]', {});
        var schema = ext.schema,
            table = ext.table,
            collection = ext.collection,
            store = ext.store,
            db = ext.db,
            mutation = ext.mutation,
            query = ext.query;


        if (!_.isObject(fields) || !_.isObject(ext)) return true;
        var computed = ext.computed = {};

        computed.collection = '' + _this.prefix + (collection || table);
        computed.store = store || db || _this.defaultStore;

        // check that the type has a schema identified, otherwise create a schema with the namespace
        // allow schemas to be an array so that queries/mutations can belong to multiple schemas
        computed.schemas = !schema ? [_this.backend._namespace] : _.isArray(schema) ? schema : [schema];

        // get the primary key name
        var primary = computed.primary = getPrimary$1(fields);
        computed.primaryKey = ext.primaryKey || _.isArray(primary) ? _.camelCase(primary.join('-')) : primary;

        // get the uniques
        computed.uniques = computeUniques(fields);
        computed.before = {};
      });

      // support chaining
      return this;
    }
  }, {
    key: 'buildQueries',
    value: function buildQueries() {
      var _this2 = this;

      _.forEach(this.definition.types, function (definition, typeName) {
        var _backend = _.get(definition, '["' + _this2.extension + '"]', {});
        var computed = _.get(_backend, 'computed', {});
        var query = _backend.query;
        var collection = computed.collection,
            schemas = computed.schemas;

        if (query === false || !collection) return;

        query = _.isObject(query) ? query : {};
        query.read = !query.read && query.read !== false ? true : query.read;

        // add properties for each schema type
        _.forEach(schemas, function (schema) {
          var objName = makeObjectName(schema, QUERY);
          _.set(_this2.definition.schemas, '["' + schema + '"].query', objName);

          _.forEach(query, function (opDef, name) {
            var type = opDef.type,
                args = opDef.args,
                resolve = opDef.resolve,
                before = opDef.before;

            var fieldName = name === READ ? '' + name + typeName : name;
            var resolveName = _.isString(resolve) ? resolve : 'backend_' + fieldName;

            _.set(_this2.definition.types, '["' + objName + '"].fields["' + fieldName + '"]', {
              type: type || [typeName],
              args: args || _this2.buildArgs(definition, QUERY, typeName),
              resolve: resolveName
            });

            if (opDef === true || !resolve) {
              _.set(_this2.definition, 'functions.' + resolveName, _this2.backend.readResolver(typeName));
            } else if (_.isFunction(resolve)) {
              _.set(_this2.definition, 'functions.' + resolveName, resolve);
            }

            // check for before stub
            before = _.isFunction(before) ? before.bind(_this2) : defaultBefore;
            _.set(_backend, 'computed.before["' + resolveName + '"]', before);
          });
        });
      });

      // support chaining
      return this;
    }
  }, {
    key: 'buildMutations',
    value: function buildMutations() {
      var _this3 = this;

      _.forEach(this.definition.types, function (definition, typeName) {
        var _backend = _.get(definition, '["' + _this3.extension + '"]', {});
        var computed = _.get(_backend, 'computed', {});
        var mutation = _backend.mutation;
        var collection = computed.collection,
            schemas = computed.schemas;

        if (mutation === false || !collection) return;

        mutation = _.isObject(mutation) ? mutation : {};
        mutation.create = !mutation.create && mutation.create !== false ? true : mutation.create;
        mutation.update = !mutation.update && mutation.update !== false ? true : mutation.update;
        mutation.delete = !mutation.delete && mutation.delete !== false ? true : mutation.delete;

        // add properties for each schema type
        _.forEach(schemas, function (schema) {
          var objName = makeObjectName(schema, MUTATION);
          _.set(_this3.definition.schemas, '["' + schema + '"].mutation', objName);

          _.forEach(mutation, function (opDef, name) {
            var type = opDef.type,
                args = opDef.args,
                resolve = opDef.resolve,
                before = opDef.before;

            var ops = [CREATE, UPDATE, DELETE];
            var fieldName = _.includes(ops, name) ? '' + name + typeName : name;
            var resolveName = _.isString(resolve) ? resolve : 'backend_' + fieldName;

            _.set(_this3.definition.types, '["' + objName + '"].fields["' + fieldName + '"]', {
              type: name === DELETE ? BOOLEAN : type || [typeName],
              args: args || _this3.buildArgs(definition, MUTATION, typeName),
              resolve: resolveName
            });

            if (opDef === true || !resolve) {
              _.set(_this3.definition, 'functions.' + resolveName, _this3.backend[name + 'Resolver'](typeName));
            } else if (_.isFunction(resolve)) {
              _.set(_this3.definition, 'functions.' + resolveName, resolve);
            }

            // check for before stub
            before = _.isFunction(before) ? before.bind(_this3) : defaultBefore;
            _.set(_backend, 'computed.before["' + resolveName + '"]', before);
          });
        });
      });

      // support chaining
      return this;
    }
  }, {
    key: 'buildRelations',
    value: function buildRelations() {
      var _this4 = this;

      _.forEach(this.definition.types, function (definition, name) {
        var fields = _.get(definition, 'fields', {});
        var _backend = _.get(definition, '["' + _this4.extension + '"]', {});

        // examine each field
        _.forEach(fields, function (fieldDef, fieldName) {
          var type = getType(fieldDef);
          if (!type) return true;
          var typeName = getTypeName(type);

          fieldDef = fields[fieldName] = makeFieldDef(fieldDef);
          var _fieldDef = fieldDef,
              belongsTo = _fieldDef.belongsTo,
              has = _fieldDef.has;

          // add belongsTo relationship to the current type

          if (belongsTo) {
            _.forEach(belongsTo, function (config, type) {
              _.forEach(config, function (key, field) {
                var foreignFieldDef = _.get(_this4._types, '["' + type + '"].fields["' + field + '"]');
                _.set(_backend, 'computed.relations.belongsTo["' + type + '"]["' + field + '"]', {
                  primary: fieldName,
                  foreign: key,
                  many: _.isArray(getType(foreignFieldDef))
                });
              });
            });
          }

          // add a has relationship to the nested type. this is because the nested types resolve
          // will determine how it returns data
          if (has) {
            var relationPath = '["' + typeName + '"]["' + _this4.extension + '"].computed.relations';
            _.set(_this4.definition.types, '["' + relationPath + '"].has["' + name + '"]["' + fieldName + '"]', {
              foreign: has,
              many: _.isArray(type)
            });
          }
        });
      });

      // support chaining
      return this;
    }
  }, {
    key: 'setListArgs',
    value: function setListArgs() {
      var _this5 = this;

      _.forEach(this.definition.types, function (typeDef, typeName) {
        var schema = _.get(typeDef, '["' + _this5.extension + '"].computed.schemas[0]');
        var name = makeObjectName(schema, QUERY);

        _.forEach(typeDef.fields, function (fieldDef, fieldName) {
          var fieldType = getType(fieldDef);

          if (name && _.isArray(fieldType) && fieldType.length === 1 && fieldDef.args === undefined) {
            var type = _.get(fieldType, '[0]');
            var field = _.get(_this5._definition.types, '["' + name + '"].fields["read' + type + '"]', {});

            if (field.resolve === 'read' + type && _.isObject(field.args)) {
              _.set(_this5.definition.types, '["' + typeName + '"].fields["' + fieldName + '"].args', field.args);
            }
          }
        });
      });

      // support chaining
      return this;
    }

    /*
     * Helper methods
     */

  }, {
    key: 'buildArgs',
    value: function buildArgs(definition, operation, rootName) {
      var _this6 = this;

      var args = {};
      var fields = _.get(definition, 'fields', {});
      var _backend = _.get(definition, '["' + this.extension + '"]', {});

      if (operation === QUERY) args.limit = { type: 'Int' };

      _.forEach(fields, function (fieldDef, fieldName) {
        var type = getType(fieldDef);
        if (!type) return true;
        var typeName = getTypeName(type);
        var typeDef = _.get(_this6.definition.types, '["' + typeName + '"]', {});
        fieldDef = fields[fieldName] = makeFieldDef(fieldDef);

        // support protected fields which get removed from the args build
        if (fieldDef.protect === true && operation === MUTATION) return;

        // primitives get added automatically
        if (isPrimitive(type)) {
          args[fieldName] = { type: type };
        } else {
          var typeBackend = _.get(_this6.definition.types, '["' + typeName + '"]["' + _this6.extension + '"]');

          if (fieldDef.resolve !== false && operation === QUERY && typeBackend) {
            fieldDef.resolve = fieldDef.resolve || 'backend_read' + type;
          } else {
            // add args for related types
            if (fieldDef.belongsTo) {
              args[fieldName] = { type: 'String' };
            } else if (fieldDef.has) {
              args[fieldName] = _.isArray(fieldDef.type) ? ['String'] : 'String';
            } else {
              // look for an input type
              if (operation === MUTATION && typeDef.type !== ENUM) {
                // for mutations with objects for args, make sure the object is an input type or do not
                // allow it as an argument
                if (typeDef.type === INPUT) {
                  args[fieldName] = { type: type };
                } else {
                  var inputName = '' + typeName + INPUT;
                  var inputMatch = _.get(_this6.definition.types, '["' + inputName + '"]', {});
                  if (inputMatch.type === INPUT) args[fieldName] = { type: _.isArray(type) ? [inputName] : inputName };else console.warn('[backend warning]: calculation of type "' + rootName + '" argument "' + fieldName + '" could not find and input type and will not be added. please create type "' + inputName + '"');
                }
              } else {
                args[fieldName] = { type: type };
              }
            }
          }
        }
      });
      return args;
    }
  }]);
  return GraphQLFactoryBackendCompiler;
}();

var GraphQLFactoryBaseBackend = function (_Events) {
  inherits(GraphQLFactoryBaseBackend, _Events);

  function GraphQLFactoryBaseBackend(namespace, graphql, factory) {
    var config = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    var crud = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
    var installer = arguments[5];
    classCallCheck(this, GraphQLFactoryBaseBackend);

    var _this = possibleConstructorReturn(this, (GraphQLFactoryBaseBackend.__proto__ || Object.getPrototypeOf(GraphQLFactoryBaseBackend)).call(this));

    var extension = config.extension,
        plugin = config.plugin,
        options = config.options,
        methods = config.methods,
        globals = config.globals,
        fields = config.fields,
        functions = config.functions,
        types = config.types,
        externalTypes = config.externalTypes;

    var _ref = options || {},
        store = _ref.store,
        prefix = _ref.prefix;

    // check for required properties


    if (!_.isString(namespace)) throw new Error('a namespace is required');
    if (!graphql) throw new Error('an instance of graphql is required');
    if (!factory) throw new Error('an instance of graphql-factory is required');
    if (!_.isObject(types)) throw new Error('no types were found in the configuration');
    if (!crud.create || !crud.read || !crud.update || !crud.delete) throw new Error('missing CRUD operation');

    // set props
    _this.type = 'GraphQLFactoryBaseBackend';
    _this.graphql = graphql;
    _this.factory = factory(graphql);

    // create a definition
    _this.definition = new factory.GraphQLFactoryDefinition(config, { plugin: plugin });
    _this.definition.merge({ globals: defineProperty({}, namespace, config) });

    // set non-overridable properties
    _this._crud = crud;
    _this._installer = installer.bind(_this);
    _this._extension = extension || '_backend';
    _this._namespace = namespace;
    _this._prefix = _.isString(prefix) ? prefix : '';
    _this._options = options || {};
    _this._defaultStore = store || _this._defaultStore || 'test';
    _this._installData = {};
    _this._queries = {};
    _this._lib = null;
    _this._plugin = null;
    return _this;
  }

  createClass(GraphQLFactoryBaseBackend, [{
    key: 'make',
    value: function make() {
      // make the backend definition
      var compiler = new GraphQLFactoryBackendCompiler(this);
      compiler.compile();
    }

    /******************************************************************
     * Resolvers methods
     ******************************************************************/

  }, {
    key: 'createResolver',
    value: function createResolver(type) {
      return this._crud.create(this, type);
    }
  }, {
    key: 'readResolver',
    value: function readResolver(type) {
      return this._crud.read(this, type);
    }
  }, {
    key: 'updateResolver',
    value: function updateResolver(type) {
      return this._crud.update(this, type);
    }
  }, {
    key: 'deleteResolver',
    value: function deleteResolver(type) {
      return this._crud.delete(this, type);
    }

    /******************************************************************
     * Methods that should be overriden when extended
     ******************************************************************/

  }, {
    key: 'getStore',
    value: function getStore(type) {
      return _.get(this.getTypeComputed(type), 'store');
    }
  }, {
    key: 'getCollection',
    value: function getCollection(type) {
      return _.get(this.getTypeComputed(type), 'collection');
    }

    /******************************************************************
     * Utility methods
     ******************************************************************/

  }, {
    key: 'addExternalType',
    value: function addExternalType(type, name) {
      if (_.isString(name) && _.isObject(type)) _.set(this.definition.externalTypes, name, type);
    }
  }, {
    key: 'addField',
    value: function addField(def, name) {
      if (_.isString(name) && _.isObject(def)) _.set(this.definition.fields, name, def);
    }
  }, {
    key: 'addFunction',
    value: function addFunction(fn, name) {
      if (_.isString(name) && _.isFunction(fn)) _.set(this.definition.functions, name, fn(this));
    }
  }, {
    key: 'addFunctions',
    value: function addFunctions(functions) {
      var _this2 = this;

      _.forEach(functions, function (fn, name) {
        return _this2.addFunction(fn, name);
      });
    }
  }, {
    key: 'addGlobal',
    value: function addGlobal(obj, path) {
      if (_.isString(path) && obj) _.set(this.definition.globals, path, obj);
    }
  }, {
    key: 'addInstallData',
    value: function addInstallData(data) {
      if (!_.isObject(data)) return;
      this._installData = _.merge({}, this._installData, data);
    }
  }, {
    key: 'addQueries',
    value: function addQueries(queries) {
      var _this3 = this;

      _.forEach(queries, function (fn, name) {
        return _this3.addQuery(fn, name);
      });
    }
  }, {
    key: 'addQuery',
    value: function addQuery(fn, name) {
      if (_.isString(name) && _.isFunction(fn)) _.set(this.queries, name, fn.bind(this));
    }
  }, {
    key: 'getCurrentPath',
    value: function getCurrentPath(info) {
      // support for current and previous graphql info objects
      var infoPath = _.get(info, 'path', []);
      return _.isArray(infoPath) ? _.last(infoPath) : infoPath.key;
    }
  }, {
    key: 'getParentType',
    value: function getParentType(info) {
      return _.get(info, 'parentType');
    }
  }, {
    key: 'getPrimary',
    value: function getPrimary(fields) {
      var primary = _(fields).pickBy(function (v) {
        return v.primary === true;
      }).keys().value();
      return !primary.length ? 'id' : primary.length === 1 ? primary[0] : primary.sort();
    }
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
  }, {
    key: 'getRelations',
    value: function getRelations(type, info) {
      var relations = this.getTypeRelatins(type);
      var parentType = this.getParentType(info);
      var cpath = this.getCurrentPath(info);
      var belongsTo = _.get(relations, 'belongsTo["' + parentType.name + '"]["' + cpath + '"]', {});
      var has = _.get(relations, 'has["' + parentType.name + '"]["' + cpath + '"]', {});
      return { has: has, belongsTo: belongsTo };
    }
  }, {
    key: 'getTypeBackend',
    value: function getTypeBackend(type) {
      return _.get(this.getTypeDefinition(type), this._extension);
    }
  }, {
    key: 'getTypeComputed',
    value: function getTypeComputed(type) {
      return _.get(this.getTypeBackend(type), 'computed');
    }
  }, {
    key: 'getTypeDefinition',
    value: function getTypeDefinition(type) {
      return _.get(this.definition.types, type, {});
    }
  }, {
    key: 'getTypeFields',
    value: function getTypeFields(type) {
      return _.get(this.getTypeDefinition(type), 'fields');
    }
  }, {
    key: 'getTypeInfo',
    value: function getTypeInfo(type, info) {
      var _ref2;

      var typeDef = this.getTypeDefinition(type);

      var _getTypeComputed2 = this.getTypeComputed(type),
          primary = _getTypeComputed2.primary,
          primaryKey = _getTypeComputed2.primaryKey,
          collection = _getTypeComputed2.collection,
          store = _getTypeComputed2.store,
          before = _getTypeComputed2.before;

      var nested = this.isNested(info);
      var currentPath = this.getCurrentPath(info);

      var _getRelations = this.getRelations(type, info),
          belongsTo = _getRelations.belongsTo,
          has = _getRelations.has;

      return _ref2 = {}, defineProperty(_ref2, this._extension, typeDef[this._extension]), defineProperty(_ref2, 'before', before), defineProperty(_ref2, 'collection', collection), defineProperty(_ref2, 'store', store), defineProperty(_ref2, 'fields', typeDef.fields), defineProperty(_ref2, 'primary', primary), defineProperty(_ref2, 'primaryKey', primaryKey), defineProperty(_ref2, 'nested', nested), defineProperty(_ref2, 'currentPath', currentPath), defineProperty(_ref2, 'belongsTo', belongsTo), defineProperty(_ref2, 'has', has), _ref2;
    }
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
        var type = isList && fieldType.length === 1 ? fieldType[0] : fieldType;
        var computed = _this4.getTypeComputed(type);
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
  }, {
    key: 'getTypeRelations',
    value: function getTypeRelations(type) {
      return _.get(this.getTypeComputed(type), 'relations');
    }
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
  }, {
    key: 'isNested',
    value: function isNested(info) {
      // support for current and previous graphql info objects
      var infoPath = _.get(info, 'path', []);
      return _.isArray(infoPath) ? infoPath.length > 1 : infoPath.prev !== undefined;
    }
  }, {
    key: 'updateArgsWithPrimary',
    value: function updateArgsWithPrimary(type, args) {
      var newArgs = _.cloneDeep(args);

      var _getTypeComputed3 = this.getTypeComputed(type),
          primary = _getTypeComputed3.primary,
          primaryKey = _getTypeComputed3.primaryKey;

      var pk = this.getPrimaryFromArgs(type, args);
      if (primary.length > 1 && _.without(pk, undefined).length === primary.length) {
        newArgs = _.merge(newArgs, defineProperty({}, primaryKey, pk));
      }
      return newArgs;
    }

    /******************************************************************
     * Installer methods
     ******************************************************************/

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
        return _.pickBy(_this5.definition.types, function (typeDef) {
          var computed = _.get(typeDef, _this5._extension + '.computed', {});
          return _.has(computed, 'collection') && _.has(computed, 'store');
        });
      };

      return Promise$1.map(canInit(), function (t, type) {
        var data = _.get(seedData, type, []);
        return _this5.initStore(type, rebuild, _.isArray(data) ? data : []);
      });
    }

    /******************************************************************
     * Getters
     ******************************************************************/

  }, {
    key: 'plugin',
    get: function get() {
      var _this6 = this;

      if (!this._plugin) {
        // remove the backend from non-object types
        this.definition.types = _.mapValues(this.definition.types, function (definition) {
          return definition.type === 'Object' ? definition : _.omit(definition, _this6._extension);
        });
        this._plugin = this.definition.plugin;
      }
      return this._plugin;
    }
  }, {
    key: 'lib',
    get: function get() {
      if (!this._lib) this._lib = this.factory.make(this.plugin);
      return this._lib;
    }
  }]);
  return GraphQLFactoryBaseBackend;
}(Events);

// gets relationships defined in the type definition and also
function getRelationFilter(backend, type, source, info, filter) {
  filter = filter || backend.getCollection(type);
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
function getArgsFilter(backend, type, args, filter) {
  filter = filter || backend.getCollection(backend);
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
function violatesUnique(backend, type, args, filter) {
  filter = filter || backend.getCollection(type);
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
function notThisRecord(backend, type, args, filter) {
  filter = filter || backend.getCollection(backend);

  var _backend$getTypeCompu2 = backend.getTypeComputed(type),
      primaryKey = _backend$getTypeCompu2.primaryKey;

  var id = backend.getPrimaryFromArgs(type, args);
  return filter.filter(function (obj) {
    return obj(primaryKey).ne(id);
  });
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

var Q = function (backend) {
  return new GraphQLFactoryBackendQueryBuilder(backend);
};

function create(backend, type) {
  return function (source, args) {
    var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var info = arguments[3];
    var r = backend.r,
        connection = backend.connection;

    var q = Q(backend);

    var _backend$getTypeInfo = backend.getTypeInfo(type, info),
        collection = _backend$getTypeInfo.collection,
        store = _backend$getTypeInfo.store,
        before = _backend$getTypeInfo.before;

    var table = r.db(store).table(collection);
    var beforeHook = _.get(before, 'backend_create' + type);

    // main query
    var query = function query() {
      var filter = violatesUnique(backend, type, args, table).branch(r.error('unique field violation'), q.type(type).insert(args, { exists: backend.getRelatedValues(type, args) }).value());

      // do the update
      return filter.run(connection);
    };

    // run before stub
    var resolveBefore = beforeHook(source, args, _.merge({}, { factory: this }, context), info);
    if (_.isPromise(resolveBefore)) return resolveBefore.then(query);
    return query();
  };
}

function read(backend, type) {
  return function (source, args) {
    var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var info = arguments[3];
    var r = backend.r,
        connection = backend.connection;

    var _backend$getTypeInfo = backend.getTypeInfo(type, info),
        collection = _backend$getTypeInfo.collection,
        store = _backend$getTypeInfo.store,
        before = _backend$getTypeInfo.before;

    var table = r.db(store).table(collection);

    var _getRelationFilter = getRelationFilter(backend, type, source, info, table),
        filter = _getRelationFilter.filter,
        many = _getRelationFilter.many;

    var beforeHook = _.get(before, 'backend_read' + type);

    // main query
    var query = function query() {
      // filter args
      filter = getArgsFilter(backend, type, args, filter);

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
    if (_.isPromise(resolveBefore)) return resolveBefore.then(query);
    return query();
  };
}

function update$1(backend, type) {
  return function (source, args) {
    var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var info = arguments[3];
    var r = backend.r,
        connection = backend.connection;

    var q = Q(backend);

    var _backend$getTypeInfo = backend.getTypeInfo(type, info),
        before = _backend$getTypeInfo.before;

    var table = backend.getCollection(type);
    var id = backend.getPrimaryFromArgs(type, args);
    var beforeHook = _.get(before, 'backend_update' + type);

    // main query
    var query = function query() {
      var notThis = notThisRecord(backend, type, args, table);
      return violatesUnique(backend, type, args, notThis).branch(r.error('unique field violation'), q.type(type).update(args, { exists: backend.getRelatedValues(type, args) }).do(function () {
        return q.type(type).get(id).value();
      }).value()).run(connection);
    };

    // run before stub
    var resolveBefore = beforeHook(source, args, _.merge({}, { factory: this }, context), info);
    if (_.isPromise(resolveBefore)) return resolveBefore.then(query);
    return query();
  };
}

function del(backend, type) {
  return function (source, args) {
    var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var info = arguments[3];

    var q = Q(backend);

    var _backend$getTypeInfo = backend.getTypeInfo(type, info),
        before = _backend$getTypeInfo.before;

    var beforeHook = _.get(before, 'backend_delete' + type);
    var query = function query() {
      return q.type(type).delete(args).run();
    };

    // run before stub
    var resolveBefore = beforeHook(source, args, _.merge({}, { factory: this }, context), info);
    if (_.isPromise(resolveBefore)) return resolveBefore.then(query);
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

// extended backend class for RethinkDB

var GraphQLFactoryRethinkDBBackend = function (_GraphQLFactoryBaseBa) {
  inherits(GraphQLFactoryRethinkDBBackend, _GraphQLFactoryBaseBa);

  function GraphQLFactoryRethinkDBBackend(namespace, graphql, factory, r, config, connection) {
    classCallCheck(this, GraphQLFactoryRethinkDBBackend);

    var _this = possibleConstructorReturn(this, (GraphQLFactoryRethinkDBBackend.__proto__ || Object.getPrototypeOf(GraphQLFactoryRethinkDBBackend)).call(this, namespace, graphql, factory, config, {
      create: create,
      read: read,
      update: update$1,
      delete: del
    }, initStore));

    _this.type = 'GraphQLFactoryRethinkDBBackend';

    // check for a top-level rethinkdb namespace
    if (!r) throw new Error('a rethinkdb or rethinkdbdash top-level namespace is required');

    // store database objects
    _this.r = r;
    _this._connection = connection;
    _this._defaultStore = 'test';

    // add values to the globals namespace
    _.merge(_this.definition.globals, defineProperty({}, namespace, { r: r, connection: connection }));

    // make the backend
    _this.make();
    return _this;
  }

  createClass(GraphQLFactoryRethinkDBBackend, [{
    key: 'getStore',
    value: function getStore(type) {
      var _getTypeComputed = this.getTypeComputed(type),
          store = _getTypeComputed.store;

      return this.r.db(store);
    }
  }, {
    key: 'getCollection',
    value: function getCollection(type) {
      var _getTypeComputed2 = this.getTypeComputed(type),
          store = _getTypeComputed2.store,
          collection = _getTypeComputed2.collection;

      return this.r.db(store).table(collection);
    }
  }]);
  return GraphQLFactoryRethinkDBBackend;
}(GraphQLFactoryBaseBackend);

var index = {
  GraphQLFactoryBaseBackend: GraphQLFactoryBaseBackend,
  GraphQLFactoryRethinkDBBackend: GraphQLFactoryRethinkDBBackend
};

exports.GraphQLFactoryBaseBackend = GraphQLFactoryBaseBackend;
exports.GraphQLFactoryRethinkDBBackend = GraphQLFactoryRethinkDBBackend;
exports['default'] = index;
