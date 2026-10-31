// ================================================================
// Banana Surfers – Puzzle System (Banana API Integration)
// Pre-fetches puzzles from the backend, bullet-time modal UI
// ================================================================
const PuzzleSystem = (() => {
  const PUZZLE_TIME = 5; // seconds to solve

  // Pre-fetched puzzle queue
  const puzzleQueue = [];
  let isFetching = false;

  // Puzzle state
  let isPuzzleActive = false;
  let currentPuzzle = null;
  let puzzleTimer = 0;
  let puzzleCallback = null; // Called with { solved: bool, powerup }

  // DOM
  const modal = document.getElementById("puzzle-modal");
  const puzzleImage = document.getElementById("puzzle-image");
  const puzzleLoading = document.getElementById("puzzle-loading");
  const timerText = document.getElementById("puzzle-timer-text");
  const timerRingProgress = document.getElementById("timer-ring-progress");
  const numpad = document.getElementById("puzzle-numpad");

  const CIRCUMFERENCE = 2 * Math.PI * 54; // r=54 from SVG

  // ---- Pre-fetching ----
  async function prefetch() {
    if (isFetching || puzzleQueue.length >= 2) return;
    isFetching = true;
    try {
      const res = await fetch("/api/runner/crate-puzzle");
      if (res.ok) {
        const data = await res.json();
        // Pre-load the image
        const img = new Image();
        img.src = data.imageUrl;
        puzzleQueue.push({ puzzleId: data.puzzleId, imageUrl: data.imageUrl, imgEl: img });
      }
    } catch (e) {
      console.warn("Puzzle prefetch failed:", e.message);
    }
    isFetching = false;
    // Keep the queue topped up
    if (puzzleQueue.length < 2) {
      setTimeout(prefetch, 1000);
    }
  }

  function startPrefetching() {
    prefetch();
    // Continuously top up
    setInterval(() => {
      if (puzzleQueue.length < 2) prefetch();
    }, 5000);
  }

  // ---- Show Puzzle Modal ----
  function showPuzzle(onComplete) {
    const puzzle = puzzleQueue.shift();
    currentPuzzle = puzzle;
    puzzleCallback = onComplete;

    if (!puzzle) {
      // No puzzle available – grant powerup anyway with a shorter effect
      onComplete({ solved: true, powerup: PowerupManager.getRandomPowerup(), noPuzzle: true });
      return;
    }

    isPuzzleActive = true;
    puzzleTimer = PUZZLE_TIME;

    // Show modal
    modal.classList.remove("hidden");
    puzzleLoading.style.display = "none";
    puzzleImage.src = puzzle.imageUrl;
    puzzleImage.style.display = "block";
    updateTimerDisplay();

    AudioEngine.playBulletTime();

    // Refill queue
    prefetch();
  }

  function updateTimerDisplay() {
    const t = Math.ceil(puzzleTimer);
    if (timerText) timerText.textContent = t;
    // Ring progress
    const pct = puzzleTimer / PUZZLE_TIME;
    const offset = CIRCUMFERENCE * (1 - pct);
    if (timerRingProgress) timerRingProgress.style.strokeDashoffset = offset;
  }

  // ---- Submit Answer ----
  async function submitAnswer(num) {
    if (!isPuzzleActive) return;
    isPuzzleActive = false;

    const puzzleId = currentPuzzle ? currentPuzzle.puzzleId : null;

    try {
      const res = await fetch("/api/runner/verify-crate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guess: num, puzzleId })
      });
      const data = await res.json();

      hideModal();

      if (data.correct) {
        AudioEngine.playCorrect();
        const powerup = PowerupManager.getRandomPowerup();
        if (puzzleCallback) puzzleCallback({ solved: true, powerup });
      } else {
        AudioEngine.playWrong();
        if (puzzleCallback) puzzleCallback({ solved: false });
      }
    } catch (e) {
      hideModal();
      AudioEngine.playWrong();
      if (puzzleCallback) puzzleCallback({ solved: false });
    }
  }

  function timeOut() {
    isPuzzleActive = false;
    hideModal();
    AudioEngine.playWrong();
    if (puzzleCallback) puzzleCallback({ solved: false });
  }

  function hideModal() {
    modal.classList.add("hidden");
    puzzleImage.style.display = "none";
    puzzleCallback = null;
  }

  function update(delta) {
    if (!isPuzzleActive) return;
    puzzleTimer -= delta;
    updateTimerDisplay();
    if (puzzleTimer <= 0) {
      timeOut();
    }
  }

  // ---- Numpad & keyboard input ----
  if (numpad) {
    numpad.addEventListener("click", (e) => {
      const key = e.target.closest(".numpad-key");
      if (key && isPuzzleActive) {
        submitAnswer(parseInt(key.dataset.num, 10));
      }
    });
  }

  // Keyboard 0-9
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
    isActive: () => isPuzzleActive
  };
})();

