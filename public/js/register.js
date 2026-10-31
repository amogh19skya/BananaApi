// ==========================================
// Register Page Controller
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#register-form");
  const feedback = document.querySelector("#auth-feedback");
  const submitBtn = document.querySelector("#register-submit-btn");

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

    const username = document.querySelector("#reg-username")?.value.trim();
    const email = document.querySelector("#reg-email")?.value.trim();
    const password = document.querySelector("#reg-password")?.value;
    const confirmPassword = document.querySelector("#reg-confirm-password")?.value;

    // Client-side field validation
    if (!username || !email || !password || !confirmPassword) {
      setFeedback("Please fill in all fields.");
      return;
    }

    if (username.length < 3 || username.length > 50) {
      setFeedback("Username must be between 3 and 50 characters.");
      return;
    }

    if (password.length < 6) {
      setFeedback("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setFeedback("Passwords do not match.");
      return;
    }

    // Set loading state
    setFeedback("Creating your account...", "loading");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "CREATING ACCOUNT... ⏳";
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          email,
          password,
          confirmPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setFeedback(data.message || "Registration successful! Redirecting to login...", "success");
        form.reset();

        setTimeout(() => {
          window.location.href = "login.html";
        }, 1500);
      } else {
        setFeedback(data.error || "Registration failed. Please check your details.");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "CREATE ACCOUNT ➔";
        }
      }
    } catch (err) {
      console.error("Registration request error:", err);
      setFeedback("Unable to connect to the server. Please check your network and try again.");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "CREATE ACCOUNT ➔";
      }
    }
  });
});
