'use strict';
/* =====================================================================
   Jewish community art: Magen David, kippot, tallit, tzitzit, beards,
   peyot, tichel, hats, skirts and jewelry. Loaded after art.js, which
   calls into the hooks below (drawBeard, drawPeyot, drawCover, ...).
   Every piece is drawn in the same cel-shaded anime style as the rest of
   the cast. Faces are never changed: variety comes from skin tone, hair,
   eyes, clothing and accessories, not from exaggerated features.
   ===================================================================== */

// ---------------------------------------------------------------- Magen David
/** Star of David: two interlocked triangles traced as one 12-point outline. */
function hexagram(ctx, x, y, r) {
  const ri = r / Math.sqrt(3);
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 6, rr = i % 2 ? ri : r;
    ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
function magen(ctx, x, y, r, fill, lw = 0.9) {
  hexagram(ctx, x, y, r);
  ctx.fillStyle = fill; ctx.fill();
  inkStroke(ctx, lw);
}

// ---------------------------------------------------------------- hair
/** Curly / coily hair: a clump of discs (ink rim first, so the outline merges into one silhouette). */
function hairClumps(c, discs, r, col, base, hairline) {
  c.fillStyle = INK;
  for (const [x, y] of discs) { c.beginPath(); c.arc(x, y, r + 1.15, 0, 7); c.fill(); }
  pathPts(c, base, true); c.fillStyle = col; c.fill();
  c.fillStyle = col;
  for (const [x, y] of discs) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
  c.strokeStyle = shade(col, 0.32); c.lineWidth = 0.8; c.lineCap = 'round';
  for (const [x, y] of discs) { c.beginPath(); c.arc(x + 0.5, y - 0.4, r * 0.55, Math.PI * 1.05, Math.PI * 1.7); c.stroke(); }
  if (hairline) {
    c.strokeStyle = INK; c.lineWidth = 1.2; c.beginPath();
    hairline.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
  }
}

Object.assign(HAIR, {
  curly: {
    back: (c, d) => hairClumps(c, [[-12, -1], [-13.5, -7], [-11, -12]], 3.4, d.hair, [[-10, -2], [-11, -10], [-6, -12]]),
    front: (c, d) => hairClumps(c, [[-11, -5], [-11.5, -11], [-7.5, -15.5], [-1.5, -18], [4.5, -17.5], [9.5, -14.5], [12, -10.5]], 3.7, d.hair,
      [[-10, -3], [-10.5, -12], [-3, -15.5], [6, -15], [11, -10.5], [10.5, -8.4], [4, -9.4], [-2, -7.2]],
      [[11.2, -9], [8, -9.6], [4, -9.2]]),
  },
  afro: {
    back: (c, d) => hairClumps(c, [[-13, 1], [-15.5, -6], [-13, -13], [-6, -19]], 5, d.hair, [[-10, -2], [-12, -12], [-4, -16]]),
    front: (c, d) => hairClumps(c, [[-13, -3], [-12.5, -10], [-8.5, -16.5], [-2, -20], [5, -19.8], [10.5, -16], [13, -11]], 5, d.hair,
      [[-10, -3], [-11, -13], [-3, -17], [6, -17], [12, -11], [10.5, -8.4], [4, -9.4], [-2, -7.2]],
      [[11.8, -9.4], [8, -10], [4, -9.4]]),
  },
  bob: {
    back: (c, d) => celBlob(c, [[-11, -11], [-16.5, -2], [-16, 9], [-9, 10.5], [-6, 2]], d.hair),
    front: (c, d) => celBlob(c, [[-12, -3], [-12.5, -12], [-4, -17], [6, -16.5], [12, -11], [12.8, -5], [8, -8], [0, -9.5], [-6, -7]], d.hair),
  },
  wavy: {
    back: (c, d) => celBlob(c, [[-11, -11], [-17, -1], [-16, 12], [-19, 22], [-12, 26], [-8, 16], [-6, 5]], d.hair),
    front: (c, d) => celBlob(c, [[-12.5, -3], [-12.5, -12.5], [-4, -17.5], [6, -17], [12.5, -11], [13.8, -3], [9, -8.5], [2, -10], [-5, -7]], d.hair),
  },
});

// ---------------------------------------------------------------- face: beards and sidelocks
function drawBeard(c, d) {
  const col = d.beardCol || d.hair;
  if (d.beard === 'full') {
    celBlob(c, [[1.8, -0.5], [4.6, 3.4], [7.6, 6.4], [9.6, 8.8], [13.4, 9], [14.4, 12.5], [12.4, 18], [7, 21], [0.5, 19.5], [-6, 13.5], [-9.8, 8], [-5, 5.8], [-1, 5.2], [1.2, 4.2]], col, true, 1.4);
    c.strokeStyle = shade(col, 0.3); c.lineWidth = 0.8; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-3, 9); c.quadraticCurveTo(1, 15, 5.5, 18);
    c.moveTo(3, 8); c.quadraticCurveTo(7, 13, 10.5, 15.5);
    c.stroke();
    celBlob(c, [[8.4, 4.4], [13.2, 4], [14.8, 5.6], [11.4, 6.3], [8.8, 5.9]], col, true, 1.1);
  } else {
    celBlob(c, [[1.8, -0.5], [4.8, 3.2], [8, 6.4], [9.6, 8.8], [13.4, 9], [14, 11.8], [11.8, 15.2], [5.8, 16.4], [-1, 13.8], [-7.5, 9.6], [-9.2, 7.4], [-5, 6.4], [-1, 5.6], [1.2, 4.4]], col, true, 1.2);
    celBlob(c, [[8.6, 4.6], [13.2, 4.2], [14.4, 5.5], [11.4, 6.1], [9, 5.8]], col, true, 1);
  }
}

