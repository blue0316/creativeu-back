const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const OfferSchema = new Schema({
  pay: {
    type: String,
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  senderID: {
    type: String,
    required: true,
  },
  recipientID: {
    type: String,
    required: true,
  },
});

const AcceptedOfferSchema = new Schema({
  pay: {
    type: String,
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
});

const EventRequestSchema = new Schema({
  archived: {
    type: Boolean,
    default: false,
  },
  //for easy lookup
  senderID: {
    type: String,
    required: true,
  },
  recipientID: {
    type: String,
    required: true,
  },
  //for displaying information about each party
  sender: {
    type: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  recipient: {
    type: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  title: {
    type: String,
  },
  description: {
    type: String,
  },
  isOnline: {
    type: Boolean,
  },
  venueName: {
    type: String,
  },
  streetAddressLine1: {
    type: String,
  },
  streetAddressLine2: {
    type: String,
  },
  city: {
    type: String,
  },
  stateOrProvince: {
    type: String,
  },
  postalCode: {
    type: String,
  },
  country: {
    type: String,
    default: "United States of America",
  },
  offers: [OfferSchema],
  acceptedOffer: AcceptedOfferSchema,
  declined: {
    type: Boolean,
    default: false,
  },
  readBySender: {
    type: Boolean,
    default: true,
  },
  readByRecipient: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: () => Date.now(),
  },
  lastRespondedToAt: {
    type: Date,
    default: () => Date.now(),
  },
});

EventRequestSchema.pre("find", function (next) {
  if (this.options._recursed) {
    return next();
  }
  this.populate({
    path: "sender",
    select: "_id displayName profileUrl profilePicUrl",
    options: { _recursed: true },
  });
  this.populate({
    path: "recipient",
    select: "_id displayName profileUrl profilePicUrl",
    options: { _recursed: true },
  });
  next();
});

const EventRequest = mongoose.model("EventRequest", EventRequestSchema);
module.exports = EventRequest;
