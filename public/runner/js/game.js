// ================================================================
// Banana Surfers – Main Game Loop
// Direct 1-scene continuous runner flow:
// Spawns directly into running gameplay on load with zero intro screens
// ================================================================
const Game = (() => {
  // States: RUNNING, PUZZLE (Bullet-Time), GAMEOVER
  const STATE = { RUNNING: 1, PUZZLE: 2, GAMEOVER: 3 };
  let state = STATE.RUNNING;

  // Running speed progression (m/s)
  const BASE_SPEED = 16;
  const MAX_SPEED = 36;
  const SPEED_K = 0.0022;

  let speed = BASE_SPEED;
  let distance = 0;
  let score = 0;
  let bananaCount = 0;
  let cratesEncountered = 0;
  let cratesSolved = 0;
  let runStartTime = 0;

  // Frame timing
  let lastTime = 0;
  let timeDilation = 1.0;

  // DOM elements
  const canvas = document.getElementById("runner-canvas");
  const gameoverScreen = document.getElementById("gameover-screen");
  const goRetryBtn = document.getElementById("go-retry-btn");

  // HUD elements
  const hudScoreValue = document.getElementById("hud-score-value");
  const hudDistanceValue = document.getElementById("hud-distance-value");
  const hudBananaCount = document.getElementById("hud-banana-count");

  // Game over elements
  const goDistance = document.getElementById("go-distance");
  const goScore = document.getElementById("go-score");
  const goBananas = document.getElementById("go-bananas");
  const goCrates = document.getElementById("go-crates");

  function init() {
    World.init(canvas);
    bindEvents();

    // Start directly in running scene!
    startGame();

    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }

  function bindEvents() {
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
    speed = BASE_SPEED;
    distance = 0;
    score = 0;
    bananaCount = 0;
    cratesEncountered = 0;
    cratesSolved = 0;
    timeDilation = 1.0;
    runStartTime = performance.now();

    if (gameoverScreen) gameoverScreen.classList.add("hidden");

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

  function gameOver() {
    state = STATE.GAMEOVER;
    AudioEngine.playCrash();

    const runDuration = Math.max(1, Math.floor((performance.now() - runStartTime) / 1000));

    // Update in-scene Game Over Card
    if (goDistance) goDistance.textContent = Math.floor(distance) + "m";
    if (goScore) goScore.textContent = score;
    if (goBananas) goBananas.textContent = bananaCount;
    if (goCrates) goCrates.textContent = `${cratesSolved}/${cratesEncountered}`;
    if (gameoverScreen) gameoverScreen.classList.remove("hidden");

    // Async save run stats (if logged in)
    fetch("/api/runner/end-run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        distance: Math.floor(distance),
        bananas: bananaCount,
        cratesEncountered,
        cratesSolved,
        score,
        duration: runDuration
      })
    }).catch(() => {});
  }

  function getSpeed() {
    const dCap = 2200;
    const progress = Math.log(1 + SPEED_K * distance) / Math.log(1 + SPEED_K * dCap);
    return BASE_SPEED + (MAX_SPEED - BASE_SPEED) * Math.min(progress, 1);
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
      // Puzzle timer runs in real-time
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
      if (Player.consumeHoverboard()) {
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
      const mult = PowerupManager.getMultiplier();
      bananaCount += bananasGained;
      score += bananasGained * 5 * mult;
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
        // Return to normal speed
        state = STATE.RUNNING;
        timeDilation = 1.0;

        if (result.solved && result.powerup) {
          cratesSolved++;
          // Grant the Super Power to use during the run!
          PowerupManager.activate(result.powerup);
          score += 100 * PowerupManager.getMultiplier();
        }
      });
    }

    // Distance Score
    const distScore = Math.floor(distance / 5) * PowerupManager.getMultiplier();
    score = Math.max(score, distScore + bananaCount * 5 * PowerupManager.getMultiplier());

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

  return { startGame };
})();
