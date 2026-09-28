const { Expo } = require("expo-server-sdk");
const PushToken = require("../models/PushToken");
const NotificationLog = require("../models/NotificationLog");
const User = require("../models/User");

const expo = new Expo();

// Send one notification to one device token and log the result
async function sendPushNotification(userId, token, category, title, body, data = {}) {
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
