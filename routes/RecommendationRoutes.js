const express = require("express");
const Product = require("../models/product");
const RecentlyViewed = require("../models/RecentlyViewed");
const Wishlist = require("../models/Wishlist");
const Order = require("../models/Order");
const router = express.Router();

const RECOMMENDATION_LIMIT = 20; // how many products to return
const CATEGORY_SIGNAL_LIMIT = 15; // how many recent views to look at for categories
const MAX_CATEGORIES = 3; // how many favorite categories to pull from
const PURCHASE_EXCLUDE_DAYS = 60; // don't recommend things bought this recently

// Count how often each subcategory appears, most frequent first
function rankCategories(subcategories) {
  const counts = {};
  for (const sub of subcategories) {
    if (!sub) continue;
    counts[sub] = (counts[sub] || 0) + 1;
  }
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
}

// Best-selling, in-stock products — used for new users and to fill out short lists
async function getTrendingProducts(limit, excludeIds) {
  return Product.find({
    stock: { $gt: 0 },
    _id: { $nin: [...excludeIds] },
  })
    .sort({ purchaseCount: -1 })
    .limit(limit);
}

router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const purchaseCutoff = new Date(
      Date.now() - PURCHASE_EXCLUDE_DAYS * 24 * 60 * 60 * 1000
    );

    // 1. Gather signals in parallel — independent queries, no reason to wait on each other
    const [recentViews, wishlistItems, recentOrders] = await Promise.all([
      RecentlyViewed.find({ userId })
        .sort({ viewedAt: -1 })
        .limit(CATEGORY_SIGNAL_LIMIT)
        .populate("productId", "subcategory"),
      Wishlist.find({ userId }).populate("productId", "subcategory"),
      Order.find({ userId, date: { $gte: purchaseCutoff } }).select(
        "items.productId"
      ),
    ]);

    // 2. Anything bought recently is off-limits
    const excludeIds = new Set();
    for (const order of recentOrders) {
      for (const item of order.items) {
        excludeIds.add(String(item.productId));
      }
    }

    // 3. Rank favorite categories from views + wishlist
    const subcategories = [
      ...recentViews.map((v) => v.productId?.subcategory),
      ...wishlistItems.map((w) => w.productId?.subcategory),
    ];
    const favoriteCategories = rankCategories(subcategories).slice(
      0,
      MAX_CATEGORIES
    );

    const picked = [];
    const pickedIds = new Set(excludeIds);

    // 4. Pull a share of the list from each favorite category
    if (favoriteCategories.length > 0) {
      const perCategoryLimit = Math.ceil(
        RECOMMENDATION_LIMIT / favoriteCategories.length
      );

      const categoryResults = await Promise.all(
        favoriteCategories.map((sub) =>
          Product.find({
            subcategory: sub,
            stock: { $gt: 0 },
            _id: { $nin: [...pickedIds] },
          })
            .sort({ purchaseCount: -1 })
            .limit(perCategoryLimit)
        )
      );

      for (const products of categoryResults) {
        for (const product of products) {
          const id = String(product._id);
          if (!pickedIds.has(id) && picked.length < RECOMMENDATION_LIMIT) {
            picked.push(product);
            pickedIds.add(id);
          }
        }
      }
    }

    // 5. New users (or a short list) get topped up with trending products
    if (picked.length < RECOMMENDATION_LIMIT) {
      const trending = await getTrendingProducts(
        RECOMMENDATION_LIMIT - picked.length,
        pickedIds
      );
      picked.push(...trending);
    }

    res.status(200).json(picked);
  } catch (error) {
    console.error("Error building recommendations:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;
