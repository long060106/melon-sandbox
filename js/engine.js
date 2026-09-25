'use strict';
/* =====================================================================
   Melon Sandbox — physics core
   Verlet particles joined by distance constraints. A Body is a group of
   particles; box-like bodies also expose a convex polygon for collisions.
   The world runs at a fixed step (DT); main.js decides steps per frame.
   ===================================================================== */

const DT = 1 / 120;
const GRAVITY = 1900;
const ITERATIONS = 10;
const MAX_MOVE = 45;           // px per step — velocity clamp keeps the sim stable
const IMPACT_MIN = 250;        // px/s relative speed before impact callbacks fire

let _uid = 0;
const nextId = () => ++_uid;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

class Particle {
  constructor(x, y, r, mass, body) {
    this.uid = nextId();
    this.x = x; this.y = y; this.px = x; this.py = y;
    this.r = r;
    this.mass = mass;
    this.invMass = mass > 0 ? 1 / mass : 0;
    this.body = body;
    this.name = '';
    this.pinned = false;
    this.grounded = false;
    this.friction = 0.3;       // fraction of tangential speed lost per step on the ground
    this.bounce = 0.12;
    this.pendX = 0; this.pendY = 0; // velocity stored while frozen in stopped time
    this.plantX = null;             // x a standing foot is planted at (see solveBounds)
    this.ghost = false;             // erased by The Hand: invisible, no collisions
  }
  get frozen() { return !!(this.body && this.body.frozen); }
  get vx() { return this.frozen ? 0 : (this.x - this.px) / DT; }
  get vy() { return this.frozen ? 0 : (this.y - this.py) / DT; }
  setVel(vx, vy) { this.px = this.x - vx * DT; this.py = this.y - vy * DT; }
  addVel(vx, vy) {
    if (this.frozen) { this.pendX += vx; this.pendY += vy; return; }
    this.px -= vx * DT; this.py -= vy * DT;
  }
  /** Effective inverse mass: pinned and time-frozen particles are immovable. */
  w() { return (this.pinned || this.frozen) ? 0 : this.invMass; }
  moveBy(dx, dy) { this.x += dx; this.y += dy; this.px += dx; this.py += dy; }
}

class Constraint {
  constructor(a, b, opts = {}) {
    this.a = a; this.b = b;
    this.len = opts.len ?? dist(a.x, a.y, b.x, b.y);
    this.rest = this.len;
    this.stiff = opts.stiff ?? 1;
    this.mode = opts.mode || 'eq';   // 'eq' | 'min' | 'max'
    this.joint = opts.joint || null; // joint group name, used for breaking and restoring
    this.broken = false;
    this.restoring = 0;
  }
  solve() {
    const a = this.a, b = this.b;
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1e-6;
    if (this.mode === 'min' && d >= this.len) return;
    if (this.mode === 'max' && d <= this.len) return;
    const wa = a.w(), wb = b.w(), w = wa + wb;
    if (w === 0) return;
    const k = ((d - this.len) / (d * w)) * this.stiff;
    a.x += dx * k * wa; a.y += dy * k * wa;
    b.x -= dx * k * wb; b.y -= dy * k * wb;
  }
  stretch() { return dist(this.a.x, this.a.y, this.b.x, this.b.y) / this.len; }
}

