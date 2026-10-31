// ==========================================
// Authentication Middleware
// ==========================================
module.exports = function authMiddleware(req, res, next) {
  // Check if session contains an authenticated user
  if (req.session && req.session.user && req.session.user.id) {
    return next();
  }

  // Handle API requests with JSON 401
  if (
    req.originalUrl.startsWith("/api/") ||
    req.xhr ||
    (req.headers.accept && req.headers.accept.includes("application/json"))
  ) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized. Please log in to continue."
    });
  }

  // Handle web page navigation by redirecting to login
  return res.redirect("/login");
};
