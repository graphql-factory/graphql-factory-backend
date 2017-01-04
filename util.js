'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _ = _interopDefault(require('lodash'));
var md5 = _interopDefault(require('md5'));

function subscriptionEvent(name) {
  var args = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (!name) throw new Error('subscriptionEvent creation requires a subscription name');

  try {
    return 'subscription:' + md5('name:' + JSON.stringify(_.omit(args, ['subscriber'])));
  } catch (err) {
    throw new Error('Unable to create subscription event, arguments may have a cyclical reference');
  }
}

var util = {
  subscriptionEvent: subscriptionEvent
};

module.exports = util;
