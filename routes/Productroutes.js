const express = require("express");
const Product = require("../models/product");
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json(products);
    } catch (error) { 
        console.error(error);
        res.status(500).json({ message: "Something went wrong" });
    }
});
  router.get("/:id", async (req, res) => {
  const productId = req.params.id;
  try {
    const product = await Product.findById(productId); // fetch product from DB
    res.status(200).json(product); // return product as JSON
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" }); // error response
  }
});

module.exports = router;
