(() => {
  'use strict';

  const canvas = document.getElementById('world');
  const coordsEl = document.getElementById('coords');
  const dayStateEl = document.getElementById('dayState');
  const startScreen = document.getElementById('startScreen');
  const startBtn = document.getElementById('startBtn');
  const hint = document.getElementById('hint');
  const hotbar = document.getElementById('hotbar');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x79bce9);
  scene.fog = new THREE.Fog(0x79bce9, 18, 45);

  const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 100);
  camera.rotation.order = 'YXZ';

  const hemi = new THREE.HemisphereLight(0xccecff, 0x4d5b39, 1.15);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff0c7, 1.2);
  sun.position.set(18, 26, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  scene.add(sun);

  const BLOCK = 1;
  const WORLD_RADIUS = 9;
  const EYE_HEIGHT = 1.62;
  const PLAYER_RADIUS = .28;
  const GRAVITY = 20;
  const JUMP_SPEED = 7.2;
  const MOVE_SPEED = 5.2;

  const blockGeo = new THREE.BoxGeometry(BLOCK, BLOCK, BLOCK);
  const materials = {
    grass: new THREE.MeshLambertMaterial({ color: 0x63aa46 }),
    dirt: new THREE.MeshLambertMaterial({ color: 0x7a5238 }),
    stone: new THREE.MeshLambertMaterial({ color: 0x7f8587 }),
    wood: new THREE.MeshLambertMaterial({ color: 0x8b603e }),
    leaves: new THREE.MeshLambertMaterial({ color: 0x3f8c48, transparent: true, opacity: .93 }),
    sand: new THREE.MeshLambertMaterial({ color: 0xd5c07f })
  };

  const blocks = [];
  const blockMap = new Map();
  const keys = Object.create(null);
  const raycaster = new THREE.Raycaster();
  raycaster.far = 6;

  let selectedBlock = 'grass';
  let yaw = 0;
  let pitch = 0;
  let velocityY = 0;
  let onGround = false;
  let started = false;
  let dayClock = 0;

  const spawn = new THREE.Vector3(0, 8, 0);
  const player = {
    x: 0,
    y: 8,
    z: 0
  };

  function keyFor(x, y, z) {
    return x + ',' + y + ',' + z;
  }

  function addBlock(x, y, z, type, persist = false) {
    const key = keyFor(x, y, z);
    if (blockMap.has(key)) return;

    const mesh = new THREE.Mesh(blockGeo, materials[type] || materials.dirt);
    mesh.position.set(x, y, z);
    mesh.castShadow = type === 'wood' || type === 'leaves';
    mesh.receiveShadow = true;
    mesh.userData = { x, y, z, type };
    scene.add(mesh);
    blocks.push(mesh);
    blockMap.set(key, mesh);

    if (persist) saveWorld();
  }

  function removeBlock(mesh, persist = false) {
    if (!mesh || !mesh.userData) return;
    const { x, y, z } = mesh.userData;

    if (y <= -2) return;

    scene.remove(mesh);
    blockMap.delete(keyFor(x, y, z));
    const i = blocks.indexOf(mesh);
    if (i >= 0) blocks.splice(i, 1);

    if (persist) saveWorld();
  }

  function heightNoise(x, z) {
    const h =
      1.8 +
      Math.sin(x * .48) * .8 +
      Math.cos(z * .42) * .65 +
      Math.sin((x + z) * .24) * .55;

    return Math.round(h);
  }

  function generateTerrain() {
    for (let x = -WORLD_RADIUS; x <= WORLD_RADIUS; x++) {
      for (let z = -WORLD_RADIUS; z <= WORLD_RADIUS; z++) {
        const edge = Math.max(Math.abs(x), Math.abs(z));
        let h = heightNoise(x, z);

        if (edge > WORLD_RADIUS - 2) h = Math.min(h, 1);

        const beach = h <= 1 && (Math.abs(x + z) % 5 < 2);
        const topType = beach ? 'sand' : 'grass';

        for (let y = -2; y <= h; y++) {
          let type = 'stone';
          if (y === h) type = topType;
          else if (y >= h - 1) type = beach ? 'sand' : 'dirt';
          addBlock(x, y, z, type);
        }
      }
    }

    const treeSeeds = [
      [-6,-4],[-5,5],[-2,-7],[3,-6],[6,-2],[5,5],[-1,6],[7,3]
    ];

    treeSeeds.forEach(([x,z], index) => {
      const groundY = highestSolidY(x, z);
      if (groundY < 1) return;

      const trunkH = 3 + (index % 2);
      for (let y = groundY + 1; y <= groundY + trunkH; y++) {
        addBlock(x, y, z, 'wood');
      }

      const crownY = groundY + trunkH;
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          for (let dy = 0; dy <= 2; dy++) {
            const d = Math.abs(dx) + Math.abs(dz) + Math.abs(dy - 1);
            if (d <= 3 && !(dx === 0 && dz === 0 && dy === 0)) {
              addBlock(x + dx, crownY + dy, z + dz, 'leaves');
            }
          }
        }
      }
    });
  }

  function highestSolidY(x, z) {
    x = Math.round(x);
    z = Math.round(z);
    let best = -99;

    for (let y = 20; y >= -3; y--) {
      if (blockMap.has(keyFor(x, y, z))) {
        best = y;
        break;
      }
    }
    return best;
  }

  function groundTopAt(x, z) {
    const y = highestSolidY(x, z);
    return y > -90 ? y + .5 : -20;
  }

  function saveWorld() {
    const custom = blocks.map(mesh => ({
      x: mesh.userData.x,
      y: mesh.userData.y,
      z: mesh.userData.z,
      type: mesh.userData.type
    }));

    try {
      localStorage.setItem('minecraftRellX1000WorldV1', JSON.stringify(custom));
    } catch {}
  }

  function loadWorld() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem('minecraftRellX1000WorldV1') || 'null');
    } catch {}

    if (!Array.isArray(saved) || saved.length < 50) {
      generateTerrain();
      return;
    }

    saved.forEach(b => {
      if (
        Number.isFinite(b.x) &&
        Number.isFinite(b.y) &&
        Number.isFinite(b.z) &&
        materials[b.type]
      ) {
        addBlock(b.x, b.y, b.z, b.type);
      }
    });
  }

  function resetPlayer() {
    const gy = groundTopAt(0, 0);
    player.x = spawn.x;
    player.y = Math.max(spawn.y, gy + .01);
    player.z = spawn.z;
    velocityY = 0;
    updateCameraPosition();
  }

  function updateCameraPosition() {
    camera.position.set(player.x, player.y + EYE_HEIGHT, player.z);
    camera.rotation.x = pitch;
    camera.rotation.y = yaw;
  }

  function collidesHorizontally(x, z, footY) {
    const points = [
      [x - PLAYER_RADIUS, z - PLAYER_RADIUS],
      [x + PLAYER_RADIUS, z - PLAYER_RADIUS],
      [x - PLAYER_RADIUS, z + PLAYER_RADIUS],
      [x + PLAYER_RADIUS, z + PLAYER_RADIUS]
    ];

    for (const [px, pz] of points) {
      const gx = Math.round(px);
      const gz = Math.round(pz);
      for (let y = Math.floor(footY); y <= Math.floor(footY + 1.55); y++) {
        if (blockMap.has(keyFor(gx, y, gz))) return true;
      }
    }
    return false;
  }

  function movePlayer(dt) {
    const forward = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    const strafe = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);

    if (forward || strafe) {
      const len = Math.hypot(forward, strafe);
      const f = forward / len;
      const s = strafe / len;

      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);

      const dx = (sin * f + cos * s) * MOVE_SPEED * dt;
      const dz = (cos * f - sin * s) * MOVE_SPEED * dt;

      const tryX = player.x + dx;
      if (!collidesHorizontally(tryX, player.z, player.y)) player.x = tryX;

      const tryZ = player.z + dz;
      if (!collidesHorizontally(player.x, tryZ, player.y)) player.z = tryZ;
    }

    velocityY -= GRAVITY * dt;
    player.y += velocityY * dt;

    const ground = groundTopAt(player.x, player.z);

    if (player.y <= ground) {
      player.y = ground;
      velocityY = 0;
      onGround = true;
    } else {
      onGround = false;
    }

    if (player.y < -12) resetPlayer();

    updateCameraPosition();
  }

  function updateDayNight(dt) {
    dayClock = (dayClock + dt * .012) % 1;
    const angle = dayClock * Math.PI * 2;
    const daylight = THREE.MathUtils.clamp(Math.sin(angle) * .55 + .55, .08, 1);

    sun.position.set(Math.cos(angle) * 28, Math.sin(angle) * 34, 10);
    sun.intensity = .18 + daylight * 1.25;
    hemi.intensity = .22 + daylight * .95;

    const day = new THREE.Color(0x79bce9);
    const night = new THREE.Color(0x081324);
    const sky = night.clone().lerp(day, daylight);
    scene.background.copy(sky);
    scene.fog.color.copy(sky);

    dayStateEl.textContent = daylight > .62 ? 'نهار' : daylight > .28 ? 'غروب' : 'ليل';
  }

  function updateHud() {
    coordsEl.textContent =
      Math.round(player.x) + ', ' +
      Math.round(player.y) + ', ' +
      Math.round(player.z);
  }

  function centerRay() {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    return raycaster.intersectObjects(blocks, false);
  }

  function breakBlock() {
    const hit = centerRay()[0];
    if (!hit || hit.distance > 6) return;
    removeBlock(hit.object, true);
  }

  function placeBlock() {
    const hit = centerRay()[0];
    if (!hit || hit.distance > 6 || !hit.face) return;

    const normal = hit.face.normal.clone();
    normal.transformDirection(hit.object.matrixWorld);

    const p = hit.object.position.clone().add(normal);
    p.set(Math.round(p.x), Math.round(p.y), Math.round(p.z));

    const bodyMinY = player.y;
    const bodyMaxY = player.y + 1.75;
    const insidePlayer =
      Math.abs(p.x - player.x) < .75 &&
      Math.abs(p.z - player.z) < .75 &&
      p.y + .5 > bodyMinY &&
      p.y - .5 < bodyMaxY;

    if (!insidePlayer) addBlock(p.x, p.y, p.z, selectedBlock, true);
  }

  function selectBlock(type) {
    if (!materials[type]) return;
    selectedBlock = type;

    hotbar.querySelectorAll('button').forEach(button => {
      button.classList.toggle('selected', button.dataset.block === type);
    });
  }

  function onMouseMove(e) {
    if (document.pointerLockElement !== canvas) return;

    yaw -= e.movementX * .0023;
    pitch -= e.movementY * .0021;
    pitch = THREE.MathUtils.clamp(pitch, -1.48, 1.48);
  }

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }

  let last = performance.now();

  function loop(now) {
    const dt = Math.min((now - last) / 1000, .033);
    last = now;

    if (started) {
      movePlayer(dt);
      updateDayNight(dt);
      updateHud();
    }

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  startBtn.addEventListener('click', () => {
    started = true;
    startScreen.classList.add('hidden');
    canvas.requestPointerLock();
  });

  canvas.addEventListener('click', () => {
    if (started && document.pointerLockElement !== canvas) {
      canvas.requestPointerLock();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === canvas;
    hint.classList.toggle('show', started && !locked);
  });

  document.addEventListener('mousemove', onMouseMove);

  document.addEventListener('keydown', e => {
    keys[e.code] = true;

    if (e.code === 'Space') {
      e.preventDefault();
      if (onGround) velocityY = JUMP_SPEED;
    }

    if (e.code === 'KeyR') resetPlayer();

    const map = {
      Digit1: 'grass',
      Digit2: 'dirt',
      Digit3: 'stone',
      Digit4: 'wood',
      Digit5: 'leaves',
      Digit6: 'sand'
    };

    if (map[e.code]) selectBlock(map[e.code]);
  });

  document.addEventListener('keyup', e => {
    keys[e.code] = false;
  });

  canvas.addEventListener('mousedown', e => {
    if (document.pointerLockElement !== canvas) return;
    if (e.button === 0) breakBlock();
    if (e.button === 2) placeBlock();
  });

  canvas.addEventListener('contextmenu', e => e.preventDefault());

  hotbar.addEventListener('click', e => {
    const button = e.target.closest('button[data-block]');
    if (button) selectBlock(button.dataset.block);
  });

  addEventListener('resize', resize);

  loadWorld();
  resetPlayer();
  updateDayNight(0);
  updateHud();
  requestAnimationFrame(loop);
})();