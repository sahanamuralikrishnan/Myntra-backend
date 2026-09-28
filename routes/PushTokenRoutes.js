const express = require("express");
const { Expo } = require("expo-server-sdk");
const PushToken = require("../models/PushToken");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();

// Save (or update) this device's push token for the logged-in user
router.post("/register", requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!Expo.isExpoPushToken(token)) {
      return res.status(400).json({ message: "Invalid Expo push token" });
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
