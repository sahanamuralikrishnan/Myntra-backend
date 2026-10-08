const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { createToken } = require("../middleware/auth");
const router = express.Router();

router.post("/signup", async (req, res) => {
  const { fullname, password } = req.body;
  // Ignore spaces and capital letters (phone keyboards often add them)
  const email = String(req.body.email || "").trim().toLowerCase();

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ fullname, email, password: hashedPassword });
    await user.save();
    const { password: _, ...userData } = user.toObject();
    res.status(200).json({ user: userData, token: createToken(user._id) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.post("/login", async (req, res) => {
  const { password } = req.body;
  // Ignore spaces and capital letters (phone keyboards often add them)
  const email = String(req.body.email || "").trim().toLowerCase();

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`Login failed: no account for ${JSON.stringify(email)}`);
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }
    const { password: _, ...userData } = user.toObject();
    res.status(200).json({ user: userData, token: createToken(user._id) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});
// ✅ Update user's theme preference
router.put("/:id/theme", async (req, res) => {
  const { theme } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { theme },
      { returnDocument: "after" }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ theme: user.theme });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;
