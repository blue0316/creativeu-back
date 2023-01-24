const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const EventSchema = new Schema({
  _id: {
    type: String,
    required: true,
  },
  title: {
    type: String,
  },
  description: {
    type: String,
  },
  startTime: {
    type: Date,
  },
  endTime: {
    type: Date,
  },
  venueName: {
    type: String,
  },
  isOnline: {
    type: Boolean,
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
  },
  lat: {
    type: String,
  },
  lng: {
    type: String,
  },
  link: {
    type: String,
  },
  ticketsLink: {
    type: String,
  },
  ticketPrice: {
    type: String,
  },
  photoUrl: {
    type: String,
  },
  ownerID: {
    type: String,
    required: true,
  },
  ownerName: {
    type: String,
    required: true,
  },
  expirationDate: {
    //events will be filtered based on the owner's account activity status
    type: String,
    required: true,
  },
  tags: {
    type: Array,
  },
  color: {
    type: String, //color to display on calendar
  },
  isPublic: {
    type: Boolean,
  },
  going: {
    type: Array,
  },
  following: {
    type: Array,
  },
});

const Event = mongoose.model("Event", EventSchema);

module.exports = Event;
