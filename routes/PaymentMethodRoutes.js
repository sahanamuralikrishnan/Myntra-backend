const express = require("express");
const PaymentMethod = require("../models/PaymentMethod");
const router = express.Router();

// Save a new payment method.
// NOTE: this route only ever accepts cardBrand + last4 (never a full card
// number or CVV) — the app is responsible for deriving those from the card
// number on the device and never sending the full number over the network.
router.post("/", async (req, res) => {
  try {
    const { userId, cardBrand, last4, expiryMonth, expiryYear, cardholderName } = req.body;
    if (!userId || !cardBrand || !last4 || !expiryMonth || !expiryYear || !cardholderName) {
      return res.status(400).json({ message: "All payment method fields are required" });
    }

    const existingCount = await PaymentMethod.countDocuments({ userId });

    const paymentMethod = await PaymentMethod.create({
      userId, cardBrand, last4, expiryMonth, expiryYear, cardholderName,
      isDefault: existingCount === 0,
    });
    res.status(200).json(paymentMethod);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Get all saved payment methods for a user
router.get("/:userId", async (req, res) => {
  try {
    const methods = await PaymentMethod.find({ userId: req.params.userId }).sort({
      isDefault: -1,
      createdAt: -1,
    });
    res.status(200).json(methods);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Delete a payment method
router.delete("/:paymentMethodId", async (req, res) => {
  try {
    await PaymentMethod.findByIdAndDelete(req.params.paymentMethodId);
    res.status(200).json({ message: "Payment method removed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error removing payment method" });
  }
});

// Set one payment method as the default (unsets every other one for that user)
router.post("/:paymentMethodId/set-default", async (req, res) => {
  try {
    const method = await PaymentMethod.findById(req.params.paymentMethodId);
    if (!method) return res.status(404).json({ message: "Payment method not found" });

    await PaymentMethod.updateMany({ userId: method.userId }, { isDefault: false });
    method.isDefault = true;
    await method.save();

    res.status(200).json(method);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;
