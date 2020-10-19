"use strict";

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

require('./bundle');

require('./adyen-giving');

var maskedCardNumber;
var MASKED_CC_PREFIX = '************';
var selectedMethod;
var componentsObj = {};
var checkoutConfiguration;
var paymentMethodsResponse;
var checkout;
var formErrorsExist;
var isValid;
/**
 * @function
 * @description Initializes Adyen Secured Fields  Billing events
 */

function initializeBillingEvents() {
  $('#billing-submit').on('click', function () {
    var isAdyenPOS = document.querySelector('.payment-method-options :checked').value === 'AdyenPOS';

    if (isAdyenPOS) {
      document.querySelector('#dwfrm_adyPaydata_terminalId').value = document.querySelector('#terminalList').value;
      return true;
    }

    var adyenPaymentMethod = document.querySelector('#adyenPaymentMethodName');
    var paymentMethodLabel = document.querySelector("#lb_".concat(selectedMethod)).innerHTML;
    adyenPaymentMethod.value = paymentMethodLabel;
    validateComponents();
    return showValidation();
  });

  if (window.getPaymentMethodsResponse) {
    paymentMethodsResponse = window.getPaymentMethodsResponse;
    checkoutConfiguration = window.Configuration;

    checkoutConfiguration.onChange = function (state
    /* , component */
    ) {
      var type = state.data.paymentMethod.type;
      isValid = state.isValid;

      if (!componentsObj[type]) {
        componentsObj[type] = {};
      }

      componentsObj[type].isValid = isValid;
      componentsObj[type].stateData = state.data;
    };

    checkoutConfiguration.showPayButton = false;
    checkoutConfiguration.paymentMethodsConfiguration = {
      card: {
        enableStoreDetails: showStoreDetails,
        onBrand: function onBrand(brandObject) {
          $('#cardType').val(brandObject.brand);
        },
        onFieldValid: function onFieldValid(data) {
          if (data.endDigits) {
            maskedCardNumber = MASKED_CC_PREFIX + data.endDigits;
            $('#cardNumber').val(maskedCardNumber);
          }
        },
        onChange: function onChange(state) {
          isValid = state.isValid;
          var componentName = state.data.paymentMethod.storedPaymentMethodId ? "storedCard".concat(state.data.paymentMethod.storedPaymentMethodId) : state.data.paymentMethod.type;

          if (componentName === selectedMethod) {
            $('#browserInfo').val(JSON.stringify(state.data.browserInfo));
            componentsObj[selectedMethod].isValid = isValid;
            componentsObj[selectedMethod].stateData = state.data;
          }
        }
      },
      boletobancario: {
        personalDetailsRequired: true,
        // turn personalDetails section on/off
        billingAddressRequired: false,
        // turn billingAddress section on/off
        showEmailAddress: false // allow shopper to specify their email address

      },
      paywithgoogle: {
        environment: window.Configuration.environment,
        onSubmit: () => {
          assignPaymentMethodValue();
          document.querySelector('#billing-submit').disabled = false;
          document.querySelector('#billing-submit').click();
        },
        configuration: {
          gatewayMerchantId: window.merchantAccount
        },
        showPayButton: true,
        buttonColor: 'white'
      },
      paypal: {
        environment: window.Configuration.environment,
        intent: 'capture',
        onClick: (data, actions) => {
          $('#dwfrm_billing').trigger('submit');

          if (formErrorsExist) {
            return actions.reject();
          }
        },
        onSubmit: (state, component) => {
          assignPaymentMethodValue();
          paymentFromComponent(state.data, component);
          document.querySelector('#adyenStateData').value = JSON.stringify(state.data);
        },
        onCancel: (data, component) => {
          paymentFromComponent({
            cancelPaypal: true
          }, component);
        },
        onError: () =>
        /* error, component */
        {
          $('#dwfrm_billing').trigger('submit');
        },
        onAdditionalDetails: (state
        /* , component */
        ) => {
          document.querySelector('#paymentFromComponentStateData').value = JSON.stringify(state.data);
          $('#dwfrm_billing').trigger('submit');
        }
      },
      mbway: {
        showPayButton: true,
        onSubmit: (state, component) => {
          $('#dwfrm_billing').trigger('submit');
          assignPaymentMethodValue();

          if (formErrorsExist) {
            return false;
          }

          document.getElementById('component_mbway').querySelector('button').disabled = true;
          paymentFromComponent(state.data, component);
          document.querySelector('#adyenStateData').value = JSON.stringify(state.data);
        },
        onError: () =>
        /* error, component */
        {
          $('#dwfrm_billing').trigger('submit');
        },
        onAdditionalDetails: (state
        /* , component */
        ) => {
          document.querySelector('#paymentFromComponentStateData').value = JSON.stringify(state.data);
          $('#dwfrm_billing').trigger('submit');
        }
      },
      afterpay_default: {
        visibility: {
          personalDetails: 'editable',
          billingAddress: 'hidden',
          deliveryAddress: 'hidden'
        },
        data: {
          personalDetails: {
            firstName: document.querySelector('#dwfrm_billing_billingAddress_addressFields_firstName').value,
            lastName: document.querySelector('#dwfrm_billing_billingAddress_addressFields_lastName').value,
            telephoneNumber: document.querySelector('#dwfrm_billing_billingAddress_addressFields_phone').value,
            shopperEmail: document.querySelector('#dwfrm_billing_billingAddress_email_emailAddress').value
          }
        }
      },
      facilypay_3x: {
        visibility: {
          personalDetails: 'editable',
          billingAddress: 'hidden',
          deliveryAddress: 'hidden'
        },
        data: {
          personalDetails: {
            firstName: document.querySelector('#dwfrm_billing_billingAddress_addressFields_firstName').value,
            lastName: document.querySelector('#dwfrm_billing_billingAddress_addressFields_lastName').value,
            telephoneNumber: document.querySelector('#dwfrm_billing_billingAddress_addressFields_phone').value,
            shopperEmail: document.querySelector('#dwfrm_billing_billingAddress_email_emailAddress').value
          }
        }
      }
    };

    if (window.installments) {
      try {
        var installments = JSON.parse(window.installments);
        checkoutConfiguration.paymentMethodsConfiguration.card.installments = installments;
      } catch (e) {} // eslint-disable-line no-empty

    }

    if (window.paypalMerchantID !== 'null') {
      checkoutConfiguration.paymentMethodsConfiguration.paypal.merchantId = window.paypalMerchantID;
    }

    if (window.googleMerchantID !== 'null' && window.Configuration.environment === 'LIVE') {
      checkoutConfiguration.paymentMethodsConfiguration.paywithgoogle.merchantIdentifier = window.googleMerchantID;
    }

    renderGenericComponent();
  }
}
/**
 * @function
 * @description Initializes Adyen Checkout My Account events
 */


