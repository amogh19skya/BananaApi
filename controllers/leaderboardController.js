const db = require("../config/db");

// Controller: Get top leaderboard rankings (Theme 2 – Interoperability with DB)
exports.getLeaderboard = async (req, res) => {
  try {
    const rawDifficulty = (req.query.difficulty || "all").trim();
    const validDifficulties = ["easy", "hard", "extraHard"];
    const filterDifficulty = validDifficulties.includes(rawDifficulty) ? rawDifficulty : "all";

    let sqlQuery = `
      SELECT
        u.username,
        s.difficulty,
        s.score,
        s.correct_answers,
        s.total_questions,
        ROUND((s.correct_answers / s.total_questions) * 100) AS accuracy,
        s.played_at
      FROM scores s
      JOIN users u ON s.user_id = u.user_id
    `;
    const queryParams = [];

    if (filterDifficulty !== "all") {
      sqlQuery += " WHERE s.difficulty = ?";
      queryParams.push(filterDifficulty);
    }

    sqlQuery += " ORDER BY s.score DESC, s.played_at ASC LIMIT 30";

    const [rankings] = await db.query(sqlQuery, queryParams);

    return res.json({
      success: true,
      difficulty: filterDifficulty,
      rankings: rankings.map((r) => ({
        username: r.username,
        difficulty: r.difficulty,
        score: Number(r.score),
        correctAnswers: Number(r.correct_answers),
        totalQuestions: Number(r.total_questions),
        accuracy: Number(r.accuracy) || 0,
        playedAt: r.played_at
      }))
    });
  } catch (error) {
    console.error("Leaderboard query error:", error);
    return res.status(500).json({ success: false, error: "Server error while fetching leaderboard." });
  }
};
