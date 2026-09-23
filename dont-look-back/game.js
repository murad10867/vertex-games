(() => {
  'use strict';

  const canvas = document.getElementById('world');
  const fuseValue = document.getElementById('fuseValue');
  const lightValue = document.getElementById('lightValue');
  const objective = document.getElementById('objective');
  const warning = document.getElementById('warning');
  const overlay = document.getElementById('overlay');
  const overlayText = document.getElementById('overlayText');
  const startBtn = document.getElementById('startBtn');
  const flashBtn = document.getElementById('flashBtn');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .56;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x010203);
  scene.fog = new THREE.Fog(0x010203, 5, 33);

  const camera = new THREE.PerspectiveCamera(67, innerWidth / innerHeight, .08, 90);
  camera.rotation.order = 'YXZ';

  const ambient = new THREE.HemisphereLight(0x1b2638, 0x050505, .24);
  scene.add(ambient);

  const flashlight = new THREE.SpotLight(0xf3efe0, 3.6, 19, Math.PI / 7, .52, 1.35);
  flashlight.castShadow = true;
  flashlight.shadow.mapSize.set(512, 512);
  scene.add(flashlight);

  const flashlightTarget = new THREE.Object3D();
  scene.add(flashlightTarget);
  flashlight.target = flashlightTarget;

  const redEmergency = new THREE.PointLight(0x8f0000, .6, 14);
  redEmergency.position.set(0, 2.2, 0);
  scene.add(redEmergency);

  const map = [
    '###############',
    '#S....#......1#',
    '#.###.#.#####.#',
    '#.....#.....#.#',
    '###.#####.#.#.#',
    '#...#...#.#...#',
    '#.#.#.#.#.###.#',
    '#.#...#...#...#',
    '#.#####.###.#.#',
    '#.....#.....#.#',
    '#.###.#####.#.#',
    '#2..#.......#.#',
    '###.#.#####.#.#',
    '#3....#.....E.#',
    '###############'
  ];

  const CELL = 4;
  const WIDTH = map[0].length;
  const HEIGHT = map.length;
  const HALF_X = (WIDTH - 1) / 2;
  const HALF_Z = (HEIGHT - 1) / 2;
  const PLAYER_RADIUS = .34;

  const keys = Object.create(null);
  const fuseMeshes = [];
  const flickerLights = [];

  let spawnCell = null;
  let exitCell = null;
  let monster = null;
  let monsterCell = null;
  let monsterPath = [];
  let pathTimer = 0;
  let running = false;
  let dead = false;
  let fuses = 0;
  let flashlightOn = true;
  let yaw = 0;
  let pitch = 0;
  let warningTimer = 0;
  let startedAt = 0;

  const player = { x: 0, z: 0 };

  function cellToWorld(gx, gy) {
    return {
      x: (gx - HALF_X) * CELL,
      z: (gy - HALF_Z) * CELL
    };
  }

  function worldToCell(x, z) {
    return {
      x: Math.round(x / CELL + HALF_X),
      y: Math.round(z / CELL + HALF_Z)
    };
  }

  function isWallCell(gx, gy) {
    if (gy < 0 || gy >= HEIGHT || gx < 0 || gx >= WIDTH) return true;
    return map[gy][gx] === '#';
  }

  function blocked(x, z) {
    const r = PLAYER_RADIUS;
    const points = [
      [x-r,z-r],[x+r,z-r],[x-r,z+r],[x+r,z+r]
    ];

    return points.some(([px,pz]) => {
      const c = worldToCell(px,pz);
      return isWallCell(c.x,c.y);
    });
  }

  function buildMaze() {
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111315,
      roughness: .98
    });
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x28292a,
      roughness: .92
    });
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x080909,
      roughness: 1,
      side: THREE.DoubleSide
    });

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(WIDTH * CELL, HEIGHT * CELL),
      floorMat
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(WIDTH * CELL, HEIGHT * CELL),
      ceilingMat
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4;
    scene.add(ceiling);

    const wallGeo = new THREE.BoxGeometry(CELL, 4, CELL);

    for (let gy = 0; gy < HEIGHT; gy++) {
      for (let gx = 0; gx < WIDTH; gx++) {
        const ch = map[gy][gx];
        const p = cellToWorld(gx,gy);

        if (ch === '#') {
          const wall = new THREE.Mesh(wallGeo, wallMat);
          wall.position.set(p.x,2,p.z);
          wall.castShadow = true;
          wall.receiveShadow = true;
          scene.add(wall);
          continue;
        }

        if (ch === 'S') spawnCell = {x:gx,y:gy};
        if (ch === 'E') exitCell = {x:gx,y:gy};

        if ('123'.includes(ch)) {
          const g = new THREE.Group();

          const base = new THREE.Mesh(
            new THREE.CylinderGeometry(.42,.42,.26,16),
            new THREE.MeshStandardMaterial({
              color:0x3a3c3d,
              roughness:.5,
              metalness:.55
            })
          );
          base.position.y=.15;
          g.add(base);

          const coreMat = new THREE.MeshStandardMaterial({
            color:0x6ee7ff,
            emissive:0x137f9a,
            roughness:.25,
            metalness:.15
          });
          const core = new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.9,12),coreMat);
          core.position.y=.68;
          g.add(core);

          const glow = new THREE.PointLight(0x4bdfff,1.7,7);
          glow.position.y=1;
          g.add(glow);

          g.position.set(p.x,0,p.z);
          g.userData.collected=false;
          scene.add(g);
          fuseMeshes.push(g);
        }
      }
    }

    const exitPos = cellToWorld(exitCell.x,exitCell.y);
    const exitGroup = new THREE.Group();
    exitGroup.name = 'exit';

    const frameMat = new THREE.MeshStandardMaterial({
      color:0x7c1212,
      emissive:0x360000,
      roughness:.55
    });

    const top = new THREE.Mesh(new THREE.BoxGeometry(3.3,.3,.35),frameMat);
    top.position.y=3.35;
    exitGroup.add(top);

    const sideGeo = new THREE.BoxGeometry(.3,3.3,.35);
    const left = new THREE.Mesh(sideGeo,frameMat);
    left.position.set(-1.5,1.65,0);
    exitGroup.add(left);

    const right = left.clone();
    right.position.x=1.5;
    exitGroup.add(right);

    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(2.7,3.0),
      new THREE.MeshBasicMaterial({
        color:0x5a0909,
        transparent:true,
        opacity:.32,
        side:THREE.DoubleSide
      })
    );
    door.position.y=1.6;
    exitGroup.add(door);

    exitGroup.position.set(exitPos.x,0,exitPos.z);
    scene.add(exitGroup);

    const bulbMat = new THREE.MeshBasicMaterial({color:0x9a0000});
    for(let i=0;i<8;i++){
      const c = openCells()[Math.floor((i*17+5)%openCells().length)];
      const p = cellToWorld(c.x,c.y);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),bulbMat);
      bulb.position.set(p.x,3.75,p.z);
      scene.add(bulb);

      const light = new THREE.PointLight(0x6f0000,.22,9);
      light.position.set(p.x,3.5,p.z);
      scene.add(light);
      flickerLights.push(light);
    }
  }

  function openCells() {
    const cells=[];
    for(let y=0;y<HEIGHT;y++){
      for(let x=0;x<WIDTH;x++){
        if(!isWallCell(x,y)) cells.push({x,y});
      }
    }
    return cells;
  }

  function createMonster() {
    const g = new THREE.Group();

    const black = new THREE.MeshStandardMaterial({
      color:0x050505,
      roughness:.92
    });
    const eyeMat = new THREE.MeshBasicMaterial({color:0xff1818});

    const body = new THREE.Mesh(new THREE.CylinderGeometry(.46,.6,2.25,10),black);
    body.position.y=1.2;
    g.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(.5,12,9),black);
    head.position.y=2.65;
    g.add(head);

    [-.18,.18].forEach(x=>{
      const eye = new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),eyeMat);
      eye.position.set(x,2.72,-.45);
      g.add(eye);
    });

    const aura = new THREE.PointLight(0x5b0000,.7,5);
    aura.position.y=1.8;
    g.add(aura);

    g.visible=false;
    scene.add(g);
    return g;
  }

  function resetMonster() {
    monsterCell = {x:13,y:7};
    const p = cellToWorld(monsterCell.x,monsterCell.y);
    monster.position.set(p.x,0,p.z);
    monster.visible=false;
    monsterPath=[];
    pathTimer=0;
  }

  function bfsPath(start,end) {
    const startKey=start.x+','+start.y;
    const endKey=end.x+','+end.y;
    const q=[start];
    const parent=new Map();
    parent.set(startKey,null);

    for(let qi=0;qi<q.length;qi++){
      const cur=q[qi];
      const ck=cur.x+','+cur.y;
      if(ck===endKey) break;

      const ns=[
        {x:cur.x+1,y:cur.y},
        {x:cur.x-1,y:cur.y},
        {x:cur.x,y:cur.y+1},
        {x:cur.x,y:cur.y-1}
      ];

      for(const n of ns){
        const nk=n.x+','+n.y;
        if(isWallCell(n.x,n.y)||parent.has(nk)) continue;
        parent.set(nk,cur);
        q.push(n);
      }
    }

    if(!parent.has(endKey)) return [];

    const path=[];
    let cur=end;
    while(cur){
      path.push(cur);
      cur=parent.get(cur.x+','+cur.y);
    }
    path.reverse();
    return path;
  }

  function resetGame() {
    dead=false;
    fuses=0;
    flashlightOn=true;
    flashlight.visible=true;

    fuseMeshes.forEach(f=>{
      f.visible=true;
      f.userData.collected=false;
    });

    const p=cellToWorld(spawnCell.x,spawnCell.y);
    player.x=p.x;
    player.z=p.z;
    yaw=Math.PI;
    pitch=0;

    resetMonster();
    updateHud();
    updateCamera();
    objective.textContent='ابحث عن 3 فيوزات وافتح باب الخروج.';
    warning.className='warning';
    renderer.render(scene,camera);
  }

  function updateCamera() {
    camera.position.set(player.x,1.65,player.z);
    camera.rotation.set(pitch,yaw,0);

    flashlight.position.copy(camera.position);

    const dir=new THREE.Vector3();
    camera.getWorldDirection(dir);
    flashlightTarget.position.copy(camera.position).add(dir.multiplyScalar(9));
  }

  function updateHud() {
    fuseValue.textContent=fuses+' / 3';
    lightValue.textContent=flashlightOn?'ON':'OFF';
  }

  function startGame() {
    resetGame();
    running=true;
    startedAt=performance.now();
    overlay.classList.remove('show');
    canvas.requestPointerLock?.();
    last=performance.now();
    requestAnimationFrame(loop);
  }

  function showOverlay(text,button,onClick){
    overlayText.textContent=text;
    startBtn.textContent=button;
    startBtn.onclick=onClick;
    overlay.classList.add('show');
  }

  function fail() {
    if(dead) return;
    dead=true;
    running=false;
    document.exitPointerLock?.();
    showOverlay('الشيء الذي في الظلام وصل لك... حاول مرة ثانية، ولا تتأخر.','حاول مرة ثانية',startGame);
  }

  function win() {
    running=false;
    document.exitPointerLock?.();
    const seconds=Math.max(1,Math.floor((performance.now()-startedAt)/1000));
    const old=Number(localStorage.getItem('dontLookBackBest')||0);

    if(!old||seconds<old) localStorage.setItem('dontLookBackBest',String(seconds));

    showOverlay(
      'هربت من المبنى في '+seconds+' ثانية ✅ أفضل وقت: '+localStorage.getItem('dontLookBackBest')+' ثانية.',
      'العب من جديد',
      startGame
    );
  }

  function tryMove(nx,nz){
    if(!blocked(nx,player.z)) player.x=nx;
    if(!blocked(player.x,nz)) player.z=nz;
  }

  function updatePlayer(dt){
    const forward=(keys.KeyW||keys.w||keys['ص']||keys.ArrowUp?1:0)-(keys.KeyS||keys.s||keys['س']||keys.ArrowDown?1:0);
    const strafe=(keys.KeyD||keys.d||keys['ي']||keys.ArrowRight?1:0)-(keys.KeyA||keys.a||keys['ش']||keys.ArrowLeft?1:0);
    const sprint=keys.ShiftLeft||keys.ShiftRight||keys.Shift;
    const speed=sprint?5.2:3.35;

    if(forward||strafe){
      const len=Math.hypot(forward,strafe);
      const f=forward/len;
      const s=strafe/len;
      const sin=Math.sin(yaw);
      const cos=Math.cos(yaw);

      const dx=(-sin*f+cos*s)*speed*dt;
      const dz=(-cos*f-sin*s)*speed*dt;
      tryMove(player.x+dx,player.z+dz);
    }

    updateCamera();
  }

  function collectFuses(){
    for(const fuse of fuseMeshes){
      if(fuse.userData.collected) continue;
      const dx=player.x-fuse.position.x;
      const dz=player.z-fuse.position.z;

      if(dx*dx+dz*dz<1.2*1.2){
        fuse.userData.collected=true;
        fuse.visible=false;
        fuses++;
        updateHud();

        warning.textContent=fuses===1?'سمعت حركة خلفك...':fuses===2?'هو أقرب الآن.':'الباب انفتح — اهرب!';
        warning.className='warning show'+(fuses>1?' danger':'');
        warningTimer=2.2;

        if(fuses===1){
          monster.visible=true;
        }

        if(fuses===3){
          objective.textContent='كل الفيوزات معك. اذهب إلى باب الخروج!';
          const exit=scene.getObjectByName('exit');
          exit.children.forEach(o=>{
            if(o.material&&o.material.color){
              o.material.color.setHex(0x1bd978);
              if(o.material.emissive) o.material.emissive.setHex(0x075a2d);
            }
          });
        }
      }
    }

    if(fuses===3){
      const p=cellToWorld(exitCell.x,exitCell.y);
      const dx=player.x-p.x;
      const dz=player.z-p.z;
      if(dx*dx+dz*dz<1.35*1.35) win();
    }
  }

  function updateMonster(dt){
    if(!monster.visible) return;

    pathTimer-=dt;
    const targetCell=worldToCell(player.x,player.z);

    if(pathTimer<=0||monsterPath.length<2){
      const mc=worldToCell(monster.position.x,monster.position.z);
      monsterPath=bfsPath(mc,targetCell);
      pathTimer=.38;
    }

    if(monsterPath.length>1){
      const next=monsterPath[1];
      const p=cellToWorld(next.x,next.y);
      const dx=p.x-monster.position.x;
      const dz=p.z-monster.position.z;
      const len=Math.hypot(dx,dz);

      if(len<.18){
        monsterPath.shift();
      }else{
        const speed=1.45+fuses*.48;
        monster.position.x+=dx/len*speed*dt;
        monster.position.z+=dz/len*speed*dt;
        monster.rotation.y=Math.atan2(dx,dz)+Math.PI;
      }
    }

    const dx=player.x-monster.position.x;
    const dz=player.z-monster.position.z;
    const dist=Math.hypot(dx,dz);

    if(dist<7){
      warning.textContent=dist<3.5?'اركض!':'في شيء قريب منك...';
      warning.className='warning show danger';
      warningTimer=.35;
    }

    if(dist<1.15) fail();
  }

  function updateAtmosphere(dt){
    const t=performance.now()*.001;
    flickerLights.forEach((l,i)=>{
      l.intensity=.12+Math.max(0,Math.sin(t*5.3+i*2.1))*.22;
    });
    redEmergency.intensity=.35+Math.sin(t*1.7)*.14;

    if(warningTimer>0){
      warningTimer-=dt;
      if(warningTimer<=0) warning.className='warning';
    }

    fuseMeshes.forEach((f,i)=>{
      if(f.visible){
        f.rotation.y+=dt*(.8+i*.08);
        f.position.y=Math.sin(t*2+i)*.08;
      }
    });
  }

  function loop(now){
    if(!running) return;

    const dt=Math.min((now-last)/1000,.033);
    last=now;

    updatePlayer(dt);
    collectFuses();
    if(!running) return;
    updateMonster(dt);
    updateAtmosphere(dt);

    renderer.render(scene,camera);
    requestAnimationFrame(loop);
  }

  function toggleFlash(){
    flashlightOn=!flashlightOn;
    flashlight.visible=flashlightOn;
    updateHud();
  }

  document.addEventListener('mousemove',e=>{
    if(document.pointerLockElement!==canvas||!running) return;

    yaw-=e.movementX*.00225;
    pitch-=e.movementY*.00195;
    pitch=THREE.MathUtils.clamp(pitch,-1.25,1.25);
  });

  document.addEventListener('keydown',e=>{
    const k=e.key.toLowerCase();

    if(['arrowup','arrowdown','arrowleft','arrowright'].includes(k)) e.preventDefault();
    if((e.code==='KeyF'||k==='f'||k==='ب')&&!e.repeat) toggleFlash();

    keys[e.code]=true;
    keys[e.key]=true;
    keys[k]=true;
  },{passive:false});

  document.addEventListener('keyup',e=>{
    keys[e.code]=false;
    keys[e.key]=false;
    keys[e.key.toLowerCase()]=false;
  });

  canvas.addEventListener('click',()=>{
    if(running&&document.pointerLockElement!==canvas) canvas.requestPointerLock?.();
  });

  document.querySelectorAll('[data-action]').forEach(btn=>{
    const a=btn.dataset.action;

    btn.addEventListener('pointerdown',e=>{
      e.preventDefault();
      if(a==='forward') keys.ArrowUp=true;
      if(a==='back') keys.ArrowDown=true;
      if(a==='left') keys.a=true;
      if(a==='right') keys.d=true;
    });

    ['pointerup','pointercancel','pointerleave'].forEach(type=>{
      btn.addEventListener(type,()=>{
        keys.ArrowUp=false;
        keys.ArrowDown=false;
        keys.a=false;
        keys.d=false;
      });
    });
  });

  flashBtn.addEventListener('click',toggleFlash);

  addEventListener('resize',()=>{
    renderer.setSize(innerWidth,innerHeight,false);
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
  });

  buildMaze();
  monster=createMonster();
  resetGame();

  showOverlay(
    'أنت محبوس في مبنى مظلم. اجمع 3 فيوزات، ثم اهرب قبل أن يجدك الشيء الذي يتحرك في الظلام.',
    'ادخل المبنى',
    startGame
  );
})();