function initializeAccountEvents() {
  checkoutConfiguration = window.Configuration;
  checkout = new AdyenCheckout(checkoutConfiguration);
  var newCard = document.getElementById('newCard');
  var adyenStateData;
  var isValid = false;
  var node = checkout.create('card', {
    hasHolderName: true,
    holderNameRequired: true,
    onChange: function onChange(state) {
      adyenStateData = state.data;
      isValid = state.isValid;
    }
  }).mount(newCard);
  $('#applyBtn').on('click', function () {
    if (!isValid) {
      node.showValidation();
      return false;
    }

    document.querySelector('#adyenStateData').value = JSON.stringify(adyenStateData);
  });
}

function assignPaymentMethodValue() {
  var adyenPaymentMethod = document.querySelector('#adyenPaymentMethodName');
  adyenPaymentMethod.value = document.querySelector("#lb_".concat(selectedMethod)).innerHTML;
}
/**
 * To avoid re-rendering components twice, unmounts existing components from payment methods list
 */


function unmountComponents() {
  var promises = Object.entries(componentsObj).map(function (_ref) {
    var [key, val] = _ref;
    delete componentsObj[key];
    return resolveUnmount(key, val);
  });
  return Promise.all(promises);
}

function resolveUnmount(key, val) {
  try {
    return Promise.resolve(val.node.unmount("component_".concat(key)));
  } catch (e) {
    // try/catch block for val.unmount
    return Promise.resolve(false);
  }
}

