// ================================================================
// Banana Surfers – 3D World (Three.js Scene, Camera, Lighting,
//                             Procedural Infinite Track Chunks)
// ================================================================
const World = (() => {
  // ---- Constants ----
  const LANE_WIDTH = 2.5;
  const CHUNK_LENGTH = 40;
  const VISIBLE_CHUNKS = 12;
  const FOG_NEAR = 20;
  const FOG_FAR = CHUNK_LENGTH * VISIBLE_CHUNKS * 0.8;

  // ---- Three.js Core ----
  let scene, camera, renderer;
  let ambientLight, dirLight;

  // Track chunk pool
  const chunkPool = [];
  let nextChunkZ = 0; // World-Z where the next chunk starts (grows negative = into the screen)

  // Shared materials
  let trackMaterial, trackSideMaterial, railMaterial;

  function init(canvas) {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0b1a);
    scene.fog = new THREE.Fog(0x0d0b1a, FOG_NEAR, FOG_FAR);

    // Camera – over-the-shoulder perspective
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 3.8, 6);
    camera.lookAt(0, 1.2, -20);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting
    ambientLight = new THREE.AmbientLight(0x6644aa, 0.5);
    scene.add(ambientLight);

    dirLight = new THREE.DirectionalLight(0xffeedd, 1.0);
    dirLight.position.set(5, 15, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 80;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    scene.add(dirLight);
    scene.add(dirLight.target);

    // Hemisphere light for ambient color from sky/ground
    const hemiLight = new THREE.HemisphereLight(0x7733cc, 0x225511, 0.35);
    scene.add(hemiLight);

    // Shared materials with vibrant cyberpunk highway aesthetics
    trackMaterial = new THREE.MeshStandardMaterial({
      color: 0x2e1b5c,
      emissive: 0x170b32,
      emissiveIntensity: 0.45,
      roughness: 0.6,
      metalness: 0.25
    });
    trackSideMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a1d96, // Bright neon purple curbs
      roughness: 0.4,
      metalness: 0.3
    });
    railMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffaa00,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.5
    });

    // Generate initial chunks
    nextChunkZ = CHUNK_LENGTH; // Start slightly behind the camera
    for (let i = 0; i < VISIBLE_CHUNKS; i++) {
      spawnChunk();
    }

    // Handle resize
    window.addEventListener("resize", onResize);
  }

  function onResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ---- Track Chunk Creation ----
  function createChunkMesh(zStart) {
    const group = new THREE.Group();
    group.userData.zStart = zStart;
    group.userData.zEnd = zStart - CHUNK_LENGTH;

    // Main road surface (3 distinct running lanes)
    const trackWidth = LANE_WIDTH * 3 + 1.2;
    const trackGeo = new THREE.BoxGeometry(trackWidth, 0.3, CHUNK_LENGTH);
    const track = new THREE.Mesh(trackGeo, trackMaterial);
    track.position.set(0, -0.15, zStart - CHUNK_LENGTH / 2);
    track.receiveShadow = true;
    group.add(track);

    // Glowing Neon Rails / Curbs on Left and Right borders
    const wallHeight = 0.55;
    const wallGeo = new THREE.BoxGeometry(0.25, wallHeight, CHUNK_LENGTH);

    const leftWall = new THREE.Mesh(wallGeo, trackSideMaterial);
    leftWall.position.set(-trackWidth / 2 - 0.1, wallHeight / 2 - 0.15, zStart - CHUNK_LENGTH / 2);
    leftWall.receiveShadow = true;
    group.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeo, trackSideMaterial);
    rightWall.position.set(trackWidth / 2 + 0.1, wallHeight / 2 - 0.15, zStart - CHUNK_LENGTH / 2);
    rightWall.receiveShadow = true;
    group.add(rightWall);

    // Neon edge light piping along curbs
    const pipeGeo = new THREE.BoxGeometry(0.08, 0.08, CHUNK_LENGTH);
    const leftPipe = new THREE.Mesh(pipeGeo, railMaterial);
    leftPipe.position.set(-trackWidth / 2 - 0.1, wallHeight - 0.12, zStart - CHUNK_LENGTH / 2);
    group.add(leftPipe);

    const rightPipe = new THREE.Mesh(pipeGeo, railMaterial);
    rightPipe.position.set(trackWidth / 2 + 0.1, wallHeight - 0.12, zStart - CHUNK_LENGTH / 2);
    group.add(rightPipe);

    // High-visibility Highway Dashed Lane Dividers (between Left/Center and Center/Right)
    const dashLength = 3.2;
    const dashGap = 2.4;
    const dashGeo = new THREE.BoxGeometry(0.18, 0.04, dashLength);
    const dashMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffaa00,
      emissiveIntensity: 0.8
    });

    const dividerX1 = -LANE_WIDTH / 2; // -1.25 (boundary between Left and Center lanes)
    const dividerX2 =  LANE_WIDTH / 2; // +1.25 (boundary between Center and Right lanes)

    for (let zOffset = 2; zOffset < CHUNK_LENGTH - 2; zOffset += (dashLength + dashGap)) {
      const zPos = zStart - zOffset;

      const d1 = new THREE.Mesh(dashGeo, dashMat);
      d1.position.set(dividerX1, 0.02, zPos);
      group.add(d1);

      const d2 = new THREE.Mesh(dashGeo, dashMat);
      d2.position.set(dividerX2, 0.02, zPos);
      group.add(d2);
    }

    // Ambient environment – pillars at chunk edges
    if (Math.random() > 0.5) {
      const pillarGeo = new THREE.CylinderGeometry(0.3, 0.35, 4, 6);
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x3d2b6e, roughness: 0.7 });
      const sideX = (Math.random() > 0.5 ? 1 : -1) * (trackWidth / 2 + 1.5);
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(sideX, 2, zStart - CHUNK_LENGTH * 0.2);
      pillar.castShadow = true;
      group.add(pillar);
    }

    return group;
  }

  function spawnChunk() {
    nextChunkZ -= CHUNK_LENGTH;
    const chunk = createChunkMesh(nextChunkZ + CHUNK_LENGTH);
    scene.add(chunk);
    chunkPool.push(chunk);
  }

  function recycleChunks(playerZ) {
    // Remove chunks that are behind the camera
    while (chunkPool.length > 0 && chunkPool[0].userData.zStart > playerZ + CHUNK_LENGTH * 2) {
      const old = chunkPool.shift();
      scene.remove(old);
      // Dispose geometry
      old.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
        }
      });
    }
    // Ensure enough chunks ahead
    const farthestZ = chunkPool.length > 0 ? chunkPool[chunkPool.length - 1].userData.zEnd : 0;
    while (farthestZ > playerZ - CHUNK_LENGTH * VISIBLE_CHUNKS) {
      spawnChunk();
      // Re-check
      break; // spawnChunk already pushed one; the loop condition rechecks next frame
    }
  }

  function update(playerZ) {
    // Keep spawning chunks ahead of the player
    const targetFarZ = playerZ - CHUNK_LENGTH * VISIBLE_CHUNKS;
    while (nextChunkZ > targetFarZ) {
      spawnChunk();
    }
    recycleChunks(playerZ);

    // Move directional light shadow to follow the player
    if (dirLight) {
      dirLight.position.z = playerZ - 5;
      dirLight.target.position.z = playerZ - 15;
      dirLight.target.updateMatrixWorld();
    }
  }

  function render() {
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  function reset() {
    chunkPool.forEach((chunk) => {
      scene.remove(chunk);
      chunk.traverse((child) => {
        if (child.isMesh) child.geometry.dispose();
      });
    });
    chunkPool.length = 0;
    nextChunkZ = CHUNK_LENGTH;
    for (let i = 0; i < VISIBLE_CHUNKS; i++) {
      spawnChunk();
    }
  }

  return {
    init,
    update,
    render,
    getScene: () => scene,
    getCamera: () => camera,
    LANE_WIDTH,
    CHUNK_LENGTH,
    VISIBLE_CHUNKS,
    reset
  };
})();

