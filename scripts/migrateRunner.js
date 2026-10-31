const db = require("../config/db");

async function migrate() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS runner_runs (
        id INT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        distance_meters INT NOT NULL DEFAULT '0',
        bananas_collected INT NOT NULL DEFAULT '0',
        crates_encountered INT NOT NULL DEFAULT '0',
        crates_solved INT NOT NULL DEFAULT '0',
        powerups_used INT NOT NULL DEFAULT '0',
        highest_multiplier INT NOT NULL DEFAULT '1',
        final_score BIGINT NOT NULL DEFAULT '0',
        run_duration_seconds INT NOT NULL DEFAULT '0',
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_final_score (final_score DESC),
        CONSTRAINT runner_runs_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS runner_upgrades (
        id INT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL UNIQUE,
        magnet_level INT NOT NULL DEFAULT '1',
        jetpack_level INT NOT NULL DEFAULT '1',
        sneakers_level INT NOT NULL DEFAULT '1',
        multiplier_level INT NOT NULL DEFAULT '1',
        hoverboards_in_stock INT NOT NULL DEFAULT '3',
        total_bananas_banked BIGINT NOT NULL DEFAULT '0',
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT runner_upgrades_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log("✅ Runner database tables created/verified successfully.");
    process.exit(0);
  } catch (err) {
    console.warn("⚠️ Migration warning (DB offline or error):", err.message);
    process.exit(0);
  }
}

migrate();
