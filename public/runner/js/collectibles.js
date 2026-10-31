// ================================================================
// Banana Surfers – Collectibles (Bananas + Mystery Crates)
// Features Magnet suction physics and Sky Bananas during Jetpack flight
// ================================================================
const Collectibles = (() => {
  const LANE_WIDTH = 2.5;
  const LANES = [-1, 0, 1];

  // Banana spawning
  const BANANA_INTERVAL = 5.5; // Meters between banana clusters
  const BANANAS_PER_CLUSTER = 3;
  const BANANA_RADIUS = 0.28;

  // Crate spawning frequency – fast first encounter then regular intervals
  const FIRST_CRATE_DISTANCE = 45; // First crate appears at 45m
  const CRATE_INTERVAL_MIN = 110;
  const CRATE_INTERVAL_MAX = 170;

  let scene = null;
  const bananas = [];
  const crates = [];
  let nextBananaZ = -12;
  let nextCrateZ = -FIRST_CRATE_DISTANCE;

  // Shared materials
  const bananaMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xffaa00,
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.2
  });

  const crateWoodMat = new THREE.MeshStandardMaterial({
    color: 0x854d0e,
    roughness: 0.7,
    metalness: 0.1
  });

  const crateBorderMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xffa500,
    emissiveIntensity: 0.6,
    roughness: 0.3
  });

  const crateGlowRingMat = new THREE.MeshBasicMaterial({
    color: 0xffd700,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide
  });

  function init(sceneRef) {
    scene = sceneRef;
    bananas.length = 0;
    crates.length = 0;
    nextBananaZ = -12;
    nextCrateZ = -FIRST_CRATE_DISTANCE;
  }

  function spawnBananaCluster(z, altitude = 1.0) {
    const lane = LANES[Math.floor(Math.random() * 3)];
    const x = lane * LANE_WIDTH;

    for (let i = 0; i < BANANAS_PER_CLUSTER; i++) {
      const geo = new THREE.SphereGeometry(BANANA_RADIUS, 8, 8);
      geo.scale(1, 0.65, 1.4);
      const mesh = new THREE.Mesh(geo, bananaMat);
      mesh.position.set(x, altitude + Math.sin(i * 1.2) * 0.25, z - i * 1.4);
      mesh.castShadow = true;
      scene.add(mesh);
      bananas.push({ mesh, collected: false, baseAltitude: altitude });
    }
  }

  function spawnCrate(z) {
    const lane = LANES[Math.floor(Math.random() * 3)];
    const x = lane * LANE_WIDTH;

    const crateGroup = new THREE.Group();
    crateGroup.position.set(x, 0.75, z);

    // Main Wooden Crate Body
    const crateGeo = new THREE.BoxGeometry(0.95, 0.95, 0.95);
    const crate = new THREE.Mesh(crateGeo, crateWoodMat);
    crate.castShadow = true;
    crateGroup.add(crate);

    // Golden Edge Brackets
    const edgeGeo = new THREE.BoxGeometry(1.02, 1.02, 0.15);
    const edge = new THREE.Mesh(edgeGeo, crateBorderMat);
    crateGroup.add(edge);

    // Glowing Question Mark Sphere / Emblem on top
    const emblemGeo = new THREE.SphereGeometry(0.25, 10, 10);
    const emblemMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.9
    });
    const emblem = new THREE.Mesh(emblemGeo, emblemMat);
    emblem.position.y = 0.7;
    crateGroup.add(emblem);

    // Glowing Hologram Ring
    const ringGeo = new THREE.RingGeometry(0.65, 0.85, 20);
    const ring = new THREE.Mesh(ringGeo, crateGlowRingMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.3;
    crateGroup.add(ring);

    scene.add(crateGroup);
    crates.push({ mesh: crateGroup, collected: false });
  }

  function update(playerZ, distance, deltaTime) {
    const playerX = Player.getX();
    const playerY = Player.getY();
    const isJetpack = Player.isJetpackActive();
    const isMagnet = PowerupManager.isActive("MAGNET");

    // Spawn bananas ahead
    while (nextBananaZ > playerZ - World.CHUNK_LENGTH * World.VISIBLE_CHUNKS * 0.65) {
      nextBananaZ -= BANANA_INTERVAL;

      if (isJetpack) {
        // Spawn sky bananas at flight altitude
        spawnBananaCluster(nextBananaZ, 6.2);
      } else {
        // Spawn ground track bananas
        spawnBananaCluster(nextBananaZ, 1.0);
      }
    }

    // Spawn crates ahead
    if (playerZ <= nextCrateZ) {
      spawnCrate(nextCrateZ - 35);
      nextCrateZ -= (CRATE_INTERVAL_MIN + Math.random() * (CRATE_INTERVAL_MAX - CRATE_INTERVAL_MIN));
    }

    // ---- Banana Magnet Suction Physics ----
    if (isMagnet) {
      for (const b of bananas) {
        if (b.collected) continue;
        const dz = b.mesh.position.z - playerZ;
        // If banana is in suction range (within 24m ahead and 4m behind)
        if (dz > -24 && dz < 4) {
          const pullSpeed = Math.min(1, deltaTime * 14.0);
          b.mesh.position.x += (playerX - b.mesh.position.x) * pullSpeed;
          b.mesh.position.y += (playerY - b.mesh.position.y) * pullSpeed;
          b.mesh.position.z += (playerZ - b.mesh.position.z) * pullSpeed;
        }
      }
    }

    // Animate bananas (gentle bob + spin)
    const time = performance.now() * 0.0015;
    bananas.forEach(b => {
      if (!b.collected) {
        b.mesh.rotation.y += deltaTime * 2.5;
        if (!isMagnet) {
          b.mesh.position.y = b.baseAltitude + Math.sin(time + b.mesh.position.z * 0.4) * 0.18;
        }
      }
    });

    // Animate crates (slow rotation + hover bounce)
    crates.forEach(c => {
      if (!c.collected) {
        c.mesh.rotation.y += deltaTime * 1.5;
        c.mesh.position.y = 0.75 + Math.sin(time * 2.5) * 0.1;
      }
    });

    // Cleanup items behind the player
    cleanup(playerZ);
  }

  function cleanup(playerZ) {
    for (let i = bananas.length - 1; i >= 0; i--) {
      if (bananas[i].mesh.position.z > playerZ + 20 || bananas[i].collected) {
        scene.remove(bananas[i].mesh);
        bananas[i].mesh.traverse(c => { if (c.isMesh) c.geometry.dispose(); });
        bananas.splice(i, 1);
      }
    }
    for (let i = crates.length - 1; i >= 0; i--) {
      if (crates[i].mesh.position.z > playerZ + 20 || crates[i].collected) {
        scene.remove(crates[i].mesh);
        crates[i].mesh.traverse(c => { if (c.isMesh) c.geometry.dispose(); });
        crates.splice(i, 1);
      }
    }
  }

  function checkBananaCollision(playerBox) {
    let collected = 0;
    if (!playerBox) return collected;

    // Generous pickup radius, even wider if magnet is active
    const extraRadius = PowerupManager.isActive("MAGNET") ? 2.5 : 0.4;

    for (const b of bananas) {
      if (b.collected) continue;
      const bx = b.mesh.position.x;
      const by = b.mesh.position.y;
      const bz = b.mesh.position.z;
      const r = BANANA_RADIUS + extraRadius;

      if (
        Math.abs(bx - playerBox.centerX) < r + playerBox.w / 2 &&
        Math.abs(by - playerBox.centerY) < r + playerBox.h / 2 &&
        Math.abs(bz - playerBox.centerZ) < r + playerBox.d / 2
      ) {
        b.collected = true;
        scene.remove(b.mesh);
        collected++;
      }
    }
    return collected;
  }

  function checkCrateCollision(playerBox) {
    if (!playerBox) return null;

    for (const c of crates) {
      if (c.collected) continue;
      const cx = c.mesh.position.x;
      const cy = c.mesh.position.y;
      const cz = c.mesh.position.z;
      const halfSize = 0.65;

      if (
        Math.abs(cx - playerBox.centerX) < halfSize + playerBox.w / 2 &&
        Math.abs(cy - playerBox.centerY) < halfSize + playerBox.h / 2 &&
        Math.abs(cz - playerBox.centerZ) < halfSize + playerBox.d / 2
      ) {
        c.collected = true;
        scene.remove(c.mesh);
        return c;
      }
    }
    return null;
  }

  function reset() {
    bananas.forEach(b => { scene.remove(b.mesh); b.mesh.traverse(c => { if (c.isMesh) c.geometry.dispose(); }); });
    crates.forEach(c => { scene.remove(c.mesh); c.mesh.traverse(c => { if (c.isMesh) c.geometry.dispose(); }); });
    bananas.length = 0;
    crates.length = 0;
    nextBananaZ = -12;
    nextCrateZ = -FIRST_CRATE_DISTANCE;
  }

  return { init, update, checkBananaCollision, checkCrateCollision, reset };
})();
