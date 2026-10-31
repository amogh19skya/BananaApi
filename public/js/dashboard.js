// ==========================================
// Player Dashboard Controller
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  const logoutBtn = document.querySelector("#logout-btn");
  const usernameHeading = document.querySelector("#player-username");

  const totalGamesEl = document.querySelector("#dash-total-games");
  const bestScoreEl = document.querySelector("#dash-best-score");
  const accuracyEl = document.querySelector("#dash-accuracy");
  const totalBananasEl = document.querySelector("#dash-total-bananas");
  const totalDistanceEl = document.querySelector("#dash-total-distance");
  const historyContainer = document.querySelector("#history-container");
  const historyCountBadge = document.querySelector("#history-count-badge");

  let currentUser = null;

  // 1. Fetch authenticated user profile
  try {
    const authRes = await fetch("/api/auth/me");
    if (!authRes.ok) {
      window.location.href = "login.html";
      return;
    }
    const authData = await authRes.json();
    if (authData.success && authData.user) {
      currentUser = authData.user;
      if (usernameHeading) {
        usernameHeading.textContent = `${currentUser.username}'s Dashboard`;
      }
    } else {
      window.location.href = "login.html";
      return;
    }
  } catch (error) {
    console.warn("Could not retrieve session:", error);
    window.location.href = "login.html";
    return;
  }

  // 2. Fetch full dashboard stats and game history
  async function loadDashboardStats() {
    try {
      const res = await fetch("/api/scores/dashboard-stats");
      if (!res.ok) {
        throw new Error("Failed to load dashboard statistics");
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Could not retrieve stats");
      }

      const { stats, history } = data;

      // Update Summary Cards
      if (totalGamesEl) totalGamesEl.textContent = stats.totalGames.toLocaleString();
      if (bestScoreEl) bestScoreEl.textContent = stats.highestScore.toLocaleString();
      if (accuracyEl) accuracyEl.textContent = `${stats.averageAccuracy}%`;
      if (totalBananasEl) totalBananasEl.textContent = stats.totalBananas.toLocaleString();
      if (totalDistanceEl) totalDistanceEl.textContent = `${stats.totalDistance.toLocaleString()}m`;

      if (historyCountBadge) {
        historyCountBadge.textContent = `${history.length} ${history.length === 1 ? "Game" : "Games"}`;
      }

      // Render History Entries
      renderHistoryList(history);
    } catch (err) {
      console.error("Dashboard data load error:", err);
      if (historyContainer) {
        historyContainer.innerHTML = `
          <div class="history-empty-state">
            <span class="history-empty-icon">⚠️</span>
            <p>Could not load game records. Please refresh the page.</p>
          </div>
        `;
      }
    }
  }

  function renderHistoryList(history) {
    if (!historyContainer) return;

    if (!history || history.length === 0) {
      historyContainer.innerHTML = `
        <div class="history-empty-state">
          <span class="history-empty-icon">🎮</span>
          <p class="history-empty-text">No games played yet. Start your first run!</p>
          <a class="dash-btn" href="/runner" style="display: inline-block; margin-top: 10px;">🏃 Play Banana Surfers</a>
        </div>
      `;
      return;
    }

    historyContainer.innerHTML = "";

    history.forEach((game) => {
      const item = document.createElement("div");
      item.className = "history-card-item";

      // Format Difficulty
      let diffLabel = "🌱 EASY";
      let diffClass = "diff-easy";
      if (game.difficulty === "hard") {
        diffLabel = "⚡ HARD";
        diffClass = "diff-hard";
      } else if (game.difficulty === "extraHard") {
        diffLabel = "🔥 EXTRA HARD";
        diffClass = "diff-extraHard";
      }

      // Format Status
      let statusLabel = "GAME OVER";
      let statusClass = "status-gameover";
      const rawStatus = (game.game_status || "").toLowerCase();
      if (rawStatus === "completed") {
        statusLabel = "COMPLETED";
        statusClass = "status-completed";
      } else if (rawStatus === "abandoned") {
        statusLabel = "ABANDONED";
        statusClass = "status-abandoned";
      }

      // Format Date
      let dateStr = "Recent";
      if (game.played_at || game.end_time) {
        const d = new Date(game.played_at || game.end_time);
        dateStr = d.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
      }

      const scoreVal = Number(game.final_score || 0).toLocaleString();
      const distVal = Number(game.distance_meters || 0);
      const bananasVal = Number(game.bananas_collected || 0);
      const attempted = Number(game.questions_attempted || 0);
      const correct = Number(game.correct_answers || 0);
      const accuracy = Number(game.accuracy_percentage || 0);

      item.innerHTML = `
        <div class="hcard-left">
          <div class="hcard-badges-row">
            <span class="hbadge-diff ${diffClass}">${diffLabel}</span>
            <span class="hbadge-status ${statusClass}">${statusLabel}</span>
            <span class="hcard-date">${dateStr}</span>
          </div>
          <div class="hcard-stats-row">
            <span class="hstat-pill">🏁 <strong>${distVal}m</strong></span>
            <span class="hstat-pill">🍌 <strong>${bananasVal}</strong> bananas</span>
            <span class="hstat-pill">📦 <strong>${correct}/${attempted}</strong> solved</span>
            <span class="hstat-pill">🎯 <strong>${accuracy}%</strong> acc</span>
          </div>
        </div>
        <div class="hcard-right">
          <span class="hcard-score-num">${scoreVal}</span>
          <span class="hcard-score-lbl">SCORE</span>
        </div>
      `;

      historyContainer.appendChild(item);
    });
  }

  // Load stats initially
  loadDashboardStats();

  // 3. Handle Logout
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
