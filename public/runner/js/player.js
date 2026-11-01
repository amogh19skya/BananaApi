// ================================================================
// Banana Surfers – Articulated 3D Runner Character & Controller
// Stylized athletic 3D runner seen from behind (camera behind the player),
// running forward down the track with articulated arm/leg stride loop,
// jumping, sliding, lane banking, and game-over animation stopping.
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
  let torsoGroup;
  let headGroup;
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
  let isGameOver = false;

  // Active Superpowers State
  let isJetpackActive = false;
  let isSneakersActive = false;
  let isMagnetActive = false;
  let isHoverboardActive = false;
  let isMultiplierActive = false;

  const bbox = { width: 0.65, height: NORMAL_HEIGHT, depth: 0.65 };

  // ============================================================
  // Avatar Construction — Stylized 3D Human Runner (Seen from Behind)
  // An original athletic character with backward runner cap, sports hoodie,
  // articulated swinging arms & legs, and running sneakers with white soles.
  // ============================================================
  function buildAvatar(scene) {
    rootGroup = new THREE.Group();
    bodyGroup = new THREE.Group();
    rootGroup.add(bodyGroup);

    // ---- Materials (Stylized Vibrant Runner Palette) ----
    // Skin Tone
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xf2c49b,
      roughness: 0.65,
      metalness: 0.05
    });

    // Athletic Running Hoodie / Jersey (Vibrant Cyan / Teal)
    const jerseyMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.5,
      metalness: 0.1
    });

    // Contrasting White Stripe & Trim
    const whiteTrimMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.1
    });

    // Backwards Cap & Accents (Vibrant Warm Amber / Orange)
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.55,
      metalness: 0.1
    });

    // Dark Athletic Running Shorts (Charcoal Slate)
    const shortsMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.1
    });

    // Running Shoes (Bright Coral Red / Neon Orange)
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      roughness: 0.45,
      metalness: 0.15
    });

    // White Sneaker Soles
    const soleMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.3,
      metalness: 0.05
    });

    // Shared Materials for Attachments
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

    // ============================================================
    // 1. Torso & Upper Body
    // ============================================================
    torsoGroup = new THREE.Group();
    bodyGroup.add(torsoGroup);

    // Main Torso (Athletic V-Taper Shape)
    // Centered around Y = 0.0 relative to body center (which is 0.7m above ground)
    const torsoGeo = new THREE.CylinderGeometry(0.24, 0.19, 0.46, 12);
    const torso = new THREE.Mesh(torsoGeo, jerseyMat);
    torso.position.y = 0.02;
    torso.castShadow = true;
    torsoGroup.add(torso);

    // Athletic Stripe on the Back (Facing +Z toward camera)
    const stripeGeo = new THREE.BoxGeometry(0.08, 0.40, 0.02);
    const backStripe = new THREE.Mesh(stripeGeo, whiteTrimMat);
    backStripe.position.set(0, 0.02, 0.195);
    torsoGroup.add(backStripe);

    // Runner Number Decal Block on Back (Seen clearly from behind)
    const bibGeo = new THREE.BoxGeometry(0.20, 0.16, 0.02);
    const bib = new THREE.Mesh(bibGeo, whiteTrimMat);
    bib.position.set(0, 0.04, 0.196);
    torsoGroup.add(bib);

    const bibNumGeo = new THREE.BoxGeometry(0.14, 0.05, 0.022);
    const bibNumMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const bibNum = new THREE.Mesh(bibNumGeo, bibNumMat);
    bibNum.position.set(0, 0.04, 0.198);
    torsoGroup.add(bibNum);

    // Waistband / Belt
    const waistGeo = new THREE.CylinderGeometry(0.19, 0.185, 0.08, 12);
    const waist = new THREE.Mesh(waistGeo, shortsMat);
    waist.position.y = -0.22;
    torsoGroup.add(waist);

    // ============================================================
    // 2. Head & Backwards Runner Cap
    // ============================================================
    headGroup = new THREE.Group();
    headGroup.position.set(0, 0.38, 0);
    bodyGroup.add(headGroup);

    // Head Base
    const headGeo = new THREE.SphereGeometry(0.18, 16, 14);
    headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // Backwards Athletic Cap (Crown)
    const capGeo = new THREE.SphereGeometry(0.19, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 0.01;
    headGroup.add(cap);

    // Cap Visor (Facing +Z backward toward camera)
    const visorGeo = new THREE.BoxGeometry(0.16, 0.025, 0.14);
    const visor = new THREE.Mesh(visorGeo, capMat);
    visor.position.set(0, -0.04, 0.15);
    visor.rotation.x = -0.15; // Slight downward tilt on the backward visor
    headGroup.add(visor);

    // Bunched Hoodie Collar (At base of neck on back)
    const collarGeo = new THREE.TorusGeometry(0.13, 0.045, 8, 16);
    const collar = new THREE.Mesh(collarGeo, jerseyMat);
    collar.position.set(0, -0.12, 0.04);
    collar.rotation.x = Math.PI / 2 + 0.2;
    headGroup.add(collar);

    // ============================================================
    // 3. Articulated Legs & Running Shoes
    // ============================================================
    function buildLeg(sideX) {
      const legPivot = new THREE.Group();
      legPivot.position.set(sideX, -0.24, 0); // Hip joint position

      // Upper Leg / Running Shorts
      const thighGeo = new THREE.CylinderGeometry(0.085, 0.075, 0.24, 10);
      const thigh = new THREE.Mesh(thighGeo, shortsMat);
      thigh.position.y = -0.12;
      thigh.castShadow = true;
      legPivot.add(thigh);

      // Lower Leg (Skin + Athletic Sock)
      const shinGeo = new THREE.CylinderGeometry(0.068, 0.058, 0.22, 10);
      const shin = new THREE.Mesh(shinGeo, skinMat);
      shin.position.y = -0.32;
      shin.castShadow = true;
      legPivot.add(shin);

      // White Athletic Sock Band
      const sockGeo = new THREE.CylinderGeometry(0.07, 0.065, 0.08, 10);
      const sock = new THREE.Mesh(sockGeo, whiteTrimMat);
      sock.position.y = -0.37;
      legPivot.add(sock);

      // Running Sneaker Body (Facing -Z forward down track, heel facing +Z to camera)
      const shoeGeo = new THREE.BoxGeometry(0.14, 0.10, 0.28);
      const shoe = new THREE.Mesh(shoeGeo, shoeMat);
      shoe.position.set(0, -0.42, -0.03); // Slightly shifted forward so toe points -Z
      shoe.castShadow = true;
      legPivot.add(shoe);

      // White Sneaker Sole
      const soleGeo = new THREE.BoxGeometry(0.15, 0.04, 0.30);
      const sole = new THREE.Mesh(soleGeo, soleMat);
      sole.position.set(0, -0.47, -0.03);
      legPivot.add(sole);

      // Reflective Heel Accent on the Back (Facing camera)
      const heelGeo = new THREE.BoxGeometry(0.08, 0.04, 0.02);
      const heel = new THREE.Mesh(heelGeo, whiteTrimMat);
      heel.position.set(0, -0.41, 0.11);
      legPivot.add(heel);

      return legPivot;
    }

    leftLeg = buildLeg(-0.13);
    rightLeg = buildLeg(0.13);
    bodyGroup.add(leftLeg);
    bodyGroup.add(rightLeg);

    // ============================================================
    // 4. Articulated Arms & Hands
    // ============================================================
    function buildArm(sideX) {
      const armPivot = new THREE.Group();
      armPivot.position.set(sideX, 0.20, 0); // Shoulder joint position

      // Upper Arm / Short Sleeve
      const sleeveGeo = new THREE.CylinderGeometry(0.068, 0.060, 0.14, 10);
      const sleeve = new THREE.Mesh(sleeveGeo, jerseyMat);
      sleeve.position.y = -0.07;
      armPivot.add(sleeve);

      // Arm Limb (Skin tone)
      const armGeo = new THREE.CylinderGeometry(0.058, 0.050, 0.26, 8);
      const armMesh = new THREE.Mesh(armGeo, skinMat);
      armMesh.position.set(0, -0.22, -0.02);
      armMesh.rotation.x = 0.15; // Natural slight forward bend at elbow
      armMesh.castShadow = true;
      armPivot.add(armMesh);

      // Hand / Wrist
      const handGeo = new THREE.SphereGeometry(0.055, 8, 8);
      const hand = new THREE.Mesh(handGeo, skinMat);
      hand.position.set(0, -0.36, -0.04);
      armPivot.add(hand);

      return armPivot;
    }

    leftArm = buildArm(-0.28);
    rightArm = buildArm(0.28);
    bodyGroup.add(leftArm);
    bodyGroup.add(rightArm);

    // ============================================================
    // 5. Superpower Visual Attachments
    // ============================================================

    // 1. Jetpack (Twin Rockets + Animated Flame Cones)
    jetpackAttachment = new THREE.Group();
    jetpackAttachment.position.set(0, 0.05, 0.22); // Mounted on back of hoodie

    const rocketGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.50, 10);
    const rocketL = new THREE.Mesh(rocketGeo, chromeMat);
    rocketL.position.x = -0.14;
    const rocketR = new THREE.Mesh(rocketGeo, chromeMat);
    rocketR.position.x = 0.14;
    jetpackAttachment.add(rocketL);
    jetpackAttachment.add(rocketR);

    // Thruster Nozzles
    const nozzleGeo = new THREE.CylinderGeometry(0.11, 0.08, 0.10, 8);
    const nozMat = new THREE.MeshStandardMaterial({ color: 0x374151 });
    const nozL = new THREE.Mesh(nozzleGeo, nozMat);
    nozL.position.set(-0.14, -0.28, 0);
    const nozR = new THREE.Mesh(nozzleGeo, nozMat);
    nozR.position.set(0.14, -0.28, 0);
    jetpackAttachment.add(nozL);
    jetpackAttachment.add(nozR);

    // Flame Cones
    jetpackFlames = new THREE.Group();
    const flameGeo = new THREE.ConeGeometry(0.09, 0.40, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9 });
    const flameL = new THREE.Mesh(flameGeo, flameMat);
    flameL.position.set(-0.14, -0.50, 0);
    flameL.rotation.x = Math.PI;
    const flameR = new THREE.Mesh(flameGeo, flameMat);
    flameR.position.set(0.14, -0.50, 0);
    flameR.rotation.x = Math.PI;
    jetpackFlames.add(flameL);
    jetpackFlames.add(flameR);
    jetpackAttachment.add(jetpackFlames);

    jetpackAttachment.visible = false;
    bodyGroup.add(jetpackAttachment);

    // 2. Hoverboard (Underneath shoes)
    hoverboardAttachment = new THREE.Group();
    hoverboardAttachment.position.set(0, -0.74, -0.02);

    const boardGeo = new THREE.BoxGeometry(0.60, 0.07, 1.40);
    const boardMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      metalness: 0.8,
      roughness: 0.2
    });
    const board = new THREE.Mesh(boardGeo, boardMat);
    hoverboardAttachment.add(board);

    const edgeGeo = new THREE.BoxGeometry(0.64, 0.035, 1.44);
    const edge = new THREE.Mesh(edgeGeo, neonCyanMat);
    hoverboardAttachment.add(edge);

    hoverboardAttachment.visible = false;
    bodyGroup.add(hoverboardAttachment);

    // 3. Magnet Aura (Intersecting Golden Torus Rings)
    magnetAuraRing = new THREE.Group();
    magnetAuraRing.position.set(0, 0.05, 0);

    const magnetRingMat = new THREE.MeshBasicMaterial({ color: 0xffd700, wireframe: true });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.60, 0.025, 8, 24), magnetRingMat);
    ring1.rotation.x = Math.PI / 2;
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.020, 8, 24), magnetRingMat);
    ring2.rotation.y = Math.PI / 4;
    magnetAuraRing.add(ring1);
    magnetAuraRing.add(ring2);

    magnetAuraRing.visible = false;
    bodyGroup.add(magnetAuraRing);

    // 4. Multiplier Floating Crown
    multiplierCrown = new THREE.Group();
    multiplierCrown.position.set(0, 0.70, 0);

    const crownGeo = new THREE.OctahedronGeometry(0.18, 0);
    const crownMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, wireframe: true });
    const crownMesh = new THREE.Mesh(crownGeo, crownMat);
    multiplierCrown.add(crownMesh);

    multiplierCrown.visible = false;
    bodyGroup.add(multiplierCrown);

    // 5. Free Obstacle Pass (Yellow Shield Aura)
    shieldGlowGroup = new THREE.Group();
    shieldGlowGroup.position.set(0, 0, 0);

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

    const shieldRingGeo = new THREE.RingGeometry(0.35, 0.90, 24);
    shieldRingGeo.rotateX(-Math.PI / 2);
    const obstaclePassRingMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.50,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    shieldRingMesh = new THREE.Mesh(shieldRingGeo, obstaclePassRingMat);
    shieldRingMesh.position.y = -0.70;
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
    isGameOver = false;

    isJetpackActive = false;
    isSneakersActive = false;
    isMagnetActive = false;
    isHoverboardActive = false;
    isMultiplierActive = false;
    shieldCharge = 0;

    buildAvatar(scene);
    updateShieldHUD(false);
  }

  function update(delta, speed) {
    if (!rootGroup) return;

    // Advance animation clock only while game is active
    if (!isGameOver) {
      runAnimClock += delta * (speed / 3);
    }

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
      // Banking tilt during lane switch
      bodyGroup.rotation.z = -Math.sign(dx) * 0.20;
    } else {
      rootGroup.position.x = tx;
      bodyGroup.rotation.z *= 0.80; // Smooth recovery to upright
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
          isJumping = false; // Smooth landing -> back to run cycle
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
    if (isSliding) {
      if (InputManager.isHeld("slide")) {
        slideTimer = 0.2; // Keep sliding while key is held
      } else {
        slideTimer -= delta;
      }

      if (slideTimer <= 0) {
        isSliding = false;
        slideTimer = 0;
        bodyGroup.rotation.x = 0;
        bodyGroup.scale.set(1, 1, 1); // Reset back to run animation scale
      } else {
        // Aerodynamic slide pose: crouch low and lean forward
        bodyGroup.rotation.x = 0.75;
        bodyGroup.scale.set(1.0, 0.55, 1.0);
      }
    }

    // ============================================================
    // Animation State Controller
    // ============================================================
    if (isGameOver) {
      // Game Over: Stop all running animations, bring limbs to natural rest
      if (leftLeg) leftLeg.rotation.x = 0;
      if (rightLeg) rightLeg.rotation.x = 0;
      if (leftArm) leftArm.rotation.x = 0;
      if (rightArm) rightArm.rotation.x = 0;
      bodyGroup.position.y = 0;
      bodyGroup.rotation.x = 0;
      bodyGroup.scale.set(1, 1, 1);
    } else if (isSliding) {
      // Slide Pose: legs extend forward in slide, arms back for balance
      if (leftLeg) leftLeg.rotation.x = -1.1;
      if (rightLeg) rightLeg.rotation.x = -0.7;
      if (leftArm) leftArm.rotation.x = 0.6;
      if (rightArm) rightArm.rotation.x = 0.6;
    } else if (isJumping) {
      // Jump Pose: knees tuck back, arms reach up/back for air balance
      if (leftLeg) leftLeg.rotation.x = 0.45;
      if (rightLeg) rightLeg.rotation.x = 0.55;
      if (leftArm) leftArm.rotation.x = -1.1;
      if (rightArm) rightArm.rotation.x = -1.1;

      // Body tilts dynamically based on velocity
      bodyGroup.rotation.x = velocityY > 0 ? -0.10 : 0.14;
      bodyGroup.position.y = 0;
    } else if (isJetpackActive) {
      // Jetpack Flight: legs trail back, arms forward
      if (leftLeg) leftLeg.rotation.x = 0.50;
      if (rightLeg) rightLeg.rotation.x = 0.50;
      if (leftArm) leftArm.rotation.x = 0.25;
      if (rightArm) rightArm.rotation.x = 0.25;
      bodyGroup.rotation.x = -0.15;
    } else {
      // ---- Looping Run Animation (Legs and arms swinging, slight body bob) ----
      const strideAngle = Math.sin(runAnimClock * 14) * 0.75;

      // Legs swing in opposite phases
      if (leftLeg) leftLeg.rotation.x = strideAngle;
      if (rightLeg) rightLeg.rotation.x = -strideAngle;

      // Arms swing in counter-rhythm with legs (athletic arm pump)
      if (leftArm) {
        leftArm.rotation.x = -strideAngle * 0.85;
        leftArm.rotation.z = -0.12;
      }
      if (rightArm) {
        rightArm.rotation.x = strideAngle * 0.85;
        rightArm.rotation.z = 0.12;
      }

      // Slight rhythmic body bob (peaks twice per stride cycle)
      bodyGroup.position.y = Math.abs(Math.sin(runAnimClock * 14)) * 0.08;

      // Natural forward lean during running
      bodyGroup.rotation.x = 0.08;

      // Subtle torso counter-rotation for athletic rhythm
      if (torsoGroup) {
        torsoGroup.rotation.y = Math.sin(runAnimClock * 14) * 0.06;
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
    if (!rootGroup || isGameOver) return;

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

  function stopAnimation() {
    isGameOver = true;
    if (leftLeg) leftLeg.rotation.x = 0;
    if (rightLeg) rightLeg.rotation.x = 0;
    if (leftArm) leftArm.rotation.x = 0;
    if (rightArm) rightArm.rotation.x = 0;
    if (bodyGroup) {
      bodyGroup.position.y = 0;
      bodyGroup.rotation.x = 0;
      bodyGroup.scale.set(1, 1, 1);
    }
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
    stopAnimation,
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
