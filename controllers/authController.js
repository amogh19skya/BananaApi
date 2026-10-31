const db = require("../config/db");
const bcrypt = require("bcrypt");

// Email format validation helper
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ==========================================
// 1. User Registration Controller
// ==========================================
exports.register = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body || {};

    // 1. Check for required fields
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "All fields are required (username, email, password, and confirm password)."
      });
    }

    const trimmedUsername = String(username).trim();
    const trimmedEmail = String(email).trim().toLowerCase();

    // 2. Validate username length and format
    if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
      return res.status(400).json({
        success: false,
        error: "Username must be between 3 and 50 characters."
      });
    }

    // 3. Validate email format
    if (!isValidEmail(trimmedEmail) || trimmedEmail.length > 100) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid email address."
      });
    }

    // 4. Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long."
      });
    }

    // 5. Validate that password and confirmPassword match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "Passwords do not match."
      });
    }

    // 6. Check if username or email already exists in the database
    const [existingUsers] = await db.query(
      "SELECT user_id, username, email FROM users WHERE username = ? OR email = ?",
      [trimmedUsername, trimmedEmail]
    );

    if (existingUsers && existingUsers.length > 0) {
      const match = existingUsers[0];
      if (match.username.toLowerCase() === trimmedUsername.toLowerCase()) {
        return res.status(409).json({
          success: false,
          error: "Username is already taken. Please choose another username."
        });
      }
      if (match.email.toLowerCase() === trimmedEmail.toLowerCase()) {
        return res.status(409).json({
          success: false,
          error: "Email is already registered. Please login or use a different email."
        });
      }
    }

    // 7. Securely hash the password with bcrypt (salt rounds: 10)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 8. Insert new user into database
    const [result] = await db.query(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
      [trimmedUsername, trimmedEmail, passwordHash]
    );

    return res.status(201).json({
      success: true,
      message: "Account registered successfully! Redirecting to login...",
      userId: result.insertId,
      username: trimmedUsername
    });
  } catch (error) {
    console.error("Auth register error:", error);

    // Handle race-condition duplicate key errors from MySQL
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        error: "Username or email is already registered."
      });
    }

    return res.status(500).json({
      success: false,
      error: "An unexpected server error occurred during registration. Please try again."
    });
  }
};

// ==========================================
// 2. User Login Controller
// ==========================================
exports.login = async (req, res) => {
  try {
    const { username, email, identifier, password } = req.body || {};
    const loginIdentifier = (username || email || identifier || "").trim();

    // 1. Validate required inputs
    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        error: "Username or email, and password are required."
      });
    }

    // 2. Find user in the database by username OR email
    const [users] = await db.query(
      "SELECT user_id, username, email, password_hash, created_at FROM users WHERE username = ? OR email = ?",
      [loginIdentifier, loginIdentifier.toLowerCase()]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        error: "Invalid username/email or password."
      });
    }

    const user = users[0];

    // 3. Verify submitted password against password_hash using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid username/email or password."
      });
    }

    // 4. Create and store user session
    req.session.user = {
      id: user.user_id,
      userId: user.user_id,
      username: user.username,
      email: user.email
    };

    // 5. Return success response (never expose password_hash)
    return res.json({
      success: true,
      message: `Welcome back, ${user.username}! Login successful.`,
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Auth login error:", error);
    return res.status(500).json({
      success: false,
      error: "An unexpected server error occurred during login. Please try again."
    });
  }
};

// ==========================================
// 3. User Logout Controller
// ==========================================
exports.logout = (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error on logout:", err);
        return res.status(500).json({
          success: false,
          error: "Could not log out. Please try again."
        });
      }
      res.clearCookie("banana_session");
      return res.json({
        success: true,
        message: "Logged out successfully."
      });
    });
  } else {
    return res.json({
      success: true,
      message: "No active session."
    });
  }
};

// ==========================================
// 4. Authenticated User Profile Controller (GET /api/auth/me)
// ==========================================
exports.getMe = async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      error: "Not authenticated. Please log in."
    });
  }

  try {
    const [rows] = await db.query(
      "SELECT user_id, username, email, created_at FROM users WHERE user_id = ?",
      [req.session.user.id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found."
      });
    }

    const user = rows[0];

    return res.json({
      success: true,
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while retrieving profile."
    });
  }
};

// Backward-compatible alias
exports.getProfile = exports.getMe;
