
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

const ROUND_SECONDS = 60;
const MAX_QUESTIONS = 10;
const POINTS_PER_ANSWER = 10;

let score = 0;
let questionCount = 0;
let timeLeft = ROUND_SECONDS;
let questionActive = false;
let gameActive = false;
let timerId = null;

function setStatus(message) {
  status.textContent = message;
}

function stopTimer() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

function finishGame(message) {
  gameActive = false;
  questionActive = false;

  stopTimer();

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
      return;
    }

    timeLeft -= 1;
    timeDisplay.textContent = `${timeLeft}s`;

    // Turn the timer red during the final 10 seconds.
    timeDisplay.classList.toggle("urgent", timeLeft <= 10);

    if (timeLeft <= 0) {
      timeLeft = 0;
      timeDisplay.textContent = "0s";
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
  stopTimer();

  score = 0;
  questionCount = 0;
  timeLeft = ROUND_SECONDS;
  gameActive = true;
  questionActive = false;

  scoreDisplay.textContent = "0";
  questionNumber.textContent = `1 / ${MAX_QUESTIONS}`;
  timeDisplay.textContent = `${timeLeft}s`;

  // IMPORTANT: reset the red timer colour when a new game starts.
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
      score += POINTS_PER_ANSWER;
      questionCount += 1;

      scoreDisplay.textContent = String(score);

      questionNumber.textContent =
        `${Math.min(questionCount + 1, MAX_QUESTIONS)} / ${MAX_QUESTIONS}`;

      if (questionCount >= MAX_QUESTIONS) {
        finishGame("🏆 You completed all ten questions!");
        return;
      }

      setStatus("✅ Correct! Loading the next puzzle…");
      await loadQuestion();
    } else {
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
