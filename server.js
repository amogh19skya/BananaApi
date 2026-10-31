require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");

// Database initialization
const db = require("./config/db");

// Middleware
const authMiddleware = require("./middleware/authMiddleware");

// Modular Route Handlers
const authRoutes = require("./routes/authRoutes");
const scoreRoutes = require("./routes/scoreRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const runnerRoutes = require("./routes/runnerRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// Secure Session-Based Authentication Configuration
app.use(
  session({
    name: "banana_session",
    secret: process.env.SESSION_SECRET || "banana_brain_quest_arcade_secret_session_key_2026",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

// Serve static frontend assets
app.use(express.static(path.join(__dirname, "public")));

// Register Modular API Routes
app.use("/api/auth", authRoutes);
app.use("/api/scores", scoreRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/runner", runnerRoutes);

// Convenient Page Navigation Routes
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "login.html"));
});
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "register.html"));
});
app.get("/dashboard", authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "dashboard.html"));
});
app.get("/leaderboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "leaderboard.html"));
});
app.get("/runner", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/quiz", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "quiz.html"));
});

// Official Banana API, documented by the provider.
const BANANA_API = "http://marcconrad.com/uob/banana/api.php?out=json";

let currentQuestion = null;

// Request a new puzzle from the external API.
app.get("/api/question", async (req, res) => {
  try {
    const response = await fetch(BANANA_API, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Banana API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.question || data.solution === undefined) {
      throw new Error("Unexpected Banana API response");
    }

    // Keep the answer on the server, not in the browser.
    currentQuestion = {
      imageUrl: data.question,
      solution: Number(data.solution),
    };

    res.json({ imageUrl: currentQuestion.imageUrl });
  } catch (error) {
    console.error("Banana API error:", error.message);
    res.status(502).json({
      error: "Could not load a puzzle. Please try again.",
    });
  }
});

// Check the player's answer on the server.
app.post("/api/answer", (req, res) => {
  if (!currentQuestion) {
    return res.status(400).json({
      error: "Load a puzzle before submitting an answer.",
    });
  }

  const guess = req.body?.guess;

  if (
    guess === undefined ||
    guess === null ||
    String(guess).trim() === "" ||
    !/^\d+$/.test(String(guess).trim())
  ) {
    return res.status(400).json({
      error: "Enter a valid number.",
    });
  }

  const correct = Number(guess) === currentQuestion.solution;

  res.json({
    correct,
    message: correct ? "Correct! Well done." : "Not quite. Try again!",
  });

  // A correct answer ends this question. The next request loads another.
  if (correct) {
    currentQuestion = null;
  }
});

app.listen(PORT, () => {
  console.log(`Banana Brain Quest running at http://localhost:${PORT}`);
});
