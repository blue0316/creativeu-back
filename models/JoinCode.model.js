const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { DateTime } = require("luxon");
const { nanoid } = require("nanoid");

const JoinCodeSchema = new Schema({
  code: {
    type: String,
    default: () => {
      return nanoid(10);
    },
  },
  expirationDate: {
    type: Date,
    default: () => {
      return new Date(DateTime.now().plus({ weeks: 1 }).toISO());
    },
  },
  category: {
    type: Number, //can be 0 for account executive, 1 for free join code
    default: 0,
  },
});

const JoinCode = mongoose.model("JoinCode", JoinCodeSchema);
module.exports = JoinCode;
