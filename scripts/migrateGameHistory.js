const db = require("../config/db");

async function migrateGameHistory() {
  try {
    console.log("Checking game_history table schema...");
    const [cols] = await db.query("DESCRIBE game_history");
    const existingCols = new Set(cols.map(c => c.Field));

    if (!existingCols.has("username")) {
      await db.query("ALTER TABLE game_history ADD COLUMN username VARCHAR(50) AFTER user_id");
      console.log("Added column: username");
    }

    if (!existingCols.has("distance_meters")) {
      await db.query("ALTER TABLE game_history ADD COLUMN distance_meters INT DEFAULT 0 AFTER final_score");
      console.log("Added column: distance_meters");
    }

    if (!existingCols.has("bananas_collected")) {
      await db.query("ALTER TABLE game_history ADD COLUMN bananas_collected INT DEFAULT 0 AFTER distance_meters");
      console.log("Added column: bananas_collected");
    }

    if (!existingCols.has("questions_attempted")) {
      await db.query("ALTER TABLE game_history ADD COLUMN questions_attempted INT DEFAULT 0 AFTER bananas_collected");
      console.log("Added column: questions_attempted");
    }

    if (!existingCols.has("correct_answers")) {
      await db.query("ALTER TABLE game_history ADD COLUMN correct_answers INT DEFAULT 0 AFTER questions_attempted");
      console.log("Added column: correct_answers");
    }

    if (!existingCols.has("wrong_answers")) {
      await db.query("ALTER TABLE game_history ADD COLUMN wrong_answers INT DEFAULT 0 AFTER correct_answers");
      console.log("Added column: wrong_answers");
    }

    if (!existingCols.has("accuracy_percentage")) {
      await db.query("ALTER TABLE game_history ADD COLUMN accuracy_percentage INT DEFAULT 0 AFTER wrong_answers");
      console.log("Added column: accuracy_percentage");
    }

    // Modify game_status column to accept 'Completed', 'Game Over', 'Abandoned'
    await db.query("ALTER TABLE game_history MODIFY COLUMN game_status VARCHAR(30) NOT NULL DEFAULT 'Game Over'");
    console.log("Updated column type: game_status to VARCHAR(30)");

    if (!existingCols.has("start_time")) {
      await db.query("ALTER TABLE game_history ADD COLUMN start_time DATETIME NULL AFTER game_status");
      console.log("Added column: start_time");
    }

    if (!existingCols.has("end_time")) {
      await db.query("ALTER TABLE game_history ADD COLUMN end_time DATETIME NULL AFTER start_time");
      console.log("Added column: end_time");
    }

    // Backfill username for existing rows
    await db.query(`
      UPDATE game_history gh
      JOIN users u ON gh.user_id = u.user_id
      SET gh.username = u.username
      WHERE gh.username IS NULL OR gh.username = ''
    `);
    console.log("Backfilled usernames for existing game_history records.");

    // Backfill accuracy and correct answers for existing rows if needed
    await db.query(`
      UPDATE game_history
      SET questions_attempted = questions_answered,
          correct_answers = questions_answered,
          accuracy_percentage = CASE WHEN questions_answered > 0 THEN 100 ELSE 0 END
      WHERE questions_attempted = 0 AND questions_answered > 0
    `);

    // Backfill existing runner_runs into game_history if not already present
    const [runnerRuns] = await db.query(`
      SELECT r.*, u.username
      FROM runner_runs r
      LEFT JOIN users u ON r.user_id = u.user_id
    `);

    for (const run of runnerRuns) {
      // Check if this run is already in game_history by user_id and played_at/created_at
      const [existing] = await db.query(
        "SELECT game_id FROM game_history WHERE user_id = ? AND distance_meters = ? AND final_score = ?",
        [run.user_id, run.distance_meters, run.final_score]
      );

      if (existing.length === 0) {
        const attempted = run.crates_encountered || 0;
        const correct = run.crates_solved || 0;
        const wrong = Math.max(0, attempted - correct);
        const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
        const status = correct >= 10 ? "Completed" : "Game Over";
        const playedAt = run.created_at || new Date();
        const durationSec = run.run_duration_seconds || 15;
        const startTime = new Date(new Date(playedAt).getTime() - durationSec * 1000);

        await db.query(
          `INSERT INTO game_history (
            user_id, username, difficulty, final_score, distance_meters, bananas_collected,
            questions_attempted, correct_answers, wrong_answers, accuracy_percentage,
            game_status, start_time, end_time, played_at
          ) VALUES (?, ?, 'easy', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            run.user_id,
            run.username || "player",
            run.final_score,
            run.distance_meters,
            run.bananas_collected,
            attempted,
            correct,
            wrong,
            accuracy,
            status,
            startTime,
            playedAt,
            playedAt
          ]
        );
      }
    }
    console.log(`Synced existing runner runs into game_history.`);

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

migrateGameHistory();
