// Middleware: Authentication check (Placeholder for protected dashboard/score routes)
module.exports = function authMiddleware(req, res, next) {
  // Pass through until complete auth mechanism (JWT/Session) is configured
  next();
};

