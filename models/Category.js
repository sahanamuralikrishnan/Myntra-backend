const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
   name: String,
   subCategory: [String],
   images: String,
    productid: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    
  },
  { timestamps: true },
);

module.exports = mongoose.model("Category", CategorySchema);