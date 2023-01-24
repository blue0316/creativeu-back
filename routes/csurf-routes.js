// //these routes should be required in before all other routes to provide csrf protection
// //cookieParser is required for these to work
// const csurf = require("csurf");
// const csrfProtection = csurf({
//   cookie: true,
// });

// module.exports = function (app) {
//   app.use(csrfProtection);

//   //handle requests that do not include a token
//   app.use(function (err, req, res, next) {
//     console.log( req.body,res,'token')
//     if (err.code !== "EBADCSRFTOKEN") return next(err);
//     res.status(403);
//     res.send("Suspicious request.");
//   });

//   app.get("/csrftoken", (req, res) => {
//     res.json({ CSRFToken: req.csrfToken() });
//   });
// };
