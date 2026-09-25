'use strict';
/* =====================================================================
   Stand art: cel-shaded, ink-outlined Stand figures with an animated
   aura, per-Stand heads/patterns, and the non-humanoid Stands
   (Aerosmith's plane, the Sex Pistols, Hermit Purple's vines).
   Local frame: origin = Stand chest, facing +x, head center (0,-31).
   ===================================================================== */

const HEAD_STAND = [[-10, -37], [-9, -43], [-2, -46], [7, -44], [11, -37], [11.5, -29], [9, -23], [3, -20], [-4, -22], [-9, -27]];

function drawStand(ctx, s) {
  if (s.alpha <= 0.01) return;
  const A = s.def.art || {};
  if (A.special === 'vines') return drawVines(ctx, s);
  if (A.special === 'pistols') return drawPistols(ctx, s);
  if (A.special === 'plane') return drawPlane(ctx, s);

  const d = s.def, f = s.facing, sc = A.scale || 1.12;
  const angry = s.state !== 'idle', off = s.buff.armorOff > 0;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(f * sc, sc);
  ctx.globalAlpha = s.alpha * 0.93;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  drawAuraFlames(ctx, s);
  blit(ctx, sprite('stand-back:' + d.id, -68, -74, 136, 146, (g) => renderStandBack(g, d)));
  if (A.lower === 'horse') drawHorse(ctx, s);
  drawStandArms(ctx, s, false);
  blit(ctx, sprite('stand-front:' + d.id + (angry ? ':a' : '') + (off ? ':o' : ''), -68, -74, 136, 146,
    (g) => renderStandFront(g, { def: d, t: 0, state: angry ? 'active' : 'idle', buff: { armorOff: off ? 1 : 0 } })));
  drawStandArms(ctx, s, true);
  ctx.restore();

  // World-space extras.
  if (s.state === 'finger' && s.fingerLen > 0) {
    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.strokeStyle = d.skin; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.shadowColor = d.glow; ctx.shadowBlur = 10;
    const sx = s.x + s.aim.x * 14, sy = s.y - 6 + s.aim.y * 14;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + s.aim.x * s.fingerLen, sy + s.aim.y * s.fingerLen); ctx.stroke();
    ctx.restore();
  }
  if (s.line) drawStandLine(ctx, s);
}

// ---------------------------------------------------------------- aura / lower body
/** Static back layer: soft glow + ghost tail / legs (cached). */
function renderStandBack(ctx, d) {
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 64);
  g.addColorStop(0, d.aura); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, 64, 0, Math.PI * 2); ctx.fill();
  const fake = { def: d, t: 0 };
  if (d.art.lower === 'legs') drawStandLegs(ctx, fake);
  else if (d.art.lower !== 'horse') drawGhostTail(ctx, fake);
}

/** Static front layer: torso, pattern, shoulders, neck and head (cached per mood). */
function renderStandFront(ctx, s) {
  const d = s.def, A = d.art;
  const armorOff = s.buff.armorOff > 0;
  const torso = A.slim || armorOff
    ? [[-11, -18], [11, -18], [12, -10], [8, 2], [6, 15], [-6, 15], [-8, 2], [-12, -10]]
    : [[-15, -19], [15, -19], [16, -11], [11, 2], [8, 15], [-8, 15], [-11, 2], [-16, -11]];
  celBlob(ctx, torso, d.color, true, 1.9);
  ctx.strokeStyle = d.dark; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-10, -9); ctx.quadraticCurveTo(-4, -4, 0, -9);
  ctx.moveTo(0, -9); ctx.quadraticCurveTo(5, -4, 10, -9);
  ctx.moveTo(-3, -1); ctx.lineTo(3, -1); ctx.moveTo(-2.5, 4); ctx.lineTo(2.5, 4);
  ctx.moveTo(0, -12); ctx.lineTo(0, 8);
  ctx.stroke();
  drawStandPattern(ctx, s, A.pattern);
  ctx.fillStyle = d.dark; ctx.fillRect(-9, 10, 18, 4);
  ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(-9, 10, 18, 4);
  if (!armorOff) drawShoulders(ctx, s, A.shoulders);
  flatBlob(ctx, [[-4, -24], [4, -24], [5, -17], [-5, -17]], shade(d.color, -0.15), false, 1.3);
  drawStandHead(ctx, s, A.head);
}

/** Live, animated aura flames — one path, one fill. */
function drawAuraFlames(ctx, s) {
  const t = s.t;
  ctx.save();
  ctx.globalAlpha *= 0.45;
  ctx.fillStyle = s.def.aura;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bx = Math.cos(a) * 22, by = Math.sin(a) * 36 + 4;
    const h = 18 + 9 * Math.sin(t * 6 + i * 1.7);
    const sway = Math.sin(t * 5 + i) * 5;
    ctx.moveTo(bx - 7, by);
    ctx.quadraticCurveTo(bx - 6, by - h * 0.6, bx + sway, by - h);
    ctx.quadraticCurveTo(bx + 6, by - h * 0.6, bx + 7, by);
    ctx.closePath();
  }
  ctx.fill();
  ctx.restore();
}

