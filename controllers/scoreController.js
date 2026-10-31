const db = require("../config/db");

// Controller: Submit a game score (Theme 4 – Virtual Identity persistence)
exports.submitScore = async (req, res) => {
  try {
    const userId = req.session.user.id || req.session.user.userId;
    const { difficulty, score, correctAnswers, totalQuestions, gameStatus } = req.body || {};

    // Validate difficulty
    const validDifficulties = ["easy", "hard", "extraHard"];
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({ success: false, error: "Invalid difficulty mode." });
    }

    const parsedScore = Math.max(0, parseInt(score, 10) || 0);
    const parsedCorrect = Math.max(0, Math.min(10, parseInt(correctAnswers, 10) || 0));
    const parsedTotal = parseInt(totalQuestions, 10) || 10;
    const status = gameStatus === "completed" ? "completed" : "timeout";

    // Insert into scores table
    const [scoreResult] = await db.query(
      `INSERT INTO scores (user_id, difficulty, score, correct_answers, total_questions, played_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [userId, difficulty, parsedScore, parsedCorrect, parsedTotal]
    );

    // Insert into game_history table
    await db.query(
      `INSERT INTO game_history (user_id, difficulty, final_score, questions_answered, game_status, played_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [userId, difficulty, parsedScore, parsedCorrect, status]
    );

    return res.status(201).json({
      success: true,
      message: "Score recorded successfully.",
      scoreId: scoreResult.insertId
    });
  } catch (error) {
    console.error("Score submit error:", error);
    return res.status(500).json({ success: false, error: "Server error while saving score." });
  }
};

// Controller: Get score history for a user (Theme 4 – Virtual Identity)
exports.getUserScores = async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);

    if (!targetUserId) {
      return res.status(400).json({ success: false, error: "Invalid user ID." });
    }

    // Recent scores
    const [scores] = await db.query(
      `SELECT score_id, difficulty, score, correct_answers, total_questions, played_at
       FROM scores WHERE user_id = ? ORDER BY played_at DESC LIMIT 20`,
      [targetUserId]
    );

    // Aggregate stats
    const [statsRows] = await db.query(
      `SELECT
         COUNT(*) AS total_games,
         COALESCE(MAX(score), 0) AS best_score,
         COALESCE(ROUND(AVG((correct_answers / total_questions) * 100)), 0) AS average_accuracy
       FROM scores WHERE user_id = ?`,
      [targetUserId]
    );

    const stats = statsRows[0] || { total_games: 0, best_score: 0, average_accuracy: 0 };

    return res.json({
      success: true,
      userId: targetUserId,
      stats: {
        totalGames: Number(stats.total_games),
        bestScore: Number(stats.best_score),
        accuracy: Number(stats.average_accuracy)
      },
      scores
    });
  } catch (error) {
    console.error("Get user scores error:", error);
    return res.status(500).json({ success: false, error: "Server error while retrieving scores." });
  }
};
