const { Expo } = require("expo-server-sdk");
const Bag = require("../models/Bag");
const NotificationLog = require("../models/NotificationLog");
const PushToken = require("../models/PushToken");
const { sendToUser } = require("./notificationService");

const expo = new Expo();

// Read settings when needed (server.js loads .env after requiring this file)
const cartReminderMinutes = () => Number(process.env.ABANDONED_CART_MINUTES) || 24 * 60;
const jobIntervalMinutes = () => Number(process.env.JOB_INTERVAL_MINUTES) || 5;

// Remind users about bag items they added a while ago but never ordered (once per item)
async function sendAbandonedCartReminders() {
  const cutoff = new Date(Date.now() - cartReminderMinutes() * 60 * 1000);
  const items = await Bag.find({
    createdAt: { $lte: cutoff },
    reminderSentAt: null,
    userId: { $ne: null },
  }).populate("productId");

  // Group the items by user, so each user gets one reminder
  const byUser = new Map();
  for (const item of items) {
    const key = String(item.userId);
    if (!byUser.has(key)) byUser.set(key, []);
    byUser.get(key).push(item);
  }

  for (const [userId, userItems] of byUser) {
    const first = userItems.find((i) => i.productId)?.productId;
    const others = userItems.length - 1;
    const body = first
      ? `${first.brand} ${first.name}${others > 0 ? ` and ${others} more item(s) are` : " is"} waiting in your bag.`
      : `You have ${userItems.length} item(s) waiting in your bag.`;

    await sendToUser(userId, "abandoned_cart", "You left something behind 👜", body, {
      screen: "bag",
    });

    // Mark as reminded so we never send the same reminder twice
    await Bag.updateMany(
      { _id: { $in: userItems.map((i) => i._id) } },
      { reminderSentAt: new Date() }
    );
  }
  return byUser.size;
}

// Ask Expo whether "sent" notifications were delivered, and update the logs
async function checkDeliveryReceipts() {
  // Expo keeps receipts for 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const logs = await NotificationLog.find({
    status: "sent",
    ticketId: { $exists: true, $ne: null },
    createdAt: { $gte: since },
  }).limit(1000);
  if (logs.length === 0) return 0;

  const logByTicket = new Map(logs.map((l) => [l.ticketId, l]));
  let updated = 0;

  for (const chunk of expo.chunkPushNotificationReceiptIds([...logByTicket.keys()])) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      for (const [ticketId, receipt] of Object.entries(receipts)) {
        const log = logByTicket.get(ticketId);
        if (!log) continue;

        if (receipt.status === "ok") {
          log.status = "delivered";
        } else {
          log.status = "failed";
          log.errorMessage = receipt.message;
          // The app was uninstalled or the token expired: remove it
          if (receipt.details?.error === "DeviceNotRegistered") {
            await PushToken.deleteOne({ token: log.token });
          }
        }
        await log.save();
        updated++;
      }
    } catch (error) {
      console.error("Receipt check failed:", error.message);
    }
  }
  return updated;
}

let running = false;

// Run every scheduled job once
async function runJobs() {
  if (running) return { skipped: true };
  running = true;
  try {
    const remindedUsers = await sendAbandonedCartReminders();
    const receiptsChecked = await checkDeliveryReceipts();
    if (remindedUsers || receiptsChecked) {
      console.log(`[jobs] cart reminders: ${remindedUsers}, receipts updated: ${receiptsChecked}`);
    }
    return { remindedUsers, receiptsChecked };
  } catch (error) {
    console.error("[jobs] failed:", error);
    return { error: error.message };
  } finally {
    running = false;
  }
}

function startScheduler() {
  console.log(
    `[jobs] running every ${jobIntervalMinutes()} min (cart reminder after ${cartReminderMinutes()} min)`
  );
  setTimeout(runJobs, 10 * 1000);
  setInterval(runJobs, jobIntervalMinutes() * 60 * 1000);
}

module.exports = { startScheduler, runJobs, sendAbandonedCartReminders, checkDeliveryReceipts };
