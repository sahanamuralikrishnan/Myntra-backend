const express = require("express");
const Bag = require("../models/Bag");
const router = express.Router();

// Add to bag (same product + same size is added only once)
router.post("/", async (req, res) => {
  try {
    const { userId, productId, size, quantity } = req.body;
    if (!userId || !productId || !size) {
      return res
        .status(400)
        .json({ message: "userId, productId and size are required" });
    }

    // Is this product in this size already in the user's bag?
    const existingItem = await Bag.findOne({ userId, productId, size });
    if (existingItem) {
      await existingItem.populate("productId");
      return res.status(200).json(existingItem);
    }

    const bagItem = new Bag({ userId, productId, size, quantity: quantity || 1 });
    const saveItem = await bagItem.save();
    await saveItem.populate("productId");
    res.status(200).json(saveItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});


// Get bag items
router.get("/:userId", async (req, res) => {
  try {
    const bag = await Bag.find({ userId: req.params.userId }).populate("productId");
    res.status(200).json(bag);
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
      { new: true }
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
