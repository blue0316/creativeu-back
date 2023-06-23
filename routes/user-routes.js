const User = require("../models/User.model");
const JoinCode = require("../models/JoinCode.model");
const MessageThread = require("../models/MessageThread.model");
const SalesRecord = require("../models/SalesRecord.model");
const Report = require("../models/Report.model");
const passport = require("passport");
const settings = require("../passport-config/settings");
require("../passport-config/passport")(passport);
const jwt = require("jsonwebtoken");
const { isActive } = require("../utils/account-activation-status");
const EventRequest = require("../models/EventRequest.model");
const { DateTime } = require("luxon");
const iso = require("iso-3166-1");
const { nanoid } = require("nanoid");
const { sendPasswordResetEmail } = require("../utils/send-email");
const { createEmptySalesRecord } = require("../utils/sales-records");
const { isAlreadyLoggedIn } = require("../utils/login-utils");
const {
	createCustomerProfile,
} = require("../routes/authCreateCustomer-routes");
//require rate-limiter-flexible to defend against brute force attacks to obtain passwords
const { RateLimiterMemory } = require("rate-limiter-flexible");
const { loginId, transactionKey } = require(".././auth-config");
const ApiContracts = require("authorizenet").APIContracts;
const ApiControllers = require("authorizenet").APIControllers;
var utils = require("../utils/auth-utils.js");

const opts_fast_brute = {
	points: 5, // 6 points
	duration: 30, // Per second
};

const opts_slow_brute = {
	points: 25,
	duration: 60 * 60 * 24,
};

const limiterFastBruteByIP = new RateLimiterMemory(opts_fast_brute);
const limiterSlowBruteByIP = new RateLimiterMemory(opts_slow_brute);

