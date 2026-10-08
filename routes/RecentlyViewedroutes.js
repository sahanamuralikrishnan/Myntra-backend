const express = require("express");
const RecentlyViewed = require("../models/RecentlyViewed");
const router = express.Router();

const MAX_RECENTLY_VIEWED = 50;

// ✅ Record a product view (creates it, or bumps an existing one to the top)
router.post("/", async (req, res) => {
  try {
    const { userId, productId } = req.body;
    if (!userId || !productId) {
      return res.status(400).json({ message: "userId and productId are required" });
    }
    const entry = await RecentlyViewed.findOneAndUpdate(
      { userId, productId },
      { viewedAt: new Date() },
      { upsert: true, returnDocument: "after" }
    );

    const cutoff = await RecentlyViewed.find({ userId })
      .sort({ viewedAt: -1 })
      .skip(MAX_RECENTLY_VIEWED)
      .limit(1)
      .select("viewedAt");

    if (cutoff.length > 0) {
      await RecentlyViewed.deleteMany({
        userId,
        viewedAt: { $lt: cutoff[0].viewedAt },
      });
    }

    await entry.populate("productId");
    res.status(200).json(entry);
  } catch (error) {
    console.error("Error saving recently viewed product:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// ✅ Get a user's recently viewed products, most recent first
router.get("/:userId", async (req, res) => {
  try {
    const recentlyViewed = await RecentlyViewed.find({ userId: req.params.userId })
      .sort({ viewedAt: -1 })
      .limit(MAX_RECENTLY_VIEWED)
      .populate("productId");
    res.status(200).json(recentlyViewed);
  } catch (error) {
    console.error("Error fetching recently viewed products:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;