class Body {
  constructor(world) {
    this.world = world;
    this.id = nextId();
    this.particles = [];
    this.constraints = [];
    this.poly = null;          // convex polygon (array of particles), for boxes
    this.kind = 'body';
    this.frozen = false;       // set by the world every step during stopped time
    this.intangible = false;
    this.removed = false;
    this.owner = null;         // body that created this one (thrown knife → thrower)
    this.heavy = false;
  }
  addParticle(x, y, r, m, name = '') {
    const p = new Particle(x, y, r, m, this);
    p.name = name;
    this.particles.push(p);
    return p;
  }
  link(a, b, opts) {
    const c = new Constraint(a, b, opts);
    this.constraints.push(c);
    return c;
  }
  get mass() { let m = 0; for (const p of this.particles) m += p.mass; return m; }
  center() {
    let x = 0, y = 0;
    for (const p of this.particles) { x += p.x; y += p.y; }
    const n = this.particles.length || 1;
    return { x: x / n, y: y / n };
  }
  // Hooks for subclasses.
  update(dt) {}
  draw(ctx) {}
  onImpact(p, speed, other) {}
  /** Return true to cancel the physical response (knives sticking in, arrows piercing…). */
  onContact(p, other) { return false; }
  canCollideWith(body) { return true; }
  /** Extra time-stop exemption for bodies whose owner is exempt (e.g. freshly thrown knives). */
  timeExempt() { return false; }
  onTimeResume() {
    for (const p of this.particles) {
      if (p.pendX || p.pendY) {
        // Stored hits all land at once, but capped so bodies don't tunnel through the walls.
        const m = Math.hypot(p.pendX, p.pendY), k = m > 2600 ? 2600 / m : 1;
        p.addVel(p.pendX * k, p.pendY * k);
        p.pendX = p.pendY = 0;
      }
    }
  }
  containsPoint(x, y) {
    if (this.poly && pointInPoly(x, y, this.poly)) return true;
    for (const p of this.particles) if (dist(x, y, p.x, p.y) <= p.r + 4) return true;
    return false;
  }
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

class World {
  constructor() {
    this.bodies = [];
    this.extra = [];           // cross-body constraints (embedded knives)
    this.width = 800; this.height = 600; this.groundY = 536;
    this.time = 0;
    this.timeStop = null;      // { owner, t, dur, def, exempt:Set, late:[] }
    this.erase = null;         // King Crimson: { owner, t, dur }
    this.accel = null;         // Made in Heaven: { owner, t, dur } (sim time)
    this.grab = null;          // { p, x, y }
    this.pairs = [];
    this.fx = null;            // Effects instance, attached by main.js
    this.shake = 0;
    this.listeners = {};
  }

  on(evt, fn) { (this.listeners[evt] ||= []).push(fn); }
  emit(evt, data) { for (const fn of this.listeners[evt] || []) fn(data); }

  resize(w, h, floor = 64) {
    this.width = w; this.height = h; this.groundY = h - floor;
    // Slide whole bodies back inside instead of letting the walls crush them.
    for (const b of this.bodies) {
      let maxX = -Infinity, maxY = -Infinity;
      for (const p of b.particles) { maxX = Math.max(maxX, p.x + p.r); maxY = Math.max(maxY, p.y + p.r); }
      const dx = Math.min(0, w - 4 - maxX), dy = Math.min(0, this.groundY - maxY);
      if (dx || dy) for (const p of b.particles) { p.moveBy(dx, dy); if (p.plantX != null) p.plantX = null; }
    }
  }
  add(body) { this.bodies.push(body); return body; }
  remove(body) { body.removed = true; if (this.grab && this.grab.p.body === body) this.grab = null; }
  clear() { for (const b of this.bodies) b.removed = true; this.bodies = []; this.extra = []; this.grab = null; this.timeStop = null; this.erase = null; this.accel = null; }

  ragdolls() { return this.bodies.filter(b => b.kind === 'ragdoll' && !b.removed); }

  // ---------------------------------------------------------------- time
  isExempt(b) {
    const ts = this.timeStop;
    if (!ts) return true;
    if (ts.exempt.has(b)) return true;
    return !!(b.owner && ts.exempt.has(b.owner) && b.timeExempt());
  }
  startTimeStop(owner, dur, def) {
    const ts = { owner, t: 0, dur, def, exempt: new Set([owner]), late: [], lastTick: 0 };
    // Users of time-stopping Stands can "enter" each other's stopped time after a moment.
    for (const r of this.ragdolls()) {
      if (r !== owner && r.stand && r.stand.def.timeMover && !r.dead) ts.late.push({ b: r, at: Math.max(1.1, dur * 0.6) });
    }
    this.timeStop = ts;
    this.emit('timestop', ts);
  }
  endTimeStop() {
    const ts = this.timeStop;
    if (!ts) return;
    this.timeStop = null;
    for (const b of this.bodies) { b.frozen = false; b.onTimeResume(); }
    this.emit('timeresume', ts);
  }

