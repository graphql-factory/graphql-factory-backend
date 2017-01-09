'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var Events = _interopDefault(require('events'));
var _ = _interopDefault(require('lodash'));
var Promise$1 = _interopDefault(require('bluebird'));
var pluralize = require('pluralize');
var graphql = require('graphql');
var md5 = _interopDefault(require('md5'));

var GraphQLFactoryUnsubscribeResponse = {
  fields: {
    unsubscribed: {
      type: 'Boolean',
      nullable: false
    }
  }
};

var types = {
  GraphQLFactoryUnsubscribeResponse: GraphQLFactoryUnsubscribeResponse
};

var FactoryBackendDefinition = {
  types: types
};

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
var BATCH_CREATE = 'batchCreate';
var BATCH_UPDATE = 'batchUpdate';
var BATCH_DELETE = 'batchDelete';
var QUERY = 'query';
var MUTATION = 'mutation';
var SUBSCRIPTION = 'subscription';
var SUBSCRIBE = 'subscribe';
var UNSUBSCRIBE = 'unsubscribe';
var STRING = 'String';
var INT = 'Int';
var FLOAT = 'Float';
var BOOLEAN = 'Boolean';
var ID = 'ID';
var INPUT = 'Input';
var OBJECT = 'Object';
var SCALAR = 'Scalar';
var ENUM = 'Enum';
var PRIMITIVES = [STRING, INT, FLOAT, BOOLEAN, ID];

/**
 * Determines if the operation is a batch operation
 * @param {String} op - operation type
 * @return {Boolean}
 */
function isBatchOperation(op) {
  return _.includes([BATCH_CREATE, BATCH_UPDATE, BATCH_DELETE], op);
}

/**
 * Generates a schema operation object name
 * @param {String} schema - schema name
 * @param {String} op - operation type: QUERY || MUTATION || SUBSCRIPTION
 * @return {string}
 */
function makeObjectName(schema, op) {
  return 'backend' + _.capitalize(schema) + _.capitalize(op);
}

/**
 * Determines the primary key(s) for a type from its field definition
 * @param {Object} fields - field definition
 * @return {null|String|Array<String>}
 */
function getPrimary$1(fields) {
  var primary = _(fields).pickBy(function (v) {
    return v.primary === true;
  }).keys().value();
  return !primary.length ? null : primary.length === 1 ? primary[0] : primary;
}

/**
 * Extracts the type name, since a type name enclosed in an array means it is a list type
 * @param {String|Array<String>} type
 * @return {String}
 */
function getTypeName(type) {
  return _.isArray(type) ? _.first(type) : type;
}

/**
 * Determines if the type is a graphql primitive
 * @param {String} type
 * @return {Boolean}
 */
function isPrimitive(type) {
  if (_.isArray(type)) {
    if (type.length !== 1) return false;
    type = type[0];
  }
  return _.includes(PRIMITIVES, type);
}

/**
 * Gets the type from a field definition
 * @param {Object|String|Array<String>} fieldDef - field definition
 * @return {String|Array<String>}
 */
function getType(fieldDef) {
  if (_.isArray(fieldDef) && fieldDef.length === 1 || _.isString(fieldDef)) return fieldDef;else if (_.has(fieldDef, 'type')) return fieldDef.type;
}

/**
 * Ensures that the field definition is an Object with a type field
 * @param {Object|String|Array<String>} fieldDef
 * @return {Object}
 */
function makeFieldDef(fieldDef) {
  var def = _.merge({}, _.isObject(fieldDef) ? fieldDef : {});
  var type = getType(fieldDef);
  if (type) def.type = type;
  return def;
}

/**
 * Determines fields that should be unique. uniqueWith fields are grouped by the provided group name
 * @param {Object} fields - field definition
 * @return {Array}
 */
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
    return uniques.push(_.sortBy(compound, ['field']));
  });
  return _.uniq(uniques);
}

/**
 * GraphQL Factory Backend Compiler - updates the schema definition and generates resolvers
 * based on backend extension definition for each type
 */

