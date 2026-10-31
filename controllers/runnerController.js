// ================================================================
// Banana Surfers – Runner Controller
// Handles crate puzzle proxy (pre-fetch & verify), run persistence
// ================================================================
const BANANA_API = "http://marcconrad.com/uob/banana/api.php?out=json";

// In-memory puzzle store: by session AND by puzzleId
const puzzleStore = new Map();
const puzzleById = new Map();

/**
 * GET /api/runner/crate-puzzle
 * Pre-fetches a puzzle from the UoB Banana API, strips the solution,
 * stores it server-side, and returns only the image URL to the client.
 */
async function getCratePuzzle(req, res) {
  try {
    const response = await fetch(BANANA_API, {
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`Banana API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.question || data.solution === undefined) {
      throw new Error("Unexpected Banana API response");
    }

    // Generate a unique puzzle ID
    const puzzleId = Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    const solution = Number(data.solution);

    // Store in global puzzleById map
    puzzleById.set(puzzleId, { solution, createdAt: Date.now() });

    // Also store solution in session queue if session exists
    const sessionKey = req.session?.id || "anonymous";

    if (!puzzleStore.has(sessionKey)) {
      puzzleStore.set(sessionKey, []);
    }

    const queue = puzzleStore.get(sessionKey);
    queue.push({
      puzzleId,
      solution,
      createdAt: Date.now()
    });

    // Keep queue manageable (max 5 buffered puzzles)
    while (queue.length > 5) queue.shift();

    res.json({
      puzzleId,
      imageUrl: data.question
    });
  } catch (error) {
    console.error("Runner crate-puzzle error:", error.message);
    res.status(502).json({
      error: "Could not load a crate puzzle. Please try again."
    });
  }
}

/**
 * POST /api/runner/verify-crate
 * Verifies the player's answer against the stored solution.
 * Body: { guess: number, puzzleId?: string }
 */
function verifyCrate(req, res) {
  const guess = req.body?.guess;
  const puzzleId = req.body?.puzzleId;

  if (guess === undefined || guess === null) {
    return res.status(400).json({ error: "Provide a guess." });
  }

  let solution = null;

  // 1. Try finding by explicit puzzleId
  if (puzzleId && puzzleById.has(puzzleId)) {
    const entry = puzzleById.get(puzzleId);
    solution = entry.solution;
    puzzleById.delete(puzzleId);
  } else {
    // 2. Fall back to session queue
    const sessionKey = req.session?.id || "anonymous";
    const queue = puzzleStore.get(sessionKey);

    if (queue && queue.length > 0) {
      const puzzle = queue.shift();
      solution = puzzle.solution;
      if (puzzle.puzzleId) puzzleById.delete(puzzle.puzzleId);
    }
  }

  if (solution === null) {
    return res.status(400).json({ error: "No active puzzle to verify." });
  }

  const correct = Number(guess) === solution;

  res.json({
    correct,
    message: correct ? "Correct! Power-up activated!" : "Wrong answer!"
  });
}

/**
 * POST /api/runner/end-run
 * Saves the run stats to the database (if user is authenticated).
 * Body: { distance, bananas, cratesEncountered, cratesSolved, score, duration }
 */
async function endRun(req, res) {
  // Only save if user is authenticated
  if (!req.session?.user) {
    return res.json({ saved: false, message: "Not logged in. Run not saved." });
  }

  const userId = req.session.user.id || req.session.user.userId;
  const username = req.session.user.username || "Player";

  const distance = Math.max(0, parseInt(req.body.distance, 10) || 0);
  const bananas = Math.max(0, parseInt(req.body.bananas, 10) || 0);
  const cratesEncountered = Math.max(0, parseInt(req.body.cratesEncountered ?? req.body.questionsAttempted, 10) || 0);
  const cratesSolved = Math.max(0, parseInt(req.body.cratesSolved ?? req.body.correctAnswers, 10) || 0);
  const wrongAnswers = Math.max(0, cratesEncountered - cratesSolved);
  const accuracy = cratesEncountered > 0 ? Math.round((cratesSolved / cratesEncountered) * 100) : 0;
  const score = Math.max(0, parseInt(req.body.score, 10) || 0);
  const duration = Math.max(1, parseInt(req.body.duration, 10) || 1);

  const validDifficulties = ["easy", "hard", "extraHard"];
  const difficulty = validDifficulties.includes(req.body.difficulty) ? req.body.difficulty : "easy";

  // Completion status: 'Completed', 'Game Over', 'Abandoned'
  let gameStatus = "Game Over";
  if (req.body.gameStatus === "Completed" || cratesSolved >= 10) {
    gameStatus = "Completed";
  } else if (req.body.gameStatus === "Abandoned") {
    gameStatus = "Abandoned";
  }

  const endTime = req.body.endTime ? new Date(req.body.endTime) : new Date();
  const startTime = req.body.startTime ? new Date(req.body.startTime) : new Date(endTime.getTime() - duration * 1000);

  try {
    const db = require("../config/db");

    // 1. Insert complete game record into game_history
    const [historyResult] = await db.execute(
      `INSERT INTO game_history (
        user_id, username, difficulty, final_score, distance_meters, bananas_collected,
        questions_attempted, correct_answers, wrong_answers, accuracy_percentage,
        questions_answered, game_status, start_time, end_time, played_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        username,
        difficulty,
        score,
        distance,
        bananas,
        cratesEncountered,
        cratesSolved,
        wrongAnswers,
        accuracy,
        cratesSolved,
        gameStatus,
        startTime,
        endTime,
        endTime
      ]
    );

    // 2. Insert into scores table to support leaderboard rankings
    await db.execute(
      `INSERT INTO scores (user_id, difficulty, score, correct_answers, total_questions, played_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        difficulty,
        score,
        cratesSolved,
        Math.max(1, cratesEncountered),
        endTime
      ]
    );

    // 3. Insert into runner_runs for backwards compatibility
    await db.execute(
      `INSERT INTO runner_runs (user_id, distance_meters, bananas_collected, crates_encountered, crates_solved, final_score, run_duration_seconds, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        distance,
        bananas,
        cratesEncountered,
        cratesSolved,
        score,
        duration,
        endTime
      ]
    );

    return res.json({
      saved: true,
      message: "Run saved successfully!",
      gameId: historyResult.insertId
    });
  } catch (error) {
    console.error("End run save error:", error.message);
    return res.status(500).json({ saved: false, message: "Could not save run." });
  }
}

// Clean up stale puzzle entries periodically (every 5 minutes)
setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [key, queue] of puzzleStore) {
    const filtered = queue.filter(p => p.createdAt > cutoff);
    if (filtered.length === 0) {
      puzzleStore.delete(key);
    } else {
      puzzleStore.set(key, filtered);
    }
  }
}, 5 * 60 * 1000);

module.exports = { getCratePuzzle, verifyCrate, endRun };

