const mongoose = require("mongoose");

// Timeline for tracking updates (like shipped, out for delivery, delivered)
const TimelineSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  status: { type: String } // e.g. "Shipped", "Delivered"
});

// Tracking info for shipment
const TrackingSchema = new mongoose.Schema({
  number: { type: String },              // tracking number
  carrier: { type: String },             // e.g. "BlueDart", "FedEx"
  estimatedDelivery: { type: Date },     // expected delivery date
  currentLocation: { type: String },     // where the package is now
  status: { type: String },              // current status
  timeline: [TimelineSchema]             // history of updates
});

// Each product inside an order
const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  size: { type: String },
  color: { type: String },
  price: { type: Number },
  quantity: { type: Number, default: 1 }
});

// Main Order schema
const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // who placed the order
    date: { type: Date, default: Date.now },                       // order date
    status: { type: String, default: "Pending" },                  // order status
    items: [OrderItemSchema],                                      // products in the order
    total: { type: Number },                                       // total amount
    shippingAddress: {                                             // delivery address
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    paymentMethod: { type: String },                               // e.g. "COD", "Credit Card"
    tracking: TrackingSchema                                       // shipment tracking info
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
