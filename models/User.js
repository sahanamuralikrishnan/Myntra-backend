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
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);

