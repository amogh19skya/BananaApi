// ==========================================
// Leaderboard Page Controller
// Global & mode-specific rankings with tie-breakers,
// one best entry per player, and current user highlighting.
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab-btn");
  const tableBody = document.querySelector("#leaderboard-body");

  // Format mode display label
  function formatMode(modeKey) {
    if (!modeKey) return "EASY";
    if (modeKey === "extraHard") return "EXTRA HARD";
    return modeKey.toUpperCase();
  }

  // Format mode CSS class
  function getModeClass(modeKey) {
    if (!modeKey) return "badge-easy";
    if (modeKey === "extraHard") return "badge-extraHard";
    return `badge-${modeKey.toLowerCase()}`;
  }

  async function fetchLeaderboard(difficulty = "all") {
    try {
      const response = await fetch(`/api/leaderboard?difficulty=${difficulty}`);
      const data = await response.json();

      if (data && data.rankings && data.rankings.length > 0) {
        tableBody.innerHTML = data.rankings.map((r) => {
          const rankDisplay = r.rank <= 3
            ? `<span class="rank-pill rank-${r.rank}">#${r.rank}</span>`
            : `<span class="rank-pill" style="color: var(--text-muted, #d1c4e9);">#${r.rank}</span>`;

          const rowClass = r.isCurrentUser ? 'class="current-user-row"' : '';
          const youTag = r.isCurrentUser ? '<span class="you-badge">YOU</span>' : '';

          return `
            <tr ${rowClass}>
              <td>${rankDisplay}</td>
              <td><strong>${r.username}</strong>${youTag}</td>
              <td><span class="mode-badge ${getModeClass(r.difficulty)}">${formatMode(r.difficulty)}</span></td>
              <td><strong>${r.score}</strong></td>
              <td>${r.accuracy}%</td>
            </tr>
          `;
        }).join("");
      } else {
        const modeLabel = difficulty === "all" ? "any difficulty" : `${formatMode(difficulty)} mode`;
        tableBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; color: var(--text-muted, #d1c4e9); padding: 28px;">
              No scores recorded yet for ${modeLabel}. Be the first to set a record!
            </td>
          </tr>
        `;
      }
    } catch (err) {
      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; color: #f87171; padding: 24px;">
              Could not load leaderboard data. Please check your connection and try again.
            </td>
          </tr>
        `;
      }
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      fetchLeaderboard(tab.dataset.difficulty);
    });
  });

  // Initial load
  fetchLeaderboard("all");
});
