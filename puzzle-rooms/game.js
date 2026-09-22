(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const levelValue = document.getElementById('levelValue');
  const movesValue = document.getElementById('movesValue');
  const bestValue = document.getElementById('bestValue');
  const overlay = document.getElementById('overlay');
  const overlayText = document.getElementById('overlayText');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');

  const levels = [
    [
      '#########',
      '#.......#',
      '#..T....#',
      '#..B....#',
      '#..P....#',
      '#......D#',
      '#########'
    ],
    [
      '##########',
      '#........#',
      '#..T..T..#',
      '#..B..B..#',
      '#...P....#',
      '#.......D#',
      '##########'
    ],
    [
      '##########',
      '#....T...#',
      '#..###...#',
      '#..B.....#',
      '#..P..B.T#',
      '#........#',
      '#......D.#',
      '##########'
    ],
    [
      '###########',
      '#...T.T...#',
      '#...#.#...#',
      '#..B...B..#',
      '#....P....#',
      '#..B...T..#',
      '#......T.D#',
      '###########'
    ],
    [
      '############',
      '#..T....T..#',
      '#..##..##..#',
      '#..B....B..#',
      '#.....P....#',
      '#..B....B..#',
      '#..T....T.D#',
      '#..........#',
      '############'
    ]
  ];

  let levelIndex = 0;
  let grid = [];
  let player = { x: 0, y: 0 };
  let boxes = [];
  let targets = [];
  let door = { x: 0, y: 0 };
  let moves = 0;
  let running = false;
  let winFlash = 0;

  function parseLevel() {
    grid = levels[levelIndex].map(row => row.split(''));
    boxes = [];
    targets = [];

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const c = grid[y][x];

        if (c === 'P') {
          player = { x, y };
          grid[y][x] = '.';
        }

        if (c === 'B') {
          boxes.push({ x, y });
          grid[y][x] = '.';
        }

        if (c === 'T') {
          targets.push({ x, y });
          grid[y][x] = '.';
        }

        if (c === 'D') {
          door = { x, y };
          grid[y][x] = '.';
        }
      }
    }

    moves = 0;
    running = true;
    updateHud();
    draw();
  }

  function key(x, y) {
    return x + ',' + y;
  }

  function wallAt(x, y) {
    if (y < 0 || y >= grid.length || x < 0 || x >= grid[y].length) return true;
    return grid[y][x] === '#';
  }

  function boxAt(x, y) {
    return boxes.findIndex(b => b.x === x && b.y === y);
  }

  function targetAt(x, y) {
    return targets.some(t => t.x === x && t.y === y);
  }

  function solved() {
    return targets.every(t => boxAt(t.x, t.y) >= 0);
  }

  function move(dx, dy) {
    if (!running) return;

    const nx = player.x + dx;
    const ny = player.y + dy;

    if (wallAt(nx, ny)) return;

    const bi = boxAt(nx, ny);

    if (bi >= 0) {
      const bx = nx + dx;
      const by = ny + dy;

      if (wallAt(bx, by) || boxAt(bx, by) >= 0) return;

      boxes[bi].x = bx;
      boxes[bi].y = by;
    }

    if (nx === door.x && ny === door.y && !solved()) return;

    player.x = nx;
    player.y = ny;
    moves++;

    if (player.x === door.x && player.y === door.y && solved()) {
      completeLevel();
      return;
    }

    updateHud();
    draw();
  }

  function completeLevel() {
    running = false;

    const keyName = 'vertexPuzzleBest_' + levelIndex;
    const old = Number(localStorage.getItem(keyName) || 0);

    if (!old || moves < old) {
      localStorage.setItem(keyName, String(moves));
    }

    winFlash = 1;

    if (levelIndex < levels.length - 1) {
      overlayText.textContent = 'حليتها بـ ' + moves + ' حركة ✅ المرحلة الجاية أصعب.';
      startBtn.textContent = 'المرحلة التالية';
      startBtn.onclick = () => {
        overlay.classList.remove('show');
        levelIndex++;
        parseLevel();
      };
      overlay.classList.add('show');
    } else {
      overlayText.textContent = 'خلصت كل غرف الألغاز 🎉 أفضل حل للمرحلة الأخيرة: ' + moves + ' حركة.';
      startBtn.textContent = 'العب من البداية';
      startBtn.onclick = () => {
        overlay.classList.remove('show');
        levelIndex = 0;
        parseLevel();
      };
      overlay.classList.add('show');
    }

    updateHud();
    draw();
  }

  function restartLevel() {
    parseLevel();
  }

  function updateHud() {
    levelValue.textContent = (levelIndex + 1) + ' / ' + levels.length;
    movesValue.textContent = moves;
    bestValue.textContent = localStorage.getItem('vertexPuzzleBest_' + levelIndex) || '—';
  }

  function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }

  function draw() {
    const rows = grid.length;
    const cols = Math.max(...grid.map(r => r.length));
    const tile = Math.floor(Math.min((canvas.width - 70) / cols, (canvas.height - 70) / rows));
    const ox = Math.floor((canvas.width - cols * tile) / 2);
    const oy = Math.floor((canvas.height - rows * tile) / 2);

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#131b2d');
    grad.addColorStop(1, '#080c15');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = ox + x * tile;
        const py = oy + y * tile;

        if (wallAt(x, y)) {
          ctx.fillStyle = '#2a3448';
          drawRoundedRect(px + 2, py + 2, tile - 4, tile - 4, 8);
          ctx.fillStyle = 'rgba(255,255,255,.05)';
          ctx.fillRect(px + 8, py + 8, tile - 16, 5);
        } else {
          ctx.fillStyle = (x + y) % 2 ? '#111827' : '#0e1522';
          ctx.fillRect(px, py, tile, tile);
          ctx.strokeStyle = 'rgba(255,255,255,.035)';
          ctx.strokeRect(px, py, tile, tile);
        }

        if (targetAt(x, y)) {
          ctx.fillStyle = '#19d4ff';
          ctx.globalAlpha = .22;
          ctx.beginPath();
          ctx.arc(px + tile / 2, py + tile / 2, tile * .31, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = '#55e4ff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(px + tile / 2, py + tile / 2, tile * .25, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (x === door.x && y === door.y) {
          const open = solved();
          ctx.fillStyle = open ? '#4dff9c' : '#ff4f68';
          drawRoundedRect(px + tile * .22, py + tile * .12, tile * .56, tile * .76, 7);
          ctx.fillStyle = '#101822';
          ctx.fillRect(px + tile * .36, py + tile * .27, tile * .28, tile * .48);
          ctx.fillStyle = open ? '#4dff9c' : '#ffb0bb';
          ctx.beginPath();
          ctx.arc(px + tile * .58, py + tile * .53, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    for (const b of boxes) {
      const px = ox + b.x * tile;
      const py = oy + b.y * tile;
      const onTarget = targetAt(b.x, b.y);

      ctx.fillStyle = onTarget ? '#55e4ff' : '#d78a3e';
      ctx.shadowColor = onTarget ? '#55e4ff' : 'rgba(215,138,62,.35)';
      ctx.shadowBlur = onTarget ? 16 : 8;
      drawRoundedRect(px + tile * .13, py + tile * .13, tile * .74, tile * .74, 9);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0,0,0,.27)';
      ctx.lineWidth = 4;
      ctx.strokeRect(px + tile * .25, py + tile * .25, tile * .5, tile * .5);
    }

    {
      const px = ox + player.x * tile;
      const py = oy + player.y * tile;

      ctx.fillStyle = '#7c67ff';
      ctx.shadowColor = '#7c67ff';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(px + tile / 2, py + tile / 2, tile * .27, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#f4f7ff';
      ctx.beginPath();
      ctx.arc(px + tile * .43, py + tile * .44, tile * .04, 0, Math.PI * 2);
      ctx.arc(px + tile * .57, py + tile * .44, tile * .04, 0, Math.PI * 2);
      ctx.fill();
    }

    if (solved() && running) {
      ctx.fillStyle = 'rgba(77,255,156,.9)';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('الباب انفتح! روح له 🚪', canvas.width / 2, 30);
    }
  }

  document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();

    if (['arrowup','arrowdown','arrowleft','arrowright'].includes(k)) {
      e.preventDefault();
    }

    if (k === 'r') restartLevel();
    if (k === 'w' || k === 'arrowup') move(0, -1);
    if (k === 's' || k === 'arrowdown') move(0, 1);
    if (k === 'a' || k === 'arrowleft') move(-1, 0);
    if (k === 'd' || k === 'arrowright') move(1, 0);
  }, { passive: false });

  document.querySelectorAll('[data-key]').forEach(button => {
    button.addEventListener('pointerdown', e => {
      e.preventDefault();
      const keyName = button.dataset.key;

      if (keyName === 'ArrowUp') move(0, -1);
      if (keyName === 'ArrowDown') move(0, 1);
      if (keyName === 'ArrowLeft') move(-1, 0);
      if (keyName === 'ArrowRight') move(1, 0);
    });
  });

  restartBtn.addEventListener('click', restartLevel);

  startBtn.onclick = () => {
    overlay.classList.remove('show');
    parseLevel();
  };

  updateHud();
  parseLevel();
  running = false;
  overlay.classList.add('show');
})();