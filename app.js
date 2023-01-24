const express = require("express");
const enableWs = require("express-ws");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const PORT = process.env.PORT || 4242;
const app = express();
const wsInstance = enableWs(app);
const rateLimit = require("express-rate-limit");
const { ALLOWED_WEBHOOK_IP_ADDRESSES } = require("./constants/constants");

//require dotenv file for stripe keys
require("dotenv").config({ path: "./.env" });
const { ALLOWED_ORIGINS } = require("./constants/constants");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2020-08-27",
  //   appInfo: {
  //     // For sample support and debugging, not required for production:
  //     name: "stripe-samples/subscription-use-cases/fixed-price",
  //     version: "0.0.1",
  //     url: "https://github.com/stripe-samples/subscription-use-cases/fixed-price",
  //   },
});

//development
if (process.env.NODE_ENV === "development") {
  app.use(cors());
} else {
  //production && staging
  app.use(
    cors({
      //may need to add "credentials: true," so that csurf routes work properly
      origin: function (origin, callback) {
        // allow requests with no origin
        // (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        //NEED TO VERIFY THAT THIS WORKS AS EXPECTED
        if (ALLOWED_ORIGINS.indexOf(origin.split("//")[1]) === -1) {
          var msg =
            "The CORS policy for this site does not " +
            "allow access from the specified Origin: " +
            origin;
          return callback(new Error(msg), false);
        }
        return callback(null, true);
      },
    })
  );
}

// the site is hosted on cloudflare, so the nginx file in the EC2 instance had to be updated to include cloudflare IP addresses and
// set this header
app.get("/ip", (request, response) =>
  response.send(request.headers["cf-connecting-ip"])
);

app.use(fileUpload({ useTempFiles: false }));

// Define middleware here
app.use(bodyParser.urlencoded({ extended: true }));
//use express.json to parse all non-webhook routes, confirm that IP accessing webhook is from stripe
app.use((req, res, next) => {
  if (
    req.originalUrl === "/webhook" ||
    req.originalUrl === "/connect_webhook"
  ) {
    const IP = req.headers["cf-connecting-ip"];
    if (ALLOWED_WEBHOOK_IP_ADDRESSES.includes(IP)) {
      next();
    } else {
      console.log("UNAUTHORIZED ATTEMPT AT ACCESSING WEBHOOK");
      res.status(403).send("UNAUTHORIZED ATTEMPT AT ACCESSING WEBHOOK");
    }
  } else {
    bodyParser.json()(req, res, next);
  }
});

//use cookie-parser for authentication cookies
app.use(cookieParser(process.env.COOKIE_SECRET));

// Serve up static assets
if (process.env.NODE_ENV !== "development") {
  app.use(express.static("client/build"));
}

let clients = {};

// API routes - require webhook route before csurf and csurf before everything else
require("./routes/stripe-webhook")(app, stripe);
require("./routes/csurf-routes.js")(app);

//now apply rate limiters
const DDOSPrevention = rateLimit({
  windowMs: 60 * 1000, // 60 seconds * 1000 millisecs
  max: 100, // Limit each IP to 100 requests per `window` (here, per one minute)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req, _res) => {
    //use cf-connecting-ip to the user's original IP as the application is hidden behind cloudflare IPs
    return req.headers["cf-connecting-ip"] || req.socket.remoteAddress;
  },
});

const SlowBruteForceLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours in millisecs (24 hrs * 60 minutes * 60 seconds * 1000 millisecs)
  max: 1000, // Limit each IP to 1000 requests per `window` (here, per 24 hours)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req, _res) => {
    return req.headers["cf-connecting-ip"] || req.socket.remoteAddress;
  },
});

app.use(DDOSPrevention);
app.use(SlowBruteForceLimiter);

require("./routes/contact-us-routes")(app);
require("./routes/uri-safety-routes")(app);
require("./routes/user-routes")(app, stripe);
require("./routes/moderator-routes")(app, stripe);
require("./routes/media-routes")(app, stripe);
require("./routes/geocoder-routes")(app);
require("./routes/search-routes")(app);
require("./routes/message-routes")(app, clients);
require("./routes/event-request-routes")(app, clients);
require("./routes/calendar-routes")(app);
require("./routes/subscription-routes")(app, stripe);
require("./routes/websocket-routes")(app, clients);
require("./routes/join-code-routes")(app);
// require("./routes/shop-routes")(app);

// Send every other request to the React app
// Define any API routes before this runs
app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "./client/build/index.html"));
});
// //connect to the db

  console.log('try')
  mongoose.connect(
    process.env.NODE_ENV === "development"
      ? "mongodb://localhost:27017/creativeu_db"
      : `mongodb+srv://WebifyDev:${process.env.ATLAS_PASSWORD}@creativeucluster.wvuoo.mongodb.net/CreativeU?retryWrites=true&w=majority`
  );



app.listen(PORT, () => {
  console.log(
    `SUCCESSFULLY LAUNCHED SERVER ==> API server now on port ${PORT}!`
  );
});
