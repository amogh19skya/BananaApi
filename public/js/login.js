// ==========================================
// Login Page Controller
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#login-form");
  const feedback = document.querySelector("#auth-feedback");
  const submitBtn = document.querySelector("#login-submit-btn");

  if (!form) return;

  function setFeedback(message, type = "error") {
    if (!feedback) return;
    feedback.textContent = message;
    if (type === "success") {
      feedback.style.color = "#34d399";
      feedback.style.textShadow = "0 0 10px rgba(52, 211, 153, 0.4)";
    } else if (type === "loading") {
      feedback.style.color = "#ffd700";
      feedback.style.textShadow = "0 0 10px rgba(255, 215, 0, 0.4)";
    } else {
      feedback.style.color = "#f87171";
      feedback.style.textShadow = "0 0 10px rgba(248, 113, 113, 0.4)";
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.querySelector("#username")?.value.trim();
    const password = document.querySelector("#password")?.value;

    if (!username || !password) {
      setFeedback("Please enter your username or email, and password.");
      return;
    }

    // Set loading state
    setFeedback("Authenticating challenger...", "loading");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "LOGGING IN... ⏳";
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setFeedback(data.message || "Login successful! Loading game...", "success");

        setTimeout(() => {
          window.location.href = "/runner";
        }, 1000);
      } else {
        setFeedback(data.error || "Login failed. Please check your credentials.");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "LOGIN TO QUEST ➔";
        }
      }
    } catch (err) {
      console.error("Login request error:", err);
      setFeedback("Unable to connect to login service. Please check your network and try again.");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "LOGIN TO QUEST ➔";
      }
    }
  });
});
