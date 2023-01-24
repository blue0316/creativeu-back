const JoinCode = require("../models/JoinCode.model");
const { nanoid } = require("nanoid");
const { DateTime } = require("luxon");
const {
  sendAccountExecutiveCode,
  sendJoinCode,
} = require("../utils/send-email");
const passport = require("passport");
const settings = require("../passport-config/settings");

module.exports = function (app) {
  //create a code and email it to a user. user should be logged in as an admin to do this
  app.post(
    "/new_account_exec",
    passport.authenticate("mod", { session: false }),
    (req, res) => {
      const { email } = req.body;
      const newCode = new JoinCode({ category: 0 });
      newCode
        .save()
        .then((joinCode) => {
          console.log(joinCode);
          const urlToSend =
            process.env.NODE_ENV === "development"
              ? `http://localhost:3000/register?accountexec=${joinCode.code}`
              : `https://creativeu.live/register?accountexec=${joinCode.code}`;
          sendAccountExecutiveCode(email, urlToSend)
            .then(() => {
              res.sendStatus(200);
            })
            .catch((e) => {
              res.status(500).send(e.message);
            });
        })
        .catch((e) => {
          console.log("ERROR SAVING JOIN CODE");
          console.log(e);
        });
    }
  );

  app.post("/verify_account_exec_code", (req, res) => {
    const { code } = req.body;
    JoinCode.findOne({ code: code })
      .then((joinCode) => {
        if (joinCode && joinCode.category === 0) {
          //probably want to add a check for expiration date here.
          res.sendStatus(200);
        } else {
          res.sendStatus(404);
        }
      })
      .catch((e) => {
        console.log("PROBLEM VERIFYING JOIN CODE");
        console.log(e);
        res.sendStatus(500);
      });
  });

  app.post(
    "/new_join_code",
    passport.authenticate("mod", { session: false }),
    (req, res) => {
      const { email, fname } = req.body;
      const newCode = new JoinCode({ category: 1 });
      newCode
        .save()
        .then((joinCode) => {
          const urlToSend =
            process.env.NODE_ENV === "development"
              ? `http://localhost:3000/register?joincode=${joinCode.code}`
              : `https://creativeu.live/register?joincode=${joinCode.code}`;
          sendJoinCode(email, fname, urlToSend)
            .then(() => {
              res.sendStatus(200);
            })
            .catch((e) => {
              res.status(500).send(e.message);
            });
        })
        .catch((e) => {
          console.log("PROBLEM SAVING JOIN CODE");
          console.log(e);
          res.sendStatus(500);
        });
    }
  );

  //delete expired codes --> maybe this should be run with setTimeOut
  // app.delete("/remove_expired_codes", (req, res) => {
  //   const codes = SData("account-exec-codes");
  //   if (codes) {
  //     //delete any expired codes
  //     codes.filter((code) => {
  //       return DateTime.fromISO(code.expiration) >= DateTime.now();
  //     });
  //     SData("codes", codes);
  //   }
  //   res.sendStatus(200);
  // });
};
