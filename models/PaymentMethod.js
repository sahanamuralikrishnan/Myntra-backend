const mongoose = require("mongoose");

const PaymentMethodSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cardBrand: { type: String, required: true },
    last4: { type: String, required: true },
    expiryMonth: { type: Number, required: true },
    expiryYear: { type: Number, required: true },
    cardholderName: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PaymentMethod", PaymentMethodSchema);
