// ================================================================
// Banana Surfers – Audio Engine (Web Audio API Synthesizers)
// ================================================================
const AudioEngine = (() => {
  let ctx = null;

  function getContext() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function playTone(freq, type, duration, volume = 0.2) {
    const ac = getContext();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    gain.gain.setValueAtTime(volume, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.start();
    osc.stop(ac.currentTime + duration);
  }

  return {
    unlock() { getContext(); },

    // Coin / banana pickup – bright chirp
    playBananaPickup() {
      const ac = getContext();
      const t = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(1760, t + 0.08);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.start(t);
      osc.stop(t + 0.12);
    },

    // Crate pickup – deeper resonant thud
    playCratePickup() {
      const ac = getContext();
      const t = ac.currentTime;
      // Thud
      const osc1 = ac.createOscillator();
      const g1 = ac.createGain();
      osc1.connect(g1); g1.connect(ac.destination);
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(200, t);
      osc1.frequency.exponentialRampToValueAtTime(80, t + 0.3);
      g1.gain.setValueAtTime(0.3, t);
      g1.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc1.start(t); osc1.stop(t + 0.3);
      // Sparkle
      const osc2 = ac.createOscillator();
      const g2 = ac.createGain();
      osc2.connect(g2); g2.connect(ac.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1200, t + 0.05);
      osc2.frequency.exponentialRampToValueAtTime(2400, t + 0.2);
      g2.gain.setValueAtTime(0.12, t + 0.05);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc2.start(t + 0.05); osc2.stop(t + 0.25);
    },

    // Correct answer chime – ascending arpeggio
    playCorrect() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        setTimeout(() => playTone(freq, "sine", 0.25, 0.18), i * 80);
      });
    },

    // Wrong answer buzzer
    playWrong() {
      playTone(180, "sawtooth", 0.35, 0.2);
    },

    // Crash / game over
    playCrash() {
      const ac = getContext();
      const t = ac.currentTime;
      // Noise burst via oscillator detuning
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.5);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.start(t); osc.stop(t + 0.5);
    },

    // Bullet time whoosh
    playBulletTime() {
      const ac = getContext();
      const t = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(2000, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.6);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(t); osc.stop(t + 0.6);
    },

    // Powerup activation – ascending sweep
    playPowerup() {
      const ac = getContext();
      const t = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(1600, t + 0.4);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.start(t); osc.stop(t + 0.5);
    },

    // Jump sound
    playJump() {
      const ac = getContext();
      const t = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(t); osc.stop(t + 0.15);
    },

    // Slide sound
    playSlide() {
      playTone(150, "triangle", 0.2, 0.08);
    }
  };
})();

