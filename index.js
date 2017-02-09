'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _ = _interopDefault(require('lodash'));
var Events = _interopDefault(require('events'));
var Promise$1 = _interopDefault(require('bluebird'));
var docFilter = _interopDefault(require('rethinkdb-doc-filter'));
var md5 = _interopDefault(require('js-md5'));

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

function identity(value) {
  return value;
}

function parseLiteral(ast) {
  var boundParseLiteral = parseLiteral.bind(this);
  var Kind = this.graphql.Kind;

  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return parseFloat(ast.value);
    case Kind.OBJECT:
      {
        var _ret = function () {
          var value = Object.create(null);
          ast.fields.forEach(function (field) {
            value[field.name.value] = boundParseLiteral(field.value);
          });
          return {
            v: value
          };
        }();

        if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
      }
    case Kind.LIST:
      return ast.values.map(boundParseLiteral);
    default:
      return null;
  }
}

var GraphQLFactoryJSON = {
  type: 'Scalar',
  name: 'GraphQLFactoryJSON',
  description: 'The `JSON` scalar type represents JSON values as specified by ' + '[ECMA-404](http://www.ecma-international.org/ publications/files/ECMA-ST/ECMA-404.pdf).',
  serialize: identity,
  parseValue: identity,
  parseLiteral: parseLiteral
};

var GraphQLFactoryUnsubscribeResponse = {
  fields: {
    unsubscribed: {
      type: 'Boolean',
      nullable: false
    }
  }
};

var types = {
  GraphQLFactoryJSON: GraphQLFactoryJSON,
  GraphQLFactoryUnsubscribeResponse: GraphQLFactoryUnsubscribeResponse
};

var FactoryBackendDefinition = {
  types: types
};

// constant values - should be centralized at some point
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

var OBJECT = 'Object';


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
 * Creates an input name
 * @param {String} typeName - graphql type name
 * @param {String} opName - batch operation name
 * @return {string}
 */
