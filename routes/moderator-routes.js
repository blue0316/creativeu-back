const Moderator = require("../models/Moderator.model");
const User = require("../models/User.model");
const Event = require("../models/Event.model");
const Report = require("../models/Report.model");
const passport = require("passport");
const settings = require("../passport-config/settings");
const jwt = require("jsonwebtoken");
const { DateTime } = require("luxon");
const { isAlreadyLoggedIn } = require("../utils/login-utils");
const MessageThread = require("../models/MessageThread.model");
const EventRequest = require("../models/EventRequest.model");
//require rate-limiter-flexible to defend against brute force attacks to obtain passwords
const { RateLimiterMemory } = require("rate-limiter-flexible");

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
  app.post("/login_mod", isAlreadyLoggedIn, (req, res) => {
    //use cf-connecting-ip to the user's original IP as the application is hidden behind cloudflare IPs
    const ipAddr = req.headers["cf-connecting-ip"] || req.socket.remoteAddress;
    limiterFastBruteByIP
      .consume(ipAddr, 0) // consume no points except in event of failure
      .then((_) => {
        limiterSlowBruteByIP
          .consume(ipAddr, 0) //consume no points except in the event of failure
          .then((_) => {
            Moderator.findOne(
              {
                email: req.body.email,
              },
              function (err, moderator) {
                if (err || !moderator) {
                  return res.sendStatus(401);
                } else {
                  moderator.comparePassword(
                    req.body.password,
                    async function (err, isMatch) {
                      if (err || !isMatch) {
                        //if there is an error or the password and username don't match
                        // Consume 1 point from limiters on wrong attempt and block if limits reached
                        limiterFastBruteByIP
                          .consume(ipAddr, 1)
                          .then((_) => {
                            limiterSlowBruteByIP
                              .consume(ipAddr, 1)
                              .then((_) => {
                                return res.sendStatus(401);
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
                                return res
                                  .status(429)
                                  .send("Too Many Requests");
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
                                return res
                                  .status(429)
                                  .send("Too Many Requests");
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
                                return res
                                  .status(429)
                                  .send("Too Many Requests");
                              });
                          });
                      }
                      if (isMatch && !err) {
                        //tokenize the user's secretID, email and role
                        const claims = {
                          secretID: moderator.secretID,
                          email: moderator.email,
                          permissions: moderator.role,
                        };
                        const token = jwt.sign(
                          claims,
                          settings.secret,
                          { expiresIn: 60 * 60 * 24 * 14 } //60 seconds * 60 minutes * 24 hours * 14 days
                        );
                        // set a cookie in the user's browser and then return the user
                        res.cookie("jwt", token, {
                          httpOnly: true,
                          domain: "creativeu.live",
                          sameSite: true,
                          signed: true,
                          secure: true,
                          expires: new Date(
                            DateTime.now().plus({ days: 1 }).toISO()
                          ),
                        });
                        //now update the moderator's last login date
                        moderator.loginDates.push(DateTime.now().toISO());
                        if (moderator.loginDates.length > 2)
                          moderator.loginDates.shift();
                        moderator
                          .save()
                          .then((updatedMod) => {
                            return res.json({
                              success: true,
                              user: updatedMod,
                            });
                          })
                          .catch((e) => {
                            return res.json({
                              success: true,
                              user: moderator,
                              message:
                                "login succeeded, but update to moderator login dates failed.",
                            });
                          });
                      } else {
                        res.sendStatus(401);
                      }
                    }
                  );
                }
              }
            );
          });
      });
  });

  //logout
  app.delete(
    "/logout_mod",
    passport.authenticate("mod", { session: false }),
    (req, res) => {
      //logout should only succeed if the moderator is logged in
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

  //check authenticated mod
  app.post(
    "/authenticated_mod",
    isAlreadyLoggedIn,
    passport.authenticate("mod", { session: false }),
    async (req, res) => {
      if (req.user) {
        res.json(req.user);
      } else {
        return res.status(403).send({ success: false, msg: "Unauthorized." });
      }
    }
  );
  //count users, events, reports, etc
  app.get(
    "/count_documents",
    passport.authenticate("mod", { session: false }),
    async (req, res) => {
      const { user } = req;
      //if the user has two items in their loginDates array, this is at least the second time they've logged in
      //if they do not, this is their first time logging in and count functions based on last log in date will not be called
      const lastLoggedIn =
        user.loginDates.length > 1 ? new Date(user.loginDates[0]) : null;
      try {
        let allUsers,
          accountExecutives,
          reportedUsers,
          suspendedUsers,
          moderators,
          allReports,
          unresolvedReports,
          resolvedReports,
          newUsers = 0,
          newlyUpdatedUsers = 0;
        try {
          allUsers = await User.countDocuments({ suspended: false });
          accountExecutives = await User.countDocuments({
            isAccountExec: true,
            suspended: false,
          });
          reportedUsers = await User.countDocuments({
            reported: true,
            suspended: false,
          });
          suspendedUsers = await User.countDocuments({ suspended: true });
          moderators = await Moderator.countDocuments({});
          allReports = await Report.countDocuments({});
          unresolvedReports = await Report.countDocuments({ resolved: false });
          resolvedReports = await Report.countDocuments({ resolved: true });
          events = await Event.countDocuments({
            startTime: { $gte: Date.now() },
          });
          if (lastLoggedIn) {
            newUsers = await User.countDocuments({
              createdAt: { $gte: lastLoggedIn },
            });
            newlyUpdatedUsers = await User.countDocuments({
              lastUpdatedAt: { $gte: lastLoggedIn },
            });
          }
          res.json({
            allUsers,
            accountExecutives,
            newUsers,
            newlyUpdatedUsers,
            reportedUsers,
            suspendedUsers,
            moderators,
            allReports,
            resolvedReports,
            unresolvedReports,
            events,
          });
        } catch (e) {
          console.log(e);
          res.sendStatus(500);
        }
      } catch (e) {
        console.log(e);
        res.sendStatus(500);
      }
    }
  );

  app.get(
    "/moderator_docs/new_users",
    passport.authenticate("mod", { session: false }),
    async (req, res) => {
      const { user } = req;
      if (!user) return res.sendStatus(401);
      const lastLoggedIn =
        user.loginDates.length > 1 ? new Date(user.loginDates[0]) : null;
      let newUsers = [];
      if (lastLoggedIn) {
        try {
          newUsers = await User.find({
            createdAt: { $gte: lastLoggedIn },
          });
        } catch (e) {
          return res.status(500).send(e.message);
        }
      }
      res.json(newUsers);
    }
  );

  app.get(
    "/moderator_docs/newly_updated_users",
    passport.authenticate("mod", { session: false }),
    async (req, res) => {
      const { user } = req;
      if (!user) return res.sendStatus(401);
      const lastLoggedIn =
        user.loginDates.length > 1 ? new Date(user.loginDates[0]) : null;
      let newlyUpdatedUsers = [];
      if (lastLoggedIn) {
        try {
          newlyUpdatedUsers = await User.find({
            lastUpdatedAt: { $gte: lastLoggedIn },
          });
        } catch (e) {
          return res.status(500).send(e.message);
        }
      }
      res.json(newlyUpdatedUsers);
    }
  );

  app.get(
    "/moderator_docs/suspended_users",
    passport.authenticate("mod", { session: false }),
    async (req, res) => {
      try {
        const suspendedUsers = await User.find({ suspended: true });
        res.json(suspendedUsers);
      } catch (e) {
        res.status(500).send(e.message);
      }
    }
  );

  app.get(
    "/moderator_docs/reported_users",
    passport.authenticate("mod", { session: false }),
    async (req, res) => {
      try {
        const reportedUsers = await User.find({
          reported: true,
          suspended: false,
        });
        res.json(reportedUsers);
      } catch (e) {
        res.status(500).send(e.message);
      }
    }
  );

  app.get(
    "/moderator_docs/account_executives",
    passport.authenticate("mod", { session: false }),
    async (req, res) => {
      try {
        const accountExecutives = await User.find({
          suspended: false,
          isAccountExec: true,
        });
        res.json(accountExecutives);
      } catch (e) {
        res.status(500).send(e.message);
      }
    }
  );

  app.get(
    "/moderator_docs/events",
    passport.authenticate("mod", { session: false }),
    async (req, res) => {
      try {
        const events = await Event.find({
          startTime: { $gte: Date.now() },
        });
        res.json(events);
      } catch (e) {
        res.status(500).send(e.message);
      }
    }
  );

  app.get(
    "/moderator_docs/moderators",
    passport.authenticate("mod", { session: false }),
    async (req, res) => {
      try {
        const mods = await Moderator.find({});
        res.json(mods);
      } catch (e) {
        res.status(500).send(e.message);
      }
    }
  );

  app.get(
    "/moderator_docs/all_reports",
    passport.authenticate("mod", { session: false }),
    async (req, res) => {
      try {
        const allReports = await Report.find({});
        res.json(allReports);
      } catch (e) {
        res.status(500).send(e.message);
      }
    }
  );

  app.get(
    "/moderator_docs/unresolved_reports",
    passport.authenticate("mod", { session: false }),
    async (req, res) => {
      try {
        const unresolvedReports = await Report.find({ resolved: false });
        res.json(unresolvedReports);
      } catch (e) {
        res.status(500).send(e.message);
      }
    }
  );

  app.get(
    "/moderator_docs/resolved_reports",
    passport.authenticate("mod", { session: false }),
    async (req, res) => {
      try {
        const resolvedReports = await Report.find({ resolved: true });
        res.json(resolvedReports);
      } catch (e) {
        res.status(500).send(e.message);
      }
    }
  );

  app.post(
    "/suspend_user",
    passport.authenticate("mod", { session: false }),
    (req, res) => {
      const { userIDToSuspend } = req.body;
      //refund any orders that haven't been marked as sent
      //delete the user's files in AWS storage --> may need to schedule a delete in the future for digital products
      //finally suspend the user from the database
      User.findById(userIDToSuspend, async (err, user) => {
        if (err) {
          res.sendStatus(500);
        } else if (user) {
          const { stripeSubID } = user;
          if (stripeSubID && stripeSubID.length > 0) {
            try {
              await stripe.subscriptions.del(stripeSubID);
            } catch (e) {
              //if the subscription could not be deleted, send an error message to the frontend
              console.log(e);
              res.sendStatus(500);
            }
          }
          user.suspended = true;
          user
            .save()
            .then(() => {
              //set the expiration date on all of their events
              Event.find({ ownerID: user._id.toString() }).then((res) => {
                res.forEach((event) => {
                  event.expirationDate = DateTime.now()
                    .minus({ years: 50 })
                    .toISO();
                  event.save();
                });
              });
              //set threads to archived
              MessageThread.find({
                participants: { $in: [user._id] },
              }).then((res) => {
                res.forEach((thread) => {
                  thread.archived = true;
                  thread.save();
                });
              });
              //set event requests to archived
              EventRequest.find({
                $or: [{ senderID: user._id }, { recipientID: user._id }],
              }).then((res) => {
                res.forEach((thread) => {
                  thread.archived = true;
                  thread.save();
                });
              });
              res.sendStatus(200);
            })
            .catch(() => {
              res.sendStatus(500);
            });
        }
      });
    }
  );
};
