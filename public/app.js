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

// Intro Screen DOM Elements
const introScreen = document.querySelector("#intro-screen");
const introStartButton = document.querySelector("#intro-start-button");
const skipIntroButton = document.querySelector("#skip-intro-btn");
const replayIntroButton = document.querySelector("#replay-intro-btn");
const introParticlesContainer = document.querySelector("#intro-particles");

const ROUND_SECONDS = 60;
const MAX_QUESTIONS = 10;
const POINTS_PER_ANSWER = 10;

let score = 0;
let questionCount = 0;
let timeLeft = ROUND_SECONDS;
let questionActive = false;
let gameActive = false;
let timerId = null;
let introTimerId = null;

// ==========================================
// Professional Audio & Sound Effects System
// ==========================================
const countdownSound = new Audio("sounds/countdown.mp3");
const correctSound = new Audio("sounds/correct.mp3");
const wrongSound = new Audio("sounds/wrong.mp3");

// Preload audio files so they trigger with zero latency
countdownSound.preload = "auto";
correctSound.preload = "auto";
wrongSound.preload = "auto";

// Balanced, noticeable, but not excessively loud volume levels
countdownSound.volume = 0.6;
correctSound.volume = 0.65;
wrongSound.volume = 0.55;

let isAudioUnlocked = false;

// Initialize / unlock audio on first user gesture (e.g., clicking Start Game)
function unlockAudio() {
  if (isAudioUnlocked) return;
  [countdownSound, correctSound, wrongSound].forEach((audio) => {
    audio.load();
  });
  isAudioUnlocked = true;
}

// Safely play an audio element, catching browser autoplay or interruption errors
function safePlay(audio) {
  const promise = audio.play();
  if (promise !== undefined) {
    promise.catch((err) => {
      // Browser autoplay policy or interruption handled gracefully
      console.warn("Audio playback prevented or interrupted:", err.message);
    });
  }
}

// Stop a specific audio element and rewind to beginning
function stopSound(audio) {
  audio.pause();
  audio.currentTime = 0;
}

// Stop all sound effects immediately
function stopAllSounds() {
  stopSound(countdownSound);
  stopSound(correctSound);
  stopSound(wrongSound);
}

// Play celebratory sound on correct answer (plays once, doesn't overlap)
function playCorrectSound() {
  stopSound(wrongSound);
  stopSound(correctSound);
  safePlay(correctSound);
}

// Play buzzer / error sound on incorrect answer (plays once, doesn't overlap)
function playWrongSound() {
  stopSound(correctSound);
  stopSound(wrongSound);
  safePlay(wrongSound);
}

// Play countdown ticking / beeping during the final 10 seconds
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
// Animated Opening Intro Screen Controller
// ==========================================

// Generate floating mathematical symbols and glowing particles
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

// Hide the intro screen and show the main game menu
function hideIntro() {
  if (introTimerId) {
    clearTimeout(introTimerId);
    introTimerId = null;
  }
  if (introScreen) {
    introScreen.classList.add("hidden");
  }
}

// Show the intro screen with animation & auto-advance timer
function showIntro() {
  if (introScreen) {
    introScreen.classList.remove("hidden");
    initIntroParticles();

    // Auto-advance to main menu after the intro animation showcase (8.5 seconds)
    if (introTimerId) clearTimeout(introTimerId);
    introTimerId = setTimeout(() => {
      hideIntro();
    }, 8500);
  }
}

// Event: Skip Intro button
if (skipIntroButton) {
  skipIntroButton.addEventListener("click", () => {
    hideIntro();
  });
}

// Event: START GAME clicked from opening screen
if (introStartButton) {
  introStartButton.addEventListener("click", () => {
    hideIntro();
    // Launch the existing game immediately
    startButton.click();
  });
}

// Event: Replay opening intro from game footer
if (replayIntroButton) {
  replayIntroButton.addEventListener("click", () => {
    showIntro();
  });
}

// ==========================================
// Existing Game Logic & Banana API Handlers
// ==========================================

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

  setStatus(
    `${message} Final score: ${score} points. ` +
    `Correct answers: ${questionCount}/${MAX_QUESTIONS}.`
  );
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

    // Turn the timer red during the final 10 seconds.
    const isUrgent = timeLeft <= 10;
    timeDisplay.classList.toggle("urgent", isUrgent);

    // Countdown sound: only during final 10 seconds (never during first 50 seconds)
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

// Event-driven programming: start or restart the game.
startButton.addEventListener("click", async () => {
  // Unlock audio and reset previous sounds on player interaction
  unlockAudio();
  stopAllSounds();
  stopTimer();

  score = 0;
  questionCount = 0;
  timeLeft = ROUND_SECONDS;
  gameActive = true;
  questionActive = false;

  scoreDisplay.textContent = "0";
  questionNumber.textContent = `1 / ${MAX_QUESTIONS}`;
  timeDisplay.textContent = `${timeLeft}s`;

  // Reset the red timer colour when a new game starts.
  timeDisplay.classList.remove("urgent");

  startButton.disabled = true;
  startButton.textContent = "Game in progress";

  setStatus("Starting your challenge…");

  startTimer();
  await loadQuestion();
});

// Event-driven programming: process submitted answers.
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
      // 1. Play celebration sound
      playCorrectSound();

      // 2. Increment score & question count
      score += POINTS_PER_ANSWER;
      questionCount += 1;

      scoreDisplay.textContent = String(score);
      questionNumber.textContent =
        `${Math.min(questionCount + 1, MAX_QUESTIONS)} / ${MAX_QUESTIONS}`;

      // Check if game is completed
      if (questionCount >= MAX_QUESTIONS) {
        stopSound(countdownSound);
        finishGame("🏆 You completed all ten questions!");
        return;
      }

      setStatus("✅ Correct! Loading the next puzzle…");
      await loadQuestion();
    } else {
      // 1. Play buzzer / error sound
      playWrongSound();

      // 2. Keep existing incorrect answer feedback and allow retry
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

// Initialize Opening Screen on page load
showIntro();
