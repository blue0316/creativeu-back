const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// const uniqueValidator = require("mongoose-unique-validator");
const jumblator = require("mongoose-jumblator").fieldEncryptionPlugin;
const { v4: uuidv4 } = require("uuid");
const { nanoid } = require("nanoid");
const bcrypt = require("bcryptjs");

const ArtistSchema = new Schema({
  _id: {
    type: String,
    required: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  profileUrl: {
    type: String,
    required: true,
  },
  profilePicUrl: {
    type: String,
    required: true,
  },
});

const MediaSchema = new Schema({
  url: {
    type: String,
  },
  title: {
    type: String,
  },
  fileType: {
    type: String,
  },
});

const UserSchema = new Schema({
  createdAt: {
    type: Date,
    default: () => Date.now(),
  },
  lastUpdatedAt: {
    type: Date,
  },
  secretID: {
    type: String,
    required: true,
    unique: true,
    default: uuidv4,
    // encrypt: true,
    // searchable: true,
  },
  profileUrl: {
    //string for displaying a user's profile
    type: String,
    required: true,
    default: () => nanoid(14),
    unique: true,
  },
  type: {
    type: String,
    required: true,
  },
  plan: {
    type: String, //monthly, yearly, lifetime
  },
  paymentFailed: {
    type: Boolean,
    default: false,
  },
  email: {
    type: String,
    match: [
      /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/,
      "Must be a valid email address",
    ],
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  fname: {
    type: String,
    required: true,
    encrypt: true,
    searchable: true,
  },
  lname: {
    type: String,
    required: true,
    encrypt: true,
    searchable: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  isDiscoverable: {
    type: Boolean,
  },
  category: {
    type: String,
    required: true,
  },
  tags: {
    type: Array,
  },
  streetAddressLine1: {
    type: String,
  },
  streetAddressLine2: {
    type: String,
  },
  city: {
    type: String,
    required: true,
  },
  stateOrProvince: {
    type: String,
  },
  country: {
    type: String,
    default: "USA",
  },
  postalCode: {
    type: String,
    encrypt: true,
    searchable: true,
  },
  cell: {
    type: String,
    encrypt: true,
    searchable: true,
  },
  lat: {
    type: String,
  },
  lng: {
    type: String,
  },
  about: {
    type: String,
  },
  links: {
    //external links
    type: Array,
  },
  profilePicUrl: {
    type: String,
  },
  coverPhotoUrl: {
    type: String,
    encrypt: true,
    searchable: true,
  },
  following: {
    type: Array,
  },
  followers: {
    type: Array,
  },
  visualMedia: [MediaSchema],
  audioMedia: [MediaSchema],
  //STRIPE CLIENT INFO
  //stripe subscription info
  stripeCustomerID: {
    type: String,
    encrypt: true,
    searchable: true,
  },
  secret: {
    type: String,
    encrypt: true,
    searchable: true,
  },
  stripeSubID: {
    //subscription ID will be saved so the user can easily cancel their subscription.
    type: String,
    encrypt: true,
    searchable: true,
  },
  expirationDate: {
    type: String,
    default: "", //DEFAULT TO NEVER FOR TESTING
  },
  //stripe seller info/account exec info
  stripeAccountID: {
    type: String,
    encrypt: true,
    searchable: true,
  },
  accountVerified: {
    type: Boolean,
    default: false,
  },
  joinCode: {
    type: String,
  },
  //products
  products: {
    type: Array,
    default: [],
  },
  //FOR BUSINESS TYPE USERS - could be artists who have recorded on a label, presented at a gallery, etc.
  artists: [ArtistSchema],
  //fields for content control
  reported: {
    type: Boolean,
    default: false,
  },
  suspended: {
    type: Boolean,
    default: false,
  },
  blockedUsers: {
    //other users that the current user has blocked
    type: Array,
    default: [],
  },
  blockedByUsers: {
    //users that the active user may not message
    type: Array,
    default: [],
  },
  reportedUsers: {
    //users that the current user has reported
    type: Array,
    default: [],
  },
  isAccountExec: {
    type: Boolean,
    default: false,
  },
  referrerJoinCode: {
    type: String,
  },
  totalSales: {
    type: Number,
    default: 0,
  },
  totalCommissions: {
    type: Number,
    default: 0,
  },
  totalReferredUsers: {
    type: Number,
    default: 0,
  },
  totalReferredLifetimeUsers: {
    type: Number,
    default: 0,
  },
  totalReferredAPUsers: {
    type: Number,
    default: 0,
  },
  totalReferredYearlyUsers: {
    type: Number,
    default: 0,
  },
  totalReferredMonthlyUsers: {
    type: Number,
    default: 0,
  },
  hasViewedOnboardingMessage: {
    type: Boolean,
    default: false,
  },
  //first cycle determines whether the referrer should be paid the initial amount or the residual amount
  firstCycle: {
    type: Boolean,
    default: true,
  },
  //password reset code and expiration date
  passwordResetCode: {
    type: String,
  },
  passwordResetExpirationDate: {
    type: Date,
  },
});

//ensure that all fields that must be unique are unique
// UserSchema.plugin(uniqueValidator);

// UserSchema.plugin(jumblator, { secret: process.env.MONGOOSE_SECRET });

//before saving the user's password to the db, hash it
UserSchema.pre("save", function (next) {
  const user = this;
  if (this.isModified("password") || this.isNew) {
    bcrypt.genSalt(10, function (err, salt) {
      if (err) {
        return next(err);
      }
      bcrypt.hash(user.password, salt, function (err, hash) {
        if (err) {
          return next(err);
        }
        user.password = hash;
        next();
      });
    });
  } else {
    return next();
  }
});

//this function determines whether an entered password is correct
UserSchema.methods.comparePassword = function (plaintext, cb) {
  return cb(null, bcrypt.compareSync(plaintext, this.password));
};

const User = mongoose.model("User", UserSchema);

module.exports = User;