function displaySelectedMethod(type) {
  selectedMethod = type;
  resetPaymentMethod();

  if (['paypal', 'paywithgoogle', 'mbway'].indexOf(type) > -1) {
    document.querySelector('#billing-submit').disabled = true;
  } else {
    document.querySelector('#billing-submit').disabled = false;
  }

  document.querySelector("#component_".concat(type)).setAttribute('style', 'display:block');
}

function resetPaymentMethod() {
  $('.additionalFields').hide();
}

function showValidation() {
  if (componentsObj[selectedMethod] && !componentsObj[selectedMethod].isValid) {
    componentsObj[selectedMethod].node.showValidation();
    return false;
  }

  if (selectedMethod === 'ach') {
    var inputs = document.querySelectorAll('#component_ach > input');
    inputs = Object.values(inputs).filter(function (input) {
      return !(input.value && input.value.length > 0);
    });

    for (var i = 0; i < inputs.length; i++) {
      inputs[i].classList.add('adyen-checkout__input--error');
    }

    if (inputs.length) {
      return false;
    }
  } else if (selectedMethod === 'ratepay') {
    var input = document.querySelector('#dateOfBirthInput');

    if (!(input.value && input.value.length > 0)) {
      input.classList.add('adyen-checkout__input--error');
      return false;
    }
  }

  return true;
}
/**
 * Assigns stateData value to the hidden stateData input field so it's sent to the backend for processing
 */


function validateComponents() {
  if (document.querySelector('#component_ach')) {
    var inputs = document.querySelectorAll('#component_ach > input');

    for (var input of inputs) {
      input.onchange = function () {
        validateCustomInputField(this);
      };
    }
  }

  if (document.querySelector('#dateOfBirthInput')) {
    document.querySelector('#dateOfBirthInput').onchange = function () {
      validateCustomInputField(this);
    };
  }

  var stateData;

  if (componentsObj[selectedMethod] && componentsObj[selectedMethod].stateData) {
    stateData = componentsObj[selectedMethod].stateData;
  } else {
    stateData = {
      paymentMethod: {
        type: selectedMethod
      }
    };
  }

  if (selectedMethod === 'ach') {
    var bankAccount = {
      ownerName: document.querySelector('#bankAccountOwnerNameValue').value,
      bankAccountNumber: document.querySelector('#bankAccountNumberValue').value,
      bankLocationId: document.querySelector('#bankLocationIdValue').value
    };
    stateData.paymentMethod = _objectSpread(_objectSpread({}, stateData.paymentMethod), {}, {
      bankAccount: bankAccount
    });
  } else if (selectedMethod === 'ratepay') {
    if (document.querySelector('#genderInput').value && document.querySelector('#dateOfBirthInput').value) {
      stateData.shopperName = {
        gender: document.querySelector('#genderInput').value
      };
      stateData.dateOfBirth = document.querySelector('#dateOfBirthInput').value;
    }
  }

  document.querySelector('#adyenStateData').value = JSON.stringify(stateData);
}

function validateCustomInputField(input) {
  if (input.value === '') {
    input.classList.add('adyen-checkout__input--error');
  } else if (input.value.length > 0) {
    input.classList.remove('adyen-checkout__input--error');
  }
}
/**
 * Contains fallback components for payment methods that don't have an Adyen web component yet
 */


