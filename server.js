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
const Orderroutes = require("./routes/OrderRoutes");
const AddressRoutes = require("./routes/AddressRoutes");
const PaymentMethodRoutes = require("./routes/PaymentMethodRoutes");
const PushTokenRoutes = require("./routes/PushTokenRoutes");
const NotificationRoutes = require("./routes/NotificationRoutes");
const WebhookRoutes = require("./routes/WebhookRoutes");
const RecommendationRoutes = require("./routes/RecommendationRoutes");
const { startScheduler } = require("./services/scheduler");


dotenv.config();
const app = express();
// Keep the raw request body around (on req.rawBody) so webhook signatures
// can be verified against the exact bytes the sender signed
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
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
app.use("/order", Orderroutes);
app.use("/address", AddressRoutes);
app.use("/payment-methods", PaymentMethodRoutes);
app.use("/push-token", PushTokenRoutes);
app.use("/notifications", NotificationRoutes);
app.use("/webhooks", WebhookRoutes);
app.use("/recommendations", RecommendationRoutes);



mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    // Start scheduled jobs (abandoned cart reminders, delivery receipts)
    startScheduler();
  })
  .catch((err) => console.log(err));


    const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`Server is running on port ${PORT}`));
