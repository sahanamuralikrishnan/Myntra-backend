const mongoose = require("mongoose");

  const userSchema = new mongoose.Schema(
  {

    fullname: { type: String, required: true, trim: true },
    email: {
      type: String,
      required : true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    theme: { type: String, enum: ["light", "dark", "festive"], default: "light" },


    // recently viewed products
    recentlyViewed: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        viewedAt: { type: Date, default: Date.now },
      },
    ],

    // Continue Shopping (products viewed but not purchased)
    continueShopping: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
      // Which notification categories the user wants to receive
    notificationPreferences: {
      order:          { type: Boolean, default: true },
      payment:        { type: Boolean, default: true },
      shipping:       { type: Boolean, default: true },
      delivery:       { type: Boolean, default: true },
      price_drop:     { type: Boolean, default: true },
      back_in_stock:  { type: Boolean, default: true },
      promotion:      { type: Boolean, default: true },
      abandoned_cart: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);

