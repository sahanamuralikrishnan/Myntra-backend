const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  brand: { type: String, required: true },
  subcategory: { type: String },
  price: { type: Number, required: true },
  discount: { type: String },
  sizes: [{ type: String }],
  images: [{ type: String }],// ✅ always plural, array of strings
  stock : { type: Number, default: 10 }
});

module.exports = mongoose.model("Product", productSchema);


