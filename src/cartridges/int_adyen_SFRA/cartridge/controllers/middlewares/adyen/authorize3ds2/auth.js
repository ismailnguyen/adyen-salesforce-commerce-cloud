const OrderMgr = require('dw/order/OrderMgr');
const constants = require('*/cartridge/adyenConstants/constants');
const handlePaymentsCall = require('./payment');
const { toggle3DS2Error } = require('./errorHandler');

function contains3ds2Action({ req }) {
  return (
    ['IdentifyShopper', 'ChallengeShopper'].indexOf(req.form.resultCode) !==
      -1 || req.form.challengeResult
  );
}

function handle3DS2Authentication(options) {
  const { req } = options;
  // TODOBAS get merchantReference from req
  const order = OrderMgr.getOrder(session.privacy.orderNo);
  const paymentInstrument = order.getPaymentInstruments(
    constants.METHOD_ADYEN_COMPONENT,
  )[0];
  const paymentDetailsRequest = {
    paymentData: paymentInstrument.custom.adyenPaymentData,
    details: JSON.parse(req.form.stateData).details,
  };
  return handlePaymentsCall(
    paymentDetailsRequest,
    order,
    paymentInstrument,
    options,
  );
}

function createAuthorization(session, options) {
  const is3DS2 = contains3ds2Action(options);
  return is3DS2
    ? handle3DS2Authentication(session, options)
    : toggle3DS2Error(options);
}

module.exports = createAuthorization;
