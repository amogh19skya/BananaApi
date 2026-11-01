// ================================================================
// Banana Surfers – Articulated 3D Avatar & Controller
// Features stylized Banana Surfer mascot, running stride animations,
// and visible superpower attachments (Jetpack, Hoverboard, Magnet Aura)
// ================================================================
const Player = (() => {
  const LANE_WIDTH = 2.5;
  const LANES = [-1, 0, 1]; // Left (-2.5), Center (0), Right (+2.5)
  const LANE_SWITCH_SPEED = 16.0; // Snappy lane transition
  const BASE_JUMP_VELOCITY = 10.5;
  const GRAVITY = 26.0;
  const SLIDE_DURATION = 0.8;
  const NORMAL_HEIGHT = 1.4;
  const SLIDE_HEIGHT = 0.55;
  const JETPACK_ALTITUDE = 6.2;

  // Three.js Meshes & Nodes
  let rootGroup;
  let bodyGroup;
  let leftLeg, rightLeg;
  let leftArm, rightArm;
  let headMesh;

  // Superpower Attachment Nodes
  let jetpackAttachment;
  let jetpackFlames;
  let hoverboardAttachment;
  let magnetAuraRing;
  let multiplierCrown;
  let shieldGlowGroup;
  let shieldGlowMesh;
  let shieldRingMesh;
  let shieldLight;
  let shieldCharge = 0;

  // State
  let currentLane = 1; // Center
  let targetX = 0;
  let velocityY = 0;
  let positionY = NORMAL_HEIGHT / 2;
  let positionZ = 0;
  let isJumping = false;
  let isSliding = false;
  let slideTimer = 0;
  let isInvulnerable = false;
  let invulnerableTimer = 0;
  let runAnimClock = 0;

  // Active Superpowers State
  let isJetpackActive = false;
  let isSneakersActive = false;
  let isMagnetActive = false;
  let isHoverboardActive = false;
  let isMultiplierActive = false;

  const bbox = { width: 0.65, height: NORMAL_HEIGHT, depth: 0.65 };

  // ============================================================
  // Avatar Construction — Ninja Billboard Sprite
  // NinjaOne.png is loaded as a camera-facing PlaneGeometry billboard.
  // All physics, collision, lane-switching, superpower attachments and
  // animation state are fully preserved — only the visual mesh changes.
  // Invisible dummy Groups keep animation code running without errors.
  // ============================================================

  // Sprite mesh reference for pose transforms
  let ninjaSpriteBase = null;

  function buildAvatar(scene) {
    rootGroup = new THREE.Group();
    bodyGroup = new THREE.Group();
    rootGroup.add(bodyGroup);

    // ---- Shared materials for power-up attachments ----
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.9,
      roughness: 0.2
    });

    const neonCyanMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.85
    });

    // ---- Ninja Sprite Billboard ----
    // PlaneGeometry sized to match the character proportions.
    // The plane rotates 180° so the ninja faces the -Z (running) direction.
    const spriteW = 1.25;
    const spriteH = 1.55;
    const spriteGeo = new THREE.PlaneGeometry(spriteW, spriteH);

    const spriteMat = new THREE.MeshBasicMaterial({
      transparent: true,
      alphaTest: 0.05,
      depthWrite: false,
      side: THREE.DoubleSide,
      color: 0x777777    // dim placeholder tint until texture loads
    });

    ninjaSpriteBase = new THREE.Mesh(spriteGeo, spriteMat);
    // Shift sprite up so feet align with y=0 (ground level of bodyGroup)
    ninjaSpriteBase.position.set(0, spriteH / 2, 0);
    // Face into the running direction (-Z)
    ninjaSpriteBase.rotation.y = Math.PI;
    bodyGroup.add(ninjaSpriteBase);

    // Load the ninja texture asynchronously
    new THREE.TextureLoader().load(
      '/images/characters/NinjaOne.png',
      function (tex) {
        tex.magFilter = THREE.LinearFilter;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.generateMipmaps = true;
        if (ninjaSpriteBase) {
          ninjaSpriteBase.material.map = tex;
          ninjaSpriteBase.material.color.set(0xffffff); // full brightness
          ninjaSpriteBase.material.needsUpdate = true;
        }
      },
      undefined,
      function (err) {
        console.warn('Ninja texture failed to load — keeping placeholder:', err);
        // Show a visible cyan box so the player can still play
        if (ninjaSpriteBase) {
          ninjaSpriteBase.material.color.set(0x00ffff);
          ninjaSpriteBase.material.needsUpdate = true;
        }
      }
    );

    // ---- Invisible dummy limb Groups ----
    // The update() animation loop rotates these; keeping them as empty
    // THREE.Group objects means the math runs cleanly with zero render cost.
    leftLeg  = new THREE.Group();
    rightLeg = new THREE.Group();
    leftArm  = new THREE.Group();
    rightArm = new THREE.Group();
    headMesh = new THREE.Group();
    // (Not added to the scene — rotation state only)

    // ============================================================
    // Superpower Visual Attachments
    // ============================================================

    // 1. Jetpack (Twin Rockets + Animated Flame Cones)
    jetpackAttachment = new THREE.Group();
    jetpackAttachment.position.set(0, 0.65, -0.32);

    const rocketGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.55, 10);
    const rocketL = new THREE.Mesh(rocketGeo, chromeMat);
    rocketL.position.x = -0.16;
    const rocketR = new THREE.Mesh(rocketGeo, chromeMat);
    rocketR.position.x = 0.16;
    jetpackAttachment.add(rocketL);
    jetpackAttachment.add(rocketR);

    // Rocket thruster nozzles
    const nozzleGeo = new THREE.CylinderGeometry(0.12, 0.08, 0.12, 8);
    const nozMat = new THREE.MeshStandardMaterial({ color: 0x374151 });
    const nozL = new THREE.Mesh(nozzleGeo, nozMat);
    nozL.position.set(-0.16, -0.32, 0);
    const nozR = new THREE.Mesh(nozzleGeo, nozMat);
    nozR.position.set(0.16, -0.32, 0);
    jetpackAttachment.add(nozL);
    jetpackAttachment.add(nozR);

    // Flame cones
    jetpackFlames = new THREE.Group();
    const flameGeo = new THREE.ConeGeometry(0.1, 0.45, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9 });
    const flameL = new THREE.Mesh(flameGeo, flameMat);
    flameL.position.set(-0.16, -0.55, 0);
    flameL.rotation.x = Math.PI;
    const flameR = new THREE.Mesh(flameGeo, flameMat);
    flameR.position.set(0.16, -0.55, 0);
    flameR.rotation.x = Math.PI;
    jetpackFlames.add(flameL);
    jetpackFlames.add(flameR);
    jetpackAttachment.add(jetpackFlames);

    jetpackAttachment.visible = false;
    bodyGroup.add(jetpackAttachment);

    // 2. Hoverboard (Cyberpunk Surfboard underneath shoes)
    hoverboardAttachment = new THREE.Group();
    hoverboardAttachment.position.set(0, -0.38, 0.05);

    const boardGeo = new THREE.BoxGeometry(0.65, 0.08, 1.5);
    const boardMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      metalness: 0.8,
      roughness: 0.2
    });
    const board = new THREE.Mesh(boardGeo, boardMat);
    hoverboardAttachment.add(board);

    // Glowing neon edge strips
    const edgeGeo = new THREE.BoxGeometry(0.68, 0.04, 1.54);
    const edge = new THREE.Mesh(edgeGeo, neonCyanMat);
    hoverboardAttachment.add(edge);

    hoverboardAttachment.visible = false;
    bodyGroup.add(hoverboardAttachment);

    // 3. Magnet Aura (Intersecting Golden Torus Rings)
    magnetAuraRing = new THREE.Group();
    magnetAuraRing.position.set(0, 0.6, 0);

    const magnetRingMat = new THREE.MeshBasicMaterial({ color: 0xffd700, wireframe: true });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.03, 8, 24), ringMat);
    ring1.rotation.x = Math.PI / 2;
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.02, 8, 24), ringMat);
    ring2.rotation.y = Math.PI / 4;
    magnetAuraRing.add(ring1);
    magnetAuraRing.add(ring2);

    magnetAuraRing.visible = false;
    bodyGroup.add(magnetAuraRing);

    // 4. 2X Multiplier Floating Crown
    multiplierCrown = new THREE.Group();
    multiplierCrown.position.set(0, 1.7, 0);

    const crownGeo = new THREE.OctahedronGeometry(0.2, 0);
    const crownMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, wireframe: true });
    const crownMesh = new THREE.Mesh(crownGeo, crownMat);
    multiplierCrown.add(crownMesh);

    multiplierCrown.visible = false;
    bodyGroup.add(multiplierCrown);

    // 5. Free Obstacle Pass (Yellow Shield Aura)
    shieldGlowGroup = new THREE.Group();
    shieldGlowGroup.position.set(0, NORMAL_HEIGHT / 2, 0);

    const shieldAuraGeo = new THREE.SphereGeometry(0.85, 18, 14);
    shieldAuraGeo.scale(0.85, 1.15, 0.85);
    const shieldAuraMat = new THREE.MeshBasicMaterial({
      color: 0xffea00,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    shieldGlowMesh = new THREE.Mesh(shieldAuraGeo, shieldAuraMat);
    shieldGlowGroup.add(shieldGlowMesh);

    const shieldRingGeo = new THREE.RingGeometry(0.35, 0.9, 24);
    shieldRingGeo.rotateX(-Math.PI / 2);
    const obstaclePassRingMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    shieldRingMesh = new THREE.Mesh(shieldRingGeo, obstaclePassRingMat);
    shieldRingMesh.position.y = -NORMAL_HEIGHT / 2 + 0.05;
    shieldGlowGroup.add(shieldRingMesh);

    shieldLight = new THREE.PointLight(0xffea00, 1.2, 3.5);
    shieldLight.position.set(0, 0, 0);
    shieldGlowGroup.add(shieldLight);

    shieldGlowGroup.visible = false;
    bodyGroup.add(shieldGlowGroup);

    scene.add(rootGroup);
    return rootGroup;
  }

  // ============================================================
  // Lifecycle & Per-Frame Update
  // ============================================================
  function init(scene) {
    currentLane = 1; // Center lane
    targetX = 0;
    velocityY = 0;
    positionY = NORMAL_HEIGHT / 2;
    positionZ = 0;
    isJumping = false;
    isSliding = false;
    slideTimer = 0;
    isInvulnerable = false;
    invulnerableTimer = 0;
    runAnimClock = 0;

    isJetpackActive = false;
    isSneakersActive = false;
    isMagnetActive = false;
    isHoverboardActive = false;
    isMultiplierActive = false;

    buildAvatar(scene);
  }

  function update(delta, speed) {
    if (!rootGroup) return;

    runAnimClock += delta * (speed / 3);

    // ---- Forward Movement ----
    positionZ -= speed * delta;
    rootGroup.position.z = positionZ;

    // ---- Smooth Lane Lerp ----
    const tx = LANES[currentLane] * LANE_WIDTH;
    const dx = tx - rootGroup.position.x;
    if (Math.abs(dx) > 0.05) {
      const step = Math.sign(dx) * LANE_SWITCH_SPEED * delta;
      if (Math.abs(step) >= Math.abs(dx)) {
        rootGroup.position.x = tx;
      } else {
        rootGroup.position.x += step;
      }
      // Banking tilt
      bodyGroup.rotation.z = -Math.sign(dx) * 0.22;
    } else {
      rootGroup.position.x = tx;
      bodyGroup.rotation.z *= 0.82;
    }

    // ---- Jetpack Flight Mode vs Ground Physics ----
    if (isJetpackActive) {
      // Smoothly ascend to sky flight altitude
      positionY += (JETPACK_ALTITUDE - positionY) * Math.min(1, delta * 6.0);
      rootGroup.position.y = positionY;

      // Animate jetpack plasma flames
      if (jetpackFlames) {
        const flameScale = 0.8 + Math.sin(runAnimClock * 30) * 0.35;
        jetpackFlames.scale.set(1, flameScale, 1);
      }
    } else {
      // Normal Ground / Jump Physics
      if (isJumping) {
        velocityY -= GRAVITY * delta;
        positionY += velocityY * delta;
        if (positionY <= NORMAL_HEIGHT / 2) {
          positionY = NORMAL_HEIGHT / 2;
          velocityY = 0;
          isJumping = false;
        }
      } else {
        // Return to track level if descending from jetpack
        if (positionY > NORMAL_HEIGHT / 2 + 0.05) {
          positionY += (NORMAL_HEIGHT / 2 - positionY) * Math.min(1, delta * 8.0);
        } else {
          positionY = NORMAL_HEIGHT / 2;
        }
      }
      rootGroup.position.y = positionY;
    }

    // ---- Slide State ----
    // Stay sliding if DOWN key is held, or if slide timer is still running
    if (isSliding) {
      if (InputManager.isHeld("slide")) {
        slideTimer = 0.2; // Keep alive while held
      } else {
        slideTimer -= delta;
      }

      if (slideTimer <= 0) {
        isSliding = false;
        slideTimer = 0;
        bodyGroup.rotation.x = 0;
        bodyGroup.scale.set(1, 1, 1);
        // Reset ninja sprite transforms on slide exit
        if (ninjaSpriteBase) {
          ninjaSpriteBase.scale.set(1, 1, 1);
          ninjaSpriteBase.rotation.x = 0;
        }
      } else {
        // Lean forward into aerodynamic slide
        bodyGroup.rotation.x = 0.85;
        bodyGroup.scale.set(1, 0.55, 1);
      }
    }

    // ---- Running Stride Animation Cycle ----
    if (!isJumping && !isSliding && !isJetpackActive) {
      const strideAngle = Math.sin(runAnimClock * 14) * 0.7;
      if (leftLeg) leftLeg.rotation.x = strideAngle;
      if (rightLeg) rightLeg.rotation.x = -strideAngle;
      if (leftArm) leftArm.rotation.x = -strideAngle * 0.8;
      if (rightArm) rightArm.rotation.x = strideAngle * 0.8;

      // Subtle running bob
      bodyGroup.position.y = Math.abs(Math.sin(runAnimClock * 14)) * 0.08;

      // -- Ninja sprite: run-bob squash & stretch --
      if (ninjaSpriteBase) {
        const bob = Math.abs(Math.sin(runAnimClock * 14));
        // Slight vertical squash on foot-strike (bob peak) for cartoon weight
        const scaleY = 1.0 + bob * 0.04;
        const scaleX = 1.0 - bob * 0.025;
        ninjaSpriteBase.scale.set(scaleX, scaleY, 1);
        // Subtle forward lean during run
        ninjaSpriteBase.rotation.x = 0.08;
      }
    } else if (isJumping) {
      // Jump pose: legs tucked back, arms up
      if (leftLeg) leftLeg.rotation.x = 0.5;
      if (rightLeg) rightLeg.rotation.x = 0.5;
      if (leftArm) leftArm.rotation.x = -1.2;
      if (rightArm) rightArm.rotation.x = -1.2;

      // -- Ninja sprite: jump stretch --
      if (ninjaSpriteBase) {
        // Stretch taller as velocity is positive, compress as falling
        const stretchY = velocityY > 0 ? 1.12 : 0.92;
        const stretchX = velocityY > 0 ? 0.90 : 1.06;
        ninjaSpriteBase.scale.set(stretchX, stretchY, 1);
        // Slight back-lean on ascent, forward-lean on descent
        ninjaSpriteBase.rotation.x = velocityY > 0 ? -0.12 : 0.18;
      }
    } else if (isJetpackActive) {
      // Flying pose: feet trailing back, arms forward
      if (leftLeg) leftLeg.rotation.x = 0.6;
      if (rightLeg) rightLeg.rotation.x = 0.6;
      if (leftArm) leftArm.rotation.x = 0.3;
      if (rightArm) rightArm.rotation.x = 0.3;

      // -- Ninja sprite: fly pose (slight lean) --
      if (ninjaSpriteBase) {
        ninjaSpriteBase.scale.set(1.0, 1.1, 1);
        ninjaSpriteBase.rotation.x = -0.15; // lean forward in flight
      }
    }

    // ---- Superpower Attachment Animations ----
    if (magnetAuraRing && isMagnetActive) {
      magnetAuraRing.rotation.y += delta * 6;
      magnetAuraRing.rotation.z += delta * 4;
    }
    if (multiplierCrown && isMultiplierActive) {
      multiplierCrown.rotation.y += delta * 4;
    }

    // ---- Yellow Shield Aura Pulse ----
    if (shieldGlowGroup && shieldCharge > 0) {
      const pulse = Math.sin(runAnimClock * 9);
      shieldGlowMesh.scale.set(1 + pulse * 0.06, 1 + pulse * 0.06, 1 + pulse * 0.06);
      shieldGlowMesh.material.opacity = 0.32 + pulse * 0.08;
      shieldRingMesh.rotation.z += delta * 3.5;
      shieldRingMesh.scale.set(1 + pulse * 0.04, 1 + pulse * 0.04, 1);
    }

    // ---- Invulnerability Flashing ----
    if (isInvulnerable) {
      invulnerableTimer -= delta;
      rootGroup.visible = Math.floor(invulnerableTimer * 12) % 2 === 0;
      if (invulnerableTimer <= 0) {
        isInvulnerable = false;
        rootGroup.visible = true;
      }
    }

    // ---- Ninja sprite: billboard camera-facing ----
    // Rotates the sprite plane to face the camera each frame.
    // Only X/Y facing is corrected; the bodyGroup banking (Z) is kept
    // as visual feedback during lane switches.
    if (ninjaSpriteBase && typeof World !== "undefined" && World.getCamera) {
      const cam = World.getCamera();
      if (cam) {
        // Get sprite's world position
        const spriteWorldPos = new THREE.Vector3();
        ninjaSpriteBase.getWorldPosition(spriteWorldPos);
        // Compute direction from sprite to camera (XZ plane only for clean look)
        const toCam = new THREE.Vector3(
          cam.position.x - spriteWorldPos.x,
          0,
          cam.position.z - spriteWorldPos.z
        ).normalize();
        // atan2 gives us the Y rotation to face the camera in XZ plane
        ninjaSpriteBase.rotation.y = Math.atan2(toCam.x, toCam.z);
      }
    }
  }

  // ============================================================
  // Controls & Action Handling
  // ============================================================
  function handleInput() {
    if (!rootGroup) return;

    // Lane switches
    if (InputManager.consume("left")) {
      if (currentLane > 0) currentLane--;
    }
    if (InputManager.consume("right")) {
      if (currentLane < 2) currentLane++;
    }

    // Jump
    if (InputManager.consume("jump")) {
      if (!isJumping && !isJetpackActive) {
        isJumping = true;
        isSliding = false;
        bodyGroup.rotation.x = 0;
        bodyGroup.scale.set(1, 1, 1);

        // Super Sneakers jump boost
        const boost = isSneakersActive ? 1.6 : 1.0;
        velocityY = BASE_JUMP_VELOCITY * boost;
        AudioEngine.playJump();
      } else if (isJumping && InputManager.consume("slide")) {
        // Fast-fall dive
        velocityY = -BASE_JUMP_VELOCITY * 1.8;
      }
    }

    // Slide / Fast-fall
    const slideRequested = InputManager.consume("slide") || InputManager.isHeld("slide");
    if (slideRequested) {
      if (isJumping) {
        velocityY = -BASE_JUMP_VELOCITY * 1.8;
      } else if (!isJetpackActive) {
        if (!isSliding) AudioEngine.playSlide();
        isSliding = true;
        slideTimer = SLIDE_DURATION;
      }
    }
  }

  // ============================================================
  // Superpower State Connectors
  // ============================================================
  function applyPowerupVisuals(powerupId, active) {
    if (powerupId === "JETPACK") {
      isJetpackActive = active;
      if (jetpackAttachment) jetpackAttachment.visible = active;
    } else if (powerupId === "HOVERBOARD" || powerupId === "SHIELD") {
      isHoverboardActive = active;
      if (hoverboardAttachment) hoverboardAttachment.visible = active;
    } else if (powerupId === "MAGNET") {
      isMagnetActive = active;
      if (magnetAuraRing) magnetAuraRing.visible = active;
    } else if (powerupId === "SNEAKERS") {
      isSneakersActive = active;
    } else if (powerupId === "MULTIPLIER" || powerupId === "SPEED_BOOST") {
      isMultiplierActive = active;
      if (multiplierCrown) multiplierCrown.visible = active;
    }
  }

  function getCollisionBox() {
    if (!rootGroup) return null;
    // Ground level is at y = (rootGroup.position.y - NORMAL_HEIGHT / 2)
    const groundY = rootGroup.position.y - NORMAL_HEIGHT / 2;
    const h = isSliding ? SLIDE_HEIGHT : NORMAL_HEIGHT;
    return {
      x: rootGroup.position.x - bbox.width / 2,
      y: groundY,
      z: rootGroup.position.z - bbox.depth / 2,
      w: bbox.width,
      h: h,
      d: bbox.depth,
      centerX: rootGroup.position.x,
      centerY: groundY + h / 2,
      centerZ: rootGroup.position.z,
      isSliding: isSliding
    };
  }

  function triggerShieldFlash() {
    const flashEl = document.getElementById("shield-hit-flash");
    if (flashEl) {
      flashEl.classList.remove("flash-active");
      void flashEl.offsetWidth; // Force reflow
      flashEl.classList.add("flash-active");
    }
  }

  function updateShieldHUD(active) {
    const hudShield = document.getElementById("hud-shield-charge");
    if (hudShield) {
      if (active) {
        hudShield.classList.remove("hidden");
      } else {
        hudShield.classList.add("hidden");
      }
    }
  }

  function addShieldCharge() {
    shieldCharge = 1; // Maximum 1, charges do not stack
    if (shieldGlowGroup) shieldGlowGroup.visible = true;
    updateShieldHUD(true);
  }

  function hasShieldCharge() {
    return shieldCharge > 0;
  }

  function consumeShieldCharge() {
    if (shieldCharge <= 0) return false;
    shieldCharge = 0;
    if (shieldGlowGroup) shieldGlowGroup.visible = false;
    triggerShieldFlash();
    updateShieldHUD(false);
    triggerInvulnerability(1.0); // ~1 second invulnerability
    return true;
  }

  function triggerInvulnerability(duration = 2.0) {
    isInvulnerable = true;
    invulnerableTimer = duration;
  }

  function consumeHoverboard() {
    if (isHoverboardActive) {
      isHoverboardActive = false;
      if (hoverboardAttachment) hoverboardAttachment.visible = false;
      return true;
    }
    return false;
  }

  function reset(scene) {
    if (rootGroup) scene.remove(rootGroup);
    init(scene);
  }

  return {
    init,
    update,
    handleInput,
    getCollisionBox,
    triggerInvulnerability,
    consumeHoverboard,
    addShieldCharge,
    hasShieldCharge,
    consumeShieldCharge,
    applyPowerupVisuals,
    reset,
    getMesh: () => rootGroup,
    getZ: () => positionZ,
    getX: () => rootGroup ? rootGroup.position.x : 0,
    getY: () => rootGroup ? rootGroup.position.y : 0,
    isJetpackActive: () => isJetpackActive,
    isInvulnerable: () => isInvulnerable,
    hasHoverboard: () => isHoverboardActive,
    LANE_WIDTH,
    NORMAL_HEIGHT
  };
})();