  // ---------------------------------------------------------------- step
  step() {
    const dt = DT;
    this.time += dt;
    if (this.bodies.some(b => b.removed)) {
      this.bodies = this.bodies.filter(b => !b.removed);
      this.extra = this.extra.filter(c => !c.a.body.removed && !c.b.body.removed && !c.broken);
    }

    const ts = this.timeStop;
    if (ts) {
      ts.t += dt;
      for (const l of ts.late) {
        if (!l.done && ts.t >= l.at && !l.b.dead && !l.b.removed) {
          l.done = true; ts.exempt.add(l.b); this.emit('timemove', l.b);
        }
      }
      if (Math.floor(ts.t) > ts.lastTick) { ts.lastTick = Math.floor(ts.t); this.emit('timetick', ts); }
      if (ts.t >= ts.dur || ts.owner.dead || ts.owner.removed) this.endTimeStop();
    }
    if (this.erase) {
      this.erase.t += dt;
      if (this.erase.t >= this.erase.dur || this.erase.owner.removed) {
        const e = this.erase; this.erase = null; this.emit('eraseend', e);
      }
    }
    if (this.accel) {
      this.accel.t += dt;
      if (this.accel.t >= this.accel.dur || this.accel.owner.dead || this.accel.owner.removed) {
        const a = this.accel; this.accel = null; this.emit('accelend', a);
      }
    }

    for (const b of this.bodies) b.frozen = !!this.timeStop && !this.isExempt(b);
    for (const b of this.bodies) if (!b.frozen && !b.removed) b.update(dt);

    // Integrate.
    const g = GRAVITY * dt * dt;
    for (const b of this.bodies) {
      if (b.frozen) continue;
      for (const p of b.particles) {
        p.grounded = false;
        if (p.pinned) { p.px = p.x; p.py = p.y; continue; }
        const vx = clamp((p.x - p.px) * 0.999, -MAX_MOVE, MAX_MOVE);
        const vy = clamp((p.y - p.py) * 0.999, -MAX_MOVE, MAX_MOVE);
        p.px = p.x; p.py = p.y;
        p.x += vx; p.y += vy + g;
      }
    }

    this.buildPairs();
    for (let it = 0; it < ITERATIONS; it++) {
      const first = it === 0;
      for (const b of this.bodies) for (const c of b.constraints) if (!c.broken) c.solve();
      for (const c of this.extra) if (!c.broken) c.solve();
      this.solvePairs(first);
      this.solvePolys(first);
      this.solveBounds(first);
      this.solveGrab();
    }

    for (const b of this.bodies) if (b.checkBreaks && !b.frozen) b.checkBreaks();
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
  }

  // ---------------------------------------------------------------- broadphase
  buildPairs() {
    const cell = 48;
    const grid = new Map();
    for (const b of this.bodies) {
      if (b.intangible || b.removed) continue;
      for (const p of b.particles) {
        if (p.ghost) continue;
        const x0 = Math.floor((p.x - p.r) / cell), x1 = Math.floor((p.x + p.r) / cell);
        const y0 = Math.floor((p.y - p.r) / cell), y1 = Math.floor((p.y + p.r) / cell);
        for (let cx = x0; cx <= x1; cx++) {
          for (let cy = y0; cy <= y1; cy++) {
            const key = ((cx & 0xffff) << 16) | (cy & 0xffff);
            let arr = grid.get(key);
            if (!arr) grid.set(key, (arr = []));
            arr.push(p);
          }
        }
      }
    }
    const pairs = [];
    const seen = new Set();
    for (const arr of grid.values()) {
      for (let i = 0; i < arr.length; i++) {
        const a = arr[i];
        for (let j = i + 1; j < arr.length; j++) {
          const b = arr[j];
          if (a.body === b.body) continue;
          const key = a.uid < b.uid ? a.uid * 1e6 + b.uid : b.uid * 1e6 + a.uid;
          if (seen.has(key)) continue;
          seen.add(key);
          if (!a.body.canCollideWith(b.body) || !b.body.canCollideWith(a.body)) continue;
          const rr = a.r + b.r + 6;
          if (Math.abs(a.x - b.x) > rr || Math.abs(a.y - b.y) > rr) continue;
          pairs.push(a, b);
        }
      }
    }
    this.pairs = pairs;
  }

