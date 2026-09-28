const jwt = require("jsonwebtoken");

// Create a login token for a user (valid for 30 days)
function createToken(userId) {
  return jwt.sign({ userId: String(userId) }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

// Only logged-in users: expects header "Authorization: Bearer <token>"
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Login required" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired login, please log in again" });
  }
}

// A user may only read or change their own data (:userId in the URL)
function requireSelf(req, res, next) {
  if (req.params.userId !== req.userId) {
    return res.status(403).json({ message: "You can only access your own data" });
  }
  next();
}

// Admin-only routes: expects header "x-admin-key: <ADMIN_KEY from .env>"
function requireAdmin(req, res, next) {
  if (!process.env.ADMIN_KEY || req.headers["x-admin-key"] !== process.env.ADMIN_KEY) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

module.exports = { createToken, requireAuth, requireSelf, requireAdmin };