/** Peyot: sidelocks that hang in front of the ear and curl at the end. */
function drawPeyot(c, d) {
  const long = d.peyot === 'long', len = long ? 17 : 11;
  c.lineCap = 'round';
  const lock = (x0, dy) => {
    for (const [w, col] of [[3.8, INK], [2.3, d.beardCol || d.hair]]) {
      c.lineWidth = w; c.strokeStyle = col;
      c.beginPath();
      c.moveTo(x0, -6 + dy);
      c.bezierCurveTo(x0 - 2.6, -1 + dy, x0 - 3, len * 0.45 + dy, x0 - 1.6, len * 0.7 + dy);
      c.arc(x0 + 0.2, len * 0.7 + dy + 0.3, 1.8, Math.PI, -Math.PI * 0.4, true);
      c.stroke();
    }
  };
  lock(1.4, 0);
  if (long) lock(-0.6, 2);
}

// ---------------------------------------------------------------- head coverings
/** Behind the head (tichel knot and tails). */
function coverBack(c, d) {
  if (d.cover === 'tichel') {
    const col = d.hat, col2 = d.hat2 || shade(d.hat, -0.25);
    celBlob(c, [[-14, -3], [-22, 0], [-25, 9], [-20, 8], [-15, 2]], col2);
    celBlob(c, [[-14, -2], [-20, 6], [-19, 15], [-14.5, 12], [-13, 4]], col);
    celBlob(c, circlePts(-13.2, -4, 3.7, 8), col);
  } else if (d.cover === 'turban') {
    celBlob(c, [[-12, -9], [-19, -3], [-18, 7], [-12, 1]], shade(d.hat, -0.1));
  }
}

