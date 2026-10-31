// ================================================================
// Banana Surfers – Collectibles (Bananas + Mystery Crates)
// ================================================================
const Collectibles = (() => {
  const LANE_WIDTH = 2.5;
  const LANES = [-1, 0, 1];

  // Banana spawning
  const BANANA_INTERVAL = 6; // meters between banana clusters
  const BANANAS_PER_CLUSTER = 3;
  const BANANA_RADIUS = 0.25;

  // Crate spawning
  const CRATE_INTERVAL_MIN = 350;
  const CRATE_INTERVAL_MAX = 500;

  let scene = null;
  const bananas = [];
  const crates = [];
  let nextBananaZ = -15;
  let nextCrateZ = -100; // First crate after some distance
  let nextCrateTarget = 0;

  // Shared materials
  const bananaMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xffaa00,
    emissiveIntensity: 0.4,
    roughness: 0.3
  });
  const crateMat = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.7,
    metalness: 0.1
  });
  const crateGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xffd700,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.6
  });

  function init(sceneRef) {
    scene = sceneRef;
    bananas.length = 0;
    crates.length = 0;
    nextBananaZ = -15;
    nextCrateZ = -(CRATE_INTERVAL_MIN + Math.random() * (CRATE_INTERVAL_MAX - CRATE_INTERVAL_MIN));
    nextCrateTarget = nextCrateZ;
  }

  function spawnBananaCluster(z) {
    const lane = LANES[Math.floor(Math.random() * 3)];
    const x = lane * LANE_WIDTH;

    for (let i = 0; i < BANANAS_PER_CLUSTER; i++) {
      const geo = new THREE.SphereGeometry(BANANA_RADIUS, 8, 8);
      // Stretch into banana-like shape
      geo.scale(1, 0.6, 1.4);
      const mesh = new THREE.Mesh(geo, bananaMat);
      mesh.position.set(x, 1.0 + Math.sin(i * 1.2) * 0.3, z - i * 1.5);
      mesh.castShadow = true;
      scene.add(mesh);
      bananas.push({ mesh, collected: false });
    }
  }

  function spawnCrate(z) {
    const lane = LANES[Math.floor(Math.random() * 3)];
    const x = lane * LANE_WIDTH;

    // Main crate body
    const crateGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const crate = new THREE.Mesh(crateGeo, crateMat);
    crate.position.set(x, 0.7, z);
    crate.castShadow = true;

    // Question mark on top
    const qGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const qMesh = new THREE.Mesh(qGeo, crateGlowMat);
    qMesh.position.y = 0.65;
    crate.add(qMesh);

    // Glow ring
    const ringGeo = new THREE.RingGeometry(0.6, 0.75, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.2;
    crate.add(ring);

    scene.add(crate);
    crates.push({ mesh: crate, collected: false });
  }

  function update(playerZ, distance, deltaTime) {
    // Spawn bananas
    while (nextBananaZ > playerZ - World.CHUNK_LENGTH * World.VISIBLE_CHUNKS * 0.6) {
      nextBananaZ -= BANANA_INTERVAL;
      spawnBananaCluster(nextBananaZ);
    }

    // Spawn crates
    if (playerZ <= nextCrateTarget) {
      spawnCrate(nextCrateTarget - 30); // Place ahead
      nextCrateTarget -= (CRATE_INTERVAL_MIN + Math.random() * (CRATE_INTERVAL_MAX - CRATE_INTERVAL_MIN));
    }

    // Animate bananas (floating bob + rotation)
    const time = performance.now() * 0.001;
    bananas.forEach(b => {
      if (!b.collected) {
        b.mesh.rotation.y += deltaTime * 2;
        b.mesh.position.y = 1.0 + Math.sin(time + b.mesh.position.z * 0.5) * 0.2;
      }
    });

    // Animate crates (slow rotation + glow pulse)
    crates.forEach(c => {
      if (!c.collected) {
        c.mesh.rotation.y += deltaTime * 1.2;
      }
    });

    // Cleanup far-behind items
    cleanup(playerZ);
  }

  function cleanup(playerZ) {
    for (let i = bananas.length - 1; i >= 0; i--) {
      if (bananas[i].mesh.position.z > playerZ + 15 || bananas[i].collected) {
        if (bananas[i].collected) {
          // Already collected, remove after a short delay
        }
        if (bananas[i].mesh.position.z > playerZ + 15) {
          scene.remove(bananas[i].mesh);
          bananas[i].mesh.traverse(c => { if (c.isMesh) c.geometry.dispose(); });
          bananas.splice(i, 1);
        }
      }
    }
    for (let i = crates.length - 1; i >= 0; i--) {
      if (crates[i].mesh.position.z > playerZ + 15) {
        scene.remove(crates[i].mesh);
        crates[i].mesh.traverse(c => { if (c.isMesh) c.geometry.dispose(); });
        crates.splice(i, 1);
      }
    }
  }

  function checkBananaCollision(playerBox) {
    let collected = 0;
    if (!playerBox) return collected;

    for (const b of bananas) {
      if (b.collected) continue;
      const bx = b.mesh.position.x;
      const by = b.mesh.position.y;
      const bz = b.mesh.position.z;
      const r = BANANA_RADIUS + 0.3; // generous pickup radius

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
      const halfSize = 0.45;

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
    crates.forEach(c => { scene.remove(c.mesh); c.mesh.traverse(c2 => { if (c2.isMesh) c2.geometry.dispose(); }); });
    bananas.length = 0;
    crates.length = 0;
    nextBananaZ = -15;
    nextCrateTarget = -(CRATE_INTERVAL_MIN + Math.random() * (CRATE_INTERVAL_MAX - CRATE_INTERVAL_MIN));
  }

  return { init, update, checkBananaCollision, checkCrateCollision, reset };
})();