var GraphQLFactoryBackendCompiler = function () {
  /**
   * Initializes the compiler
   * @param {GraphQLFactoryBackend} backend - instance of GraphQLFactoryBackend
   */
  function GraphQLFactoryBackendCompiler(backend) {
    classCallCheck(this, GraphQLFactoryBackendCompiler);

    this.backend = backend;
    this.defaultStore = backend._defaultStore;
    this.temporalExtension = backend._temporalExtension;
    this.extension = backend._extension;
    this.prefix = _.isString(backend._prefix) ? backend._prefix : '';
    this.definition = backend.definition;
  }

  /**
   * Compiles the definition and returns the compiler
   * @return {GraphQLFactoryBackendCompiler}
   */


  createClass(GraphQLFactoryBackendCompiler, [{
    key: 'compileDefinition',
    value: function compileDefinition() {
      this.definition.compile();
      return this;
    }

    /**
     * Performs the definition compile in a specific order
     * @return {GraphQLFactoryDefinition}
     */

  }, {
    key: 'compile',
    value: function compile() {
      return this.extendTemporal().addInputTypes().compileDefinition().computeExtension().buildRelations().buildQueries().buildMutations().buildSubscriptions().setListArgs().value();
    }

    /**
     * Returns the current definition value
     * @return {GraphQLFactoryDefinition}
     */

  }, {
    key: 'value',
    value: function value() {
      return this.definition;
    }

    /**
     * Adds input types for each object that has a collection backing it
     * @return {GraphQLFactoryBackendCompiler}
     */

  }, {
    key: 'addInputTypes',
    value: function addInputTypes() {
      var _this = this;

      _.forEach(this.definition.types, function (definition) {
        var type = definition.type;

        var _$get = _.get(definition, '["' + _this.extension + '"]', {}),
            collection = _$get.collection,
            table = _$get.table;

        if (collection || table) {
          if (!type) {
            definition.type = ['Object', 'Input'];
          } else if (_.isArray(type)) {
            if (!_.includes(type, 'Input')) type.push('Input');
          } else if (_.isObject(type)) {
            if (!_.has(type, 'Input')) type.Input = null;
          }
        }
      });

      return this;
    }

    /**
     * Extends the definition with temporal fields if using the GraphQLFactoryTemporal plugin
     * @return {GraphQLFactoryBackendCompiler}
     */

  }, {
    key: 'extendTemporal',
    value: function extendTemporal() {
      var _this2 = this;

      if (this.definition.hasPlugin('GraphQLFactoryTemporal')) {
        _.forEach(this.definition.types, function (typeDef, typeName) {
          var _$get2 = _.get(typeDef, '["' + _this2.temporalExtension + '"]', {}),
              versioned = _$get2.versioned,
              fork = _$get2.fork,
              branch = _$get2.branch,
              publish = _$get2.publish;

          if (versioned === true) {
            // extend the temporal fields
            typeDef.extendFields = typeDef.extendFields || [];
            typeDef.extendFields = _.isArray(typeDef.extendFields) ? typeDef.extendFields : [typeDef.extendFields];
            typeDef.extendFields = _.union(typeDef.extendFields, ['TemporalType']);

            // add version mutations
            if (fork !== false) {
              if (_.isString(fork)) {
                var forkFn = _.get(_this2.definition.functions, '["' + fork + '"]');
                if (!_.isFunction(forkFn)) throw new Error('cannot find function "' + fork + '"');
                fork = forkFn;
              } else if (fork === true || fork === undefined) {
                fork = 'forkTemporal' + typeName;
              } else if (_.isFunction(fork)) {
                fork = fork;
              } else {
                throw new Error('invalid value for fork resolve');
              }

              _.set(typeDef, '["' + _this2.extension + '"].mutation["fork' + typeName + '"]', {
                type: typeName,
                args: {
                  id: { type: 'String', nullable: 'false' },
                  name: { type: 'String', nullable: 'false' },
                  owner: { type: 'String' },
                  changeLog: { type: 'TemporalChangeLogInput' }
                },
                resolve: fork
              });
            }

            if (branch !== false) {
              if (_.isString(branch)) {
                var branchFn = _.get(_this2.definition.functions, '["' + branch + '"]');
                if (!_.isFunction(branchFn)) throw new Error('cannot find function "' + branch + '"');
                branch = branchFn;
              } else if (branch === true || branch === undefined) {
                branch = 'branchTemporal' + typeName;
              } else if (_.isFunction(branch)) {
                branch = branch;
              } else {
                throw new Error('invalid value for branch resolve');
              }

              _.set(typeDef, '["' + _this2.extension + '"].mutation["branch' + typeName + '"]', {
                type: typeName,
                args: {
                  id: { type: 'String', nullable: 'false' },
                  name: { type: 'String', nullable: 'false' },
                  owner: { type: 'String' },
                  changeLog: { type: 'TemporalChangeLogInput' }
                },
                resolve: branch
              });
            }

            if (publish !== false) {
              if (_.isString(publish)) {
                var publishFn = _.get(_this2.definition.functions, '["' + publish + '"]');
                if (!_.isFunction(publishFn)) throw new Error('cannot find function "' + publish + '"');
                publish = publishFn;
              } else if (publish === true || publish === undefined) {
                publish = 'publishTemporal' + typeName;
              } else if (_.isFunction(publish)) {
                publish = publish;
              } else {
                throw new Error('invalid value for publish resolve');
              }

              _.set(typeDef, '["' + _this2.extension + '"].mutation["publish' + typeName + '"]', {
                type: typeName,
                args: {
                  id: { type: 'String', nullable: 'false' },
                  version: { type: 'String' },
                  changeLog: { type: 'TemporalChangeLogInput' }
                },
                resolve: publish
              });
            }
          }
        });
      }
      return this;
    }

    /**
     * Calculates PrimaryKey, collection, store, uniques, etc for each type and stores it in the backend extension
     * @return {GraphQLFactoryBackendCompiler}
     */

  }, {
    key: 'computeExtension',
    value: function computeExtension() {
      var _this3 = this;

      _.forEach(this.definition.types, function (definition) {
        if (definition.type && definition.type !== OBJECT) {
          delete definition[_this3.extension];
          return;
        }

        var fields = _.get(definition, 'fields', {});
        var ext = _.get(definition, '["' + _this3.extension + '"]', {});
        var schema = ext.schema,
            table = ext.table,
            collection = ext.collection,
            store = ext.store,
            db = ext.db,
            mutation = ext.mutation,
            query = ext.query;


        if (!_.isObject(fields) || !_.isObject(ext)) return true;
        var computed = ext.computed = {};

        computed.collection = '' + _this3.prefix + (collection || table);
        computed.store = store || db || _this3.defaultStore;

        // check that the type has a schema identified, otherwise create a schema with the namespace
        // allow schemas to be an array so that queries/mutations can belong to multiple schemas
        computed.schemas = !schema ? [_this3.backend._namespace] : _.isArray(schema) ? schema : [schema];

        // get the primary key name
        var primary = computed.primary = getPrimary$1(fields);
        computed.primaryKey = ext.primaryKey || _.isArray(primary) ? _.camelCase(primary.join('-')) : primary;

        // get the uniques
        computed.uniques = computeUniques(fields);
        computed.before = {};
        computed.after = {};
      });

      // support chaining
      return this;
    }

    /**
     * Sets the appropriate query resolvers/hooks and adds any custom queries
     * @return {GraphQLFactoryBackendCompiler}
     */

  }, {
    key: 'buildQueries',
    value: function buildQueries() {
      var _this4 = this;

      _.forEach(this.definition.types, function (definition, typeName) {
        var _backend = _.get(definition, '["' + _this4.extension + '"]', {});
        var computed = _.get(_backend, 'computed', {});
        var query = _backend.query;
        var collection = computed.collection,
            schemas = computed.schemas;

        if (query === false || !collection) return;

        query = _.isObject(query) ? query : {};
        query.read = !query.read && query.read !== false ? true : query.read;

        // add properties for each schema type
        _.forEach(schemas, function (schema) {
          if (!schema) return true;

          var objName = makeObjectName(schema, QUERY);
          _.set(_this4.definition.schemas, '["' + schema + '"].query', objName);

          _.forEach(query, function (opDef, opName) {
            var type = opDef.type,
                args = opDef.args,
                resolve = opDef.resolve,
                before = opDef.before,
                after = opDef.after;

            var fieldName = opName === READ ? '' + opName + typeName : opName;
            var resolveName = _.isString(resolve) ? resolve : 'backend_' + fieldName;

            _.set(_this4.definition.types, '["' + objName + '"].fields["' + fieldName + '"]', {
              type: type || [typeName],
              args: args || _this4.buildArgs(definition, QUERY, typeName, opName),
              resolve: resolveName
            });

            if (opDef === true || !resolve) {
              _.set(_this4.definition, 'functions.' + resolveName, _this4.backend.readResolver(typeName));
            } else if (_.isFunction(resolve)) {
              _.set(_this4.definition, 'functions.' + resolveName, resolve);
            }

            // check for before and after hooks
            if (_.isFunction(before)) _.set(_backend, 'computed.before["' + resolveName + '"]', before);
            if (_.isFunction(after)) _.set(_backend, 'computed.after["' + resolveName + '"]', after);
          });
        });
      });

      // support chaining
      return this;
    }

    /**
     * Sets the appropriate mutation resolvers/hooks and adds any custom mutations
     * @return {GraphQLFactoryBackendCompiler}
     */

  }, {
    key: 'buildMutations',
    value: function buildMutations() {
      var _this5 = this;

      _.forEach(this.definition.types, function (definition, typeName) {
        var _backend = _.get(definition, '["' + _this5.extension + '"]', {});
        var computed = _.get(_backend, 'computed', {});
        var mutation = _backend.mutation;
        var collection = computed.collection,
            schemas = computed.schemas;

        if (mutation === false || !collection) return;

        mutation = _.isObject(mutation) ? mutation : {};

        // set single mutations
        mutation.create = !mutation.create && mutation.create !== false ? true : mutation.create;
        mutation.update = !mutation.update && mutation.update !== false ? true : mutation.update;
        mutation.delete = !mutation.delete && mutation.delete !== false ? true : mutation.delete;

        // set batch mutations
        mutation.batchCreate = !mutation.batchCreate && mutation.batchCreate !== false ? true : mutation.batchCreate;
        mutation.batchUpdate = !mutation.batchUpdate && mutation.batchUpdate !== false ? true : mutation.batchUpdate;
        mutation.batchDelete = !mutation.batchDelete && mutation.batchDelete !== false ? true : mutation.batchDelete;

        // add properties for each schema type
        _.forEach(schemas, function (schema) {
          if (!schema) return true;

          var objName = makeObjectName(schema, MUTATION);
          _.set(_this5.definition.schemas, '["' + schema + '"].mutation', objName);

          _.forEach(mutation, function (opDef, opName) {
            var type = opDef.type,
                args = opDef.args,
                resolve = opDef.resolve,
                before = opDef.before,
                after = opDef.after;

            var ops = [CREATE, UPDATE, DELETE, BATCH_CREATE, BATCH_UPDATE, BATCH_DELETE];
            var fieldName = _.includes(ops, opName) ? '' + opName + typeName : opName;
            var resolveName = _.isString(resolve) ? resolve : 'backend_' + fieldName;
            var isBatchOp = isBatchOperation(opName);

            _.set(_this5.definition.types, '["' + objName + '"].fields["' + fieldName + '"]', {
              type: opName === DELETE || opName === BATCH_DELETE ? BOOLEAN : type || isBatchOp ? [typeName] : typeName,
              args: args || _this5.buildArgs(definition, MUTATION, typeName, opName),
              resolve: resolveName
            });

            if (opDef === true || !resolve) {
              _.set(_this5.definition, 'functions.' + resolveName, _this5.backend[opName + 'Resolver'](typeName));
            } else if (_.isFunction(resolve)) {
              _.set(_this5.definition, 'functions.' + resolveName, resolve);
            }

            // check for before and after hooks
            if (_.isFunction(before)) _.set(_backend, 'computed.before["' + resolveName + '"]', before);
            if (_.isFunction(after)) _.set(_backend, 'computed.after["' + resolveName + '"]', after);
          });
        });
      });

      // support chaining
      return this;
    }

    /**
     * Creates pub-sub subscriptions for each type
     * @return {GraphQLFactoryBackendCompiler}
     */

  }, {
    key: 'buildSubscriptions',
    value: function buildSubscriptions() {
      var _this6 = this;

      _.forEach(this.definition.types, function (definition, typeName) {
        var _backend = _.get(definition, '["' + _this6.extension + '"]', {});
        var computed = _.get(_backend, 'computed', {});
        var subscription = _backend.subscription;
        var collection = computed.collection,
            schemas = computed.schemas;

        if (subscription === false || !collection) return;

        subscription = _.isObject(subscription) ? subscription : {};
        subscription.subscribe = !subscription.subscribe && subscription.subscribe !== false ? true : subscription.subscribe;
        subscription.unsubscribe = !subscription.unsubscribe && subscription.unsubscribe !== false ? true : subscription.unsubscribe;

        // add properties for each schema type
        _.forEach(schemas, function (schema) {
          if (!schema) return true;

          var objName = makeObjectName(schema, SUBSCRIPTION);
          _.set(_this6.definition.schemas, '["' + schema + '"].subscription', objName);

          _.forEach(subscription, function (opDef, opName) {
            var type = opDef.type,
                args = opDef.args,
                resolve = opDef.resolve,
                before = opDef.before,
                after = opDef.after;

            var ops = [SUBSCRIBE, UNSUBSCRIBE];
            var fieldName = _.includes(ops, opName) ? '' + opName + typeName : opName;
            var resolveName = _.isString(resolve) ? resolve : 'backend_' + fieldName;
            var returnType = opName === UNSUBSCRIBE ? 'GraphQLFactoryUnsubscribeResponse' : type ? type : [typeName];

            _.set(_this6.definition.types, '["' + objName + '"].fields["' + fieldName + '"]', {
              type: returnType,
              args: args || _this6.buildArgs(definition, SUBSCRIPTION, typeName, opName),
              resolve: resolveName
            });

            if (opDef === true || !resolve) {
              _.set(_this6.definition, 'functions.' + resolveName, _this6.backend[opName + 'Resolver'](typeName));
            } else if (_.isFunction(resolve)) {
              _.set(_this6.definition, 'functions.' + resolveName, resolve);
            }

            // check for before and after hooks
            if (_.isFunction(before)) _.set(_backend, 'computed.before["' + resolveName + '"]', before);
            if (_.isFunction(after)) _.set(_backend, 'computed.after["' + resolveName + '"]', after);
          });
        });
      });

      // support chaining
      return this;
    }

    /**
     * Generates relation data for each type that can be used during read queries
     * @return {GraphQLFactoryBackendCompiler}
     */

  }, {
    key: 'buildRelations',
    value: function buildRelations() {
      var _this7 = this;

      _.forEach(this.definition.types, function (definition, name) {
        var fields = _.get(definition, 'fields', {});
        var _backend = _.get(definition, '["' + _this7.extension + '"]', {});

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
                var foreignFieldDef = _.get(_this7.definition.types, '["' + type + '"].fields["' + field + '"]');
                _.set(_backend, 'computed.relations.belongsTo["' + type + '"]["' + field + '"]', {
                  primary: fieldName,
                  foreign: _.isString(key) ? key : _.get(key, 'foreignKey', 'id'),
                  many: _.isArray(getType(foreignFieldDef))
                });
              });
            });
          }

          // add a has relationship to the nested type. this is because the nested types resolve
          // will determine how it returns data
          if (has) {
            var relationPath = '["' + typeName + '"]["' + _this7.extension + '"].computed.relations';
            _.set(_this7.definition.types, relationPath + '.has["' + name + '"]["' + fieldName + '"]', {
              foreign: _.isString(has) ? has : _.get(has, 'foreignKey', 'id'),
              many: _.isArray(type)
            });
          }
        });
      });

      // support chaining
      return this;
    }

    /**
     * For each argument in a query that is not a primitive, add sub query args to the field
     * @return {GraphQLFactoryBackendCompiler}
     */

  }, {
    key: 'setListArgs',
    value: function setListArgs() {
      var _this8 = this;

      _.forEach(this.definition.types, function (typeDef, typeName) {
        var schema = _.get(typeDef, '["' + _this8.extension + '"].computed.schemas[0]');
        var name = makeObjectName(schema, QUERY);

        _.forEach(typeDef.fields, function (fieldDef, fieldName) {
          var fieldType = getType(fieldDef);

          if (name && _.isArray(fieldType) && fieldType.length === 1 && fieldDef.args === undefined) {
            var type = _.get(fieldType, '[0]');
            var field = _.get(_this8.definition.types, '["' + name + '"].fields["read' + type + '"]', {});

            if (field.resolve === 'backend_read' + type && _.isObject(field.args)) {
              _.set(_this8.definition.types, '["' + typeName + '"].fields["' + fieldName + '"].args', field.args);
            }
          }
        });
      });

      // support chaining
      return this;
    }

    /**
     * Determines if the type is versioned using the temporal plugin
     * @param typeDef
     * @return {boolean}
     */

  }, {
    key: 'isVersioned',
    value: function isVersioned(typeDef) {
      return _.get(typeDef, '["' + this.backend._temporalExtension + '"].versioned') === true;
    }

    /**
     * Generates an arguments object based on the type definition
     * @param {Object} definition - type definition
     * @param {String} operation - query || mutation || subscription
     * @param {String} rootName - name of the type for the current field
     * @param {String} opName - operation name
     * @return {Object}
     */

  }, {
    key: 'buildArgs',
    value: function buildArgs(definition, operation, rootName, opName) {
      var _this9 = this;

      var args = {};
      var fields = _.get(definition, 'fields', {});
      var _backend = _.get(definition, '["' + this.extension + '"]', {});

      if (operation === MUTATION && _.includes([BATCH_DELETE, BATCH_UPDATE, BATCH_CREATE], opName)) {
        return {
          batch: { type: [rootName + 'Input'], nullable: false }
        };
      }

      // unsubscribe default gets set args
      if (operation === SUBSCRIPTION && opName === UNSUBSCRIBE) {
        return {
          subscription: { type: 'String', nullable: false },
          subscriber: { type: 'String', nullable: false }
        };
      }

      if (operation === QUERY) args.limit = { type: 'Int' };
      if (operation === SUBSCRIPTION && opName === SUBSCRIBE) {
        args.subscriber = { type: 'String', nullable: false };
      }

      _.forEach(fields, function (fieldDef, fieldName) {
        var type = getType(fieldDef);
        if (!type) return true;
        var typeName = getTypeName(type);
        var typeDef = _.get(_this9.definition.types, '["' + typeName + '"]', {});
        var relations = _.get(typeDef, _this9.extension + '.computed.relations', {});
        fieldDef = fields[fieldName] = makeFieldDef(fieldDef);
        var nullable = operation === MUTATION ? fieldDef.nullable : true;

        // support protected fields which get removed from the args build
        if (fieldDef.protect === true && operation === MUTATION) return;

        // primitives get added automatically
        if (isPrimitive(type)) {
          args[fieldName] = { type: type, nullable: nullable };
        } else {
          var typeBackend = _.get(_this9.definition.types, '["' + typeName + '"]["' + _this9.extension + '"]');

          if (fieldDef.resolve !== false && operation === QUERY && typeBackend) {
            fieldDef.resolve = fieldDef.resolve || 'backend_read' + type;
          } else {
            // add args for related types
            if (_.has(relations, 'belongsTo["' + rootName + '"]["' + fieldName + '"]')) {
              args[fieldName] = { type: 'String', nullable: nullable };
            } else if (fieldDef.has) {
              args[fieldName] = { type: _.isArray(fieldDef.type) ? ['String'] : 'String', nullable: nullable };
            } else {
              // look for an input type
              if (typeDef.type !== ENUM) {
                if (typeDef.type === INPUT || typeDef.type === SCALAR) {
                  args[fieldName] = { type: type, nullable: nullable };
                } else {
                  var inputName = '' + typeName + INPUT;
                  var inputMatch = _.get(_this9.definition.types, '["' + inputName + '"]', {});

                  if (inputMatch.type === INPUT || inputMatch.type === SCALAR) {
                    args[fieldName] = { type: _.isArray(type) ? [inputName] : inputName, nullable: nullable };
                  } else {
                    console.warn('[backend warning]: calculation of type "' + rootName + '" argument "' + fieldName + '" could not find an input type and will not be added. please create type "' + inputName + '"');
                  }
                }
              } else {
                args[fieldName] = { type: type, nullable: nullable };
              }
            }
          }
        }
      });

      // check for versioned and set version specific args
      if (this.isVersioned(definition)) {
        delete args[this.temporalExtension];

        if (operation === QUERY) {
          args.id = { type: 'String' };
          args.version = { type: 'String' };
          args.recordId = { type: 'String' };
          args.date = { type: 'TemporalDateTime' };
        } else if (opName === CREATE) {
          args.useCurrent = { type: 'Boolean', defaultValue: false };
        } else if (opName === UPDATE) {
          args.useCurrent = { type: 'Boolean' };
        }
      }
      return args;
    }
  }]);
  return GraphQLFactoryBackendCompiler;
}();

