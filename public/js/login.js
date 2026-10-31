// ==========================================
// Login Page Controller
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#login-form");
  const feedback = document.querySelector("#auth-feedback");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.querySelector("#username")?.value.trim();
    const password = document.querySelector("#password")?.value;

    if (!username || !password) {
      if (feedback) feedback.textContent = "Please fill in all fields.";
      return;
    }

    if (feedback) {
      feedback.style.color = "#ffd700";
      feedback.textContent = "Connecting to player portal...";
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        if (feedback) {
          feedback.style.color = "#34d399";
          feedback.textContent = data.message || "Login successful! Redirecting...";
        }
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1000);
      } else {
        if (feedback) {
          feedback.style.color = "#f87171";
          feedback.textContent = data.error || data.message || "Login failed.";
        }
      }
    } catch (err) {
      if (feedback) {
        feedback.style.color = "#f87171";
        feedback.textContent = "Network error connecting to login service.";
      }
    }
  });
});

