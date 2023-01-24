const JwtStrategy = require("passport-jwt").Strategy;
const cookieExtractor = function (req) {
  var token = null;
  if (req && req.signedCookies) token = req.signedCookies["jwt"];
  return token;
};
// console.log(JwtStrategy, "JwtStrategy");
const User = require("../models/User.model");
const Moderator = require("../models/Moderator.model");
const settings = require("./settings");
// console.log(settings, "sttings");
module.exports = function (passport) {
  // console.log(passport, "passport");
  var opts = {};
  opts.jwtFromRequest = cookieExtractor;
  opts.secretOrKey = settings.secret;
  // console.log(opts, "sads");
  passport.use(
    "user",
    new JwtStrategy(opts, function (jwt_payload, done) {
      //if not logged in as a user
      // console.log("jwt");
      if (jwt_payload.permissions !== "user") {
        console.log("if");
        return done(null, false);
      }
      User.findOne(
        { email: jwt_payload.email, secretID: jwt_payload.secretID },
        function (err, user) {
          if (err) {
            return done(err, false);
          }
          if (user) {
            if (user.suspended)
              return done(
                "Your account has been suspended due to violation of our terms of service",
                false
              );
            else {
              done(null, user);
            }
          } else {
            done(null, false);
          }
        }
      );
    })
  );
  passport.use(
    "mod",
    new JwtStrategy(opts, function (jwt_payload, done) {
      //if not logged in as a moderator
      if (jwt_payload.permissions !== "moderator") {
        return done(null, false);
      }
      Moderator.findOne(
        { email: jwt_payload.email, secretID: jwt_payload.secretID },
        function (err, moderator) {
          if (err) {
            return done(err, false);
          }
          if (moderator) {
            done(null, moderator);
          } else {
            done(null, false);
          }
        }
      );
    })
  );
};
