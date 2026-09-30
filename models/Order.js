const mongoose = require("mongoose");

// Timeline for tracking updates (like shipped, out for delivery, delivered)
const TimelineSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  status: { type: String }, // e.g. "Shipped", "Delivered"
});

// Tracking info for shipment
const TrackingSchema = new mongoose.Schema({
  number: { type: String }, // tracking number
  carrier: { type: String }, // e.g. "BlueDart", "FedEx"
  estimatedDelivery: { type: Date }, // expected delivery date
  currentLocation: { type: String }, // where the package is now
  status: { type: String }, // current status
  timeline: [TimelineSchema], // history of updates
});
// A user's request to cancel an order before it ships
const CancellationSchema = new mongoose.Schema({
  reason: { type: String },
  requestedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["Requested", "Approved", "Rejected"],
    default: "Requested",
  },
});

// A user's request to return a delivered order
const ReturnRequestSchema = new mongoose.Schema({
  reason: { type: String },
  requestedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["Requested", "Approved", "Rejected", "Completed"],
    default: "Requested",
  },
});
// Each product inside an order
const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  size: { type: String },
  color: { type: String },
  price: { type: Number },
  quantity: { type: Number, default: 1 },
});
// Main Order schema
const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    date: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["Processing", "Shipped", "In Transit", "Out for Delivery", "Delivered", "Cancelled", "Returned"],
      default: "Processing",
    },
    items: [OrderItemSchema],
    total: { type: Number },
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    paymentMethod: { type: String },
    invoiceNumber: { type: String, unique: true, sparse: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    cancellation: CancellationSchema,
    returnRequest: ReturnRequestSchema,
    tracking: TrackingSchema,
  },
  { timestamps: true },
);

OrderSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model("Order", OrderSchema);