function getFallback(paymentMethod) {
  var ach = "<div id=\"component_ach\">\n                    <span class=\"adyen-checkout__label\">Bank Account Owner Name</span>\n                    <input type=\"text\" id=\"bankAccountOwnerNameValue\" class=\"adyen-checkout__input\">\n                    <span class=\"adyen-checkout__label\">Bank Account Number</span>\n                    <input type=\"text\" id=\"bankAccountNumberValue\" class=\"adyen-checkout__input\" maxlength=\"17\" >\n                    <span class=\"adyen-checkout__label\">Routing Number</span>\n                    <input type=\"text\" id=\"bankLocationIdValue\" class=\"adyen-checkout__input\" maxlength=\"9\" >\n                 </div>";
  var ratepay = "<span class=\"adyen-checkout__label\">Gender</span>\n                    <select id=\"genderInput\" class=\"adyen-checkout__input\">\n                        <option value=\"MALE\">Male</option>\n                        <option value=\"FEMALE\">Female</option>\n                    </select>\n                    <span class=\"adyen-checkout__label\">Date of birth</span>\n                    <input id=\"dateOfBirthInput\" class=\"adyen-checkout__input\" type=\"date\"/>";
  var fallback = {
    ach: ach,
    ratepay: ratepay
  };
  return fallback[paymentMethod];
}
/**
 * checks if payment method is blocked and returns a boolean accordingly
 */


function isMethodTypeBlocked(methodType) {
  var blockedMethods = ['bcmc_mobile_QR', 'applepay', 'cup', 'wechatpay', 'wechatpay_pos', 'wechatpaySdk', 'wechatpayQr'];
  return blockedMethods.includes(methodType);
}
/**
 * Calls getPaymenMethods and then renders the retrieved payment methods (including card component)
 */


function renderGenericComponent() {
  return _renderGenericComponent.apply(this, arguments);
}

function _renderGenericComponent() {
  _renderGenericComponent = _asyncToGenerator(function* () {
    if (Object.keys(componentsObj).length) {
      yield unmountComponents();
    }

    var paymentMethod;
    var i;
    checkoutConfiguration.paymentMethodsResponse = paymentMethodsResponse.adyenPaymentMethods;
    var paymentMethods = paymentMethodsResponse.adyenPaymentMethods;

    if (paymentMethodsResponse.amount) {
      checkoutConfiguration.amount = paymentMethodsResponse.amount;
    }

    if (paymentMethodsResponse.countryCode) {
      checkoutConfiguration.countryCode = paymentMethodsResponse.countryCode;
    }

    checkout = new AdyenCheckout(checkoutConfiguration);
    document.querySelector('#paymentMethodsList').innerHTML = '';

    if (paymentMethods.storedPaymentMethods) {
      for (i = 0; i < checkout.paymentMethodsResponse.storedPaymentMethods.length; i++) {
        paymentMethod = checkout.paymentMethodsResponse.storedPaymentMethods[i];

        if (paymentMethod.supportedShopperInteractions.includes('Ecommerce')) {
          renderPaymentMethod(paymentMethod, true, paymentMethodsResponse.ImagePath);
        }
      }
    }

    paymentMethods.paymentMethods.forEach(pm => {
      !isMethodTypeBlocked(pm.type) && renderPaymentMethod(pm, false, paymentMethodsResponse.ImagePath);
    });
    var firstPaymentMethod = document.querySelector('input[type=radio][name=brandCode]');
    firstPaymentMethod.checked = true;
    displaySelectedMethod(firstPaymentMethod.value);
  });
  return _renderGenericComponent.apply(this, arguments);
}

