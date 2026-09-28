const mongoose = require("mongoose");

const BagItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    size: { type: String },
quantity: { type: Number },
    // When the abandoned-cart reminder was sent for this item (null = not yet)
    reminderSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Bag", BagItemSchema);
