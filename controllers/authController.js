const db = require("../config/db");
const bcrypt = require("bcrypt");

// Email format validation helper
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ==========================================
// User Registration Controller
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

// Controller: User Login (Placeholder for Login task)
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Username and password are required." });
    }

    return res.status(501).json({
      message: "Login endpoint ready. Full authentication implementation pending.",
      received: { username }
    });
  } catch (error) {
    console.error("Auth login error:", error);
    return res.status(500).json({ success: false, error: "Server error during login." });
  }
};

// Controller: User Logout
exports.logout = (req, res) => {
  return res.json({ success: true, message: "Logged out successfully." });
};

// Controller: Get Authenticated User Profile
exports.getProfile = async (req, res) => {
  return res.status(501).json({
    message: "Profile endpoint ready. Full authentication implementation pending."
  });
};
