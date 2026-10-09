const webpush = require("web-push");

// Browser notifications are signed with VAPID keys (from .env) so browsers
// know they really come from this backend.
// Read the keys when first needed, after server.js has loaded .env
let configured = false;
function getWebPush() {
  if (!configured) {
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return null;
    webpush.setVapidDetails(
      VAPID_SUBJECT || "mailto:admin@example.com",
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    configured = true;
  }
  return webpush;
}

// A browser's "push token" is a JSON subscription: { endpoint, keys: { p256dh, auth } }.
// Returns the parsed subscription, or null if the token isn't one.
function parseWebSubscription(token) {
  try {
    const sub = JSON.parse(token);
    if (
      typeof sub?.endpoint === "string" &&
      sub.endpoint.startsWith("https://") &&
      sub.keys?.p256dh &&
      sub.keys?.auth
    ) {
      return sub;
    }
  } catch {
    // not JSON, so not a browser subscription
  }
  return null;
}

module.exports = { getWebPush, parseWebSubscription };
