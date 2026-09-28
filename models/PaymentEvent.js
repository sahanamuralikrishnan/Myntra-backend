const mongoose = require("mongoose");

const paymentEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    type: { type: String, required: true },
    verified: { type: Boolean, default: false },
    rawPayload: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentEvent", paymentEventSchema);