  solvePairs(first) {
    const pairs = this.pairs;
    for (let i = 0; i < pairs.length; i += 2) {
      const a = pairs[i], b = pairs[i + 1];
      if (!a) continue;
      const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 0.001;
      const nx = dx / d, ny = dy / d;
      if (first) {
        const ca = a.body.onContact(a, b), cb = b.body.onContact(b, a);
        if (ca || cb) { pairs[i] = pairs[i + 1] = null; continue; }
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < -IMPACT_MIN) { a.body.onImpact(a, -rv, b); b.body.onImpact(b, -rv, a); }
      }
      const wa = a.w(), wb = b.w(), w = wa + wb;
      if (!w) continue;
      const depth = rr - d, pen = depth / w;
      // Deep overlaps (spawning inside someone) separate without injecting velocity.
      const calm = depth > 3 ? (depth - 3) / depth : 0;
      a.x -= nx * pen * wa; a.y -= ny * pen * wa;
      b.x += nx * pen * wb; b.y += ny * pen * wb;
      if (calm) {
        a.px -= nx * pen * wa * calm; a.py -= ny * pen * wa * calm;
        b.px += nx * pen * wb * calm; b.py += ny * pen * wb * calm;
      }
      if (ny < -0.5) b.grounded = true; else if (ny > 0.5) a.grounded = true;
      if (first) {
        // Simple tangential friction between touching particles.
        const tx = -ny, ty = nx;
        const vt = ((b.x - b.px) - (a.x - a.px)) * tx + ((b.y - b.py) - (a.y - a.py)) * ty;
        const f = (vt * 0.25) / w;
        a.px -= tx * f * wa; a.py -= ty * f * wa;
        b.px += tx * f * wb; b.py += ty * f * wb;
      }
    }
  }

  solvePolys(first) {
    for (const box of this.bodies) {
      if (!box.poly || box.intangible || box.removed) continue;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const q of box.poly) {
        if (q.x < minX) minX = q.x; if (q.x > maxX) maxX = q.x;
        if (q.y < minY) minY = q.y; if (q.y > maxY) maxY = q.y;
      }
      for (const ob of this.bodies) {
        if (ob === box || ob.intangible || ob.removed) continue;
        if (!ob.canCollideWith(box) || !box.canCollideWith(ob)) continue;
        for (const p of ob.particles) {
          if (p.ghost) continue;
          if (p.x + p.r < minX || p.x - p.r > maxX || p.y + p.r < minY || p.y - p.r > maxY) continue;
          collideCirclePoly(p, box, first);
        }
      }
    }
  }

  solveBounds(first) {
    const gy = this.groundY, W = this.width;
    for (const b of this.bodies) {
      if (b.frozen) continue;
      for (const p of b.particles) {
        if (p.pinned) continue;
        if (p.y + p.r > gy) {
          if (first) {
            const vy = p.y - p.py;
            if (vy / DT > IMPACT_MIN) b.onImpact(p, vy / DT, null);
            const fr = b.groundFriction ? b.groundFriction(p) : p.friction;
            p.px = p.x - (p.x - p.px) * (1 - fr);
            p.y = gy - p.r;
            p.py = p.y + Math.max(0, vy) * p.bounce;
          } else {
            p.y = gy - p.r;
          }
          p.grounded = true;
          // Static friction for planted feet: tiny creeping is cancelled, a real shove unplants.
          if (p.plantX != null) {
            if (Math.abs(p.x - p.plantX) > 2.5) p.plantX = null;
            else p.x = p.plantX;
          }
        }
        if (p.x - p.r < 0) {
          const vx = p.x - p.px; p.x = p.r;
          if (first) { p.px = p.x + vx * p.bounce; if (-vx / DT > IMPACT_MIN) b.onImpact(p, -vx / DT, null); }
        } else if (p.x + p.r > W) {
          const vx = p.x - p.px; p.x = W - p.r;
          if (first) { p.px = p.x + vx * p.bounce; if (vx / DT > IMPACT_MIN) b.onImpact(p, vx / DT, null); }
        }
        if (p.y < -4000) p.y = -4000;
      }
    }
  }

  solveGrab() {
    const g = this.grab;
    if (!g) return;
    const p = g.p;
    if (p.body.removed || p.body.frozen) return;
    p.x += (g.x - p.x) * 0.3;
    p.y += (g.y - p.y) * 0.3;
  }

  // ---------------------------------------------------------------- queries
  particleAt(x, y, pad = 12) {
    let best = null, bd = Infinity;
    for (const b of this.bodies) {
      if (b.removed) continue;
      for (const p of b.particles) {
        if (p.ghost) continue;
        const d = dist(x, y, p.x, p.y) - p.r;
        if (d < pad && d < bd) { bd = d; best = p; }
      }
    }
    if (best) return best;
    // Clicking inside a box grabs its nearest corner.
    for (const b of this.bodies) {
      if (b.poly && !b.removed && pointInPoly(x, y, b.poly)) {
        let q = b.poly[0], qd = Infinity;
        for (const c of b.poly) { const d = dist(x, y, c.x, c.y); if (d < qd) { qd = d; q = c; } }
        return q;
      }
    }
    return null;
  }
  bodyAt(x, y) {
    const p = this.particleAt(x, y, 10);
    if (p) return p.body;
    for (const b of this.bodies) if (!b.removed && b.containsPoint(x, y)) return b;
    return null;
  }

  // ---------------------------------------------------------------- world actions
  explode(x, y, radius, power, source = null) {
    for (const b of this.bodies) {
      if (b.intangible || b.removed || b === source) continue;
      let closest = Infinity;
      const scale = b.heavy ? 0.25 : 1;
      for (const p of b.particles) {
        const dx = p.x - x, dy = p.y - y;
        const d = Math.hypot(dx, dy) || 1;
        closest = Math.min(closest, d);
        if (d < radius) {
          const f = 1 - d / radius;
          p.addVel((dx / d) * power * f * scale, ((dy / d) * power - power * 0.35) * f * scale);
        }
      }
      if (closest < radius && b.onExplosion) b.onExplosion(x, y, radius, 1 - closest / radius, source);
    }
    this.shake = Math.max(this.shake, Math.min(22, power / 70));
    this.emit('explosion', { x, y, radius });
  }
}