// core modules
// npm modules
// local modules
/**
 * Base GraphQL Factory Backend
 * @extends Events
 */

var GraphQLFactoryBaseBackend = function (_Events) {
  inherits(GraphQLFactoryBaseBackend, _Events);

  /**
   *
   * @param {String} namespace - namespace to using in globals
   * @param {Object} graphql - instance of graphql
   * @param {Object} factory - instance of graphql-factory
   * @param {Object} config - configuration object
   * @param {String} [config.name="GraphQLFactoryBackend"] - plugin name
   * @param {String} [config.extension="_backend"] - plugin extension
   * @param {Object} [config.options] - options hash
   * @param {String} [config.options.store="test"] - default store name
   * @param {String} [config.options.prefix=""] - prefix for collections
   * @param {Array<String>|String} [config.plugin] - additional plugins to merge
   * @param {String} [config.temporalExtension="_temporal"] - temporal plugin extension
   * @param {Object} [config.globals] - Factory globals definition
   * @param {Object} [config.fields] - Factory fields definition
   * @param {Object} config.types - Factory types definition
   * @param {Object} [config.schemas] - Factory schemas definition
   * @param {Object} [config.functions] - Factory functions definition
   * @param {Object} [config.externalTypes] - Factory externalTypes definition
   * @param {Object} [config.installData] - Seed data
   *
   * @callback callback
   */
  function GraphQLFactoryBaseBackend(namespace, graphql$$1, factory, config) {
    classCallCheck(this, GraphQLFactoryBaseBackend);

    var _this = possibleConstructorReturn(this, (GraphQLFactoryBaseBackend.__proto__ || Object.getPrototypeOf(GraphQLFactoryBaseBackend)).call(this));

    var name = config.name,
        extension = config.extension,
        plugin = config.plugin,
        options = config.options,
        temporalExtension = config.temporalExtension,
        globals = config.globals,
        types = config.types,
        installData = config.installData;

    var _ref = options || {},
        prefix = _ref.prefix;

    // check for required properties


    if (!_.isString(namespace)) throw new Error('a namespace is required');
    if (!graphql$$1) throw new Error('an instance of graphql is required');
    if (!factory) throw new Error('an instance of graphql-factory is required');
    if (!_.isObject(types)) throw new Error('no types were found in the configuration');

    // set props
    _this.type = 'GraphQLFactoryBaseBackend';
    _this.graphql = graphql$$1;
    _this.GraphQLError = graphql$$1.GraphQLError;
    _this.factory = factory(graphql$$1);
    _this.name = name || 'GraphQLFactoryBackend';
    _this.options = options || {};
    _this.queries = {};

    /*
     * Subscription objects should be keyed on their hashed query value
     * they should also keep track of how many users are subscribed so that
     * when all users unsubscribe, the subscription can be removed
     */
    _this.subscriptions = {};

    // create a definition
    _this.definition = new factory.GraphQLFactoryDefinition(config, { plugin: plugin });
    _this.definition.merge({ globals: defineProperty({}, namespace, config) });
    _this.definition.merge(FactoryBackendDefinition);

    // set non-overridable properties
    _this._extension = extension || '_backend';
    _this._temporalExtension = temporalExtension || '_temporal';
    _this._namespace = namespace;
    _this._prefix = _.isString(prefix) ? prefix : '';
    _this._defaultStore = _.get(config, 'options.store', 'test');
    _this._installData = installData || {};
    _this._lib = null;
    _this._plugin = null;

    // add the backend to the globals
    _.set(_this.definition, 'globals["' + _this._extension + '"]', _this);
    return _this;
  }

  /**
   * Compiled the backend
   * @private
   */


  createClass(GraphQLFactoryBaseBackend, [{
    key: '_compile',
    value: function _compile() {
      var compiler = new GraphQLFactoryBackendCompiler(this);
      compiler.compile();
    }

    /**
     * Overridable make method, can accept a callback and returns a promise
     * This should be used in the event your code requires some additional async
     * code to be performed before considering the backend created
     * @param callback
     */

  }, {
    key: 'make',
    value: function make() {
      var _this2 = this;

      var callback = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function () {
        return true;
      };

      return new Promise$1(function (resolve, reject) {
        try {
          _this2._compile();
          callback(null, _this2);
          return resolve(_this2);
        } catch (error) {
          callback(error);
          return reject(error);
        }
      });
    }

    /******************************************************************
     * Methods that should be overriden when extended
     ******************************************************************/

  }, {
    key: 'now',
    value: function now(callback) {
      throw new Error('the now method has not been overriden on the backend');
    }
  }, {
    key: 'createResolver',
    value: function createResolver() {
      throw new Error('the createResolver method has not been overriden on the backend');
    }
  }, {
    key: 'readResolver',
    value: function readResolver() {
      throw new Error('the readResolver method has not been overriden on the backend');
    }
  }, {
    key: 'updateResolver',
    value: function updateResolver() {
      throw new Error('the updateResolver method has not been overriden on the backend');
    }
  }, {
    key: 'deleteResolver',
    value: function deleteResolver() {
      throw new Error('the deleteResolver method has not been overriden on the backend');
    }
  }, {
    key: 'batchCreateResolver',
    value: function batchCreateResolver() {
      throw new Error('the batchCreateResolver method has not been overriden on the backend');
    }
  }, {
    key: 'batchUpdateResolver',
    value: function batchUpdateResolver() {
      throw new Error('the batchUpdateResolver method has not been overriden on the backend');
    }
  }, {
    key: 'batchDeleteResolver',
    value: function batchDeleteResolver() {
      throw new Error('the batchDeleteResolver method has not been overriden on the backend');
    }
  }, {
    key: 'subscribeResolver',
    value: function subscribeResolver() {
      throw new Error('the subscribeResolver method has not been overriden on the backend');
    }
  }, {
    key: 'unsubscribeResolver',
    value: function unsubscribeResolver() {
      throw new Error('the unsubscribeResolver method has not been overriden on the backend');
    }
  }, {
    key: 'getStore',
    value: function getStore() {
      throw new Error('the getStore method has not been overriden on the backend');
    }
  }, {
    key: 'getCollection',
    value: function getCollection() {
      throw new Error('the getCollection method has not been overriden on the backend');
    }
  }, {
    key: 'initStore',
    value: function initStore() {
      throw new Error('the initStore method has not been overriden on the backend');
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
      var _this3 = this;

      _.forEach(functions, function (fn, name) {
        return _this3.addFunction(fn, name);
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
      var _this4 = this;

      _.forEach(queries, function (fn, name) {
        return _this4.addQuery(fn, name);
      });
    }
  }, {
    key: 'addQuery',
    value: function addQuery(fn, name) {
      if (_.isString(name) && _.isFunction(fn)) _.set(this.queries, name, fn.bind(this));
    }
  }, {
    key: 'asError',
    value: function asError(err) {
      return err instanceof Error ? err : new Error(err);
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
          primary = _getTypeComputed.primary,
          primaryKey = _getTypeComputed.primaryKey;

      if (!primary || !primaryKey) throw 'Unable to obtain primary';
      if (_.has(args, '[' + primaryKey + '"]')) return args[primaryKey];
      var pk = _.map(_.isArray(primary) ? primary : [primary], function (k) {
        return _.get(args, k);
      });
      return pk.length === 1 ? pk[0] : pk;
    }
  }, {
    key: 'getRelations',
    value: function getRelations(type, info) {
      var relations = this.getTypeRelations(type);
      var parentType = this.getParentType(info);
      var cpath = this.getCurrentPath(info);
      var belongsTo = _.get(relations, 'belongsTo["' + parentType.name + '"]["' + cpath + '"]', {});
      var has = _.get(relations, 'has["' + parentType.name + '"]["' + cpath + '"]', {});
      return { has: has, belongsTo: belongsTo };
    }
  }, {
    key: 'getTypeBackend',
    value: function getTypeBackend(type) {
      return _.get(this.definition.types, '["' + type + '"]["' + this._extension + '"]');
    }
  }, {
    key: 'getTypeComputed',
    value: function getTypeComputed(type) {
      return _.get(this.definition.types, '["' + type + '"]["' + this._extension + '"]computed');
    }
  }, {
    key: 'getTypeDefinition',
    value: function getTypeDefinition(type) {
      return _.get(this.definition.types, '["' + type + '"]', {});
    }
  }, {
    key: 'getTypeFields',
    value: function getTypeFields(type) {
      return _.get(this.definition.types, '["' + type + '"].fields');
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
          before = _getTypeComputed2.before,
          after = _getTypeComputed2.after,
          timeout = _getTypeComputed2.timeout;

      var nested = this.isNested(info);
      var currentPath = this.getCurrentPath(info);

      var _getRelations = this.getRelations(type, info),
          belongsTo = _getRelations.belongsTo,
          has = _getRelations.has;

      return _ref2 = {}, defineProperty(_ref2, this._extension, typeDef[this._extension]), defineProperty(_ref2, 'before', before), defineProperty(_ref2, 'after', after), defineProperty(_ref2, 'timeout', timeout), defineProperty(_ref2, 'collection', collection), defineProperty(_ref2, 'store', store), defineProperty(_ref2, 'fields', typeDef.fields), defineProperty(_ref2, 'primary', primary), defineProperty(_ref2, 'primaryKey', primaryKey), defineProperty(_ref2, 'nested', nested), defineProperty(_ref2, 'currentPath', currentPath), defineProperty(_ref2, 'belongsTo', belongsTo), defineProperty(_ref2, 'has', has), _ref2;
    }
  }, {
    key: 'getRequestFields',
    value: function getRequestFields(type, info) {
      var _this5 = this;

      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      var maxDepth = options.maxDepth,
          includeRelated = options.includeRelated;

      var _getTypeDefinition = this.getTypeDefinition(type),
          fields = _getTypeDefinition.fields;

      var fieldNode = _.first(_.filter(info.fieldNodes || info.fieldASTs, function (node) {
        return _.get(node, 'name.value') === info.fieldName;
      }));
      includeRelated = _.isBoolean(includeRelated) ? includeRelated : true;

      // parses the selection set recursively building a REQL style pluck filter
      var parseSelection = function parseSelection(selectionSet, level) {
        var obj = {};
        level += 1;

        _.forEach(selectionSet.selections, function (selection) {
          var name = _.get(selection, 'name.value');
          var fieldType = _.get(fields, '["' + name + '"].type');
          var fieldTypeName = _.isArray(fieldType) ? _.first(fieldType) : fieldType;
          var isRelation = _.has(_this5.definition.getType(fieldTypeName), '["' + _this5._extension + '"].computed.collection');

          // check relation
          if (!isRelation || isRelation && includeRelated) {
            if (!selection.selectionSet) {
              obj[name] = true;
            } else {
              obj[name] = _.isNumber(maxDepth) && level >= maxDepth ? true : parseSelection(selection.selectionSet, level);
            }
          }
        });
        return obj;
      };

      // call parse on main field node selection set with an inital level of 0
      return fieldNode.selectionSet ? parseSelection(fieldNode.selectionSet, 0) : {};
    }
  }, {
    key: 'getRelatedValues',
    value: function getRelatedValues(type, args) {
      var _this6 = this;

      var values = [];

      var _getTypeDefinition2 = this.getTypeDefinition(type),
          fields = _getTypeDefinition2.fields;

      _.forEach(args, function (arg, name) {
        var fieldDef = _.get(fields, name, {});
        var related = _.has(fieldDef, 'has') || _.has(fieldDef, 'belongsTo');
        var fieldType = _.get(fieldDef, 'type', fieldDef);
        var isList = _.isArray(fieldType);
        var type = isList && fieldType.length === 1 ? fieldType[0] : fieldType;
        var computed = _this6.getTypeComputed(type);
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
      var _this7 = this;

      if (!_.isBoolean(rebuild)) {
        seedData = _.isObject(rebuild) ? rebuild : {};
        rebuild = false;
      }

      // only init definitions with a collection and store specified
      var canInit = function canInit() {
        return _.keys(_.pickBy(_this7.definition.types, function (typeDef) {
          var computed = _.get(typeDef, _this7._extension + '.computed', {});
          return _.has(computed, 'collection') && _.has(computed, 'store');
        }));
      };

      return Promise$1.map(canInit(), function (type) {
        var data = _.get(seedData, type, []);
        return _this7.initStore(type, rebuild, _.isArray(data) ? data : []);
      }).then(function (res) {
        return res;
      }).catch(function (err) {
        console.error(err);
        return Promise$1.reject(err);
      });
    }

    /******************************************************************
     * Getters
     ******************************************************************/

  }, {
    key: 'plugin',
    get: function get() {
      var _this8 = this;

      if (!this._plugin) {
        // remove the backend from non-object types
        this.definition.types = _.mapValues(this.definition.types, function (definition) {
          return definition.type === 'Object' ? definition : _.omit(definition, _this8._extension);
        });
        this._plugin = _.merge({}, this.definition.plugin, { name: this.name });
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
      var isBatch = _.isArray(args);
      args = isBatch ? args : args ? [args] : [];

      // reduce the exists selection to a flat list of unique values
      var exists = _.reduce(_.flatten(_.isArray(options.exists) ? options.exists : []), function (result, value) {
        return _.find(result, value) ? result : _.union(result, [value]);
      }, []);

      this._value = r.expr(exists).prepend(true).reduce(function (prev, cur) {
        return prev.and(r.db(cur('store')).table(cur('collection')).get(cur('id')).ne(null));
      }).not().branch(throwErrors ? r.error('one or more related records were not found') : null, table.insert(args, { returnChanges: true }).pluck('errors', 'first_error', 'changes').do(function (summary) {
        return summary('errors').ne(0).branch(r.error(summary('first_error')), summary('changes')('new_val'));
      }).do(function (changes) {
        return r.branch(changes.count().ne(args.length), r.error('only created ' + changes.count() + ' of ' + args.length + ' requested records'), r.expr(isBatch), changes, changes.nth(0));
      }));
      return this;
    }
  }, {
    key: 'update',
    value: function update(args) {
      var _this = this;

      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var r = this._r;
      var table = this._collection;
      var throwErrors = options.throwErrors === false ? false : true;
      var isBatch = _.isArray(args);

      var _b$getTypeComputed = this._b.getTypeComputed(this._type),
          primaryKey = _b$getTypeComputed.primaryKey;

      args = isBatch ? args : args ? [args] : [];

      var id = isBatch ? _.map(function (arg) {
        return _this._b.getPrimaryFromArgs(_this._type, arg);
      }) : [this._b.getPrimaryFromArgs(this._type, args)];

      // reduce the exists selection to a flat list of unique values
      var exists = _.reduce(_.flatten(_.isArray(options.exists) ? options.exists : []), function (result, value) {
        return _.find(result, value) ? result : _.union(result, [value]);
      }, []);

      this._value = r.expr(exists).prepend(true).reduce(function (prev, cur) {
        return prev.and(r.db(cur('store')).table(cur('collection')).get(cur('id')).ne(null));
      }).not().branch(throwErrors ? r.error('one or more related records were not found') : null, r.expr(args).forEach(function (arg) {
        return table.get(arg(primaryKey)).eq(null).branch(r.error(_this._type + ' with id ' + arg(primaryKey) + ' was not found, and could not be updated'), table.get(arg(primaryKey)).update(arg, { returnChanges: true }));
      }).pluck('errors', 'first_error').do(function (summary) {
        return summary('errors').ne(0).branch(r.error(summary('first_error')), r.filter(function (f) {
          return r.expr(id).contains(f(primaryKey));
        }).coerceTo('ARRAY').do(function (results) {
          return r.expr(isBatch).branch(results, results.nth(0));
        }));
      }));
      return this;
    }
  }, {
    key: 'delete',
    value: function _delete(args) {
      var _this2 = this;

      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var r = this._r;
      var table = this._collection;
      var throwErrors = options.throwErrors === false ? false : true;
      var isBatch = _.isArray(args);
      args = isBatch ? args : args ? [args] : [];

      var ids = isBatch ? _.map(function (arg) {
        return _this2._b.getPrimaryFromArgs(_this2._type, arg);
      }) : [this._b.getPrimaryFromArgs(this._type, args)];

      this._value = r.expr(ids).forEach(function (id) {
        return table.get(id).eq(null).branch(r.error(_this2._type + ' with id ' + id + ' was not found and cannot be deleted'), table.get(id).delete({ returnChanges: true }));
      }).pluck('errors', 'first_error').do(function (summary) {
        return summary('errors').ne(0).branch(r.error(summary('first_error')), true);
      });
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

function reqlPath(base, pathStr) {
  _.forEach(_.toPath(pathStr), function (p) {
    base = base(p);
  });
  return base;
}

// gets relationships defined in the type definition and also
function getRelationFilter(backend, type, source, info, filter) {
  filter = filter || backend.getCollection(type);

  // temporal plugin details
  var r = backend.r,
      definition = backend.definition,
      _temporalExtension = backend._temporalExtension;

  var temporalDef = _.get(definition, 'types["' + type + '"]["' + _temporalExtension + '"]', {});
  var versioned = temporalDef.versioned,
      readMostCurrent = temporalDef.readMostCurrent;

  var isVersioned = Boolean(versioned) && definition.hasPlugin('GraphQLFactoryTemporal');
  var date = _.get(info, 'rootValue["' + _temporalExtension + '"].date', null);
  var temporalFilter = _.get(this, 'globals["' + _temporalExtension + '"].temporalFilter');
  var temporalArgs = {};
  var versionArgs = _.get(source, 'versionArgs');
  if (date) temporalArgs.date = date;
  temporalArgs = _.isEmpty(versionArgs) ? temporalArgs : versionArgs;

  // standard plugin details
  var id = null;
  var many = true;

  var _backend$getTypeInfo = backend.getTypeInfo(type, info),
      fields = _backend$getTypeInfo.fields,
      nested = _backend$getTypeInfo.nested,
      currentPath = _backend$getTypeInfo.currentPath,
      belongsTo = _backend$getTypeInfo.belongsTo,
      has = _backend$getTypeInfo.has;

  // check for nested relations


  if (nested) {
    // check for belongsTo relation
    if (_.has(fields, belongsTo.primary) && (_.has(source, belongsTo.foreign) || isVersioned && has.foreign === _temporalExtension + '.recordId')) {
      many = belongsTo.many;

      // get the relates source id(s)
      id = _.get(source, belongsTo.foreign);

      // if there is no has id, or the hasId is an empty array, return an empty array
      if (!id || _.isArray(id) && !id.length) return { filter: r.expr([]), many: many };

      // if versioned filter the correct versions
      filter = isVersioned && belongsTo.foreign === _temporalExtension + '.recordId' ? temporalFilter(type, temporalArgs) : filter;

      filter = filter.filter(function (rec) {
        return reqlPath(rec, belongsTo.primary).eq(id);
      });
    }

    // check for has
    else if (_.has(fields, has.foreign) || isVersioned && has.foreign === _temporalExtension + '.recordId') {
        many = has.many;

        // get the related source id(s)
        id = _.get(source, currentPath);

        // if there is no has id, or the hasId is an empty array, return an empty array
        if (!id || _.isArray(id) && !id.length) return { filter: r.expr([]), many: many };

        // if versioned filter the correct versions
        filter = isVersioned && has.foreign === _temporalExtension + '.recordId' ? filter = temporalFilter(type, temporalArgs) : filter;

        filter = many ? filter.filter(function (rec) {
          return r.expr(id).contains(reqlPath(rec, has.foreign));
        }) : filter.filter(function (rec) {
          return reqlPath(rec, has.foreign).eq(id);
        });
      }
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

  var unique = _.isArray(args) ? _.map(function (arg) {
    return backend.getUniqueArgs(type, args);
  }) : [backend.getUniqueArgs(type, args)];

  var uniqueViolation = _.reduce(unique, function (result, value) {
    return result && _.filter(unique, value).length > 1;
  }, true);

  if (uniqueViolation) return r.error('unique field violation');

  if (unique.length) {
    return filter.filter(function (obj) {
      return r.expr(unique).prepend(true).reduce(function (prevArg, arg) {
        return prevArg.and(arg.prepend(true).reduce(function (prevUniq, uniq) {
          return prevUniq.and(uniq.prepend(true).reduce(function (prevField, field) {
            return prevField.and(field('type').eq('String').branch(obj(field('field')).match(r.add('(?i)^', field('value'), '$')), obj(field('field')).eq(field('value'))));
          }));
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

var filter$1 = {
  getRelationFilter: getRelationFilter,
  getArgsFilter: getArgsFilter,
  violatesUnique: violatesUnique,
  notThisRecord: notThisRecord
};

function create(backend, type) {
  var batchMode = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  // temporal plugin details
  var hasTemporalPlugin = backend.definition.hasPlugin('GraphQLFactoryTemporal');
  var temporalExt = backend._temporalExtension;
  var typeDef = _.get(backend.definition, 'types["' + type + '"]');
  var temporalDef = _.get(typeDef, '["' + temporalExt + '"]');
  var isVersioned = _.get(temporalDef, 'versioned') === true;

  return function (source, args) {
    var _this = this;

    var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var info = arguments[3];
    var r = backend.r,
        connection = backend.connection,
        definition = backend.definition;

    var _backend$getTypeInfo = backend.getTypeInfo(type, info),
        before = _backend$getTypeInfo.before,
        after = _backend$getTypeInfo.after,
        timeout = _backend$getTypeInfo.timeout;

    var q = Q(backend);
    var collection = backend.getCollection(type);
    var fnPath = 'backend_' + (batchMode ? 'batchC' : 'c') + 'reate' + type;
    var beforeHook = _.get(before, fnPath, function (args, backend, done) {
      return done();
    });
    var afterHook = _.get(after, fnPath, function (result, args, backend, done) {
      return done(null, result);
    });
    args = batchMode ? args.batch : args;

    return new Promise$1(function (resolve, reject) {
      return beforeHook.call(_this, { source: source, args: args, context: context, info: info }, backend, function (err) {
        if (err) return reject(err);
        var create = null;

        // handle temporal plugin
        if (hasTemporalPlugin && isVersioned) {
          if (temporalDef.create === false) return reject(new Error('create is not allowed on this temporal type'));
          if (_.isFunction(temporalDef.create)) {
            return resolve(temporalDef.create.call(_this, source, args, context, info));
          } else if (_.isString(temporalDef.create)) {
            var temporalCreate = _.get(definition, 'functions["' + temporalDef.create + '"]');
            if (!_.isFunction(temporalCreate)) {
              return reject(new Error('cannot find function "' + temporalDef.create + '"'));
            }
            return resolve(temporalCreate.call(_this, source, args, context, info));
          } else {
            var versionCreate = _.get(_this, 'globals["' + temporalExt + '"].temporalCreate');
            if (!_.isFunction(versionCreate)) {
              return reject(new Error('could not find "temporalCreate" in globals'));
            }
            create = batchMode ? versionCreate(type, args).coerceTo('ARRAY') : versionCreate(type, args).coerceTo('ARRAY').nth(0);
          }
        } else {
          create = violatesUnique(backend, type, args, collection).branch(r.error('unique field violation'), q.type(type).insert(args, {
            exists: _.isArray(args) ? _.map(function (args) {
              return backend.getRelatedValues(type, arg);
            }) : [backend.getRelatedValues(type, args)]
          }).value());
        }

        return create.run(connection).then(function (result) {
          return afterHook.call(_this, result, args, backend, function (err, result) {
            if (err) return reject(err);
            return resolve(result);
          });
        }).catch(reject);
      });
    }).timeout(timeout || 10000);
  };
}

function read(backend, type) {
  return function (source, args) {
    var _this = this;

    var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var info = arguments[3];
    var r = backend.r,
        connection = backend.connection,
        definition = backend.definition,
        asError = backend.asError,
        _temporalExtension = backend._temporalExtension;

    // temporal plugin details

    var temporalDef = _.get(definition, 'types["' + type + '"]["' + _temporalExtension + '"]', {});
    var versioned = temporalDef.versioned,
        readMostCurrent = temporalDef.readMostCurrent;

    var isVersioned = Boolean(versioned) && definition.hasPlugin('GraphQLFactoryTemporal');

    // type details

    var _backend$getTypeInfo = backend.getTypeInfo(type, info),
        before = _backend$getTypeInfo.before,
        after = _backend$getTypeInfo.after,
        timeout = _backend$getTypeInfo.timeout,
        nested = _backend$getTypeInfo.nested;

    var temporalMostCurrent = _.get(this, 'globals["' + _temporalExtension + '"].temporalMostCurrent');
    var collection = backend.getCollection(type);

    // add the date argument to the rootValue
    if (isVersioned) {
      _.set(info, 'rootValue["' + _temporalExtension + '"].date', args.date);
    }

    var _getRelationFilter$ca = getRelationFilter.call(this, backend, type, source, info, collection),
        filter = _getRelationFilter$ca.filter,
        many = _getRelationFilter$ca.many;

    var fnPath = 'backend_read' + type;
    var beforeHook = _.get(before, fnPath, function (args, backend, done) {
      return done();
    });
    var afterHook = _.get(after, fnPath, function (result, args, backend, done) {
      return done(null, result);
    });

    // handle basic read
    return new Promise$1(function (resolve, reject) {
      return beforeHook.call(_this, { source: source, args: args, context: context, info: info }, backend, function (err) {
        if (err) return reject(asError(err));

        // handle temporal plugin
        if (isVersioned && !nested) {
          if (temporalDef.read === false) return reject(new Error('read is not allowed on this temporal type'));
          if (_.isFunction(temporalDef.read)) {
            return resolve(temporalDef.read.call(_this, source, args, context, info));
          } else if (_.isString(temporalDef.read)) {
            var temporalRead = _.get(definition, 'functions["' + temporalDef.read + '"]');
            if (!_.isFunction(temporalRead)) {
              return reject(new Error('cannot find function "' + temporalDef.read + '"'));
            }
            return resolve(temporalRead.call(_this, source, args, context, info));
          } else {
            if (!_.keys(args).length && readMostCurrent === true) {
              filter = temporalMostCurrent(type);
            } else {
              var versionFilter = _.get(_this, 'globals["' + _temporalExtension + '"].temporalFilter');
              if (!_.isFunction(versionFilter)) {
                return reject(new Error('could not find "temporalFilter" in globals'));
              }
              filter = versionFilter(type, args);
              args = _.omit(args, ['version', 'recordId', 'date', 'id']);
            }
          }
        }

        filter = getArgsFilter(backend, type, args, filter);

        // add standard query modifiers
        if (_.isNumber(args.limit)) filter = filter.limit(args.limit);

        // if not a many relation, return only a single result or null
        if (!many) {
          filter = filter.coerceTo('array').do(function (objs) {
            return objs.count().eq(0).branch(r.expr(null), r.expr(objs).nth(0));
          });
        }

        return filter.run(connection).then(function (result) {
          return afterHook.call(_this, result, args, backend, function (err, result) {
            if (err) return reject(asError(err));
            return resolve(result);
          });
        }).catch(function (err) {
          return reject(asError(err));
        });
      });
    }).timeout(timeout || 10000);
  };
}

function update$1(backend, type) {
  var batchMode = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  // temporal plugin details
  var hasTemporalPlugin = backend.definition.hasPlugin('GraphQLFactoryTemporal');
  var temporalExt = backend._temporalExtension;
  var typeDef = _.get(backend.definition, 'types["' + type + '"]');
  var temporalDef = _.get(typeDef, '["' + temporalExt + '"]');
  var isVersioned = _.get(temporalDef, 'versioned') === true;

  return function (source, args) {
    var _this = this;

    var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var info = arguments[3];
    var r = backend.r,
        connection = backend.connection,
        definition = backend.definition;

    var _backend$getTypeInfo = backend.getTypeInfo(type, info),
        before = _backend$getTypeInfo.before,
        after = _backend$getTypeInfo.after,
        timeout = _backend$getTypeInfo.timeout,
        primaryKey = _backend$getTypeInfo.primaryKey;

    var q = Q(backend);
    var collection = backend.getCollection(type);
    var fnPath = 'backend_' + (batchMode ? 'batchU' : 'u') + 'pdate' + type;
    var beforeHook = _.get(before, fnPath, function (args, backend, done) {
      return done();
    });
    var afterHook = _.get(after, fnPath, function (result, args, backend, done) {
      return done(null, result);
    });
    args = batchMode ? args.batch : args;
    var argArr = _.isArray(args) ? args : [args];

    var ids = _.map(_.filter(argArr, primaryKey), primaryKey);
    if (ids.length !== argArr.length) return r.error('missing primary key on one or more inputs');

    return new Promise$1(function (resolve, reject) {
      return beforeHook.call(_this, { source: source, args: args, context: context, info: info }, backend, function (err) {
        if (err) return reject(err);
        var update = null;

        // handle temporal plugin
        if (hasTemporalPlugin && isVersioned) {
          if (temporalDef.update === false) return reject(new Error('update is not allowed on this temporal type'));
          if (_.isFunction(temporalDef.update)) {
            return resolve(temporalDef.update.call(_this, source, args, context, info));
          } else if (_.isString(temporalDef.update)) {
            var temporalUpdate = _.get(definition, 'functions["' + temporalDef.update + '"]');
            if (!_.isFunction(temporalUpdate)) {
              return reject(new Error('cannot find function "' + temporalDef.update + '"'));
            }
            return resolve(temporalUpdate.call(_this, source, args, context, info));
          } else {
            var versionUpdate = _.get(_this, 'globals["' + temporalExt + '"].temporalUpdate');
            if (!_.isFunction(versionUpdate)) {
              return reject(new Error('could not find "temporalUpdate" in globals'));
            }
            update = batchMode ? versionUpdate(type, args).coerceTo('ARRAY') : versionUpdate(type, args).coerceTo('ARRAY').nth(0);
          }
        } else {
          var notThis = collection.filter(function (f) {
            return r.expr(ids).contains(f(primaryKey)).not();
          });

          update = violatesUnique(backend, type, args, notThis).branch(r.error('unique field violation'), q.type(type).update(args, {
            exists: _.isArray(args) ? _.map(function (args) {
              return backend.getRelatedValues(type, arg);
            }) : [backend.getRelatedValues(type, args)]
          }).value());
        }

        return update.run(connection).then(function (result) {
          return afterHook.call(_this, result, args, backend, function (err, result) {
            if (err) return reject(err);
            return resolve(result);
          });
        }).catch(reject);
      });
    }).timeout(timeout || 10000);
  };
}

function del(backend, type) {
  var batchMode = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  // temporal plugin details
  var hasTemporalPlugin = backend.definition.hasPlugin('GraphQLFactoryTemporal');
  var temporalExt = backend._temporalExtension;
  var typeDef = _.get(backend.definition, 'types["' + type + '"]');
  var temporalDef = _.get(typeDef, '["' + temporalExt + '"]');
  var isVersioned = _.get(temporalDef, 'versioned') === true;

  return function (source, args) {
    var _this = this;

    var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var info = arguments[3];
    var connection = backend.connection,
        definition = backend.definition;

    var _backend$getTypeInfo = backend.getTypeInfo(type, info),
        before = _backend$getTypeInfo.before,
        after = _backend$getTypeInfo.after,
        timeout = _backend$getTypeInfo.timeout;

    var q = Q(backend);
    var fnPath = 'backend_' + (batchMode ? 'batchD' : 'd') + 'elete' + type;
    var beforeHook = _.get(before, fnPath, function (args, backend, done) {
      return done();
    });
    var afterHook = _.get(after, fnPath, function (result, args, backend, done) {
      return done(null, result);
    });
    args = batchMode ? args.batch : args;

    return new Promise$1(function (resolve, reject) {
      return beforeHook.call(_this, { source: source, args: args, context: context, info: info }, backend, function (err) {
        if (err) return reject(err);
        var del = null;

        // handle temporal plugin
        if (hasTemporalPlugin && isVersioned) {
          if (temporalDef.delete === false) return reject(new Error('delete is not allowed on this temporal type'));
          if (_.isFunction(temporalDef.delete)) {
            return resolve(temporalDef.delete.call(_this, source, args, context, info));
          } else if (_.isString(temporalDef.delete)) {
            var temporalDelete = _.get(definition, 'functions["' + temporalDef.delete + '"]');
            if (!_.isFunction(temporalDelete)) {
              return reject(new Error('cannot find function "' + temporalDef.delete + '"'));
            }
            return resolve(temporalDelete.call(_this, source, args, context, info));
          } else {
            var versionDelete = _.get(_this, 'globals["' + temporalExt + '"].temporalDelete');
            if (!_.isFunction(versionDelete)) {
              return reject(new Error('could not find "temporalDelete" in globals'));
            }
            del = versionDelete(type, args);
          }
        } else {
          del = q.type(type).delete(args);
        }

        return del.run(connection).then(function (result) {
          return afterHook.call(_this, result, args, backend, function (err, result) {
            if (err) return reject(err);
            return resolve(result);
          });
        }).catch(reject);
      });
    }).timeout(timeout || 10000);
  };
}

function selectionArguments(selections) {
  var args = {};

  _.forEach(selections, function (selection, idx) {
    var name = selection.name,
        selectionSet = selection.selectionSet;


    var key = _.get(name, 'value', '' + idx);
    args[key] = {};
    _.forEach(selection.arguments, function (arg) {
      args[key][_.get(arg, 'name.value')] = _.get(arg, 'value.value');
    });

    if (selectionSet) args._subquery = selectionArguments(selectionSet.selections);
  });

  return args;
}

function subscriptionArguments(graphql$$1, requestString, idx) {
  var args = [];
  var Kind$$1 = graphql$$1.Kind;
  var request = _.isObject(requestString) ? { definitions: [requestString] } : graphql$$1.parse(requestString);

  _.forEach(request.definitions, function (definition, idx) {
    var kind = definition.kind,
        name = definition.name,
        operation = definition.operation,
        selectionSet = definition.selectionSet;


    if (kind === Kind$$1.OPERATION_DEFINITION && operation === 'subscription') {
      args.push({
        name: _.get(name, 'value', '' + idx),
        argument: selectionArguments(selectionSet.selections)
      });
    }
  });

  return _.isNumber(idx) ? _.get(args, '["' + idx + '"]') : args;
}

function subscriptionEvent(name) {
  var args = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (!name) throw new Error('subscriptionEvent creation requires a subscription name');

  var subArgs = _.cloneDeep(args);

  _.forEach(subArgs, function (arg) {
    if (arg.subscriber) arg.subscriber = undefined;
  });

  try {
    return 'subscription:' + md5('name:' + JSON.stringify(subArgs));
  } catch (err) {
    throw new Error('Unable to create subscription event, arguments may have a cyclical reference');
  }
}

function subscribe$1(backend, type) {
  return function (source, args) {
    var _this = this;

    var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var info = arguments[3];
    var r = backend.r,
        connection = backend.connection,
        definition = backend.definition,
        asError = backend.asError,
        _temporalExtension = backend._temporalExtension;
    var subscriber = args.subscriber;

    delete args.subscriber;
    var requestFields = backend.getRequestFields(type, info, { maxDepth: 1, includeRelated: false });

    // temporal plugin details
    var temporalDef = _.get(definition, 'types["' + type + '"]["' + _temporalExtension + '"]', {});
    var versioned = temporalDef.versioned,
        readMostCurrent = temporalDef.readMostCurrent;

    var isVersioned = Boolean(versioned) && definition.hasPlugin('GraphQLFactoryTemporal');

    // type details

    var _backend$getTypeInfo = backend.getTypeInfo(type, info),
        before = _backend$getTypeInfo.before,
        after = _backend$getTypeInfo.after,
        timeout = _backend$getTypeInfo.timeout,
        nested = _backend$getTypeInfo.nested;

    var temporalMostCurrent = _.get(this, 'globals["' + _temporalExtension + '"].temporalMostCurrent');
    var collection = backend.getCollection(type);
    var filter = collection;
    var many = true;

    // add the date argument to the rootValue
    if (isVersioned) {
      _.set(info, 'rootValue["' + _temporalExtension + '"].date', args.date);
    }

    // let { filter, many } = getRelationFilter.call(this, backend, type, source, info, collection)
    var fnPath = 'backend_subscribe' + type;
    var beforeHook = _.get(before, fnPath, function (args, backend, done) {
      return done();
    });
    var afterHook = _.get(after, fnPath, function (result, args, backend, done) {
      return done(null, result);
    });

    // handle basic subscribe
    return new Promise$1(function (resolve, reject) {
      return beforeHook.call(_this, { source: source, args: args, context: context, info: info }, backend, function (err) {
        if (err) return reject(asError(err));

        filter = getArgsFilter(backend, type, args, filter);

        // if not a many relation, return only a single result or null
        filter = many ? filter : filter.nth(0).default(null);

        // finally pluck the desired fields
        filter = _.isEmpty(requestFields) ? filter : filter.pluck(requestFields);

        try {
          var _ret = function () {

            // create the subscriptionId and the response payload
            var subscriptionId = subscriptionEvent('' + SUBSCRIBE + type, subscriptionArguments(backend.graphql, info.operation, 0).argument);

            // if the request is a bypass, run the regular query
            if (backend.subscriptionManager.isBypass(subscriptionId, subscriber)) {
              return {
                v: filter.run(connection).then(function (result) {
                  return resolve(result);
                }).catch(function (error) {
                  return reject(asError(error));
                })
              };
            }

            // run the query to ensure it is valid before setting up the subscription
            return {
              v: filter.run(connection).then(function (result) {
                // since there a valid response, subscribe via the manager
                return backend.subscriptionManager.subscribe(subscriptionId, subscriber, null, filter, {
                  schema: info.schema,
                  requestString: graphql.print({
                    kind: graphql.Kind.DOCUMENT,
                    definitions: [info.operation]
                  }),
                  rootValue: info.rootValue,
                  context: context,
                  variableValues: info.variableValues
                }, function (err) {
                  if (err) {
                    // on error, attempt to unsubscribe. it doesnt matter if it fails, reject the promise
                    return backend.subscriptionManager.unsubscribe(subscriptionId, subscriber, function () {
                      return reject(err);
                    });
                  }
                  return resolve(result);
                });
              }).catch(function (error) {
                return reject(asError(error));
              })
            };
          }();

          if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
        } catch (err) {
          return reject(asError(err));
        }
      });
    }).timeout(timeout || 10000);
  };
}

function unsubscribe$1(backend) {
  return function (source, args) {
    var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var info = arguments[3];
    var subscription = args.subscription,
        subscriber = args.subscriber;


    return new Promise(function (resolve, reject) {
      try {
        return backend.subscriptionManager.unsubscribe(subscription, subscriber, function (err) {
          if (err) return reject(err);
          return resolve({ unsubscribed: true });
        });
      } catch (err) {
        return reject(err);
      }
    });
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

function initStore$1(type, rebuild, seedData) {
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

var SubscriptionManager = function (_Events) {
  inherits(SubscriptionManager, _Events);

  function SubscriptionManager(backend) {
    classCallCheck(this, SubscriptionManager);

    var _this = possibleConstructorReturn(this, (SubscriptionManager.__proto__ || Object.getPrototypeOf(SubscriptionManager)).call(this));

    _this.backend = backend;
    _this.subscriptions = {};
    return _this;
  }

  createClass(SubscriptionManager, [{
    key: 'subscribe',
    value: function subscribe(subscription, subscriber, parent, filter, query, callback) {
      var _this2 = this;

      var graphql$$1 = this.backend.graphql;

      // if the subscription is already running, add the subscriber and return
      if (_.has(this.subscriptions, subscription)) {
        var sub = this.subscriptions[subscription];
        sub.subscribers = _.union(sub.subscribers, [subscriber]);
        return callback();
      }

      // if the subscription is new, create a change feed and register the subscription
      return filter.changes().run(this.backend._connection).then(function (cursor) {
        var schema = query.schema,
            requestString = query.requestString,
            rootValue = query.rootValue,
            context = query.context,
            variableValues = query.variableValues;

        // create a bypass subscriber, this will be used to make the request without
        // creating a new subscription

        var bypass = md5(subscription + ':' + Date.now() + ':' + Math.random());
        var bypassedRequest = _this2.setBypassSubscriber(requestString, bypass);

        // add the new subscription
        _this2.subscriptions[subscription] = {
          bypass: bypass,
          cursor: cursor,
          debounce: null,
          subscribers: [subscriber],
          parents: parent ? [parent] : []
        };

        // execute the code
        var execute = function execute() {
          // clear the debounce
          _.set(_this2.subscriptions, '["' + subscription + '"].debounce', null);

          // do graphql query and emit to backend
          return graphql$$1.graphql(schema, bypassedRequest, _.cloneDeep(rootValue), _.cloneDeep(context), _.cloneDeep(variableValues)).then(function (result) {
            return _this2.backend.emit(subscription, result);
          }).catch(function (error) {
            return _this2.backend.emit(subscription, {
              errors: _.isArray(error) ? error : [error]
            });
          });
        };

        // listen for local events
        _this2.on(subscription, function () {
          var debounce = _.get(_this2.subscriptions, '["' + subscription + '"].debounce');
          if (debounce) clearTimeout(debounce);
          _.set(_this2.subscriptions, '["' + subscription + '"].debounce', setTimeout(execute, 500));
        });

        // call the callback
        callback();

        // add the event monitor
        return cursor.each(function (err, change) {
          if (err) {
            return _this2.backend.emit(subscription, {
              errors: _.isArray(err) ? err : [err]
            });
          }

          // emit to all of the parent subscription events
          _.forEach(_this2.subscriptions[subscription].parents, function (parentSubscription) {
            _this2.emit(parentSubscription);
          });

          // emit this event
          return _this2.emit(subscription);
        });
      }).catch(function (error) {
        return callback(error);
      });
    }
  }, {
    key: 'isBypass',
    value: function isBypass(subscription, subscriber) {
      return _.get(this.subscriptions, '["' + subscription + '"].bypass') === subscriber;
    }
  }, {
    key: 'unsubscribe',
    value: function unsubscribe(subscription, subscriber, callback) {
      var GraphQLError = this.backend.graphql.GraphQLError;
      var sub = _.get(this.subscriptions, '["' + subscription + '"]');
      if (!sub) {
        return callback(new GraphQLError('subscription ' + subscription + ' was not found'));
      }
      if (!_.includes(sub.subscribers, subscriber)) {
        return callback(new GraphQLError('subscriber ' + subscriber + ' is not subscribed to subscription ' + subscription));
      }
      sub.subscribers = _.without(sub.subscribers, subscriber);
      if (!sub.subscribers.length) {
        sub.cursor.close();
        delete this.subscriptions[subscription];
      }
      return callback();
    }
  }, {
    key: 'setBypassSubscriber',
    value: function setBypassSubscriber(requestString, bypass) {
      var graphql$$1 = this.backend.graphql;
      var Kind$$1 = graphql$$1.Kind;
      var request = graphql$$1.parse(requestString);

      _.forEach(request.definitions, function (definition) {
        var kind = definition.kind,
            operation = definition.operation,
            selectionSet = definition.selectionSet;

        if (kind === Kind$$1.OPERATION_DEFINITION && operation === 'subscription' && selectionSet) {
          _.forEach(selectionSet.selections, function (selection) {
            _.forEach(selection.arguments, function (argument) {
              if (_.get(argument, 'name.value') === 'subscriber') {
                _.set(argument, 'value.value', bypass);
              }
            });
          });
        }
      });

      // return the recompiled request
      return graphql$$1.print(request);
    }
  }]);
  return SubscriptionManager;
}(Events);

// extended backend class for RethinkDB

var GraphQLFactoryRethinkDBBackend = function (_GraphQLFactoryBaseBa) {
  inherits(GraphQLFactoryRethinkDBBackend, _GraphQLFactoryBaseBa);

  function GraphQLFactoryRethinkDBBackend(namespace, graphql$$1, factory, r, config, connection) {
    classCallCheck(this, GraphQLFactoryRethinkDBBackend);

    var _this = possibleConstructorReturn(this, (GraphQLFactoryRethinkDBBackend.__proto__ || Object.getPrototypeOf(GraphQLFactoryRethinkDBBackend)).call(this, namespace, graphql$$1, factory, config));

    _this.type = 'GraphQLFactoryRethinkDBBackend';

    // check for a top-level rethinkdb namespace
    if (!r) throw new Error('a rethinkdb or rethinkdbdash top-level namespace is required');

    // store database objects
    _this.r = r;
    _this._connection = connection;
    _this._defaultStore = _.get(config, 'options.store', 'test');

    // utils
    _this.filter = filter$1;
    _this.q = Q(_this);

    // subscription manager
    _this.subscriptionManager = new SubscriptionManager(_this);

    // add values to the globals namespace
    _.merge(_this.definition.globals, defineProperty({}, namespace, { r: r, connection: connection }));
    return _this;
  }

  /*******************************************************************
   * Helper methods
   *******************************************************************/

  /*******************************************************************
   * Required methods
   *******************************************************************/


  createClass(GraphQLFactoryRethinkDBBackend, [{
    key: 'now',
    value: function now(callback) {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        return _this2.r.now().run(_this2._connection).then(function (d) {
          callback(null, d);
          resolve(d);
          return d;
        }).catch(function (err) {
          callback(err);
          return reject(err);
        });
      });
    }
  }, {
    key: 'createResolver',
    value: function createResolver(type) {
      return create(this, type);
    }
  }, {
    key: 'readResolver',
    value: function readResolver(type) {
      return read(this, type);
    }
  }, {
    key: 'updateResolver',
    value: function updateResolver(type) {
      return update$1(this, type);
    }
  }, {
    key: 'deleteResolver',
    value: function deleteResolver(type) {
      return del(this, type);
    }
  }, {
    key: 'batchCreateResolver',
    value: function batchCreateResolver(type) {
      return create(this, type, true);
    }
  }, {
    key: 'batchUpdateResolver',
    value: function batchUpdateResolver(type) {
      return update$1(this, type, true);
    }
  }, {
    key: 'batchDeleteResolver',
    value: function batchDeleteResolver(type) {
      return del(this, type, true);
    }
  }, {
    key: 'subscribeResolver',
    value: function subscribeResolver(type) {
      return subscribe$1(this, type);
    }
  }, {
    key: 'unsubscribeResolver',
    value: function unsubscribeResolver() {
      return unsubscribe$1(this);
    }
  }, {
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
  }, {
    key: 'initStore',
    value: function initStore(type, rebuild, seedData) {
      return initStore$1.call(this, type, rebuild, seedData);
    }
  }]);
  return GraphQLFactoryRethinkDBBackend;
}(GraphQLFactoryBaseBackend);

var index = {
  GraphQLFactoryBaseBackend: GraphQLFactoryBaseBackend,
  GraphQLFactoryRethinkDBBackend: GraphQLFactoryRethinkDBBackend,
  subscriptionEvent: subscriptionEvent
};

exports.GraphQLFactoryBaseBackend = GraphQLFactoryBaseBackend;
exports.GraphQLFactoryRethinkDBBackend = GraphQLFactoryRethinkDBBackend;
exports.subscriptionEvent = subscriptionEvent;
exports['default'] = index;
