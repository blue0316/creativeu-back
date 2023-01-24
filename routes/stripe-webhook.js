const bodyParser = require("body-parser");
const User = require("../models/User.model");
const Event = require("../models/Event.model"); //when the user's expiration date updates, all of their events should also update with a new expiration
const SalesRecord = require("../models/SalesRecord.model");
const { DateTime } = require("luxon");
const { nanoid } = require("nanoid");
const { isActiveAccountExec } = require("../utils/account-activation-status");
const { sendNewArtistPackUserEmail } = require("../utils/send-email");

//function for attempting to save the user. Need to try a few times in case of an error
function attemptSaveUser(user, counter) {
  user
    .save()
    .then((user) => {
      if (user.plan === "artistpack") {
        sendNewArtistPackUserEmail(user);
      }
    })
    .catch((e) => {
      console.log(e);
      //try again after 3 seconds
      if (counter > 0) {
        return setTimeout(() => {
          attemptSaveUser(user, counter - 1);
        }, 3000);
      } else {
        console.log("failed to save the user after 5 attempts");
      }
    });
}

module.exports = function (app, stripe) {
  //function for paying out referrer and recording payouts in a sales record
  function payoutReferrer(user) {
    return new Promise((resolve, reject) => {
      if (user.referrerJoinCode) {
        User.findOne(
          { joinCode: user.referrerJoinCode },
          async (err, referrer) => {
            if (err) reject(err);
            if (referrer) {
              //check if the referrer is active
              if (isActiveAccountExec(referrer)) {
                //determine the commission ammount and which fields to update in the sales record
                let commissionType = {
                  newOrResidual: "new",
                  planType: user.plan,
                };
                //determine the total sale to record in the sales record
                let totalSale;
                let payoutAmount;
                if (user.plan === "lifetime") {
                  payoutAmount = 70000; //$700.00
                  totalSale = 150000;
                } else if (user.plan === "artistpack") {
                  payoutAmount = 15000;
                  totalSale = 30000;
                } else {
                  if (user.plan === "monthly") {
                    totalSale = 3000;
                    if (!user.firstCycle) {
                      payoutAmount = 1000; //$10.00
                      commissionType.newOrResidual = "residual";
                    } else if (user.firstCycle) {
                      payoutAmount = 2000; //$20.00
                      user.firstCycle = false; //the user is no longer in their first billing cycle after this payment
                    }
                  } else if (user.plan === "yearly") {
                    //residual and initial payment amounts are the same for yearly accounts
                    totalSale = 25000;
                    payoutAmount = 15000; //$150.00
                    //still set first cycle to false
                    if (user.firstCycle) {
                      user.firstCycle = false;
                    } else {
                      commissionType.newOrResidual = "residual";
                    }
                  }
                }
                //make the transfer
                try {
                  const transfer = await stripe.transfers.create({
                    amount: payoutAmount,
                    currency: "usd",
                    destination: referrer.stripeAccountID,
                  });
                  //UPDATE LIFETIME SALES RECORDS IN THE REFERRER OBJECT
                  referrer.totalSales = referrer.totalSales
                    ? referrer.totalSales + totalSale
                    : totalSale;
                  referrer.totalCommissions = referrer.totalCommissions
                    ? referrer.totalCommissions + payoutAmount
                    : payoutAmount;
                  if (commissionType.newOrResidual === "new") {
                    referrer.totalReferredUsers = referrer.totalReferredUsers
                      ? referrer.totalReferredUsers + 1
                      : 1;
                    //now depending on the type of user, increment that field
                    switch (commissionType.planType) {
                      case "lifetime":
                        referrer.totalReferredLifetimeUsers =
                          referrer.totalReferredLifetimeUsers
                            ? referrer.totalReferredLifetimeUsers + 1
                            : 1;
                        break;
                      case "artistpack":
                        referrer.totalReferredAPUsers =
                          referrer.totalReferredAPUsers
                            ? referrer.totalReferredAPUsers + 1
                            : 1;
                        break;
                      case "yearly":
                        referrer.totalReferredYearlyUsers =
                          referrer.totalReferredYearlyUsers
                            ? referrer.totalReferredYearlyUsers + 1
                            : 1;
                        break;
                      case "monthly":
                        referrer.totalReferredMonthlyUsers =
                          referrer.totalReferredMonthlyUsers
                            ? referrer.totalReferredMonthlyUsers + 1
                            : 1;
                        break;
                      default:
                        //default is to do nothing
                        break;
                    }
                  }
                  await referrer.save();
                  //now try to find a SalesRecord for the referrer and this year
                  const months = [
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ];
                  const today = DateTime.now().toObject();
                  const thisYear = today.year;
                  const thisMonth = months[today.month - 1];
                  SalesRecord.findOne(
                    { ownerID: referrer._id, year: thisYear },
                    function (err, salesRecord) {
                      if (err) {
                        //if there is an error, return
                        return;
                      }
                      //if a sales record exists for this year already, update the total and the total for this month
                      if (salesRecord) {
                        //add the sale amount to total sales
                        salesRecord.totalSales =
                          salesRecord.totalSales + totalSale;
                        //add the payoutAmount to total commissions
                        salesRecord.totalCommissions =
                          salesRecord.totalCommissions + payoutAmount;
                        //add these totals to the records for this month
                        salesRecord[thisMonth].totalSales =
                          salesRecord[thisMonth].totalSales + totalSale;
                        salesRecord[thisMonth].totalCommissions =
                          salesRecord[thisMonth].totalCommissions +
                          payoutAmount;
                        //now set specific fields depending on the commission type
                        if (commissionType.newOrResidual === "new") {
                          //if it's a new commission, increment the total referred users
                          salesRecord.totalReferredUsers =
                            salesRecord.totalReferredUsers + 1;
                          salesRecord[thisMonth].totalReferredUsers =
                            salesRecord[thisMonth].totalReferredUsers + 1;
                          //add the totalSale to totalNewSales and the payoutAmount to totalNewCommissions
                          salesRecord.totalNewSales =
                            salesRecord.totalNewSales + totalSale;
                          salesRecord.totalNewCommissions =
                            salesRecord.totalNewCommissions + payoutAmount;
                          salesRecord[thisMonth].totalNewSales =
                            salesRecord[thisMonth].totalNewSales + totalSale;
                          salesRecord[thisMonth].totalNewCommissions =
                            salesRecord[thisMonth].totalNewCommissions +
                            payoutAmount;
                          //now depending on the type of user, increment that field
                          switch (commissionType.planType) {
                            case "lifetime":
                              salesRecord.totalLifetimeUsers =
                                salesRecord.totalLifetimeUsers + 1;
                              salesRecord[thisMonth].totalLifetimeUsers =
                                salesRecord[thisMonth].totalLifetimeUsers + 1;
                              break;
                            case "artistpack":
                              salesRecord.totalAPUsers =
                                salesRecord.totalAPUsers + 1;
                              salesRecord[thisMonth].totalAPUsers =
                                salesRecord[thisMonth].totalAPUsers + 1;
                              break;
                            case "yearly":
                              salesRecord.totalYearlyUsers =
                                salesRecord.totalYearlyUsers + 1;
                              salesRecord[thisMonth].totalYearlyUsers =
                                salesRecord[thisMonth].totalYearlyUsers + 1;
                              break;
                            case "monthly":
                              salesRecord.totalMonthlyUsers =
                                salesRecord.totalMonthlyUsers + 1;
                              salesRecord[thisMonth].totalMonthlyUsers =
                                salesRecord[thisMonth].totalMonthlyUsers + 1;
                              break;
                            default:
                              //default is to do nothing
                              break;
                          }
                        } else {
                          //otherwise if the commission is residual, update residual income fields but do not increment any user totals
                          salesRecord.totalResidualSales =
                            salesRecord.totalResidualSales + totalSale;
                          salesRecord.totalResidualCommissions =
                            salesRecord.totalResidualCommissions + payoutAmount;
                          salesRecord[thisMonth].totalResidualSales =
                            salesRecord[thisMonth].totalResidualSales +
                            totalSale;
                          salesRecord[thisMonth].totalResidualCommissions =
                            salesRecord[thisMonth].totalResidualCommissions +
                            payoutAmount;
                        }
                        salesRecord
                          .save()
                          .then(() => {
                            console.log("Successfully saved sales record.");
                          })
                          .catch((e) => {
                            console.log("Problem saving salesRecord");
                          });
                      } else {
                        //otherwise create a new salesRecord for this year
                        const newSalesRecord = new SalesRecord({
                          ownerID: referrer._id,
                          totalSales: totalSale,
                          totalCommissions: payoutAmount,
                          year: thisYear,
                          [thisMonth]: {
                            totalSales: totalSale,
                            totalCommissions: payoutAmount,
                          },
                        });
                        //now set specific fields depending on the commission type
                        if (commissionType.newOrResidual === "new") {
                          //if it's a new commission, set the total referred users
                          newSalesRecord.totalReferredUsers = 1;
                          newSalesRecord[thisMonth].totalReferredUsers = 1;
                          //set the totalNewSales and totalNewCommissions to the totalSale and payoutAmount respectively
                          newSalesRecord.totalNewSales = totalSale;
                          newSalesRecord.totalNewCommissions = payoutAmount;
                          newSalesRecord[thisMonth].totalNewSales = totalSale;
                          newSalesRecord[thisMonth].totalNewCommissions =
                            payoutAmount;
                          //now depending on the type of user, set that field
                          switch (commissionType.planType) {
                            case "lifetime":
                              newSalesRecord.totalLifetimeUsers = 1;
                              newSalesRecord[thisMonth].totalLifetimeUsers = 1;
                              break;
                            case "artistpack":
                              newSalesRecord.totalAPUsers = 1;
                              newSalesRecord[thisMonth].totalAPUsers = 1;
                              break;
                            case "yearly":
                              newSalesRecord.totalYearlyUsers = 1;
                              newSalesRecord[thisMonth].totalYearlyUsers = 1;
                              break;
                            case "monthly":
                              newSalesRecord.totalMonthlyUsers = 1;
                              newSalesRecord[thisMonth].totalMonthlyUsers = 1;
                              break;
                            default:
                              //default is to do nothing
                              break;
                          }
                        } else {
                          //otherwise if the commission is residual, set residual income fields but do not set any new user totals
                          newSalesRecord.totalResidualSales = totalSale;
                          newSalesRecord.totalResidualCommissions =
                            payoutAmount;
                          newSalesRecord[thisMonth].totalResidualSales =
                            totalSale;
                          newSalesRecord[thisMonth].totalResidualCommissions =
                            payoutAmount;
                        }
                        newSalesRecord.save();
                      }
                    }
                  );
                  resolve(transfer);
                } catch (e) {
                  reject(e);
                }
              } else {
                reject(
                  new Error(
                    "The referrer's account is inactive, suspended or unverified."
                  )
                );
              }
            } else reject(new Error("Invalid referrer code."));
          }
        );
      } else
        reject(
          new Error(
            "A join code is required to make pay a commission to a referrer."
          )
        );
    });
  }

  app.post(
    "/connect_webhook",
    bodyParser.raw({ type: "application/json" }),
    async (req, res) => {
      // Retrieve the event by verifying the signature using the raw body and secret.
      let event;

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          req.header("Stripe-Signature"),
          process.env.STRIPE_CONNECT_WEBHOOK_SECRET
        );
      } catch (err) {
        console.log(err);
        console.log(`⚠️  Webhook signature verification failed.`);
        console.log(
          `⚠️  Check the env file and enter the correct webhook secret.`
        );
        return res.sendStatus(400);
      }
      // Extract the object from the event.
      const dataObject = event.data.object;

      // Handle the event
      // Review important events for Billing webhooks
      // https://stripe.com/docs/billing/webhooks
      // Remove comment to see the various objects sent for this sample
      if (event.type === "account.updated") {
        if (dataObject.charges_enabled && dataObject.payouts_enabled) {
          //if the account has been activated, find the user whose account it is and set a few values
          User.findOne(
            { stripeAccountID: dataObject.id },
            function (err, user) {
              if (err) console.log(err);
              if (user) {
                //whether or not the user is an account exec, set their accountVerified field to true
                user.accountVerified = true;
                //if the user is an account executive and they do not have a join code yet, generate one
                if (user.isAccountExec && !user.joinCode) {
                  user.joinCode = nanoid(12);
                }
                attemptSaveUser(user, 5);
              }
            }
          );
        }
      }
      res.sendStatus(200);
    }
  );

  app.post(
    "/webhook",
    bodyParser.raw({ type: "application/json" }),
    async (req, res) => {
      // Retrieve the event by verifying the signature using the raw body and secret.
      let event;

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          req.header("Stripe-Signature"),
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        console.log(err);
        console.log(`⚠️  Webhook signature verification failed.`);
        console.log(
          `⚠️  Check the env file and enter the correct webhook secret.`
        );
        return res.sendStatus(400);
      }
      // Extract the object from the event.
      const dataObject = event.data.object;

      // Handle the event
      // Review important events for Billing webhooks
      // https://stripe.com/docs/billing/webhooks
      // Remove comment to see the various objects sent for this sample
      switch (event.type) {
        case "account.updated":
          if (dataObject.charges_enabled && dataObject.payouts_enabled) {
            //if the account has been activated, find the user whose account it is and set a few values
            User.findOne(
              { stripeAccountID: dataObject.id },
              function (err, user) {
                if (err) console.log(err);
                if (user) {
                  //whether or not the user is an account exec, set their accountVerified field to true
                  user.accountVerified = true;
                  //if the user is an account executive and they do not have a join code yet, generate one
                  if (user.isAccountExec && !user.joinCode) {
                    user.joinCode = nanoid(12);
                  }
                  attemptSaveUser(user, 5);
                }
              }
            );
          }
          break;
        case "payment_intent.succeeded":
          if (dataObject.metadata.lifetimeMembership) {
            //update user's membership
            const { customer: customerId } = dataObject;
            User.findOne(
              { stripeCustomerID: customerId },
              async function (err, user) {
                if (err) {
                  console.log(err);
                }
                if (user) {
                  //update the user's events to reflect the user's lifetime membership
                  const events = await Event.find({ ownerID: user._id });
                  if (events.length > 0) {
                    events.forEach((event) => {
                      event.expirationDate = "never";
                      event.save();
                    });
                  }
                  //set the paymentFailed field to false
                  user.paymentFailed = false;
                  //set the user's plan
                  user.plan = "lifetime";
                  //set the user's expiration date to "never";
                  user.expirationDate = "never";
                  //now if the user has been referred by someone else, transfer funds to that person
                  if (user.referrerJoinCode) {
                    try {
                      payoutReferrer(user);
                    } catch (e) {
                      console.log(e);
                    } finally {
                      attemptSaveUser(user, 5);
                    }
                  } else {
                    //otherwise, just try up to five times to save the user in case of server error
                    attemptSaveUser(user, 5);
                  }
                }
              }
            );
          }
          if (dataObject.metadata.apMembership) {
            //update user's membership
            const { customer: customerId } = dataObject;
            const dt = DateTime.now();
            const exp_dt = dt.plus({ months: 3, days: 1 }).toISO(); //3 months plus one day grace period
            User.findOne(
              { stripeCustomerID: customerId },
              async function (err, user) {
                if (err) {
                  console.log(err);
                }
                if (user) {
                  //update the user's events to reflect the user's artist pack membership
                  const events = await Event.find({ ownerID: user._id });
                  if (events.length > 0) {
                    events.forEach((event) => {
                      event.expirationDate = exp_dt;
                      event.save();
                    });
                  }
                  //set the paymentFailed field to false
                  user.paymentFailed = false;
                  //set the user's plan
                  user.plan = "artistpack";
                  //set the user's expiration date to 3 months and one day later
                  user.expirationDate = exp_dt;
                  //now if the user has been referred by someone else, transfer funds to that person
                  if (user.referrerJoinCode) {
                    try {
                      payoutReferrer(user);
                    } catch (e) {
                      console.log(e);
                    } finally {
                      attemptSaveUser(user, 5);
                    }
                  } else {
                    //otherwise, just try up to five times to save the user in case of server error
                    attemptSaveUser(user, 5);
                  }
                }
              }
            );
          }
          break;
        case "invoice.payment_succeeded":
          if (
            dataObject["billing_reason"] == "subscription_create" ||
            dataObject["billing_reason"] == "subscription_cycle"
          ) {
            //get the subscription id
            const subscription_id = dataObject["subscription"];
            const subscription_data = await stripe.subscriptions.retrieve(
              subscription_id
            );

            //determine the plan based on the price_id THESE NEED TO BE UPDATED FOR LIVE PRICES
            let plan;
            if (subscription_data.plan.id === process.env.STRIPE_MONTHLY_PRICE)
              plan = "monthly";
            else if (
              subscription_data.plan.id === process.env.STRIPE_YEARLY_PRICE
            )
              plan = "yearly";

            //if it is a new subscription, set the default payment method
            if (dataObject["billing_reason"] == "subscription_create") {
              const payment_intent_id = dataObject["payment_intent"];

              // Retrieve the payment intent used to pay the subscription
              const payment_intent = await stripe.paymentIntents.retrieve(
                payment_intent_id
              );

              const subscription = await stripe.subscriptions.update(
                subscription_id,
                {
                  default_payment_method: payment_intent.payment_method,
                }
              );
            }
            //now update the account expiry date
            const { customer: customerId } = dataObject;
            User.findOne(
              { stripeCustomerID: customerId },
              async function (err, user) {
                if (err) {
                  console.log(err);
                }
                if (user) {
                  //save the user's events with new expiration date
                  const dt = DateTime.now();
                  const events = await Event.find({ ownerID: user._id });
                  if (events.length > 0) {
                    events.forEach((event) => {
                      let exp_dt;
                      if (plan === "yearly") {
                        exp_dt = dt.plus({ years: 1, days: 1 }).toISO(); //one year plus one day grace period
                      } else if (plan === "monthly") {
                        exp_dt = dt.plus({ months: 1, days: 1 }).toISO(); //one month plus one day grace period
                      }
                      event.expirationDate = exp_dt;
                      event.save();
                    });
                  }
                  //set the paymentFailed field to false
                  user.paymentFailed = false;
                  //set the user's plan
                  user.plan = plan;
                  //set the user's subscription ID
                  user.stripeSubID = subscription_id;
                  //increment the current date to create the expiration date
                  let exp_dt;
                  if (plan === "yearly") {
                    exp_dt = dt.plus({ years: 1, days: 1 }).toISO(); //one year plus one day grace period
                  } else if (plan === "monthly") {
                    exp_dt = dt.plus({ months: 1, days: 1 }).toISO(); //one month plus one day grace period
                  }
                  user.expirationDate = exp_dt;
                  if (
                    user.referrerJoinCode &&
                    user.referrerJoinCode.length > 0
                  ) {
                    try {
                      payoutReferrer(user);
                    } catch (e) {
                      console.log(e);
                    } finally {
                      attemptSaveUser(user, 5);
                    }
                  } else {
                    //otherwise, just try up to five times to save the user in case of server error
                    attemptSaveUser(user, 5);
                  }
                }
              }
            );
          }
          break;
        case "invoice.payment_failed":
          // If the payment fails or the customer does not have a valid payment method,
          //  an invoice.payment_failed event is sent, the subscription becomes past_due.
          // Use this webhook to notify your user that their payment has
          // failed and to retrieve new card details.
          User.findOne({ stripeCustomerID: customerId }, function (err, user) {
            if (err) {
              console.log(err);
              res.sendStatus(500); //will need to go through all the error codes and make sure they are accurate/have an appropriately descriptive message.
            }
            if (user) {
              //set the paymentFailed field to true
              user.paymentFailed = true;
              user.save();
            }
          });
          break;
        case "invoice.finalized":
          // If you want to manually send out invoices to your customers
          // or store them locally to reference to avoid hitting Stripe rate limits.
          break;
        case "customer.subscription.deleted":
          if (event.request != null) {
            // handle a subscription cancelled by your request
            // from above.
          } else {
            // handle subscription cancelled automatically based
            // upon your subscription settings.
          }
          break;
        case "customer.subscription.trial_will_end":
          // Send notification to your user that the trial will end
          break;
        default:
        // Unexpected event type
      }
      res.sendStatus(200);
    }
  );
};
