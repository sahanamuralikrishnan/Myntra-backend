const express = require("express");
const crypto = require("crypto");
const Order = require("../models/Order");
const PaymentEvent = require("../models/PaymentEvent");
const router = express.Router();

// Recompute the signature ourselves from the raw body and compare it to what was sent
function isValidSignature(req) {
  const signature = req.headers["x-webhook-signature"];
  if (!signature || !req.rawBody) return false;

  const expected = crypto
    .createHmac("sha256", process.env.PAYMENT_WEBHOOK_SECRET)
    .update(req.rawBody)
    .digest("hex");

  // timingSafeEqual instead of === so a mismatch can't be detected via how fast the comparison returns
  const sent = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sent.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(sent, expectedBuf);
}

// Payment gateway calls this to report a payment's outcome.
// Body: { eventId, type, orderId, status }  e.g. status: "success" | "failed"
router.post("/payment", async (req, res) => {
  try {
    if (!isValidSignature(req)) {
      return res.status(401).json({ message: "Invalid signature" });
    }

    const { eventId, type, orderId, status } = req.body;
    if (!eventId || !type) {
      return res.status(400).json({ message: "eventId and type are required" });
    }

    // Idempotency: the unique index on eventId rejects an event we've already recorded
    try {
      await PaymentEvent.create({ eventId, orderId, type, verified: true, rawPayload: req.body });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(200).json({ message: "Event already processed" });
      }
      throw error;
    }

    if (orderId && status) {
      const paymentStatus = status === "success" ? "paid" : "failed";
      await Order.findByIdAndUpdate(orderId, { paymentStatus });
    }

    res.status(200).json({ message: "Webhook processed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;
