const mongoose = require("mongoose");

const notificationLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true },
    category: {
      type: String,
      enum: [
        "order",
        "payment",
        "shipping",
        "delivery",
        "price_drop",
        "back_in_stock",
        "promotion",
        "abandoned_cart",
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["sent", "delivered", "failed"],
      default: "sent",
    },
    ticketId: { type: String },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NotificationLog", notificationLogSchema);
