'use strict';
/* =====================================================================
   Anime-style character art: cel-shaded limbs with ink outlines,
   side-view anime heads, hair styles, outfits and accessories.
   Designs are original interpretations built from recognizable colors
   and silhouettes — nothing is traced from the anime.
   ===================================================================== */

const INK = '#150b1a';
const _shadeCache = new Map();
/** Lighten (amt > 0) or darken (amt < 0) a #rrggbb or rgb() color. Cached. */
function shade(hex, amt) {
  const key = hex + amt;
  let v = _shadeCache.get(key);
  if (v) return v;
  let r, g, b;
  if (hex[0] === '#') {
    const n = parseInt(hex.slice(1), 16);
    r = (n >> 16) & 255; g = (n >> 8) & 255; b = n & 255;
  } else {
    const m = hex.match(/[\d.]+/g) || [0, 0, 0];   // 'rgb(r,g,b)' from an earlier shade()
    r = +m[0]; g = +m[1]; b = +m[2];
  }
  const t = amt < 0 ? 0 : 255, k = Math.abs(amt);
  r = Math.round((t - r) * k + r); g = Math.round((t - g) * k + g); b = Math.round((t - b) * k + b);
  v = `rgb(${r},${g},${b})`;
  _shadeCache.set(key, v);
  return v;
}

// ---------------------------------------------------------------- path helpers
function pathPts(ctx, pts, smooth = true) {
  ctx.beginPath();
  const n = pts.length;
  if (!smooth) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    return;
  }
  ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  ctx.closePath();
}

function inkStroke(ctx, lw = 1.6) { ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(); }

/** Filled shape with a cel-shaded lower/back rim and an ink outline. */
function celBlob(ctx, pts, base, smooth = true, lw = 1.6) {
  pathPts(ctx, pts, smooth);
  ctx.fillStyle = shade(base, -0.32);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.translate(1.4, -2);
  pathPts(ctx, pts, smooth);
  ctx.fillStyle = base;
  ctx.fill();
  ctx.restore();
  pathPts(ctx, pts, smooth);
  inkStroke(ctx, lw);
}

function flatBlob(ctx, pts, fill, smooth = true, lw = 1.4) {
  pathPts(ctx, pts, smooth);
  ctx.fillStyle = fill; ctx.fill();
  inkStroke(ctx, lw);
}

function circlePts(cx, cy, r, n = 8) {
  const out = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return out;
}

function capsulePath(ctx, ax, ay, bx, by, r0, r1) {
  const ang = Math.atan2(by - ay, bx - ax);
  ctx.beginPath();
  ctx.arc(ax, ay, r0, ang + Math.PI / 2, ang - Math.PI / 2);
  ctx.arc(bx, by, r1, ang - Math.PI / 2, ang + Math.PI / 2);
  ctx.closePath();
}

/** Tapered, cel-shaded, ink-outlined limb segment. f = facing (light comes from the front-top).
 *  Rendered once per (color, radii, length bucket) into a sprite, then rotated into place. */
function limb(ctx, a, b, r0, r1, base, f, lw = 1.7) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 0.01;
  const s = ((-dy / L) * f - dx / L) > 0 ? 1 : -1;   // which side faces the light
  const Lb = Math.max(6, Math.round(L / 6) * 6);
  const R = Math.max(r0, r1) + lw;
  const spr = sprite(`limb:${base}:${r0}:${r1}:${lw}:${Lb}`, -r0 - lw - 1, -R - 1, Lb + r0 + r1 + lw * 2 + 2, R * 2 + 2,
    (g) => limbRaw(g, Lb, r0, r1, base, lw));
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(Math.atan2(dy, dx));
  ctx.scale(L / Lb, s);
  blit(ctx, spr);
  ctx.restore();
}

/** Limb along +x from (0,0) to (L,0), lit from +y: shadow fill, slimmer lit capsule, ink outline. */
function limbRaw(ctx, L, r0, r1, base, lw) {
  capsulePath(ctx, 0, 0, L, 0, r0, r1);
  ctx.fillStyle = shade(base, -0.3);
  ctx.fill();
  capsulePath(ctx, 0, r0 * 0.28, L, r1 * 0.28, r0 * 0.72, r1 * 0.72);
  ctx.fillStyle = base;
  ctx.fill();
  capsulePath(ctx, 0, 0, L, 0, r0, r1);
  inkStroke(ctx, lw);
}

// ---------------------------------------------------------------- sprite cache
// Static art (heads, Stand bodies) is drawn once into an offscreen canvas and
// blitted with drawImage — far cheaper than re-running dozens of paths per frame.
const SPRITE_SCALE = 2.5;
const SPRITE_BUDGET = 25e6;   // total cached pixels (~100 MB) before the cache is flushed
const _sprites = new Map();
let _spritePixels = 0;
function sprite(key, x0, y0, w, h, drawFn) {
  let s = _sprites.get(key);
  if (!s) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * SPRITE_SCALE); c.height = Math.ceil(h * SPRITE_SCALE);
    if (_spritePixels + c.width * c.height > SPRITE_BUDGET) { _sprites.clear(); _spritePixels = 0; }
    _spritePixels += c.width * c.height;
    const g = c.getContext('2d');
    g.scale(SPRITE_SCALE, SPRITE_SCALE);
    g.translate(-x0, -y0);
    g.lineCap = 'round'; g.lineJoin = 'round';
    drawFn(g);
    s = { c, x0, y0, w, h };
    _sprites.set(key, s);
  }
  return s;
}
function blit(ctx, s) { ctx.drawImage(s.c, s.x0, s.y0, s.w, s.h); }

function dotInk(ctx, x, y, r, fill, lw = 1.4) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill(); inkStroke(ctx, lw);
}

function starPath(ctx, x, y, r, ri = r * 0.45) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? ri : r, a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.6, y - s * 1.3, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.6, y - s * 1.3, x + s * 1.6, y - s * 0.2, x, y + s * 0.9);
  ctx.closePath();
}

