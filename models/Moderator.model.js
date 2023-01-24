const mongoose = require("mongoose");
const { Schema } = mongoose;
// const uniqueValidator = require("mongoose-unique-validator");
const jumblator = require("mongoose-jumblator").fieldEncryptionPlugin;
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const ModeratorSchema = new Schema({
  secretID: {
    type: String,
    default: uuidv4,
  },
  role: {
    type: String,
    default: "moderator",
  },
  email: {
    type: String,
    required: true,
    match: [
      /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/,
      "Must be a valid email address",
    ],
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  fname: {
    type: String,
    required: true,
  },
  lname: {
    type: String,
    required: true,
  },
  loginDates: {
    type: Array,
    default: [],
  },
});

//ensure that all fields that must be unique are unique
// ModeratorSchema.plugin(uniqueValidator);

// ModeratorSchema.plugin(jumblator, { secret: process.env.MONGOOSE_SECRET });

//before saving the user's password to the db, hash it
ModeratorSchema.pre("save", function (next) {
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
ModeratorSchema.methods.comparePassword = function (plaintext, cb) {
  return cb(null, bcrypt.compareSync(plaintext, this.password));
};

const Moderator = mongoose.model("Moderator", ModeratorSchema);

module.exports = Moderator;
