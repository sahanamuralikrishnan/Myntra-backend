const mongoose = require("mongoose");

const recentlyViewedSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    viewedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

recentlyViewedSchema.index({ userId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model("RecentlyViewed", recentlyViewedSchema);
