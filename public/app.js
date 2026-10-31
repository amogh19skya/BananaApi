// ==========================================
// DOM Elements
// ==========================================
const image = document.querySelector("#puzzle-image");
const loading = document.querySelector("#loading");
const status = document.querySelector("#status");
const scoreDisplay = document.querySelector("#score");
const questionNumber = document.querySelector("#question-number");
const timeDisplay = document.querySelector("#time-left");
const answerInput = document.querySelector("#answer");
const answerForm = document.querySelector("#answer-form");
const submitButton = document.querySelector("#submit-button");
const startButton = document.querySelector("#start-button");
const changeDifficultyBtn = document.querySelector("#change-difficulty-btn");
const modeStatDisplay = document.querySelector("#mode-stat-display");
const currentModeBadge = document.querySelector("#current-mode-badge");

// Intro Screen Elements
const introScreen = document.querySelector("#intro-screen");
const introStartButton = document.querySelector("#intro-start-button");
const skipIntroButton = document.querySelector("#skip-intro-btn");
const replayIntroButton = document.querySelector("#replay-intro-btn");
const introParticlesContainer = document.querySelector("#intro-particles");

// Difficulty Screen Elements
const difficultyScreen = document.querySelector("#difficulty-screen");
const difficultyCards = document.querySelectorAll(".difficulty-card");

// Results Screen Elements
const resultsScreen = document.querySelector("#results-screen");
const resultsIcon = document.querySelector("#results-icon");
const resultsTitle = document.querySelector("#results-title");
const resultsMessage = document.querySelector("#results-message");
const resultsFinalScore = document.querySelector("#results-final-score");
const resultsPtsRate = document.querySelector("#results-pts-rate");
const resultsDifficultyBadge = document.querySelector("#results-difficulty-badge");
const resultsCorrectCount = document.querySelector("#results-correct-count");
const resultsAccuracy = document.querySelector("#results-accuracy");
const resultsTimeStat = document.querySelector("#results-time-stat");
const resultsPlayAgainBtn = document.querySelector("#results-play-again-btn");
const resultsChangeDifficultyBtn = document.querySelector("#results-change-difficulty-btn");

// ==========================================
// Configurable Constants & Difficulty Modes
// ==========================================
const MAX_QUESTIONS = 10;

const DIFFICULTY_CONFIG = {
  easy: {
    name: "Easy",
    badge: "EASY",
    seconds: 60,
    pointsPerQuestion: 10,
    description: "Relax, think and solve the puzzles.",
    badgeClass: "badge-easy"
  },
  hard: {
    name: "Hard",
    badge: "HARD",
    seconds: 40,
    pointsPerQuestion: 15,
    description: "Challenge your brain and think faster.",
    badgeClass: "badge-hard"
  },
  extraHard: {
    name: "Extra Hard",
    badge: "EXTRA HARD",
    seconds: 25,
    pointsPerQuestion: 20,
    description: "For expert puzzle solvers. Think fast!",
    badgeClass: "badge-extra-hard"
  }
};

let selectedDifficulty = "easy";
let score = 0;
let questionCount = 0;
let correctAnswersCount = 0;
let timeLeft = DIFFICULTY_CONFIG[selectedDifficulty].seconds;
let questionActive = false;
let gameActive = false;
let timerId = null;
let introTimerId = null;

// ==========================================
// Audio & Sound Effects System
// ==========================================
const countdownSound = new Audio("sounds/countdown.mp3");
const correctSound = new Audio("sounds/correct.mp3");
const wrongSound = new Audio("sounds/wrong.mp3");

countdownSound.preload = "auto";
correctSound.preload = "auto";
wrongSound.preload = "auto";

countdownSound.volume = 0.6;
correctSound.volume = 0.65;
wrongSound.volume = 0.55;

let isAudioUnlocked = false;

function unlockAudio() {
  if (isAudioUnlocked) return;
  [countdownSound, correctSound, wrongSound].forEach((audio) => {
    audio.load();
  });
  isAudioUnlocked = true;
}

function safePlay(audio) {
  const promise = audio.play();
  if (promise !== undefined) {
    promise.catch((err) => {
      console.warn("Audio playback prevented or interrupted:", err.message);
    });
  }
}

function stopSound(audio) {
  audio.pause();
  audio.currentTime = 0;
}

