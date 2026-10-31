// ==========================================
// Player Dashboard Controller
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  const logoutBtn = document.querySelector("#logout-btn");
  const usernameHeading = document.querySelector("#player-username");
  const totalGamesEl = document.querySelector("#dash-total-games");
  const bestScoreEl = document.querySelector("#dash-best-score");
  const accuracyEl = document.querySelector("#dash-accuracy");
  const historyContainer = document.querySelector("#history-container");

  // Fetch authenticated user profile
  let currentUser = null;
  try {
    const response = await fetch("/api/auth/me");
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.user) {
        currentUser = data.user;
        if (usernameHeading) {
          usernameHeading.textContent = `${data.user.username}'s Dashboard`;
        }
      }
    } else {
      // If not authenticated, redirect to login
      window.location.href = "login.html";
      return;
    }
  } catch (error) {
    console.warn("Could not retrieve user session profile:", error);
    window.location.href = "login.html";
    return;
  }

  // Fetch player stats and recent games
  if (currentUser) {
    try {
      const statsRes = await fetch(`/api/scores/user/${currentUser.userId}`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();

        if (statsData.success && statsData.stats) {
          if (totalGamesEl) totalGamesEl.textContent = statsData.stats.totalGames;
          if (bestScoreEl) bestScoreEl.textContent = statsData.stats.bestScore;
          if (accuracyEl) accuracyEl.textContent = `${statsData.stats.accuracy}%`;
        }

        // Populate recent games history
        if (historyContainer && statsData.scores && statsData.scores.length > 0) {
          historyContainer.innerHTML = "";
          statsData.scores.forEach((game) => {
            const item = document.createElement("div");
            item.className = "history-item";

            const diffBadge = game.difficulty === "extraHard" ? "EXTRA HARD"
              : game.difficulty.toUpperCase();
            const date = new Date(game.played_at).toLocaleDateString("en-GB", {
              day: "numeric", month: "short", year: "numeric"
            });

            item.innerHTML = `
              <span class="history-badge badge-${game.difficulty === 'extraHard' ? 'extra-hard' : game.difficulty}">${diffBadge}</span>
              <span class="history-score">Score: <strong>${game.score}</strong></span>
              <span class="history-detail">${game.correct_answers}/${game.total_questions} correct</span>
              <span class="history-date">${date}</span>
            `;
            historyContainer.appendChild(item);
          });
        }
      }
    } catch (err) {
      console.warn("Could not load player stats:", err);
    }
  }

  // Handle logout (Event-Driven Programming – Theme 3)
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch (e) {
        console.warn("Logout error:", e);
      }
      window.location.href = "login.html";
    });
  }
});
