// ==========================================
// Player Dashboard Controller
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  const logoutBtn = document.querySelector("#logout-btn");
  const usernameHeading = document.querySelector("#player-username");

  // Fetch authenticated user profile
  try {
    const response = await fetch("/api/auth/me");
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.user && usernameHeading) {
        usernameHeading.textContent = `${data.user.username}'s Dashboard`;
      }
    } else {
      // If not authenticated, redirect to login
      window.location.href = "login.html";
      return;
    }
  } catch (error) {
    console.warn("Could not retrieve user session profile:", error);
  }

  // Handle logout
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
