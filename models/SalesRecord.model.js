const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const nestedObject = {
  totalReferredUsers: {
    type: Number,
    default: 0,
  },
  totalLifetimeUsers: {
    type: Number,
    default: 0,
  },
  totalAPUsers: {
    type: Number,
    default: 0,
  },
  totalYearlyUsers: {
    type: Number,
    default: 0,
  },
  totalMonthlyUsers: {
    type: Number,
    default: 0,
  },
  totalSales: {
    type: Number,
    default: 0,
  },
  totalCommissions: {
    type: Number,
    default: 0,
  },
  totalNewSales: {
    type: Number,
    default: 0,
  },
  totalResidualSales: {
    type: Number,
    default: 0,
  },
  totalNewCommissions: {
    type: Number,
    default: 0,
  },
  totalResidualCommissions: {
    type: Number,
    default: 0,
  },
};

const SalesRecordSchema = new Schema({
  ownerID: {
    type: String,
    required: true,
  },
  year: {
    type: String,
    required: true,
  },
  ...nestedObject,
  January: {
    ...nestedObject,
  },
  February: {
    ...nestedObject,
  },
  March: {
    ...nestedObject,
  },
  April: {
    ...nestedObject,
  },
  May: {
    ...nestedObject,
  },
  June: {
    ...nestedObject,
  },
  July: {
    ...nestedObject,
  },
  August: {
    ...nestedObject,
  },
  September: {
    ...nestedObject,
  },
  October: {
    ...nestedObject,
  },
  November: {
    ...nestedObject,
  },
  December: {
    ...nestedObject,
  },
});

const SalesRecord = mongoose.model("SalesRecord", SalesRecordSchema);

module.exports = SalesRecord;
