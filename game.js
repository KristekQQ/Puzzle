(() => {
  'use strict';
  const canvas = document.querySelector('#puzzle'), ctx = canvas.getContext('2d');
  const image = new Image(), config = window.PUZZLE_CONFIG || {};
  const size = value => Math.max(1, Math.min(12, Math.round(Number(value) || 3)));
  const cols = size(config.columns), rows = size(config.rows), total = cols * rows;
  const capacity = total;
  let boardWidth = 480, boardHeight = 320, pw = boardWidth / cols, ph = boardHeight / rows;
  const ui = Object.fromEntries(['count', 'timer', 'message', 'draw-piece', 'recycle', 'return-pieces', 'inventory-count', 'page-label', 'previous-page', 'next-page', 'recycler-count'].map(id => [id, document.getElementById(id)]));
  document.querySelector('#total').textContent = total;
  document.querySelector('#art-count').textContent = `${total} DÍLKŮ · ILUSTRACE`;
  document.querySelector('#grid-size').textContent = `${cols} × ${rows}`;
  document.querySelector('#hero-image').src = config.image || 'assets/lake-cottage.png';
  document.querySelector('#hero-image').alt = `Předloha puzzle: ${config.title || 'Puzzle'}`;
  document.querySelector('#art-title').textContent = config.title || 'Puzzle';
  document.querySelector('#description').textContent = 'Získej náhodné dílky. Poskládej obrázek. Tři nepotřebné vyměň za nový.';
  let templates = [], pieces = [], recyclerIds = [], nextId = 1, page = 0;
  let board, tray, recycler, width, height, dragging = null, preview = false, ready = false;
  let started = false, elapsed = 0, lastTick = 0;
  const placedTypes = new Set();
  const inventory = () => pieces.filter(p => !p.locked && !recyclerIds.includes(p.id));
  const pageCount = () => Math.max(1, Math.ceil(inventory().length / capacity));
  const visibleInventory = () => inventory().slice(page * capacity, (page + 1) * capacity);
  const complete = () => placedTypes.size === total;

  function edge(path, x, y, dx, dy, sign) {
    const length = Math.hypot(dx, dy), nx = dy / length, ny = -dx / length;
    const point = (t, n) => [x + dx * t + nx * n * sign * Math.min(pw, ph), y + dy * t + ny * n * sign * Math.min(pw, ph)];
    const line = (t, n) => path.lineTo(...point(t, n));
    const curve = (a, b, c, d, e, f) => path.bezierCurveTo(...point(a, b), ...point(c, d), ...point(e, f));
    if (!sign) { line(1, 0); return; }
    line(.35, 0); curve(.44, 0, .44, .03, .40, .07); curve(.33, .18, .39, .22, .50, .22);
    curve(.61, .22, .67, .18, .60, .07); curve(.56, .03, .56, 0, .65, 0); line(1, 0);
  }
  function shape(t) {
    const path = new Path2D(); path.moveTo(0, 0);
    edge(path, 0, 0, pw, 0, t.edges[0]); edge(path, pw, 0, 0, ph, t.edges[1]);
    edge(path, pw, ph, -pw, 0, t.edges[2]); edge(path, 0, ph, 0, -ph, t.edges[3]);
    path.closePath(); return path;
  }
  function layout() {
    const mobile = window.innerWidth <= 760;
    width = mobile ? 660 : 1240; height = mobile ? 1280 : 720;
    board = { x: (mobile ? 90 : 55) + (480 - boardWidth) / 2, y: (mobile ? 68 : 108) + (320 - boardHeight) / 2, w: boardWidth, h: boardHeight };
    tray = { x: mobile ? 60 : 650, y: mobile ? 730 : 58, w: 540, h: 460 };
    recycler = { x: mobile ? 90 : 55, y: mobile ? 465 : 510, w: 480, h: 170 };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr; canvas.height = height * dpr;
    canvas.style.aspectRatio = `${width} / ${height}`; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    arrange(); draw();
  }
  function arrange() {
    page = Math.min(page, pageCount() - 1);
    pieces.forEach(p => {
      p.targetX = board.x + p.col * pw; p.targetY = board.y + p.row * ph;
      if (p.locked) { p.x = p.targetX; p.y = p.targetY; p.scale = 1; }
    });
    const cw = tray.w / cols, ch = tray.h / rows;
    visibleInventory().forEach((p, i) => {
      if (dragging?.p === p) return;
      p.scale = 1; p.x = tray.x + (cw - pw) / 2 + (i % cols) * cw;
      p.y = tray.y + (ch - ph) / 2 + Math.floor(i / cols) * ch;
    });
    recyclerIds.forEach((id, i) => {
      const p = pieces.find(p => p.id === id); if (!p || dragging?.p === p) return;
      p.scale = Math.min(1, 108 / pw, 60 / ph);
      p.x = recycler.x + i * 160 + (160 - pw * p.scale) / 2;
      p.y = recycler.y + 76 + (60 - ph * p.scale) / 2;
    });
  }
  function reset() {
    if (!ready) return;
    dragging = null; canvas.classList.remove('dragging'); templates = []; pieces = []; recyclerIds = [];
    placedTypes.clear(); nextId = 1; page = 0; started = false; elapsed = 0; lastTick = performance.now();
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const typeId = r * cols + c;
      const t = { typeId, row: r, col: c, edges: [r ? -templates[typeId - cols].edges[2] : 0, c < cols - 1 ? (Math.random() < .5 ? 1 : -1) : 0, r < rows - 1 ? (Math.random() < .5 ? 1 : -1) : 0, c ? -templates[typeId - 1].edges[1] : 0] };
      t.path = shape(t); templates.push(t);
    }
    arrange(); updateStats(); setMessage('Začni tlačítkem „Nový dílek“. Každé losování může přinést i duplicitu.'); draw();
  }
  function randomPiece() {
    const t = templates[Math.floor(Math.random() * total)];
    const p = { ...t, id: nextId++, locked: false, scale: 1, x: 0, y: 0 };
    pieces.push(p); page = Math.floor((inventory().length - 1) / capacity);
    if (!started && !complete()) { started = true; lastTick = performance.now(); }
    arrange(); updateStats();
    setMessage(isDuplicate(p) ? `Dílek č. ${p.typeId + 1} už máš. Duplicitu můžeš vyměnit ve šrotovači.` : `Nový dílek č. ${p.typeId + 1}. Zkus ho umístit do obrázku.`);
    draw(); return p;
  }
  function isDuplicate(p) { return placedTypes.has(p.typeId) || pieces.some(other => other.id !== p.id && other.typeId === p.typeId); }
  function recycle() {
    if (recyclerIds.length !== 3 || dragging) return;
    const consumed = new Set(recyclerIds);
    pieces = pieces.filter(p => !consumed.has(p.id)); recyclerIds = [];
    const p = randomPiece();
    setMessage(`Tři dílky vyměněny za dílek č. ${p.typeId + 1}.${isDuplicate(p) ? ' Opět duplicita — i to je součást losování.' : ' Zkus, kam patří.'}`);
  }
  function returnPieces() {
    if (dragging) return;
    const firstId = recyclerIds[0]; recyclerIds = [];
    const index = inventory().findIndex(p => p.id === firstId);
    if (index >= 0) page = Math.floor(index / capacity);
    arrange(); updateStats(); setMessage('Dílky jsou zpátky v zásobníku.'); draw();
  }
  function setMessage(text) { ui.message.textContent = text; }
  function updateStats() {
    ui.count.textContent = placedTypes.size;
    const s = Math.floor(elapsed / 1000);
    ui.timer.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    ui['inventory-count'].textContent = inventory().length;
    ui['page-label'].textContent = `${page + 1} / ${pageCount()}`;
    ui['previous-page'].disabled = page === 0 || !!dragging;
    ui['next-page'].disabled = page >= pageCount() - 1 || !!dragging;
    ui['recycler-count'].textContent = `${recyclerIds.length} / 3`;
    ui.recycle.disabled = recyclerIds.length !== 3 || !!dragging;
    ui['return-pieces'].disabled = recyclerIds.length === 0 || !!dragging;
    ui['draw-piece'].disabled = !ready || !!dragging;
  }
  function roundedRect(x, y, w, h, r, fill) {
    ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  }
  function drawPiece(p, shadow = false) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.scale, p.scale);
    if (shadow) {
      ctx.shadowColor = '#00000099'; ctx.shadowBlur = dragging?.p === p ? 16 : 5;
      ctx.shadowOffsetY = dragging?.p === p ? 6 : 2; ctx.fillStyle = '#fff'; ctx.fill(p.path);
    }
    ctx.shadowColor = 'transparent'; ctx.save(); ctx.clip(p.path);
    ctx.drawImage(image, -p.col * pw, -p.row * ph, board.w, board.h); ctx.restore();
    ctx.lineWidth = p.locked ? .7 : 1.3; ctx.strokeStyle = p.locked ? '#fff9' : '#fffdeb'; ctx.stroke(p.path);
    if (!p.locked && !recyclerIds.includes(p.id) && dragging?.p !== p) {
      const duplicate = isDuplicate(p), label = `#${p.typeId + 1}${duplicate ? ' · DUP' : ''}`;
      ctx.font = 'bold 10px Arial'; const badgeWidth = ctx.measureText(label).width + 12;
      roundedRect(5, 7, badgeWidth, 18, 4, duplicate ? '#f6e8d1' : '#fffff2e8');
      ctx.fillStyle = duplicate ? '#87572f' : '#465d48'; ctx.fillText(label, 11, 20);
    }
    ctx.restore();
  }
  function draw() {
    if (!board) return;
    ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#1c192b'; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff08';
    for (let y = 12; y < height; y += 20) for (let x = 12; x < width; x += 20) { ctx.beginPath(); ctx.arc(x, y, .8, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#b6adc9'; ctx.font = '10px Arial'; ctx.fillText('TVŮJ OBRÁZEK', board.x, board.y - 27); ctx.fillText('ZÁSOBNÍK DÍLKŮ', tray.x, tray.y - 18);
    roundedRect(board.x - 12, board.y - 12, board.w + 24, board.h + 24, 5, '#776445');
    roundedRect(board.x - 3, board.y - 3, board.w + 6, board.h + 6, 2, '#d9bb7a');
    ctx.fillStyle = '#302c40'; ctx.fillRect(board.x, board.y, board.w, board.h);
    roundedRect(recycler.x, recycler.y, recycler.w, recycler.h, 10, '#302139');
    ctx.strokeStyle = '#e9328e'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.roundRect(recycler.x, recycler.y, recycler.w, recycler.h, 10); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#f5d9e8'; ctx.font = 'bold 11px Arial'; ctx.fillText('ŠROTOVAČ · TŘI DÍLKY ZA JEDEN', recycler.x + 16, recycler.y + 25);
    ctx.font = '11px Arial'; ctx.fillText('Přetáhni sem 3 dílky. Vyměň je za nový náhodný dílek.', recycler.x + 16, recycler.y + 44);
    for (let i = 0; i < 3; i++) {
      roundedRect(recycler.x + i * 160 + 10, recycler.y + 58, 140, 100, 6, '#1c1729');
      if (!recyclerIds[i]) { ctx.fillStyle = '#7c6589'; ctx.font = '24px Georgia'; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), recycler.x + i * 160 + 80, recycler.y + 118); ctx.textAlign = 'left'; }
    }
    if (ready) {
      ctx.save(); ctx.globalAlpha = preview ? .66 : .08; ctx.drawImage(image, board.x, board.y, board.w, board.h); ctx.restore();
      templates.forEach(t => { ctx.save(); ctx.translate(board.x + t.col * pw, board.y + t.row * ph); ctx.strokeStyle = '#d0b57666'; ctx.lineWidth = 1; ctx.stroke(t.path); ctx.restore(); });
      pieces.filter(p => p.locked).forEach(p => drawPiece(p));
      visibleInventory().filter(p => dragging?.p !== p).forEach(p => drawPiece(p, true));
      recyclerIds.map(id => pieces.find(p => p.id === id)).filter(p => p && dragging?.p !== p).forEach(p => drawPiece(p, true));
      if (dragging) drawPiece(dragging.p, true);
      if (!inventory().length) {
        ctx.textAlign = 'center'; ctx.fillStyle = '#b5acc7'; ctx.font = '32px Georgia'; ctx.fillText('+', tray.x + tray.w / 2, tray.y + 170);
        ctx.font = 'bold 20px Arial'; ctx.fillText('TVŮJ PRVNÍ DÍLEK ČEKÁ.', tray.x + tray.w / 2, tray.y + 210);
        ctx.font = '12px Arial'; ctx.fillText('Klikni na „Nový dílek“ a zkus štěstí.', tray.x + tray.w / 2, tray.y + 238); ctx.textAlign = 'left';
      }
      if (complete()) { ctx.fillStyle = '#f2c870'; ctx.textAlign = 'center'; ctx.font = 'bold 23px Arial'; ctx.fillText('Kousek po kousku. Hotovo.', board.x + board.w / 2, board.y + board.h + 44); ctx.textAlign = 'left'; }
    }
    if (width > 660) { ctx.strokeStyle = '#ffffff16'; ctx.beginPath(); ctx.moveTo(594, 36); ctx.lineTo(594, height - 36); ctx.stroke(); }
  }
  function pointer(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * width / r.width, y: (e.clientY - r.top) * height / r.height };
  }
  function hit(p, pos) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const inside = ctx.isPointInPath(p.path, (pos.x - p.x) / p.scale, (pos.y - p.y) / p.scale); ctx.restore(); return inside;
  }
  canvas.addEventListener('pointerdown', e => {
    if (!ready || e.button !== 0 || dragging) return;
    const pos = pointer(e), visible = [...visibleInventory(), ...recyclerIds.map(id => pieces.find(p => p.id === id))];
    for (let i = visible.length - 1; i >= 0; i--) {
      const p = visible[i]; if (!p || !hit(p, pos)) continue;
      dragging = { p, dx: (pos.x - p.x) / p.scale, dy: (pos.y - p.y) / p.scale, moved: false };
      canvas.setPointerCapture(e.pointerId); updateStats(); draw(); e.preventDefault(); break;
    }
  });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    dragging.moved = true; canvas.classList.add('dragging');
    const pos = pointer(e), p = dragging.p; p.scale = 1;
    p.x = Math.max(20, Math.min(width - pw - 20, pos.x - dragging.dx));
    p.y = Math.max(25, Math.min(height - ph - 25, pos.y - dragging.dy)); draw();
  });
  function release(cancel = false) {
    if (!dragging) return;
    const p = dragging.p, center = { x: p.x + pw / 2, y: p.y + ph / 2 };
    const inRecycler = center.x >= recycler.x && center.x <= recycler.x + recycler.w && center.y >= recycler.y && center.y <= recycler.y + recycler.h;
    if (!cancel && dragging.moved && Math.hypot(p.x - p.targetX, p.y - p.targetY) < Math.min(25, pw * .25, ph * .25)) {
      if (placedTypes.has(p.typeId)) { recyclerIds = recyclerIds.filter(id => id !== p.id); setMessage('Toto místo už je složené. Duplicitní dílek můžeš dát do šrotovače.'); }
      else {
        p.locked = true; placedTypes.add(p.typeId); recyclerIds = recyclerIds.filter(id => id !== p.id);
        setMessage(complete() ? 'Hotovo! Všechny kousky zapadly. Užij si svůj obrázek.' : 'Zapadlo! Další kousek čeká v zásobníku nebo v novém losování.');
      }
    } else if (!cancel && dragging.moved && inRecycler) {
      if (!recyclerIds.includes(p.id) && recyclerIds.length < 3) recyclerIds.push(p.id);
      setMessage(recyclerIds.length === 3 ? 'Šrotovač je připraven. Vyměň tři dílky za jeden náhodný.' : `Ve šrotovači je ${recyclerIds.length} / 3 dílků. Přidej další.`);
    } else if (!cancel && dragging.moved) {
      recyclerIds = recyclerIds.filter(id => id !== p.id);
      const index = inventory().findIndex(item => item.id === p.id); page = Math.floor(index / capacity);
      setMessage('Dílek je zpátky v zásobníku. Zkus jiné místo.');
    }
    dragging = null; canvas.classList.remove('dragging'); arrange(); updateStats(); draw();
  }
  canvas.addEventListener('pointerup', () => release()); canvas.addEventListener('pointercancel', () => release(true));
  ui['draw-piece'].addEventListener('click', () => { if (ready && !dragging) randomPiece(); });
  ui.recycle.addEventListener('click', recycle); ui['return-pieces'].addEventListener('click', returnPieces);
  for (const [id, delta] of [['previous-page', -1], ['next-page', 1]]) ui[id].addEventListener('click', () => { if (dragging) return; page = Math.max(0, Math.min(pageCount() - 1, page + delta)); arrange(); updateStats(); draw(); });
  document.querySelector('#preview').addEventListener('click', e => { preview = !preview; e.currentTarget.setAttribute('aria-pressed', String(preview)); draw(); });
  document.querySelector('#shuffle').addEventListener('click', reset);
  async function fullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.querySelector('.game-shell').requestFullscreen(); }
    catch { setMessage('Prohlížeč nepodporuje celou obrazovku.'); }
  }
  document.querySelector('#fullscreen').addEventListener('click', fullscreen);
  window.addEventListener('keydown', e => { if (e.key.toLowerCase() === 'f' && !e.repeat) fullscreen(); });
  window.addEventListener('resize', () => { release(true); layout(); updateStats(); });
  setInterval(() => { const now = performance.now(); if (started && !complete()) elapsed += now - lastTick; lastTick = now; updateStats(); }, 250);
  window.advanceTime = ms => { if (started && !complete()) elapsed += ms; lastTick = performance.now(); updateStats(); draw(); };
  window.render_game_to_text = () => JSON.stringify({
    mode: !ready ? 'loading' : complete() ? 'complete' : 'playing', coordinates: 'Canvas logical pixels; origin top left, x right, y down.',
    width, height, board, recycler, columns: cols, rows, preview, placed: placedTypes.size, total, elapsed: Math.floor(elapsed / 1000),
    inventoryCount: inventory().length, page: page + 1, pages: pageCount(), recyclerIds, dragging: dragging?.p.id ?? null,
    pieces: pieces.map(p => ({ id: p.id, typeId: p.typeId, x: Math.round(p.x), y: Math.round(p.y), scale: p.scale,
      targetX: p.targetX, targetY: p.targetY, locked: p.locked, duplicate: isDuplicate(p), edges: p.edges,
      location: p.locked ? 'board' : recyclerIds.includes(p.id) ? 'recycler' : 'inventory', visible: p.locked || recyclerIds.includes(p.id) || visibleInventory().includes(p) }))
  });
  image.onload = () => {
    const fit = Math.min(480 / image.naturalWidth, 320 / image.naturalHeight);
    boardWidth = image.naturalWidth * fit; boardHeight = image.naturalHeight * fit;
    pw = boardWidth / cols; ph = boardHeight / rows;
    ready = true; layout(); document.querySelector('#loading').classList.add('hidden'); reset();
  };
  image.onerror = () => { document.querySelector('#loading').textContent = 'Obrázek se nepodařilo načíst. Zkontroluj cestu k obrázku v config.js.'; };
  layout(); updateStats(); image.src = config.image || 'assets/lake-cottage.png';
})();
