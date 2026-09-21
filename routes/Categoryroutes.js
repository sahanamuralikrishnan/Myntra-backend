const express = require("express");
const category = require("../models/Category");
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const categories = await category.find().populate("productid");
        res.status(200).json(categories);
    } catch (error) { 
        console.error(error);
        res.status(500).json({ message: "Something went wrong" });
    }
});
  

module.exports = router;
