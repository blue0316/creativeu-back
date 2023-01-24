const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Review = new Schema({
  reviewerID: {
    type: String,
    required: true,
  },
  reviewerName: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
  },
  review: {
    type: String,
  },
});

const ProductSchema = new Schema({
  sellerUid: {
    type: String,
  },
  sellerStripeID: {
    //this should never be provided to the frontend, only accessed by the backend after the product id is provided
    type: String,
  },
  sellerName: {
    type: String,
  },
  name: {
    type: String,
  },
  price: {
    type: Number,
  },
  description: {
    type: String,
  },
  category: {
    type: String,
  },
  tags: {
    type: Array,
  },
  quantityInStock: {
    type: Number,
  },
  unitsSold: {
    type: Number,
    default: 0,
  },
  isDigital: {
    type: Boolean,
  },
  parcelLength: {
    type: Number,
  },
  parcelWidth: {
    type: Number,
  },
  parcelHeight: {
    type: Number,
  },
  parcelWeight: {
    type: Number,
  },
  fileUrls: {
    type: Array,
  },
  photoUrls: {
    type: Array,
  },
  ratings: {
    type: Array,
  },
  averageRating: {
    type: Number,
  },
  reviews: [Review],
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

const Product = mongoose.model("Product", ProductSchema);
module.exports = Product;
