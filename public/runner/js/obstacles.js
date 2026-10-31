// ================================================================
// Banana Surfers – Obstacle System
// Procedural spawning with 3 obstacle types:
//   LOW  = jump over  (barriers, logs)
//   HIGH = slide under (overhead beams, arches)
//   FULL = lane blocker (must switch lane)
// ================================================================
const Obstacles = (() => {
  const SPAWN_INTERVAL_BASE = 18; // meters between obstacle groups initially
  const SPAWN_INTERVAL_MIN = 8;
  const LANE_WIDTH = 2.5;
  const LANES = [-1, 0, 1];

  const pool = []; // active obstacle objects in scene
  let nextSpawnZ = -30; // Z coord where next obstacle group spawns
  let scene = null;

  // Shared materials
  const matLow = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.6 });
  const matHigh = new THREE.MeshStandardMaterial({ color: 0x8844cc, roughness: 0.5 });
  const matFull = new THREE.MeshStandardMaterial({ color: 0x555577, roughness: 0.7 });

  // Obstacle type definitions
  const TYPES = {
    LOW: { height: 0.7, width: 2.0, depth: 0.5, yOffset: 0.35, mat: matLow, label: "low" },
    HIGH: { height: 0.4, width: 2.2, depth: 0.5, yOffset: 2.2, mat: matHigh, label: "high" },
    FULL: { height: 2.5, width: 2.0, depth: 0.6, yOffset: 1.25, mat: matFull, label: "full" }
  };

  // Spawn patterns
  const PATTERNS = [
    // Pattern A: single low in one lane
    (z) => {
      const lane = LANES[Math.floor(Math.random() * 3)];
      return [{ type: "LOW", lane, z }];
    },
    // Pattern B: high beam across 1-2 lanes
    (z) => {
      const lane = LANES[Math.floor(Math.random() * 3)];
      return [{ type: "HIGH", lane, z }];
    },
    // Pattern C: full blocker in two lanes (must use remaining lane)
    (z) => {
      const open = Math.floor(Math.random() * 3);
      const result = [];
      for (let i = 0; i < 3; i++) {
        if (i !== open) result.push({ type: "FULL", lane: LANES[i], z });
      }
      return result;
    },
    // Pattern D: low + high combo across lanes
    (z) => {
      const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
      return [
        { type: "LOW", lane: LANES[lanes[0]], z },
        { type: "HIGH", lane: LANES[lanes[1]], z }
      ];
    },
    // Pattern E: staggered – two lows in different lanes
    (z) => {
      const l1 = Math.floor(Math.random() * 3);
      let l2 = (l1 + 1 + Math.floor(Math.random() * 2)) % 3;
      return [
        { type: "LOW", lane: LANES[l1], z },
        { type: "LOW", lane: LANES[l2], z: z - 4 }
      ];
    }
  ];

  function init(sceneRef) {
    scene = sceneRef;
    pool.length = 0;
    nextSpawnZ = -30;
  }

  function getSpawnInterval(distance) {
    // Gets tighter as distance increases
    const progress = Math.min(distance / 3000, 1);
    return SPAWN_INTERVAL_BASE - (SPAWN_INTERVAL_BASE - SPAWN_INTERVAL_MIN) * progress;
  }

  function createObstacle(typeName, laneIndex, z) {
    const tdef = TYPES[typeName];
    const geo = new THREE.BoxGeometry(tdef.width, tdef.height, tdef.depth);
    const mesh = new THREE.Mesh(geo, tdef.mat);
    mesh.position.set(laneIndex * LANE_WIDTH, tdef.yOffset, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Add decorative top stripe for visibility
    if (typeName === "LOW") {
      const stripeGeo = new THREE.BoxGeometry(tdef.width + 0.1, 0.08, tdef.depth + 0.1);
      const stripeMat = new THREE.MeshStandardMaterial({ color: 0xff6644, emissive: 0xff4422, emissiveIntensity: 0.3 });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.y = tdef.height / 2;
      mesh.add(stripe);
    }
    if (typeName === "HIGH") {
      // Supporting columns on sides
      const colGeo = new THREE.BoxGeometry(0.15, 2.2, 0.15);
      const colMat = new THREE.MeshStandardMaterial({ color: 0x6633aa });
      const colL = new THREE.Mesh(colGeo, colMat);
      colL.position.set(-tdef.width / 2 + 0.1, -0.9, 0);
      mesh.add(colL);
      const colR = new THREE.Mesh(colGeo, colMat);
      colR.position.set(tdef.width / 2 - 0.1, -0.9, 0);
      mesh.add(colR);
    }

    scene.add(mesh);

    pool.push({
      mesh,
      type: typeName,
      lane: laneIndex,
      bbox: {
        x: mesh.position.x - tdef.width / 2,
        y: mesh.position.y - tdef.height / 2,
        z: mesh.position.z - tdef.depth / 2,
        w: tdef.width, h: tdef.height, d: tdef.depth
      }
    });
  }

  function update(playerZ, distance) {
    // Spawn new obstacle groups ahead
    while (nextSpawnZ > playerZ - World.CHUNK_LENGTH * World.VISIBLE_CHUNKS * 0.7) {
      nextSpawnZ -= getSpawnInterval(distance);
      const pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
      const items = pattern(nextSpawnZ);
      items.forEach(item => createObstacle(item.type, item.lane, item.z));
    }

    // Remove obstacles that are behind the player
    for (let i = pool.length - 1; i >= 0; i--) {
      if (pool[i].mesh.position.z > playerZ + 20) {
        scene.remove(pool[i].mesh);
        pool[i].mesh.traverse(c => { if (c.isMesh) c.geometry.dispose(); });
        pool.splice(i, 1);
      }
    }
  }

  function checkCollision(playerBox) {
    if (!playerBox) return null;
    for (const obs of pool) {
      const ob = obs.bbox;
      // Update bbox world position
      ob.x = obs.mesh.position.x - ob.w / 2;
      ob.y = obs.mesh.position.y - ob.h / 2;
      ob.z = obs.mesh.position.z - ob.d / 2;

      // AABB intersection test
      if (
        playerBox.x < ob.x + ob.w &&
        playerBox.x + playerBox.w > ob.x &&
        playerBox.y < ob.y + ob.h &&
        playerBox.y + playerBox.h > ob.y &&
        playerBox.z < ob.z + ob.d &&
        playerBox.z + playerBox.d > ob.z
      ) {
        // Check if the player can avoid via jump/slide
        if (obs.type === "LOW" && playerBox.y > ob.y + ob.h * 0.7) continue; // jumped over
        if (obs.type === "HIGH" && playerBox.y + playerBox.h < ob.y + 0.2) continue; // slid under
        return obs;
      }
    }
    return null;
  }

  function reset() {
    pool.forEach(o => {
      scene.remove(o.mesh);
      o.mesh.traverse(c => { if (c.isMesh) c.geometry.dispose(); });
    });
    pool.length = 0;
    nextSpawnZ = -30;
  }

  return { init, update, checkCollision, reset, getPool: () => pool };
})();

