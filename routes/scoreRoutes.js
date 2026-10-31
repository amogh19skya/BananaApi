const express = require("express");
const router = express.Router();
const scoreController = require("../controllers/scoreController");
const authMiddleware = require("../middleware/authMiddleware");

// Score Endpoints
router.post("/", authMiddleware, scoreController.submitScore);
router.get("/user/:userId", authMiddleware, scoreController.getUserScores);

module.exports = router;

