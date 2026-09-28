const express = require("express");
const Product = require("../models/product");
const Wishlist = require("../models/Wishlist");
const { sendToUser } = require("../services/notificationService");
const { requireAdmin } = require("../middleware/auth");
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
// Notify everyone who has this product in their wishlist
async function notifyWishlisters(product, category, title, body) {
  const items = await Wishlist.find({ productId: product._id });
  const userIds = [...new Set(items.map((i) => String(i.userId)))];
  await Promise.all(
    userIds.map((uid) =>
      sendToUser(uid, category, title, body, {
        productId: String(product._id),
        screen: "product",
      })
    )
  );
}

// Update a product's price and/or stock (admin), e.g. { "price": 999, "stock": 5 }
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Remember the OLD values before changing anything
    const oldPrice = product.price;
    const oldStock = product.stock;

    const { price, stock } = req.body;
    if (typeof price === "number" && price > 0) product.price = price;
    if (typeof stock === "number" && stock >= 0) product.stock = stock;
    await product.save();

    // 🔔 Price drop
    if (product.price < oldPrice) {
      notifyWishlisters(
        product,
        "price_drop",
        "Price drop on your wishlist 💸",
        `${product.brand} ${product.name} is now ₹${product.price} (was ₹${oldPrice}).`
      ).catch(console.error);
    }

    // 🔔 Back in stock
    if (oldStock === 0 && product.stock > 0) {
      notifyWishlisters(
        product,
        "back_in_stock",
        "Back in stock 🛍️",
        `${product.brand} ${product.name} is available again. Grab it before it's gone!`
      ).catch(console.error);
    }

    res.status(200).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;
