const express = require("express");
const Wishlist = require("../models/Wishlist");
const router = express.Router();

// ✅ Add to wishlist
router.post("/", async (req, res) => {
  try {
    const { userId, productId } = req.body;
    if (!userId || !productId) {
      return res.status(400).json({ message: "userId and productId are required" });
    }

    const existingItem = await Wishlist.findOne({ userId, productId });
    if (existingItem) {
      await existingItem.populate("productId");
      return res.status(200).json(existingItem);
    }

    const newItem = new Wishlist({ userId, productId });
    const saveItem = await newItem.save();
    await saveItem.populate("productId"); // ✅ matches schema
    res.status(200).json(saveItem);
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});


// ✅ Get wishlist for a user
router.get("/:userId", async (req, res) => {
  try {
    const wishlist = await Wishlist.find({ userId: req.params.userId })
      .populate("productId"); // ✅ matches schema
    res.status(200).json(wishlist);
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// ✅ Delete wishlist item
router.delete("/:itemid", async (req, res) => {
  try {
    await Wishlist.findByIdAndDelete(req.params.itemid);
    res.status(200).json({ message: "Item removed from wishlist successfully" });
  } catch (error) {
    console.error("Error removing wishlist item:", error);
    res.status(500).json({ message: "Error removing item from wishlist" });
  }
});

module.exports = router;