function stopAllSounds() {
  stopSound(countdownSound);
  stopSound(correctSound);
  stopSound(wrongSound);
}

function playCorrectSound() {
  stopSound(wrongSound);
  stopSound(correctSound);
  safePlay(correctSound);
}

function playWrongSound() {
  stopSound(correctSound);
  stopSound(wrongSound);
  safePlay(wrongSound);
}

function playCountdownSound(secondsRemaining) {
  if (!isNaN(countdownSound.duration) && countdownSound.duration > 2) {
    if (countdownSound.paused) {
      countdownSound.currentTime = 0;
      safePlay(countdownSound);
    }
  } else {
    stopSound(countdownSound);
    safePlay(countdownSound);
  }
}

// ==========================================
// Screen Management
// ==========================================

// 1. Intro Screen
function initIntroParticles() {
  if (!introParticlesContainer) return;
  introParticlesContainer.innerHTML = "";

  const mathSymbols = ["+", "−", "×", "÷", "=", "?", "!", "π", "√", "7", "3", "9", "42", "✦", "%", "∞"];
  const count = window.innerWidth < 600 ? 22 : 36;

  for (let i = 0; i < count; i++) {
    const isSymbol = Math.random() > 0.45;
    const el = document.createElement("span");

    if (isSymbol) {
      el.className = "intro-floating-symbol";
      el.textContent = mathSymbols[Math.floor(Math.random() * mathSymbols.length)];
      el.style.fontSize = `${Math.floor(Math.random() * 18 + 14)}px`;
    } else {
      el.className = "intro-glowing-particle";
      const size = Math.floor(Math.random() * 6 + 3);
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
    }

    el.style.left = `${(Math.random() * 94 + 3).toFixed(1)}%`;
    el.style.top = `${(Math.random() * 94 + 3).toFixed(1)}%`;
    el.style.animationDuration = `${(Math.random() * 8 + 8).toFixed(1)}s`;
    el.style.animationDelay = `${(Math.random() * 6).toFixed(1)}s`;
    el.style.opacity = (Math.random() * 0.55 + 0.25).toFixed(2);

    introParticlesContainer.appendChild(el);
  }
}

function hideIntro() {
  if (introTimerId) {
    clearTimeout(introTimerId);
    introTimerId = null;
  }
  if (introScreen) {
    introScreen.classList.add("hidden");
  }
}

function showIntro() {
  hideResultsScreen();
  hideDifficultyScreen();
  if (introScreen) {
    introScreen.classList.remove("hidden");
    initIntroParticles();

    if (introTimerId) clearTimeout(introTimerId);
    introTimerId = setTimeout(() => {
      hideIntro();
      showDifficultyScreen();
    }, 8500);
  }
}

// 2. Difficulty Screen
function showDifficultyScreen() {
  hideIntro();
  hideResultsScreen();
  if (difficultyScreen) {
    difficultyScreen.classList.remove("hidden");
  }
}

function hideDifficultyScreen() {
  if (difficultyScreen) {
    difficultyScreen.classList.add("hidden");
  }
}

// 3. Results Screen
function showResultsScreen(reason) {
  stopTimer();
  stopSound(countdownSound);
  hideDifficultyScreen();

  const config = DIFFICULTY_CONFIG[selectedDifficulty];
  const isVictory = questionCount >= MAX_QUESTIONS;

  if (isVictory) {
    resultsIcon.textContent = "🏆";
    resultsTitle.textContent = "CHALLENGE COMPLETE!";
    resultsMessage.textContent = "Spectacular job! You solved all 10 puzzles!";
  } else {
    resultsIcon.textContent = "⏰";
    resultsTitle.textContent = "TIME'S UP!";
    resultsMessage.textContent = "Good effort! Practice your speed and try again!";
  }

  resultsFinalScore.textContent = String(score);
  resultsPtsRate.textContent = `${config.pointsPerQuestion} pts per correct answer`;

  resultsDifficultyBadge.textContent = config.badge;
  resultsDifficultyBadge.className = `rstat-badge ${config.badgeClass}`;

  resultsCorrectCount.textContent = `${correctAnswersCount} / ${MAX_QUESTIONS}`;

  const accuracy = Math.round((correctAnswersCount / MAX_QUESTIONS) * 100);
  resultsAccuracy.textContent = `${accuracy}%`;

  if (isVictory) {
    const elapsed = config.seconds - timeLeft;
    resultsTimeStat.textContent = `${elapsed}s used (${timeLeft}s left)`;
  } else {
    resultsTimeStat.textContent = `${config.seconds}s (Expired)`;
  }

  resultsPlayAgainBtn.textContent = `Play Again (${config.badge}) 🔄`;

  if (resultsScreen) {
    resultsScreen.classList.remove("hidden");
  }
}

