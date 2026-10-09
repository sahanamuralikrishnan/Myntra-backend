const { Expo } = require("expo-server-sdk");
const PushToken = require("../models/PushToken");
const NotificationLog = require("../models/NotificationLog");
const User = require("../models/User");
const { getWebPush, parseWebSubscription } = require("./webPush");

const expo = new Expo();

// Send one notification to one browser subscription and log the result
async function sendWebPushNotification(userId, token, subscription, category, title, body, data) {
  const log = { userId, token, category, title, body, data, status: "sent" };
  const webpush = getWebPush();

  if (!webpush) {
    log.status = "failed";
    log.errorMessage = "VAPID keys missing in .env";
  } else {
    try {
      await webpush.sendNotification(subscription, JSON.stringify({ title, body, data }));
    } catch (error) {
      console.error("Error sending browser notification:", error.statusCode, error.body || error.message);
      log.status = "failed";
      log.errorMessage = error.body || error.message;
      // 404/410 = the user turned notifications off or cleared the browser
      if (error.statusCode === 404 || error.statusCode === 410) {
        await PushToken.deleteOne({ token });
      }
    }
  }

  await NotificationLog.create(log);
  return log;
}

// Send one notification to one device token and log the result
async function sendPushNotification(userId, token, category, title, body, data = {}) {
  // Browser subscriptions go through web-push; phone tokens go through Expo below
  const subscription = parseWebSubscription(token);
  if (subscription) {
    return sendWebPushNotification(userId, token, subscription, category, title, body, data);
  }

  if (!Expo.isExpoPushToken(token)) {
    console.error(`Invalid Expo push token: ${token}`);
    await PushToken.deleteOne({ token }); // ✅ exercise: remove the bad token
    await NotificationLog.create({
      userId,
      token,
      category,
      title,
      body,
      data,
      status: "failed",
      errorMessage: "Invalid Expo push token",
    });
    return null;
  }

  const message = {
    to: token,
    sound: "default",
    title,
    body,
    data,
  };

  try {
    const [ticket] = await expo.sendPushNotificationsAsync([message]);

    const log = {
      userId,
      token,
      category,
      title,
      body,
      data,
      ticketId: ticket.id,
      status: "sent",
    };

    if (ticket.status === "error") {
      console.error("Push ticket error:", ticket.details?.error, ticket.message);
      log.status = "failed";
      log.errorMessage = ticket.message;

      if (ticket.details?.error === "DeviceNotRegistered") {
        await PushToken.deleteOne({ token });
      }
    }

    await NotificationLog.create(log);
    return ticket;
  } catch (error) {
    console.error("Error sending push notification:", error);
    await NotificationLog.create({
      userId,
      token,
      category,
      title,
      body,
      data,
      status: "failed",
      errorMessage: error.message,
    });
    return null;
  }
} // ← sendPushNotification ends here

// Send a notification to every device of a user, if they allow this category
async function sendToUser(userId, category, title, body, data = {}) {
  const user = await User.findById(userId);
  if (!user) return [];

  // Respect the user's choice
  if (user.notificationPreferences?.[category] === false) {
    console.log(`User ${userId} disabled "${category}" notifications`);
    return [];
  }

  const tokens = await PushToken.find({ userId });
  if (tokens.length === 0) return [];

  return Promise.all(
    tokens.map((t) =>
      sendPushNotification(userId, t.token, category, title, body, { ...data, category })
    )
  );
} // ← sendToUser ends here

module.exports = { sendPushNotification, sendToUser };
