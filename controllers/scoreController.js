const db = require("../config/db");

// Controller: Submit a game score
exports.submitScore = async (req, res) => {
  try {
    const userId = req.session?.user ? (req.session.user.id || req.session.user.userId) : null;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Authentication required to submit scores." });
    }
    const username = req.session.user.username || "Player";

    const {
      difficulty = "easy",
      score = 0,
      correctAnswers = 0,
      totalQuestions = 10,
      gameStatus = "Completed",
      distance = 0,
      bananas = 0,
      startTime = null,
      endTime = null
    } = req.body || {};

    const validDifficulties = ["easy", "hard", "extraHard"];
    const validDiff = validDifficulties.includes(difficulty) ? difficulty : "easy";

    const parsedScore = Math.max(0, parseInt(score, 10) || 0);
    const parsedAttempted = Math.max(1, parseInt(totalQuestions, 10) || 10);
    const parsedCorrect = Math.max(0, Math.min(parsedAttempted, parseInt(correctAnswers, 10) || 0));
    const parsedWrong = Math.max(0, parsedAttempted - parsedCorrect);
    const parsedAccuracy = parsedAttempted > 0 ? Math.round((parsedCorrect / parsedAttempted) * 100) : 0;
    const parsedDistance = Math.max(0, parseInt(distance, 10) || 0);
    const parsedBananas = Math.max(0, parseInt(bananas, 10) || 0);

    let status = "Game Over";
    if (gameStatus === "completed" || gameStatus === "Completed" || parsedCorrect >= 10) {
      status = "Completed";
    } else if (gameStatus === "abandoned" || gameStatus === "Abandoned") {
      status = "Abandoned";
    }

    const endDt = endTime ? new Date(endTime) : new Date();
    const startDt = startTime ? new Date(startTime) : new Date(endDt.getTime() - 60000);

    // 1. Insert into scores table (for leaderboard rankings)
    const [scoreResult] = await db.query(
      `INSERT INTO scores (user_id, difficulty, score, correct_answers, total_questions, played_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, validDiff, parsedScore, parsedCorrect, parsedAttempted, endDt]
    );

    // 2. Insert into game_history table with complete stats
    const [historyResult] = await db.query(
      `INSERT INTO game_history (
        user_id, username, difficulty, final_score, distance_meters, bananas_collected,
        questions_attempted, correct_answers, wrong_answers, accuracy_percentage,
        questions_answered, game_status, start_time, end_time, played_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        username,
        validDiff,
        parsedScore,
        parsedDistance,
        parsedBananas,
        parsedAttempted,
        parsedCorrect,
        parsedWrong,
        parsedAccuracy,
        parsedCorrect,
        status,
        startDt,
        endDt,
        endDt
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Score recorded successfully.",
      scoreId: scoreResult.insertId,
      gameId: historyResult.insertId
    });
  } catch (error) {
    console.error("Score submit error:", error);
    return res.status(500).json({ success: false, error: "Server error while saving score." });
  }
};

// Controller: Get full dashboard stats and game history for authenticated user
exports.getUserDashboard = async (req, res) => {
  try {
    const userId = req.session?.user ? (req.session.user.id || req.session.user.userId) : null;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }

    const username = req.session.user.username;

    // Aggregate statistics across ALL games played by the user
    const [statsRows] = await db.query(
      `SELECT
         COUNT(*) AS total_games,
         COALESCE(MAX(final_score), 0) AS highest_score,
         COALESCE(SUM(bananas_collected), 0) AS total_bananas,
         COALESCE(SUM(distance_meters), 0) AS total_distance,
         COALESCE(ROUND(AVG(accuracy_percentage)), 0) AS average_accuracy
       FROM game_history
       WHERE user_id = ?`,
      [userId]
    );

    const stats = statsRows[0] || {
      total_games: 0,
      highest_score: 0,
      total_bananas: 0,
      total_distance: 0,
      average_accuracy: 0
    };

    // Full game history entries (most recent first)
    const [historyRows] = await db.query(
      `SELECT
         game_id,
         user_id,
         username,
         difficulty,
         final_score,
         distance_meters,
         bananas_collected,
         questions_attempted,
         correct_answers,
         wrong_answers,
         accuracy_percentage,
         game_status,
         start_time,
         end_time,
         played_at
       FROM game_history
       WHERE user_id = ?
       ORDER BY played_at DESC, game_id DESC
       LIMIT 100`,
      [userId]
    );

    return res.json({
      success: true,
      user: {
        userId,
        username
      },
      stats: {
        totalGames: Number(stats.total_games),
        highestScore: Number(stats.highest_score),
        totalBananas: Number(stats.total_bananas),
        totalDistance: Number(stats.total_distance),
        averageAccuracy: Number(stats.average_accuracy)
      },
      history: historyRows
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return res.status(500).json({ success: false, error: "Server error while retrieving stats." });
  }
};

// Controller: Get score history for a user by user_id parameter
exports.getUserScores = async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: "Invalid user ID." });
    }

    const [statsRows] = await db.query(
      `SELECT
         COUNT(*) AS total_games,
         COALESCE(MAX(final_score), 0) AS highest_score,
         COALESCE(SUM(bananas_collected), 0) AS total_bananas,
         COALESCE(SUM(distance_meters), 0) AS total_distance,
         COALESCE(ROUND(AVG(accuracy_percentage)), 0) AS average_accuracy
       FROM game_history
       WHERE user_id = ?`,
      [targetUserId]
    );

    const stats = statsRows[0] || {
      total_games: 0,
      highest_score: 0,
      total_bananas: 0,
      total_distance: 0,
      average_accuracy: 0
    };

    const [historyRows] = await db.query(
      `SELECT
         game_id,
         user_id,
         username,
         difficulty,
         final_score,
         distance_meters,
         bananas_collected,
         questions_attempted,
         correct_answers,
         wrong_answers,
         accuracy_percentage,
         game_status,
         start_time,
         end_time,
         played_at
       FROM game_history
       WHERE user_id = ?
       ORDER BY played_at DESC, game_id DESC
       LIMIT 100`,
      [targetUserId]
    );

    return res.json({
      success: true,
      userId: targetUserId,
      stats: {
        totalGames: Number(stats.total_games),
        highestScore: Number(stats.highest_score),
        bestScore: Number(stats.highest_score),
        totalBananas: Number(stats.total_bananas),
        totalDistance: Number(stats.total_distance),
        accuracy: Number(stats.average_accuracy),
        averageAccuracy: Number(stats.average_accuracy)
      },
      history: historyRows,
      scores: historyRows.map(h => ({
        score_id: h.game_id,
        difficulty: h.difficulty,
        score: h.final_score,
        correct_answers: h.correct_answers,
        total_questions: h.questions_attempted,
        played_at: h.played_at
      }))
    });
  } catch (error) {
    console.error("Get user scores error:", error);
    return res.status(500).json({ success: false, error: "Server error while retrieving scores." });
  }
};