module.exports = function (app, stripe) {
	// console.log(stripe, "stripe");
	//register
	app.post("/register", isAlreadyLoggedIn, async (req, res) => {
		if (!req.body.email || !req.body.password) {
			res.json({ success: false, msg: "Please pass username and password." });
		} else {
			const { accountExecCode, promoCode } = req.body;
			let isAccountExec = false;
			if (accountExecCode) {
				try {
					const code = await JoinCode.find({
						code: accountExecCode,
						category: 0,
					});
					if (code) {
						isAccountExec = true;
					} else {
						console.log("Could not find account exec join code");
						return res
							.status(404)
							.send("Could not find account exec join code.");
					}
				} catch (e) {
					res.status(500).send("Error finding join code");
				}
			}
			let hasValidPromoCode = false;
			if (promoCode) {
				try {
					const pcode = await JoinCode.find({ code: promoCode, category: 1 });
					if (pcode) {
						hasValidPromoCode = true;
					} else {
						console.log("Could not find promocode");
						return res.status(404).send("Could not find account promocode.");
					}
				} catch (e) {
					console.log("Error finding join code");
					console.log(e);
					res.status(500).send("Error finding join code");
				}
			}
			//save the user
			const newUser = new User({
				type: req.body.type,
				category: req.body.category,
				isDiscoverable: true,
				email: req.body.email,
				password: req.body.password,
				fname: req.body.fname,
				lname: req.body.lname,
				displayName: req.body.displayName,
				tags: req.body.tags ? req.body.tags : [],
				streetAddressLine1: req.body.streetAddressLine1,
				streetAddressLine2: req.body.streetAddressLine2
					? req.body.streetAddressLine2
					: "",
				city: req.body.city,
				stateOrProvince: req.body.stateOrProvince,
				country: req.body.country,
				postalCode: req.body.postalCode,
				cell: req.body.cell ? req.body.cell : "",
				lat: req.body.lat,
				lng: req.body.lng,
				// stripeCustomerID: customer.id,
				stripeCustomerID: "cus_N9NeY3Ge9OqQ8m",
				secret: "customer.clientSecret",
				stripeAccountID: 32,
				isAccountExec: true,
				//never (for testing)
				expirationDate: isAccountExec || hasValidPromoCode ? "never" : "",
			});
			if (req.body.referrerJoinCode) {
				newUser.referrerJoinCode = req.body.referrerJoinCode;
			}
			// save the user
			newUser.save(function (err, user) {
				if (err) {
					return res.json({
						success: false,
						msg: "Username already exists.",
					});
				}
				if (!user) {
					return res.json({
						success: false,
						msg: "Could not create user.",
					});
				}
				//if the user is an account executive, or used a promo code delete their code and then resave codes
				if (isAccountExec) {
					JoinCode.findOneAndDelete(
						{ code: accountExecCode },
						function (err, docs) {
							if (err) console.log("Error deleting account exec code.");
							console.log(err);
							if (!docs)
								console.log(
									"No docs found to delete matching account Exec Code " +
										accountExecCode
								);
							if (docs) console.log("Deleted join code");
						}
					);
				}
				if (hasValidPromoCode) {
					JoinCode.findOneAndDelete({ code: promoCode }, function (err, docs) {
						if (err) console.log("Error deleting promo code.");
						console.log(err);
						if (!docs)
							console.log(
								"No docs found to delete matching promoCode " + accountExecCode
							);
						if (docs) console.log("Deleted join code");
					});
				}
				// tokenize the user's secretID, email and role
				const claims = {
					// secretID: user.secretID,
					secretID: "3213sdfsfsdfqweq",
					// email: user.email,
					email: "tayyab@gmail.com",
					permissions: "user",
				};
				// const token = jwt.sign(
				//   claims,
				//   'asdasfasfsafas',
				//    settings.secret,
				//   { expiresIn: 60 * 60 * 24 * 14 } //60 seconds * 60 minutes * 24 hours * 14 days
				// );
				// console.log(token,'token')
				// // log the user in. set a cookie in the user's browser and then return the user information.
				// res.cookie("jwt", 'fjsf234jhjknaswwr23423898dhjhqg4h', {
				//   httpOnly: true,
				//   domain: "creativeu.live",
				//   sameSite: true,
				//   signed: true,
				//   secure: true, //change to true for production
				//   expires: new Date(DateTime.now().plus({ days: 14 }).toISO()),
				// });
				//notifications, messageThreads, and event requests default to empty arrays
				res.json({
					success: true,
					user: {
						...user,
						notifications: [],
						messageThreads: [],
						eventRequests: [],
						accountActive: isActive(user),
						// accountActive: user,
					},
				});
			});
			// } catch (e) {
			//   res.sendStatus(500);
			// }
		}
	});
	app.post("/register_update", isAlreadyLoggedIn, async (req, res) => {
		console.log(req.body, "req");
		const isEmail = User.findOne({
			_id: req.body._id,
		});
		// console.log(isEmail,'ccccc')
		if (isEmail) {
			console.log("tayayayayaa");
		}
		const { accountExecCode, promoCode } = req.body;
		// console.log(req.body, "req.body");
		// console.log(accountExecCode, promoCode, "req.body");
		let isAccountExec = false;
		if (accountExecCode) {
			try {
				const code = await JoinCode.find({
					code: accountExecCode,
					category: 0,
				});
				if (code) {
					isAccountExec = true;
				} else {
					console.log("Could not find account exec join code");
					return res.status(404).send("Could not find account exec join code.");
				}
			} catch (e) {
				res.status(500).send("Error finding join code");
			}
		}
		let hasValidPromoCode = false;
		if (promoCode) {
			try {
				const pcode = await JoinCode.find({ code: promoCode, category: 1 });
				if (pcode) {
					hasValidPromoCode = true;
				} else {
					console.log("Could not find promocode");
					return res.status(404).send("Could not find account promocode.");
				}
			} catch (e) {
				console.log("Error finding join code");
				console.log(e);
				res.status(500).send("Error finding join code");
			}
		}
		//save the user
		const newUser = new User({
			type: req.body.type,
			category: req.body.category,
			isDiscoverable: true,
			email: req.body.email,
			password: req.body.password,
			fname: req.body.fname,
			lname: req.body.lname,
			displayName: req.body.displayName,
			tags: req.body.tags ? req.body.tags : [],
			streetAddressLine1: req.body.streetAddressLine1,
			streetAddressLine2: req.body.streetAddressLine2
				? req.body.streetAddressLine2
				: "",
			city: req.body.city,
			stateOrProvince: req.body.stateOrProvince,
			country: req.body.country,
			postalCode: req.body.postalCode,
			cell: req.body.cell ? req.body.cell : "",
			lat: req.body.lat,
			lng: req.body.lng,
			// stripeCustomerID: customer.id,
			stripeCustomerID: 234,
			secret: "customer.clientSecret",
			stripeAccountID: 32,
			isAccountExec: true,
			//never (for testing)
			// expirationDate: isAccountExec || hasValidPromoCode ? "never" : "",
		});
		if (req.body.referrerJoinCode) {
			newUser.referrerJoinCode = req.body.referrerJoinCode;
		}
		// save the user
		newUser.save(function (err, user) {
			if (err) {
				return res.json({
					success: false,
					msg: "Username already exists.",
				});
			}
			if (!user) {
				return res.json({
					success: false,
					msg: "Could not create user.",
				});
			}
			//if the user is an account executive, or used a promo code delete their code and then resave codes
			if (isAccountExec) {
				JoinCode.findOneAndDelete(
					{ code: accountExecCode },
					function (err, docs) {
						if (err) console.log("Error deleting account exec code.");
						console.log(err);
						if (!docs)
							console.log(
								"No docs found to delete matching account Exec Code " +
									accountExecCode
							);
						if (docs) console.log("Deleted join code");
					}
				);
			}
			if (hasValidPromoCode) {
				JoinCode.findOneAndDelete({ code: promoCode }, function (err, docs) {
					if (err) console.log("Error deleting promo code.");
					console.log(err);
					if (!docs)
						console.log(
							"No docs found to delete matching promoCode " + accountExecCode
						);
					if (docs) console.log("Deleted join code");
				});
			}
			// tokenize the user's secretID, email and role
			const claims = {
				// secretID: user.secretID,
				secretID: "3213sdfsfsdfqweq",
				// email: user.email,
				email: "tayyab@gmail.com",
				permissions: "user",
			};
			// const token = jwt.sign(
			//   claims,
			//   'asdasfasfsafas',
			//    settings.secret,
			//   { expiresIn: 60 * 60 * 24 * 14 } //60 seconds * 60 minutes * 24 hours * 14 days
			// );
			// console.log(token,'token')
			// // log the user in. set a cookie in the user's browser and then return the user information.
			// res.cookie("jwt", 'fjsf234jhjknaswwr23423898dhjhqg4h', {
			//   httpOnly: true,
			//   domain: "creativeu.live",
			//   sameSite: true,
			//   signed: true,
			//   secure: true, //change to true for production
			//   expires: new Date(DateTime.now().plus({ days: 14 }).toISO()),
			// });
			//notifications, messageThreads, and event requests default to empty arrays
			res.json({
				success: true,
				user: {
					...user,
					notifications: [],
					messageThreads: [],
					eventRequests: [],
					accountActive: isActive(user),
					// accountActive: user,
				},
			});
		});
		// } catch (e) {
		//   res.sendStatus(500);
		// }
	});

	//login
	app.post("/login", isAlreadyLoggedIn, function (req, res) {
		//use cf-connecting-ip to the user's original IP as the application is hidden behind cloudflare IPs
		const ipAddr = req.headers["cf-connecting-ip"] || req.socket.remoteAddress;
		limiterFastBruteByIP
			.consume(ipAddr, 0) // consume no points except in event of failure
			.then((_) => {
				limiterSlowBruteByIP
					.consume(ipAddr, 0) //consume no points except in the event of failure
					.then((_) => {
						User.findOne(
							{
								email: req.body.email,
							},
							function (err, user) {
								if (err) throw err;
								if (!user) {
									res.status(404).send({
										success: false,
										msg: "Authentication failed. User not found.",
									});
								} else {
									// check if password is correct
									user.comparePassword(
										req.body.password,
										async (err, isMatch) => {
											if (err || !isMatch) {
												//if there is an error or the password and username don't match
												// Consume 1 point from limiters on wrong attempt and block if limits reached
												limiterFastBruteByIP
													.consume(ipAddr, 1)
													.then((_) => {
														limiterSlowBruteByIP
															.consume(ipAddr, 1)
															.then((_) => {
																res.sendStatus(401);
															})
															.catch((rateLimiterRes) => {
																// Not enough points to consume
																const secondsToRetry = Math.round(
																	rateLimiterRes.msBeforeNext / 1000
																);
																res.set(
																	"Retry-After",
																	String(secondsToRetry || 1)
																);
																res.status(429).send("Too Many Requests");
															});
													})
													.catch((rateLimiterRes) => {
														limiterSlowBruteByIP
															.consume(ipAddr, 1)
															.then((_) => {
																// Not enough points to consume
																const secondsToRetry = Math.round(
																	rateLimiterRes.msBeforeNext / 1000
																);
																res.set(
																	"Retry-After",
																	String(secondsToRetry || 1)
																); //sends seconds for limiterFastBrute
																res.status(429).send("Too Many Requests");
															})
															.catch((rateLimiterRes) => {
																// Not enough points to consume
																const secondsToRetry = Math.round(
																	rateLimiterRes.msBeforeNext / 1000
																);
																res.set(
																	"Retry-After",
																	String(secondsToRetry || 1)
																); //sends seconds for limiterSlowBrute
																res.status(429).send("Too Many Requests");
															});
													});
											}
											if (isMatch && !err) {
												if (user.suspended)
													return res
														.status(403)
														.send(
															"Your account is suspended due to violation of our Terms of Service. Your subscription will be canceled and you will not be billed for any further membership fees."
														);
												//construct a userObj to send as json, including account status, notifications, message threads and event requests
												const userObjToSend = await constructUserObjToSend(
													user,
													stripe
												);
												//tokenize the user's secretID, email and role
												// const claims = {
												//   secretID: user.secretID,
												//   email: user.email,
												//   permissions: "user",
												// };
												// const token = jwt.sign(
												//   claims,
												//   settings.secret,
												//   { expiresIn: 60 * 60 * 24 * 14 } //60 seconds * 60 minutes * 24 hours * 14 days
												// );
												// // set a cookie in the user's browser and then return the user
												// res.cookie("jwt", token, {
												//   httpOnly: true,
												//   domain: "creativeu.live",
												//   sameSite: true,
												//   signed: true,
												//   secure: true, //SET TO TRUE FOR PRODUCTION
												//   expires: new Date(
												//     DateTime.now().plus({ days: 14 }).toISO()
												//   ),
												// });
												res.json({
													success: true,
													user: userObjToSend,
												});
											} else {
												res.status(401).send({
													success: false,
													msg: "Authentication failed. Wrong password.",
												});
											}
										}
									);
								}
							}
						);
					});
			});
	});

	//find the current user
	app.get(
		"/authenticated_user",
		isAlreadyLoggedIn,
		passport.authenticate("user", { session: false }),
		async (req, res) => {
			console.log(req);
			if (req.user) {
				const { user } = req;
				const userObjToSend = await constructUserObjToSend(user, stripe);
				res.json(userObjToSend);
			} else {
				return res.status(403).send({ success: false, msg: "Unauthorized." });
			}
		}
	);

	//update the current user
	app.put(
		"/authenticated_user",
		passport.authenticate("user", { session: false }),
		(req, res) => {
			console.log("dfdfsds", req, "dafdsfasdfadsfasdf", res)
			if (req.user) {
				User.findOne({ secretID: req.user.secretID }, function (err, user) {
					if (err) return next(err);
					const { fieldValuePairs } = req.body;
					//only certain fields may be modified by the user. filter out these fields and corresponding values
					if (!fieldValuePairs || fieldValuePairs.length === 0) {
						return res.sendStatus(400);
					}
					const filteredFVPairs = fieldValuePairs.filter((fV) => {
						const { field } = fV;
						return (
							field === "password" ||
							field === "profileUrl" ||
							field === "fname" ||
							field === "lname" ||
							field === "streetAddressLine1" ||
							field === "streetAddressLine2" ||
							field === "city" ||
							field === "stateOrProvice" ||
							field === "postalCode" ||
							field === "country" ||
							field === "lat" ||
							field === "lng" ||
							field === "cell" ||
							field === "about" ||
							field === "isDiscoverable" ||
							field === "displayName" ||
							field === "tags" ||
							field === "category" ||
							field === "links" ||
							field === "hasViewedOnboardingMessage"
						);
					});
					//make sure there are still fields to update after filtering
					if (filteredFVPairs.length > 0) {
						//then iterate through each pair, setting the field to the value
						filteredFVPairs.forEach((fVPair) => {
							const { field, value } = fVPair;
							user[field] = value;
						});
						//update the user's lastUpdatedAt field
						user.lastUpdatedAt = Date.now();
						user
							.save()
							.then(async (updatedUser) => {
								const userObjToSend = await constructUserObjToSend(
									updatedUser,
									stripe
								);
								res.json(userObjToSend);
							})
							.catch((e) => {
								res.status(500).send({
									success: false,
									message: "There was a problem saving to the database.",
								});
							});
					} else {
						res.status(401).send({
							success: false,
							message: "Attempt to modify an inaccessible field failed.",
						});
					}
				});
			} else {
				res
					.status(401)
					.send({ success: false, message: "Access token missing." });
			}
		}
	);

	//logout
	app.delete(
		"/logout",
		passport.authenticate("user", { session: false }),
		(req, res) => {
			//logout should only succeed if the user is logged in
			if (req.user) {
				const emptyToken = "empty token";
				// empty the jwt value in the cookie in the user's browser and set its expiration date to one day in the past
				res.cookie("jwt", emptyToken, {
					httpOnly: true,
					domain: "creativeu.live",
					sameSite: true,
					signed: true,
					secure: true,
					expires: new Date(DateTime.now().minus({ days: 1 }).toISO()),
				});
				res.sendStatus(200);
			} else {
				res.sendStatus(400);
			}
		}
	);

	//delete the current user
	app.delete(
		"/cancel_subscription",
		passport.authenticate("user", { session: false }),
		async (req, res) => {
			if (req.user) {
				const { user } = req;
				//first delete the user's stripe subscription if it exists (the user may not have entered payment info before deciding to cancel their subscription)
				const { stripeSubID } = user;
				if (stripeSubID && stripeSubID.length > 0) {
					try {
						await stripe.subscriptions.del(stripeSubID);
					} catch (e) {
						//if the subscription could not be deleted, send an error message to the frontend
						res.sendStatus(500);
					}
				}
				//refund any orders that haven't been marked as sent
				//delete the user's files in AWS storage --> may need to schedule a delete in the future for digital products
				//finally delete the user from the database
				User.findOne(
					{ secretID: req.user.secretID, email: req.user.email },
					function (err, user) {
						if (err) {
							res.sendStatus(500);
						} else if (user) {
							user
								.delete()
								.then(() => {
									res.sendStatus(200);
								})
								.catch(() => {
									res.sendStatus(500);
								});
						}
					}
				);
			}
		}
	);

	//check if an email address is already in use
	app.post("/validate_email", async (req, res) => {
		if (!req.body.email) {
			res
				.status(400)
				.json({ success: false, msg: "Please pass an email address" });
		} else {
			User.findOne(
				{
					email: req.body.email,
				},
				function (err, user) {
					if (err) {
						res.status(500).json({ success: false, msg: err.message });
					}
					if (!user) {
						res.status(200).json({ success: true, user: false });
					} else {
						res.status(200).json({ success: true, user: true });
					}
				}
			);
		}
		console.log("req.body.email", req.body.email);
	});

	//validate profile url
	app.post("/validate_url", async (req, res) => {
		if (!req.body.url) {
			res.status(400).json({ success: false, msg: "Please pass a url." });
		} else {
			User.findOne(
				{
					profileUrl: req.body.url,
				},
				function (err, user) {
					if (err) {
						res
							.status(500)
							.json({ success: false, msg: "Internal server error" });
					}
					if (!user) {
						res.status(200).json({ success: true, user: false });
					} else {
						res.status(200).json({ success: true, user: true });
					}
				}
			);
		}
	});

	//get one user
	app.get("/api/users/:link", (req, res) => {
		const { link } = req.params;
		User.findOne(
			{
				profileUrl: link,
			},
			async function (err, user) {
				if (err) return res.sendStatus(404);
				if (!user) {
					return res.status(404).send({
						success: false,
						msg: "User not found",
					});
				} else {
					//make sure it's an active account --> search should also filter based on this field
					if (isActive(user)) {
						const objToSend = constructPublicUserObject(user);
						res.json(objToSend);
					} else {
						res.json(404);
					}
				}
			}
		);
	});

	//get a user's connected account link
	app.get(
		"/connected_account_link",
		passport.authenticate("user", { session: false }),
		async (req, res) => {
			if (req.user && req.user.stripeAccountID) {
				try {
					const accountLink = await stripe.accountLinks.create({
						account: req.user.stripeAccountID,
						refresh_url: "http://localhost:3000/profile",
						return_url: "http://localhost:3000/profile",
						// refresh_url: "https://creativeu.live/profile",
						// return_url: "https://creativeu.live/profile",
						type: "account_onboarding",
					});
					res.send(accountLink.url);
				} catch (e) {
					res.sendStatus(500);
				}
			} else {
				res.sendStatus(400);
			}
		}
	);

	app.post("/request_password_reset", (req, res) => {
		const { email } = req.body;
		if (!email) return res.sendStatus(400);
		User.findOne(
			{
				email: email,
			},
			function (err, user) {
				if (err) {
					return res
						.status(500)
						.json({ success: false, msg: "Internal server error" });
				}
				if (!user) return res.sendStatus(200);
				if (user) {
					//create a password reset code
					user.passwordResetCode = nanoid();
					user.passwordResetExpirationDate = DateTime.now()
						.plus({ days: 1 })
						.toISO();
					user
						.save()
						.then(() => {
							sendPasswordResetEmail(email, user.passwordResetCode);
						})
						.catch((e) => {
							res.sendStatus(500);
						});
					res.status(200).json({ success: true, user: false });
				}
			}
		);
	});

	app.put("/reset_password", (req, res) => {
		const { password, resetCode } = req.body;
		if (!password || !resetCode) return res.sendStatus(400);
		User.findOne({ passwordResetCode: resetCode }, function (err, user) {
			if (err || !user) return res.sendStatus(500);
			if (DateTime.now() > DateTime.fromISO(user.passwordResetExpirationDate)) {
				return res.status(401).send("The password reset link has expired.");
			} else {
				user.password = password;
				user
					.save()
					.then(() => {
						res.sendStatus(200);
					})
					.catch((e) => {
						res.sendStatus(500);
					});
			}
		});
	});

	//block and unblock another user
	app.put(
		"/change_blocked_status",
		passport.authenticate("user", { session: false }),
		(req, res) => {
			if (req.user) {
				const { otherPartyID } = req.body;
				User.findOne({ secretID: req.user.secretID }, function (err, user) {
					if (err) return next(err);
					if (!user) return res.sendStatus(401);
					if (user) {
						//if the otherParty hasn't been blocked, add their ID to the user's blockedUsers
						if (!user.blockedUsers.includes(otherPartyID)) {
							user.blockedUsers.push(otherPartyID);
						} else {
							//otherwise, filter their ID out to unblock them
							const updatedBlockedUsers = user.blockedUsers.filter((el) => {
								return el !== otherPartyID;
							});
							user.blockedUsers = updatedBlockedUsers;
						}
						//now find the other user and update their blockedByUsers
						User.findById(otherPartyID, function (err, blockedUser) {
							if (err) return res.sendStatus(500);
							else if (!blockedUser) res.sendStatus(404);
							else {
								if (!blockedUser.blockedByUsers.includes(user._id.toString())) {
									blockedUser.blockedByUsers.push(user._id.toString());
								} else {
									//otherwise, filter their ID out to unblock them
									const updatedBlockedBy = blockedUser.blockedByUsers.filter(
										(el) => {
											return el !== user._id.toString();
										}
									);
									blockedUser.blockedByUsers = updatedBlockedBy;
								}
								user
									.save()
									.then((updatedUser) => {
										blockedUser
											.save()
											.then(async () => {
												const userObjToSend = await constructUserObjToSend(
													updatedUser,
													stripe
												);
												return res.json(userObjToSend);
											})
											.catch((e) => {
												return res.sendStatus(500);
											});
									})
									.catch((e) => {
										return res.sendStatus(500);
									});
							}
						});
					}
				});
			}
		}
	);

	//report a user
	app.post(
		"/report_user",
		passport.authenticate("user", { session: false }),
		(req, res) => {
			//first find the current user
			User.findOne(
				{ secretID: req.user.secretID, email: req.user.email },
				function (err, user) {
					if (err) return res.sendStatus(500);
					if (!user) return res.sendStatus(401);
					const { otherParty, reason } = req.body;
					if (user.reportedUsers.includes(otherParty))
						return res.sendStatus(401); //if the user has already been reported by the current user, they can't report them again
					if (!otherParty || !reason) return res.sendStatus(400);
					const newReport = new Report({
						reportedUser: otherParty,
						reportedBy: user._id,
						reason: reason,
					});
					newReport
						.save()
						.then(() => {
							User.findById(otherParty)
								.then((reportedUser) => {
									reportedUser.reported = true;
									reportedUser.save();
									if (user.reportedUsers) {
										user.reportedUsers = [...user.reportedUsers, otherParty];
									} else {
										user.reportedUsers = [otherParty];
									}
									user
										.save()
										.then((updatedUser) => {
											const userObjToSend = constructUserObjToSend(
												updatedUser,
												stripe
											);
											return res.json(userObjToSend);
										})
										.catch((e) => {
											return res.sendStatus(500);
										});
								})
								.catch((e) => {
									return res.sendStatus(500);
								});
						})
						.catch((e) => {
							return res.sendStatus(500);
						});
				}
			);
		}
	);
};

