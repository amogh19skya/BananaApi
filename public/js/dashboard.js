// ==========================================
// Player Dashboard Controller
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.querySelector("#logout-btn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch (e) {
        // Ignore network errors on logout
      }
      window.location.href = "login.html";
    });
  }
});

