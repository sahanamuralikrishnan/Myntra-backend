const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create a Razorpay order for the given amount (in rupees) so the checkout
// screen has something to open. Nothing gets charged at this point.
router.post("/razorpay/create-order", async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "A valid amount is required" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay expects the amount in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    res.status(200).json({
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Razorpay create-order error:", error);
    res.status(500).json({ message: "Could not create payment order" });
  }
});

// Verify the signature Razorpay's checkout sends back once the user pays.
// This proves the result actually came from Razorpay and wasn't spoofed by
// the app (a malicious client could otherwise just claim "payment succeeded").
router.post("/razorpay/verify", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment verification fields" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const sent = Buffer.from(razorpay_signature);
    const expected = Buffer.from(expectedSignature);
    const verified =
      sent.length === expected.length && crypto.timingSafeEqual(sent, expected);

    res.status(200).json({ verified, razorpay_payment_id });
  } catch (error) {
    console.error("Razorpay verify error:", error);
    res.status(500).json({ message: "Could not verify payment" });
  }
});

module.exports = router;