function kippahFront(c, d) {
  const k = d.kippah || {}, a = k.a || '#15151a', b = k.b || '#e8c04a';
  const K = k.tall
    ? [[-11.5, -9.5], [-11.2, -17], [-5.5, -21.4], [3.4, -21.8], [9.6, -17.5], [9.4, -11.6], [-0.5, -12.6]]
    : [[-11.5, -9.5], [-10.8, -15.2], [-3.6, -19.4], [4.4, -18.9], [9.6, -14.8], [9.4, -12], [-0.5, -13.2]];
  const cy = k.tall ? -16.4 : -15.2;
  celBlob(c, K, a, true, 1.5);
  c.save(); pathPts(c, K, true); c.clip();
  if (k.t === 'knit') {
    for (const [s, col] of [[0.78, b], [0.52, a], [0.28, b]]) {
      c.save(); c.translate(-1, cy); c.scale(s, s); c.translate(1, -cy);
      pathPts(c, K, true); c.fillStyle = col; c.fill(); c.restore();
    }
  } else if (k.t === 'embroid') {
    const top = k.tall ? -17 : -14.4;
    c.fillStyle = b; c.fillRect(-12, top, 22, 1.7);
    c.fillStyle = k.c || b;
    for (let x = -8; x <= 6; x += 4.2) { c.save(); c.translate(x, top + 0.85); c.rotate(Math.PI / 4); c.fillRect(-1, -1, 2, 2); c.restore(); }
    if (k.tall) { c.fillStyle = b; c.fillRect(-12, -20, 22, 1.2); c.fillStyle = k.c || b; for (let x = -6; x <= 6; x += 4.6) c.fillRect(x, -19.6, 1.8, 1.8); }
  } else {
    c.strokeStyle = 'rgba(255,255,255,0.16)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-6, -16); c.quadraticCurveTo(0, -18.2, 5, -16.2); c.stroke();
  }
  if (k.star) magen(c, -1.2, cy + 0.2, 2.7, k.starCol || '#e8c04a', 0.7);
  c.restore();
  pathPts(c, K, true); inkStroke(c, 1.5);
}

function fedoraFront(c, d) {
  const hat = d.hat || '#17171d';
  celBlob(c, [[-19, -11], [-10, -13.2], [3, -13.6], [15, -12.6], [21, -10.4], [14, -8.6], [2, -8.2], [-11, -8.8]], hat, true, 1.6);
  celBlob(c, [[-10.5, -10.5], [-11, -19], [-6, -23.5], [2, -22], [9, -24], [11.5, -18], [11, -10.5]], hat, true, 1.6);
  c.strokeStyle = shade(hat, 0.3); c.lineWidth = 0.9; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-1.5, -21.5); c.quadraticCurveTo(-0.5, -17, -1, -14); c.stroke();
  flatBlob(c, [[-11, -14], [11.2, -14.2], [11.4, -10.8], [-10.8, -10.8]], shade(hat, 0.2), false, 1.1);
}

/** Shtreimel: a round fur hat. */
function shtreimelFront(c, d) {
  const fur = d.hat || '#6a4528', top = -20.5, bot = -10.2, rx = 19.5, ry = 3.8;
  const pts = [];
  const N = 22;
  for (let i = 0; i <= N; i++) { const a = Math.PI + (i / N) * Math.PI, j = i % 2 ? 0.9 : 0; pts.push([Math.cos(a) * (rx + j), top + Math.sin(a) * ry - j * 0.4]); }
  for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI, j = i % 2 ? 0.9 : 0; pts.push([Math.cos(a) * (rx + 0.5 + j), bot + Math.sin(a) * (ry - 0.6) + j * 0.4]); }
  celBlob(c, pts, fur, false, 1.6);
  c.strokeStyle = shade(fur, -0.42); c.lineWidth = 0.8; c.lineCap = 'round';
  c.beginPath();
  for (let x = -18; x <= 18; x += 2.6) { const y = top + 3 + ((x * 7) % 3); c.moveTo(x, y); c.lineTo(x + 1.2, y + 3.4 + (x % 2)); }
  c.stroke();
  c.strokeStyle = shade(fur, 0.3); c.lineWidth = 0.7; c.beginPath();
  for (let x = -16; x <= 16; x += 3.4) { c.moveTo(x, bot - 1); c.lineTo(x + 1, bot + 2); }
  c.stroke();
  c.beginPath(); c.ellipse(0, top - 0.2, rx * 0.74, ry * 0.7, 0, 0, Math.PI * 2);
  c.fillStyle = '#2a1a14'; c.fill(); inkStroke(c, 1.2);
}

