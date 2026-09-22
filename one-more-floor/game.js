(() => {
  'use strict';

  const canvas = document.getElementById('world');
  const floorValue = document.getElementById('floorValue');
  const timeValue = document.getElementById('timeValue');
  const bestValue = document.getElementById('bestValue');
  const challengeLabel = document.getElementById('challengeLabel');
  const message = document.getElementById('message');
  const overlay = document.getElementById('overlay');
  const overlayText = document.getElementById('overlayText');
  const startBtn = document.getElementById('startBtn');
  const shareBtn = document.getElementById('shareBtn');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080b16);
  scene.fog = new THREE.Fog(0x080b16, 20, 48);

  const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, .1, 120);
  camera.position.set(0, 12, 17);

  const hemi = new THREE.HemisphereLight(0xa9c9ff, 0x2c1735, 1.05);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
  keyLight.position.set(8, 18, 10);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -18;
  keyLight.shadow.camera.right = 18;
  keyLight.shadow.camera.top = 18;
  keyLight.shadow.camera.bottom = -18;
  scene.add(keyLight);

  const accent = new THREE.PointLight(0xa35cff, 2.4, 28);
  accent.position.set(0, 6, -8);
  scene.add(accent);

  const WORLD = 10;
  const keys = Object.create(null);
  const obstacles = [];
  const hazards = [];
  const challengeObjects = [];
  const wallBoxes = [];

  let running = false;
  let dead = false;
  let currentFloor = 1;
  let floorTime = 20;
  let elapsed = 0;
  let last = 0;
  let player;
  let goal;
  let velocityY = 0;
  let grounded = true;
  let msgTimer = 0;
  let flashTimer = 0;

  const playerState = {
    x: 0,
    y: .85,
    z: 7.6,
    radius: .48
  };

  const challengeNames = [
    '⚡ الليزر الدوّار',
    '🚧 الجدران المتحركة',
    '🔥 أرضية الخطر',
    '🔴 الكرات المطاردة',
    '🧱 الممر الضيق'
  ];

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x161a29,
    roughness: .82,
    metalness: .08
  });

  const borderMat = new THREE.MeshStandardMaterial({
    color: 0x292d42,
    roughness: .72,
    metalness: .18
  });

  const safeMat = new THREE.MeshStandardMaterial({
    color: 0x262d43,
    roughness: .82
  });

  const dangerMat = new THREE.MeshStandardMaterial({
    color: 0xff315d,
    emissive: 0x7b071e,
    roughness: .55
  });

  function addRoom() {
    const floor = new THREE.Mesh(new THREE.BoxGeometry(21, .4, 21), floorMat);
    floor.position.y = -.2;
    floor.receiveShadow = true;
    scene.add(floor);

    const wallGeoH = new THREE.BoxGeometry(21, 2.2, .45);
    const wallGeoV = new THREE.BoxGeometry(.45, 2.2, 21);

    const back = new THREE.Mesh(wallGeoH, borderMat);
    back.position.set(0, 1.1, 10.25);
    scene.add(back);

    const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(7.7, 2.2, .45), borderMat);
    frontLeft.position.set(-6.65, 1.1, -10.25);
    scene.add(frontLeft);

    const frontRight = frontLeft.clone();
    frontRight.position.x = 6.65;
    scene.add(frontRight);

    const left = new THREE.Mesh(wallGeoV, borderMat);
    left.position.set(-10.25, 1.1, 0);
    scene.add(left);

    const right = left.clone();
    right.position.x = 10.25;
    scene.add(right);

    const ceilingGlow = new THREE.Mesh(
      new THREE.BoxGeometry(10, .08, .25),
      new THREE.MeshBasicMaterial({ color: 0x8f5cff })
    );
    ceilingGlow.position.set(0, 5.4, -9.7);
    scene.add(ceilingGlow);
  }

  function makePlayer() {
    const g = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(.47, .55, 1.25, 12),
      new THREE.MeshStandardMaterial({ color: 0x68d8ff, roughness: .38, metalness: .18 })
    );
    body.position.y = .73;
    body.castShadow = true;
    g.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(.43, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xf1c7a5, roughness: .75 })
    );
    head.position.y = 1.62;
    head.castShadow = true;
    g.add(head);

    const glow = new THREE.PointLight(0x54cfff, .85, 5);
    glow.position.y = 1.1;
    g.add(glow);

    scene.add(g);
    return g;
  }

  function makeGoal() {
    const g = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x63ffb1,
      emissive: 0x12633d,
      roughness: .35,
      metalness: .18
    });

    const top = new THREE.Mesh(new THREE.BoxGeometry(3.4, .35, .35), frameMat);
    top.position.y = 3.55;
    g.add(top);

    const sideGeo = new THREE.BoxGeometry(.35, 3.4, .35);
    const l = new THREE.Mesh(sideGeo, frameMat);
    l.position.set(-1.53, 1.7, 0);
    g.add(l);

    const r = l.clone();
    r.position.x = 1.53;
    g.add(r);

    const portal = new THREE.Mesh(
      new THREE.PlaneGeometry(2.7, 3.1),
      new THREE.MeshBasicMaterial({
        color: 0x5cffad,
        transparent: true,
        opacity: .22,
        side: THREE.DoubleSide
      })
    );
    portal.position.y = 1.7;
    g.add(portal);

    const light = new THREE.PointLight(0x4affaa, 2.2, 8);
    light.position.set(0, 2.1, 1.2);
    g.add(light);

    g.position.set(0, 0, -9.6);
    scene.add(g);
    return g;
  }

  function clearChallenge() {
    challengeObjects.forEach(o => scene.remove(o));
    challengeObjects.length = 0;
    obstacles.length = 0;
    hazards.length = 0;
    wallBoxes.length = 0;
  }

  function addBox(x, y, z, w, h, d, material, collision = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    challengeObjects.push(mesh);

    if (collision) {
      wallBoxes.push({
        mesh,
        halfX: w / 2,
        halfZ: d / 2,
        height: h
      });
    }
    return mesh;
  }

  function setupChallenge() {
    clearChallenge();

    const type = (currentFloor - 1) % 5;
    challengeLabel.textContent = challengeNames[type];

    if (type === 0) {
      const laserMat = new THREE.MeshBasicMaterial({ color: 0xff315d });
      for (let i = 0; i < Math.min(4, 2 + Math.floor(currentFloor / 5)); i++) {
        const pivot = new THREE.Group();
        const bar = new THREE.Mesh(new THREE.BoxGeometry(12, .18, .34), laserMat);
        bar.position.x = 3.1;
        pivot.add(bar);

        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(.42, 12, 10),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        pivot.add(orb);

        pivot.position.set(0, .56, 2.8 - i * 3.1);
        scene.add(pivot);
        challengeObjects.push(pivot);
        hazards.push({
          kind: 'laser',
          pivot,
          speed: (1.05 + i * .17 + currentFloor * .012) * (i % 2 ? -1 : 1),
          length: 9.2
        });
      }
    }

    if (type === 1) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffa43a,
        emissive: 0x6b2c00,
        roughness: .5
      });

      for (let i = 0; i < 5; i++) {
        const z = 5 - i * 3.1;
        const mesh = addBox(0, .75, z, 4.1, 1.5, .75, mat, false);
        hazards.push({
          kind: 'slider',
          mesh,
          baseZ: z,
          phase: i * .9,
          speed: 1.15 + i * .08 + currentFloor * .01
        });
      }
    }

    if (type === 2) {
      const tileGeo = new THREE.BoxGeometry(3.7, .08, 3.7);
      let id = 0;
      for (let z = -6; z <= 6; z += 4) {
        for (let x = -6; x <= 6; x += 4) {
          const mat = safeMat.clone();
          const tile = new THREE.Mesh(tileGeo, mat);
          tile.position.set(x, .05, z);
          scene.add(tile);
          challengeObjects.push(tile);
          hazards.push({
            kind: 'tile',
            mesh: tile,
            phase: id * .47,
            dangerous: false
          });
          id++;
        }
      }
    }

    if (type === 3) {
      const ballMat = new THREE.MeshStandardMaterial({
        color: 0xff416f,
        emissive: 0x6e0b28,
        roughness: .32
      });

      for (let i = 0; i < Math.min(6, 3 + Math.floor(currentFloor / 6)); i++) {
        const ball = new THREE.Mesh(new THREE.SphereGeometry(.7, 18, 14), ballMat);
        ball.position.set(-7 + i * 2.7, .7, 2.8 - (i % 2) * 5.5);
        ball.castShadow = true;
        scene.add(ball);
        challengeObjects.push(ball);
        hazards.push({
          kind: 'ball',
          mesh: ball,
          vx: (i % 2 ? -1 : 1) * (2.2 + currentFloor * .04),
          vz: (i % 3 === 0 ? -1 : 1) * (2.0 + i * .14)
        });
      }
    }

    if (type === 4) {
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0x7556ff,
        emissive: 0x24135f,
        roughness: .55
      });

      const layout = [
        [-5.7, 4.7, 7.2, .75],
        [4.9, 1.4, 8.2, .75],
        [-5.1, -2.0, 8.7, .75],
        [4.8, -5.3, 8.5, .75]
      ];

      layout.forEach(([x,z,w,d]) => {
        addBox(x, .75, z, w, 1.5, d, wallMat, true);
      });
    }
  }

  function resetPlayer() {
    playerState.x = 0;
    playerState.y = .02;
    playerState.z = 7.8;
    velocityY = 0;
    grounded = true;
    player.position.set(playerState.x, playerState.y, playerState.z);
  }

  function startFloor() {
    floorTime = Math.max(8, 20 - Math.floor((currentFloor - 1) / 3));
    elapsed = 0;
    dead = false;
    setupChallenge();
    resetPlayer();
    updateHud();
    showMessage('الدور ' + currentFloor, .9);
  }

  function updateHud() {
    floorValue.textContent = currentFloor;
    timeValue.textContent = Math.max(0, Math.ceil(floorTime - elapsed));
    bestValue.textContent = localStorage.getItem('oneMoreFloorBest') || '0';
  }

  function showMessage(text, seconds = 1.2) {
    message.textContent = text;
    message.classList.add('show');
    msgTimer = seconds;
  }

  function showOverlay(text, buttonText, onClick) {
    overlayText.textContent = text;
    startBtn.textContent = buttonText;
    startBtn.onclick = onClick;
    overlay.classList.add('show');
  }

  function hideOverlay() {
    overlay.classList.remove('show');
  }

  function startGame() {
    currentFloor = 1;
    running = true;
    hideOverlay();
    startFloor();
    last = performance.now();
    requestAnimationFrame(loop);
  }

  function die(reason) {
    if (dead) return;
    dead = true;
    running = false;

    const reached = Math.max(0, currentFloor - 1);
    const old = Number(localStorage.getItem('oneMoreFloorBest') || 0);
    if (reached > old) localStorage.setItem('oneMoreFloorBest', String(reached));
    updateHud();

    showOverlay(
      reason + ' وصلت للدور ' + currentFloor + '. تقدر تتعداه؟',
      'مرة ثانية 🔥',
      startGame
    );
  }

  function completeFloor() {
    if (dead) return;

    const old = Number(localStorage.getItem('oneMoreFloorBest') || 0);
    if (currentFloor > old) {
      localStorage.setItem('oneMoreFloorBest', String(currentFloor));
    }

    currentFloor++;
    flashTimer = .25;
    startFloor();
  }

  function circleHitsBox(x, z, r, box) {
    const bx = box.mesh.position.x;
    const bz = box.mesh.position.z;
    const nearX = Math.max(bx - box.halfX, Math.min(x, bx + box.halfX));
    const nearZ = Math.max(bz - box.halfZ, Math.min(z, bz + box.halfZ));
    const dx = x - nearX;
    const dz = z - nearZ;
    return dx * dx + dz * dz < r * r;
  }

  function tryMove(nx, nz) {
    const r = playerState.radius;

    nx = THREE.MathUtils.clamp(nx, -WORLD + r, WORLD - r);
    nz = THREE.MathUtils.clamp(nz, -WORLD + r, WORLD - r);

    for (const box of wallBoxes) {
      if (playerState.y < box.height && circleHitsBox(nx, nz, r, box)) {
        return;
      }
    }

    playerState.x = nx;
    playerState.z = nz;
  }

  function updatePlayer(dt) {
    const forward = (keys.w || keys.ArrowUp ? 1 : 0) - (keys.s || keys.ArrowDown ? 1 : 0);
    const right = (keys.d || keys.ArrowRight ? 1 : 0) - (keys.a || keys.ArrowLeft ? 1 : 0);

    if (forward || right) {
      const len = Math.hypot(forward, right);
      const speed = 6.7 + Math.min(1.5, currentFloor * .025);
      const dx = right / len * speed * dt;
      const dz = -forward / len * speed * dt;

      tryMove(playerState.x + dx, playerState.z);
      tryMove(playerState.x, playerState.z + dz);

      player.rotation.y = Math.atan2(dx, dz);
    }

    velocityY -= 18 * dt;
    playerState.y += velocityY * dt;

    if (playerState.y <= .02) {
      playerState.y = .02;
      velocityY = 0;
      grounded = true;
    } else {
      grounded = false;
    }

    player.position.set(playerState.x, playerState.y, playerState.z);

    if (playerState.z < -8.85 && Math.abs(playerState.x) < 1.6) {
      completeFloor();
    }
  }

  function updateHazards(dt) {
    const t = performance.now() * .001;

    for (const h of hazards) {
      if (h.kind === 'laser') {
        h.pivot.rotation.y += h.speed * dt;

        if (playerState.y < .9) {
          const local = new THREE.Vector3(
            playerState.x - h.pivot.position.x,
            0,
            playerState.z - h.pivot.position.z
          );

          const a = -h.pivot.rotation.y;
          const lx = local.x * Math.cos(a) - local.z * Math.sin(a);
          const lz = local.x * Math.sin(a) + local.z * Math.cos(a);

          if (lx > -.3 && lx < h.length && Math.abs(lz) < .48) {
            die('ضربك الليزر 💥');
            return;
          }
        }
      }

      if (h.kind === 'slider') {
        h.mesh.position.x = Math.sin(t * h.speed + h.phase) * 7.3;

        if (
          playerState.y < 1.45 &&
          Math.abs(playerState.x - h.mesh.position.x) < 2.6 &&
          Math.abs(playerState.z - h.mesh.position.z) < .75
        ) {
          die('صدمك الجدار 🚧');
          return;
        }
      }

      if (h.kind === 'tile') {
        const phase = Math.sin(t * 2.7 + h.phase);
        h.dangerous = phase > .38;
        h.mesh.material.color.setHex(h.dangerous ? 0xff315d : 0x262d43);
        h.mesh.material.emissive.setHex(h.dangerous ? 0x6b071d : 0x000000);

        if (
          h.dangerous &&
          playerState.y < .5 &&
          Math.abs(playerState.x - h.mesh.position.x) < 1.75 &&
          Math.abs(playerState.z - h.mesh.position.z) < 1.75
        ) {
          die('احترقت الأرضية 🔥');
          return;
        }
      }

      if (h.kind === 'ball') {
        h.mesh.position.x += h.vx * dt;
        h.mesh.position.z += h.vz * dt;

        if (Math.abs(h.mesh.position.x) > 8.8) h.vx *= -1;
        if (Math.abs(h.mesh.position.z) > 8.8) h.vz *= -1;

        const dx = playerState.x - h.mesh.position.x;
        const dz = playerState.z - h.mesh.position.z;

        if (playerState.y < 1.25 && dx * dx + dz * dz < 1.25 * 1.25) {
          die('مسكتك الكرة 🔴');
          return;
        }
      }
    }
  }

  function updateCamera(dt) {
    const target = new THREE.Vector3(
      playerState.x * .34,
      10.2 + playerState.y * .12,
      playerState.z + 12.8
    );

    camera.position.lerp(target, Math.min(1, dt * 4.8));
    camera.lookAt(playerState.x * .28, 0.8, playerState.z - 4.2);
  }

  function update(dt) {
    elapsed += dt;

    if (elapsed >= floorTime) {
      die('انتهى الوقت ⏰');
      return;
    }

    if (msgTimer > 0) {
      msgTimer -= dt;
      if (msgTimer <= 0) message.classList.remove('show');
    }

    if (flashTimer > 0) {
      flashTimer -= dt;
      renderer.toneMappingExposure = 1.28;
    } else {
      renderer.toneMappingExposure = .95;
    }

    updatePlayer(dt);
    if (!running) return;
    updateHazards(dt);
    updateCamera(dt);
    updateHud();

    goal.children.forEach((child, i) => {
      if (child.material && child.material.opacity !== undefined) {
        child.material.opacity = .16 + Math.sin(performance.now() * .004) * .07;
      }
    });
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, .033);
    last = now;

    update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  function jump() {
    if (running && grounded) {
      velocityY = 7.2;
      grounded = false;
    }
  }

  document.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();

    if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key)) {
      e.preventDefault();
    }

    if ((e.code === 'Space' || key === ' ') && !e.repeat) {
      jump();
    }

    keys[e.key] = true;
    keys[key] = true;
  }, { passive: false });

  document.addEventListener('keyup', e => {
    keys[e.key] = false;
    keys[e.key.toLowerCase()] = false;
  });

  document.querySelectorAll('[data-key]').forEach(button => {
    const key = button.dataset.key;

    button.addEventListener('pointerdown', e => {
      e.preventDefault();

      if (key === 'Space') {
        jump();
      } else {
        keys[key] = true;
      }
    });

    ['pointerup','pointercancel','pointerleave'].forEach(type => {
      button.addEventListener(type, () => {
        keys[key] = false;
      });
    });
  });

  shareBtn.addEventListener('click', async () => {
    const best = localStorage.getItem('oneMoreFloorBest') || '0';
    const text = 'وصلت للدور ' + best + ' في ONE MORE FLOOR 🔥 تقدر تتعداني؟';

    try {
      if (navigator.share) {
        await navigator.share({ title: 'ONE MORE FLOOR', text, url: location.href });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text + ' ' + location.href);
        showMessage('تم نسخ النتيجة ✅', 1.3);
      }
    } catch {}
  });

  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  });

  addRoom();
  player = makePlayer();
  goal = makeGoal();

  bestValue.textContent = localStorage.getItem('oneMoreFloorBest') || '0';
  renderer.render(scene, camera);

  showOverlay(
    'كل دور أصعب من اللي قبله. وصل للباب قبل انتهاء الوقت.',
    'ابدأ التحدي',
    startGame
  );
})();