/** Resolve a circle particle `c` against the convex polygon of `box`. */
function collideCirclePoly(c, box, first) {
  const poly = box.poly, n = poly.length;
  let cx = 0, cy = 0;
  for (const q of poly) { cx += q.x; cy += q.y; }
  cx /= n; cy /= n;

  let inside = true, maxSd = -Infinity, maxI = 0, maxNx = 0, maxNy = 0, maxT = 0;
  let minD = Infinity, mI = 0, mT = 0, mQx = 0, mQy = 0;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    const ex = b.x - a.x, ey = b.y - a.y;
    const len2 = ex * ex + ey * ey || 1e-6, len = Math.sqrt(len2);
    let nx = ey / len, ny = -ex / len;
    if (((a.x + b.x) / 2 - cx) * nx + ((a.y + b.y) / 2 - cy) * ny < 0) { nx = -nx; ny = -ny; }
    const sd = (c.x - a.x) * nx + (c.y - a.y) * ny;
    const t = clamp(((c.x - a.x) * ex + (c.y - a.y) * ey) / len2, 0, 1);
    if (sd > 0) inside = false;
    if (sd > maxSd) { maxSd = sd; maxI = i; maxNx = nx; maxNy = ny; maxT = t; }
    const qx = a.x + ex * t, qy = a.y + ey * t;
    const d = Math.hypot(c.x - qx, c.y - qy);
    if (d < minD) { minD = d; mI = i; mT = t; mQx = qx; mQy = qy; }
  }

  let nx, ny, pen, ei, t;
  if (inside) { nx = maxNx; ny = maxNy; pen = c.r - maxSd; ei = maxI; t = maxT; }
  else {
    if (minD >= c.r) return;
    const d = minD || 0.001;
    nx = (c.x - mQx) / d; ny = (c.y - mQy) / d; pen = c.r - minD; ei = mI; t = mT;
  }
  const a = poly[ei], b = poly[(ei + 1) % n];

  if (first) {
    if (c.body.onContact(c, a) || box.onContact(a, c)) return;
    const evx = a.vx * (1 - t) + b.vx * t, evy = a.vy * (1 - t) + b.vy * t;
    const rv = (c.vx - evx) * nx + (c.vy - evy) * ny;
    if (rv < -IMPACT_MIN) { c.body.onImpact(c, -rv, a); box.onImpact(a, -rv, c); }
  }

  const wc = c.w(), wa = a.w(), wb = b.w();
  const denom = wc + (1 - t) * (1 - t) * wa + t * t * wb;
  if (!denom) return;
  const lam = pen / denom;
  c.x += nx * lam * wc; c.y += ny * lam * wc;
  a.x -= nx * lam * (1 - t) * wa; a.y -= ny * lam * (1 - t) * wa;
  b.x -= nx * lam * t * wb; b.y -= ny * lam * t * wb;
  if (ny < -0.5) c.grounded = true;

  if (first && wc) {
    // Friction along the edge so things can rest on crates.
    const tx = -ny, ty = nx;
    const vt = ((c.x - c.px) - ((a.x - a.px) * (1 - t) + (b.x - b.px) * t)) * tx +
               ((c.y - c.py) - ((a.y - a.py) * (1 - t) + (b.y - b.py) * t)) * ty;
    c.px += tx * vt * 0.3; c.py += ty * vt * 0.3;
  }
}
