// ================================================================
// Banana Surfers – Puzzle System (Banana API Integration)
// Pre-fetches Banana API puzzles and triggers bullet-time modal
// ================================================================
const PuzzleSystem = (() => {
  let maxPuzzleTime = 8.0; // Dynamically set according to difficulty mode (8s, 5s, 3s)

  // Pre-fetched puzzle queue
  const puzzleQueue = [];
  let isFetching = false;

  // Puzzle state
  let isPuzzleActive = false;
  let currentPuzzle = null;
  let puzzleTimer = 0;
  let puzzleCallback = null;

  // DOM elements
  const modal = document.getElementById("puzzle-modal");
  const puzzleImage = document.getElementById("puzzle-image");
  const puzzleLoading = document.getElementById("puzzle-loading");
  const timerText = document.getElementById("puzzle-timer-text");
  const timerRingProgress = document.getElementById("timer-ring-progress");
  const numpad = document.getElementById("puzzle-numpad");
  const rewardSplash = document.getElementById("puzzle-reward-splash");
  const rewardIcon = document.getElementById("reward-icon");
  const rewardTitle = document.getElementById("reward-title");
  const puzzleInstruction = document.getElementById("puzzle-instruction");
  const puzzleModeTag = document.getElementById("puzzle-mode-tag");

  const CIRCUMFERENCE = 2 * Math.PI * 54;

  function setModeConfig(seconds, label) {
    maxPuzzleTime = seconds;
    if (puzzleModeTag) {
      puzzleModeTag.textContent = label + " (" + seconds + "s TIMER)";
    }
  }

  // ---- Pre-fetching Puzzles from Server Proxy ----
  async function prefetch() {
    if (isFetching || puzzleQueue.length >= 2) return;
    isFetching = true;
    try {
      const res = await fetch("/api/runner/crate-puzzle");
      if (res.ok) {
        const data = await res.json();
        const img = new Image();
        img.src = data.imageUrl;
        puzzleQueue.push({ puzzleId: data.puzzleId, imageUrl: data.imageUrl, imgEl: img });
      }
    } catch (e) {
      console.warn("Puzzle prefetch notice:", e.message);
    }
    isFetching = false;

    if (puzzleQueue.length < 2) {
      setTimeout(prefetch, 800);
    }
  }

  function startPrefetching() {
    prefetch();
    setInterval(() => {
      if (puzzleQueue.length < 2) prefetch();
    }, 4000);
  }

  // ---- Show Puzzle in Bullet-Time ----
  function showPuzzle(onComplete) {
    const puzzle = puzzleQueue.shift();
    currentPuzzle = puzzle;
    puzzleCallback = onComplete;

    if (!puzzle) {
      // Fallback: grant powerup directly if network timed out
      const powerup = PowerupManager.getRandomPowerup();
      onComplete({ solved: true, powerup, fallback: true });
      return;
    }

    isPuzzleActive = true;
    puzzleTimer = maxPuzzleTime;

    // Reset modal UI
    if (rewardSplash) rewardSplash.classList.add("hidden");
    if (numpad) numpad.style.display = "grid";
    if (puzzleInstruction) puzzleInstruction.style.display = "block";
    if (puzzleImage) {
      puzzleImage.src = puzzle.imageUrl;
      puzzleImage.style.display = "block";
    }
    if (puzzleLoading) puzzleLoading.style.display = "none";
    if (modal) modal.classList.remove("hidden");

    updateTimerDisplay();
    AudioEngine.playBulletTime();

    // Re-fill queue in background
    prefetch();
  }

  function updateTimerDisplay() {
    const t = Math.max(0, Math.ceil(puzzleTimer));
    if (timerText) timerText.textContent = t;

    const pct = Math.max(0, puzzleTimer / maxPuzzleTime);
    const offset = CIRCUMFERENCE * (1 - pct);
    if (timerRingProgress) {
      timerRingProgress.style.strokeDashoffset = offset;
      if (pct < 0.3) {
        timerRingProgress.style.stroke = "#ef4444";
      } else if (pct < 0.6) {
        timerRingProgress.style.stroke = "#f59e0b";
      } else {
        timerRingProgress.style.stroke = "#ffd700";
      }
    }
  }

  // ---- Answer Validation ----
  async function submitAnswer(num) {
    if (!isPuzzleActive) return;
    isPuzzleActive = false; // Prevent double submit

    const puzzleId = currentPuzzle ? currentPuzzle.puzzleId : null;

    try {
      const res = await fetch("/api/runner/verify-crate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guess: num, puzzleId })
      });
      const data = await res.json();

      if (data.correct) {
        AudioEngine.playCorrect();
        const powerup = PowerupManager.getRandomPowerup();

        // Show celebratory superpower banner
        if (rewardSplash && rewardTitle && rewardIcon) {
          rewardIcon.textContent = powerup.icon;
          rewardTitle.textContent = powerup.name + " ACTIVATED!";
          rewardSplash.classList.remove("hidden");
          if (numpad) numpad.style.display = "none";
          if (puzzleInstruction) puzzleInstruction.style.display = "none";
        }

        // Brief punchy delay to appreciate the reward, then back to running
        setTimeout(() => {
          hideModal();
          if (puzzleCallback) puzzleCallback({ solved: true, powerup });
        }, 700);
      } else {
        AudioEngine.playWrong();
        hideModal();
        if (puzzleCallback) puzzleCallback({ solved: false });
      }
    } catch (e) {
      AudioEngine.playWrong();
      hideModal();
      if (puzzleCallback) puzzleCallback({ solved: false });
    }
  }

  function timeOut() {
    isPuzzleActive = false;
    AudioEngine.playWrong();
    hideModal();
    if (puzzleCallback) puzzleCallback({ solved: false });
  }

  function hideModal() {
    if (modal) modal.classList.add("hidden");
    if (rewardSplash) rewardSplash.classList.add("hidden");
    currentPuzzle = null;
    isPuzzleActive = false;
  }

  function update(delta) {
    if (!isPuzzleActive) return;
    puzzleTimer -= delta;
    updateTimerDisplay();
    if (puzzleTimer <= 0) {
      timeOut();
    }
  }

  // ---- Click & Keyboard Listeners ----
  if (numpad) {
    numpad.addEventListener("click", (e) => {
      const key = e.target.closest(".numpad-key");
      if (key && isPuzzleActive) {
        submitAnswer(parseInt(key.dataset.num, 10));
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (!isPuzzleActive) return;
    const num = parseInt(e.key, 10);
    if (!isNaN(num) && num >= 0 && num <= 9) {
      submitAnswer(num);
    }
  });

  function reset() {
    isPuzzleActive = false;
    hideModal();
    puzzleQueue.length = 0;
  }

  return {
    startPrefetching,
    showPuzzle,
    update,
    reset,
    setModeConfig,
    isActive: () => isPuzzleActive
  };
})();
