// ================================================================
// Banana Surfers – Main Game Loop
// Ties together World, Player, Obstacles, Collectibles,
// Powerups, Puzzle, Audio, Input, and HUD
// ================================================================
const Game = (() => {
  // ---- Game State ----
  const STATE = { MENU: 0, RUNNING: 1, PUZZLE: 2, GAMEOVER: 3 };
  let state = STATE.MENU;

  // Speed & difficulty
  const BASE_SPEED = 15; // m/s
  const MAX_SPEED = 38;
  const SPEED_K = 0.002; // Logarithmic scaling factor

  let speed = BASE_SPEED;
  let distance = 0;
  let score = 0;
  let bananaCount = 0;
  let cratesEncountered = 0;
  let cratesSolved = 0;
  let runStartTime = 0;

  // Clock
  let lastTime = 0;
  let timeDilation = 1.0; // 1.0 = normal, 0.03 = bullet-time

  // DOM references
  const canvas = document.getElementById("runner-canvas");
  const menuScreen = document.getElementById("menu-screen");
  const gameoverScreen = document.getElementById("gameover-screen");
  const playBtn = document.getElementById("play-btn");
  const goRetryBtn = document.getElementById("go-retry-btn");
  const goMenuBtn = document.getElementById("go-menu-btn");

  // HUD
  const hudScoreValue = document.getElementById("hud-score-value");
  const hudDistanceValue = document.getElementById("hud-distance-value");
  const hudBananaCount = document.getElementById("hud-banana-count");

  // Game Over stats
  const goDistance = document.getElementById("go-distance");
  const goScore = document.getElementById("go-score");
  const goBananas = document.getElementById("go-bananas");
  const goCrates = document.getElementById("go-crates");

  // ---- Init ----
  function init() {
    World.init(canvas);
    bindEvents();
    requestAnimationFrame(gameLoop);
  }

  function bindEvents() {
    playBtn.addEventListener("click", startGame);
    goRetryBtn.addEventListener("click", startGame);
    goMenuBtn.addEventListener("click", showMenu);
  }

  function showMenu() {
    state = STATE.MENU;
    menuScreen.classList.remove("hidden");
    gameoverScreen.classList.add("hidden");
  }

  function startGame() {
    AudioEngine.unlock();

    // Reset everything
    state = STATE.RUNNING;
    speed = BASE_SPEED;
    distance = 0;
    score = 0;
    bananaCount = 0;
    cratesEncountered = 0;
    cratesSolved = 0;
    timeDilation = 1.0;
    runStartTime = performance.now();

    menuScreen.classList.add("hidden");
    gameoverScreen.classList.add("hidden");

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

    const runDuration = Math.floor((performance.now() - runStartTime) / 1000);

    // Update game over screen
    goDistance.textContent = Math.floor(distance) + "m";
    goScore.textContent = score;
    goBananas.textContent = bananaCount;
    goCrates.textContent = `${cratesSolved}/${cratesEncountered}`;

    gameoverScreen.classList.remove("hidden");

    // Save run to server (fire-and-forget)
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
    }).catch(() => {}); // Silently fail if not logged in
  }

  // ---- Speed Curve ----
  function getSpeed() {
    // Logarithmic: v = base + (max-base) * ln(1 + k*d) / ln(1 + k*d_cap)
    const dCap = 2500;
    const progress = Math.log(1 + SPEED_K * distance) / Math.log(1 + SPEED_K * dCap);
    return BASE_SPEED + (MAX_SPEED - BASE_SPEED) * Math.min(progress, 1);
  }

  // ---- HUD ----
  function updateHUD() {
    if (hudScoreValue) hudScoreValue.textContent = score;
    if (hudDistanceValue) hudDistanceValue.textContent = Math.floor(distance) + "m";
    if (hudBananaCount) hudBananaCount.textContent = bananaCount;
  }

  // ---- Main Game Loop ----
  function gameLoop(now) {
    requestAnimationFrame(gameLoop);

    const rawDelta = Math.min((now - lastTime) / 1000, 0.05); // Cap at 50ms
    lastTime = now;

    if (state === STATE.MENU) {
      World.render();
      return;
    }

    if (state === STATE.GAMEOVER) {
      World.render();
      return;
    }

    // Apply time dilation for bullet-time
    const delta = rawDelta * timeDilation;

    if (state === STATE.PUZZLE) {
      // During puzzle, game runs at 0.03x speed
      PuzzleSystem.update(rawDelta); // Puzzle timer runs in real-time
      // Slow-motion world update
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

    // Update systems
    Player.update(delta, speed);
    World.update(Player.getZ());
    Obstacles.update(Player.getZ(), distance);
    Collectibles.update(Player.getZ(), distance, delta);
    PowerupManager.update(delta);

    // ---- Collision: Obstacles ----
    const playerBox = Player.getCollisionBox();
    const hitObs = Obstacles.checkCollision(playerBox);

    if (hitObs && !Player.isPlayerInvulnerable()) {
      if (Player.consumeHoverboard()) {
        // Hoverboard absorbs crash
        Player.triggerInvulnerability(1.5);
      } else {
        gameOver();
        World.render();
        return;
      }
    }

    // ---- Collision: Bananas ----
    const bananasCollected = Collectibles.checkBananaCollision(playerBox);
    if (bananasCollected > 0) {
      bananaCount += bananasCollected;
      score += bananasCollected * PowerupManager.getMultiplier();
      AudioEngine.playBananaPickup();
    }

    // ---- Collision: Crates ----
    const crate = Collectibles.checkCrateCollision(playerBox);
    if (crate) {
      cratesEncountered++;
      AudioEngine.playCratePickup();

      // Enter bullet-time puzzle mode
      state = STATE.PUZZLE;
      timeDilation = 0.03;

      PuzzleSystem.showPuzzle((result) => {
        // Callback when puzzle is resolved
        state = STATE.RUNNING;
        timeDilation = 1.0;

        if (result.solved && result.powerup) {
          cratesSolved++;
          PowerupManager.activate(result.powerup);
          score += 50 * PowerupManager.getMultiplier();
        }
      });
    }

    // ---- Score from distance ----
    score = Math.max(score, Math.floor(distance / 10) + bananaCount * PowerupManager.getMultiplier());

    updateHUD();

    // ---- Camera follow ----
    const cam = World.getCamera();
    if (cam) {
      cam.position.z = Player.getZ() + 6;
      cam.position.x = Player.getX() * 0.3; // Gentle follow
      cam.lookAt(Player.getX() * 0.5, 1.2, Player.getZ() - 20);
    }

    World.render();
  }

  // ---- Boot ----
  init();

  return { startGame, showMenu };
})();

