const express = require("express");
const Bag = require("../models/Bag");
const router = express.Router();
const Product = require("../models/product");
// Add to bag (same product + same size is added only once).
// findOneAndUpdate + upsert does the "check, then create" as ONE atomic
// database operation, so two simultaneous requests (e.g. two devices)
// can never both slip through and create duplicate rows.
router.post("/", async (req, res) => {
  try {
    const { userId, productId, size, quantity } = req.body;
    if (!userId || !productId || !size) {
      return res
        .status(400)
        .json({ message: "userId, productId and size are required" });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    const bagItem = await Bag.findOneAndUpdate(
      { userId, productId, size, savedForLater: { $ne: true } },
      {
        $setOnInsert: {
          userId,
          productId,
          size,
          quantity: quantity || 1,
          priceAtAdd: product.price,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).populate("productId");
    res.status(200).json(bagItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});
// Get bag items
router.get("/:userId", async (req, res) => {
  try {
    const bag = await Bag.find({ userId: req.params.userId }).populate(
      "productId",
    );
    res.status(200).json(bag);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});
// Check that everything in the active cart is still valid before checkout:
// does the product still exist, is there enough stock, has the price changed.
router.get("/:userId/validate", async (req, res) => {
  try {
    const items = await Bag.find({
      userId: req.params.userId,
      savedForLater: { $ne: true },
    }).populate("productId");

    const unavailableItems = [];
    const priceChangedItems = [];
    let newTotal = 0;

    for (const item of items) {
      const product = item.productId;

      if (!product) {
        unavailableItems.push({ itemId: item._id, reason: "No longer available" });
        continue;
      }
      if (product.stock <= 0) {
        unavailableItems.push({
          itemId: item._id,
          name: product.name,
          reason: "Out of stock",
        });
        continue;
      }
      if (product.stock < item.quantity) {
        unavailableItems.push({
          itemId: item._id,
          name: product.name,
          reason: `Only ${product.stock} left in stock`,
          availableStock: product.stock,
        });
        continue;
      }
      if (item.priceAtAdd != null && product.price !== item.priceAtAdd) {
        priceChangedItems.push({
          itemId: item._id,
          name: product.name,
          oldPrice: item.priceAtAdd,
          newPrice: product.price,
        });
      }

      newTotal += product.price * item.quantity;
    }

    res.status(200).json({
      valid: unavailableItems.length === 0,
      unavailableItems,
      priceChangedItems,
      newTotal,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});
// Update quantity of a bag item
router.put("/:itemid", async (req, res) => {
  try {
    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      return res
        .status(400)
        .json({ message: "quantity must be a whole number from 1 to 10" });
    }
    const item = await Bag.findByIdAndUpdate(
      req.params.itemid,
      { quantity },
      { new: true },
    ).populate("productId");

    if (!item) {
      return res.status(404).json({ message: "Bag item not found" });
    }
    res.status(200).json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});
// Move an item from the cart into "Saved for Later"
router.post("/:itemid/save-for-later", async (req, res) => {
  try {
    const item = await Bag.findByIdAndUpdate(
      req.params.itemid,
      { savedForLater: true },
      { new: true },
    ).populate("productId");

    if (!item) {
      return res.status(404).json({ message: "Bag item not found" });
    }
    res.status(200).json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});
// Move an item from "Saved for Later" back into the cart
router.post("/:itemid/move-to-bag", async (req, res) => {
  try {
    const item = await Bag.findByIdAndUpdate(
      req.params.itemid,
      { savedForLater: false },
      { new: true },
    ).populate("productId");

    if (!item) {
      return res.status(404).json({ message: "Bag item not found" });
    }
    res.status(200).json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});
// Delete bag item
router.delete("/:itemid", async (req, res) => {
  try {
    await Bag.findByIdAndDelete(req.params.itemid);
    res.status(200).json({ message: "Item removed from bag successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error removing item from bag" });
  }
});
module.exports = router;
