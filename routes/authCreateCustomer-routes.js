const { loginId, transactionKey } = require("../auth-config");
const ApiContracts = require("authorizenet").APIContracts;
const ApiControllers = require("authorizenet").APIControllers;
var utils = require("../utils/auth-utils.js");
module.exports = function (app) {
  app.post("/create-customer-authorize", (req, res) => {
    const {
      CardNumber,
      ExpirationDate,
      FirstName,
      LastName,
      Address,
      City,
      State,
      Zip,
      Country,
      PhoneNumber,
    } = req.body;
    var merchantAuthenticationType =
      new ApiContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(loginId);
    merchantAuthenticationType.setTransactionKey(transactionKey);

    var creditCard = new ApiContracts.CreditCardType();
    creditCard.setCardNumber(CardNumber);
    creditCard.setExpirationDate(ExpirationDate);

    var paymentType = new ApiContracts.PaymentType();
    paymentType.setCreditCard(creditCard);

    var customerAddress = new ApiContracts.CustomerAddressType();
    customerAddress.setFirstName(FirstName);
    customerAddress.setLastName(LastName);
    customerAddress.setAddress(Address);
    customerAddress.setCity(City);
    customerAddress.setState(State);
    customerAddress.setZip(Zip);
    customerAddress.setCountry(Country);
    customerAddress.setPhoneNumber(PhoneNumber);

    var customerPaymentProfileType =
     new ApiContracts.CustomerPaymentProfileType();
    customerPaymentProfileType.setCustomerType(
     ApiContracts.CustomerTypeEnum.INDIVIDUAL
    );
    customerPaymentProfileType.setPayment(paymentType);
    customerPaymentProfileType.setBillTo(customerAddress);

    var paymentProfilesList = [];
    paymentProfilesList.push(customerPaymentProfileType);

    var customerProfileType = new ApiContracts.CustomerProfileType();
    customerProfileType.setMerchantCustomerId(
      "M_" + utils.getRandomString("cust")
    );
    customerProfileType.setDescription("Profile description here");
    customerProfileType.setEmail(utils.getRandomString("cust") + "@anet.net");
    customerProfileType.setPaymentProfiles(paymentProfilesList);

    var createRequest = new ApiContracts.CreateCustomerProfileRequest();
    createRequest.setProfile(customerProfileType);
    createRequest.setValidationMode(ApiContracts.ValidationModeEnum.TESTMODE);
    createRequest.setMerchantAuthentication(merchantAuthenticationType);

    //pretty print request
    //console.log(JSON.stringify(createRequest.getJSON(), null, 2));

    var ctrl = new ApiControllers.CreateCustomerProfileController(
      createRequest.getJSON()
    );

    ctrl.execute(function () {
      var apiResponse = ctrl.getResponse();

      var response = new ApiContracts.CreateCustomerProfileResponse(
        apiResponse
      );

      //pretty print response
      //console.log(JSON.stringify(response, null, 2));

      if (response != null) {
        if (
          response.getMessages().getResultCode() ==
          ApiContracts.MessageTypeEnum.OK
        ) {
          console.log(
            "Successfully created a customer profile with id: " +
              response.getCustomerProfileId()
          );
        } else {
          console.log("Result Code: " + response.getMessages().getResultCode());
          console.log(
            "Error Code: " + response.getMessages().getMessage()[0].getCode()
          );
          console.log(
            "Error message: " + response.getMessages().getMessage()[0].getText()
          );
        }
      } else {
        console.log("Null response received");
      }

      //   callback(response);
    });
  });

  if (require.main === module) {
    createCustomerProfile(function () {
      console.log("createCustomerProfile call complete.");
    });
  }

  //   module.exports = createCustomerProfile;
};


// function createCustomerProfile(callback) {

// 	var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
// 	merchantAuthenticationType.setName(constants.apiLoginKey);
// 	merchantAuthenticationType.setTransactionKey(constants.transactionKey);

// 	var creditCard = new ApiContracts.CreditCardType();
// 	creditCard.setCardNumber('4242424242424242');
// 	creditCard.setExpirationDate('0822');

// 	var paymentType = new ApiContracts.PaymentType();
// 	paymentType.setCreditCard(creditCard);
	
// 	var customerAddress = new ApiContracts.CustomerAddressType();
// 	customerAddress.setFirstName('test');
// 	customerAddress.setLastName('scenario');
// 	customerAddress.setAddress('123 Main Street');
// 	customerAddress.setCity('Bellevue');
// 	customerAddress.setState('WA');
// 	customerAddress.setZip('98004');
// 	customerAddress.setCountry('USA');
// 	customerAddress.setPhoneNumber('000-000-0000');

// 	var customerPaymentProfileType = new ApiContracts.CustomerPaymentProfileType();
// 	customerPaymentProfileType.setCustomerType(ApiContracts.CustomerTypeEnum.INDIVIDUAL);
// 	customerPaymentProfileType.setPayment(paymentType);
// 	customerPaymentProfileType.setBillTo(customerAddress);

// 	var paymentProfilesList = [];
// 	paymentProfilesList.push(customerPaymentProfileType);

// 	var customerProfileType = new ApiContracts.CustomerProfileType();
// 	customerProfileType.setMerchantCustomerId('M_' + utils.getRandomString('cust'));
// 	customerProfileType.setDescription('Profile description here');
// 	customerProfileType.setEmail(utils.getRandomString('cust')+'@anet.net');
// 	customerProfileType.setPaymentProfiles(paymentProfilesList);

// 	var createRequest = new ApiContracts.CreateCustomerProfileRequest();
// 	createRequest.setProfile(customerProfileType);
// 	createRequest.setValidationMode(ApiContracts.ValidationModeEnum.TESTMODE);
// 	createRequest.setMerchantAuthentication(merchantAuthenticationType);

// 	//pretty print request
// 	//console.log(JSON.stringify(createRequest.getJSON(), null, 2));
		
	
// 	var ctrl = new ApiControllers.CreateCustomerProfileController(createRequest.getJSON());

// 	ctrl.execute(function(){

// 		var apiResponse = ctrl.getResponse();

// 		var response = new ApiContracts.CreateCustomerProfileResponse(apiResponse);

// 		//pretty print response
// 		//console.log(JSON.stringify(response, null, 2));

// 		if(response != null) 
// 		{
// 			if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK)
// 			{
// 				console.log('Successfully created a customer profile with id: ' + response.getCustomerProfileId());
// 			}
// 			else
// 			{
// 				console.log('Result Code: ' + response.getMessages().getResultCode());
// 				console.log('Error Code: ' + response.getMessages().getMessage()[0].getCode());
// 				console.log('Error message: ' + response.getMessages().getMessage()[0].getText());
// 			}
// 		}
// 		else
// 		{
// 			console.log('Null response received');
// 		}

// 		callback(response);
// 	});
// }

// if (require.main === module) {
// 	createCustomerProfile(function(){
// 		console.log('createCustomerProfile call complete.');
// 	});
// }

// module.exports.createCustomerProfile = createCustomerProfile;