// ---------------------------------------------------------------- designs
// hair: style key in HAIR · hat: hat/bandana color · coat: long coat/robe color
// shirt: inner shirt seen through an open coat · acc: accessory keys (see drawAccessories)
const DESIGNS = {
  jotaro:    { skin: '#e9b98f', hair: '#16151d', style: 'cap', hat: '#1c2236', eye: '#2f7f86', top: '#1c2236', coat: '#1c2236', coatLong: 44, shirt: '#2e7c7a', bottom: '#1c2236', shoes: '#23140e', acc: ['chain', 'collar', 'starMark'], tall: true },
  avdol:     { skin: '#8a5a3c', hair: '#1d1512', style: 'avdol', hat: '#c8302c', eye: '#3a2412', top: '#e8e0d0', coat: '#c8392f', coatLong: 46, shirt: '#e8e0d0', bottom: '#e8e0d0', shoes: '#6b3a1a', acc: ['beads'] },
  kakyoin:   { skin: '#f0c7a0', hair: '#b3322e', style: 'kakyoin', eye: '#7b4a8a', top: '#2f7d45', coat: '#2f7d45', coatLong: 44, shirt: '#2f7d45', bottom: '#2f7d45', shoes: '#231812', acc: ['collar', 'cherry'] },
  polnareff: { skin: '#eec4a0', hair: '#c8cad8', style: 'polnareff', eye: '#3c6fb0', top: '#23232b', bottom: '#c9c4d6', shoes: '#3b2a1a', sleeves: 'short', acc: ['earring', 'belt'] },
  joseph:    { skin: '#e2b38c', hair: '#cfcfd4', style: 'joseph', hat: '#6b5a3a', eye: '#3c6a3a', top: '#7a8a52', bottom: '#d8cfb4', shoes: '#4a3420', acc: ['belt', 'starMark'] },
  dio:       { skin: '#f3d2b4', hair: '#f2d04a', style: 'dio', hat: '#3e9a4a', eye: '#b0203a', top: '#e6b422', shirt: '#1f1a14', bottom: '#e6b422', shoes: '#e6b422', sleeves: 'short', acc: ['heartKnees', 'starMark'], vampire: true },
  josuke:    { skin: '#e9b98f', hair: '#1b1830', style: 'pompadour', eye: '#4a5ea8', top: '#233157', coat: '#233157', shirt: '#1e2436', bottom: '#233157', shoes: '#1b1414', acc: ['pins', 'collar', 'starMark'] },
  okuyasu:   { skin: '#e3b089', hair: '#2a2622', style: 'okuyasu', eye: '#3a2f22', top: '#1f2a44', shirt: '#1f2a44', bottom: '#1f2a44', shoes: '#16100c', acc: ['dollar', 'collar'] },
  koichi:    { skin: '#f0c9a4', hair: '#d8cfa8', style: 'koichi', eye: '#4a6a8a', top: '#232a44', bottom: '#232a44', shoes: '#1a1a1a', acc: ['collar'], small: true },
  kira:      { skin: '#f1cba7', hair: '#e8dca0', style: 'kira', eye: '#6a4a8a', top: '#7a5a9c', shirt: '#efe6f5', bottom: '#7a5a9c', shoes: '#3a2a4a', acc: ['skullTie', 'belt'] },
  rohan:     { skin: '#f1cba7', hair: '#2b3a2a', style: 'rohan', hat: '#6fbf5a', eye: '#3a7a4a', top: '#4f9a5a', bottom: '#20202a', shoes: '#2a1a14', sleeves: 'short', acc: ['penEarring', 'belt'] },
  giorno:    { skin: '#f3cfb0', hair: '#f0c93a', style: 'giorno', eye: '#2f8f9a', top: '#c65a9c', shirt: '#f2e6ee', bottom: '#c65a9c', shoes: '#3a1a2a', acc: ['ladybug', 'heartCut', 'starMark'] },
  bucciarati:{ skin: '#f0caa4', hair: '#16141c', style: 'bucciarati', eye: '#3a4a8a', top: '#eef0f6', bottom: '#eef0f6', shoes: '#1a1a22', acc: ['zipper', 'spots'] },
  mista:     { skin: '#dfad84', hair: '#16141c', style: 'mista', hat: '#dfe6ee', eye: '#3a2a1a', top: '#2c3d7a', bottom: '#c8b98a', shoes: '#4a3a2a', acc: ['holes', 'revolver', 'belt'] },
  narancia:  { skin: '#e3ae84', hair: '#1c1a24', style: 'narancia', hat: '#f08a24', eye: '#6a3a8a', top: '#e8e8ea', bottom: '#5a6a4a', shoes: '#2a2a2a', sleeves: 'short', acc: ['belt'], small: true },
  fugo:      { skin: '#f0caa4', hair: '#e8d27a', style: 'fugo', eye: '#8a3a4a', top: '#7ab0c8', bottom: '#7ab0c8', shoes: '#2a2a2a', acc: ['holes'] },
  diavolo:   { skin: '#f1c9a5', hair: '#e889b8', style: 'diavolo', eye: '#3a8a3a', top: '#d85a9c', bottom: '#3a2b3f', shoes: '#222226', sleeves: 'short', acc: ['mesh', 'belt'] },
  trish:     { skin: '#f3cfb0', hair: '#f28bbd', style: 'trish', eye: '#3a6ab0', top: '#e85a9a', bottom: '#d8a64a', shoes: '#2a2a2a', sleeves: 'short', acc: ['leopard'], fem: true, small: true },
  jolyne:    { skin: '#f1c9a5', hair: '#27465a', style: 'jolyne', eye: '#2f7a5a', top: '#5fae4a', bottom: '#5fae4a', shoes: '#2a2a2a', sleeves: 'short', acc: ['web', 'starMark'], fem: true },
  pucci:     { skin: '#8a5e44', hair: '#e6e6ee', style: 'pucci', eye: '#2a2a3a', top: '#1a1a22', coat: '#1a1a22', coatLong: 50, shirt: '#e8e8ee', bottom: '#1a1a22', shoes: '#111', acc: ['cross'] },
  johnny:    { skin: '#f1cba7', hair: '#f0d060', style: 'johnny', hat: '#2a3a6a', eye: '#3a6ab0', top: '#e8e2d0', bottom: '#2a3a6a', shoes: '#4a3020', acc: ['belt', 'starMark'] },
  valentine: { skin: '#f3d2b4', hair: '#f3dc7a', style: 'valentine', eye: '#3a5ab0', top: '#2f4f9a', coat: '#2f4f9a', shirt: '#f2f2f6', bottom: '#2f4f9a', shoes: '#1a1a2a', acc: ['flagPin', 'belt'] },
  gappy:     { skin: '#e9b98f', hair: '#2a2a36', style: 'sailor', hat: '#f2f2f2', eye: '#3a4a8a', top: '#f2f2f2', shirt: '#2a3a7a', bottom: '#2a3a7a', shoes: '#1a1a1a', acc: ['sailorCollar', 'starMark'] },
};

for (const k in DESIGNS) DESIGNS[k].key = k;
let _civId = 0;

const CIV_HAIR = ['short', 'messy', 'long', 'ponytail', 'buzz', 'short', 'messy'];
const CIV_HAIRCOL = ['#2a2420', '#5a3a22', '#8a6a3a', '#d8b86a', '#1a1a22', '#a0522d', '#6a6a72'];
const CIV_SKIN = ['#f1c9a5', '#e3ae84', '#c98a62', '#8a5a3c', '#f3d6bc'];
const CIV_TOP = ['#ececec', '#c8453a', '#3a6fb0', '#4a9a5a', '#e0b030', '#8a5ab0', '#2a2a30', '#e87a3a'];
const CIV_BOTTOM = ['#3a5a8a', '#2a2a30', '#6a5a4a', '#4a6a8a', '#8a8a92'];
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

