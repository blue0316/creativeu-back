const mongoose = require("mongoose");
const { Schema } = mongoose;

const ReportSchema = new Schema({
  reportedUser: { type: Schema.Types.ObjectId, ref: "User" },
  reportedEvent: { type: Schema.Types.ObjectId, ref: "Event" },
  reportedProduct: { type: Schema.Types.ObjectId, ref: "Product" },
  reportedBy: { type: Schema.Types.ObjectId, ref: "User" },
  resolved: {
    type: Boolean,
    default: false,
  },
  resolution: {
    //description of resolution
    type: String,
  },
  reason: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: () => Date.now(),
  },
});

const Report = mongoose.model("Report", ReportSchema);

module.exports = Report;
