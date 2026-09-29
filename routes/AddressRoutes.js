const express = require("express");
const Address = require("../models/Address");
const router = express.Router();

// Create a new address
router.post("/", async (req, res) => {
  try {
    const { userId, label, fullName, phone, street, city, state, postalCode, country } = req.body;
    if (!userId || !fullName || !phone || !street || !city || !state || !postalCode || !country) {
      return res.status(400).json({ message: "All address fields are required" });
    }

    // The very first address a user saves becomes their default automatically
    const existingCount = await Address.countDocuments({ userId });

    const address = await Address.create({
      userId, label, fullName, phone, street, city, state, postalCode, country,
      isDefault: existingCount === 0,
    });
    res.status(200).json(address);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Get all addresses for a user
router.get("/:userId", async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.params.userId }).sort({
      isDefault: -1,
      createdAt: -1,
    });
    res.status(200).json(addresses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Update an address
router.put("/:addressId", async (req, res) => {
  try {
    const { label, fullName, phone, street, city, state, postalCode, country } = req.body;
    const address = await Address.findByIdAndUpdate(
      req.params.addressId,
      { label, fullName, phone, street, city, state, postalCode, country },
      { new: true },
    );
    if (!address) return res.status(404).json({ message: "Address not found" });
    res.status(200).json(address);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Delete an address
router.delete("/:addressId", async (req, res) => {
  try {
    await Address.findByIdAndDelete(req.params.addressId);
    res.status(200).json({ message: "Address removed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error removing address" });
  }
});

// Set one address as the default (unsets every other one for that user)
router.post("/:addressId/set-default", async (req, res) => {
  try {
    const address = await Address.findById(req.params.addressId);
    if (!address) return res.status(404).json({ message: "Address not found" });

    await Address.updateMany({ userId: address.userId }, { isDefault: false });
    address.isDefault = true;
    await address.save();

    res.status(200).json(address);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;