function randomCivilianDesign() {
  const style = pick(CIV_HAIR);
  return {
    key: 'civ' + (++_civId),
    skin: pick(CIV_SKIN), hair: pick(CIV_HAIRCOL), style, eye: pick(['#3a2a1a', '#2f6a8a', '#3a6a3a', '#5a3a2a']),
    top: pick(CIV_TOP), bottom: pick(CIV_BOTTOM), shoes: pick(['#2a2a2a', '#f2f2f2', '#6a3a1a']),
    sleeves: Math.random() < 0.5 ? 'short' : 'long', acc: ['belt'], fem: style === 'long' || style === 'ponytail',
  };
}

// ---------------------------------------------------------------- hair styles
// Head-local frame: facing right, head center (0,0), top ≈ -16, chin ≈ +13, face at +x.
const HAIR = {
  cap: {
    back: (c, d) => celBlob(c, [[-10, -10], [-19, -6], [-25, 2], [-16, 1], [-20, 9], [-10, 5]], d.hair, false),
    front: (c, d) => {
      celBlob(c, [[-12, -2], [-12.5, -12], [-6, -18], [4, -19], [11, -15], [13.5, -9], [12, -7], [-3, -6.5]], d.hat);
      flatBlob(c, [[5, -10], [19.5, -8.5], [18.5, -5.5], [6, -6.8]], shade(d.hat, -0.15), false);
      c.fillStyle = '#e8c04a'; c.fillRect(1, -15, 5, 3.4); c.strokeStyle = INK; c.lineWidth = 1; c.strokeRect(1, -15, 5, 3.4);
      celBlob(c, [[-12, -10], [-16, -1], [-9, -4]], d.hair, false);
    },
  },
  avdol: {
    back: (c, d) => {
      for (let i = 0; i < 4; i++) {
        const bx = -6 - i * 2.4;
        c.lineCap = 'round';
        c.strokeStyle = INK; c.lineWidth = 4.6;
        c.beginPath(); c.moveTo(bx, -8 + i); c.lineTo(bx - 5, 12 + i * 2); c.stroke();
        c.strokeStyle = d.hair; c.lineWidth = 3;
        c.beginPath(); c.moveTo(bx, -8 + i); c.lineTo(bx - 5, 12 + i * 2); c.stroke();
        dotInk(c, bx - 5, 13 + i * 2, 1.6, '#e8c04a', 1);
      }
    },
    front: (c, d) => {
      celBlob(c, [[-12, -9], [-10, -15], [0, -17], [9, -15], [12, -10]], d.hair);
      flatBlob(c, [[-12.5, -11], [12, -12], [12.8, -6.5], [-12, -5.5]], d.hat, false);
    },
  },
  kakyoin: {
    back: (c, d) => celBlob(c, [[-11, -6], [-13, 4], [-8, 6]], d.hair, false),
    front: (c, d) => {
      celBlob(c, [[-12, -3], [-12, -12], [-4, -17], [6, -16], [12, -11], [12.5, -7], [4, -9], [-4, -7]], d.hair);
      c.lineCap = 'round';
      for (const [w, col] of [[5, INK], [3, d.hair]]) {
        c.lineWidth = w; c.strokeStyle = col;
        c.beginPath(); c.moveTo(9, -10); c.bezierCurveTo(16.5, -6, 16.5, 4, 12.5, 8); c.arc(14.2, 8.2, 1.8, Math.PI, Math.PI * 2.6); c.stroke();
      }
    },
  },
  polnareff: {
    front: (c, d) => {
      celBlob(c, [[-12, -3], [-11.5, -12], [-10, -31], [-9, -33], [9, -33], [10, -31], [11, -12], [12.5, -6], [6, -8], [-4, -7]], d.hair, false);
      c.strokeStyle = shade(d.hair, -0.3); c.lineWidth = 1;
      c.beginPath(); for (const x of [-7, -3, 1, 5]) { c.moveTo(x, -31); c.lineTo(x + 0.6, -14); } c.stroke();
    },
  },
  joseph: {
    back: (c, d) => celBlob(c, [[-11, -6], [-12.5, 3], [-7, 1]], d.hair, false),
    front: (c, d) => {
      celBlob(c, [[5, 4], [11.5, 4.5], [13.5, 8.5], [10, 14.5], [3, 14], [-1, 9]], d.hair);
      celBlob(c, [[-10, -8], [-9, -17], [0, -20.5], [9, -17], [10, -8]], d.hat);
      flatBlob(c, [[-16.5, -9.5], [17.5, -9.5], [17.5, -6.5], [-16.5, -6.5]], shade(d.hat, -0.12), false);
      c.fillStyle = '#2a1a10'; c.fillRect(-9.5, -11.5, 19.5, 2.2);
    },
  },
  dio: {
    back: (c, d) => celBlob(c, [[-11, -11], [-18, -4], [-22, 6], [-14, 3], [-16, 10], [-9, 5]], d.hair, false),
    front: (c, d) => {
      celBlob(c, [[-12, -3], [-12, -13], [-4, -18], [6, -18], [12, -13], [14.5, -7], [8, -9], [4, -6], [-2, -8]], d.hair);
      flatBlob(c, [[-12.5, -10.5], [12, -11.5], [12.6, -7.8], [-12, -6.8]], d.hat, false);
      c.fillStyle = d.hat; heartPath(c, 13.5, -9.5, 2.6); c.fill(); inkStroke(c, 1);
    },
  },
  pompadour: {
    front: (c, d) => {
      celBlob(c, [[-12, -3], [-12.5, -14], [-4, -19.5], [8, -22], [20, -25.5], [27.5, -20], [22, -14], [13, -11], [6, -9], [-2, -7]], d.hair);
      c.strokeStyle = shade(d.hair, 0.35); c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-4, -16); c.quadraticCurveTo(10, -22, 23, -21); c.moveTo(0, -12); c.quadraticCurveTo(12, -17, 20, -16); c.stroke();
    },
  },
  okuyasu: {
    front: (c, d) => celBlob(c, [[-12, -2], [-13, -9], [-11, -13], [-12, -18.5], [-6, -15], [-3, -20.5], [1, -16], [5, -20.5], [8, -15], [12.5, -15], [12, -9], [13, -6], [6, -8], [-2, -7]], d.hair, false),
  },
  koichi: {
    front: (c, d) => celBlob(c, [[-12, -3], [-12, -11], [-8, -16], [-2, -19.5], [3, -17], [8, -18.5], [10, -13], [13.5, -9], [12, -6], [4, -8], [-4, -7]], d.hair, false),
  },
  kira: {
    back: (c, d) => celBlob(c, [[-11, -9], [-17.5, -2], [-11, 1.5]], d.hair, false),
    front: (c, d) => celBlob(c, [[-12, -3], [-13, -12], [-6, -17.5], [4, -17.5], [11, -13.5], [13.5, -8], [8, -9], [0, -10], [-6, -6]], d.hair),
  },
  rohan: {
    front: (c, d) => {
      celBlob(c, [[-12, -2], [-12, -12], [-4, -17], [6, -16], [12, -11], [13.5, -6], [6, -8]], d.hair);
      flatBlob(c, [[-12.5, -10], [12, -11], [12.8, -6.5], [-12, -5.5]], d.hat, false);
      c.strokeStyle = INK; c.lineWidth = 1.1;
      c.beginPath(); c.moveTo(-11, -8);
      for (let x = -9; x <= 11; x += 2.5) c.lineTo(x, x % 5 === 0 ? -9.8 : -6.8);
      c.stroke();
    },
  },
  giorno: {
    back: (c, d) => {
      for (let i = 0; i < 7; i++) {
        c.beginPath(); c.ellipse(-10 - i * 0.7, -3 + i * 4.3, 2.9, 2.5, 0.3, 0, Math.PI * 2);
        c.fillStyle = i % 2 ? shade(d.hair, -0.2) : d.hair; c.fill(); inkStroke(c, 1.1);
      }
    },
    front: (c, d) => {
      celBlob(c, [[-12, -3], [-12, -13], [-4, -18], [6, -17.5], [12, -12.5], [13, -8], [6, -9.5], [-2, -8]], d.hair);
      for (const [x, y] of [[4.5, -9], [8.3, -7], [11.8, -4.8]]) {
        dotInk(c, x, y, 2.7, d.hair, 1.2);
        c.strokeStyle = shade(d.hair, -0.35); c.lineWidth = 0.9;
        c.beginPath(); c.arc(x, y, 1.2, 0, Math.PI * 1.5); c.stroke();
      }
    },
  },
  bucciarati: {
    back: (c, d) => celBlob(c, [[-12, -8], [-14.5, 6], [-9, 9], [-8, 0]], d.hair),
    front: (c, d) => {
      celBlob(c, [[-13, 7], [-14, -8], [-7, -17.5], [5, -17.5], [12, -12], [14.5, -4], [13.5, 5], [11, -3], [6, -8], [-3, -7], [-8, 2]], d.hair);
      c.fillStyle = '#e8c04a'; c.strokeStyle = INK; c.lineWidth = 0.8;
      for (const [x, y] of [[6, -9], [9, -6.5]]) { c.fillRect(x, y, 3.4, 1.4); c.strokeRect(x, y, 3.4, 1.4); }
    },
  },
  mista: {
    back: (c, d) => celBlob(c, [[-11, -2], [-12.5, 4], [-8, 2]], d.hair, false),
    front: (c, d) => {
      celBlob(c, [[-13, -2], [-13, -11], [-7, -19], [4, -21], [11, -17], [14.5, -10], [14, -4]], d.hat);
      c.strokeStyle = '#3a5ab0'; c.lineWidth = 1.4;
      c.beginPath();
      for (const [x, y] of [[-8, -14], [-2, -17], [5, -16], [9, -11], [-4, -9], [3, -8], [-10, -6]]) { c.moveTo(x, y); c.lineTo(x + 2.5, y); }
      c.stroke();
    },
  },
  narancia: {
    front: (c, d) => {
      celBlob(c, [[-12, -2], [-12, -12], [-4, -16], [6, -15], [12, -10], [12.5, -6]], d.hair);
      flatBlob(c, [[-13, -12.5], [12, -13.5], [13, -8.5], [-12, -7.5]], d.hat, false);
      flatBlob(c, [[-12, -11], [-20, -15], [-19.5, -7]], shade(d.hat, -0.15), false);
    },
  },
  fugo: {
    front: (c, d) => celBlob(c, [[-12, -3], [-12, -13], [-3, -18], [7, -17], [13, -11], [14.5, -6], [9, -7], [4, -10], [0, -6], [-5, -8]], d.hair),
  },
  diavolo: {
    back: (c, d) => {
      celBlob(c, [[-11, -12], [-18, -2], [-21, 14], [-17, 28], [-10, 22], [-8, 8]], d.hair);
      c.fillStyle = '#5fae4a';
      for (const [x, y] of [[-15, 2], [-17, 12], [-13, 20], [-12, 8]]) { c.beginPath(); c.arc(x, y, 1.8, 0, Math.PI * 2); c.fill(); }
    },
    front: (c, d) => {
      celBlob(c, [[-12, -3], [-12, -14], [-3, -18], [7, -17], [13, -12], [13.5, -7], [6, -9]], d.hair);
      c.fillStyle = '#5fae4a';
      for (const [x, y] of [[-6, -13], [2, -15], [8, -12]]) { c.beginPath(); c.arc(x, y, 1.6, 0, Math.PI * 2); c.fill(); }
    },
  },
  trish: {
    back: (c, d) => celBlob(c, [[-12, -8], [-14.5, 6], [-8, 8]], d.hair),
    front: (c, d) => celBlob(c, [[-13, 6], [-14, -9], [-6, -17], [6, -17], [13, -11], [13.5, -2], [9, -8], [2, -9], [-6, -6], [-9, 4]], d.hair),
  },
  jolyne: {
    back: (c, d) => {
      celBlob(c, circlePts(-7, -17, 5.2), d.hair);
      celBlob(c, circlePts(3, -19, 5.2), d.hair);
      for (let i = 0; i < 5; i++) {
        c.beginPath(); c.ellipse(-10.5 - i * 0.5, -1 + i * 4, 2.4, 2.1, 0, 0, Math.PI * 2);
        c.fillStyle = d.hair; c.fill(); inkStroke(c, 1);
      }
    },
    front: (c, d) => celBlob(c, [[-12, -3], [-12, -12], [-4, -16], [6, -16], [12, -11], [13.5, -5], [7, -8]], d.hair),
  },
  pucci: {
    front: (c, d) => {
      celBlob(c, [[-12, -4], [-12, -12], [-4, -16], [6, -15], [11, -11], [12.5, -7], [4, -9]], d.hair);
      c.strokeStyle = shade(d.hair, -0.4); c.lineWidth = 1;
      c.beginPath(); c.moveTo(-10, -6); c.lineTo(-4, -10); c.moveTo(-8, -3); c.lineTo(-2, -7); c.stroke();
    },
  },
  johnny: {
    back: (c, d) => celBlob(c, [[-11, -3], [-15.5, 6], [-9, 4]], d.hair, false),
    front: (c, d) => {
      celBlob(c, [[-13, -3], [-12, -13], [-5, -19], [5, -19], [12, -14], [14.5, -7], [13, -4]], d.hat);
      c.fillStyle = '#e8c04a'; starPath(c, 2, -12, 3.4); c.fill(); inkStroke(c, 0.9);
      c.strokeStyle = '#e8c04a'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(-6, -10, 2.6, Math.PI * 0.15, Math.PI * 0.85, true); c.stroke();
    },
  },
  valentine: {
    back: (c, d) => { for (const [x, y] of [[-11, -8], [-14, -1], [-15, 6], [-13, 13], [-10, 18]]) celBlob(c, circlePts(x, y, 3.6, 7), d.hair); },
    front: (c, d) => celBlob(c, [[-12, -3], [-12, -13], [-4, -19], [6, -18], [12, -13], [13.5, -8], [7, -10], [1, -8]], d.hair),
  },
  sailor: {
    front: (c, d) => {
      celBlob(c, [[-12.5, -2], [-12, -9], [12, -9], [12.5, -5]], d.hair, false);
      celBlob(c, [[-12, -8], [-11, -15], [-3, -18.5], [7, -18.5], [12, -14], [13, -8]], d.hat);
      c.fillStyle = '#2a3a7a'; c.fillRect(-12, -10.2, 25, 2.2);
    },
  },
  // ---- civilians
  short: { front: (c, d) => celBlob(c, [[-12, -3], [-12, -12], [-4, -17], [6, -16], [12, -11], [12.5, -7], [4, -9], [-4, -7]], d.hair) },
  messy: { front: (c, d) => celBlob(c, [[-12, -2], [-13, -10], [-10, -16], [-4, -18], [0, -16], [5, -19], [8, -14], [13, -12], [12, -7], [5, -9], [-3, -6]], d.hair, false) },
  long: {
    back: (c, d) => celBlob(c, [[-11, -10], [-15, 4], [-14, 20], [-7, 17], [-6, 4]], d.hair),
    front: (c, d) => celBlob(c, [[-12, -3], [-12, -12], [-4, -17], [6, -16], [12, -11], [13, -4], [8, -8], [0, -8]], d.hair),
  },
  ponytail: {
    back: (c, d) => celBlob(c, [[-11, -11], [-20, -7], [-23, 6], [-17, 4], [-12, -3]], d.hair),
    front: (c, d) => celBlob(c, [[-12, -3], [-12, -12], [-4, -17], [6, -16], [12, -11], [12.5, -7], [4, -9]], d.hair),
  },
  buzz: { front: (c, d) => celBlob(c, [[-12, -3], [-12, -11], [-5, -15.5], [5, -15], [11, -11], [12, -8], [-4, -8]], d.hair) },
};

