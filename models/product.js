const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  brand: { type: String, required: true },
  subcategory: { type: String },
  price: { type: Number, required: true },
  discount: { type: String },
  sizes: [{ type: String }],
  images: [{ type: String }],
  stock : { type: Number, default: 10 },
  purchaseCount: { type: Number, default: 0 },

});

productSchema.index({ stock: 1, purchaseCount: -1 });
productSchema.index({ subcategory: 1, stock: 1 });

module.exports = mongoose.model("Product", productSchema);