function drawGhostTail(ctx, s) {
  const d = s.def, wave = Math.sin(s.t * 3) * 4;
  const lg = ctx.createLinearGradient(0, 12, 0, 66);
  lg.addColorStop(0, d.color); lg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.moveTo(-9, 12); ctx.quadraticCurveTo(-14, 40, -4 + wave, 66); ctx.lineTo(4 + wave, 66); ctx.quadraticCurveTo(14, 40, 9, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,8,30,0.45)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-9, 12); ctx.quadraticCurveTo(-14, 40, -4 + wave, 66); ctx.moveTo(9, 12); ctx.quadraticCurveTo(14, 40, 4 + wave, 66); ctx.stroke();
}

function drawStandLegs(ctx, s) {
  const d = s.def, sw = Math.sin(s.t * 2) * 3;
  ctx.save();
  const lg = ctx.createLinearGradient(0, 10, 0, 64);
  lg.addColorStop(0, 'rgba(0,0,0,1)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha *= 0.85;
  limb(ctx, { x: -5, y: 13 }, { x: -8 + sw, y: 38 }, 6, 5, shade(d.color, -0.15), 1);
  limb(ctx, { x: -8 + sw, y: 38 }, { x: -6 + sw, y: 60 }, 5, 4, shade(d.skin, -0.15), 1);
  limb(ctx, { x: 5, y: 13 }, { x: 8 - sw, y: 38 }, 6, 5, d.color, 1);
  limb(ctx, { x: 8 - sw, y: 38 }, { x: 10 - sw, y: 60 }, 5, 4, d.skin, 1);
  ctx.restore();
}

function drawHorse(ctx, s) {
  const d = s.def, t = s.t;
  const gallop = (i) => Math.sin(t * 14 + i * 1.6) * 7;
  for (const [x, i, back] of [[-34, 0, true], [-8, 1, true], [-30, 2, false], [-4, 3, false]]) {
    const col = back ? shade(d.skin, -0.2) : d.skin;
    limb(ctx, { x, y: 26 }, { x: x + gallop(i), y: 44 }, 4.5, 3.6, col, 1);
    limb(ctx, { x: x + gallop(i), y: 44 }, { x: x + gallop(i) * 1.4, y: 60 }, 3.6, 3, col, 1);
    flatBlob(ctx, circlePts(x + gallop(i) * 1.4, 61, 3, 6), INK, true, 1);
  }
  celBlob(ctx, [[-44, 18], [-40, 10], [-10, 8], [8, 14], [6, 28], [-10, 32], [-40, 30]], d.skin, true, 1.9);
  ctx.strokeStyle = d.dark; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-36, 16); ctx.lineTo(-14, 14); ctx.moveTo(-36, 24); ctx.lineTo(-14, 24); ctx.stroke();
  // Tail.
  ctx.strokeStyle = d.dark; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-44, 16); ctx.quadraticCurveTo(-58, 18 + Math.sin(t * 8) * 4, -60, 34); ctx.stroke();
}