function turbanFront(c, d) {
  const t = d.hat || '#f1ede0', t2 = d.hat2 || '#8f2d2d';
  const T = [[-12.5, -3], [-14, -12], [-8, -20], [2, -22.5], [10, -19.5], [13.5, -12], [13.5, -8.5], [3, -10.5], [-6, -8]];
  celBlob(c, T, t, true, 1.6);
  c.save(); pathPts(c, T, true); c.clip();
  c.strokeStyle = t2; c.lineWidth = 1.5; c.lineCap = 'round';
  c.beginPath();
  for (const y of [-13.5, -17, -20.5]) { c.moveTo(-15, y + 5); c.quadraticCurveTo(0, y - 3, 15, y + 3); }
  c.stroke();
  c.strokeStyle = shade(t, -0.25); c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(-14, -8); c.quadraticCurveTo(0, -15, 14, -9); c.stroke();
  c.restore();
  pathPts(c, T, true); inkStroke(c, 1.6);
}

function tichelFront(c, d) {
  const col = d.hat, band = d.hat2 || '#e8c04a';
  const T = [[-12.5, -1], [-13, -12], [-5, -18.3], [6, -17.6], [12, -12.5], [13.4, -8.8], [8, -10.8], [2, -11.8], [-5, -9], [-8, -3]];
  celBlob(c, T, col, true, 1.6);
  c.save(); pathPts(c, T, true); c.clip();
  c.strokeStyle = band; c.lineWidth = 1.7; c.lineCap = 'round';
  c.beginPath(); c.moveTo(13, -9.6); c.quadraticCurveTo(2, -13.4, -8, -7.6); c.stroke();
  c.strokeStyle = shade(col, -0.3); c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(-8, -15); c.quadraticCurveTo(0, -12, 4, -17); c.moveTo(-11, -9); c.quadraticCurveTo(-4, -8, 2, -14); c.stroke();
  c.restore();
  pathPts(c, T, true); inkStroke(c, 1.6);
}

function drawCover(c, d) {
  switch (d.cover) {
    case 'kippah': kippahFront(c, d); break;
    case 'fedora': fedoraFront(c, d); break;
    case 'shtreimel': shtreimelFront(c, d); break;
    case 'turban': turbanFront(c, d); break;
    case 'tichel': tichelFront(c, d); break;
  }
}

// ---------------------------------------------------------------- tzitzit
/** One set of fringes: a wrapped bundle at the top, then strands that hang and sway. */
function drawFringe(ctx, r, ax, ay, scale = 1) {
  const sway = clamp(-r.p.pelvis.vx * 0.012, -6, 6) + Math.sin(r.world.time * 3 + r.id * 1.7) * 0.9;
  const offs = [-1.6, -0.55, 0.55, 1.6], lens = [13, 17, 15, 18].map((v) => v * scale);
  ctx.lineCap = 'round';
  for (const [w, mode] of [[1.9, 'ink'], [0.85, 'fill']]) {
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = mode === 'ink' ? INK : (r.design.techelet && i === 1 ? '#3a78d8' : '#f6f2e4');
      ctx.lineWidth = w;
      const sx = ax + offs[i], L = lens[i];
      ctx.beginPath(); ctx.moveTo(sx, ay + 2); ctx.quadraticCurveTo(sx + sway * 0.4, ay + L * 0.5, sx + sway + offs[i] * 0.7, ay + L); ctx.stroke();
    }
  }
  // The knotted collar where the strings are wound.
  ctx.fillStyle = '#f6f2e4';
  ctx.beginPath(); ctx.ellipse(ax, ay + 2, 2.3, 1.6, 0, 0, Math.PI * 2); ctx.fill(); inkStroke(ctx, 0.8);
  ctx.strokeStyle = 'rgba(40,30,20,0.35)'; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(ax - 1.5, ay + 2); ctx.lineTo(ax + 1.5, ay + 2); ctx.stroke();
}

// ---------------------------------------------------------------- body: skirt, tallit / shamma
const _Q = (b, fk, dk, F, D, fx = 0) => [b.x + F.fx * fk + D.dx * dk + fx, b.y + F.fy * fk + D.dy * dk];

