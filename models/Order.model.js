const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const OrderSchema = new Schema({
  productName: {
    type: String,
    required: true,
  },
  productID: {
    type: String,
    required: true,
  },
  sellerID: {
    type: String,
    required: true,
  },
  sellerStripeID: {
    type: String,
    required: true,
  },
  customerStripeID: {
    type: String,
    required: true,
  },
  shippoTransactionID: {
    type: String,
    required: true,
  },
  hasShipped: {
    type: Boolean,
    required: true,
    default: false,
  },
});

const Order = mongoose.model("Order", OrderSchema);
module.exports = Order;
