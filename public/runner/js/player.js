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
  // Avatar Construction (Custom 3D Banana Mascot)
  // ============================================================
  function buildAvatar(scene) {
    rootGroup = new THREE.Group();
    bodyGroup = new THREE.Group();
    rootGroup.add(bodyGroup);

    // ---- Materials ----
    const bananaYellowMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.35,
      metalness: 0.15,
      emissive: 0xff9900,
      emissiveIntensity: 0.1
    });

    const stemGreenMat = new THREE.MeshStandardMaterial({
      color: 0x4d7c0f,
      roughness: 0.6
    });

    const tipBrownMat = new THREE.MeshStandardMaterial({
      color: 0x5b3a1a,
      roughness: 0.8
    });

    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.9
    });

    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.4
    });

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

    // ---- Torso (Curved Banana Body) ----
    // Center torso
    const torsoGeo = new THREE.CylinderGeometry(0.32, 0.28, 0.95, 12);
    const torso = new THREE.Mesh(torsoGeo, bananaYellowMat);
    torso.position.y = 0.55;
    torso.castShadow = true;
    bodyGroup.add(torso);

    // Lower belly curve
    const bellyGeo = new THREE.SphereGeometry(0.32, 12, 10);
    bellyGeo.scale(1, 0.8, 1.15);
    const belly = new THREE.Mesh(bellyGeo, bananaYellowMat);
    belly.position.set(0, 0.35, 0.05);
    bodyGroup.add(belly);

    // Bottom tip (Brown)
    const botTipGeo = new THREE.ConeGeometry(0.18, 0.22, 8);
    const botTip = new THREE.Mesh(botTipGeo, tipBrownMat);
    botTip.rotation.x = Math.PI;
    botTip.position.set(0, 0.12, 0);
    bodyGroup.add(botTip);

    // ---- Head & Face ----
    const headGeo = new THREE.SphereGeometry(0.3, 12, 12);
    headMesh = new THREE.Mesh(headGeo, bananaYellowMat);
    headMesh.position.set(0, 1.15, 0.05);
    headMesh.castShadow = true;
    bodyGroup.add(headMesh);

    // Green Stem Cap on top of head
    const stemGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.25, 8);
    const stem = new THREE.Mesh(stemGeo, stemGreenMat);
    stem.position.set(0, 0.32, -0.05);
    stem.rotation.x = -0.3;
    headMesh.add(stem);

    // Cyberpunk Visor / Sunglasses
    const visorGeo = new THREE.BoxGeometry(0.48, 0.14, 0.2);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.02, 0.24);
    headMesh.add(visor);

    // Banana Smile
    const smileGeo = new THREE.TorusGeometry(0.12, 0.025, 8, 12, Math.PI);
    const smileMat = new THREE.MeshBasicMaterial({ color: 0x3d1a00 });
    const smile = new THREE.Mesh(smileGeo, smileMat);
    smile.position.set(0, -0.14, 0.26);
    smile.rotation.x = 0.3;
    headMesh.add(smile);

    // ---- Legs & Red Sneakers ----
    function makeLeg(sideX) {
      const legGroup = new THREE.Group();
      legGroup.position.set(sideX, 0.22, 0);

      // Upper leg
      const legGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.42, 8);
      const legMesh = new THREE.Mesh(legGeo, bananaYellowMat);
      legMesh.position.y = -0.21;
      legMesh.castShadow = true;
      legGroup.add(legMesh);

      // Red Sneaker Shoe
      const shoeGeo = new THREE.BoxGeometry(0.16, 0.14, 0.32);
      const shoe = new THREE.Mesh(shoeGeo, shoeMat);
      shoe.position.set(0, -0.42, 0.06);
      shoe.castShadow = true;
      legGroup.add(shoe);

      // Shoe sole (white)
      const soleGeo = new THREE.BoxGeometry(0.18, 0.04, 0.34);
      const soleMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const sole = new THREE.Mesh(soleGeo, soleMat);
      sole.position.set(0, -0.49, 0.06);
      legGroup.add(sole);

      return legGroup;
    }

    leftLeg = makeLeg(-0.16);
    rightLeg = makeLeg(0.16);
    bodyGroup.add(leftLeg);
    bodyGroup.add(rightLeg);

    // ---- Arms & Hands ----
    function makeArm(sideX) {
      const armGroup = new THREE.Group();
      armGroup.position.set(sideX, 0.9, 0);

      const armGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.45, 8);
      const armMesh = new THREE.Mesh(armGeo, bananaYellowMat);
      armMesh.position.y = -0.22;
      armMesh.castShadow = true;
      armGroup.add(armMesh);

      // Hand glove
      const handGeo = new THREE.SphereGeometry(0.09, 8, 8);
      const handMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const hand = new THREE.Mesh(handGeo, handMat);
      hand.position.y = -0.46;
      armGroup.add(hand);

      return armGroup;
    }

    leftArm = makeArm(-0.38);
    rightArm = makeArm(0.38);
    bodyGroup.add(leftArm);
    bodyGroup.add(rightArm);

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

    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd700, wireframe: true });
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
    } else if (isJumping) {
      // Jump pose: legs tucked back, arms up
      if (leftLeg) leftLeg.rotation.x = 0.5;
      if (rightLeg) rightLeg.rotation.x = 0.5;
      if (leftArm) leftArm.rotation.x = -1.2;
      if (rightArm) rightArm.rotation.x = -1.2;
    } else if (isJetpackActive) {
      // Flying pose: feet trailing back, arms forward
      if (leftLeg) leftLeg.rotation.x = 0.6;
      if (rightLeg) rightLeg.rotation.x = 0.6;
      if (leftArm) leftArm.rotation.x = 0.3;
      if (rightArm) rightArm.rotation.x = 0.3;
    }

    // ---- Superpower Attachment Animations ----
    if (magnetAuraRing && isMagnetActive) {
      magnetAuraRing.rotation.y += delta * 6;
      magnetAuraRing.rotation.z += delta * 4;
    }
    if (multiplierCrown && isMultiplierActive) {
      multiplierCrown.rotation.y += delta * 4;
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
    } else if (powerupId === "HOVERBOARD") {
      isHoverboardActive = active;
      if (hoverboardAttachment) hoverboardAttachment.visible = active;
    } else if (powerupId === "MAGNET") {
      isMagnetActive = active;
      if (magnetAuraRing) magnetAuraRing.visible = active;
    } else if (powerupId === "SNEAKERS") {
      isSneakersActive = active;
    } else if (powerupId === "MULTIPLIER") {
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