function hideResultsScreen() {
  if (resultsScreen) {
    resultsScreen.classList.add("hidden");
  }
}

// ==========================================
// Difficulty Selection & Game Lifecycle
// ==========================================

function applyDifficulty(modeKey) {
  if (!DIFFICULTY_CONFIG[modeKey]) return;
  selectedDifficulty = modeKey;
  const config = DIFFICULTY_CONFIG[modeKey];

  if (modeStatDisplay) {
    modeStatDisplay.textContent = config.name;
  }
  if (currentModeBadge) {
    currentModeBadge.textContent = config.badge;
    currentModeBadge.className = `mode-pill-badge ${config.badgeClass}`;
  }
  if (timeDisplay && !gameActive) {
    timeDisplay.textContent = `${config.seconds}s`;
  }
}

function startNewGame() {
  unlockAudio();
  stopAllSounds();
  stopTimer();
  hideDifficultyScreen();
  hideResultsScreen();

  const config = DIFFICULTY_CONFIG[selectedDifficulty];

  score = 0;
  questionCount = 0;
  correctAnswersCount = 0;
  timeLeft = config.seconds;
  gameActive = true;
  questionActive = false;

  scoreDisplay.textContent = "0";
  questionNumber.textContent = `1 / ${MAX_QUESTIONS}`;
  timeDisplay.textContent = `${timeLeft}s`;
  timeDisplay.classList.remove("urgent");

  startButton.disabled = true;
  startButton.textContent = "Game in progress";

  setStatus(`Challenge mode: ${config.name} (${config.seconds}s). Good luck!`);

  startTimer();
  loadQuestion();
}

function setStatus(message) {
  status.textContent = message;
}

function stopTimer() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
  stopSound(countdownSound);
}

function finishGame(message) {
  gameActive = false;
  questionActive = false;

  stopTimer();
  stopSound(countdownSound);

  answerInput.disabled = true;
  submitButton.disabled = true;
  startButton.disabled = false;
  startButton.textContent = "Play Again";

  showResultsScreen(message);
  autoSubmitScore();
}

// Auto-submit score for authenticated users (Theme 4 - Virtual Identity)
async function autoSubmitScore() {
  const saveStatus = document.querySelector("#save-status");

  try {
    const authRes = await fetch("/api/auth/me");
    if (!authRes.ok) {
      if (saveStatus) saveStatus.textContent = "Login to save your scores";
      return;
    }

    const authData = await authRes.json();
    if (!authData.success || !authData.user) {
      if (saveStatus) saveStatus.textContent = "Login to save your scores";
      return;
    }

    if (saveStatus) saveStatus.textContent = "Saving score...";

    const gameStatus = questionCount >= MAX_QUESTIONS ? "completed" : "timeout";

    const scoreRes = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        difficulty: selectedDifficulty,
        score,
        correctAnswers: correctAnswersCount,
        totalQuestions: MAX_QUESTIONS,
        gameStatus
      })
    });

    if (scoreRes.ok) {
      if (saveStatus) saveStatus.textContent = "Score saved to your profile!";
    } else {
      if (saveStatus) saveStatus.textContent = "Could not save score";
    }
  } catch (err) {
    console.warn("Auto-submit score error:", err);
    if (saveStatus) saveStatus.textContent = "Could not save score";
  }
}

function startTimer() {
  stopTimer();

  timerId = setInterval(() => {
    if (!gameActive) {
      stopTimer();
      stopSound(countdownSound);
      return;
    }

    timeLeft -= 1;
    timeDisplay.textContent = `${timeLeft}s`;

    // Final 10 seconds: urgent visual and sound effect
    const isUrgent = timeLeft <= 10;
    timeDisplay.classList.toggle("urgent", isUrgent);

    if (timeLeft <= 10 && timeLeft > 0) {
      playCountdownSound(timeLeft);
    }

    if (timeLeft <= 0) {
      timeLeft = 0;
      timeDisplay.textContent = "0s";
      stopAllSounds();
      finishGame("⏰ Time's up!");
    }
  }, 1000);
}

