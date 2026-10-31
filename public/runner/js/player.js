// ================================================================
// Banana Surfers – Player Controller
// 3-lane movement, jump physics, slide, hoverboard
// ================================================================
const Player = (() => {
  const LANE_WIDTH = 2.5;
  const LANES = [-1, 0, 1]; // left, center, right
  const LANE_SWITCH_SPEED = 14.0; // units/sec
  const JUMP_VELOCITY = 9.8;
  const GRAVITY = 24.0;
  const SLIDE_DURATION = 0.8;
  const NORMAL_HEIGHT = 1.4;
  const SLIDE_HEIGHT = 0.5;

  let mesh, currentLane, targetX, velocityY;
  let isJumping, isSliding, slideTimer;
  let isInvulnerable, invulnerableTimer;
  let hoverboardActive, hoverboardTimer;
  let positionZ; // Current Z (moves negative = into screen)

  // Bounding box for collisions
  const bbox = { width: 0.6, height: NORMAL_HEIGHT, depth: 0.6 };

  function init(scene) {
    currentLane = 1; // Center lane (index 1 of LANES = 0)
    targetX = 0;
    velocityY = 0;
    isJumping = false;
    isSliding = false;
    slideTimer = 0;
    isInvulnerable = false;
    invulnerableTimer = 0;
    hoverboardActive = false;
    hoverboardTimer = 0;
    positionZ = 0;

    // Create player mesh – stylized capsule body
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.35, NORMAL_HEIGHT, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.3,
      metalness: 0.4,
      emissive: 0xffa500,
      emissiveIntensity: 0.15
    });
    mesh = new THREE.Mesh(bodyGeo, bodyMat);
    mesh.castShadow = true;
    mesh.position.set(0, NORMAL_HEIGHT / 2, 0);

    // Head (sphere)
    const headGeo = new THREE.SphereGeometry(0.25, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3, metalness: 0.3 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = NORMAL_HEIGHT / 2 + 0.15;
    head.castShadow = true;
    mesh.add(head);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1e1135 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.1, NORMAL_HEIGHT / 2 + 0.18, 0.2);
    mesh.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.1, NORMAL_HEIGHT / 2 + 0.18, 0.2);
    mesh.add(rightEye);

    scene.add(mesh);
    return mesh;
  }

  function update(delta, speed) {
    if (!mesh) return;

    // ---- Forward movement ----
    positionZ -= speed * delta;
    mesh.position.z = positionZ;

    // ---- Lane switching ----
    const tx = LANES[currentLane] * LANE_WIDTH;
    const dx = tx - mesh.position.x;
    if (Math.abs(dx) > 0.05) {
      const step = Math.sign(dx) * LANE_SWITCH_SPEED * delta;
      if (Math.abs(step) >= Math.abs(dx)) {
        mesh.position.x = tx;
      } else {
        mesh.position.x += step;
      }
      // Tilt effect
      mesh.rotation.z = -Math.sign(dx) * 0.2;
    } else {
      mesh.position.x = tx;
      mesh.rotation.z *= 0.85; // Ease back
    }

    // ---- Jump physics ----
    if (isJumping) {
      velocityY -= GRAVITY * delta;
      mesh.position.y += velocityY * delta;
      if (mesh.position.y <= NORMAL_HEIGHT / 2) {
        mesh.position.y = NORMAL_HEIGHT / 2;
        velocityY = 0;
        isJumping = false;
      }
    }

    // ---- Slide timer ----
    if (isSliding) {
      slideTimer -= delta;
      if (slideTimer <= 0) {
        isSliding = false;
        slideTimer = 0;
        // Restore scale
        mesh.scale.y = 1;
        mesh.position.y = NORMAL_HEIGHT / 2;
      }
    }

    // ---- Invulnerability flicker ----
    if (isInvulnerable) {
      invulnerableTimer -= delta;
      mesh.visible = Math.floor(invulnerableTimer * 10) % 2 === 0;
      if (invulnerableTimer <= 0) {
        isInvulnerable = false;
        mesh.visible = true;
      }
    }

    // ---- Hoverboard timer ----
    if (hoverboardActive) {
      hoverboardTimer -= delta;
      if (hoverboardTimer <= 0) {
        hoverboardActive = false;
      }
    }
  }

  function handleInput() {
    if (!mesh) return;

    // Lane switch
    if (InputManager.consume("left")) {
      if (currentLane > 0) currentLane--;
    }
    if (InputManager.consume("right")) {
      if (currentLane < 2) currentLane++;
    }

    // Jump
    if (InputManager.consume("jump")) {
      if (!isJumping) {
        isJumping = true;
        isSliding = false;
        mesh.scale.y = 1;
        velocityY = JUMP_VELOCITY;
        AudioEngine.playJump();
      } else if (isJumping && InputManager.consume("slide")) {
        // Fast-fall while airborne
        velocityY = -JUMP_VELOCITY * 1.5;
      }
    }

    // Slide
    if (InputManager.consume("slide")) {
      if (isJumping) {
        // Fast fall
        velocityY = -JUMP_VELOCITY * 1.5;
      } else if (!isSliding) {
        isSliding = true;
        slideTimer = SLIDE_DURATION;
        mesh.scale.y = 0.4;
        mesh.position.y = SLIDE_HEIGHT / 2;
        AudioEngine.playSlide();
      }
    }

    // Hoverboard deploy (double-space)
    if (InputManager.consume("spaceDouble")) {
      // Handled by PowerupManager if hoverboards are in stock
    }
  }

  function getCollisionBox() {
    if (!mesh) return null;
    const h = isSliding ? SLIDE_HEIGHT : NORMAL_HEIGHT;
    return {
      x: mesh.position.x - bbox.width / 2,
      y: mesh.position.y - h / 2,
      z: mesh.position.z - bbox.depth / 2,
      w: bbox.width,
      h: h,
      d: bbox.depth,
      centerX: mesh.position.x,
      centerY: mesh.position.y,
      centerZ: mesh.position.z
    };
  }

  function triggerInvulnerability(duration = 2.0) {
    isInvulnerable = true;
    invulnerableTimer = duration;
  }

  function activateHoverboard(duration = 30) {
    hoverboardActive = true;
    hoverboardTimer = duration;
  }

  function reset(scene) {
    if (mesh) scene.remove(mesh);
    init(scene);
  }

  return {
    init,
    update,
    handleInput,
    getCollisionBox,
    triggerInvulnerability,
    activateHoverboard,
    reset,
    getMesh: () => mesh,
    getZ: () => positionZ,
    getX: () => mesh ? mesh.position.x : 0,
    getY: () => mesh ? mesh.position.y : 0,
    isPlayerJumping: () => isJumping,
    isPlayerSliding: () => isSliding,
    isPlayerInvulnerable: () => isInvulnerable,
    hasHoverboard: () => hoverboardActive,
    consumeHoverboard() {
      if (hoverboardActive) {
        hoverboardActive = false;
        return true;
      }
      return false;
    },
    LANE_WIDTH,
    NORMAL_HEIGHT
  };
})();

