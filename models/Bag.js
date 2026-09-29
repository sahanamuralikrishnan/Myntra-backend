const mongoose = require("mongoose");

const BagItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    size: { type: String },
quantity: { type: Number },
    savedForLater: { type: Boolean, default: false },
    priceAtAdd: { type: Number },
    reminderSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Bag", BagItemSchema);