function makeInputName(typeName, opName) {
  switch (opName) {
    case CREATE:
      return 'backendCreate' + typeName + 'Input';
    case BATCH_CREATE:
      return 'backendCreate' + typeName + 'Input';

    case UPDATE:
      return 'backendUpdate' + typeName + 'Input';
    case BATCH_UPDATE:
      return 'backendUpdate' + typeName + 'Input';

    case DELETE:
      return 'backendDelete' + typeName + 'Input';
    case BATCH_DELETE:
      return 'backendDelete' + typeName + 'Input';

    default:
      return typeName + 'Input';
  }
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
function getPrimary(fields) {
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
 * Determines if the type is an object
 * @param type
 */
function isObjectType(type) {
  return !type || type === 'Object' || _.includes(type, 'Object') || type.Object !== undefined;
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
    this.queryArgs = {};
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
      return this.extendTemporal().compileDefinition().computeExtension().addInputTypes().buildRelations().buildQueries().buildMutations().buildSubscriptions().setListArgs().value();
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

      var be = this.backend;
      var types = this.definition.types;

      _.forEach(types, function (typeDef, typeName) {
        var type = typeDef.type,
            fields = typeDef.fields;

        var _ref = be.getTypeComputed(typeName) || {},
            relations = _ref.relations,
            collection = _ref.collection,
            primaryKey = _ref.primaryKey;

        var versioned = _this.isVersioned(typeDef);

        // initialize the create and update input types
        // both are created because update should require different fields
        var create = { type: 'Input', fields: {} };
        var update = { type: 'Input', fields: {} };
        var remove = { type: 'Input', fields: {} };
        var query = {};

        if (isObjectType(type)) {
          (function () {
            // get the computed belongsTo relations
            var belongsToRelations = _(_.get(relations, 'belongsTo')).map(function (val) {
              return _.keys(val);
            }).flatten().value();

            // analyze each field
            _.forEach(fields, function (fieldDef, fieldName) {
              var def = null;

              // get the fieldDef
              if (_.isArray(fieldDef) || _.isString(fieldDef) || _.has(fieldDef, 'type')) {
                def = makeFieldDef(fieldDef);
              } else if (_.isObject(fieldDef) && _.isObject(fieldDef.Object)) {
                def = makeFieldDef(fieldDef.Object);
              } else {
                return true;
              }

              // get the type name and if it is a list
              var _def = def,
                  primary = _def.primary,
                  nullable = _def.nullable,
                  has = _def.has,
                  belongsTo = _def.belongsTo,
                  protect = _def.protect;

              var type = getType(def);
              var fieldTypeName = getTypeName(type);
              var isList = _.isArray(type);

              // determine if the field is nullable
              nullable = _.isBoolean(nullable) ? nullable : _.isBoolean(primary) ? !primary : true;

              // check for primary key which is always required for update and remove
              if (fieldName === primaryKey) {
                _.set(create, 'fields["' + fieldName + '"]', { type: type, nullable: true });
                _.set(update, 'fields["' + fieldName + '"]', { type: type, nullable: false });
                _.set(remove, 'fields["' + fieldName + '"]', { type: type, nullable: false });
                _.set(query, '["' + fieldName + '"]', { type: type });
              }

              // check for belongsTo which should not be included because it is a resolved field
              // also ignore the temporal extension
              else if (!has && (belongsTo || _this.isVersioned(typeDef) && fieldName === _this.temporalExtension || _.includes(belongsToRelations, fieldName))) {
                  return true;
                }

                // check for primitive that requires no extra processing
                else if (isPrimitive(fieldTypeName) || be.extendsType(fieldTypeName, ['Input', 'Enum', 'Scalar']).length) {
                    _.set(create, 'fields["' + fieldName + '"]', { type: type, nullable: nullable });
                    _.set(update, 'fields["' + fieldName + '"]', { type: type });
                    _.set(query, '["' + fieldName + '"]', { type: type });
                  }

                  // check for valid extended types
                  else if (be.extendsType(fieldTypeName, ['Object']).length) {
                      // if the field is a relation, the type should be the fields foreign key
                      if (has) {
                        var relatedFk = _.get(has, 'foreignKey', has);
                        var relatedFields = _.get(types, '["' + fieldTypeName + '"].fields');
                        var relatedDef = _.get(relatedFields, relatedFk);
                        var relatedType = getTypeName(getType(makeFieldDef(relatedDef)));

                        // if the related type cannot be resolved return
                        if (!relatedType) return true;

                        // otherwise set the create and update fields
                        _.set(create, 'fields["' + fieldName + '"]', {
                          type: isList ? [relatedType] : relatedType,
                          nullable: nullable
                        });
                        _.set(update, 'fields["' + fieldName + '"]', {
                          type: isList ? [relatedType] : relatedType
                        });
                      }

                      // other types should use the generated input type
                      else {
                          var createInputName = makeInputName(fieldTypeName, CREATE);
                          var updateInputName = makeInputName(fieldTypeName, UPDATE);

                          _.set(create, 'fields["' + fieldName + '"]', {
                            type: isList ? [createInputName] : createInputName,
                            nullable: nullable
                          });
                          _.set(update, 'fields["' + fieldName + '"]', {
                            type: isList ? [updateInputName] : updateInputName
                          });
                        }
                    }

              // check for protected and remove from update
              if (protect === true) delete update.fields[fieldName];
            });

            // if versioned, add extra fields
            if (versioned) {
              create.fields = _.merge(create.fields, {
                useCurrent: { type: 'Boolean', defaultValue: false }
              });
              update.fields = _.merge(update.fields, {
                useCurrent: { type: 'Boolean' }
              });
              query = _.merge(query, {
                id: { type: 'String' },
                version: { type: 'String' },
                recordId: { type: 'String' },
                date: { type: 'TemporalDateTime' }
              });
            }

            // add the types to the definition
            if (!_.isEmpty(create.fields)) types[makeInputName(typeName, CREATE)] = create;
            if (!_.isEmpty(update.fields)) types[makeInputName(typeName, UPDATE)] = update;
            if (!_.isEmpty(remove.fields)) types[makeInputName(typeName, DELETE)] = remove;
            _this.queryArgs[typeName] = query;
          })();
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
          var _$get = _.get(typeDef, '["' + _this2.temporalExtension + '"]', {}),
              versioned = _$get.versioned,
              fork = _$get.fork,
              branch = _$get.branch,
              publish = _$get.publish;

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
        var ext = _.get(definition, '["' + _this3.extension + '"]');

        if (!_.isObject(fields) || !_.isObject(ext)) return true;

        var schema = ext.schema,
            table = ext.table,
            collection = ext.collection,
            store = ext.store,
            db = ext.db,
            mutation = ext.mutation,
            query = ext.query;

        var computed = ext.computed = {};

        computed.collection = '' + _this3.prefix + (collection || table);
        computed.store = store || db || _this3.defaultStore;

        // check that the type has a schema identified, otherwise create a schema with the namespace
        // allow schemas to be an array so that queries/mutations can belong to multiple schemas
        computed.schemas = !schema ? [_this3.backend._namespace] : _.isArray(schema) ? schema : [schema];

        // get the primary key name
        var primary = computed.primary = getPrimary(fields);
        computed.primaryKey = ext.primaryKey || _.isArray(primary) ? _.camelCase(primary.join('-')) : primary;

        // determine the type of the primary
        var primarySample = _.isArray(primary) ? _.first(primary) : primary;
        var primaryDef = _.get(fields, '["' + primarySample + '"]');
        var primaryType = _.isString(primaryDef) || _.isArray(primaryDef) ? primaryDef : _.has(primaryDef, 'type') ? primaryDef.type : 'String';
        var primaryTypeName = _.isArray(primaryType) ? _.first(primaryType) : primaryType;

        _.set(fields, '["' + computed.primaryKey + '"].type', _.isArray(primary) ? [primaryTypeName] : primaryTypeName);

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
                after = opDef.after,
                error = opDef.error;

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
            if (_.isFunction(error)) _.set(_backend, 'computed.error["' + resolveName + '"]', error);
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
                after = opDef.after,
                error = opDef.error;

            var ops = [CREATE, UPDATE, DELETE, BATCH_CREATE, BATCH_UPDATE, BATCH_DELETE];
            var fieldName = _.includes(ops, opName) ? '' + opName + typeName : opName;
            var resolveName = _.isString(resolve) ? resolve : 'backend_' + fieldName;
            var isBatchOp = isBatchOperation(opName);

            _.set(_this5.definition.types, '["' + objName + '"].fields["' + fieldName + '"]', {
              type: opName === DELETE || opName === BATCH_DELETE ? INT : type ? type : isBatchOp ? [typeName] : typeName,
              args: args || _this5.buildArgs(definition, MUTATION, typeName, opName),
              resolve: resolveName
            });

            if (opDef === true || !resolve) {
              _.set(_this5.definition, 'functions.' + resolveName, _this5.backend[opName + 'Resolver'](typeName));
            } else if (_.isFunction(resolve)) {
              _.set(_this5.definition, 'functions.' + resolveName, resolve);
            }

            // check for hooks
            if (_.isFunction(before)) _.set(_backend, 'computed.before["' + resolveName + '"]', before);
            if (_.isFunction(after)) _.set(_backend, 'computed.after["' + resolveName + '"]', after);
            if (_.isFunction(error)) _.set(_backend, 'computed.error["' + resolveName + '"]', error);
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
                after = opDef.after,
                error = opDef.error;

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
            if (_.isFunction(error)) _.set(_backend, 'computed.error["' + resolveName + '"]', error);
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

          // add field resolves for types with collections
          if (_.has(_this7, 'definition.types["' + typeName + '"]["' + _this7.extension + '"].collection')) {
            fieldDef.resolve = fieldDef.resolve || 'backend_read' + typeName;
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
      var fields = _.get(definition, 'fields', {});

      // check for batch operations and use the generated inputs
      if (operation === MUTATION && isBatchOperation(opName)) {
        return {
          batch: {
            type: [makeInputName(rootName, opName)],
            nullable: false
          }
        };
      }

      // unsubscribe default gets set args
      if (operation === SUBSCRIPTION && opName === UNSUBSCRIBE) {
        return {
          subscription: { type: 'String', nullable: false },
          subscriber: { type: 'String', nullable: false }
        };
      }

      // if a query, copy a create without its nullables and add an overridable limit
      if (operation === QUERY) {
        return _.merge({
          limit: { type: 'Int' },
          search: { type: 'GraphQLFactoryJSON' }
        }, this.queryArgs[rootName]);
      }

      // if a subscription, cope a create without its nullables and add a subscriber
      if (operation === SUBSCRIPTION && opName === SUBSCRIBE) {
        return _.merge({
          limit: { type: 'Int' },
          search: { type: 'GraphQLFactoryJSON' }
        }, this.queryArgs[rootName], { subscriber: { type: 'String', nullable: false } });
      }

      // check for mutation
      if (operation === MUTATION) {
        var typeMutationInput = _.get(this.definition.types, '["' + makeInputName(rootName, opName) + '"].fields');
        return _.mapValues(typeMutationInput, function (def) {
          var type = def.type;

          return { type: type };
        });
      }

      // this code should never be executed
      throw new Error('invalid arg calculation request');
    }
  }]);
  return GraphQLFactoryBackendCompiler;
}();

var _LOG_LEVELS;

var FATAL = 'fatal';
var ERROR = 'error';
var WARN = 'warn';
var INFO = 'info';
var DEBUG = 'debug';
var TRACE = 'trace';
var SILENT = 'silent';



var LOG_LEVELS = (_LOG_LEVELS = {}, defineProperty(_LOG_LEVELS, FATAL, 60), defineProperty(_LOG_LEVELS, ERROR, 50), defineProperty(_LOG_LEVELS, WARN, 40), defineProperty(_LOG_LEVELS, INFO, 30), defineProperty(_LOG_LEVELS, DEBUG, 20), defineProperty(_LOG_LEVELS, TRACE, 10), defineProperty(_LOG_LEVELS, SILENT, -1), _LOG_LEVELS);

var Logger = function () {
  function Logger(middleware, stream) {
    var level = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : INFO;
    var handler = arguments[3];
    classCallCheck(this, Logger);

    this.middleware = middleware;
    this.stream = stream;
    this.handler = handler;
    this.level = _.isNumber(level) ? Math.floor(level) : _.get(LOG_LEVELS, level);

    if (!_.isNumber(this.level)) throw new Error('invalid log level');
  }

  createClass(Logger, [{
    key: 'fatal',
    value: function fatal() {
      var level = FATAL;
      if (this.level >= 0 && this.level <= LOG_LEVELS[level]) {
        var log = this.middleware.logify(this.stream, LOG_LEVELS[level], [].concat(Array.prototype.slice.call(arguments)));
        if (_.isFunction(_.get(this.handler, level))) return this.handler[level].apply(this.handler, log);
        return console.error.apply(console, log);
      }
    }
  }, {
    key: 'error',
    value: function error() {
      var level = ERROR;
      if (this.level >= 0 && this.level <= LOG_LEVELS[level]) {
        var log = this.middleware.logify(this.stream, LOG_LEVELS[level], [].concat(Array.prototype.slice.call(arguments)));
        if (_.isFunction(_.get(this.handler, level))) return this.handler[level].apply(this.handler, log);
        return console.error.apply(console, log);
      }
    }
  }, {
    key: 'warn',
    value: function warn() {
      var level = WARN;
      if (this.level >= 0 && this.level <= LOG_LEVELS[level]) {
        var log = this.middleware.logify(this.stream, LOG_LEVELS[level], [].concat(Array.prototype.slice.call(arguments)));
        if (_.isFunction(_.get(this.handler, level))) return this.handler[level].apply(this.handler, log);
        return console.warn.apply(console, log);
      }
    }
  }, {
    key: 'info',
    value: function info() {
      var level = INFO;
      if (this.level >= 0 && this.level <= LOG_LEVELS[level]) {
        var log = this.middleware.logify(this.stream, LOG_LEVELS[level], [].concat(Array.prototype.slice.call(arguments)));
        if (_.isFunction(_.get(this.handler, level))) return this.handler[level].apply(this.handler, log);
        return console.info.apply(console, log);
      }
    }
  }, {
    key: 'debug',
    value: function debug() {
      var level = DEBUG;
      if (this.level >= 0 && this.level <= LOG_LEVELS[level]) {
        var log = this.middleware.logify(this.stream, LOG_LEVELS[level], [].concat(Array.prototype.slice.call(arguments)));
        if (_.isFunction(_.get(this.handler, level))) return this.handler[level].apply(this.handler, log);
        return console.log.apply(console, log);
      }
    }
  }, {
    key: 'trace',
    value: function trace() {
      var level = TRACE;
      if (this.level >= 0 && this.level <= LOG_LEVELS[level]) {
        var log = this.middleware.logify(this.stream, LOG_LEVELS[level], [].concat(Array.prototype.slice.call(arguments)));
        if (_.isFunction(_.get(this.handler, level))) return this.handler[level].apply(this.handler, log);
        return console.log.apply(console, log);
      }
    }
  }]);
  return Logger;
}();

var LogMiddleware = function () {
  function LogMiddleware() {
    classCallCheck(this, LogMiddleware);

    this.streams = {};
  }

  createClass(LogMiddleware, [{
    key: 'logify',
    value: function logify(stream, level, args) {
      var timestamp = new Date();
      if (_.isObject(_.get(args, '[0]'))) {
        args[0].level = level;
        args[0].stream = stream;
        args[0].timestamp = timestamp;
      } else {
        args = [{ level: level, stream: stream, timestamp: timestamp }].concat(args);
      }
      return args;
    }
  }, {
    key: 'addStream',
    value: function addStream(stream, level, handler) {
      this.streams[stream] = new Logger(this, stream, level, handler);
      return this.streams[stream];
    }
  }, {
    key: 'fatal',
    value: function fatal() {
      var args = [].concat(Array.prototype.slice.call(arguments));
      var stream = _.get(args, '[0].stream');
      return _.has(this.streams, stream) ? this.streams[stream].fatal.apply(this.streams[stream], args) : null;
    }
  }, {
    key: 'error',
    value: function error() {
      var args = [].concat(Array.prototype.slice.call(arguments));
      var stream = _.get(args, '[0].stream');
      return _.has(this.streams, stream) ? this.streams[stream].error.apply(this.streams[stream], args) : null;
    }
  }, {
    key: 'warn',
    value: function warn() {
      var args = [].concat(Array.prototype.slice.call(arguments));
      var stream = _.get(args, '[0].stream');
      return _.has(this.streams, stream) ? this.streams[stream].warn.apply(this.streams[stream], args) : null;
    }
  }, {
    key: 'info',
    value: function info() {
      var args = [].concat(Array.prototype.slice.call(arguments));
      var stream = _.get(args, '[0].stream');
      return _.has(this.streams, stream) ? this.streams[stream].info.apply(this.streams[stream], args) : null;
    }
  }, {
    key: 'debug',
    value: function debug() {
      var args = [].concat(Array.prototype.slice.call(arguments));
      var stream = _.get(args, '[0].stream');
      return _.has(this.streams, stream) ? this.streams[stream].debug.apply(this.streams[stream], args) : null;
    }
  }, {
    key: 'trace',
    value: function trace() {
      var args = [].concat(Array.prototype.slice.call(arguments));
      var stream = _.get(args, '[0].stream');
      return _.has(this.streams, stream) ? this.streams[stream].trace.apply(this.streams[stream], args) : null;
    }
  }]);
  return LogMiddleware;
}();

/**
 * Base GraphQL Factory Backend
 * @extends Events
 */

var GraphQLFactoryBaseBackend = function (_Events) {
  inherits(GraphQLFactoryBaseBackend, _Events);

  /**
   * Initializes a backend instance
   * @param {String} namespace - namespace to using in globals
   * @param {Object} graphql - instance of graphql
   * @param {Object} factory - instance of graphql-factory
   * @param {Object} config - configuration object
   * @param {String} [config.name="GraphQLFactoryBackend"] - plugin name
   * @param {String} [config.extension="_backend"] - plugin extension
   * @param {Object} [config.options] - options hash
   * @param {String} [config.options.store="test"] - default store name
   * @param {String} [config.options.prefix=""] - prefix for collections
   * @param {Object} [config.options.log] - array of log settings
   * @param {Object} [config.options.log[stream].handler] - log handler like bunyan for backend logs
   * @param {Number|String} [config.options.log[stream].level] - log level for backend logs
   * @param {Array<String>|String} [config.plugin] - additional plugins to merge
   * @param {String} [config.temporalExtension="_temporal"] - temporal plugin extension
   * @param {Object} [config.globals] - Factory globals definition
   * @param {Object} [config.fields] - Factory fields definition
   * @param {Object} config.types - Factory types definition
   * @param {Object} [config.schemas] - Factory schemas definition
   * @param {Object} [config.functions] - Factory functions definition
   * @param {Object} [config.externalTypes] - Factory externalTypes definition
   * @param {Object} [config.installData] - Seed data
   * @callback callback
   */
  function GraphQLFactoryBaseBackend(namespace, graphql, factory, config) {
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
    if (!graphql) throw new Error('an instance of graphql is required');
    if (!factory) throw new Error('an instance of graphql-factory is required');
    if (!_.isObject(types)) throw new Error('no types were found in the configuration');

    // set props
    _this.type = 'GraphQLFactoryBaseBackend';
    _this.graphql = graphql;
    _this.GraphQLError = graphql.GraphQLError;
    _this.factory = factory(graphql);
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
    _this._middleware = {
      before: [],
      after: [],
      error: []
    };

    // add the backend to the globals
    _.set(_this.definition, 'globals["' + _this._extension + '"]', _this);

    // add logger and streams
    _this.logger = new LogMiddleware();
    _.forEach(_.get(config, 'options.log'), function (options, stream) {
      var _ref2 = options || { level: 'info' },
          level = _ref2.level,
          handler = _ref2.handler;

      _this.logger.addStream(stream, level, handler);
    });
    return _this;
  }

  /**
   * adds global middleware to all resolve functions
   * @param hook
   * @param middleware
   */


  createClass(GraphQLFactoryBaseBackend, [{
    key: 'use',
    value: function use(hook, middleware) {
      if (!_.includes(['before', 'after', 'error'], hook) || !_.isFunction(middleware)) {
        throw new Error('invalid middleware, must be "use(hook:String, middleware:Function)"');
      }
      this._middleware[hook].push(middleware);
    }

    /**
     * Handles error middleware hooks
     * @param {Object} context - resolve function context
     * @param {Function|Array<Function>} hooks - middleware hooks
     * @param {Error} error - error object
     * @param {Object} args - arguments
     * @param {Object} backend - factory backend
     * @param {Function} done - reject function
     * @returns {*}
     */

  }, {
    key: 'errorMiddleware',
    value: function errorMiddleware(context, hooks, error, args, backend, done) {
      var handlers = {};

      // ensure that all middleware hooks are functions
      hooks = _.isFunction(hooks) ? [hooks] : _.isArray(hooks) ? _.filter(hooks, _.isFunction) : [];

      // add middleware
      hooks = this._middleware.error.concat(hooks);

      // if there are no hooks call the done handler with the results
      if (!hooks.length) return done(error);

      // create a main handler for non next callbacks
      handlers.main = function (err) {
        hooks = hooks.splice(1);
        error = err || error;

        // if there is an error or no hooks call done with error or the result
        if (!hooks.length) return done(error);

        // otherwise call the current hook
        return hooks[0].call(context, error, args, backend, handlers.main, handlers.next);
      };

      // create a next handler that calls done if there is an error otherwise the main handler
      handlers.next = function (err) {
        return err ? done(err) : handlers.main();
      };

      // make the initial call to the first hook with the main and next handlers
      return hooks[0].call(context, error, args, backend, handlers.main, handlers.next);
    }

    /**
     * Handles before middleware hooks
     * @param {Object} context - resolve function context
     * @param {Function|Array<Function>} hooks - middleware hooks
     * @param {Object} args - arguments
     * @param {Object} backend - factory backend
     * @callback done
     * @returns {*}
     */

  }, {
    key: 'beforeMiddleware',
    value: function beforeMiddleware(context, hooks, args, backend, done) {
      var handlers = {};

      // ensure that all middleware hooks are functions
      hooks = _.isFunction(hooks) ? [hooks] : _.isArray(hooks) ? _.filter(hooks, _.isFunction) : [];

      // add middleware
      hooks = this._middleware.before.concat(hooks);

      // if there are no hooks call the done handler with the results
      if (!hooks.length) return done();

      // create a main handler for non next callbacks
      handlers.main = function (err) {
        hooks = hooks.splice(1);

        // if there is an error or no hooks call done with error or the result
        if (err) return done(err);
        if (!hooks.length) return done();

        // otherwise call the current hook
        return hooks[0].call(context, args, backend, handlers.main, handlers.next);
      };

      // create a next handler that calls done if there is an error otherwise the main handler
      handlers.next = function (err) {
        return err ? done(err) : handlers.main();
      };

      // make the initial call to the first hook with the main and next handlers
      return hooks[0].call(context, args, backend, handlers.main, handlers.next);
    }

    /**
     * Handles after middleware hooks
     * @param {Object} context - resolve function context
     * @param {Function|Array<Function>} hooks - middleware hooks
     * @param {*} result - result of query/mutation
     * @param {Object} args - arguments
     * @param {Object} backend - factory backend
     * @callback done
     * @returns {*}
     */

  }, {
    key: 'afterMiddleware',
    value: function afterMiddleware(context, hooks, result, args, backend, done) {
      var handlers = {};

      // ensure that all middleware hooks are functions
      hooks = _.isFunction(hooks) ? [hooks] : _.isArray(hooks) ? _.filter(hooks, _.isFunction) : [];

      // add middleware
      hooks = this._middleware.after.concat(hooks);

      // if there are no hooks call the done handler with the results
      if (!hooks.length) return done(null, result);

      // create a main handler for non next callbacks
      handlers.main = function (err, res) {
        hooks = hooks.splice(1);
        result = res;

        // if there is an error or no hooks call done with error or the result
        if (err) return done(err);
        if (!hooks.length) return done(null, res);

        // otherwise call the current hook
        return hooks[0].call(context, result, args, backend, handlers.main, handlers.next);
      };

      // create a next handler that calls done if there is an error otherwise the main handler
      handlers.next = function (err) {
        return err ? done(err) : handlers.main(null, result);
      };

      // make the initial call to the first hook with the main and next handlers
      return hooks[0].call(context, result, args, backend, handlers.main, handlers.next);
    }

    /**
     * Compiled the backend
     * @private
     */

  }, {
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

      this.logger.info({ stream: 'backend' }, 'making backend');
      return new Promise$1(function (resolve, reject) {
        try {
          _this2._compile();
          _this2.logger.info({ stream: 'backend' }, 'successfully made backend');
          callback(null, _this2);
          return resolve(_this2);
        } catch (error) {
          _this2.logger.error({ stream: 'backend', error: error }, 'failed to make backend');
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
      var _ref3;

      var typeDef = this.getTypeDefinition(type);

      var _getTypeComputed2 = this.getTypeComputed(type),
          primary = _getTypeComputed2.primary,
          primaryKey = _getTypeComputed2.primaryKey,
          collection = _getTypeComputed2.collection,
          store = _getTypeComputed2.store,
          before = _getTypeComputed2.before,
          after = _getTypeComputed2.after,
          error = _getTypeComputed2.error,
          timeout = _getTypeComputed2.timeout;

      var nested = this.isNested(info);
      var currentPath = this.getCurrentPath(info);

      var _getRelations = this.getRelations(type, info),
          belongsTo = _getRelations.belongsTo,
          has = _getRelations.has;

      return _ref3 = {}, defineProperty(_ref3, this._extension, typeDef[this._extension]), defineProperty(_ref3, 'before', before), defineProperty(_ref3, 'after', after), defineProperty(_ref3, 'error', error), defineProperty(_ref3, 'timeout', timeout), defineProperty(_ref3, 'collection', collection), defineProperty(_ref3, 'store', store), defineProperty(_ref3, 'fields', typeDef.fields), defineProperty(_ref3, 'primary', primary), defineProperty(_ref3, 'primaryKey', primaryKey), defineProperty(_ref3, 'nested', nested), defineProperty(_ref3, 'currentPath', currentPath), defineProperty(_ref3, 'belongsTo', belongsTo), defineProperty(_ref3, 'has', has), _ref3;
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

      var _getTypeComputed3 = this.getTypeComputed(type),
          uniques = _getTypeComputed3.uniques;

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
    key: 'extendsType',
    value: function extendsType(type, types) {
      var typeDef = _.get(this.getTypeDefinition(type), 'type', ['Object']);
      var rawTypes = [];

      // pull the types from the type field
      if (_.isArray(typeDef)) rawTypes = _.map(typeDef, function (def) {
        return _.isString(def) ? def : _.first(_.keys(def));
      });else if (_.isObject(typeDef)) rawTypes = _.keys(typeDef);else if (_.isString(typeDef)) rawTypes = [typeDef];

      return _.intersection(rawTypes, _.isArray(types) ? types : [types]);
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

      var _getTypeComputed4 = this.getTypeComputed(type),
          primary = _getTypeComputed4.primary,
          primaryKey = _getTypeComputed4.primaryKey;

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
    get: function get$$1() {
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
    get: function get$$1() {
      if (!this._lib) this._lib = this.factory.make(this.plugin);
      return this._lib;
    }
  }]);
  return GraphQLFactoryBaseBackend;
}(Events);

/**
 * Gets a nested property from a reql object
 * @param {Object} base - base reql object
 * @param {String} pathStr - path string to the property
 * @return {Object} - reql object
 */
function reqlPath(base, pathStr) {
  _.forEach(_.toPath(pathStr), function (p) {
    base = base(p);
  });
  return base;
}

/**
 * Gets nested relationships defined on the type and wether or not they are a many relationship
 * @param {Object} backend - factory backend instance
 * @param {String} type - graphql type name
 * @param {Object} source - source from a field resolve
 * @param {Object} info - info from a field resolve
 * @param {Object} [filter] - starting filter
 * @return {{filter: Object, many: Boolean}}
 */
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

/**
 * Creates a reql filter based on the arguments object
 * @param {Object} backend - factory backend instance
 * @param {String} type - graphql type name
 * @param {Object} args - args from a field resolve
 * @param {Object} [filter] - starting filter
 * @return {Object} - reql filter
 */
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
/**
 * determines if any unique constraints will be violated by the args
 * @param {Object} backend - factory backend instance
 * @param {String} type - graphql type name
 * @param {Object} args - args from a field resolve
 * @param {Object} [filter] - starting filter
 * @return {Object} - reql filter
 */
function violatesUnique(backend, type, args, filter) {
  filter = filter || backend.getCollection(type);
  var r = backend.r;


  var unique = _.isArray(args) ? _.map(args, function (arg) {
    return backend.getUniqueArgs(type, arg);
  }) : [backend.getUniqueArgs(type, args)];

  // if there are no uniques, return false
  if (!_.flatten(unique).length) return r.expr(false);

  var uniqueViolation = _.reduce(unique, function (result, value) {
    return result && _.filter(unique, value).length > 1;
  }, true);

  if (uniqueViolation) return r.error('unique field violation');

  if (unique.length) {
    return filter.filter(function (obj) {
      return r.expr(unique).prepend(false).reduce(function (prevArg, arg) {
        return prevArg.or(arg.prepend(true).reduce(function (prevUniq, uniq) {
          return prevUniq.and(uniq.prepend(true).reduce(function (prevField, field) {
            return prevField.and(field('type').eq('String').branch(obj(field('field')).match(r.add('(?i)^', field('value'), '$')), obj(field('field')).eq(field('value'))));
          }));
        }));
      });
    }).count().ne(0);
  }
  return filter.coerceTo('ARRAY').do(function () {
    return r.expr(false);
  });
}

/**
 * Validates that related ids exist
 * @param {Object} backend - factory backend instance
 * @param {String} type - graphql type name
 * @param {Object} args - args from a field resolve
 * @param {Object} [filter] - starting filter
 * @return {Object} - reql filter
 */
function existsFilter(backend, type, args) {
  var r = backend.r;

  // reduce the related values to a flat array

  var exists = _(args).map(function (arg) {
    return backend.getRelatedValues(type, arg);
  }).flatten().reduce(function (result, value) {
    return _.find(result, value) ? result : _.union(result, [value]);
  }, []);

  // if there are no exists to check, tryutn true
  if (!exists.length) return r.expr(true);

  // otherwise perform a reduce
  return r.expr(exists).prepend(true).reduce(function (prev, cur) {
    return prev.and(r.db(cur('store')).table(cur('collection')).get(cur('id')).ne(null));
  });
}

var filter = {
  reqlPath: reqlPath,
  existsFilter: existsFilter,
  getRelationFilter: getRelationFilter,
  getArgsFilter: getArgsFilter,
  violatesUnique: violatesUnique
};

/**
 * Create resolver - used as a standard create resolver function
 * @param {Object} backend - factory backend instance
 * @param {String} type - GraphQL type name to create
 * @param {Boolean} [batchMode=false] - allow batch changes
 * @returns {Function}
 */
function create(backend, type) {
  var batchMode = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  return function (source, args) {
    var _this = this;

    var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var info = arguments[3];

    // temporal plugin details
    var hasTemporalPlugin = backend.definition.hasPlugin('GraphQLFactoryTemporal');
    var temporalExt = backend._temporalExtension;
    var typeDef = _.get(backend.definition, 'types["' + type + '"]');
    var temporalDef = _.get(typeDef, '["' + temporalExt + '"]');
    var isVersioned = _.get(temporalDef, 'versioned') === true;

    // standard details
    var r = backend.r,
        _connection = backend._connection,
        definition = backend.definition;

    var _backend$getTypeInfo = backend.getTypeInfo(type, info),
        before = _backend$getTypeInfo.before,
        after = _backend$getTypeInfo.after,
        error = _backend$getTypeInfo.error,
        timeout = _backend$getTypeInfo.timeout,
        primaryKey = _backend$getTypeInfo.primaryKey;

    var collection = backend.getCollection(type);
    var fnPath = 'backend_' + (batchMode ? 'batchC' : 'c') + 'reate' + type;

    // ensure that the args are an array
    args = batchMode ? args.batch : [args];

    // create new promise
    return new Promise$1(function (resolve, reject) {
      var beforeHook = _.get(before, fnPath);
      var afterHook = _.get(after, fnPath);
      var errorHook = _.get(error, fnPath);
      var hookArgs = { source: source, args: batchMode ? args : _.first(args), context: context, info: info };
      var create = null;

      // run before hook
      return backend.beforeMiddleware(_this, beforeHook, hookArgs, backend, function (error) {
        if (error) return backend.errorMiddleware(_this, errorHook, error, hookArgs, backend, reject);

        // handle temporal plugin
        if (hasTemporalPlugin && isVersioned) {
          // check that temporal create is allowed
          if (temporalDef.create === false) {
            return backend.errorMiddleware(_this, errorHook, new Error('create is not allowed on this temporal type'), hookArgs, backend, reject);
          }

          // if a function was specified, use it
          if (_.isFunction(temporalDef.create)) {
            return resolve(temporalDef.create.call(_this, source, args, context, info));
          }

          // if a resolver reference, use that if it exists
          else if (_.isString(temporalDef.create)) {
              var temporalCreate = _.get(definition, 'functions["' + temporalDef.create + '"]');
              if (!_.isFunction(temporalCreate)) {
                return backend.errorMiddleware(_this, errorHook, new Error('cannot find function "' + temporalDef.create + '"'), hookArgs, backend, reject);
              }
              return resolve(temporalCreate.call(_this, source, args, context, info));
            }

            // otherwise use the default version update function
            else {
                var versionCreate = _.get(_this, 'globals["' + temporalExt + '"].temporalCreate');
                if (!_.isFunction(versionCreate)) {
                  return backend.errorMiddleware(_this, errorHook, new Error('could not find "temporalCreate" in globals'), hookArgs, backend, reject);
                }
                create = versionCreate(type, args);
              }
        }

        // handle standard create
        else {
            // generate a create query with checks
            create = violatesUnique(backend, type, args, collection).branch(r.error('unique field violation'), existsFilter(backend, type, args).not().branch(r.error('one or more related records were not found'), collection.insert(args, { returnChanges: true }).do(function (summary) {
              return summary('errors').ne(0).branch(r.error(summary('first_error')), summary('changes')('new_val').coerceTo('ARRAY').do(function (results) {
                return r.expr(batchMode).branch(results, results.nth(0).default(null));
              }));
            })));
          }

        // run the query
        return create.run(_connection).then(function (result) {
          return backend.afterMiddleware(_this, afterHook, result, hookArgs, backend, function (error, result) {
            if (error) return backend.errorMiddleware(_this, errorHook, error, hookArgs, backend, reject);
            return resolve(result);
          });
        }).catch(function (error) {
          return backend.errorMiddleware(_this, errorHook, error, hookArgs, backend, reject);
        });
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
        error = _backend$getTypeInfo.error,
        timeout = _backend$getTypeInfo.timeout,
        nested = _backend$getTypeInfo.nested;

    var temporalMostCurrent = _.get(this, 'globals["' + _temporalExtension + '"].temporalMostCurrent');
    var collection = args.search ? docFilter(r, backend.getCollection(type), args.search) : backend.getCollection(type);
    var fnPath = 'backend_read' + type;

    var _getRelationFilter$ca = getRelationFilter.call(this, backend, type, source, info, collection),
        filter = _getRelationFilter$ca.filter,
        many = _getRelationFilter$ca.many;

    var rootDate = _.get(info, 'rootValue["' + _temporalExtension + '"].date');

    // add the date argument to the rootValue if not nested, otherwise pull it from the rootValue
    if (isVersioned && !nested) _.set(info, 'rootValue["' + _temporalExtension + '"].date', args.date);
    var dateArg = args.date !== undefined ? args.date : rootDate !== undefined ? rootDate : undefined;

    if (dateArg !== undefined) args.date = dateArg;

    // handle basic read
    return new Promise$1(function (resolve, reject) {
      var beforeHook = _.get(before, fnPath);
      var afterHook = _.get(after, fnPath);
      var errorHook = _.get(error, fnPath);
      var hookArgs = { source: source, args: args, context: context, info: info };

      return backend.beforeMiddleware(_this, beforeHook, hookArgs, backend, function (error) {
        if (error) return backend.errorMiddleware(_this, errorHook, error, hookArgs, backend, reject);

        // handle temporal plugin
        if (isVersioned && !nested) {
          if (temporalDef.read === false) {
            return backend.errorMiddleware(_this, errorHook, new Error('read is not allowed on this temporal type'), hookArgs, backend, reject);
          }
          if (_.isFunction(temporalDef.read)) {
            return resolve(temporalDef.read.call(_this, source, args, context, info));
          } else if (_.isString(temporalDef.read)) {
            var temporalRead = _.get(definition, 'functions["' + temporalDef.read + '"]');
            if (!_.isFunction(temporalRead)) {
              return backend.errorMiddleware(_this, errorHook, new Error('cannot find function "' + temporalDef.read + '"'), hookArgs, backend, reject);
            }
            return resolve(temporalRead.call(_this, source, args, context, info));
          } else {
            if (_.isEmpty(args) && readMostCurrent === true) {
              if (!_.isFunction(temporalMostCurrent)) {
                return backend.errorMiddleware(_this, errorHook, new Error('could not find "temporalMostCurrent" in globals'), hookArgs, backend, reject);
              }
              filter = temporalMostCurrent(type);
            } else {
              var versionFilter = _.get(_this, 'globals["' + _temporalExtension + '"].temporalFilter');
              if (!_.isFunction(versionFilter)) {
                return backend.errorMiddleware(_this, errorHook, new Error('could not find "temporalFilter" in globals'), hookArgs, backend, reject);
              }
              filter = versionFilter(type, args);
              args = _.omit(args, ['version', 'recordId', 'date', 'id']);
            }
          }
        }

        // compose a filter from the arguments
        filter = getArgsFilter(backend, type, args, filter);

        // add standard query modifiers
        filter = _.isNumber(args.limit) ? filter.limit(args.limit) : filter;

        // if not a many relation, return only a single result or null
        // otherwise an array of results
        filter = many ? filter.coerceTo('ARRAY') : filter.nth(0).default(null);

        return filter.run(connection).then(function (result) {
          return backend.afterMiddleware(_this, afterHook, result, hookArgs, backend, function (error, result) {
            if (error) return backend.errorMiddleware(_this, errorHook, error, hookArgs, backend, reject);
            return resolve(result);
          });
        }).catch(function (error) {
          return backend.errorMiddleware(_this, errorHook, error, hookArgs, backend, reject);
        });
      });
    }).timeout(timeout || 10000);
  };
}

/**
 * Update resolver - used as a standard update resolver function
 * @param {Object} backend - factory backend instance
 * @param {String} type - GraphQL type name to create
 * @param {Boolean} [batchMode=false] - allow batch changes
 * @returns {Function}
 */
var _updateResolver = function (backend, type) {
  var batchMode = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  return function (source, args) {
    var _this = this;

    var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var info = arguments[3];

    // temporal plugin details
    var hasTemporalPlugin = backend.definition.hasPlugin('GraphQLFactoryTemporal');
    var temporalExt = backend._temporalExtension;
    var typeDef = _.get(backend.definition, 'types["' + type + '"]');
    var temporalDef = _.get(typeDef, '["' + temporalExt + '"]');
    var isVersioned = _.get(temporalDef, 'versioned') === true;

    // standard details
    var r = backend.r,
        _connection = backend._connection,
        definition = backend.definition;

    var _backend$getTypeInfo = backend.getTypeInfo(type, info),
        before = _backend$getTypeInfo.before,
        after = _backend$getTypeInfo.after,
        error = _backend$getTypeInfo.error,
        timeout = _backend$getTypeInfo.timeout,
        primaryKey = _backend$getTypeInfo.primaryKey;

    var collection = backend.getCollection(type);
    var fnPath = 'backend_' + (batchMode ? 'batchU' : 'u') + 'pdate' + type;

    // ensure that the args are an array
    args = batchMode ? args.batch : [args];

    // create a new promise
    return new Promise$1(function (resolve, reject) {
      var beforeHook = _.get(before, fnPath);
      var afterHook = _.get(after, fnPath);
      var errorHook = _.get(error, fnPath);
      var hookArgs = { source: source, args: batchMode ? args : _.first(args), context: context, info: info };

      // run before hook
      return backend.beforeMiddleware(_this, beforeHook, hookArgs, backend, function (error) {
        if (error) return backend.errorMiddleware(_this, errorHook, error, hookArgs, backend, reject);

        // pull the ids from the args
        var update = null;
        var ids = _.map(_.filter(args, primaryKey), primaryKey);
        if (ids.length !== args.length) {
          return backend.errorMiddleware(_this, errorHook, new Error('missing primaryKey "' + primaryKey + '" in update argument'), hookArgs, backend, reject);
        }

        // handle temporal plugin
        if (hasTemporalPlugin && isVersioned) {
          // check that temporal update is allowed
          if (temporalDef.update === false) {
            return backend.errorMiddleware(_this, errorHook, new Error('update is not allowed on this temporal type'), hookArgs, backend, reject);
          }

          // if a function was specified, use it
          if (_.isFunction(temporalDef.update)) {
            return resolve(temporalDef.update.call(_this, source, args, context, info));
          }

          // if a resolver reference, use that if it exists
          else if (_.isString(temporalDef.update)) {
              var temporalUpdate = _.get(definition, 'functions["' + temporalDef.update + '"]');
              if (!_.isFunction(temporalUpdate)) {
                return backend.errorMiddleware(_this, errorHook, new Error('cannot find function "' + temporalDef.update + '"'), hookArgs, backend, reject);
              }
              return resolve(temporalUpdate.call(_this, source, args, context, info));
            }

            // otherwise use the default version update function
            else {
                var versionUpdate = _.get(_this, 'globals["' + temporalExt + '"].temporalUpdate');
                if (!_.isFunction(versionUpdate)) {
                  return backend.errorMiddleware(_this, errorHook, new Error('could not find "temporalUpdate" in globals'), hookArgs, backend, reject);
                }
                update = versionUpdate(type, args);
              }
        }

        // handle standard update
        else {
            // filter out the current selections
            var notThese = collection.filter(function (f) {
              return r.expr(ids).contains(f(primaryKey)).not();
            });

            // generate an update query with checks
            update = violatesUnique(backend, type, args, notThese).branch(r.error('unique field violation'), existsFilter(backend, type, args).not().branch(r.error('one or more related records were not found'), r.expr(args).forEach(function (arg) {
              return collection.get(arg(primaryKey)).eq(null).branch(r.error(type + ' with id ' + arg(primaryKey) + ' was not found, and could not be updated'), collection.get(arg(primaryKey)).update(arg, { returnChanges: true }));
            }).do(function (summary) {
              return summary('errors').ne(0).branch(r.error(summary('first_error')), collection.filter(function (f) {
                return r.expr(ids).contains(f(primaryKey));
              }).coerceTo('ARRAY').do(function (results) {
                return r.expr(batchMode).branch(results, results.nth(0).default(null));
              }));
            })));
          }

        // run the query
        update.run(_connection).then(function (result) {
          return backend.afterMiddleware(_this, afterHook, result, hookArgs, backend, function (error, result) {
            if (error) return backend.errorMiddleware(_this, errorHook, error, hookArgs, backend, reject);
            return resolve(result);
          });
        }).catch(function (error) {
          return backend.errorMiddleware(_this, errorHook, error, hookArgs, backend, reject);
        });
      });
    }).timeout(timeout || 10000);
  };
};

/**
 * Delete resolver - used as a standard delete resolver function
 * @param {Object} backend - factory backend instance
 * @param {String} type - GraphQL type name to create
 * @param {Boolean} [batchMode=false] - allow batch changes
 * @returns {Function}
 */
function del(backend, type) {
  var batchMode = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  return function (source, args) {
    var _this = this;

    var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var info = arguments[3];

    // temporal plugin details
    var hasTemporalPlugin = backend.definition.hasPlugin('GraphQLFactoryTemporal');
    var temporalExt = backend._temporalExtension;
    var typeDef = _.get(backend.definition, 'types["' + type + '"]');
    var temporalDef = _.get(typeDef, '["' + temporalExt + '"]');
    var isVersioned = _.get(temporalDef, 'versioned') === true;

    // standard details
    var r = backend.r,
        _connection = backend._connection,
        definition = backend.definition;

    var _backend$getTypeInfo = backend.getTypeInfo(type, info),
        before = _backend$getTypeInfo.before,
        after = _backend$getTypeInfo.after,
        error = _backend$getTypeInfo.error,
        timeout = _backend$getTypeInfo.timeout,
        primaryKey = _backend$getTypeInfo.primaryKey;

    var collection = backend.getCollection(type);
    var fnPath = 'backend_' + (batchMode ? 'batchD' : 'd') + 'elete' + type;

    // ensure that the args are an array
    args = batchMode ? args.batch : [args];

    // create a new promise
    return new Promise$1(function (resolve, reject) {
      var beforeHook = _.get(before, fnPath);
      var afterHook = _.get(after, fnPath);
      var errorHook = _.get(error, fnPath);
      var hookArgs = { source: source, args: batchMode ? args : _.first(args), context: context, info: info };

      return backend.beforeMiddleware(_this, beforeHook, hookArgs, backend, function (error) {
        if (error) return backend.errorMiddleware(_this, errorHook, error, hookArgs, backend, reject);

        // pull the ids from the args
        var del = null;
        var ids = _.map(_.filter(args, primaryKey), primaryKey);
        if (ids.length !== args.length) {
          return backend.errorMiddleware(_this, errorHook, new Error('missing primaryKey "' + primaryKey + '" in update argument'), hookArgs, backend, reject);
        }

        // handle temporal plugin
        if (hasTemporalPlugin && isVersioned) {
          // check that temporal update is allowed
          if (temporalDef.delete === false) {
            return backend.errorMiddleware(_this, errorHook, new Error('delete is not allowed on this temporal type'), hookArgs, backend, reject);
          }

          // if a function was specified, use it
          if (_.isFunction(temporalDef.delete)) {
            return resolve(temporalDef.delete.call(_this, source, args, context, info));
          }

          // if a resolver reference, use that if it exists
          else if (_.isString(temporalDef.delete)) {
              var temporalDelete = _.get(definition, 'functions["' + temporalDef.delete + '"]');
              if (!_.isFunction(temporalDelete)) {
                return backend.errorMiddleware(_this, errorHook, new Error('cannot find function "' + temporalDef.delete + '"'), hookArgs, backend, reject);
              }
              return resolve(temporalDelete.call(_this, source, args, context, info));
            }

            // otherwise use the default version update function
            else {
                var versionDelete = _.get(_this, 'globals["' + temporalExt + '"].temporalDelete');
                if (!_.isFunction(versionDelete)) {
                  return backend.errorMiddleware(_this, errorHook, new Error('could not find "temporalDelete" in globals'), hookArgs, backend, reject);
                }
                del = versionDelete(type, args);
              }
        }

        // handle standard delete
        else {
            del = r.expr(ids).forEach(function (id) {
              return collection.get(id).eq(null).branch(r.error(type + ' with id ' + id + ' was not found and cannot be deleted'), collection.get(id).delete({ returnChanges: true }));
            }).do(function (summary) {
              return summary('errors').ne(0).branch(r.error(summary('first_error')), summary('deleted'));
            });
          }

        // run the query
        del.run(_connection).then(function (result) {
          return backend.afterMiddleware(_this, afterHook, result, hookArgs, backend, function (error, result) {
            if (error) return backend.errorMiddleware(_this, errorHook, error, hookArgs, backend, reject);
            return resolve(result);
          });
        }).catch(function (error) {
          return backend.errorMiddleware(_this, errorHook, error, hookArgs, backend, reject);
        });
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

function subscriptionArguments(graphql, requestString, idx) {
  var args = [];
  var Kind = graphql.Kind;
  var request = _.isObject(requestString) ? { definitions: [requestString] } : graphql.parse(requestString);

  _.forEach(request.definitions, function (definition, idx) {
    var kind = definition.kind,
        name = definition.name,
        operation = definition.operation,
        selectionSet = definition.selectionSet;


    if (kind === Kind.OPERATION_DEFINITION && operation === 'subscription') {
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

function subscribe(backend, type) {
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
        error = _backend$getTypeInfo.error,
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

    // handle basic subscribe
    return new Promise$1(function (resolve, reject) {
      var beforeHook = _.get(before, fnPath);
      var afterHook = _.get(after, fnPath);
      var errorHook = _.get(error, fnPath);
      var hookArgs = { source: source, args: args, context: context, info: info };

      return backend.beforeMiddleware(_this, beforeHook, hookArgs, backend, function (error) {
        if (error) return backend.errorMiddleware(_this, errorHook, error, hookArgs, backend, reject);

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
                  return backend.errorMiddleware(_this, errorHook, error, hookArgs, backend, reject);
                })
              };
            }

            // run the query to ensure it is valid before setting up the subscription
            return {
              v: filter.run(connection).then(function (result) {
                // since there a valid response, subscribe via the manager
                return backend.subscriptionManager.subscribe(subscriptionId, subscriber, null, filter, {
                  schema: info.schema,
                  requestString: backend.graphql.print({
                    kind: backend.graphql.Kind.DOCUMENT,
                    definitions: [info.operation]
                  }),
                  rootValue: info.rootValue,
                  context: context,
                  variableValues: info.variableValues
                }, function (error) {
                  if (error) {
                    // on error, attempt to unsubscribe. it doesnt matter if it fails, reject the promise
                    return backend.subscriptionManager.unsubscribe(subscriptionId, subscriber, function () {
                      return backend.errorMiddleware(_this, errorHook, error, hookArgs, backend, reject);
                    });
                  }
                  return resolve(result);
                });
              }).catch(function (error) {
                return backend.errorMiddleware(_this, errorHook, error, hookArgs, backend, reject);
              })
            };
          }();

          if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
        } catch (error) {
          return backend.errorMiddleware(_this, errorHook, error, hookArgs, backend, reject);
        }
      });
    }).timeout(timeout || 10000);
  };
}

function unsubscribe(backend, type) {
  return function (source, args) {
    var _this = this;

    var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var info = arguments[3];
    var subscription = args.subscription,
        subscriber = args.subscriber;

    var _backend$getTypeInfo = backend.getTypeInfo(type, info),
        before = _backend$getTypeInfo.before,
        after = _backend$getTypeInfo.after,
        error = _backend$getTypeInfo.error,
        timeout = _backend$getTypeInfo.timeout;

    var fnPath = 'backend_unsubscribe' + type;

    return new Promise$1(function (resolve, reject) {
      var beforeHook = _.get(before, fnPath);
      var afterHook = _.get(after, fnPath);
      var errorHook = _.get(error, fnPath);
      var hookArgs = { source: source, args: args, context: context, info: info };
      var result = { unsubscribed: true };

      return backend.beforeMiddleware(_this, beforeHook, hookArgs, backend, function (error) {
        if (error) return backend.errorMiddleware(_this, errorHook, error, hookArgs, backend, reject);

        try {
          return backend.subscriptionManager.unsubscribe(subscription, subscriber, function (error) {
            if (error) return backend.errorMiddleware(_this, errorHook, error, hookArgs, backend, reject);
            return backend.afterMiddleware(_this, afterHook, result, hookArgs, backend, function (error, result) {
              if (error) return backend.errorMiddleware(_this, errorHook, error, hookArgs, backend, reject);
              return resolve(result);
            });
          });
        } catch (error) {
          return backend.errorMiddleware(_this, errorHook, error, hookArgs, backend, reject);
        }
      });
    }).timeout(timeout || 10000);
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

      var graphql = this.backend.graphql;

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
          return graphql.graphql(schema, bypassedRequest, _.cloneDeep(rootValue), _.cloneDeep(context), _.cloneDeep(variableValues)).then(function (result) {
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
      var graphql = this.backend.graphql;
      var Kind = graphql.Kind;
      var request = graphql.parse(requestString);

      _.forEach(request.definitions, function (definition) {
        var kind = definition.kind,
            operation = definition.operation,
            selectionSet = definition.selectionSet;

        if (kind === Kind.OPERATION_DEFINITION && operation === 'subscription' && selectionSet) {
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
      return graphql.print(request);
    }
  }]);
  return SubscriptionManager;
}(Events);

// extended backend class for RethinkDB

var GraphQLFactoryRethinkDBBackend = function (_GraphQLFactoryBaseBa) {
  inherits(GraphQLFactoryRethinkDBBackend, _GraphQLFactoryBaseBa);

  /**
   * Initializes a rethinkdb backend instance
   * @param {String} namespace - namespace to using in globals
   * @param {Object} graphql - instance of graphql
   * @param {Object} factory - instance of graphql-factory
   * @param {Object} config - configuration object
   * @param {String} [config.name="GraphQLFactoryBackend"] - plugin name
   * @param {String} [config.extension="_backend"] - plugin extension
   * @param {Object} [config.options] - options hash
   * @param {String} [config.options.store="test"] - default store name
   * @param {String} [config.options.prefix=""] - prefix for collections
   * @param {Object} [config.options.database] - database connection options
   * @param {Array<String>|String} [config.plugin] - additional plugins to merge
   * @param {String} [config.temporalExtension="_temporal"] - temporal plugin extension
   * @param {Object} [config.globals] - Factory globals definition
   * @param {Object} [config.fields] - Factory fields definition
   * @param {Object} config.types - Factory types definition
   * @param {Object} [config.schemas] - Factory schemas definition
   * @param {Object} [config.functions] - Factory functions definition
   * @param {Object} [config.externalTypes] - Factory externalTypes definition
   * @param {Object} [config.installData] - Seed data
   * @param {Object} r - rethinkdb driver
   * @param {Object} [connection] - connection for rethinkdb driver
   * @callback callback
   */
  function GraphQLFactoryRethinkDBBackend(namespace, graphql, factory, r, config, connection) {
    classCallCheck(this, GraphQLFactoryRethinkDBBackend);

    var _this = possibleConstructorReturn(this, (GraphQLFactoryRethinkDBBackend.__proto__ || Object.getPrototypeOf(GraphQLFactoryRethinkDBBackend)).call(this, namespace, graphql, factory, config));

    _this.type = 'GraphQLFactoryRethinkDBBackend';

    // check for a top-level rethinkdb namespace
    if (!r) throw new Error('a rethinkdb or rethinkdbdash top-level namespace is required');

    // store database objects
    _this.r = r;
    _this._connection = connection;
    _this._defaultStore = _.get(config, 'options.store', 'test');

    // utils
    _this.filter = filter;

    // subscription manager
    _this.subscriptionManager = new SubscriptionManager(_this);

    // add values to the globals namespace
    _.merge(_this.definition.globals, defineProperty({}, namespace, { r: r, connection: connection }));
    return _this;
  }

  /*******************************************************************
   * Helper methods
   *******************************************************************/


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
  }, {
    key: 'initStore',
    value: function initStore$$1(type, rebuild, seedData) {
      return initStore.call(this, type, rebuild, seedData);
    }

    /**
     * Determines if the rethink driver has already been connected and connects it if not
     * @callback callback
     * @private
     */

  }, {
    key: '_connectDatabase',
    value: function _connectDatabase() {
      var _this2 = this;

      var callback = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function () {
        return true;
      };

      return new Promise(function (resolve, reject) {
        try {
          var options = _.get(_this2.options, 'database', {});
          // determine if uninitialized rethinkdbdash
          if (!_.isFunction(_.get(_this2.r, 'connect'))) {
            _this2.r = _this2.r(options);
            callback();
            return resolve();
          }

          // check that r is not a connected rethinkdbdash instance and should be a rethinkdb driver
          else if (!_.has(_this2.r, '_poolMaster')) {
              // check for an open connection
              if (_.get(_this2._connection, 'open') !== true) {
                return _this2.r.connect(options, function (error, connection) {
                  if (error) {
                    callback(error);
                    return reject(error);
                  }
                  _this2._connection = connection;
                  callback();
                  return resolve();
                });
              }
              callback();
              return resolve();
            }
          callback();
          return resolve();
        } catch (error) {
          callback(error);
          reject(error);
        }
      });
    }

    /**
     * Overrides the make function to include a database connection check
     * @param callback
     * @return {Promise.<TResult>}
     */

  }, {
    key: 'make',
    value: function make(callback) {
      var _this3 = this;

      this.logger.info({ stream: 'backend' }, 'making backend');
      return this._connectDatabase().then(function () {
        try {
          _this3._compile();
          _this3.logger.info({ stream: 'backend' }, 'successfully made backend');
          callback(null, _this3);
          return _this3;
        } catch (error) {
          _this3.logger.error({ stream: 'backend', error: error }, 'failed to make backend');
          callback(error);
        }
      }).catch(function (error) {
        _this3.logger.error({ stream: 'backend', error: error }, 'failed to make backend');
        callback(error);
        return Promise.reject(error);
      });
    }

    /*******************************************************************
     * Required methods
     *******************************************************************/

  }, {
    key: 'now',
    value: function now(callback) {
      var _this4 = this;

      return new Promise(function (resolve, reject) {
        return _this4.r.now().run(_this4._connection).then(function (d) {
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
      return _updateResolver(this, type);
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
      return _updateResolver(this, type, true);
    }
  }, {
    key: 'batchDeleteResolver',
    value: function batchDeleteResolver(type) {
      return del(this, type, true);
    }
  }, {
    key: 'subscribeResolver',
    value: function subscribeResolver(type) {
      return subscribe(this, type);
    }
  }, {
    key: 'unsubscribeResolver',
    value: function unsubscribeResolver(type) {
      return unsubscribe(this, type);
    }
  }]);
  return GraphQLFactoryRethinkDBBackend;
}(GraphQLFactoryBaseBackend);

/**
 * @module graphql-factory-backend
 * @description graphql-factory extension that creates generic resolver functions that handle
 * nested relationships, unique constraints, and basic crud operations as well as
 * subscriptions. Also serves as an extendable class
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 *
 */
var index = {
  GraphQLFactoryBaseBackend: GraphQLFactoryBaseBackend,
  GraphQLFactoryRethinkDBBackend: GraphQLFactoryRethinkDBBackend,
  subscriptionEvent: subscriptionEvent
};

exports.GraphQLFactoryBaseBackend = GraphQLFactoryBaseBackend;
exports.GraphQLFactoryRethinkDBBackend = GraphQLFactoryRethinkDBBackend;
exports.subscriptionEvent = subscriptionEvent;
exports['default'] = index;
