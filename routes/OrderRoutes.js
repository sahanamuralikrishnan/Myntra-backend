const express = require("express");
const PDFDocument = require("pdfkit");
const Bag = require("../models/Bag");
const Order = require("../models/Order");
const Product = require("../models/product");
const { sendToUser } = require("../services/notificationService");
const {
  requireAdmin,
  requireAuth,
  requireSelf,
} = require("../middleware/auth");
const router = express.Router();

// Build fake shipment tracking info for a new order
function generateRandomTracking() {
  const carriers = ["Delhivery", "Bluedart", "Ecom Express", "XpressBees"];
  const statusOptions = [
    "Shipped",
    "Out for Delivery",
    "Delivered",
    "In Transit",
  ];
  const locations = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Pune"];

  const randomCarrier = carriers[Math.floor(Math.random() * carriers.length)];
  const randomStatus =
    statusOptions[Math.floor(Math.random() * statusOptions.length)];
  const randomLocation =
    locations[Math.floor(Math.random() * locations.length)];

  return {
    number: "TRK" + Math.floor(Math.random() * 10000000),
    carrier: randomCarrier,
    estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    currentLocation: randomLocation,
    status: randomStatus,
    timeline: [
      { status: "Order placed", timestamp: new Date() },
      { status: randomStatus, timestamp: new Date() },
    ],
  };
}
async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const count = await Order.countDocuments({
    invoiceNumber: { $exists: true },
  });
  const nextNumber = String(count + 1).padStart(5, "0");
  return `INV-${year}-${nextNumber}`;
}

