// ================================================================
// Banana Surfers – Power-Up System
// Banana Magnet, Super Sneakers, Jetpack, Golden Hoverboard, 2x Multiplier
// ================================================================
const PowerupManager = (() => {
  const POWERUPS = [
    {
      id: "MAGNET",
      name: "BANANA MAGNET",
      duration: 14,
      icon: "🧲",
      desc: "Pulls all bananas from all 3 lanes automatically!"
    },
    {
      id: "JETPACK",
      name: "BANANA JETPACK",
      duration: 12,
      icon: "🚀",
      desc: "Soar above all hazards and collect sky bananas!"
    },
    {
      id: "SNEAKERS",
      name: "SUPER SNEAKERS",
      duration: 16,
      icon: "👟",
      desc: "Super jump height to clear any obstacle!"
    },
    {
      id: "HOVERBOARD",
      name: "GOLDEN HOVERBOARD",
      duration: 25,
      icon: "🛹",
      desc: "Crash shield protection! Absorb 1 collision!"
    },
    {
      id: "MULTIPLIER",
      name: "2x MULTIPLIER",
      duration: 20,
      icon: "✨",
      desc: "Doubles all points and banana values!"
    }
  ];

  let activePowerup = null; // { id, name, icon, duration, timeLeft }
  let scoreMultiplier = 1;

  // HUD elements
  const hudPowerup = document.getElementById("hud-powerup");
  const powerupBarFill = document.getElementById("powerup-bar-fill");
  const powerupNameEl = document.getElementById("powerup-name");
  const powerupIconEl = document.getElementById("powerup-icon");
  const hudMultiplier = document.getElementById("hud-multiplier");

  function getRandomPowerup() {
    return POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
  }

  function activate(powerupDef) {
    // If an existing powerup of another type is active, deactivate its visual first
    if (activePowerup && activePowerup.id !== powerupDef.id) {
      Player.applyPowerupVisuals(activePowerup.id, false);
    }

    activePowerup = {
      id: powerupDef.id,
      name: powerupDef.name,
      icon: powerupDef.icon,
      duration: powerupDef.duration,
      timeLeft: powerupDef.duration
    };

    // Update HUD
    if (hudPowerup) {
      hudPowerup.classList.remove("hidden");
      if (powerupNameEl) powerupNameEl.textContent = powerupDef.name;
      if (powerupIconEl) powerupIconEl.textContent = powerupDef.icon;
      if (powerupBarFill) powerupBarFill.style.width = "100%";
    }

    // Apply mechanics & 3D Avatar visuals
    Player.applyPowerupVisuals(powerupDef.id, true);

    if (powerupDef.id === "MULTIPLIER") {
      scoreMultiplier = 2;
      if (hudMultiplier) hudMultiplier.classList.remove("hidden");
    }

    AudioEngine.playPowerup();
  }

  function update(delta) {
    if (!activePowerup) return;

    activePowerup.timeLeft -= delta;

    // Update HUD energy bar
    const pct = Math.max(0, activePowerup.timeLeft / activePowerup.duration);
    if (powerupBarFill) powerupBarFill.style.width = (pct * 100) + "%";

    if (activePowerup.timeLeft <= 0) {
      deactivate();
    }
  }

  function deactivate() {
    if (!activePowerup) return;

    // Remove avatar visual attachment
    Player.applyPowerupVisuals(activePowerup.id, false);

    if (activePowerup.id === "MULTIPLIER") {
      scoreMultiplier = 1;
      if (hudMultiplier) hudMultiplier.classList.add("hidden");
    }

    activePowerup = null;
    if (hudPowerup) hudPowerup.classList.add("hidden");
  }

  function reset() {
    if (activePowerup) {
      Player.applyPowerupVisuals(activePowerup.id, false);
    }
    activePowerup = null;
    scoreMultiplier = 1;
    if (hudPowerup) hudPowerup.classList.add("hidden");
    if (hudMultiplier) hudMultiplier.classList.add("hidden");
  }

  return {
    getRandomPowerup,
    activate,
    update,
    deactivate,
    reset,
    getActive: () => activePowerup,
    getMultiplier: () => scoreMultiplier,
    isActive: (id) => activePowerup && activePowerup.id === id,
    POWERUPS
  };
})();
