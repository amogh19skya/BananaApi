const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

// Authentication Endpoints
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);

// Current user profile
router.get("/me", authMiddleware, authController.getMe);
router.get("/profile", authMiddleware, authController.getMe);

module.exports = router;
