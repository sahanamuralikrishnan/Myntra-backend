const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
   name: String,
   subcategories: [String],
   image: String,
    productid: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    
  },
  { timestamps: true },
);

module.exports = mongoose.model("Category", CategorySchema);