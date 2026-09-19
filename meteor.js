(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const bestScoreEl = document.getElementById('bestScore');
  const levelEl = document.getElementById('level');
  const finalScoreEl = document.getElementById('finalScore');
  const startOverlay = document.getElementById('startOverlay');
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const leftBtn = document.getElementById('leftBtn');
  const rightBtn = document.getElementById('rightBtn');

  const W = canvas.width;
  const H = canvas.height;

  let animationId = null;
  let running = false;
  let lastTime = 0;
  let spawnTimer = 0;
  let elapsed = 0;
  let score = 0;
  let level = 1;
  let best = Number(localStorage.getItem('vertexMeteorBest') || 0);

  const keys = { left:false, right:false };
  const meteors = [];
  const stars = [];

  const player = {
    x: W / 2 - 30,
    y: H - 74,
    w: 60,
    h: 38,
    speed: 430
  };

  for (let i = 0; i < 95; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.7 + .3,
      a: Math.random() * .6 + .25
    });
  }

  bestScoreEl.textContent = best;

  function resetGame() {
    meteors.length = 0;
    player.x = W / 2 - player.w / 2;
    elapsed = 0;
    score = 0;
    level = 1;
    spawnTimer = 0;
    lastTime = performance.now();
    updateHud();
  }

  function startGame() {
    if (animationId) cancelAnimationFrame(animationId);
    resetGame();
    running = true;
    startOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    animationId = requestAnimationFrame(loop);
  }

  function endGame() {
    running = false;
    if (score > best) {
      best = score;
      localStorage.setItem('vertexMeteorBest', String(best));
      bestScoreEl.textContent = best;
    }
    finalScoreEl.textContent = score;
    gameOverOverlay.classList.remove('hidden');
  }

  function updateHud() {
    scoreEl.textContent = score;
    levelEl.textContent = level;
  }

  function spawnMeteor() {
    const radius = 16 + Math.random() * 24;
    const speed = 165 + Math.random() * 95 + level * 24;
    meteors.push({
      x: radius + Math.random() * (W - radius * 2),
      y: -radius - 8,
      r: radius,
      speed,
      spin: Math.random() * Math.PI * 2
    });
  }

  function collision(m) {
    const nearestX = Math.max(player.x, Math.min(m.x, player.x + player.w));
    const nearestY = Math.max(player.y, Math.min(m.y, player.y + player.h));
    const dx = m.x - nearestX;
    const dy = m.y - nearestY;
    return dx * dx + dy * dy < m.r * m.r * .78;
  }

  function update(dt) {
    elapsed += dt;
    score = Math.floor(elapsed * 10);
    level = Math.min(12, 1 + Math.floor(score / 120));

    if (keys.left) player.x -= player.speed * dt;
    if (keys.right) player.x += player.speed * dt;
    player.x = Math.max(8, Math.min(W - player.w - 8, player.x));

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnMeteor();
      if (level >= 4 && Math.random() < .18) spawnMeteor();
      spawnTimer = Math.max(.18, .78 - level * .045);
    }

    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.y += m.speed * dt;
      m.spin += dt * 2;

      if (collision(m)) {
        endGame();
        return;
      }

      if (m.y - m.r > H + 20) meteors.splice(i, 1);
    }

    updateHud();
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, '#06101d');
    gradient.addColorStop(1, '#02050b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    for (const s of stars) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);

    ctx.shadowColor = '#25e7f2';
    ctx.shadowBlur = 16;

    ctx.fillStyle = '#1acfe0';
    ctx.beginPath();
    ctx.moveTo(player.w / 2, 0);
    ctx.lineTo(player.w, player.h);
    ctx.lineTo(player.w * .65, player.h * .78);
    ctx.lineTo(player.w / 2, player.h);
    ctx.lineTo(player.w * .35, player.h * .78);
    ctx.lineTo(0, player.h);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#d9fbff';
    ctx.beginPath();
    ctx.ellipse(player.w / 2, player.h * .48, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff9a32';
    ctx.beginPath();
    ctx.moveTo(player.w * .39, player.h);
    ctx.lineTo(player.w * .5, player.h + 16 + Math.random() * 8);
    ctx.lineTo(player.w * .61, player.h);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawMeteor(m) {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.spin);

    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, m.r * 1.6);
    glow.addColorStop(0, 'rgba(255,212,125,.75)');
    glow.addColorStop(.45, 'rgba(255,91,42,.42)');
    glow.addColorStop(1, 'rgba(255,55,20,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, m.r * 1.6, 0, Math.PI * 2);
    ctx.fill();

    const rock = ctx.createRadialGradient(-m.r * .3, -m.r * .3, 2, 0, 0, m.r);
    rock.addColorStop(0, '#ffbc59');
    rock.addColorStop(.35, '#b35a32');
    rock.addColorStop(1, '#4c271f');
    ctx.fillStyle = rock;
    ctx.beginPath();
    ctx.arc(0, 0, m.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(60,20,15,.55)';
    ctx.beginPath();
    ctx.arc(-m.r * .25, m.r * .1, m.r * .18, 0, Math.PI * 2);
    ctx.arc(m.r * .25, -m.r * .2, m.r * .12, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function draw() {
    drawBackground();

    ctx.fillStyle = 'rgba(23,130,155,.18)';
    ctx.fillRect(0, H - 20, W, 20);

    for (const m of meteors) drawMeteor(m);
    drawPlayer();
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min((now - lastTime) / 1000, .033);
    lastTime = now;

    update(dt);
    draw();

    if (running) animationId = requestAnimationFrame(loop);
  }

  function setKey(key, value) {
    if (key === 'ArrowLeft' || key.toLowerCase() === 'a') keys.left = value;
    if (key === 'ArrowRight' || key.toLowerCase() === 'd') keys.right = value;
  }

  document.addEventListener('keydown', (e) => {
    if (['ArrowLeft','ArrowRight','a','A','d','D'].includes(e.key)) {
      e.preventDefault();
      setKey(e.key, true);
    }
  });

  document.addEventListener('keyup', (e) => setKey(e.key, false));

  function bindHold(button, direction) {
    const on = (e) => {
      e.preventDefault();
      keys[direction] = true;
    };
    const off = (e) => {
      e.preventDefault();
      keys[direction] = false;
    };

    button.addEventListener('pointerdown', on);
    button.addEventListener('pointerup', off);
    button.addEventListener('pointercancel', off);
    button.addEventListener('pointerleave', off);
  }

  bindHold(leftBtn, 'left');
  bindHold(rightBtn, 'right');

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);

  draw();
})();