// ---------------------------------------------------------------- arms
function drawStandArms(ctx, s, front) {
  const d = s.def, st = s.state, T = s.stateT, A = d.art || {};
  const sh = front ? { x: 11, y: -13 } : { x: -9, y: -13 };
  const glove = A.gloves || d.skin;
  const arm = (ex, ey, hx, hy, alpha = 1, open = false) => {
    ctx.save();
    ctx.globalAlpha *= alpha;
    const upper = front ? d.color : shade(d.color, -0.18), lower = front ? glove : shade(glove, -0.18);
    limb(ctx, sh, { x: ex, y: ey }, 5.6, 4.8, upper, 1, 1.6);
    limb(ctx, { x: ex, y: ey }, { x: hx, y: hy }, 4.8, 4.4, lower, 1, 1.6);
    const hand = sprite('fist:' + lower + (open ? ':o' : ''), -6, -7, 15, 14, (g) => {
      if (open) flatBlob(g, [[-2, -4], [6, -3], [7, 1], [-2, 4]], lower, true, 1.2);
      else flatBlob(g, [[-3.5, -4.5], [4.5, -4.5], [6, 0], [4.5, 4.5], [-3.5, 4.5]], lower, true, 1.3);
    });
    ctx.drawImage(hand.c, hx + hand.x0, hy + hand.y0, hand.w, hand.h);
    if (A.weapon === 'rapier' && front && alpha === 1) {
      ctx.strokeStyle = '#e8ecf4'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(hx + 3, hy); ctx.lineTo(hx + 40, hy - 2); ctx.stroke();
      ctx.fillStyle = '#e8c04a'; ctx.fillRect(hx + 1, hy - 4, 2.4, 8);
    }
    ctx.restore();
  };
  if (st === 'barrage') {
    const n = front ? 6 : 3;
    for (let i = 0; i < n; i++) {
      const hx = rand(20, 48), hy = rand(-22, 14);
      if (A.weapon === 'rapier') {
        ctx.save(); ctx.globalAlpha *= rand(0.4, 0.9);
        ctx.strokeStyle = '#e8ecf4'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(sh.x + 8, sh.y + 4); ctx.lineTo(hx + 26, hy); ctx.stroke();
        ctx.restore();
      } else arm((sh.x + hx) / 2, (sh.y + hy) / 2 + 3, hx, hy, rand(0.25, 0.75));
    }
    // Speed lines.
    ctx.save(); ctx.globalAlpha *= 0.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    ctx.beginPath(); for (let i = 0; i < 4; i++) { const y = rand(-24, 16); ctx.moveTo(16, y); ctx.lineTo(56, y); } ctx.stroke();
    ctx.restore();
    return;
  }
  if (front && (st === 'punch' || st === 'touch' || st === 'cast' || st === 'detonate')) {
    const k = st === 'punch' ? (T < 0.16 ? -T / 0.16 * 0.6 : Math.min(1, (T - 0.16) / 0.06)) : Math.min(1, T / 0.08);
    const reach = k < 0 ? 10 + k * 14 : 10 + k * 32;
    arm(sh.x + reach * 0.45, sh.y + 4, sh.x + reach, sh.y + 6, 1, st !== 'punch');
    if (st === 'detonate') dotInk(ctx, sh.x + reach, sh.y + 1, 2.4, d.accent, 1);
    return;
  }
  if (front && st === 'chop') {
    const k = clamp((T - 0.1) / 0.12, 0, 1);
    arm(lerp(14, 26, k), lerp(-30, -4, k), lerp(8, 38, k), lerp(-42, 8, k), 1, true);
    return;
  }
  if (front && st === 'finger') { arm(sh.x + 10, sh.y + 2, sh.x + 20, sh.y + 4, 1, true); return; }
  // Idle: arms folded (the classic Stand stance).
  if (front) arm(17, 1, 2, 5);
  else arm(-13, 4, 0, 8);
}

// ---------------------------------------------------------------- shoulders / patterns
function drawShoulders(ctx, s, type) {
  const d = s.def;
  for (const x of [-15, 15]) {
    const col = x > 0 ? d.accent : shade(d.accent, -0.2);
    if (type === 'pad') celBlob(ctx, [[x - 7, -16], [x - 5, -22], [x + 5, -22], [x + 7, -16], [x, -12]], col);
    else if (type === 'spike') flatBlob(ctx, [[x - 7, -15], [x, -27], [x + 7, -15]], col, false);
    else if (type === 'heart') { ctx.fillStyle = col; heartPath(ctx, x, -17, 5); ctx.fill(); inkStroke(ctx, 1.2); }
    else if (type === 'star') { ctx.fillStyle = col; starPath(ctx, x, -17, 6); ctx.fill(); inkStroke(ctx, 1.1); }
    else if (type === 'round') celBlob(ctx, circlePts(x, -17, 5.5), col);
    else if (type === 'gem') { celBlob(ctx, circlePts(x, -17, 5), shade(d.color, -0.1)); dotInk(ctx, x, -17, 2.4, d.accent, 1); }
  }
}

