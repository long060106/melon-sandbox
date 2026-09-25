'use strict';
/* =====================================================================
   Melon Sandbox — game loop, rendering, input, UI wiring.
   ===================================================================== */

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const world = new World();
const fx = new Effects(world);
world.fx = fx;

const state = {
  tool: 'drag',
  spawn: null,
  paused: false,
  slow: false,
  controlled: null,
  pointer: { x: 0, y: 0, inside: false },
  keys: { left: false, right: false },
  tbcPending: 0,
  tbcCooldown: 0,
};

// ---------------------------------------------------------------- spawnables
const groundSafe = (y) => Math.min(y, world.groundY - 56);
const faceCenter = (x) => (x < world.width / 2 ? 1 : -1);

const SPAWN = {
  human:  { cat: 'Living', label: 'Civilian', sub: 'Random anime civilian', color: '#f1c59b',
            make: (x, y) => new Ragdoll(world, x, groundSafe(y), { facing: faceCenter(x) }) },
  crate:  { cat: 'Objects', label: 'Crate', sub: 'Light wooden box', color: '#b57a3a',
            make: (x, y) => new Box(world, x, y, 46, 46, 4) },
  bigcrate: { cat: 'Objects', label: 'Big Crate', sub: 'Heavier', color: '#8f5a26',
            make: (x, y) => new Box(world, x, y, 80, 80, 12, { color: '#9a6430' }) },
  melon:  { cat: 'Objects', label: 'Watermelon', sub: 'Bouncy', color: '#3d8a2b',
            make: (x, y) => new MelonBall(world, x, y) },
  knife:  { cat: 'Objects', label: 'Knife', sub: 'Throw it', color: '#c9ccd4',
            make: (x, y) => new Stick(world, x, y, 0, 'knife') },
};
SPAWN.arrow = { cat: 'JoJo Items', jojo: true, label: 'Stand Arrow', sub: 'Stab a civilian', color: '#e8c04a',
                make: (x, y) => new Stick(world, x, y, -0.3, 'arrow') };
SPAWN.roller = { cat: 'JoJo Items', jojo: true, label: 'Road Roller', sub: 'ロードローラーだ!', color: '#f2c230',
                 make: (x, y) => new RoadRoller(world, x, y) };
for (const d of STAND_LIST) {
  SPAWN[d.id] = {
    cat: d.partName, jojo: true, label: d.user, sub: `「${d.name}」`, color: d.color,
    make: (x, y) => new Ragdoll(world, x, groundSafe(y), { stand: d.id, design: d.design, name: d.user, facing: faceCenter(x) }),
  };
}

function buildCatalog() {
  const el = document.getElementById('catalog');
  const cats = {};
  for (const [key, s] of Object.entries(SPAWN)) (cats[s.cat] ||= []).push([key, s]);
  el.innerHTML = '';
  for (const [cat, items] of Object.entries(cats)) {
    const wrap = document.createElement('div');
    if (items[0][1].jojo) wrap.className = 'cat-jojo';
    wrap.innerHTML = `<h4>${cat}</h4>`;
    for (const [key, s] of items) {
      const b = document.createElement('button');
      b.className = 'item';
      b.dataset.spawn = key;
      b.innerHTML = `<span class="sw" style="background:${s.color}"></span><span class="t">${s.label}<small>${s.sub}</small></span>`;
      b.onclick = () => selectSpawn(state.spawn === key ? null : key);
      wrap.appendChild(b);
    }
    el.appendChild(wrap);
  }
}

function selectSpawn(key) {
  state.spawn = key;
  for (const b of document.querySelectorAll('.item')) b.classList.toggle('active', b.dataset.spawn === key);
  if (key) toast(`Click the world to place: ${SPAWN[key].label}`);
  if (key && innerWidth <= 760) document.getElementById('catalog').classList.remove('open');
}

function spawnAt(key, x, y) {
  const body = SPAWN[key].make(x, y);
  world.add(body);
  SFX.spawn();
  return body;
}

// ---------------------------------------------------------------- control
function setControlled(r) {
  if (state.controlled) { state.controlled.controlled = false; state.controlled.moveDir = 0; }
  state.controlled = r;
  if (r) { r.controlled = true; toast(`Controlling ${r.name}${r.stand ? ' — J / K / L for Stand abilities' : ''}`); }
  document.getElementById('hud').hidden = !r;
  refreshPadLabels();
}

