const { validateForm } = require("../lib/index");
const { loginId, transactionKey } = require("../auth-config");
const ApiContracts = require("authorizenet").APIContracts;
const ApiControllers = require("authorizenet").APIControllers;
var utils = require("../utils/auth-utils.js");
const User = require("../models/User.model");

module.exports = function (app) {
	app.post("/create-subscription-authorize", async (req, res) => {
		var plan = "";
		if (req.body.planType === "monthly") {
			plan = 1;
		} else if (req.body.planType === "yearly") {
			plan = 12;
		} else {
			plan = 12;
		}
		const validationErrors = validateForm(req);
		if (validationErrors.length > 0) {
			res.json({ errors: validationErrors });
			return;
		}
		var merchantAuthenticationType =
			new ApiContracts.MerchantAuthenticationType();
		merchantAuthenticationType.setName(loginId);
		merchantAuthenticationType.setTransactionKey(transactionKey);

		var interval = new ApiContracts.PaymentScheduleType.Interval();
		interval.setLength(plan);
		// yearly
		// monthly
		// lifetime
		interval.setUnit(ApiContracts.ARBSubscriptionUnitEnum.MONTHS);
		var paymentScheduleType = new ApiContracts.PaymentScheduleType();
		paymentScheduleType.setInterval(interval);
		paymentScheduleType.setStartDate(utils.getDate());
		paymentScheduleType.setTotalOccurrences(5);
		paymentScheduleType.setTrialOccurrences(0);

		var creditCard = new ApiContracts.CreditCardType();
		// creditCard.setExpirationDate("2038-12");
		creditCard.setExpirationDate(req.body.expire);
		creditCard.setCardNumber(req.body.cc);
		creditCard.setCardCode(req.body.cvv);
		// creditCard.setCardNumber("4242424242424242");

		var payment = new ApiContracts.PaymentType();
		payment.setCreditCard(creditCard);

		var orderType = new ApiContracts.OrderType();
		orderType.setInvoiceNumber(utils.getRandomString("Inv:1234"));
		orderType.setDescription(
			`Your ${req.body.planType} plan has been subscribed.`
		);

		var customer = new ApiContracts.CustomerType();
		customer.setType(ApiContracts.CustomerTypeEnum.INDIVIDUAL);
		customer.setId("customerid_" + utils.getRandomString("Id"));
		customer.setEmail(req.body.email ? req.body.email : req.body.user.email);
		customer.setPhoneNumber(req.body.cell ? req.body.cell : req.body.user.cell);

		var nameAndAddressType = new ApiContracts.NameAndAddressType();
		nameAndAddressType.setFirstName(
			req.body.fname ? req.body.fname : req.body.user.fname
		);
		nameAndAddressType.setLastName(
			req.body.lname ? req.body.lname : req.body.user.lname
		);
		nameAndAddressType.setCompany(
			req.body.category ? req.body.category : req.body.user.category
		);
		nameAndAddressType.setAddress(
			req.body.streetAddressLine1
				? req.body.streetAddressLine1
				: req.body.user.streetAddressLine1
		);
		nameAndAddressType.setCity(
			req.body.city ? req.body.city : req.body.user.city
		);
		nameAndAddressType.setState(
			req?.body?.stateOrProvince
				? req?.body?.stateOrProvince
				: req?.body?.user?.stateOrProvince
		);
		nameAndAddressType.setZip(
			req.body.postalCode ? req.body.postalCode : req.body.user.postalCode
		);
		nameAndAddressType.setCountry(
			req.body.country ? req.body.country : req.body.user.country
		);

		var arbSubscription = new ApiContracts.ARBSubscriptionType();
		arbSubscription.setName(
			req.body.fname ? req.body.fname : req.body.user.fname
		);
		arbSubscription.setPaymentSchedule(paymentScheduleType);
		arbSubscription.setAmount(req.body.amount);
		arbSubscription.setTrialAmount(req.body.amount);
		arbSubscription.setPayment(payment);
		arbSubscription.setOrder(orderType);
		arbSubscription.setCustomer(customer);
		arbSubscription.setBillTo(nameAndAddressType);
		arbSubscription.setShipTo(nameAndAddressType);

		var createRequest = new ApiContracts.ARBCreateSubscriptionRequest();
		createRequest.setMerchantAuthentication(merchantAuthenticationType);
		createRequest.setSubscription(arbSubscription);

		// console.log(JSON.stringify(createRequest.getJSON(), null, 2));
		// res.send(JSON.stringify(createRequest.getJSON(), null, 2));
		// return
		var ctrl = new ApiControllers.ARBCreateSubscriptionController(
			createRequest.getJSON()
		);

		ctrl.execute(async () => {
			var apiResponse = ctrl.getResponse();

			var response = new ApiContracts.ARBCreateSubscriptionResponse(
				apiResponse
			);
			try {
				let newUsr = await User.findOne({
					email: req.body.email,
				});
				if (!newUsr) {
					console.log("no user found");
				}
				newUsr.expirationDate = "NEVER";
				newUsr.accountActive = true;
				newUsr.accountVerified = true;

				console.log("account verified: ", accountVerified);

				newUsr
					.save()
					.then(async (updatedUser) => {
						// res.json(updatedUser);
						console.log("succesfully updated");
					})
					.catch((e) => {
						// res.status(500).send({
						// 	success: false,
						// 	message: "There was a problem saving to the database.",
						// });
						console.log("error in trycatch user", e);
					});
			} catch (ex) {
				console.log("error in updating user", ex);
			}

			res.send(JSON.stringify(response, null, 2));

			if (response != null) {
				if (
					response.getMessages().getResultCode() ==
					ApiContracts.MessageTypeEnum.OK
				) {
					console.log("Subscription Id : " + response.getSubscriptionId());
					console.log(
						"Message Code : " + response.getMessages().getMessage()[0].getCode()
					);
					console.log(
						"Message Text : " + response.getMessages().getMessage()[0].getText()
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
				console.log("Null Response.");
			}

			// callback(response);
		});

		// if (req.body.user) {
		// 	//update the user's events to reflect the user's lifetime membership
		// 	const events = await Event.find({ ownerID: user._id });
		// 	if (events.length > 0) {
		// 		events.forEach((event) => {
		// 			event.expirationDate = "never";
		// 			event.save();
		// 		});
		// 	}
		// 	//set the paymentFailed field to false
		// 	user.paymentFailed = false;
		// 	//set the user's plan
		// 	user.plan = "lifetime";
		// 	//set the user's expiration date to "never";
		// 	user.expirationDate = "never";
		// }
	});
	if (require.main === module) {
		createSubscription(function () {
			console.log("createSubscription call complete.");
		});
	}

	//   module.exports.createCustomerProfile = createCustomerProfile;
};
