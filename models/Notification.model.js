const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
  message: {
    type: String,
  },
  link: {
    type: String,
  },
  read: {
    type: Boolean,
    default: false,
  },
  ownerID: {
    type: String,
  },
});

const Notification = mongoose.model("Notification", NotificationSchema);

module.exports = Notification;