function refreshPadLabels() {
  const r = state.controlled;
  if (!r) return;
  document.getElementById('hudName').textContent = r.name;
  const st = r.stand;
  document.getElementById('hudStand').textContent = st ? `Stand: 「${st.def.name}」` : (r.standKey ? 'Stand: (gone)' : 'No Stand');
  for (const b of document.querySelectorAll('[data-act-key]')) {
    const k = b.dataset.actKey;
    if (k === 'P') continue;
    b.querySelector('span').textContent = st ? st.labelFor(k) : '—';
  }
}

function useAbility(k) {
  const r = state.controlled;
  if (!r || r.dead) return;
  if (k === 'P') { r.strikePose(); return; }
  if (r.stand && JOJO.enabled) r.stand.use(k);
}

// ---------------------------------------------------------------- world events
world.on('timestop', (ts) => {
  SFX.timeStop();
  const d = ts.def;
  fx.text(0, -40, d ? d.tsCall : 'TIME STOP!', { screen: true, size: 56, color: d ? d.accent : '#fff', stroke: '#140a1f', life: 1.8, vx: 0, vy: 0, rot: -0.05 });
  if (d) Voice.say(d.tsCall, d.voice.pitch, 1.0);
});
world.on('timetick', (ts) => {
  SFX.tick();
  const n = ts.lastTick;
  const dio = ts.def && ts.def.id === 'the_world';
  fx.text(0, 30, dio ? `${n} byou keika...` : `${n} second${n > 1 ? 's' : ''}...`, { screen: true, size: 26, color: '#fff', life: 0.9, vx: 0, vy: -10, rot: 0 });
});
world.on('timeresume', (ts) => {
  SFX.timeResume();
  const msg = ts.def ? ts.def.resumeCall : 'Time resumes.';
  fx.text(0, 0, msg, { screen: true, size: 40, color: '#fff', life: 1.4, vx: 0, vy: 0, rot: 0 });
  Voice.say(msg, ts.def ? ts.def.voice.pitch : 1, 1.0);
});
world.on('accel', () => { fx.text(0, 30, 'Time is accelerating!', { screen: true, size: 30, color: '#fff', life: 1.6, vx: 0, vy: 0, rot: 0 }); });
world.on('accelend', () => { fx.text(0, 0, 'Time flows normally again.', { screen: true, size: 30, color: '#fff', life: 1.4, vx: 0, vy: 0, rot: 0 }); SFX.timeResume(); });
world.on('timemove', (b) => {
  fx.text(b.p.head.x, b.p.head.y - 40, 'I can move too...', { size: 24, color: b.stand ? b.stand.def.accent : '#fff', life: 1.6, vy: -20 });
});
world.on('explosion', ({ x, y, radius }) => {
  fx.flash(x, y, radius * 1.3, 0.35);
  fx.ring(x, y, 10, radius * 1.4, 0.45, '#ffd27a', 8);
  fx.spark(x, y, 24, '#ffb347', 700);
  SFX.explosion();
});
world.on('standappear', (st) => {
  if (!JOJO.enabled) return;
  JOJO.showCard(st.def);
  fx.ring(st.x, st.y, 5, 60, 0.5, st.def.color, 5);
});
world.on('awaken', (r) => {
  SFX.awaken();
  fx.text(0, -60, 'A STAND HAS AWAKENED!', { screen: true, size: 48, color: '#f1c75b', life: 1.8, vx: 0, vy: 0, rot: 0 });
  if (state.controlled === r) refreshPadLabels();
});
world.on('death', (r) => {
  if (!JOJO.enabled || !JOJO.tbc || !r.standKey || r.isClone || r.has('doom')) return;
  if (state.tbcCooldown > 0 || JOJO.tbcState || state.tbcPending > 0) return;
  state.tbcPending = 0.45;
});

// ---------------------------------------------------------------- input
function canvasPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function dismissTbc() {
  if (!JOJO.tbcState) return false;
  if (JOJO.tbcState.t < 0.4) return true;
  JOJO.tbcState = null;
  state.tbcCooldown = 5;
  return true;
}

canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  SFX.init();
  if (dismissTbc()) return;
  const { x, y } = canvasPos(e);
  state.pointer.x = x; state.pointer.y = y;
  canvas.setPointerCapture(e.pointerId);
  closePanels();

  if (e.button === 2) { selectSpawn(null); world.grab = null; return; }
  if (state.spawn) { spawnAt(state.spawn, x, y); return; }

  switch (state.tool) {
    case 'drag': {
      const p = world.particleAt(x, y, 14);
      if (p) world.grab = { p, x, y };
      break;
    }
    case 'control': {
      const b = world.bodyAt(x, y);
      if (b && b.kind === 'ragdoll') setControlled(b);
      break;
    }
    case 'delete': {
      const b = world.bodyAt(x, y);
      if (b) { if (b === state.controlled) setControlled(null); world.remove(b); SFX.click(); }
      break;
    }
    case 'pin': {
      const p = world.particleAt(x, y, 12);
      if (p) { p.pinned = !p.pinned; SFX.click(); }
      break;
    }
    case 'explode':
      world.explode(x, y, 130, 1300);
      break;
    case 'heal': {
      const b = world.bodyAt(x, y);
      if (b && b.kind === 'ragdoll') {
        b.restore(); SFX.heal();
        fx.ring(b.p.chest.x, b.p.chest.y, 5, 70, 0.5, '#7dffa0', 5);
        if (state.controlled === b) refreshPadLabels();
      }
      break;
    }
  }
});
canvas.addEventListener('pointermove', (e) => {
  const { x, y } = canvasPos(e);
  state.pointer.x = x; state.pointer.y = y; state.pointer.inside = true;
  if (world.grab) { world.grab.x = x; world.grab.y = y; }
});
canvas.addEventListener('pointerleave', () => { state.pointer.inside = false; });
const endGrab = () => { world.grab = null; };
canvas.addEventListener('pointerup', endGrab);
canvas.addEventListener('pointercancel', endGrab);
canvas.addEventListener('dblclick', (e) => {
  if (state.spawn) return;
  const { x, y } = canvasPos(e);
  const b = world.bodyAt(x, y);
  if (b && b.kind === 'ragdoll') setControlled(b);
});

const TOOL_KEYS = { Digit1: 'drag', Digit2: 'control', Digit3: 'delete', Digit4: 'pin', Digit5: 'explode', Digit6: 'heal' };
addEventListener('keydown', (e) => {
  SFX.init();
  if (dismissTbc()) { e.preventDefault(); return; }
  if (e.target.tagName === 'INPUT') return;
  const r = state.controlled;
  const code = e.code;
  if (TOOL_KEYS[code]) { setTool(TOOL_KEYS[code]); return; }
  switch (code) {
    case 'KeyA': case 'ArrowLeft': state.keys.left = true; e.preventDefault(); break;
    case 'KeyD': case 'ArrowRight': state.keys.right = true; e.preventDefault(); break;
    case 'KeyW': case 'ArrowUp': if (r) r.jumpReq = true; e.preventDefault(); break;
    case 'Space':
      e.preventDefault();
      if (r) r.jumpReq = true; else togglePause();
      break;
    case 'KeyJ': case 'KeyK': case 'KeyL': case 'KeyP':
      if (!e.repeat) useAbility(code.slice(3));
      break;
    case 'KeyZ': toggleSlow(); break;
    case 'KeyH': toggleHelp(); break;
    case 'Escape':
      if (state.spawn) selectSpawn(null);
      else if (r) setControlled(null);
      closePanels();
      document.getElementById('help').hidden = true;
      break;
  }
});
addEventListener('keyup', (e) => {
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') state.keys.left = false;
  if (e.code === 'KeyD' || e.code === 'ArrowRight') state.keys.right = false;
});
addEventListener('blur', () => { state.keys.left = state.keys.right = false; });

// Touch action pad.
for (const b of document.querySelectorAll('#pad [data-key]')) {
  const k = b.dataset.key;
  const down = (e) => {
    e.preventDefault(); SFX.init();
    if (k === 'jump') { if (state.controlled) state.controlled.jumpReq = true; }
    else state.keys[k] = true;
  };
  const up = () => { if (k !== 'jump') state.keys[k] = false; };
  b.addEventListener('pointerdown', down);
  b.addEventListener('pointerup', up);
  b.addEventListener('pointerleave', up);
  b.addEventListener('pointercancel', up);
}
for (const b of document.querySelectorAll('#pad [data-act-key]')) {
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); SFX.init(); useAbility(b.dataset.actKey); });
}
document.getElementById('hudRelease').onclick = () => setControlled(null);

// ---------------------------------------------------------------- toolbar
function setTool(t) {
  state.tool = t;
  selectSpawn(null);
  for (const b of document.querySelectorAll('#tools button')) b.classList.toggle('active', b.dataset.tool === t);
  canvas.style.cursor = t === 'drag' ? 'grab' : t === 'explode' ? 'crosshair' : 'pointer';
}
for (const b of document.querySelectorAll('#tools button')) b.onclick = () => setTool(b.dataset.tool);

