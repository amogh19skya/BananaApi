const express = require("express");
const router = express.Router();
const leaderboardController = require("../controllers/leaderboardController");

// Leaderboard Endpoints
router.get("/", leaderboardController.getLeaderboard);

module.exports = router;