function renderPaymentMethod(paymentMethod, storedPaymentMethodBool, path) {
  var paymentMethodsUI = document.querySelector('#paymentMethodsList');
  var li = document.createElement('li');
  var paymentMethodID = storedPaymentMethodBool ? "storedCard".concat(paymentMethod.id) : paymentMethod.type;
  var isSchemeNotStored = paymentMethod.type === 'scheme' && !storedPaymentMethodBool;
  var paymentMethodImage = storedPaymentMethodBool ? "".concat(path).concat(paymentMethod.brand, ".png") : "".concat(path).concat(paymentMethod.type, ".png");
  var cardImage = "".concat(path, "card.png");
  var imagePath = isSchemeNotStored ? cardImage : paymentMethodImage;
  var label = storedPaymentMethodBool ? "".concat(paymentMethod.name, " ").concat(MASKED_CC_PREFIX).concat(paymentMethod.lastFour) : "".concat(paymentMethod.name);
  var liContents = "\n                              <input name=\"brandCode\" type=\"radio\" value=\"".concat(paymentMethodID, "\" id=\"rb_").concat(paymentMethodID, "\">\n                              <img class=\"paymentMethod_img\" src=\"").concat(imagePath, "\" ></img>\n                              <label id=\"lb_").concat(paymentMethodID, "\" for=\"rb_").concat(paymentMethodID, "\" style=\"float: none; width: 100%; display: inline; text-align: inherit\">").concat(label, "</label>\n                             ");
  var container = document.createElement('div');
  li.innerHTML = liContents;
  li.classList.add('paymentMethod');
  var node = renderCheckoutComponent(storedPaymentMethodBool, checkout, paymentMethod, container, paymentMethodID);
  container.classList.add('additionalFields');
  container.setAttribute('id', "component_".concat(paymentMethodID));
  container.setAttribute('style', 'display:none');
  li.append(container);
  paymentMethodsUI.append(li);

  if (paymentMethod.type !== 'paywithgoogle') {
    node && node.mount(container);
  } else {
    node.isAvailable().then(() => {
      node.mount(container);
    }).catch(() => {}); // eslint-disable-line no-empty
  }

  var input = document.querySelector("#rb_".concat(paymentMethodID));

  input.onchange = event => {
    displaySelectedMethod(event.target.value);
  };

  if (componentsObj[paymentMethodID] && !container.childNodes[0]) {
    componentsObj[paymentMethodID].isValid = true;
  }
}

function renderCheckoutComponent(storedPaymentMethodBool, checkout, paymentMethod, container, paymentMethodID) {
  if (storedPaymentMethodBool) {
    return createCheckoutComponent(checkout, paymentMethod, container, paymentMethodID);
  }

  var fallback = getFallback(paymentMethod.type);

  if (fallback) {
    var template = document.createElement('template');
    template.innerHTML = fallback;
    container.append(template.content);
    return;
  }

  return createCheckoutComponent(checkout, paymentMethod, container, paymentMethodID);
}

function createCheckoutComponent(checkout, paymentMethod, container, paymentMethodID) {
  try {
    var node = checkout.create(paymentMethod.type, paymentMethod);

    if (!componentsObj[paymentMethodID]) {
      componentsObj[paymentMethodID] = {};
    }

    componentsObj[paymentMethodID].node = node;
    return node;
  } catch (e) {} // eslint-disable-line no-empty


  return false;
}
/**
 * Makes an ajax call to the controller function PaymentFromComponent. Used by certain payment methods like paypal
 */


function paymentFromComponent(data, component) {
  $.ajax({
    url: window.paymentFromComponentUrl,
    type: 'post',
    data: JSON.stringify(data),
    contentType: 'application/; charset=utf-8',
    success: function success(data) {
      if (data.result && data.result.fullResponse && data.result.fullResponse.action) {
        component.handleAction(data.result.fullResponse.action);
      } else {
        document.querySelector('#paymentFromComponentStateData').value = JSON.stringify('null');
        $('#dwfrm_billing').trigger('submit');
      }
    }
  }).fail(function ()
  /* xhr, textStatus */
  {});
}

$('#dwfrm_billing').submit(function (e) {
  if (['paypal', 'mbway'].indexOf(selectedMethod) > -1 && !document.querySelector('#paymentFromComponentStateData').value) {
    e.preventDefault();
    var form = $(this);
    var url = form.attr('action');
    $.ajax({
      type: 'POST',
      url: url,
      data: form.serialize(),
      async: false,
      success: function success(data) {
        formErrorsExist = data.fieldErrors;
      }
    });
  }
});
/**
 * @function
 * @description Initializes Adyen CSE billing events
 */

exports.initBilling = function () {
  initializeBillingEvents();
};

exports.initAccount = function () {
  initializeAccountEvents();
};

exports.renderGenericComponent = function () {
  renderGenericComponent();
};