// ---------------------------------------------------------------- head
const HEAD_M = [[-11, -3], [-10, -12], [-2, -16], [8, -14], [12.5, -6], [13, 1], [12.5, 6], [10.5, 10.5], [5, 13], [-2, 11], [-9, 6]];
const HEAD_F = [[-11, -3], [-10, -12], [-2, -16], [8, -14], [12, -6], [12.5, 1], [12, 6], [9.5, 10], [5, 12], [-2, 10], [-9, 6]];

function expressionOf(r) {
  if (r.dead) return 'dead';
  if (r.stun > 0 || r.has('book') || r.has('heavy')) return 'hurt';
  const st = r.stand;
  if (st && st.state === 'barrage') return 'shout';
  if (st && st.state !== 'idle') return 'angry';
  if (r.poseTimer > 0 || r.controlled) return 'angry';
  return 'normal';
}

function drawFace(c, d, expr, blind) {
  // Eye.
  if (expr === 'dead') {
    c.beginPath(); c.moveTo(4.5, -3.8); c.quadraticCurveTo(8, -6, 11.2, -3.8); c.quadraticCurveTo(8.5, 0.6, 4.8, -1.2); c.closePath();
    c.fillStyle = '#fff'; c.fill(); inkStroke(c, 1.2);
  } else if (expr === 'hurt') {
    c.strokeStyle = INK; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(4.5, -4.5); c.lineTo(9.5, -2.5); c.lineTo(5, -0.5); c.stroke();
  } else {
    c.save();
    c.beginPath(); c.moveTo(4.5, -3.8); c.quadraticCurveTo(8, -6.2, 11.2, -3.8); c.quadraticCurveTo(8.5, 0.8, 4.8, -1.2); c.closePath();
    c.fillStyle = '#fff'; c.fill();
    c.clip();
    c.fillStyle = d.eye; c.beginPath(); c.ellipse(8.6, -2.6, 2, 2.7, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#0d0a10'; c.beginPath(); c.ellipse(8.9, -2.5, 0.95, 1.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(8.1, -3.6, 0.7, 0, Math.PI * 2); c.fill();
    c.restore();
    c.strokeStyle = INK; c.lineWidth = 2;
    c.beginPath(); c.moveTo(3.8, -4.2); c.quadraticCurveTo(8, -7, 11.9, -4); c.stroke();
    if (d.fem) { c.lineWidth = 1.2; c.beginPath(); c.moveTo(11.6, -4.2); c.lineTo(13.4, -5.6); c.moveTo(11, -5); c.lineTo(12.4, -6.8); c.stroke(); }
    c.lineWidth = 0.8; c.beginPath(); c.moveTo(5.2, -0.9); c.quadraticCurveTo(8.5, 0.6, 10.8, -1.6); c.stroke();
  }
  // Brow (JoJo: heavy, angular).
  c.strokeStyle = shade(d.hair, -0.35); c.lineCap = 'round';
  c.lineWidth = d.fem ? 1.4 : 2.3;
  c.beginPath();
  if (expr === 'angry' || expr === 'shout') { c.moveTo(3.5, -9.4); c.lineTo(12.2, -6.2); }
  else if (expr === 'hurt') { c.moveTo(3.8, -7.4); c.lineTo(11.6, -9.2); }
  else { c.moveTo(3.8, -8.4); c.quadraticCurveTo(8, -10.4, 12.2, -8.4); }
  c.stroke();
  // Under-eye hatching.
  if (!d.fem) {
    c.strokeStyle = shade(d.skin, -0.35); c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(5.5, 1.4); c.lineTo(8.5, 0.9); c.moveTo(6.2, 2.6); c.lineTo(8.6, 2.2); c.stroke();
  }
  // Nose.
  c.strokeStyle = INK; c.lineWidth = 1.3;
  c.beginPath(); c.moveTo(12.6, -1.5); c.lineTo(14.6, 2.6); c.lineTo(12.6, 3.6); c.stroke();
  // Mouth.
  if (expr === 'shout' || expr === 'dead') {
    flatBlob(c, [[9.6, 5.8], [13.2, 5.2], [12.8, 9.8], [10.2, 9.4]], '#5a1320', false, 1.2);
    c.fillStyle = '#fff'; c.fillRect(10.2, 5.8, 2.8, 1);
  } else {
    c.strokeStyle = d.fem ? '#b0404a' : INK; c.lineWidth = d.fem ? 1.6 : 1.3;
    c.beginPath(); c.moveTo(10.2, 7.2); c.lineTo(12.8, 6.6); c.stroke();
    if (!d.fem) { c.lineWidth = 0.8; c.strokeStyle = shade(d.skin, -0.3); c.beginPath(); c.moveTo(10.8, 9); c.lineTo(12.2, 8.8); c.stroke(); }
  }
  if (blind) {
    c.fillStyle = 'rgba(190,230,255,0.55)'; c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 1;
    c.beginPath(); c.arc(8, -3, 5.5, 0, Math.PI * 2); c.fill(); c.stroke();
  }
}

function drawAnimeHead(ctx, r) {
  const d = r.design, P = r.p, f = r.facing;
  const H = P.head;
  const attached = !r.isBroken('head');
  const ang = attached ? Math.atan2(H.y - P.neck.y, H.x - P.neck.x) + Math.PI / 2 : (r.headSpin = (r.headSpin || 0) + H.vx * DT / 13);
  const expr = expressionOf(r);
  const spr = sprite('head:' + d.key + ':' + expr, -36, -48, 72, 84, (g) => renderHead(g, d, expr));
  ctx.save();
  ctx.translate(H.x, H.y);
  ctx.rotate(ang);
  ctx.scale(f, 1);
  blit(ctx, spr);
  if (r.has('blind')) {
    ctx.fillStyle = 'rgba(190,230,255,0.55)'; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(8, -3, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  if (r.has('book')) drawBookFace(ctx, r.world.time);
  ctx.restore();
}

function renderHead(ctx, d, expr) {
  const hs = HAIR[d.style] || HAIR.short;
  if (hs.back) hs.back(ctx, d, 0);
  celBlob(ctx, d.fem ? HEAD_F : HEAD_M, d.skin, true, 1.8);
  // Ear.
  ctx.beginPath(); ctx.ellipse(-1.5, 1, 2.4, 3.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = shade(d.skin, -0.08); ctx.fill(); inkStroke(ctx, 1.1);
  if (d.acc && d.acc.includes('earring')) dotInk(ctx, -1.5, 5.5, 1.3, '#e8c04a', 0.8);
  if (d.acc && d.acc.includes('cherry')) { dotInk(ctx, -2.5, 6.5, 1.5, '#d8283a', 0.8); dotInk(ctx, -0.5, 7.5, 1.5, '#d8283a', 0.8); }
  if (d.acc && d.acc.includes('penEarring')) { ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-1.5, 4); ctx.lineTo(-2, 10); ctx.stroke(); }
  drawFace(ctx, d, expr, false);
  hs.front(ctx, d, 0);
}

function drawBookFace(c, t) {
  // Heaven's Door: the face peels open into pages.
  c.save();
  for (let i = 0; i < 4; i++) {
    const a = -0.5 + i * 0.25 + Math.sin(t * 3 + i) * 0.05;
    c.save(); c.translate(6, 0); c.rotate(a);
    flatBlob(c, [[0, -8], [10, -9], [10, 7], [0, 8]], i % 2 ? '#fbf6e8' : '#efe6d0', false, 0.9);
    c.strokeStyle = 'rgba(40,30,20,0.5)'; c.lineWidth = 0.6;
    c.beginPath(); for (let y = -6; y <= 5; y += 2.2) { c.moveTo(1.5, y); c.lineTo(8.5, y); } c.stroke();
    c.restore();
  }
  c.restore();
}

// ---------------------------------------------------------------- body
function drawCharacter(ctx, r) {
  const d = r.design, P = r.p, f = r.facing;
  const br = (g) => r.isBroken(g), er = (g) => r.erased.has(g);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const sleeve = d.coat || d.top;
  const sleeveB = shade(sleeve, -0.14), pantsB = shade(d.bottom, -0.14);

  // Spine frame.
  const n = P.neck, c = P.chest, pl = P.pelvis;
  const fr = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1; return { fx: (dy * f) / L, fy: (-dx * f) / L, dx: dx / L, dy: dy / L }; };
  const U = fr(n, c), L = fr(c, pl);
  const M = { fx: (U.fx + L.fx) / 2, fy: (U.fy + L.fy) / 2 };
  const shoulder = { x: n.x + U.dx * 5, y: n.y + U.dy * 5 };

  if (d.coatLong) drawCoatTail(ctx, r, L, 'back');

  // Back leg.
  if (!er('bLeg')) {
    if (!br('bLeg')) limb(ctx, pl, P.bKnee, 6.4, 5.4, pantsB, f);
    else limb(ctx, P.bKnee, { x: P.bKnee.x - (P.bFoot.x - P.bKnee.x) * 0.5, y: P.bKnee.y - (P.bFoot.y - P.bKnee.y) * 0.5 }, 5.4, 6, pantsB, f);
    limb(ctx, P.bKnee, P.bFoot, 5.4, 4.4, pantsB, f);
    drawShoe(ctx, P.bFoot, f, shade(d.shoes, -0.12));
    if (d.acc.includes('heartKnees')) drawKneeHeart(ctx, P.bKnee, d);
  }
  // Back arm.
  if (!er('bArm')) drawArm(ctx, r, shoulder, P.bElbow, P.bHand, sleeveB, br('bArm'), true);

  // Torso: the spine is rigid, so it's a cached sprite rotated along pelvis → neck.
  const spine = Math.hypot(n.x - pl.x, n.y - pl.y) || 54;
  const tspr = sprite('torso:' + d.key, -24, -64, 48, 76, (g) => renderTorsoCanonical(g, d));
  ctx.save();
  ctx.translate(pl.x, pl.y);
  ctx.rotate(Math.atan2(n.y - pl.y, n.x - pl.x) + Math.PI / 2);
  ctx.scale(f, spine / 54);
  blit(ctx, tspr);
  ctx.restore();

  // Front leg.
  if (!er('fLeg')) {
    if (!br('fLeg')) limb(ctx, pl, P.fKnee, 6.6, 5.6, d.bottom, f);
    else limb(ctx, P.fKnee, { x: P.fKnee.x - (P.fFoot.x - P.fKnee.x) * 0.5, y: P.fKnee.y - (P.fFoot.y - P.fKnee.y) * 0.5 }, 5.6, 6.2, d.bottom, f);
    limb(ctx, P.fKnee, P.fFoot, 5.6, 4.6, d.bottom, f);
    drawShoe(ctx, P.fFoot, f, d.shoes);
    if (d.acc.includes('heartKnees')) drawKneeHeart(ctx, P.fKnee, d);
  }
  if (d.coatLong) drawCoatTail(ctx, r, L, 'front');

  // Neck + head.
  if (!er('head')) {
    if (!br('head')) {
      const hb = { x: lerp(n.x, P.head.x, 0.55), y: lerp(n.y, P.head.y, 0.55) };
      limb(ctx, n, hb, 3.8, 3.6, shade(d.skin, -0.12), f);
      if (d.acc.includes('collar')) drawCollar(ctx, n, U, d);
      if (d.acc.includes('sailorCollar')) drawSailorCollar(ctx, n, U, d);
    }
    drawAnimeHead(ctx, r);
  } else {
    dotInk(ctx, n.x, n.y, 4, '#7a1422', 1);
  }
  // Front arm.
  if (!er('fArm')) drawArm(ctx, r, shoulder, P.fElbow, P.fHand, sleeve, br('fArm'), false);
}

function drawArm(ctx, r, sh, el, hand, color, broken, back) {
  const d = r.design, f = r.facing;
  const fore = d.sleeves === 'short' ? (back ? shade(d.skin, -0.14) : d.skin) : color;
  if (!broken) limb(ctx, sh, el, 5.2, 4.4, color, f);
  limb(ctx, el, hand, 4.4, 3.8, fore, f);
  const skin = back ? shade(d.skin, -0.14) : d.skin;
  const fist = r.stand && r.stand.state !== 'idle';
  if (fist) {
    ctx.save(); ctx.translate(hand.x, hand.y); ctx.rotate(Math.atan2(hand.y - el.y, hand.x - el.x));
    flatBlob(ctx, [[-2.5, -4], [3.5, -4], [5, 0], [3.5, 4], [-2.5, 4]], skin, true, 1.3);
    ctx.restore();
  } else dotInk(ctx, hand.x, hand.y, 4.1, skin, 1.4);
  if (!back && d.acc.includes('revolver')) {
    ctx.save(); ctx.translate(hand.x, hand.y); ctx.rotate(Math.atan2(hand.y - el.y, hand.x - el.x));
    flatBlob(ctx, [[0, -2.5], [12, -2.5], [12, 0.5], [3, 0.5], [2, 5], [-1.5, 5]], '#3a3a44', false, 1);
    ctx.restore();
  }
}

function drawShoe(ctx, p, f, color) {
  const spr = sprite('shoe:' + color, -8, -7, 20, 13, (g) => {
    flatBlob(g, [[-5, -3.5], [3, -4.5], [10, -1], [10, 3.5], [-5.5, 3.5]], color, true, 1.4);
    g.strokeStyle = shade(color, 0.3); g.lineWidth = 1;
    g.beginPath(); g.moveTo(-4.5, 2.4); g.lineTo(9, 2.4); g.stroke();
  });
  ctx.save();
  ctx.translate(p.x, p.y + 1.5);
  ctx.scale(f, 1);
  blit(ctx, spr);
  ctx.restore();
}

function drawKneeHeart(ctx, k, d) {
  ctx.fillStyle = d.hat || '#3e9a4a';
  heartPath(ctx, k.x, k.y, 3.2); ctx.fill(); inkStroke(ctx, 1);
}

function drawCollar(ctx, n, U, d) {
  const col = shade(d.coat || d.top, -0.1);
  flatBlob(ctx, [
    [n.x - U.fx * 5 - U.dx * 1, n.y - U.fy * 5 - U.dy * 1],
    [n.x - U.fx * 5 - U.dx * 8, n.y - U.fy * 5 - U.dy * 8],
    [n.x + U.fx * 5 - U.dx * 4, n.y + U.fy * 5 - U.dy * 4],
    [n.x + U.fx * 5 + U.dx * 2, n.y + U.fy * 5 + U.dy * 2],
  ], col, false, 1.3);
}

function drawSailorCollar(ctx, n, U, d) {
  flatBlob(ctx, [
    [n.x - U.fx * 6, n.y - U.fy * 6],
    [n.x - U.fx * 13 + U.dx * 9, n.y - U.fy * 13 + U.dy * 9],
    [n.x - U.fx * 2 + U.dx * 12, n.y - U.fy * 2 + U.dy * 12],
    [n.x + U.fx * 6 + U.dx * 3, n.y + U.fy * 6 + U.dy * 3],
  ], d.shirt, false, 1.2);
}

/** The torso drawn once for an upright, right-facing body (pelvis at the origin). */
function renderTorsoCanonical(ctx, d) {
  const fake = { design: d, isBroken: () => false };
  const n = { x: 0, y: -54 }, c = { x: 0, y: -36 }, pl = { x: 0, y: 0 };
  const U = { fx: 1, fy: 0, dx: 0, dy: 1 }, L = { fx: 1, fy: 0, dx: 0, dy: 1 }, M = { fx: 1, fy: 0 };
  drawTorso(ctx, fake, n, c, pl, U, L, M);
}

function drawTorso(ctx, r, n, c, pl, U, L, M) {
  const d = r.design;
  const P = (b, fk, dk, F = M, D = L) => [b.x + F.fx * fk + D.dx * dk, b.y + F.fy * fk + D.dy * dk];
  const w = d.small ? 0.88 : 1;
  const pts = [
    P(n, 7 * w, -1, U, U), P(c, 12 * w, -3), P(pl, 8.5 * w, -8, L, L), P(pl, 9 * w, 3, L, L),
    P(pl, 0, 8, L, L), P(pl, -10 * w, 2, L, L), P(pl, -8.5 * w, -9, L, L), P(c, -10 * w, 0), P(n, -6.5 * w, 1, U, U), P(n, 0, -2, U, U),
  ];
  const top = d.coat || d.top;
  pathPts(ctx, pts, true);
  ctx.fillStyle = top; ctx.fill();
  ctx.save();
  ctx.clip();
  // Pants below the waist.
  const wF = P(pl, 14, -6, L, L), wB = P(pl, -14, -6, L, L);
  ctx.fillStyle = d.bottom;
  ctx.beginPath(); ctx.moveTo(wF[0], wF[1]); ctx.lineTo(wB[0], wB[1]);
  ctx.lineTo(wB[0] + L.dx * 30, wB[1] + L.dy * 30); ctx.lineTo(wF[0] + L.dx * 30, wF[1] + L.dy * 30); ctx.closePath(); ctx.fill();
  // Open coat: shirt strip down the front.
  if (d.coat && d.shirt) {
    ctx.strokeStyle = d.shirt; ctx.lineWidth = 5;
    const a = P(n, 6, 3, U, U), b = P(c, 10, 0), e = P(pl, 7, -7, L, L);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(b[0], b[1], e[0], e[1]); ctx.stroke();
  } else if (d.shirt && d.acc.includes('skullTie')) {
    ctx.strokeStyle = d.shirt; ctx.lineWidth = 4;
    const a = P(n, 6, 2, U, U), b = P(c, 10, -4);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  drawTorsoPattern(ctx, r, n, c, pl, U, L, M, P);
  // Cel shading: the back half is in shadow.
  ctx.fillStyle = 'rgba(20,6,30,0.24)';
  ctx.beginPath();
  const back = [P(n, 0, -2, U, U), P(n, -7, 1, U, U), P(c, -11, 0), P(pl, -9, -9, L, L), P(pl, -11, 2, L, L), P(pl, 0, 9, L, L), P(pl, -1, 0, L, L), P(c, -1, 0), P(n, -1, 0, U, U)];
  ctx.moveTo(back[0][0], back[0][1]); for (const q of back) ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fill();
  // Rim light on the front edge.
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2;
  const r1 = P(n, 6, 2, U, U), r2 = P(c, 10.5, -3), r3 = P(pl, 7.5, -8, L, L);
  ctx.beginPath(); ctx.moveTo(r1[0], r1[1]); ctx.quadraticCurveTo(r2[0], r2[1], r3[0], r3[1]); ctx.stroke();
  ctx.restore();
  pathPts(ctx, pts, true);
  inkStroke(ctx, 1.9);
  // Belt.
  if (d.acc.includes('belt') || !d.coat) {
    const a = P(pl, 9, -7, L, L), b = P(pl, -9, -7, L, L);
    ctx.strokeStyle = INK; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.strokeStyle = '#3a2618'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    const bk = P(pl, 8, -7, L, L);
    ctx.fillStyle = '#e8c04a'; ctx.fillRect(bk[0] - 1.5, bk[1] - 1.5, 3, 3);
  }
  drawTorsoAccessories(ctx, r, n, c, pl, U, L, M, P);
}

function drawTorsoPattern(ctx, r, n, c, pl, U, L, M, P) {
  const d = r.design;
  if (d.acc.includes('spots')) {
    ctx.fillStyle = '#1a1a22';
    for (const [fk, dk, base] of [[6, -4, c], [-4, 2, c], [2, -12, pl], [-6, -14, pl], [4, 6, c]]) {
      const q = P(base, fk, dk); ctx.beginPath(); ctx.arc(q[0], q[1], 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (d.acc.includes('mesh')) {
    ctx.strokeStyle = 'rgba(30,10,30,0.5)'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) {
      const a = P(n, i * 3.5, 2, U, U), b = P(pl, i * 3.5 + 6, -8, L, L), e = P(pl, i * 3.5 - 6, -8, L, L);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.moveTo(a[0], a[1]); ctx.lineTo(e[0], e[1]);
    }
    ctx.stroke();
  }
  if (d.acc.includes('web')) {
    ctx.strokeStyle = 'rgba(20,40,20,0.55)'; ctx.lineWidth = 0.8;
    const o = P(c, 2, -2);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.moveTo(o[0], o[1]); ctx.lineTo(o[0] + Math.cos(a) * 12, o[1] + Math.sin(a) * 12); }
    for (const rr of [4, 8]) { ctx.moveTo(o[0] + rr, o[1]); ctx.arc(o[0], o[1], rr, 0, Math.PI * 2); }
    ctx.stroke();
  }
  if (d.acc.includes('leopard')) {
    ctx.fillStyle = 'rgba(60,30,10,0.6)';
    for (const [fk, dk] of [[4, -4], [-3, -10], [6, 2], [-6, 0]]) { const q = P(pl, fk, dk + 10, L, L); ctx.beginPath(); ctx.arc(q[0], q[1], 1.5, 0, Math.PI * 2); ctx.fill(); }
  }
  if (d.acc.includes('holes')) {
    ctx.fillStyle = shade(d.skin, -0.05);
    for (const [fk, dk] of [[5, -6], [-2, 4], [7, 6]]) {
      const q = P(c, fk, dk); ctx.beginPath(); ctx.ellipse(q[0], q[1], 2, 1.4, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawTorsoAccessories(ctx, r, n, c, pl, U, L, M, P) {
  const d = r.design;
  if (d.acc.includes('chain')) {
    ctx.strokeStyle = '#e8c04a'; ctx.lineWidth = 1.6; ctx.setLineDash([2, 1.4]);
    const a = P(n, 5, 3, U, U), b = P(c, 9, -2), e = P(c, 3, 4);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(b[0], b[1], e[0], e[1]); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (d.acc.includes('pins')) {
    const q = P(n, 5, 5, U, U);
    ctx.fillStyle = '#e8c04a'; heartPath(ctx, q[0], q[1], 2.2); ctx.fill(); inkStroke(ctx, 0.8);
    const q2 = P(n, 1, 7, U, U); dotInk(ctx, q2[0], q2[1], 1.8, '#e8c04a', 0.8);
  }
  if (d.acc.includes('ladybug')) {
    const q = P(c, 9, -5);
    dotInk(ctx, q[0], q[1], 2.8, '#d8283a', 1);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(q[0] - 1, q[1] - 0.5, 0.7, 0, 7); ctx.arc(q[0] + 1, q[1] + 0.8, 0.7, 0, 7); ctx.fill();
  }
  if (d.acc.includes('heartCut')) {
    const q = P(c, 8, -1);
    ctx.fillStyle = d.skin; heartPath(ctx, q[0], q[1], 3.2); ctx.fill(); inkStroke(ctx, 0.9);
  }
  if (d.acc.includes('zipper')) {
    const a = P(n, 6, 3, U, U), b = P(pl, 7.5, -8, L, L);
    ctx.strokeStyle = '#a8a8b8'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.7; ctx.setLineDash([1, 1.2]);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.setLineDash([]);
    dotInk(ctx, a[0], a[1], 1.6, '#e8c04a', 0.8);
  }
  if (d.acc.includes('skullTie')) {
    const a = P(n, 6.5, 2, U, U), b = P(c, 10, 6);
    ctx.strokeStyle = '#4a2a6a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    dotInk(ctx, lerp(a[0], b[0], 0.6), lerp(a[1], b[1], 0.6), 1.5, '#f4f0e8', 0.7);
  }
  if (d.acc.includes('cross')) {
    const q = P(c, 9, -2);
    ctx.fillStyle = '#e8c04a';
    ctx.fillRect(q[0] - 0.9, q[1] - 4, 1.8, 8); ctx.fillRect(q[0] - 2.8, q[1] - 2, 5.6, 1.8);
  }
  if (d.acc.includes('dollar')) {
    const q = P(n, 4, 6, U, U);
    ctx.fillStyle = '#e8c04a'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('$', q[0], q[1] + 2);
  }
  if (d.acc.includes('flagPin')) {
    const q = P(c, 8, -5);
    ctx.fillStyle = '#d8283a'; ctx.fillRect(q[0] - 2, q[1] - 1.5, 4, 3);
    ctx.fillStyle = '#2a3a8a'; ctx.fillRect(q[0] - 2, q[1] - 1.5, 1.6, 1.4);
  }
  if (d.acc.includes('beads')) {
    const q = P(n, 3, 5, U, U);
    ctx.strokeStyle = '#e8c04a'; ctx.lineWidth = 1.5; ctx.setLineDash([1.5, 1.5]);
    ctx.beginPath(); ctx.arc(q[0], q[1], 4.5, 0, Math.PI); ctx.stroke(); ctx.setLineDash([]);
  }
  if (d.acc.includes('starMark') && !r.isBroken('head')) {
    const q = P(n, -5, 3, U, U);
    ctx.fillStyle = '#6a3a2a'; starPath(ctx, q[0], q[1], 2.2); ctx.fill();
  }
}

function drawCoatTail(ctx, r, L, side) {
  const d = r.design, pl = r.p.pelvis, t = r.world.time;
  const len = d.coatLong;
  const flap = clamp(-r.p.pelvis.vx * 0.014, -12, 12) + Math.sin(t * 4 + r.id) * 1.4;
  const P = (fk, dk, fx = 0) => [pl.x + L.fx * fk + L.dx * dk + fx, pl.y + L.fy * fk + L.dy * dk];
  const col = side === 'back' ? shade(d.coat, -0.2) : d.coat;
  const pts = side === 'back'
    ? [P(-9, -9), P(-10, 4), P(-13, len, flap), P(1, len - 2, flap * 0.7), P(2, 2)]
    : [P(7, -8), P(10, 4), P(11, len - 4, flap * 0.6), P(5, len - 6, flap * 0.5), P(4, 0)];
  pathPts(ctx, pts, false);
  ctx.fillStyle = col; ctx.fill(); inkStroke(ctx, 1.6);
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1;
  const a = pts[1], b = pts[2];
  ctx.beginPath(); ctx.moveTo(lerp(a[0], pts[4][0], 0.5), lerp(a[1], pts[4][1], 0.5)); ctx.lineTo(lerp(b[0], pts[3][0], 0.5), lerp(b[1], pts[3][1], 0.5)); ctx.stroke();
}
