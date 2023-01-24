const { loginId, transactionKey } = require("../auth-config");
const ApiContracts = require("authorizenet").APIContracts;
const ApiControllers = require("authorizenet").APIControllers;
var utils = require("../utils/auth-utils.js");
const { validateForm } = require("../lib/index");
module.exports = function (app) {
  app.post("/checkout-method", async (req, res) => {
    const validationErrors = validateForm(req);
    if (validationErrors.length > 0) {
      res.json({ errors: validationErrors });
      return;
    }
    var merchantAuthenticationType =
      new ApiContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(loginId);
    merchantAuthenticationType.setTransactionKey(transactionKey);

    var creditCard = new ApiContracts.CreditCardType();
    creditCard.setCardNumber(req.body.cc);
    creditCard.setExpirationDate(req.body.expire);
    creditCard.setCardCode(req.body.cvv);

    var paymentType = new ApiContracts.PaymentType();
    paymentType.setCreditCard(creditCard);

    var orderDetails = new ApiContracts.OrderType();
    orderDetails.setInvoiceNumber("INV_" + utils.getRandomInt("random"));
    orderDetails.setDescription(
      `${req.body.amount} has been Deducted from Credit Card With subscriptionId:${req.body?.subscriptionId}`
    );

    var billTo = new ApiContracts.CustomerAddressType();
    billTo.setFirstName(req.body?.fname ? req.body?.fname : req.body?.user?.fname);
    billTo.setLastName(req.body?.lname ? req.body?.lname : req.body?.user?.lname);
    billTo.setAddress(
      req.body.streetAddressLine1
        ? req.body.streetAddressLine1
        : req.body.user.streetAddressLine1
    );
    billTo.setCity(req.body.city ? req.body.city : req.body.user.city);
    billTo.setState(
      req?.body?.stateOrProvince
        ? req?.body?.stateOrProvince
        : req?.body?.user?.stateOrProvince
    );
    billTo.setZip(
      req.body.postalCode ? req.body.postalCode : req.body.user.postalCode
    );
    billTo.setCountry(
      req.body.country ? req.body.country : req.body.user.country
    );
    var shipTo = new ApiContracts.CustomerAddressType();
    shipTo.setFirstName(req.body.fname ? req.body.fname : req.body.user.fname);
    shipTo.setLastName(req.body.lname ? req.body.lname : req.body.user.lname);
    shipTo.setCompany(
      req.body.category ? req.body.category : req.body.user.category
    );
    shipTo.setAddress(
      req.body.streetAddressLine1
        ? req.body.streetAddressLine1
        : req.body.user.streetAddressLine1
    );
    shipTo.setCity(req.body.city ? req.body.city : req.body.user.city);
    shipTo.setState(
      req?.body?.stateOrProvince
        ? req?.body?.stateOrProvince
        : req?.body?.user?.stateOrProvince
    );
    shipTo.setZip(
      req.body.postalCode ? req.body.postalCode : req.body.user.postalCode
    );
    shipTo.setCountry(
      req.body.country ? req.body.country : req.body.user.country
    );

    var userField_a = new ApiContracts.UserField();
    userField_a.setName(req?.body?.profile?.customerProfileId);
    userField_a.setValue(req?.body?.profile?.customerPaymentProfileId);

    var userFieldList = [];
    userFieldList.push(userField_a);

    var userFields = new ApiContracts.TransactionRequestType.UserFields();
    userFields.setUserField(userFieldList);

    var transactionSetting2 = new ApiContracts.SettingType();
    transactionSetting2.setSettingName("recurringBilling");
    transactionSetting2.setSettingValue("false");

    var transactionSettingList = [];
    transactionSettingList.push(transactionSetting2);

    var transactionSettings = new ApiContracts.ArrayOfSetting();
    transactionSettings.setSetting(transactionSettingList);

    var transactionRequestType = new ApiContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(
      ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION
    );
    transactionRequestType.setPayment(paymentType);
    transactionRequestType.setAmount(req.body.amount);
    transactionRequestType.setUserFields(userFields);
    transactionRequestType.setOrder(orderDetails);
    transactionRequestType.setBillTo(billTo);
    transactionRequestType.setShipTo(shipTo);
    transactionRequestType.setTransactionSettings(transactionSettings);

    var createRequest = new ApiContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequestType);

    //pretty print request
    // res.send(JSON.stringify(createRequest.getJSON(), null, 2));
    // console.log(JSON.stringify(createRequest.getJSON(), null, 2));

    var ctrl = new ApiControllers.CreateTransactionController(
      createRequest.getJSON()
    );
    //Defaults to sandbox
    //ctrl.setEnvironment(SDKConstants.endpoint.production);

    ctrl.execute(function () {
      var apiResponse = ctrl.getResponse();

      var response = new ApiContracts.CreateTransactionResponse(apiResponse);

      //pretty print response
      res.send(JSON.stringify(response, null, 2));
      // console.log(JSON.stringify(response, null, 2));

      if (response != null) {
        if (
          response.getMessages().getResultCode() ==
          ApiContracts.MessageTypeEnum.OK
        ) {
          if (response.getTransactionResponse().getMessages() != null) {
            // response.send(getTransactionResponse().getTransId());
            // res.send(response.getTransactionResponse().getTransId());
            console.log(
              "Successfully created transaction with Transaction ID: " +
                response.getTransactionResponse().getTransId()
            );
            // res.send(response.getTransactionResponse().getResponseCode());
            console.log(
              "Response Code: " +
                response.getTransactionResponse().getResponseCode()
            );
            // res.send(
            //   response
            //     .getTransactionResponse()
            //     .getMessages()
            //     .getMessage()[0]
            //     .getCode()
            // );
            console.log(
              "Message Code: " +
                response
                  .getTransactionResponse()
                  .getMessages()
                  .getMessage()[0]
                  .getCode()
            );
            // res.send(
            //   response
            //     .getTransactionResponse()
            //     .getMessages()
            //     .getMessage()[0]
            //     .getDescription()
            // );

            console.log(
              "Description: " +
                response
                  .getTransactionResponse()
                  .getMessages()
                  .getMessage()[0]
                  .getDescription()
            );
          } else {
            console.log("Failed Transaction.");
            if (response.getTransactionResponse().getErrors() != null) {
              // res.send(
              //   response
              //     .getTransactionResponse()
              //     .getErrors()
              //     .getError()[0]
              //     .getErrorCode()
              // );

              console.log(
                "Error Code: " +
                  response
                    .getTransactionResponse()
                    .getErrors()
                    .getError()[0]
                    .getErrorCode()
              );

              // res.send(
              //   response
              //     .getTransactionResponse()
              //     .getErrors()
              //     .getError()[0]
              //     .getErrorText()
              // );
              console.log(
                "Error message: " +
                  response
                    .getTransactionResponse()
                    .getErrors()
                    .getError()[0]
                    .getErrorText()
              );
            }
          }
        } else {
          console.log("Failed Transaction. ");
          if (
            response.getTransactionResponse() != null &&
            response.getTransactionResponse().getErrors() != null
          ) {
            // res.send(
            //   response
            //     .getTransactionResponse()
            //     .getErrors()
            //     .getError()[0]
            //     .getErrorCode()
            // );
            console.log(
              "Error Code: " +
                response
                  .getTransactionResponse()
                  .getErrors()
                  .getError()[0]
                  .getErrorCode()
            );
            // res.send(
            //   response
            //     .getTransactionResponse()
            //     .getErrors()
            //     .getError()[0]
            //     .getErrorText()
            // );
            console.log(
              "Error message: " +
                response
                  .getTransactionResponse()
                  .getErrors()
                  .getError()[0]
                  .getErrorText()
            );
          } else {
            console.log(
              "Error Code: " + response.getMessages().getMessage()[0].getCode()
            );
            console.log(
              "Error message: " +
                response.getMessages().getMessage()[0].getText()
            );
          }
        }
      } else {
        console.log("Null Response.");
      }

      //   callback(response);
    });
  });
  if (require.main === module) {
    chargeCreditCard(function () {
      console.log("chargeCreditCard call complete.");
    });
  }

  // module.exports.chargeCreditCard = chargeCreditCard;
};
