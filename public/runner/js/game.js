// ================================================================
// Banana Surfers – Main Game Loop
// Direct 1-scene continuous runner flow with dynamic difficulty modes:
// Easy (60s puzzle), Hard (40s puzzle), Extra Hard (25s puzzle)
// ================================================================
const Game = (() => {
  // Difficulty Modes Configuration
  const DIFFICULTY_CONFIG = {
    easy: {
      key: "easy",
      name: "Easy",
      badge: "🌱 EASY (60s)",
      badgeIcon: "🌱",
      puzzleTime: 60.0, // 60 seconds to solve puzzle!
      baseSpeed: 14.0, // Relaxed speed
      maxSpeed: 28.0,
      multiplier: 1.0
    },
    hard: {
      key: "hard",
      name: "Hard",
      badge: "⚡ HARD (40s)",
      badgeIcon: "⚡",
      puzzleTime: 40.0, // 40 seconds to solve puzzle!
      baseSpeed: 18.0, // Fast arcade runner speed
      maxSpeed: 36.0,
      multiplier: 1.5
    },
    extraHard: {
      key: "extraHard",
      name: "Extra Hard",
      badge: "🔥 EXTRA HARD (25s)",
      badgeIcon: "🔥",
      puzzleTime: 25.0, // 25 seconds to solve puzzle! Rapid reflex!
      baseSpeed: 22.0, // Blistering speed
      maxSpeed: 42.0,
      multiplier: 2.0
    }
  };

  let currentDifficulty = DIFFICULTY_CONFIG.easy;

  // States: RUNNING, PUZZLE (Bullet-Time), GAMEOVER
  const STATE = { RUNNING: 1, PUZZLE: 2, GAMEOVER: 3 };
  let state = STATE.RUNNING;

  const SPEED_K = 0.0022;

  let speed = currentDifficulty.baseSpeed;
  let distance = 0;
  let score = 0;
  let bananaCount = 0;
  let cratesEncountered = 0;
  let cratesSolved = 0;
  let runStartTime = 0;
  let runStartTimeISO = new Date().toISOString();
  let runSaved = false;

  // Frame timing
  let lastTime = 0;
  let timeDilation = 1.0;

  // DOM elements
  const canvas = document.getElementById("runner-canvas");
  const gameoverScreen = document.getElementById("gameover-screen");
  const goRetryBtn = document.getElementById("go-retry-btn");
  const goDiffBadge = document.getElementById("go-diff-badge");
  const goBanner = document.getElementById("gameover-banner");

  // HUD elements
  const hudScoreValue = document.getElementById("hud-score-value");
  const hudDistanceValue = document.getElementById("hud-distance-value");
  const hudBananaCount = document.getElementById("hud-banana-count");

  // Difficulty UI
  const diffBtn = document.getElementById("difficulty-btn");
  const diffMenu = document.getElementById("difficulty-menu");
  const diffBadgeIcon = document.getElementById("diff-badge-icon");
  const diffBadgeText = document.getElementById("diff-badge-text");
  const diffOptions = document.querySelectorAll(".diff-option");

  // Game over elements
  const goDistance = document.getElementById("go-distance");
  const goScore = document.getElementById("go-score");
  const goBananas = document.getElementById("go-bananas");
  const goCrates = document.getElementById("go-crates");

  function init() {
    World.init(canvas);
    bindEvents();

    // Set initial difficulty
    setDifficulty("easy");

    // Start directly in running scene!
    startGame();

    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }

  function setDifficulty(modeKey) {
    if (!DIFFICULTY_CONFIG[modeKey]) return;
    currentDifficulty = DIFFICULTY_CONFIG[modeKey];

    // Update HUD selector
    if (diffBadgeIcon) diffBadgeIcon.textContent = currentDifficulty.badgeIcon;
    if (diffBadgeText) diffBadgeText.textContent = currentDifficulty.name.toUpperCase() + ` (${currentDifficulty.puzzleTime}s)`;

    // Update active state in dropdown
    diffOptions.forEach(opt => {
      opt.classList.toggle("active", opt.dataset.mode === modeKey);
    });

    // Notify puzzle system to align countdown ring & timer to selected mode!
    PuzzleSystem.setModeConfig(currentDifficulty.puzzleTime, currentDifficulty.badge);
  }

  function bindEvents() {
    // Difficulty dropdown toggle
    if (diffBtn && diffMenu) {
      diffBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        diffMenu.classList.toggle("hidden");
      });

      diffOptions.forEach(opt => {
        opt.addEventListener("click", (e) => {
          e.stopPropagation();
          if ((state === STATE.RUNNING || state === STATE.PUZZLE) && distance > 5) {
            saveRun("Abandoned", "Switched difficulty mid-run");
          }
          setDifficulty(opt.dataset.mode);
          diffMenu.classList.add("hidden");
          startGame();
        });
      });

      document.querySelectorAll(".hud-corner-nav a, .corner-link").forEach(link => {
        link.addEventListener("click", () => {
          if ((state === STATE.RUNNING || state === STATE.PUZZLE) && distance > 5) {
            saveRun("Abandoned", "Navigation exit");
          }
        });
      });

      window.addEventListener("beforeunload", () => {
        if ((state === STATE.RUNNING || state === STATE.PUZZLE) && distance > 5) {
          saveRun("Abandoned", "Browser unload");
        }
      });

      document.addEventListener("click", (e) => {
        if (!diffMenu.contains(e.target) && e.target !== diffBtn) {
          diffMenu.classList.add("hidden");
        }
      });
    }

    if (goRetryBtn) {
      goRetryBtn.addEventListener("click", () => {
        startGame();
      });
    }

    // Space / Enter on Game Over screen restarts run
    document.addEventListener("keydown", (e) => {
      if (state === STATE.GAMEOVER && (e.code === "Space" || e.code === "Enter")) {
        e.preventDefault();
        startGame();
      }
    });

    // Unlock Web Audio on first user gesture
    const unlockOnce = () => {
      AudioEngine.unlock();
      window.removeEventListener("pointerdown", unlockOnce);
      window.removeEventListener("keydown", unlockOnce);
    };
    window.addEventListener("pointerdown", unlockOnce);
    window.addEventListener("keydown", unlockOnce);
  }

  function startGame() {
    AudioEngine.unlock();

    state = STATE.RUNNING;
    speed = currentDifficulty.baseSpeed;
    distance = 0;
    score = 0;
    bananaCount = 0;
    cratesEncountered = 0;
    cratesSolved = 0;
    timeDilation = 1.0;
    runStartTime = performance.now();
    runStartTimeISO = new Date().toISOString();
    runSaved = false;

    if (gameoverScreen) gameoverScreen.classList.add("hidden");
    if (diffMenu) diffMenu.classList.add("hidden");

    // Align puzzle timer
    PuzzleSystem.setModeConfig(currentDifficulty.puzzleTime, currentDifficulty.badge);

    World.reset();
    const scene = World.getScene();
    Player.reset(scene);
    Obstacles.reset();
    Obstacles.init(scene);
    Collectibles.reset();
    Collectibles.init(scene);
    PowerupManager.reset();
    PuzzleSystem.reset();
    PuzzleSystem.startPrefetching();
    InputManager.reset();

    updateHUD();
    lastTime = performance.now();
  }

  function saveRun(status = "Game Over", reason = "") {
    if (runSaved) return; // Prevent duplicate records per run
    runSaved = true;

    const runDuration = Math.max(1, Math.floor((performance.now() - runStartTime) / 1000));
    const attempted = cratesEncountered;
    const correct = cratesSolved;
    const wrong = Math.max(0, attempted - correct);
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

    const payload = {
      distance: Math.floor(distance),
      bananas: bananaCount,
      cratesEncountered: attempted,
      cratesSolved: correct,
      questionsAttempted: attempted,
      correctAnswers: correct,
      wrongAnswers: wrong,
      accuracy,
      score,
      duration: runDuration,
      difficulty: currentDifficulty.key,
      gameStatus: status,
      startTime: runStartTimeISO,
      endTime: new Date().toISOString()
    };

    try {
      fetch("/api/runner/end-run", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch (e) {}
  }

  function gameOver(reason = "💥 CRASHED!") {
    state = STATE.GAMEOVER;
    AudioEngine.playCrash();

    // Check if player solved 10 questions/crates
    const finalStatus = cratesSolved >= 10 ? "Completed" : "Game Over";
    saveRun(finalStatus, reason);

    // Update in-scene Game Over Card
    if (goBanner) goBanner.textContent = reason;
    if (goDistance) goDistance.textContent = Math.floor(distance) + "m";
    if (goScore) goScore.textContent = score;
    if (goBananas) goBananas.textContent = bananaCount;
    if (goCrates) goCrates.textContent = `${cratesSolved}/${cratesEncountered}`;
    if (goDiffBadge) goDiffBadge.textContent = currentDifficulty.badge;
    if (gameoverScreen) gameoverScreen.classList.remove("hidden");
  }

  function getSpeed() {
    const dCap = 2200;
    const progress = Math.log(1 + SPEED_K * distance) / Math.log(1 + SPEED_K * dCap);
    const base = currentDifficulty.baseSpeed;
    const max = currentDifficulty.maxSpeed;
    return base + (max - base) * Math.min(progress, 1);
  }

  function updateHUD() {
    if (hudScoreValue) hudScoreValue.textContent = score;
    if (hudDistanceValue) hudDistanceValue.textContent = Math.floor(distance) + "m";
    if (hudBananaCount) hudBananaCount.textContent = bananaCount;
  }

  // ============================================================
  // Main Game Loop (60 FPS)
  // ============================================================
  function gameLoop(now) {
    requestAnimationFrame(gameLoop);

    const rawDelta = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (state === STATE.GAMEOVER) {
      World.render();
      return;
    }

    const delta = rawDelta * timeDilation;

    // ---- STATE.PUZZLE (Bullet-Time Slowdown) ----
    if (state === STATE.PUZZLE) {
      // Puzzle timer runs in real-time according to difficulty countdown
      PuzzleSystem.update(rawDelta);

      // 3D world moves in extreme slow-motion
      const slowDelta = rawDelta * 0.03;
      speed = getSpeed();
      Player.update(slowDelta, speed);
      World.update(Player.getZ());
      World.render();
      return;
    }

    // ---- STATE.RUNNING ----
    Player.handleInput();

    speed = getSpeed();
    distance += speed * delta;

    // Update World & Entities
    Player.update(delta, speed);
    World.update(Player.getZ());
    Obstacles.update(Player.getZ(), distance);
    Collectibles.update(Player.getZ(), distance, delta);
    PowerupManager.update(delta);

    // ---- Collision: Obstacles ----
    const playerBox = Player.getCollisionBox();
    const hitObs = Obstacles.checkCollision(playerBox);

    if (hitObs && !Player.isInvulnerable()) {
      if (Player.consumeShieldCharge()) {
        // Free Obstacle Pass absorbs collision!
        // No crash, no game over, runner passes through with ~1s invulnerability
      } else if (Player.consumeHoverboard()) {
        // Golden Hoverboard absorbs crash hit!
        AudioEngine.playCrash();
        Player.triggerInvulnerability(2.0);
      } else {
        gameOver();
        World.render();
        return;
      }
    }

    // ---- Collision: Bananas ----
    const bananasGained = Collectibles.checkBananaCollision(playerBox);
    if (bananasGained > 0) {
      const mult = PowerupManager.getMultiplier() * currentDifficulty.multiplier;
      bananaCount += bananasGained;
      score += Math.round(bananasGained * 5 * mult);
      AudioEngine.playBananaPickup();
    }

    // ---- Collision: Banana Mystery Crate ----
    const hitCrate = Collectibles.checkCrateCollision(playerBox);
    if (hitCrate) {
      cratesEncountered++;
      AudioEngine.playCratePickup();

      // Enter Bullet-Time Puzzle Interruption
      state = STATE.PUZZLE;
      timeDilation = 0.03;

      PuzzleSystem.showPuzzle((result) => {
        if (!result.solved) {
          // If incorrect answer or timer expired: immediately end the game
          timeDilation = 1.0;
          gameOver("Puzzle not solved!");
          return;
        }

        // Return to normal running speed
        state = STATE.RUNNING;
        timeDilation = 1.0;

        if (result.powerup) {
          cratesSolved++;
          PowerupManager.activate(result.powerup);
          Player.addShieldCharge(); // Free obstacle pass (shield charge) granted!
          score += Math.round(100 * PowerupManager.getMultiplier() * currentDifficulty.multiplier);
          if (cratesSolved >= 10) {
            gameOver("🏆 ALL 10 PUZZLES COMPLETED!");
            return;
          }
        }
      });
    }

    // Distance Score
    const distMultiplier = PowerupManager.getMultiplier() * currentDifficulty.multiplier;
    const distScore = Math.floor(distance / 5) * distMultiplier;
    score = Math.max(score, Math.round(distScore + bananaCount * 5 * distMultiplier));

    updateHUD();

    // ---- Camera Follow ----
    const cam = World.getCamera();
    if (cam) {
      const targetCamY = Player.isJetpackActive() ? 8.5 : 3.8;
      cam.position.y += (targetCamY - cam.position.y) * Math.min(1, delta * 4.0);
      cam.position.z = Player.getZ() + 6.2;
      cam.position.x = Player.getX() * 0.28;
      cam.lookAt(Player.getX() * 0.45, Player.getY() * 0.8 + 0.6, Player.getZ() - 20);
    }

    World.render();
  }

  // Auto-boot
  init();

  return { startGame, setDifficulty };
})();
