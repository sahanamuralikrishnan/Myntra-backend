const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const userouter = require("./routes/userroutes");
const cors = require("cors");
const categoryrouter = require("./routes/Categoryroutes");
const productrouter = require("./routes/Productroutes");
const Bagroutes = require("./routes/Bagroutes");
const Wishlistroutes = require("./routes/Wishlistroutes");
const RecentlyViewedroutes = require("./routes/RecentlyViewedroutes");



dotenv.config();

const app = express();
app.use(express.json());
// app.use("/user", require("./routes/userroutes"));
// ✅ enable CORS
app.use(cors({
  origin: "http://localhost:8081", // allow Expo web dev server
  credentials: true                // allow cookies/tokens if needed
}));

app.get("/", (req, res) => {
  res.send("Myntra backend is working");
});
app.use("/user", userouter);
app.use("/category", categoryrouter);
app.use("/product", productrouter);
app.use("/bag", Bagroutes);
app.use("/wishlist", Wishlistroutes);
app.use("/recently-viewed", RecentlyViewedroutes);




mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => console.log(err));


    const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`Server is running on port ${PORT}`));
