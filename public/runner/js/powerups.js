// ================================================================
// Banana Surfers – Power-Up System
// Banana Magnet, Super Sneakers, Jetpack, Golden Hoverboard, 2x Multiplier
// ================================================================
const PowerupManager = (() => {
  const POWERUPS = [
    { id: "MAGNET",     name: "BANANA MAGNET",     duration: 12, color: 0xffd700, icon: "🧲" },
    { id: "SNEAKERS",   name: "SUPER SNEAKERS",    duration: 15, color: 0x22c55e, icon: "👟" },
    { id: "JETPACK",    name: "BANANA JETPACK",    duration: 10, color: 0x06b6d4, icon: "🚀" },
    { id: "HOVERBOARD", name: "GOLDEN HOVERBOARD", duration: 30, color: 0xffa500, icon: "🛹" },
    { id: "MULTIPLIER", name: "2x MULTIPLIER",     duration: 20, color: 0xa855f7, icon: "✖️" }
  ];

  let activePowerup = null; // { id, name, timeLeft, duration }
  let scoreMultiplier = 1;

  // HUD elements
  const hudPowerup = document.getElementById("hud-powerup");
  const powerupBarFill = document.getElementById("powerup-bar-fill");
  const powerupNameEl = document.getElementById("powerup-name");
  const hudMultiplier = document.getElementById("hud-multiplier");
  const hudMultiplierValue = document.getElementById("hud-multiplier-value");

  function getRandomPowerup() {
    return POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
  }

  function activate(powerupDef) {
    activePowerup = {
      id: powerupDef.id,
      name: powerupDef.name,
      duration: powerupDef.duration,
      timeLeft: powerupDef.duration
    };

    // HUD update
    if (hudPowerup) {
      hudPowerup.classList.remove("hidden");
      powerupNameEl.textContent = powerupDef.icon + " " + powerupDef.name;
    }

    // Apply immediate effects
    if (powerupDef.id === "MULTIPLIER") {
      scoreMultiplier = 2;
      if (hudMultiplier) hudMultiplier.classList.remove("hidden");
      if (hudMultiplierValue) hudMultiplierValue.textContent = "x2";
    }
    if (powerupDef.id === "HOVERBOARD") {
      Player.activateHoverboard(powerupDef.duration);
    }

    AudioEngine.playPowerup();
  }

  function update(delta) {
    if (!activePowerup) return;

    activePowerup.timeLeft -= delta;

    // Update HUD bar
    const pct = Math.max(0, activePowerup.timeLeft / activePowerup.duration);
    if (powerupBarFill) powerupBarFill.style.width = (pct * 100) + "%";

    if (activePowerup.timeLeft <= 0) {
      deactivate();
    }
  }

  function deactivate() {
    if (!activePowerup) return;

    if (activePowerup.id === "MULTIPLIER") {
      scoreMultiplier = 1;
      if (hudMultiplier) hudMultiplier.classList.add("hidden");
    }

    activePowerup = null;
    if (hudPowerup) hudPowerup.classList.add("hidden");
  }

  function reset() {
    deactivate();
    scoreMultiplier = 1;
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