function togglePause() {
  state.paused = !state.paused;
  document.querySelector('[data-act="pause"]').classList.toggle('on', state.paused);
  toast(state.paused ? 'Paused' : 'Resumed');
}
function toggleSlow() {
  state.slow = !state.slow;
  document.querySelector('[data-act="slow"]').classList.toggle('on', state.slow);
  toast(state.slow ? 'Slow motion' : 'Normal speed');
}
function toggleHelp() {
  const h = document.getElementById('help');
  h.hidden = !h.hidden;
}
function closePanels() {
  document.getElementById('settings').hidden = true;
}

for (const b of document.querySelectorAll('[data-act]')) {
  b.addEventListener('click', () => {
    SFX.init();
    switch (b.dataset.act) {
      case 'pause': togglePause(); break;
      case 'slow': toggleSlow(); break;
      case 'clear':
        setControlled(null);
        world.clear(); fx.clear(); JOJO.cards = []; JOJO.tbcState = null;
        toast('Cleared');
        break;
      case 'settings': {
        const s = document.getElementById('settings');
        s.hidden = !s.hidden;
        break;
      }
      case 'sound':
        SFX.on = !SFX.on;
        b.textContent = SFX.on ? '🔊' : '🔇';
        break;
      case 'help': toggleHelp(); break;
      case 'catalog': document.getElementById('catalog').classList.toggle('open'); break;
    }
  });
}

for (const input of document.querySelectorAll('[data-opt]')) {
  input.addEventListener('change', () => {
    const k = input.dataset.opt;
    if (k === 'voice') { Voice.on = input.checked; if (!input.checked && window.speechSynthesis) speechSynthesis.cancel(); }
    else if (k === 'gore') fx.gore = input.checked;
    else JOJO[k] = input.checked;
  });
}

document.getElementById('jojoToggle').onclick = () => setJojo(!JOJO.enabled);
function setJojo(on) {
  JOJO.enabled = on;
  document.body.classList.toggle('jojo', on);
  document.querySelector('#jojoToggle b').textContent = on ? 'ON' : 'OFF';
  if (!on) {
    world.endTimeStop();
    if (world.erase) world.erase.t = world.erase.dur;
    JOJO.cards = []; JOJO.tbcState = null;
    fx.glyphs.length = 0;
    if (state.spawn && SPAWN[state.spawn].jojo) selectSpawn(null);
    world.accel = null;
  } else {
    SFX.menace();
    fx.text(0, -20, 'JOJO MODE', { screen: true, size: 72, color: '#f1c75b', stroke: '#2a0f45', life: 1.4, vx: 0, vy: 0, rot: -0.06 });
  }
}

let toastTimer = 0;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

// ---------------------------------------------------------------- HUD
function updateHud() {
  const r = state.controlled;
  if (!r) return;
  if (r.removed) { setControlled(null); return; }
  const k = clamp(r.hp / r.maxHp, 0, 1);
  const bar = document.getElementById('hudHp');
  bar.style.width = (r.dead ? 0 : k * 100) + '%';
  bar.style.background = k > 0.5 ? '#5fd35f' : k > 0.25 ? '#f2c33a' : '#e5484d';
  const st = r.stand;
  if (st !== updateHud.lastStand) { updateHud.lastStand = st; refreshPadLabels(); }
  for (const b of document.querySelectorAll('[data-act-key]')) {
    const key = b.dataset.actKey;
    if (key === 'P') { b.classList.toggle('disabled', r.dead); continue; }
    const i = b.querySelector('i');
    if (!st || !JOJO.enabled) { i.style.width = '0%'; b.classList.add('disabled'); continue; }
    const label = st.labelFor(key);
    const span = b.querySelector('span');
    if (span.textContent !== label) span.textContent = label;
    const frac = st.cooldownFrac(key);
    i.style.width = (frac * 100).toFixed(1) + '%';
    b.classList.toggle('disabled', r.dead);
  }
}

// ---------------------------------------------------------------- rendering
function drawMarkers(ctx) {
  for (const b of world.bodies) {
    for (const p of b.particles) {
      if (!p.pinned) continue;
      ctx.fillStyle = '#e5484d'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, TAU); ctx.fill(); ctx.stroke();
    }
  }
  for (const r of world.ragdolls()) {
    const bomb = r.stand && r.stand.bomb;
    if (!bomb || bomb.removed) continue;
    const c = bomb.kind === 'ragdoll' ? bomb.p.chest : bomb.center();
    const pulse = 1 + 0.15 * Math.sin(world.time * 10);
    ctx.save();
    ctx.translate(c.x, c.y - (bomb.kind === 'ragdoll' ? 70 : 34));
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#2a2230';
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#f06aa8'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#f1c75b';
    ctx.beginPath(); ctx.moveTo(5, -6); ctx.quadraticCurveTo(10, -14, 14, -10); ctx.stroke();
    ctx.restore();
  }
}