function drawStandPattern(ctx, s, p) {
  const d = s.def;
  ctx.save();
  ctx.fillStyle = d.accent; ctx.strokeStyle = d.accent;
  switch (p) {
    case 'star': starPath(ctx, 0, -5, 5.5); ctx.fill(); inkStroke(ctx, 1); break;
    case 'hearts':
      for (const [x, y, sz] of [[0, -5, 4.5], [-7, 6, 2.6], [7, 6, 2.6]]) { heartPath(ctx, x, y, sz); ctx.fillStyle = d.accent; ctx.fill(); inkStroke(ctx, 0.9); }
      break;
    case 'skull':
      dotInk(ctx, 0, 12, 3.6, d.accent, 1);
      ctx.fillStyle = INK; ctx.fillRect(-2, 11, 1.4, 1.4); ctx.fillRect(0.6, 11, 1.4, 1.4);
      break;
    case 'net':
      ctx.strokeStyle = d.dark; ctx.lineWidth = 0.9; ctx.beginPath();
      for (let i = -14; i <= 12; i += 6) { ctx.moveTo(i, -16); ctx.lineTo(i + 8, 10); ctx.moveTo(i, 10); ctx.lineTo(i + 8, -16); }
      ctx.stroke(); break;
    case 'zip':
      ctx.strokeStyle = '#d8dce8'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, 12); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.setLineDash([1, 1.3]); ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, 12); ctx.stroke(); ctx.setLineDash([]);
      for (const x of [-8, 8]) { ctx.strokeStyle = '#d8dce8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, -14); ctx.lineTo(x * 0.6, 4); ctx.stroke(); }
      dotInk(ctx, 0, -17, 2, '#e8c04a', 0.8);
      break;
    case 'dna': {
      ctx.fillStyle = INK; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
      const letters = 'AGCTTAGC';
      for (let i = 0; i < 8; i++) ctx.fillText(letters[i], -6 + (i % 3) * 6, -12 + i * 3);
      break;
    }
    case 'capsules':
      for (const [x, y] of [[-8, -6], [8, -6], [0, 4]]) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(0.5);
        flatBlob(ctx, [[-4, -1.8], [4, -1.8], [4, 1.8], [-4, 1.8]], '#f4f0f8', true, 0.8);
        ctx.fillStyle = '#b060e0'; ctx.fillRect(0, -1.8, 4, 3.6);
        ctx.restore();
      }
      ctx.strokeStyle = d.dark; ctx.lineWidth = 0.7; ctx.beginPath();
      for (let x = -12; x <= 12; x += 4) { ctx.moveTo(x, -16); ctx.lineTo(x, 10); }
      ctx.stroke(); break;
    case 'grid':
      ctx.strokeStyle = d.dark; ctx.lineWidth = 0.7; ctx.beginPath();
      for (let x = -12; x <= 12; x += 4) { ctx.moveTo(x, -16); ctx.lineTo(x, 10); }
      for (let y = -14; y <= 8; y += 4) { ctx.moveTo(-13, y); ctx.lineTo(13, y); }
      ctx.stroke(); break;
    case 'moon':
      ctx.beginPath(); ctx.arc(0, -4, 6, 0.4, Math.PI * 2 - 0.4); ctx.arc(3, -4, 5, Math.PI * 2 - 0.6, 0.6, true); ctx.closePath();
      ctx.fill(); inkStroke(ctx, 1);
      ctx.strokeStyle = d.dark; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(0, 10); ctx.lineTo(6, 6); ctx.stroke();
      break;
    case 'clock':
      dotInk(ctx, 0, -5, 6, '#f8f4ea', 1);
      ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, -9.5); ctx.moveTo(0, -5);
      ctx.lineTo(Math.cos(s.t * 8) * 4, -5 + Math.sin(s.t * 8) * 4); ctx.stroke(); break;
    case 'ladybug':
      for (const [x, y] of [[0, -5], [-8, 4], [8, 4]]) {
        dotInk(ctx, x, y, 2.8, '#2f9a5a', 1);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 0.8, y - 0.8, 0.8, 0, 7); ctx.fill();
      }
      break;
    case 'bubbles':
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1;
      for (const [x, y, r] of [[-6, -8, 3], [5, -4, 2.2], [0, 5, 2.6]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); }
      ctx.fillStyle = d.accent; starPath(ctx, 8, 6, 3); ctx.fill(); break;
    case 'strings':
      ctx.strokeStyle = shade(d.color, 0.4); ctx.lineWidth = 0.8; ctx.beginPath();
      for (let i = -12; i <= 12; i += 3) { ctx.moveTo(i, -16); ctx.bezierCurveTo(i + 4, -6, i - 4, 2, i + 1, 12); }
      ctx.stroke(); break;
    case 'flame':
      ctx.fillStyle = '#ffcf4a';
      for (const x of [-7, 0, 7]) { ctx.beginPath(); ctx.moveTo(x - 3, 8); ctx.quadraticCurveTo(x, -6 + Math.sin(s.t * 9 + x) * 2, x + 3, 8); ctx.fill(); }
      break;
    case 'melon':
      ctx.strokeStyle = d.dark; ctx.lineWidth = 0.9; ctx.beginPath();
      for (let i = -12; i <= 12; i += 5) { ctx.moveTo(i, -16); ctx.quadraticCurveTo(i + 3, -2, i, 12); }
      for (let y = -12; y <= 8; y += 5) { ctx.moveTo(-12, y); ctx.quadraticCurveTo(0, y + 2, 12, y); }
      ctx.stroke(); break;
    case 'three':
      ctx.fillStyle = d.accent; ctx.font = `bold 14px ${COMIC_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('3', 0, -4); ctx.lineWidth = 1; ctx.strokeStyle = INK; ctx.strokeText('3', 0, -4); break;
    case 'dollar':
      ctx.fillStyle = d.accent; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('$', -6, -6); ctx.fillText('¥', 6, -6);
      ctx.strokeStyle = d.dark; ctx.lineWidth = 1; ctx.beginPath(); for (const x of [-10, -4, 4, 10]) { ctx.moveTo(x, 0); ctx.lineTo(x, 10); } ctx.stroke(); break;
    case 'horseshoe':
      ctx.strokeStyle = d.accent; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, -4, 5, Math.PI * 0.15, Math.PI * 0.85, true); ctx.stroke();
      ctx.fillStyle = d.accent; starPath(ctx, 0, 6, 3.4); ctx.fill(); break;
    case 'spots':
      ctx.fillStyle = d.dark; for (const [x, y] of [[-8, -10], [6, -8], [-4, 2], [8, 4], [0, -2]]) { ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill(); }
      break;
    case 'gold':
      ctx.strokeStyle = shade(d.color, 0.45); ctx.lineWidth = 1.2; ctx.beginPath();
      ctx.moveTo(-12, -14); ctx.lineTo(0, -4); ctx.lineTo(12, -14); ctx.moveTo(-8, 6); ctx.lineTo(0, 0); ctx.lineTo(8, 6); ctx.stroke();
      dotInk(ctx, 0, -4, 2.4, '#2f9a5a', 1);
      break;
  }
  ctx.restore();
}

// ---------------------------------------------------------------- heads
function standEyes(ctx, s, x = 6, y = -33, opts = {}) {
  const angry = s.state !== 'idle';
  ctx.save();
  ctx.shadowColor = s.def.glow; ctx.shadowBlur = 8;
  ctx.fillStyle = opts.color || '#fff';
  ctx.beginPath();
  if (angry) { ctx.moveTo(x - 3.5, y - 1.8); ctx.lineTo(x + 4, y + 0.4); ctx.lineTo(x - 3, y + 1.4); }
  else ctx.ellipse(x, y, 3.6, 1.6, -0.15, 0, Math.PI * 2);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  if (opts.mouth !== false) {
    ctx.strokeStyle = s.def.dark; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(5, -25); ctx.lineTo(9.5, -26); ctx.stroke();
  }
}

function drawStandHead(ctx, s, type) {
  const d = s.def, t = s.t;
  const base = (col = d.color) => celBlob(ctx, HEAD_STAND, col, true, 1.8);
  switch (type) {
    case 'sp':
      {
        // Long wild hair streaming back.
        const w1 = Math.sin(t * 4) * 3, w2 = Math.sin(t * 4 + 1.3) * 3, w3 = Math.sin(t * 4 + 2.6) * 3;
        celBlob(ctx, [[4, -46], [-8, -48], [-30, -46 + w1], [-18, -40], [-36, -34 + w2], [-20, -30], [-32, -20 + w3], [-16, -22], [-24, -10 + w1], [-8, -20], [-4, -30]], d.hair || '#1c1030', false);
      }
      base(d.skin);
      flatBlob(ctx, [[-10, -40], [11, -41], [11.5, -37.5], [-10, -36.5]], d.accent, false, 1.1);
      standEyes(ctx, s);
      flatBlob(ctx, [[-6, -21], [8, -21], [9, -17], [-6, -17]], '#c8303a', false, 1.1); // scarf
      break;
    case 'mr':
      for (let i = 0; i < 4; i++) flatBlob(ctx, [[-6 - i * 3, -44 + i * 2], [-20 - i * 4, -54 + i * 5 + Math.sin(t * 6 + i) * 2], [-10 - i * 3, -38 + i * 2]], i % 2 ? '#ffb040' : d.accent, false, 1.1);
      base();
      flatBlob(ctx, [[8, -36], [22, -30], [8, -26]], '#f2c030', false, 1.3);
      ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(9, -31); ctx.lineTo(20, -30.5); ctx.stroke();
      standEyes(ctx, s, 4, -36, { mouth: false });
      break;
    case 'hg':
      base();
      ctx.strokeStyle = d.dark; ctx.lineWidth = 0.9; ctx.beginPath();
      for (let i = -8; i <= 8; i += 4) { ctx.moveTo(i, -45); ctx.quadraticCurveTo(i + 3, -34, i, -22); }
      ctx.stroke();
      flatBlob(ctx, [[1, -36], [11, -37], [11, -32], [1, -31]], '#0e2a18', false, 1);
      standEyes(ctx, s, 6, -34, { mouth: false, color: '#b8ffd0' });
      break;
    case 'sc':
      if (s.buff.armorOff > 0) { base(d.skin); standEyes(ctx, s); break; }
      ctx.fillStyle = '#d83a4a';
      ctx.beginPath(); ctx.moveTo(-2, -46); ctx.quadraticCurveTo(-26, -58, -34, -40 + Math.sin(t * 5) * 2); ctx.quadraticCurveTo(-20, -48, -6, -42); ctx.fill(); inkStroke(ctx, 1);
      base();
      flatBlob(ctx, [[0, -35], [12, -35], [12, -32], [0, -32]], INK, false, 0.8);
      ctx.strokeStyle = d.dark; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(2, -31); ctx.lineTo(2, -23); ctx.moveTo(6, -31); ctx.lineTo(6, -22); ctx.stroke();
      break;
    case 'tw':
      base();
      flatBlob(ctx, [[-2, -38], [12, -38], [12, -33], [-2, -33]], d.dark, false, 1);
      ctx.strokeStyle = d.dark; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(-6, -45); ctx.lineTo(-6, -24); ctx.moveTo(-2, -46); ctx.lineTo(-2, -26); ctx.stroke();
      ctx.fillStyle = d.accent; heartPath(ctx, 4, -42, 2.6); ctx.fill(); inkStroke(ctx, 0.8);
      standEyes(ctx, s, 7, -35.5, { color: '#fff4a0' });
      break;
    case 'cd':
      ctx.strokeStyle = d.accent; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(-8, -28); ctx.quadraticCurveTo(-18, -18, -13, -12); ctx.moveTo(-4, -24); ctx.quadraticCurveTo(-10, -16, -8, -12); ctx.stroke();
      base(d.skin);
      flatBlob(ctx, [[-10, -46], [8, -46], [11, -40], [-10, -39]], d.color, false, 1.2);
      ctx.fillStyle = d.accent; heartPath(ctx, 7, -33, 3.2); ctx.fill(); inkStroke(ctx, 0.9);
      standEyes(ctx, s, 6, -35.5);
      break;
    case 'th':
      base();
      ctx.strokeStyle = d.accent; ctx.lineWidth = 1.2; ctx.beginPath();
      for (const x of [-7, -3, 1]) { ctx.moveTo(x, -46); ctx.lineTo(x + 1, -22); }
      ctx.stroke();
      flatBlob(ctx, [[3, -37], [11.5, -37], [11.5, -31], [3, -31]], d.dark, false, 1);
      standEyes(ctx, s, 7, -34, { mouth: false });
      break;
    case 'ec':
      base(d.skin);
      flatBlob(ctx, [[-10, -40], [11, -42], [11, -37], [-10, -35]], d.color, false, 1.1);
      ctx.fillStyle = d.accent; ctx.font = `bold 8px ${COMIC_FONT}`; ctx.textAlign = 'center'; ctx.fillText('3', -2, -26);
      standEyes(ctx, s, 6, -32, { color: '#dfffb0' });
      break;
    case 'kq':
      base(d.skin);
      flatBlob(ctx, [[-8, -43], [-6, -53], [-1, -46]], d.skin, false, 1.2);
      flatBlob(ctx, [[1, -46], [5, -54], [8, -43]], d.skin, false, 1.2);
      standEyes(ctx, s);
      break;
    case 'hd':
      base(d.skin);
      flatBlob(ctx, [[-14, -41], [14, -41], [14, -38], [-14, -38]], d.color, false, 1.2);
      celBlob(ctx, [[-9, -40], [-8, -50], [7, -50], [9, -40]], d.color);
      standEyes(ctx, s, 6, -33, { color: '#fff' });
      break;
    case 'ge':
    case 'ger':
      base();
      for (const [x, y] of [[-6, -45], [-1, -47], [4, -46]]) {
        dotInk(ctx, x, y, 3, d.color, 1.1);
        ctx.strokeStyle = d.dark; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x, y, 1.3, 0, Math.PI * 1.5); ctx.stroke();
      }
      dotInk(ctx, 2, -40, 2, '#2f9a5a', 1);
      if (type === 'ger') {
        ctx.save(); ctx.shadowColor = '#fff6c0'; ctx.shadowBlur = 12;
        flatBlob(ctx, [[-1, -40], [3, -48], [7, -40], [3, -42]], '#f8e8a0', false, 1);
        ctx.strokeStyle = 'rgba(255,240,180,0.9)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(-2, -50, 13, 3.5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      standEyes(ctx, s, 6.5, -34);
      break;
    case 'sf':
      base();
      ctx.strokeStyle = '#d8dce8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-2, -46); ctx.lineTo(-2, -22); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 0.7; ctx.setLineDash([1, 1.2]);
      ctx.beginPath(); ctx.moveTo(-2, -46); ctx.lineTo(-2, -22); ctx.stroke(); ctx.setLineDash([]);
      standEyes(ctx, s, 6, -34);
      break;
    case 'ph':
      base();
      ctx.strokeStyle = d.dark; ctx.lineWidth = 0.8; ctx.beginPath();
      for (let x = -8; x <= 10; x += 3.5) { ctx.moveTo(x, -45); ctx.lineTo(x, -23); }
      for (let y = -43; y <= -25; y += 3.5) { ctx.moveTo(-9, y); ctx.lineTo(11, y); }
      ctx.stroke();
      flatBlob(ctx, [[4, -27], [11, -27], [10, -22], [5, -22]], '#fff', false, 1);
      ctx.strokeStyle = INK; ctx.lineWidth = 0.7; ctx.beginPath(); for (let x = 5; x <= 10; x += 1.5) { ctx.moveTo(x, -27); ctx.lineTo(x, -22); } ctx.stroke();
      ctx.strokeStyle = 'rgba(200,240,255,0.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(8, -22); ctx.lineTo(8, -16 + Math.sin(t * 3) * 2); ctx.stroke();
      standEyes(ctx, s, 6, -36, { mouth: false, color: '#ffb0ff' });
      break;
    case 'kc':
      flatBlob(ctx, [[-8, -40], [-20, -26], [-7, -28]], d.dark, false, 1);
      base();
      ctx.fillStyle = d.skin; ctx.beginPath(); ctx.ellipse(3, -40, 5, 3.4, 0, 0, Math.PI * 2); ctx.fill(); inkStroke(ctx, 0.9);
      ctx.fillStyle = '#111'; ctx.fillRect(1, -41, 1.3, 1.3); ctx.fillRect(4.5, -41, 1.3, 1.3);
      ctx.strokeStyle = d.dark; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-7, -34); ctx.lineTo(-7, -22); ctx.moveTo(-3, -33); ctx.lineTo(-3, -21); ctx.stroke();
      standEyes(ctx, s, 6, -32);
      break;
    case 'sg':
      base(d.skin);
      ctx.fillStyle = d.color; heartPath(ctx, 0, -46, 6); ctx.fill(); inkStroke(ctx, 1.1);
      standEyes(ctx, s, 6, -33);
      ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(9, -35); ctx.lineTo(11.5, -37); ctx.stroke();
      break;
    case 'sfree':
      base();
      flatBlob(ctx, [[0, -38], [12, -38], [12, -31], [0, -31]], '#1d3a5a', false, 1.1);
      ctx.fillStyle = '#9fe8ff'; ctx.fillRect(3, -36.5, 7, 3.5);
      ctx.strokeStyle = shade(d.color, 0.4); ctx.lineWidth = 0.8; ctx.beginPath();
      for (let x = -8; x <= 0; x += 2.5) { ctx.moveTo(x, -46); ctx.bezierCurveTo(x + 3, -38, x - 3, -30, x, -22); }
      ctx.stroke();
      break;
    case 'ws':
      base();
      ctx.fillStyle = INK; ctx.font = 'bold 4.5px monospace'; ctx.textAlign = 'center';
      const L = 'GATTACA';
      for (let i = 0; i < 7; i++) ctx.fillText(L[i], -5 + (i % 2) * 4, -43 + i * 3);
      flatBlob(ctx, [[5, -27], [11, -27.5], [10, -24], [6, -24]], '#b02a40', false, 0.9);
      standEyes(ctx, s, 6, -35, { mouth: false, color: '#fff' });
      break;
    case 'cm':
      base();
      ctx.fillStyle = d.accent;
      ctx.beginPath(); ctx.arc(-2, -44, 5, 0.3, Math.PI * 2 - 0.3); ctx.arc(1, -45, 4, Math.PI * 2 - 0.6, 0.6, true); ctx.closePath(); ctx.fill(); inkStroke(ctx, 0.9);
      ctx.strokeStyle = d.dark; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-8, -32); ctx.lineTo(-3, -28); ctx.lineTo(-8, -24); ctx.stroke();
      standEyes(ctx, s, 6, -34);
      break;
    case 'mih':
      celBlob(ctx, [[-8, -46], [-22, -40 + Math.sin(t * 8) * 2], [-28, -26], [-14, -30], [-8, -24]], d.dark, false);
      base();
      dotInk(ctx, 2, -40, 3.4, '#f8f4ea', 0.9);
      ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(2, -40); ctx.lineTo(2 + Math.cos(t * 10) * 2.6, -40 + Math.sin(t * 10) * 2.6); ctx.stroke();
      standEyes(ctx, s, 7, -32);
      break;
    case 'tusk':
      base();
      ctx.strokeStyle = d.accent; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(1, -41, 4.5, Math.PI * 0.1, Math.PI * 0.9, true); ctx.stroke();
      ctx.fillStyle = '#fff'; starPath(ctx, -5, -30, 3); ctx.fill();
      standEyes(ctx, s, 6.5, -34);
      break;
    case 'd4c':
      flatBlob(ctx, [[-4, -44], [-10, -64], [-5, -64], [1, -45]], d.color, false, 1.2);
      flatBlob(ctx, [[1, -45], [2, -66], [7, -64], [6, -44]], shade(d.color, 0.1), false, 1.2);
      base();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-6, -40); ctx.lineTo(-6, -24); ctx.moveTo(-2, -41); ctx.lineTo(-2, -23); ctx.stroke();
      standEyes(ctx, s, 6.5, -34, { color: '#fff6a0' });
      break;
    case 'sw':
      base();
      dotInk(ctx, -2, -32, 4, 'rgba(200,240,255,0.7)', 1);
      ctx.fillStyle = d.accent; starPath(ctx, -3, -44, 3.2); ctx.fill(); inkStroke(ctx, 0.8);
      standEyes(ctx, s, 6.5, -34);
      break;
    default:
      base();
      standEyes(ctx, s);
  }
}

// ---------------------------------------------------------------- lines (vines, strings, tentacles)
function drawStandLine(ctx, s) {
  const L = s.line, u = s.user;
  const from = u.p.fHand;
  const k = clamp(L.t / 0.1, 0, 1);
  const tx = lerp(from.x, L.x, k), ty = lerp(from.y, L.y, k);
  ctx.save();
  ctx.globalAlpha = s.alpha;
  ctx.lineCap = 'round';
  const mx = (from.x + tx) / 2, my = (from.y + ty) / 2 - 18;
  for (const [w, col] of [[5, INK], [3, L.color]]) {
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();
  }
  if (L.thorns) {
    ctx.strokeStyle = INK; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < 8; i++) {
      const q = i / 8, x = (1 - q) * (1 - q) * from.x + 2 * (1 - q) * q * mx + q * q * tx, y = (1 - q) * (1 - q) * from.y + 2 * (1 - q) * q * my + q * q * ty;
      ctx.moveTo(x, y); ctx.lineTo(x + (i % 2 ? 4 : -4), y - 4);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- special Stands
function drawVines(ctx, s) {
  const u = s.user, h = u.p.fHand, t = s.t;
  ctx.save();
  ctx.globalAlpha = s.alpha;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const a = t * 2 + i * 2.1;
    const x1 = h.x + Math.cos(a) * 26, y1 = h.y + Math.sin(a) * 18 - 10;
    const x2 = h.x + Math.cos(a + 1.3) * 16, y2 = h.y - 30 + Math.sin(a * 1.3) * 8;
    for (const [w, col] of [[4.5, INK], [2.8, s.def.color]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.bezierCurveTo(x1, y1, x2, y2, h.x + Math.cos(a) * 10, h.y - 44); ctx.stroke();
    }
  }
  ctx.restore();
  if (s.line) drawStandLine(ctx, s);
}

function drawPistols(ctx, s) {
  const u = s.user, h = u.p.fHand, t = s.t, f = u.facing;
  const nums = ['1', '2', '3', '5', '6', '7'];
  ctx.save();
  ctx.globalAlpha = s.alpha;
  for (let i = 0; i < 6; i++) {
    const a = t * 2.2 + (i / 6) * Math.PI * 2;
    const x = h.x + Math.cos(a) * 20 + f * 6, y = h.y - 14 + Math.sin(a) * 12 + Math.sin(t * 9 + i) * 2;
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    limb(ctx, { x: 0, y: 2 }, { x: 0, y: 7 }, 2.6, 2, s.def.color, 1, 1);
    celBlob(ctx, circlePts(0, -1.5, 3.4, 7), s.def.color, true, 1.1);
    ctx.fillStyle = INK; ctx.fillRect(0.5, -2.5, 2.4, 1.2);
    ctx.fillStyle = INK; ctx.font = 'bold 5px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(nums[i], -0.5, 6.5);
    ctx.restore();
  }
  ctx.restore();
}

function drawPlane(ctx, s) {
  const d = s.def, t = s.t, dir = s.planeDir || s.facing;
  ctx.save();
  ctx.globalAlpha = s.alpha;
  ctx.translate(s.x, s.y);
  ctx.scale(dir, 1);
  ctx.rotate(Math.sin(t * 3) * 0.08);
  flatBlob(ctx, [[-4, -1], [10, -1], [6, 3], [-6, 3]], shade(d.accent, -0.2), false, 1.1); // far wing
  celBlob(ctx, [[-20, -2], [-14, -5], [12, -5], [18, -2], [14, 3], [-16, 3]], d.color, true, 1.4);
  flatBlob(ctx, [[-20, -2], [-24, -10], [-18, -9], [-14, -3]], d.accent, false, 1.1); // tail fin
  flatBlob(ctx, [[-2, 0], [12, 0], [6, 8], [-8, 8]], d.accent, false, 1.2); // near wing
  flatBlob(ctx, [[2, -5], [5, -9], [10, -8], [11, -5]], '#9fd8ff', true, 1);
  ctx.fillStyle = '#fff'; starPath(ctx, -8, -1, 2.4); ctx.fill();
  ctx.strokeStyle = 'rgba(40,40,40,0.6)'; ctx.lineWidth = 1.5;
  const pr = Math.sin(t * 60) * 7;
  ctx.beginPath(); ctx.moveTo(19, -2 - pr); ctx.lineTo(19, -2 + pr); ctx.stroke();
  ctx.restore();
}
