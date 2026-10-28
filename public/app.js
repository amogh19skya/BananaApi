
const image = document.querySelector("#puzzle-image");
const loading = document.querySelector("#loading");
const status = document.querySelector("#status");
const scoreDisplay = document.querySelector("#score");
const questionNumber = document.querySelector("#question-number");
const answerInput = document.querySelector("#answer");
const answerForm = document.querySelector("#answer-form");
const submitButton = document.querySelector("#submit-button");
const startButton = document.querySelector("#start-button");

let score = 0;
let questionCount = 0;
let questionActive = false;

function setStatus(message) {
  status.textContent = message;
}

async function loadQuestion() {
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

    image.onload = () => {
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
      loading.hidden = false;
      loading.textContent = "The puzzle image failed to load.";
      setStatus("Try loading the puzzle again.");
    };

    image.src = data.imageUrl;
  } catch (error) {
    loading.hidden = false;
    loading.textContent = "Puzzle unavailable.";
    setStatus(error.message);
  }
}

startButton.addEventListener("click", async () => {
  score = 0;
  questionCount = 0;
  scoreDisplay.textContent = score;
  questionNumber.textContent = "1";
  startButton.textContent = "Restart Game";
  setStatus("Starting your game…");
  await loadQuestion();
});

answerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!questionActive) return;

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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not check answer.");
    }

    if (data.correct) {
      score += 10;
      questionCount += 1;
      scoreDisplay.textContent = score;
      questionNumber.textContent = String(questionCount + 1);
      setStatus("✅ " + data.message + " Loading the next puzzle…");
      await loadQuestion();
    } else {
      questionActive = true;
      answerInput.disabled = false;
      submitButton.disabled = false;
      answerInput.focus();
      setStatus("❌ " + data.message);
    }
  } catch (error) {
    questionActive = true;
    answerInput.disabled = false;
    submitButton.disabled = false;
    setStatus(error.message);
  }
});