// Create an order from everything in the user's bag
router.post("/create/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const bag = await Bag.find({ userId }).populate("productId");
    const validItems = bag.filter(
      (item) => item.productId && !item.savedForLater
    );
    if (validItems.length === 0) {
      return res.status(400).json({ message: "No item in the bag" });
    }

    const orderItems = validItems.map((item) => ({
      productId: item.productId._id,
      size: item.size,
      price: item.productId.price,
      quantity: item.quantity || 1,
    }));

    const total = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const newOrder = new Order({
      userId,
      status: "Processing",
      items: orderItems,
      total,
      shippingAddress: req.body.shippingAddress,
      paymentMethod: req.body.paymentMethod,
      paymentStatus: req.body.paymentStatus || "pending",
      razorpayPaymentId: req.body.razorpayPaymentId,
      tracking: generateRandomTracking(),
    });

    await newOrder.save();

    await Product.bulkWrite(
      orderItems.map((item) => ({
        updateOne: {
          filter: { _id: item.productId },
          update: { $inc: { purchaseCount: item.quantity } },
        },
      }))
    );

    await Bag.deleteMany({ userId, savedForLater: { $ne: true } });

    // 🔔 Order confirmation
    sendToUser(
      userId,
      "order",
      "Order confirmed 🎉",
      `Your order of ${orderItems.length} item(s) worth ₹${total} has been placed.`,
      { orderId: String(newOrder._id), screen: "orders" },
    ).catch(console.error);

    // 🔔 Payment update
    const isCOD = (newOrder.paymentMethod || "").toLowerCase().includes("cod");
    sendToUser(
      userId,
      "payment",
      isCOD ? "Pay on delivery 💵" : "Payment received ✅",
      isCOD
        ? `Please keep ₹${total} ready when your order arrives.`
        : `We received your payment of ₹${total}.`,
      { orderId: String(newOrder._id), screen: "orders" },
    ).catch(console.error);

    res.status(200).json({ message: "Order placed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

const ALLOWED_SORT_FIELDS = ["createdAt", "total", "status"];

// Get a user's orders, paginated/sorted/filtered.
// Query params: page, limit, status, paymentMethod, dateFrom, dateTo, sortBy, order
router.get("/user/:userId", requireAuth, requireSelf, async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 10, 1);

    const filter = { userId: req.params.userId };

    // Whitelist against the schema's own enum so req.query can't smuggle in a Mongo operator
    const allowedStatuses = Order.schema.path("status").enumValues;
    if (
      typeof req.query.status === "string" &&
      allowedStatuses.includes(req.query.status)
    ) {
      filter.status = req.query.status;
    }

    if (typeof req.query.paymentMethod === "string") {
      filter.paymentMethod = req.query.paymentMethod;
    }

    if (
      typeof req.query.dateFrom === "string" ||
      typeof req.query.dateTo === "string"
    ) {
      filter.createdAt = {};
      if (typeof req.query.dateFrom === "string")
        filter.createdAt.$gte = new Date(req.query.dateFrom);
      if (typeof req.query.dateTo === "string")
        filter.createdAt.$lte = new Date(req.query.dateTo);
    }

    const sortBy = ALLOWED_SORT_FIELDS.includes(req.query.sortBy)
      ? req.query.sortBy
      : "createdAt";
    const sortDirection = req.query.order === "asc" ? 1 : -1;

    const [orders, totalCount] = await Promise.all([
      Order.find(filter)
        .sort({ [sortBy]: sortDirection })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("items.productId"),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      orders,
      page,
      totalPages: Math.max(Math.ceil(totalCount / limit), 1),
      totalCount,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

// Which notification to send for each status
const STATUS_NOTIFICATIONS = {
  Shipped: {
    category: "shipping",
    title: "Your order has shipped 🚚",
    body: (o) =>
      `It's on its way with ${o.tracking?.carrier || "our courier"}.`,
  },
  "In Transit": {
    category: "shipping",
    title: "Your order is in transit 📦",
    body: (o) => `Now at ${o.tracking?.currentLocation || "a nearby hub"}.`,
  },
  "Out for Delivery": {
    category: "delivery",
    title: "Out for delivery 🛵",
    body: () => "Your order will arrive today. Keep your phone handy!",
  },
  Delivered: {
    category: "delivery",
    title: "Delivered ✅",
    body: () => "Your order has been delivered. Enjoy your purchase!",
  },
};

// Update an order's status, e.g. { "status": "Shipped", "location": "Pune" }
router.put("/status/:orderId", requireAdmin, async (req, res) => {
  try {
    const { status, location } = req.body;
    const info = STATUS_NOTIFICATIONS[status];
    if (!info) {
      return res.status(400).json({
        message: "Invalid status",
        allowed: Object.keys(STATUS_NOTIFICATIONS),
      });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = status;
    if (order.tracking) {
      order.tracking.status = status;
      if (location) order.tracking.currentLocation = location;
      order.tracking.timeline.push({ status });
    }
    await order.save();

    // 🔔 Shipping / delivery update
    sendToUser(order.userId, info.category, info.title, info.body(order), {
      orderId: String(order._id),
      screen: "orders",
    }).catch(console.error);

    res.status(200).json({ message: "Order status updated", status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

const RETURN_WINDOW_DAYS = Number(process.env.RETURN_WINDOW_DAYS) || 7;

// Cancel an order before it ships (instant, no approval needed)
router.post("/:orderId/cancel", requireAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (String(order.userId) !== req.userId) {
      return res.status(403).json({ message: "This isn't your order" });
    }

    if (order.status !== "Processing") {
      return res.status(400).json({
        message: "Order has already shipped and can no longer be cancelled",
      });
    }

    if (order.cancellation) {
      return res
        .status(400)
        .json({ message: "Cancellation already requested for this order" });
    }

    order.cancellation = {
      reason: req.body.reason,
      status: "Approved",
      requestedAt: new Date(),
    };
    order.status = "Cancelled";
    await order.save();

    sendToUser(
      order.userId,
      "order",
      "Order cancelled",
      "Your order has been cancelled as requested.",
      { orderId: String(order._id), screen: "orders" },
    ).catch(console.error);

    res.status(200).json({ message: "Order cancelled", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Request a return for a delivered order, within the return window (needs approval later)
router.post("/:orderId/return", requireAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (String(order.userId) !== req.userId) {
      return res.status(403).json({ message: "This isn't your order" });
    }

    if (order.status !== "Delivered") {
      return res
        .status(400)
        .json({ message: "Only delivered orders can be returned" });
    }

    const deliveredEntry = [...(order.tracking?.timeline || [])]
      .reverse()
      .find((step) => step.status === "Delivered");
    const deliveredAt = deliveredEntry?.timestamp;
    if (!deliveredAt) {
      return res
        .status(400)
        .json({ message: "Could not determine delivery date for this order" });
    }

    const daysSinceDelivery =
      (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivery > RETURN_WINDOW_DAYS) {
      return res.status(400).json({
        message: `Return window has expired (${RETURN_WINDOW_DAYS} days from delivery)`,
      });
    }

    if (order.returnRequest) {
      return res
        .status(400)
        .json({ message: "Return already requested for this order" });
    }

    order.returnRequest = {
      reason: req.body.reason,
      status: "Requested",
      requestedAt: new Date(),
    };
    await order.save();

    res.status(200).json({ message: "Return requested", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Add every item from a past order back into the bag (re-checking availability first)
router.post("/:orderId/reorder", requireAuth, async (req, res) => {
  try {
    const oldOrder = await Order.findById(req.params.orderId).populate(
      "items.productId",
    );
    if (!oldOrder) return res.status(404).json({ message: "Order not found" });

    if (String(oldOrder.userId) !== req.userId) {
      return res.status(403).json({ message: "This isn't your order" });
    }

    const added = [];
    const alreadyInBag = [];
    const skipped = [];

    for (const item of oldOrder.items) {
      const product = item.productId; // populated Product doc, or null if it was deleted since
      if (!product) {
        skipped.push({ reason: "No longer available" });
        continue;
      }
      if (product.stock <= 0) {
        skipped.push({
          productId: product._id,
          name: product.name,
          reason: "Out of stock",
        });
        continue;
      }

      const existing = await Bag.findOne({
        userId: req.userId,
        productId: product._id,
        size: item.size,
      });
      if (existing) {
        alreadyInBag.push({
          productId: product._id,
          name: product.name,
          size: item.size,
        });
        continue;
      }
      await Bag.create({
        userId: req.userId,
        productId: product._id,
        size: item.size,
        quantity: item.quantity || 1,
      });
      added.push({
        productId: product._id,
        name: product.name,
        size: item.size,
      });
    }
    res
      .status(200)
      .json({ message: "Items added to bag", added, alreadyInBag, skipped });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.get("/:orderId/invoice", requireAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate(
      "items.productId",
    );
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (String(order.userId) !== req.userId) {
      return res.status(403).json({ message: "This isn't your order" });
    }

    if (!order.invoiceNumber) {
      order.invoiceNumber = await generateInvoiceNumber();
      await order.save();
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${order.invoiceNumber}.pdf`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.fontSize(20).text("Myntra", { align: "left" });
    doc.fontSize(10).text("Tax Invoice", { align: "left" });
    doc.moveDown();

    doc.fontSize(12).text(`Invoice Number: ${order.invoiceNumber}`);
    doc.text(`Order Date: ${new Date(order.date).toLocaleDateString()}`);
    doc.text(`Payment Method: ${order.paymentMethod}`);
    doc.text(`Payment Status: ${order.paymentStatus}`);
    doc.moveDown();

    if (order.shippingAddress) {
      const a = order.shippingAddress;
      doc.text("Shipping Address:");
      doc.text([a.street, a.city, a.state, a.postalCode, a.country].filter(Boolean).join(", "));
      doc.moveDown();
    }

    doc.fontSize(13).text("Items", { underline: true });
    doc.moveDown(0.5);
    order.items.forEach((item) => {
      const name = item.productId?.name || "Product";
      const brand = item.productId?.brand || "";
      doc.fontSize(11).text(`${brand} ${name} (Size: ${item.size || "-"}) x${item.quantity}  -  Rs.${item.price}`);
    });

    doc.moveDown();
    doc.fontSize(13).text(`Total: Rs.${order.total}`, { align: "right" });

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});
module.exports = router;
