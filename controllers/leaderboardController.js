const db = require("../config/db");

// Controller: Get top leaderboard rankings
// Implements 1 best performance entry per player, global and mode-filtered rankings,
// tie-breaker rules (score DESC, accuracy DESC, latest played_at DESC, score_id DESC),
// and current user identification.
exports.getLeaderboard = async (req, res) => {
  try {
    const rawDifficulty = (req.query.difficulty || "all").trim();
    const validDifficulties = ["easy", "hard", "extraHard"];
    const filterDifficulty = validDifficulties.includes(rawDifficulty) ? rawDifficulty : "all";

    // Current logged-in user if authenticated
    const currentUserId = req.session?.user ? (req.session.user.id || req.session.user.userId) : null;
    const currentUsername = req.session?.user ? req.session.user.username : null;

    let sqlQuery = "";
    const queryParams = [];

    if (filterDifficulty === "all") {
      sqlQuery = `
        WITH RankedScores AS (
          SELECT
            s.score_id,
            s.user_id,
            u.username,
            s.difficulty,
            s.score,
            s.correct_answers,
            s.total_questions,
            ROUND((s.correct_answers / s.total_questions) * 100) AS accuracy,
            s.played_at,
            ROW_NUMBER() OVER (
              PARTITION BY s.user_id
              ORDER BY
                s.score DESC,
                (s.correct_answers / s.total_questions) DESC,
                s.played_at DESC,
                s.score_id DESC
            ) AS user_best_rank
          FROM scores s
          JOIN users u ON s.user_id = u.user_id
        )
        SELECT
          user_id,
          username,
          difficulty,
          score,
          correct_answers,
          total_questions,
          accuracy,
          played_at
        FROM RankedScores
        WHERE user_best_rank = 1
        ORDER BY
          score DESC,
          accuracy DESC,
          played_at DESC,
          score_id DESC
      `;
    } else {
      sqlQuery = `
        WITH RankedScores AS (
          SELECT
            s.score_id,
            s.user_id,
            u.username,
            s.difficulty,
            s.score,
            s.correct_answers,
            s.total_questions,
            ROUND((s.correct_answers / s.total_questions) * 100) AS accuracy,
            s.played_at,
            ROW_NUMBER() OVER (
              PARTITION BY s.user_id
              ORDER BY
                s.score DESC,
                (s.correct_answers / s.total_questions) DESC,
                s.played_at DESC,
                s.score_id DESC
            ) AS user_best_rank
          FROM scores s
          JOIN users u ON s.user_id = u.user_id
          WHERE s.difficulty = ?
        )
        SELECT
          user_id,
          username,
          difficulty,
          score,
          correct_answers,
          total_questions,
          accuracy,
          played_at
        FROM RankedScores
        WHERE user_best_rank = 1
        ORDER BY
          score DESC,
          accuracy DESC,
          played_at DESC,
          score_id DESC
      `;
      queryParams.push(filterDifficulty);
    }

    const [rows] = await db.query(sqlQuery, queryParams);

    // Map rows to rankings with actual 1-based ranks
    let currentUserEntry = null;
    const rankings = rows.map((r, index) => {
      const isCurrentUser = Boolean(
        (currentUserId && Number(r.user_id) === Number(currentUserId)) ||
        (currentUsername && r.username.toLowerCase() === currentUsername.toLowerCase())
      );

      const entry = {
        rank: index + 1,
        userId: Number(r.user_id),
        username: r.username,
        difficulty: r.difficulty,
        score: Number(r.score),
        correctAnswers: Number(r.correct_answers),
        totalQuestions: Number(r.total_questions),
        accuracy: Number(r.accuracy) || 0,
        playedAt: r.played_at,
        isCurrentUser
      };

      if (isCurrentUser) {
        currentUserEntry = entry;
      }

      return entry;
    });

    return res.json({
      success: true,
      difficulty: filterDifficulty,
      currentUserId: currentUserId ? Number(currentUserId) : null,
      currentUserRank: currentUserEntry ? currentUserEntry.rank : null,
      currentUserEntry,
      rankings
    });
  } catch (error) {
    console.error("Leaderboard query error:", error);
    return res.status(500).json({ success: false, error: "Server error while fetching leaderboard." });
  }
};
