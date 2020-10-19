"use strict";

var Resource = require('dw/web/Resource');

var Logger = require('dw/system/Logger');
/**
 * default hook if no payment form processor is supported
 * @return {Object} an object that contains error information
 */


function processForm() {
  Logger.getLogger('Adyen').error('processForm ....');
  var errors = [];
  errors.push(Resource.msg('error.payment.processor.not.supported', 'checkout', null));
  return {
    fieldErrors: [],
    serverErrors: errors,
    error: true
  };
}
/**
 * default hook if no save payment information processor is supported
 */


function savePaymentInformation() {}

exports.processForm = processForm;
exports.savePaymentInformation = savePaymentInformation;