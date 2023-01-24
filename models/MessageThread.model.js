const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  senderID: {
    type: String,
    required: true,
  },
  message: {
    type: String,
  },
  read: {
    type: Boolean,
    default: false,
  },
  sentAt: {
    type: Date,
    required: true,
    default: () => Date.now(),
  },
  readAt: {
    type: Date,
  },
});

const MessageThreadSchema = new Schema({
  participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
  messages: [MessageSchema],
  archived: {
    type: Boolean,
    default: false,
  },
});

MessageThreadSchema.pre("find", function (next) {
  if (this.options._recursed) {
    return next();
  }
  this.populate({
    path: "participants",
    select: "_id displayName profileUrl profilePicUrl",
    options: { _recursed: true },
  });
  next();
});

const MessageThread = mongoose.model("MessageThread", MessageThreadSchema);
module.exports = MessageThread;
