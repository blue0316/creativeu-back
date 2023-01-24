const express = require("express");
const enableWs = require("express-ws");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const dotEnv = require("dotenv");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();
dotEnv.config();
const wsInstance = enableWs(app);
const rateLimit = require("express-rate-limit");
const { ALLOWED_WEBHOOK_IP_ADDRESSES } = require("./constants/constants");
//  console.log(stripe,'strihgjhgjhgpe')
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
			res.status(403).send("UNAUTHORIZED ATTEMPT AT ACCESSING WEBHOOK");
		}
	} else {
		bodyParser.json()(req, res, next);
	}
});

//use cookie-parser for authentication cookies
app.use(cors());
app.use(cookieParser(process.env.COOKIE_SECRET));
// Serve up static assets
if (process.env.NODE_ENV !== "development") {
	app.use(express.static("client/build"));
}

let clients = {};

// API routes - require webhook route before csurf and csurf before everything else
// require("./routes/stripe-webhook")(app, stripe);
// require("./routes/csurf-routes.js")(app);

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

// require("./routes/contact-us-routes")(app);
// require("./routes/uri-safety-routes")(app);
// // require("./routes/user-routes")(app, stripe);
// // require("./routes/moderator-routes")(app, stripe);
// // require("./routes/media-routes")(app, stripe);
// require("./routes/geocoder-routes")(app);
// require("./routes/search-routes")(app);
// require("./routes/message-routes")(app, clients);
// require("./routes/event-request-routes")(app, clients);
// require("./routes/calendar-routes")(app);
// // require("./routes/subscription-routes")(app, stripe);
// require("./routes/websocket-routes")(app, clients);
// require("./routes/join-code-routes")(app);

require("./routes/contact-us-routes")(app);
require("./routes/uri-safety-routes")(app);
require("./routes/AuthPaymentMethod-routes")(app);
require("./routes/authSubscription-routes")(app);
require("./routes/user-routes")(app, stripe);
require("./routes/moderator-routes")(app, stripe);
require("./routes/media-routes")(app, stripe);
require("./routes/subscription-routes")(app, stripe);
require("./routes/geocoder-routes")(app);
require("./routes/search-routes")(app);
require("./routes/message-routes")(app, clients);
require("./routes/event-request-routes")(app, clients);
require("./routes/calendar-routes")(app);
require("./routes/websocket-routes")(app, clients);
require("./routes/join-code-routes")(app);
require("./routes/shop-routes")(app);
require("./routes/authCreateCustomer-routes")(app);
require("./routes/authChargeCredit-routes")(app);

// Send every other request to the React app
// Define any API routes before this runs
// app.get("/*", (req, res) => {
// 	res.sendFile(path.join(__dirname, "./client/build/index.html"));
// 	// res.sendFile(path.join(__dirname, "../frontend/build"));
// 	// res.sendFile(path.join(__dirname, "../frontend/build/index.html"));
// });
app.get("/", (req, res) => {
	res.status(200).send("Backend is running");
});
// //connect to the db

//   mongoose.connect(
//     process.env.NODE_ENV === "development"
//       ? "mongodb://localhost:27017/creativeu_db"
//       : `mongodb+srv://WebifyDev:${process.env.ATLAS_PASSWORD}@creativeucluster.wvuoo.mongodb.net/CreativeU?retryWrites=true&w=majority`
//   );
const url = ``;

mongoose
	// .connect("mongodb://localhost:27017/test-db")
	.connect(process.env.ATLAS_PASSWORD)
	.then(() => console.log("Connected to mongodb"))
	.catch((error) => console.log(error));
const port = process.env.PORT || 8080;
app.listen(port, () => console.log("App is listinign on port 8080"));
