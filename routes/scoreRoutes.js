const express = require("express");
const router = express.Router();
const scoreController = require("../controllers/scoreController");
const authMiddleware = require("../middleware/authMiddleware");

// Score & Dashboard Endpoints
router.post("/", authMiddleware, scoreController.submitScore);
router.get("/dashboard-stats", authMiddleware, scoreController.getUserDashboard);
router.get("/user/:userId", authMiddleware, scoreController.getUserScores);

module.exports = router;