async function loadQuestion() {
  if (!gameActive) return;

  questionActive = false;
  answerInput.disabled = true;
  submitButton.disabled = true;
  image.hidden = true;
  loading.hidden = false;
  loading.textContent = "Loading puzzle…";

  try {
    const response = await fetch("/api/question");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not load puzzle.");
    }

    if (!gameActive) return;

    image.onload = () => {
      if (!gameActive) return;

      loading.hidden = true;
      image.hidden = false;
      questionActive = true;
      answerInput.disabled = false;
      submitButton.disabled = false;
      answerInput.value = "";
      answerInput.focus();

      setStatus("Puzzle loaded. What's your answer?");
    };

    image.onerror = () => {
      if (!gameActive) return;

      loading.hidden = false;
      loading.textContent = "Puzzle image failed to load.";
      finishGame("The puzzle could not be loaded.");
    };

    image.src = data.imageUrl;
  } catch (error) {
    if (!gameActive) return;

    loading.hidden = false;
    loading.textContent = "Puzzle unavailable.";
    finishGame(error.message);
  }
}

// ==========================================
// Event Listeners
// ==========================================

// Intro Screen Actions
if (introStartButton) {
  introStartButton.addEventListener("click", () => {
    unlockAudio();
    hideIntro();
    showDifficultyScreen();
  });
}

if (skipIntroButton) {
  skipIntroButton.addEventListener("click", () => {
    unlockAudio();
    hideIntro();
    showDifficultyScreen();
  });
}

if (replayIntroButton) {
  replayIntroButton.addEventListener("click", () => {
    stopTimer();
    stopAllSounds();
    showIntro();
  });
}

// Difficulty Card Click Handlers
difficultyCards.forEach((card) => {
  card.addEventListener("click", () => {
    const mode = card.dataset.difficulty;
    applyDifficulty(mode);
    startNewGame();
  });
});

// Change Mode Button from Gameplay Screen
if (changeDifficultyBtn) {
  changeDifficultyBtn.addEventListener("click", () => {
    stopTimer();
    stopAllSounds();
    showDifficultyScreen();
  });
}

// Results Screen Actions
if (resultsPlayAgainBtn) {
  resultsPlayAgainBtn.addEventListener("click", () => {
    hideResultsScreen();
    startNewGame();
  });
}

if (resultsChangeDifficultyBtn) {
  resultsChangeDifficultyBtn.addEventListener("click", () => {
    hideResultsScreen();
    showDifficultyScreen();
  });
}

// Main Game Card Start/Play Again Button
startButton.addEventListener("click", () => {
  startNewGame();
});

// Answer Submission
answerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!gameActive || !questionActive) return;

  const guess = answerInput.value.trim();

  if (guess === "") {
    setStatus("Enter an answer first.");
    return;
  }

  questionActive = false;
  answerInput.disabled = true;
  submitButton.disabled = true;

  setStatus("Checking your answer…");

  try {
    const response = await fetch("/api/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ guess })
    });

    const data = await response.json();

    if (!gameActive) return;

    if (!response.ok) {
      throw new Error(data.error || "Could not check answer.");
    }

    if (data.correct) {
      playCorrectSound();

      const config = DIFFICULTY_CONFIG[selectedDifficulty];
      score += config.pointsPerQuestion;
      questionCount += 1;
      correctAnswersCount += 1;

      scoreDisplay.textContent = String(score);
      questionNumber.textContent = `${Math.min(questionCount + 1, MAX_QUESTIONS)} / ${MAX_QUESTIONS}`;

      if (questionCount >= MAX_QUESTIONS) {
        stopSound(countdownSound);
        finishGame("🏆 You completed all ten questions!");
        return;
      }

      setStatus(`✅ Correct (+${config.pointsPerQuestion} pts)! Loading next…`);
      await loadQuestion();
    } else {
      playWrongSound();

      questionActive = true;
      answerInput.disabled = false;
      submitButton.disabled = false;
      answerInput.focus();

      setStatus("❌ Not quite. Try again!");
    }
  } catch (error) {
    if (!gameActive) return;

    questionActive = true;
    answerInput.disabled = false;
    submitButton.disabled = false;

    setStatus(error.message);
  }
});

// ==========================================
// Initialization
// ==========================================
applyDifficulty("easy");
showIntro();
