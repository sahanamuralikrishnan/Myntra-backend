const express = require("express");
const User = require("../models/User");
const NotificationLog = require("../models/NotificationLog");
const { sendToUser, sendPushNotification } = require("../services/notificationService");
const PushToken = require("../models/PushToken");
const { runJobs } = require("../services/scheduler");
const { requireAuth, requireSelf, requireAdmin } = require("../middleware/auth");
const router = express.Router();

const CATEGORIES = [
  "order", "payment", "shipping", "delivery",
  "price_drop", "back_in_stock", "promotion", "abandoned_cart",
];

// Get a user's notification preferences
router.get("/preferences/:userId", requireAuth, requireSelf, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user.notificationPreferences);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Update one or more preferences, e.g. { "promotion": false }
router.put("/preferences/:userId", requireAuth, requireSelf, async (req, res) => {
  try {
    const update = {};
    for (const key of CATEGORIES) {
      if (typeof req.body[key] === "boolean") {
        update[`notificationPreferences.${key}`] = req.body[key];
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: update },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user.notificationPreferences);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Get the latest 50 notifications sent to a user
router.get("/logs/:userId", requireAuth, requireSelf, async (req, res) => {
  try {
    const logs = await NotificationLog.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Send a test notification (admin only)
router.post("/test/:userId", requireAdmin, async (req, res) => {
  try {
    const results = await sendToUser(
      req.params.userId,
      "promotion",
      "Hello from Myntra 👋",
      "Your push notifications are working!"
    );
    res.status(200).json({ sentTo: results.length, results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Run the scheduled jobs right now instead of waiting (admin only)
router.post("/jobs/run", requireAdmin, async (req, res) => {
  const result = await runJobs();
  res.status(200).json(result);
});

// Send a promotional campaign to every user who allows promotions (admin only)
// e.g. { "title": "Big Fashion Sale 🛍️", "body": "Flat 50% off today only!" }
router.post("/promotions", requireAdmin, async (req, res) => {
  try {
    const { title, body, productId } = req.body;
    if (!title || !body) {
      return res.status(400).json({ message: "title and body are required" });
    }

    // Everyone who did NOT turn promotions off (includes old users with nothing saved)
    const users = await User.find({ "notificationPreferences.promotion": { $ne: false } }, "_id");
    const tokens = await PushToken.find({ userId: { $in: users.map((u) => u._id) } });

    // Tapping the notification can open a product, if one is given
    const data = productId
      ? { screen: "product", productId, category: "promotion" }
      : { category: "promotion" };

    const results = await Promise.all(
      tokens.map((t) => sendPushNotification(t.userId, t.token, "promotion", title, body, data))
    );
    const sent = results.filter((r) => r && r.status === "ok").length;

    res.status(200).json({ users: users.length, devices: tokens.length, sent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;
