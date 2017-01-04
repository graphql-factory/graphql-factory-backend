'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _ = _interopDefault(require('lodash'));
var md5 = _interopDefault(require('md5'));

function selectionArguments(selections) {
  var args = {};

  _.forEach(selections, function (selection, idx) {
    var name = selection.name,
        selectionSet = selection.selectionSet;


    var key = _.get(name, 'name', '' + idx);
    args[key] = {};
    _.forEach(selection.arguments, function (arg) {
      args[key][_.get(arg, 'name.value')] = _.get(arg, 'value.value');
    });

    if (selectionSet) args._subquery = selectionArguments(selectionSet.selections);
  });

  return args;
}

function subscriptionArguments(graphql, requestString) {
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

  return args;
}

function subscriptionEvent(name) {
  var args = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (!name) throw new Error('subscriptionEvent creation requires a subscription name');

  try {
    return 'subscription:' + md5('name:' + JSON.stringify(_.omit(args, ['subscriber'])));
  } catch (err) {
    throw new Error('Unable to create subscription event, arguments may have a cyclical reference');
  }
}

function subscriptionDetails(graphql, requestString) {
  var details = {
    subscribe: [],
    unsubscribe: []
  };

  _.forEach(subscriptionArguments(graphql, requestString), function (arg) {
    var name = arg.name,
        argument = arg.argument;

    var subscription = subscriptionEvent(name, argument);

    if (name.match(/^unsubscribe.*/)) {
      details.unsubscribe.push(subscription);
    } else {
      details.subscribe.push(_.merge({}, arg, {
        subscription: subscription
      }));
    }
  });
  details.operations = details.subscribe.length + details.unsubscribe.length;

  return details;
}

function subscriptionNames(graphql, requestString) {
  var names = [];
  var Kind = graphql.Kind;
  var request = graphql.parse(requestString);

  _.forEach(request.definitions, function (definition, idx) {
    var kind = definition.kind,
        name = definition.name,
        operation = definition.operation;


    if (kind === Kind.OPERATION_DEFINITION && operation === 'subscription') {
      names.push(_.get(name, 'value', '' + idx));
    }
  });

  return names;
}

var util = {
  subscriptionArguments: subscriptionArguments,
  subscriptionDetails: subscriptionDetails,
  subscriptionEvent: subscriptionEvent,
  subscriptionNames: subscriptionNames
};

module.exports = util;