function constructUserObjToSend(user, stripe) {
	return new Promise(async (resolve, _) => {
		const accountActive = isActive(user);
		// let notifications = [];
		let eventRequests = [];
		let messageThreads = [];
		//if the user's account is active, get the user's messages and eventRequests
		if (accountActive) {
			try {
				const m = await MessageThread.find({
					$and: [
						{ participants: { $in: [user._id] } },
						//filter out threads from suspended users
						{ archived: false },
					],
				});
				messageThreads = m;
			} catch (e) {
				console.log(e);
			}
			try {
				const evr = await EventRequest.find({
					$and: [
						{ $or: [{ senderID: user._id }, { recipientID: user._id }] },
						//filter out threads from suspended users
						{ archived: false },
					],
				});
				eventRequests = evr;
			} catch (e) {
				console.log(e);
			}
		}
		//create a user obj to send
		let userObjToSend = {
			...user._doc,
			accountActive,
			// notifications,
			messageThreads,
			eventRequests,
		};
		//if the user is an account executive, try to find a SalesRecord from this year
		if (user.isAccountExec) {
			let salesRecord;
			try {
				const thisYear = DateTime.now().toObject().year;
				const sR = await SalesRecord.findOne({
					ownerID: user._id,
					year: thisYear,
				});
				//if a salesRecord exists, it will be added to the userObj. Otherwise, an empty salesRecord object will be generated
				if (sR) salesRecord = sR;
				else salesRecord = createEmptySalesRecord(thisYear);
			} catch (e) {
				salesRecord = createEmptySalesRecord(thisYear);
			} finally {
				userObjToSend.salesRecord = salesRecord;
			}
		}
		//if the user's account is verified, create and send a stripe link
		if (user.accountVerified) {
			try {
				const loginLink = await stripe.accounts.createLoginLink(
					user.stripeAccountID
				);
				userObjToSend.stripeAccountUrl = loginLink.url;
			} catch (e) {
				console.log(e);
			}
		}
		//delete sensitive fields
		delete userObjToSend.secretID;
		delete userObjToSend.password;
		resolve(userObjToSend);
	});
}

function constructPublicUserObject(user) {
	//create a user obj to send
	let userObjToSend = {
		...user._doc,
	};
	//delete sensitive fields
	delete userObjToSend.secretID;
	delete userObjToSend.password;
	delete userObjToSend.email;
	delete userObjToSend.paymentFailed;
	delete userObjToSend.stripeCustomerID;
	delete userObjToSend.fname;
	delete userObjToSend.lname;
	delete userObjToSend.postalCode;
	delete userObjToSend.streetAddressLine1;
	delete userObjToSend.streetAddressLine2;
	delete userObjToSend.expirationDate;
	delete userObjToSend.plan;
	delete userObjToSend.lat;
	delete userObjToSend.lng;
	return userObjToSend;
}