/** A modest mid-calf skirt; it hangs from the waist and swings a little as the body moves. */
function drawSkirt(ctx, r, L) {
  const d = r.design, k = d.skirt, pl = r.p.pelvis, t = r.world.time;
  const len = k.len || 32;
  const flap = clamp(-pl.vx * 0.01, -8, 8) + Math.sin(t * 3 + r.id) * 0.8;
  const pts = [_Q(pl, 8.5, -9, L, L), _Q(pl, 14.5, len, L, L, flap * 0.5), _Q(pl, 0, len + 1.6, L, L, flap * 0.8), _Q(pl, -14, len, L, L, flap), _Q(pl, -8.5, -9, L, L)];
  const col = k.color || d.bottom;
  pathPts(ctx, pts, false);
  ctx.fillStyle = col; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = 'rgba(20,6,30,0.22)';
  ctx.beginPath(); ctx.moveTo(pts[2][0], pts[2][1]); ctx.lineTo(pts[3][0], pts[3][1]); ctx.lineTo(pts[4][0], pts[4][1]);
  ctx.lineTo(_Q(pl, 0, -9, L, L)[0], _Q(pl, 0, -9, L, L)[1]); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 0.9; ctx.beginPath();
  for (const fk of [-6, 0, 6]) { const a = _Q(pl, fk * 0.7, -6, L, L), b = _Q(pl, fk * 1.8, len, L, L, flap * 0.7); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
  ctx.stroke();
  if (k.trim) {
    ctx.strokeStyle = k.trim; ctx.lineWidth = 2.4; ctx.beginPath();
    const a = _Q(pl, 15, len - 2, L, L, flap * 0.5), m = _Q(pl, 0, len - 0.6, L, L, flap * 0.8), b = _Q(pl, -15, len - 2, L, L, flap);
    ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(m[0], m[1], b[0], b[1]); ctx.stroke();
  }
  ctx.restore();
  pathPts(ctx, pts, false); inkStroke(ctx, 1.6);
}

/** Prayer shawl (tallit) or Ethiopian shamma: a cloth draped over the shoulders, trimmed along the front edge. */
function drawCloak(ctx, r, n, c, pl, U, L, M) {
  const d = r.design, k = d.cloak, t = r.world.time;
  const len = k.len || 18;
  const flap = clamp(-pl.vx * 0.012, -9, 9) + Math.sin(t * 4 + r.id) * 1.0;
  const pts = [_Q(n, -7.5, 1, U, U), _Q(n, 7.5, 0, U, U), _Q(c, 14, -1, M, L), _Q(pl, 13.5, 4, L, L), _Q(pl, 12.5, len, L, L, flap * 0.6),
    _Q(pl, -12.5, len + 1, L, L, flap), _Q(pl, -12, 4, L, L), _Q(c, -12.5, 0, M, L)];
  pathPts(ctx, pts, false);
  ctx.fillStyle = k.color; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = 'rgba(30,20,50,0.2)';
  ctx.beginPath(); const mid = [_Q(n, 0, 0, U, U), _Q(c, 0, 0, M, L), _Q(pl, 0, len, L, L, flap * 0.8)];
  ctx.moveTo(mid[0][0], mid[0][1]); ctx.lineTo(mid[1][0], mid[1][1]); ctx.lineTo(mid[2][0], mid[2][1]);
  ctx.lineTo(pts[5][0], pts[5][1]); ctx.lineTo(pts[6][0], pts[6][1]); ctx.lineTo(pts[7][0], pts[7][1]); ctx.lineTo(_Q(n, -7.5, 1, U, U)[0], _Q(n, -7.5, 1, U, U)[1]); ctx.closePath(); ctx.fill();
  // Stripes run down the front edge.
  ctx.lineCap = 'butt';
  k.trim.forEach((col, i) => {
    const o = 2.2 + i * 2.6;
    const a = _Q(n, 7.5 - o, 4, U, U), b = _Q(c, 14 - o, -1, M, L), e = _Q(pl, 13.5 - o, 4, L, L), g = _Q(pl, 12.5 - o, len, L, L, flap * 0.6);
    ctx.strokeStyle = col; ctx.lineWidth = k.trimW || 1.6;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(e[0], e[1]); ctx.lineTo(g[0], g[1]); ctx.stroke();
  });
  ctx.restore();
  pathPts(ctx, pts, false); inkStroke(ctx, 1.6);
  if (k.atarah) { // the decorated neckband
    const a = _Q(n, -6.5, 0.5, U, U), b = _Q(n, 7, 0.2, U, U);
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.strokeStyle = k.atarah; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  if (k.tzitzit) { drawFringe(ctx, r, pts[4][0], pts[4][1] - 1); drawFringe(ctx, r, pts[5][0] + 1, pts[5][1] - 1); }
}

// ---------------------------------------------------------------- torso hooks (called from art.js)
/** Inside the torso clip: stripes (Bukharian silk), edge embroidery. */
function drawCommunityPattern(ctx, r, n, c, pl, U, L, M, P) {
  const d = r.design;
  if (d.stripes) {
    ctx.lineWidth = 3.2; ctx.lineCap = 'butt';
    let i = 0;
    for (let k = -12; k <= 13; k += 3.2, i++) {
      const a = P(n, k * 0.8, 0, U, U), b = P(c, k, 0), e = P(pl, k * 0.9, 0, L, L);
      ctx.strokeStyle = d.stripes[i % d.stripes.length];
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
    }
  }
  if (d.edgeTrim) {
    ctx.strokeStyle = d.edgeTrim; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const a = P(n, 4.6, 3, U, U), b = P(c, 9, -3), e = P(pl, 6.5, -8, L, L);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(b[0], b[1], e[0], e[1]); ctx.stroke();
  }
}

/** Over the torso: jewelry (Magen David, chai, hamsa) and a sash. */
function drawCommunityAccessories(ctx, r, n, c, pl, U, L, M, P) {
  const d = r.design;
  if (d.sash) {
    const a = P(pl, 9.6, -10, L, L), b = P(pl, -9.6, -10, L, L);
    ctx.lineCap = 'butt';
    ctx.strokeStyle = INK; ctx.lineWidth = 5.4; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.strokeStyle = d.sash; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  if (d.pendant && !r.isBroken('head')) {
    const a = P(n, 4.4, 3, U, U), m = P(n, 8.6, 10, U, U), q = P(c, 7.6, -7.5);
    const gold = d.pendantCol || '#e8c04a';
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(m[0], m[1], q[0], q[1]); ctx.stroke();
    ctx.strokeStyle = gold; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(m[0], m[1], q[0], q[1]); ctx.stroke();
    if (d.pendant === 'magen') magen(ctx, q[0], q[1] + 2.4, 3.4, gold, 0.9);
    else if (d.pendant === 'chai') {
      ctx.font = 'bold 8px "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.strokeText('חי', q[0], q[1] + 2.4);
      ctx.fillStyle = gold; ctx.fillText('חי', q[0], q[1] + 2.4);
      ctx.textBaseline = 'alphabetic';
    } else if (d.pendant === 'hamsa') {
      const x = q[0], y = q[1] + 2.6;
      flatBlob(ctx, [[x - 2.6, y + 3.2], [x - 3.2, y - 0.6], [x - 2.4, y - 3.6], [x - 1.2, y - 4.2], [x - 0.8, y - 2], [x, y - 4.8], [x + 0.9, y - 2], [x + 1.4, y - 4.2], [x + 2.6, y - 3.4], [x + 3.2, y - 0.6], [x + 2.6, y + 3.2]], gold, false, 0.8);
      dotInk(ctx, x, y, 1.3, '#2f78c8', 0.6);
    }
  }
  if (d.acc.includes('magenPin')) {
    const q = P(c, 8, -3);
    magen(ctx, q[0], q[1], 2.6, '#2f78c8', 0.7);
  }
}
