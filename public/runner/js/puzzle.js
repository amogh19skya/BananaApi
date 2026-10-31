// ================================================================
// Banana Surfers – Puzzle System (Banana API Integration)
// Pre-fetches Banana API puzzles and triggers bullet-time modal
// ================================================================
const PuzzleSystem = (() => {
  let maxPuzzleTime = 60.0; // Dynamically set according to difficulty mode (60s, 40s, 25s)

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
  const puzzleImageFrame = document.getElementById("puzzle-image-frame");
  const puzzleImage = document.getElementById("puzzle-image");
  const puzzleLoading = document.getElementById("puzzle-loading");
  const timerText = document.getElementById("puzzle-timer-text");
  const timerRingProgress = document.getElementById("timer-ring-progress");
  const numpad = document.getElementById("puzzle-numpad");
  const rewardSplash = document.getElementById("puzzle-reward-splash");
  const rewardImage = document.getElementById("reward-image");
  const rewardIcon = document.getElementById("reward-icon");
  const rewardTitle = document.getElementById("reward-title");
  const rewardDesc = document.getElementById("reward-desc");
  const activatePowerBtn = document.getElementById("activate-power-btn");
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
  async function showPuzzle(onComplete) {
    puzzleCallback = onComplete;

    // Immediately open modal so user sees the crate opening
    if (modal) modal.classList.remove("hidden");
    if (puzzleImageFrame) puzzleImageFrame.style.display = "flex";
    if (rewardImage) rewardImage.src = "";
    if (rewardSplash) rewardSplash.classList.add("hidden");
    if (numpad) numpad.style.display = "none";
    if (puzzleInstruction) puzzleInstruction.style.display = "none";
    if (puzzleImage) puzzleImage.style.display = "none";
    if (puzzleLoading) {
      puzzleLoading.style.display = "block";
      puzzleLoading.textContent = "Opening Banana Crate Puzzle...";
    }

    let puzzle = puzzleQueue.shift();
    if (!puzzle) {
      try {
        const res = await fetch("/api/runner/crate-puzzle");
        if (res.ok) {
          const data = await res.json();
          puzzle = { puzzleId: data.puzzleId, imageUrl: data.imageUrl };
        }
      } catch (e) {
        console.warn("Instant fetch error:", e);
      }
    }

    if (!puzzle) {
      if (puzzleLoading) puzzleLoading.textContent = "Puzzle unavailable. Keep running!";
      setTimeout(() => {
        hideModal();
        if (puzzleCallback) puzzleCallback({ solved: false });
      }, 1000);
      return;
    }

    currentPuzzle = puzzle;
    isPuzzleActive = true;
    puzzleTimer = maxPuzzleTime;

    isPuzzleActive = true;
    puzzleTimer = maxPuzzleTime;

    // Reset modal UI
    if (puzzleImageFrame) puzzleImageFrame.style.display = "flex";
    if (rewardImage) rewardImage.src = "";
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

  let pendingPowerup = null;

  // ---- Answer Validation ----
  async function submitAnswer(num) {
    if (!isPuzzleActive) return;
    isPuzzleActive = false; // Stop timer countdown & prevent double submit

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
        pendingPowerup = PowerupManager.getRandomPowerup();

        // 1. Hide numpad & puzzle image to present announcement clearly
        if (numpad) numpad.style.display = "none";
        if (puzzleInstruction) puzzleInstruction.style.display = "none";
        if (puzzleImage) puzzleImage.style.display = "none";
        if (puzzleImageFrame) puzzleImageFrame.style.display = "none";

        // 2. Display powerup announcement screen
        if (rewardSplash) {
          if (rewardIcon) rewardIcon.textContent = pendingPowerup.icon;
          if (rewardTitle) rewardTitle.textContent = pendingPowerup.name;
          if (rewardDesc) rewardDesc.textContent = pendingPowerup.desc;

          if (rewardImage) {
            // Setup robust fallback if image fails to load
            rewardImage.onerror = () => {
              rewardImage.style.display = "none";
              if (rewardIcon) rewardIcon.classList.remove("hidden");
            };
            rewardImage.onload = () => {
              rewardImage.style.display = "block";
              if (rewardIcon) rewardIcon.classList.add("hidden");
            };

            // Dynamically assign power-up image path
            if (pendingPowerup.image) {
              rewardImage.src = pendingPowerup.image;
            } else {
              rewardImage.style.display = "none";
              if (rewardIcon) rewardIcon.classList.remove("hidden");
            }
          }
          rewardSplash.classList.remove("hidden");
        }
      } else {
        // Incorrect answer -> Immediately trigger Game Over
        AudioEngine.playWrong();
        hideModal();
        if (puzzleCallback) {
          puzzleCallback({ solved: false, reason: "incorrect" });
        }
      }
    } catch (e) {
      // Network or API error -> Trigger Game Over
      AudioEngine.playWrong();
      hideModal();
      if (puzzleCallback) {
        puzzleCallback({ solved: false, reason: "error" });
      }
    }
  }

  function timeOut() {
    isPuzzleActive = false;
    AudioEngine.playWrong();
    hideModal();
    if (puzzleCallback) {
      puzzleCallback({ solved: false, reason: "timeout" });
    }
  }

  function hideModal() {
    if (modal) modal.classList.add("hidden");
    if (puzzleImageFrame) puzzleImageFrame.style.display = "flex";
    if (rewardImage) rewardImage.src = "";
    if (rewardSplash) rewardSplash.classList.add("hidden");
    currentPuzzle = null;
    isPuzzleActive = false;
    pendingPowerup = null;
  }

  function update(delta) {
    if (!isPuzzleActive) return;
    puzzleTimer -= delta;
    updateTimerDisplay();
    if (puzzleTimer <= 0) {
      timeOut();
    }
  }

  // ---- Activate Power Button Listener ----
  if (activatePowerBtn) {
    activatePowerBtn.addEventListener("click", () => {
      if (!pendingPowerup) return;
      const powerupToActivate = pendingPowerup;
      hideModal();
      if (puzzleCallback) {
        puzzleCallback({ solved: true, powerup: powerupToActivate });
      }
    });
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
    // If pending powerup announcement is open, Enter activates power
    if (pendingPowerup && modal && !modal.classList.contains("hidden")) {
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        if (activatePowerBtn) activatePowerBtn.click();
        return;
      }
    }

    if (!isPuzzleActive) return;
    const num = parseInt(e.key, 10);
    if (!isNaN(num) && num >= 0 && num <= 9) {
      submitAnswer(num);
    }
  });

  function reset() {
    isPuzzleActive = false;
    pendingPowerup = null;
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
