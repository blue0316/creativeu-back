const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AuthPaymentSchema = new Schema({
  _id: {
    type: String,
    required: true,
  },
  accountNumber: {
    type: String,
    required: true,
  },
  expire: {
    type: String,
    required: true,
  },
  amount: {
    type: String,
    required: true,
  },
  CardVerificationValue: {
    type: String,
    required: true,
  },
});

const AuthPayment = mongoose.model("AuthPayment", AuthPaymentSchema);

module.exports = AuthPayment;