function drawSpawnGhost(ctx) {
  if (!state.spawn || !state.pointer.inside) return;
  const s = SPAWN[state.spawn];
  const { x, y } = state.pointer;
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = s.color;
  ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill();
  ctx.globalAlpha = 0.9;
  ctx.font = `16px ${COMIC_FONT}`;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.textAlign = 'center';
  ctx.strokeText('+ ' + s.label, x, y - 20); ctx.fillText('+ ' + s.label, x, y - 20);
  ctx.restore();
}

function render() {
  const w = world.width, h = world.height;
  ctx.save();
  if (world.shake > 0) ctx.translate(rand(-1, 1) * world.shake, rand(-1, 1) * world.shake);
  JOJO.drawBackground(ctx, w, h, world.time);
  JOJO.drawGround(ctx, world);
  fx.drawStains(ctx);

  const ts = world.timeStop;
  for (const b of world.bodies) if (!ts || b.frozen) b.draw(ctx);
  fx.drawWorld(ctx);
  if (ts) {
    JOJO.drawTimeStopTint(ctx, ts, w, h);
    for (const b of world.bodies) if (!b.frozen) b.draw(ctx);
  }
  if (world.accel) JOJO.drawAccel(ctx, world.accel, w, h, world.time);
  if (world.erase) {
    JOJO.drawErase(ctx, world.erase, w, h, world.time);
    ctx.save();
    ctx.globalAlpha = 0.85;
    world.erase.owner.draw(ctx);
    ctx.restore();
  }
  if (JOJO.enabled) fx.drawGlyphs(ctx);
  for (const r of world.ragdolls()) r.drawOverlay(ctx);
  drawMarkers(ctx);
  fx.drawTexts(ctx, w, h);
  if (ts) {
    JOJO.drawTimeStopWave(ctx, ts, w, h);
    JOJO.drawTimeStopHud(ctx, ts, w);
  }
  drawSpawnGhost(ctx);
  if (state.paused && !JOJO.tbcState) {
    ctx.font = `40px ${COMIC_FONT}`; ctx.textAlign = 'center';
    ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.fillStyle = '#fff';
    ctx.strokeText('PAUSED', w / 2, 110); ctx.fillText('PAUSED', w / 2, 110);
  }
  ctx.restore();
  if (JOJO.enabled) JOJO.drawCard(ctx, w, h);
  JOJO.drawTbc(ctx, w, h);
}

// ---------------------------------------------------------------- loop
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = innerWidth, h = innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // On phones the action pad sits in a thicker floor instead of covering the fight.
  world.resize(w, h, w <= 760 ? 128 : 64);
}
addEventListener('resize', resize);

function applyControls() {
  const r = state.controlled;
  if (!r) return;
  if (r.dead || r.stun > 0) { r.moveDir = 0; return; }
  const dir = (state.keys.right ? 1 : 0) - (state.keys.left ? 1 : 0);
  r.moveDir = dir;
  if (dir && (!r.stand || r.stand.state === 'idle')) r.facing = dir;
}

let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const scale = state.slow ? 0.3 : 1;
  const running = !state.paused && !JOJO.tbcState;

  if (state.tbcCooldown > 0) state.tbcCooldown -= dt;
  if (state.tbcPending > 0 && running) {
    state.tbcPending -= dt;
    if (state.tbcPending <= 0) { JOJO.tbcState = { t: 0 }; SFX.menace(); }
  }

  if (running) {
    applyControls();
    const accel = world.accel ? 2 : 1;
    acc += dt * scale * accel;
    let n = 0;
    while (acc >= DT && n < 8 * accel) { world.step(); acc -= DT; n++; }
    if (n === 8 * accel) acc = 0;
    fx.update(dt * scale * accel, !!world.timeStop);
  }
  JOJO.update(dt);
  if (document.body.classList.contains('tbc') !== !!JOJO.tbcState) document.body.classList.toggle('tbc', !!JOJO.tbcState);
  updateHud();
  render();
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- boot
function initialScene() {
  const gy = world.groundY, w = world.width;
  spawnAt('star_platinum', w * 0.3, gy - 60);
  spawnAt('the_world', w * 0.62, gy - 60);
  spawnAt('human', w * 0.14, gy - 60);
  spawnAt('crate', w * 0.46, gy - 30);
  spawnAt('melon', w * 0.5, gy - 150);
}

buildCatalog();
resize();
setTool('drag');
initialScene();
requestAnimationFrame(frame);
setTimeout(() => toast('Press H for controls · double-click a character to control it'), 600);
