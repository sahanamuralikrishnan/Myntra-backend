const express = require("express");
const { Expo } = require("expo-server-sdk");
const PushToken = require("../models/PushToken");
const { requireAuth } = require("../middleware/auth");
const { parseWebSubscription } = require("../services/webPush");
const router = express.Router();

// The browser needs this public key to subscribe to notifications (it's safe to share)
router.get("/vapid-public-key", (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

// Save (or update) this device's push token for the logged-in user.
// Phones send an Expo push token; browsers send a JSON subscription.
router.post("/register", requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    if (typeof token !== "string" || (!Expo.isExpoPushToken(token) && !parseWebSubscription(token))) {
      return res.status(400).json({ message: "Invalid push token" });
    }

    // userId comes from the login token, not the request body, so nobody
    // can register their phone to receive another user's notifications
    await PushToken.findOneAndUpdate(
      { token },
      { userId: req.userId, token },
      { upsert: true }
    );
    res.status(200).json({ message: "Token registered" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Remove this device's token (call this on logout)
router.post("/unregister", requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    // Only remove the token if it belongs to the logged-in user
    await PushToken.deleteOne({ token, userId: req.userId });
    res.status(200).json({ message: "Token removed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;
