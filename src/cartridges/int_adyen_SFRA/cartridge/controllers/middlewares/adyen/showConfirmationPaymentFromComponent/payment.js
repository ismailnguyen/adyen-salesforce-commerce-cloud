const OrderMgr = require('dw/order/OrderMgr');
const Transaction = require('dw/system/Transaction');
const URLUtils = require('dw/web/URLUtils');
const Locale = require('dw/util/Locale');
const Resource = require('dw/web/Resource');
const adyenCheckout = require('*/cartridge/scripts/adyenCheckout');
const COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
const OrderModel = require('*/cartridge/models/order');
const AdyenHelper = require('*/cartridge/scripts/util/adyenHelper');
const constants = require('*/cartridge/adyenConstants/constants');
const { clearForms } = require('../../../utils/index');

function handlePaymentError(order, { res, next }) {
  Transaction.wrap(() => {
    OrderMgr.failOrder(order, true);
  });
  res.redirect(
    URLUtils.url(
      'Checkout-Begin',
      'stage',
      'placeOrder',
      'paymentError',
      Resource.msg('error.payment.not.valid', 'checkout', null),
    ),
  );
  return next();
}

function handlePaymentsDetailsCall(stateData, adyenPaymentInstrument) {
  const { details, paymentData } = stateData;

  // redirect to payment/details
  const requestObject = {
    details,
    paymentData,
  };

  const result = adyenCheckout.doPaymentDetailsCall(requestObject);
  return { result, adyenPaymentInstrument };
}

function handleAuthorisedPayment(
  order,
  result,
  adyenPaymentInstrument,
  { req, res, next },
) {
  // custom fraudDetection
  const fraudDetectionStatus = { status: 'success' };

  // Places the order
  const placeOrderResult = COHelpers.placeOrder(order, fraudDetectionStatus);
  if (placeOrderResult.error) {
    return handlePaymentError(order, { res, next });
  }

  const currentLocale = Locale.getLocale(req.locale.id);
  const orderModel = new OrderModel(order, {
    countryCode: currentLocale.country,
  });

  // Save orderModel to custom object during session
  Transaction.wrap(() => {
    order.custom.Adyen_CustomerEmail = JSON.stringify(orderModel);
    AdyenHelper.savePaymentDetails(adyenPaymentInstrument, order, result);
  });

  clearForms.clearForms();
  res.redirect(
    URLUtils.https(
      'Order-Confirm',
      'ID',
      order.orderNo,
      'token',
      order.orderToken,
    ).toString(),
  );
  return next();
}

function handlePayment(stateData, order, options) {
  const paymentInstruments = order.getPaymentInstruments(
    constants.METHOD_ADYEN_COMPONENT,
  );

  const adyenPaymentInstrument = paymentInstruments[0];
  const hasStateData = stateData?.paymentData && stateData?.details;

  if (!hasStateData) {
    return handlePaymentError(order, options);
  }

  const { result } = handlePaymentsDetailsCall(
    stateData,
    adyenPaymentInstrument,
  );

  Transaction.wrap(() => {
    adyenPaymentInstrument.custom.adyenPaymentData = null;
  });
  // Authorised: The payment authorisation was successfully completed.
  if (['Authorised', 'Pending', 'Received'].indexOf(result.resultCode) > -1) {
    return handleAuthorisedPayment(
      order,
      result,
      adyenPaymentInstrument,
      options,
    );
  }
  return handlePaymentError(order, options);
}

module.exports = handlePayment;
