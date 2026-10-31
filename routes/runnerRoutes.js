// ================================================================
// Banana Surfers – Runner API Routes
// ================================================================
const express = require("express");
const router = express.Router();
const { getCratePuzzle, verifyCrate, endRun } = require("../controllers/runnerController");

// GET  /api/runner/crate-puzzle  — Pre-fetch a puzzle image (strips solution)
router.get("/crate-puzzle", getCratePuzzle);

// POST /api/runner/verify-crate  — Verify player's answer
router.post("/verify-crate", verifyCrate);

// POST /api/runner/end-run       — Save run stats (auth optional)
router.post("/end-run", endRun);

module.exports = router;

