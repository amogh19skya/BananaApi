// ==========================================
// Leaderboard Page Controller
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab-btn");
  const tableBody = document.querySelector("#leaderboard-body");

  async function fetchLeaderboard(difficulty = "all") {
    try {
      const response = await fetch(`/api/leaderboard?difficulty=${difficulty}`);
      const data = await response.json();

      if (data && data.rankings && data.rankings.length > 0) {
        tableBody.innerHTML = data.rankings.map((r, i) => `
          <tr>
            <td><span class="rank-pill rank-${i+1}">#${i+1}</span></td>
            <td><strong>${r.username}</strong></td>
            <td><span class="mode-badge badge-${r.difficulty}">${r.difficulty}</span></td>
            <td><strong>${r.score}</strong></td>
            <td>${r.accuracy}%</td>
          </tr>
        `).join("");
      } else {
        tableBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">
              No scores recorded yet for ${difficulty === "all" ? "any difficulty" : difficulty + " mode"}. Be the first to set a record!
            </td>
          </tr>
        `;
      }
    } catch (err) {
      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; color: #f87171; padding: 20px;">
              Could not load leaderboard data.
            </td>
          </tr>
        `;
      }
    }
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      fetchLeaderboard(tab.dataset.difficulty);
    });
  });

  fetchLeaderboard("all");
});

