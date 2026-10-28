
const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

// Official Banana API, documented by the provider.
const BANANA_API =
  "http://marcconrad.com/uob/banana/api.php?out=json";

let currentQuestion = null;

// Request a new puzzle from the external API.
app.get("/api/question", async (req, res) => {
  try {
    const response = await fetch(BANANA_API, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Banana API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.question || data.solution === undefined) {
      throw new Error("Unexpected Banana API response");
    }

    // Keep the answer on the server, not in the browser.
    currentQuestion = {
      imageUrl: data.question,
      solution: Number(data.solution),
    };

    res.json({ imageUrl: currentQuestion.imageUrl });
  } catch (error) {
    console.error("Banana API error:", error.message);
    res.status(502).json({
      error: "Could not load a puzzle. Please try again.",
    });
  }
});

// Check the player's answer on the server.
app.post("/api/answer", (req, res) => {
  if (!currentQuestion) {
    return res.status(400).json({
      error: "Load a puzzle before submitting an answer.",
    });
  }

  const guess = req.body?.guess;

  if (
    guess === undefined ||
    guess === null ||
    String(guess).trim() === "" ||
    !/^\d+$/.test(String(guess).trim())
  ) {
    return res.status(400).json({
      error: "Enter a valid number.",
    });
  }

  const correct = Number(guess) === currentQuestion.solution;

  res.json({
    correct,
    message: correct ? "Correct! Well done." : "Not quite. Try again!",
  });

  // A correct answer ends this question. The next request loads another.
  if (correct) {
    currentQuestion = null;
  }
});

app.listen(PORT, () => {
  console.log(`Banana Brain Quest running at http://localhost:${PORT}`);
});
