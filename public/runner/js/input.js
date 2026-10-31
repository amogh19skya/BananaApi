// ================================================================
// Banana Surfers – Input Manager (Keyboard + Touch Swipe)
// Supports tap, continuous key-hold, and touch swipe gestures
// ================================================================
const InputManager = (() => {
  const actions = {
    left: false, right: false,
    jump: false, slide: false,
    spaceDouble: false
  };

  const held = {
    slide: false
  };

  let lastSpaceTime = 0;
  const DOUBLE_TAP_THRESHOLD = 300; // ms

  // ---- Keyboard ----
  const keyMap = {
    ArrowLeft: "left", KeyA: "left",
    ArrowRight: "right", KeyD: "right",
    ArrowUp: "jump", KeyW: "jump", Space: "jump",
    ArrowDown: "slide", KeyS: "slide"
  };

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      const now = performance.now();
      if (now - lastSpaceTime < DOUBLE_TAP_THRESHOLD) {
        actions.spaceDouble = true;
      }
      lastSpaceTime = now;
    }
    const action = keyMap[e.code];
    if (action) {
      e.preventDefault();
      actions[action] = true;
      if (action === "slide") {
        held.slide = true;
      }
    }
  });

  document.addEventListener("keyup", (e) => {
    const action = keyMap[e.code];
    if (action === "slide") {
      held.slide = false;
    }
  });

  // ---- Touch Swipe ----
  let touchStartX = 0, touchStartY = 0;
  let touchStartTime = 0;
  let lastTapTime = 0;
  const MIN_SWIPE = 30; // px

  const touchZone = document.getElementById("touch-zone");
  if (touchZone) {
    touchZone.addEventListener("touchstart", (e) => {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartTime = performance.now();

      // Double-tap detection
      const now = performance.now();
      if (now - lastTapTime < DOUBLE_TAP_THRESHOLD) {
        actions.spaceDouble = true;
      }
      lastTapTime = now;
    }, { passive: true });

    touchZone.addEventListener("touchmove", (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const dy = touch.clientY - touchStartY;
        // If swiping down and holding
        if (dy > MIN_SWIPE) {
          actions.slide = true;
          held.slide = true;
        }
      }
    }, { passive: true });

    touchZone.addEventListener("touchend", (e) => {
      held.slide = false;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const elapsed = performance.now() - touchStartTime;

      if (elapsed > 500) return; // Too slow

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx < MIN_SWIPE && absDy < MIN_SWIPE) return; // Tap, not swipe

      if (absDx > absDy) {
        // Horizontal swipe
        actions[dx > 0 ? "right" : "left"] = true;
      } else {
        // Vertical swipe
        if (dy < 0) {
          actions.jump = true;
        } else {
          actions.slide = true;
        }
      }
    }, { passive: true });

    touchZone.addEventListener("touchcancel", () => {
      held.slide = false;
    });
  }

  // Window blur: release all held keys
  window.addEventListener("blur", () => {
    held.slide = false;
    for (const k in actions) actions[k] = false;
  });

  return {
    /** Consume an action (returns true once then auto-resets) */
    consume(action) {
      if (actions[action]) {
        actions[action] = false;
        return true;
      }
      return false;
    },
    /** Check if key/button is actively being held down */
    isHeld(action) {
      return !!held[action];
    },
    /** Peek without consuming */
    peek(action) {
      return actions[action];
    },
    /** Reset all */
    reset() {
      for (const k in actions) actions[k] = false;
      for (const k in held) held[k] = false;
    }
  };
})();
