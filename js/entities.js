'use strict';
/* =====================================================================
   Bodies: anime Ragdoll (muscles, AI hook, damage, status effects,
   dismemberment), Box (Crate / RoadRoller), Melon ball,
   Stick (Knife / Stand Arrow).
   ===================================================================== */

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- ragdoll layout
// Pelvis at (0,0), facing right. Units are pixels.
const RD_PARTS = [
  // name,     x,   y,  r, mass
  ['head',     0, -72, 13, 1.3],
  ['neck',     0, -54,  5, 0.6],
  ['chest',    0, -36, 10, 2.2],
  ['pelvis',   0,   0, 10, 2.2],
  ['bElbow',  -3, -32,  5, 0.6],
  ['bHand',   -4, -10,  5, 0.5],
  ['fElbow',   3, -32,  5, 0.6],
  ['fHand',    4, -10,  5, 0.5],
  ['bKnee',   -3,  24,  6, 1.1],
  ['bFoot',   -4,  48,  6, 0.9],
  ['fKnee',    3,  24,  6, 1.1],
  ['fFoot',    4,  48,  6, 0.9],
];
const RD_LINKS = [
  // a, b, joint group
  ['head', 'neck', 'head'], ['head', 'chest', 'head'],
  ['neck', 'chest', null], ['chest', 'pelvis', null], ['neck', 'pelvis', null],
  ['neck', 'bElbow', 'bArm'], ['bElbow', 'bHand', null],
  ['neck', 'fElbow', 'fArm'], ['fElbow', 'fHand', null],
  ['pelvis', 'bKnee', 'bLeg'], ['bKnee', 'bFoot', null],
  ['pelvis', 'fKnee', 'fLeg'], ['fKnee', 'fFoot', null],
];
const DETACH = {
  head: ['head'], bArm: ['bElbow', 'bHand'], fArm: ['fElbow', 'fHand'],
  bLeg: ['bKnee', 'bFoot'], fLeg: ['fKnee', 'fFoot'],
};
const STUMP = { head: 'neck', bArm: 'neck', fArm: 'neck', bLeg: 'pelvis', fLeg: 'pelvis' };
const LIMBS = ['bArm', 'fArm', 'bLeg', 'fLeg'];
const PART_GROUP = { head: 'head', bElbow: 'bArm', bHand: 'bArm', fElbow: 'fArm', fHand: 'fArm', bKnee: 'bLeg', bFoot: 'bLeg', fKnee: 'fLeg', fFoot: 'fLeg' };

// Muscle targets, relative to the pelvis, facing right.
const POSES = {
  idle: {
    head: [2, -72], neck: [1, -54], chest: [0, -36], pelvis: [0, 0],
    bElbow: [-5, -33], bHand: [-3, -11], fElbow: [5, -33], fHand: [8, -12],
    bKnee: [-4, 24], bFoot: [-6, 48], fKnee: [4, 24], fFoot: [7, 48],
  },
  stance: {
    head: [4, -71], neck: [2, -53], chest: [0, -35], pelvis: [0, 0],
    bElbow: [-6, -36], bHand: [12, -46], fElbow: [14, -36], fHand: [30, -48],
    bKnee: [-9, 24], bFoot: [-14, 48], fKnee: [9, 23], fFoot: [14, 48],
  },
  bound: {
    head: [1, -72], neck: [0, -54], chest: [0, -36], pelvis: [0, 0],
    bElbow: [-2, -34], bHand: [-2, -14], fElbow: [2, -34], fHand: [3, -14],
    bKnee: [-2, 24], bFoot: [-2, 48], fKnee: [2, 24], fFoot: [2, 48],
  },
  jotaro: { // pointing
    head: [-2, -72], neck: [-2, -54], chest: [-1, -36], pelvis: [0, 0],
    bElbow: [-12, -36], bHand: [-4, -18], fElbow: [14, -66], fHand: [34, -74],
    bKnee: [-8, 24], bFoot: [-12, 48], fKnee: [10, 23], fFoot: [16, 47],
  },
  dio: { // lean back, hand on face, arm flung out
    head: [-10, -68], neck: [-8, -51], chest: [-4, -34], pelvis: [0, 0],
    bElbow: [-26, -58], bHand: [-40, -72], fElbow: [8, -46], fHand: [0, -64],
    bKnee: [-6, 24], bFoot: [-4, 48], fKnee: [10, 22], fFoot: [18, 46],
  },
  kira: { // open palm forward, arm across chest, legs crossed
    head: [3, -72], neck: [2, -54], chest: [1, -36], pelvis: [0, 0],
    bElbow: [10, -38], bHand: [-2, -46], fElbow: [20, -50], fHand: [40, -54],
    bKnee: [-2, 24], bFoot: [6, 48], fKnee: [6, 24], fFoot: [-4, 48],
  },
  josuke: { // fixing the hair
    head: [4, -72], neck: [3, -54], chest: [2, -36], pelvis: [0, 0],
    bElbow: [-10, -38], bHand: [-4, -18], fElbow: [16, -68], fHand: [6, -84],
    bKnee: [-6, 24], bFoot: [-10, 48], fKnee: [8, 24], fFoot: [10, 48],
  },
  diavolo: { // arms raised, leaning back
    head: [-4, -72], neck: [-3, -54], chest: [-1, -36], pelvis: [0, 0],
    bElbow: [-18, -68], bHand: [-28, -84], fElbow: [12, -68], fHand: [24, -84],
    bKnee: [-10, 24], bFoot: [-16, 48], fKnee: [10, 24], fFoot: [16, 48],
  },
  giorno: { // hand on chest, other arm swept back, legs crossed
    head: [3, -72], neck: [2, -54], chest: [1, -36], pelvis: [0, 0],
    bElbow: [-16, -40], bHand: [-34, -30], fElbow: [12, -42], fHand: [4, -56],
    bKnee: [-4, 24], bFoot: [4, 48], fKnee: [6, 24], fFoot: [-2, 48],
  },
  kakyoin: { // leaning back, hand behind the head
    head: [-6, -70], neck: [-5, -52], chest: [-3, -35], pelvis: [0, 0],
    bElbow: [-18, -44], bHand: [-26, -26], fElbow: [8, -60], fHand: [0, -78],
    bKnee: [-8, 24], bFoot: [-12, 48], fKnee: [8, 24], fFoot: [14, 48],
  },
  joseph: { // "OH MY GOD!"
    head: [-6, -70], neck: [-5, -52], chest: [-3, -35], pelvis: [0, 0],
    bElbow: [-18, -62], bHand: [-10, -82], fElbow: [10, -62], fHand: [2, -80],
    bKnee: [-9, 24], bFoot: [-14, 48], fKnee: [9, 23], fFoot: [14, 48],
  },
  polnareff: { // fencing lunge
    head: [8, -68], neck: [6, -50], chest: [4, -33], pelvis: [0, 0],
    bElbow: [-10, -56], bHand: [-22, -70], fElbow: [22, -54], fHand: [40, -58],
    bKnee: [-12, 22], bFoot: [-22, 46], fKnee: [14, 20], fFoot: [22, 46],
  },
  pucci: { // one finger raised to heaven
    head: [0, -72], neck: [0, -54], chest: [0, -36], pelvis: [0, 0],
    bElbow: [6, -38], bHand: [10, -50], fElbow: [12, -68], fHand: [16, -88],
    bKnee: [-4, 24], bFoot: [-6, 48], fKnee: [4, 24], fFoot: [7, 48],
  },
  jolyne: { // fist forward, other hand on hip
    head: [5, -71], neck: [3, -53], chest: [1, -35], pelvis: [0, 0],
    bElbow: [-10, -36], bHand: [-4, -18], fElbow: [16, -50], fHand: [36, -54],
    bKnee: [-9, 24], bFoot: [-14, 48], fKnee: [9, 23], fFoot: [14, 48],
  },
};

class Ragdoll extends Body {
  constructor(world, x, y, opts = {}) {
    super(world);
    this.kind = 'ragdoll';
    this.p = {};
    const s = opts.scale || 1;
    for (const [n, px, py, r, m] of RD_PARTS) {
      const p = this.addParticle(x + px * s, y + py * s, r * (n === 'head' ? 1 : s), m, n);
      p.friction = 0.3;
      this.p[n] = p;
    }
    for (const [a, b, joint] of RD_LINKS) this.link(this.p[a], this.p[b], { joint });
    // Soft knee limits so legs don't fold flat.
    this.link(this.p.pelvis, this.p.bFoot, { mode: 'min', len: 32, joint: 'bLeg' });
    this.link(this.p.pelvis, this.p.fFoot, { mode: 'min', len: 32, joint: 'fLeg' });

    this.name = opts.name || 'Civilian';
    this.design = typeof opts.design === 'object' ? opts.design : opts.design ? DESIGNS[opts.design] : randomCivilianDesign();
    this.team = opts.team ?? this.id;
    this.isClone = !!opts.clone;
    this.life = opts.life || 0;
    this.maxHp = opts.hp || 100;
    this.hp = this.maxHp;
    this.dead = false;
    this.gibbed = false;
    this.stun = 0;
    this.bleed = 0;
    this.facing = opts.facing || 1;
    this.moveDir = 0;
    this.jumpReq = false;
    this.walkPhase = 0;
    this.walkSpeed = 170;
    this.speedMul = 1;
    this.jumpPower = 640;
    this.pose = 'idle';
    this.poseTimer = 0;
    this.controlled = false;
    this.brokenGroups = new Set();
    this.detached = new Set();
    this.erased = new Set();
    this.status = {};
    this.statusData = {};
    this.doomClock = 0;
    this.pendDmg = 0;
    this.pendHits = 0;
    this.lastImpact = -1;
    this.invulnUntil = world.time + 0.6; // spawn protection
    this.lastAttacker = null;
    this.lastAttackerT = -9;
    this.lastZero = -9;
    this.hitFlash = 0;
    this.hpShow = 0;
    this.aiTimer = 0;
    this.aiDelay = 1.5;   // stand around menacingly for a moment after spawning
    this.target = null;
    this.menaceT = rand(0, 1);
    this.standKey = opts.stand || null;
    this.stand = null;
    if (this.standKey) {
      this.maxHp = this.hp = opts.hp || 150;
      this.jumpPower = 720;
      this.stand = new Stand(this, STAND_DEFS[this.standKey], !!opts.quiet);
    }
  }

  // ------------------------------------------------------------ state helpers
  get alive() { return !this.dead && !this.removed; }
  isBroken(group) { return this.brokenGroups.has(group); }
  has(name) { return (this.status[name] || 0) > 0; }
  canAct() { return !this.dead && this.stun <= 0 && !this.has('book') && !this.has('bound') && !this.has('heavy') && !this.has('doom'); }
  moveMul() {
    let m = this.speedMul;
    if (this.has('slow')) m *= 0.3;
    if (this.world.accel && this.world.accel.owner === this) m *= 2.2;
    return m;
  }
  refreshDetached() {
    this.detached.clear();
    for (const g of this.brokenGroups) for (const n of DETACH[g]) this.detached.add(n);
  }
  strength() {
    if (this.dead || this.stun > 0 || this.has('book')) return 0;
    let s = clamp(0.35 + 0.65 * this.hp / this.maxHp, 0, 1);
    if (this.isBroken('bLeg') && this.isBroken('fLeg')) s *= 0.15;
    if (this.has('slip')) s *= 0.2;
    return s;
  }
  groundFriction(p) {
    if (this.has('slip')) return 0;
    if (this.dead) return 0.35;
    return this.moveDir ? 0.02 : 0.3;
  }
  canCollideWith(b) { return !(b.kind === 'stick' && b.owner === this && b.age < 0.4); }
  hitBy(attacker) {
    if (!attacker || attacker === this) return;
    this.lastAttacker = attacker;
    this.lastAttackerT = this.world.time;
  }

  // ------------------------------------------------------------ status effects
  addStatus(name, dur, src = null, data = null) {
    if (this.removed) return;
    if (this.has('zero') && src !== this) { this.reflectZero(); return; }
    const had = this.has(name);
    this.status[name] = Math.max(this.status[name] || 0, dur);
    if (data) this.statusData[name] = data;
    if (had) return;
    if (name === 'rubber') for (const p of this.particles) p.bounce = 0.85;
    if (name === 'doom') this.doomClock = 0.2;
  }
  clearStatus() {
    for (const k in this.status) { if (this.status[k] > 0) { this.status[k] = 0; this.onStatusEnd(k); } }
  }
  onStatusEnd(name) {
    if (name === 'rubber') for (const p of this.particles) p.bounce = 0.12;
    if (name === 'doom' && !this.dead) { this.hp = 0; this.die(); }
  }
  tickStatus(dt) {
    for (const k in this.status) {
      if (this.status[k] > 0) {
        this.status[k] -= dt;
        if (this.status[k] <= 0) { this.status[k] = 0; this.onStatusEnd(k); }
      }
    }
    const c = this.p.chest, fx = this.world.fx;
    if (this.has('burn')) {
      this.damage(6 * dt, null, 0, 0, true);
      if (Math.random() < 0.6) fx.fire(c.x + rand(-10, 10), c.y + rand(-30, 30));
    }
    if (this.has('virus')) {
      this.damage(11 * dt, null, 0, 0, true);
      if (Math.random() < 0.3) fx.blood(c.x + rand(-8, 8), c.y + rand(-30, 20), 1, 0, 0, '#9a3ad0');
    }
    if (this.has('spin')) {
      this.damage(8 * dt, null, 0, 0, true);
      c.addVel(rand(-40, 40), rand(-40, 40));
      if (Math.random() < 0.25) fx.blood(c.x, c.y, 1);
    }
    if (this.has('heavy')) for (const p of this.particles) p.addVel(0, 2600 * dt);
    if (this.has('float')) {
      for (const p of this.particles) {
        p.addVel(0, -2 * GRAVITY * dt);
        if (p.y - p.r < 58) { p.y = 58 + p.r; if (p.py < p.y) p.py = p.y; }
      }
    }
    if (this.has('doom')) {
      this.doomClock -= dt;
      if (this.doomClock <= 0) {
        this.doomClock = 1.1;
        if (!this.dead) {
          this.hp = 0; this.die();
          fx.blood(c.x, c.y, 18, rand(-200, 200), -200);
          fx.text(this.p.head.x, this.p.head.y - 36, pick(['...!?', 'WHAT!?', 'AGAIN!?', 'IT WON\'T END!']), { size: 24, color: '#e8d8ff' });
        } else {
          this.restore(true);
          this.status.doom = Math.max(this.status.doom, 0.01);
        }
      }
    }
  }

  // ------------------------------------------------------------ simulation
  update(dt) {
    if (this.stand) this.stand.update(dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.hpShow = Math.max(0, this.hpShow - dt);

    if (this.isClone) {
      this.life -= dt;
      if (this.life <= 0) {
        this.world.fx.ring(this.p.chest.x, this.p.chest.y, 50, 4, 0.4, '#6a8fd6', 4);
        this.world.fx.text(this.p.chest.x, this.p.chest.y - 60, '*returns to its world*', { size: 18, color: '#cfe0ff' });
        this.world.remove(this);
        return;
      }
    }

    // Crazy Diamond restoration: broken joints ease back to their rest length.
    for (const c of this.constraints) {
      if (c.restoring > 0) {
        c.restoring -= dt;
        c.len = lerp(c.len, c.rest, 0.1);
        if (c.restoring <= 0) c.len = c.rest;
      }
    }

    if (this.bleed > 0) {
      this.bleed -= dt;
      if (Math.random() < 0.5) {
        for (const g of this.brokenGroups) {
          if (this.erased.has(g)) continue;
          const s = this.p[STUMP[g]];
          this.world.fx.blood(s.x, s.y, 1, s.vx, s.vy - 80);
        }
      }
    }

    this.tickStatus(dt);
    if (this.removed) return;

    if (this.dead) { this.moveDir = 0; this.p.bFoot.plantX = this.p.fFoot.plantX = null; return; }
    if (this.stun > 0) this.stun -= dt;
    if (this.poseTimer > 0) this.poseTimer -= dt;
    if (this.design.vampire && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + 3 * dt);

    if (!this.controlled) this.think(dt);
    if (!this.canAct()) { this.moveDir = 0; this.jumpReq = false; }

    // Menacing aura.
    if (this.stand && JOJO.enabled && JOJO.menacing && !this.isClone) {
      this.menaceT -= dt * (this.poseTimer > 0 ? 6 : 1);
      if (this.menaceT <= 0) {
        this.menaceT = rand(0.5, 0.9);
        const side = Math.random() < 0.5 ? -1 : 1;
        this.world.fx.glyph(this.p.chest.x + side * rand(26, 50), this.p.chest.y + rand(-50, 10));
      }
    }

    const s = this.strength();
    const P = this.p, f = this.facing;
    if (s <= 0) { P.bFoot.plantX = P.fFoot.plantX = null; return; }

    const bOK = !this.isBroken('bLeg'), fOK = !this.isBroken('fLeg');
    const grounded = (bOK && P.bFoot.grounded) || (fOK && P.fFoot.grounded);
    const planting = grounded && this.moveDir === 0 && !this.jumpReq && s > 0.3 && !this.has('slip');
    for (const [foot, ok] of [[P.bFoot, bOK], [P.fFoot, fOK]]) {
      if (planting && ok && foot.grounded && Math.abs(foot.vx) < 80) { if (foot.plantX == null) foot.plantX = foot.x; }
      else foot.plantX = null;
    }

    let poseName = 'idle';
    if (this.has('bound')) poseName = 'bound';
    else if (this.poseTimer > 0) poseName = this.pose;
    else if (this.stand && this.stand.state !== 'idle') poseName = 'stance';
    const pose = POSES[poseName] || POSES.idle;

    const mm = this.moveMul();
    const walking = this.moveDir !== 0 && grounded;
    if (walking) this.walkPhase += dt * 11 * mm;

    // Anchor: standing still → the planted feet (so muscles can't push the body
    // sideways); walking or airborne → the pelvis.
    let ax = P.pelvis.x, ay, k;
    if (grounded) {
      const bP = bOK && P.bFoot.grounded, fP = fOK && P.fFoot.grounded;
      let fy = -Infinity;
      if (bP) fy = Math.max(fy, P.bFoot.y);
      if (fP) fy = Math.max(fy, P.fFoot.y);
      ay = fy - 48;
      k = 0.16 * s;
      if (!walking) {
        if (bP && fP) ax = (P.bFoot.x + P.fFoot.x) / 2 - ((pose.bFoot[0] + pose.fFoot[0]) / 2) * f;
        else if (bP) ax = P.bFoot.x - pose.bFoot[0] * f;
        else ax = P.fFoot.x - pose.fFoot[0] * f;
      }
    } else {
      ay = P.pelvis.y;
      k = 0.035 * s;
    }

    for (const name in pose) {
      if (this.detached.has(name)) continue;
      const p = P[name];
      let ox = pose[name][0], oy = pose[name][1];
      if (walking && (name === 'bFoot' || name === 'fFoot' || name === 'bKnee' || name === 'fKnee')) {
        const ph = this.walkPhase + (name[0] === 'b' ? 0 : Math.PI);
        const sw = Math.sin(ph), lift = Math.max(0, Math.cos(ph));
        const knee = name.endsWith('Knee');
        ox += sw * (knee ? 7 : 13);
        oy -= lift * (knee ? 5 : 10);
      }
      const dx = (ax + ox * f - p.x) * k, dy = (ay + oy - p.y) * k;
      p.x += dx; p.y += dy;
      p.px += dx * 0.8; p.py += dy * 0.75;
    }

    if (this.moveDir !== 0 && s > 0.3) {
      const tv = this.moveDir * this.walkSpeed * mm * DT;
      const blend = grounded ? 0.12 : 0.03;
      for (const p of this.particles) {
        if (this.detached.has(p.name)) continue;
        p.px -= (tv - (p.x - p.px)) * blend;
      }
    }

    if (this.jumpReq) {
      this.jumpReq = false;
      if (grounded && s > 0.4) {
        for (const p of this.particles) if (!this.detached.has(p.name)) p.addVel(this.moveDir * 160, -this.jumpPower);
      }
    }
  }

  checkBreaks() {
    for (const c of this.constraints) {
      if (c.joint && !c.broken && c.mode === 'eq' && c.restoring <= 0 && DETACH[c.joint] && c.stretch() > 2.4) {
        this.breakJoint(c.joint);
      }
    }
  }

  // ------------------------------------------------------------ AI
  think(dt) {
    const st = this.stand;
    if (!st || !JOJO.enabled || !JOJO.ai) { this.moveDir = 0; return; }
    if (this.aiDelay > 0) { this.aiDelay -= dt; this.moveDir = 0; return; }
    this.aiTimer -= dt;
    if (this.aiTimer <= 0 || !this.target || !this.target.alive) {
      this.aiTimer = 0.6;
      this.target = this.findEnemy();
    }
    const t = this.target;
    if (!t || t.intangible) {
      this.moveDir = 0;
      if (this.has('blind') && Math.random() < dt) this.facing *= -1; // stumbling around
      return;
    }
    const dx = t.p.pelvis.x - this.p.pelvis.x;
    const dir = Math.sign(dx) || 1;
    if (st.state === 'idle') this.facing = dir;
    st.ai(t, Math.abs(dx), dir, dt);
  }

  findEnemy(maxDist = Infinity) {
    if (this.has('blind')) return null;
    let best = null, bd = maxDist;
    for (const r of this.world.ragdolls()) {
      if (r === this || r.dead || r.intangible || r.team === this.team) continue;
      if (!r.stand && !r.isClone && !JOJO.civilians && !this.controlled) continue;
      const d = Math.abs(r.p.pelvis.x - this.p.pelvis.x) + Math.abs(r.p.pelvis.y - this.p.pelvis.y) * 0.5;
      if (d < bd) { bd = d; best = r; }
    }
    return best;
  }

  // ------------------------------------------------------------ damage
  damage(amount, part = null, vx = 0, vy = 0, quiet = false) {
    if (amount <= 0 || this.removed || this.world.time < this.invulnUntil) return;
    if (this.has('zero')) { this.reflectZero(); return; }
    if (this.frozen) { this.pendDmg += amount; this.pendHits++; return; }
    const at = part || this.p.chest;
    this.hp -= amount;
    this.hpShow = 2.5;
    if (!quiet) {
      this.hitFlash = 0.12;
      this.world.fx.blood(at.x, at.y, Math.ceil(amount * 0.5), vx, vy);
      if (amount >= 12 && !this.dead) this.stun = Math.max(this.stun, Math.min(2.2, amount / 20));
    }
    if (this.hp <= 0 && !this.dead && !this.has('doom')) this.die();
    if (this.hp < -140 && !this.gibbed) this.gib();
  }

  /** Gold Experience Requiem: whoever just attacked is sent back to zero. */
  reflectZero() {
    const w = this.world;
    if (w.time - this.lastZero < 0.4) return;
    this.lastZero = w.time;
    w.fx.ring(this.p.chest.x, this.p.chest.y, 10, 70, 0.4, '#f8e08a', 5);
    const a = this.lastAttacker;
    if (a && a !== this && a.alive && w.time - this.lastAttackerT < 0.5) {
      const dir = Math.sign(a.p.pelvis.x - this.p.pelvis.x) || 1;
      for (const p of a.particles) p.addVel(dir * 900, -350);
      a.stun = Math.max(a.stun, 1.6);
      if (a.stand) { a.stand.state = 'idle'; a.stand.timers.length = 0; }
      w.fx.text(a.p.head.x, a.p.head.y - 40, 'RETURN TO ZERO', { size: 26, color: '#f8e08a' });
    }
  }

  onImpact(p, speed, other) {
    const ob = other && other.body;
    if (ob && (ob.kind === 'stick' || ob.kind === 'proj')) return;
    if (this.has('rubber')) return;
    let thr = 720, k = 0.05;
    if (ob) {
      if (ob.heavy) { thr = 260; k = 0.14; }
      else if (ob.kind === 'ragdoll') { thr = 950; k = 0.03; }
    }
    if (!ob && speed > 520) SFX.thud(speed);
    if (speed < thr) return;
    // One impact per short window, capped — a body slamming a wall hits with many particles at once.
    if (this.world.time - this.lastImpact < 0.12) return;
    this.lastImpact = this.world.time;
    this.damage(Math.min(ob && ob.heavy ? 90 : 38, (speed - thr) * k * (p.name === 'head' ? 1.6 : 1)), p);
  }

  onExplosion(x, y, radius, f) {
    this.damage(80 * f, this.p.chest);
    if (f > 0.45) for (const g of LIMBS) if (Math.random() < f * 0.6) this.breakJoint(g);
    if (f > 0.85) this.gib();
  }

  onTimeResume() {
    super.onTimeResume();
    if (this.pendDmg > 0) {
      const dmg = this.pendDmg, hits = this.pendHits;
      this.pendDmg = 0; this.pendHits = 0;
      this.damage(dmg);
      if (hits > 3) this.world.fx.text(this.p.head.x, this.p.head.y - 30, `${hits} HITS!`, { size: 30, color: '#ffd84a' });
    }
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.hp = Math.min(this.hp, 0);
    this.moveDir = 0;
    this.world.emit('death', this);
  }

  /** clean = no blood (Sticky Fingers' zipper, The Hand's erasure). */
  breakJoint(group, clean = false) {
    if (this.brokenGroups.has(group) || !DETACH[group]) return false;
    let any = false;
    for (const c of this.constraints) if (c.joint === group && !c.broken) { c.broken = true; any = true; }
    if (!any) return false;
    this.brokenGroups.add(group);
    this.refreshDetached();
    if (!clean) {
      const s = this.p[STUMP[group]];
      this.world.fx.blood(s.x, s.y, 20, s.vx, s.vy);
      this.bleed = Math.max(this.bleed, 5);
    }
    if (group === 'head' && !this.dead) { this.hp = Math.min(this.hp, 0); this.die(); }
    return true;
  }

  /** The Hand: the limb is scraped out of existence. */
  eraseLimb(group) {
    this.breakJoint(group, true);
    this.erased.add(group);
    for (const n of DETACH[group]) this.p[n].ghost = true;
  }

  gib() {
    this.gibbed = true;
    for (const g of Object.keys(DETACH)) this.breakJoint(g);
    for (const p of this.particles) p.addVel(rand(-500, 500), rand(-700, -100));
    const c = this.p.chest;
    this.world.fx.blood(c.x, c.y, 40, 0, -200);
    if (!this.dead) this.die();
  }

  restore(keepStatus = false) {
    this.hp = this.maxHp;
    this.dead = false;
    this.gibbed = false;
    this.stun = 0.3;
    this.bleed = 0;
    this.pendDmg = 0;
    this.invulnUntil = this.world.time + 1.2; // limbs snapping back shouldn't hurt
    if (!keepStatus) this.clearStatus();
    for (const g of this.erased) for (const n of DETACH[g]) this.p[n].ghost = false;
    this.erased.clear();
    for (const c of this.constraints) {
      if (c.broken) {
        c.broken = false;
        c.len = Math.max(c.rest, dist(c.a.x, c.a.y, c.b.x, c.b.y));
        c.restoring = 1.0;
      }
    }
    this.brokenGroups.clear();
    this.refreshDetached();
    if (this.standKey && !this.stand) this.stand = new Stand(this, STAND_DEFS[this.standKey], true);
  }

  awaken(key) {
    if (this.standKey || this.dead) return false;
    if (Math.random() < 0.15) {
      this.world.fx.text(this.p.head.x, this.p.head.y - 40, 'NOT WORTHY...', { size: 30, color: '#d9d9d9', life: 1.6, vy: -30 });
      this.damage(999, this.p.chest);
      return false;
    }
    key = key || STAND_KEYS[(Math.random() * STAND_KEYS.length) | 0];
    this.standKey = key;
    this.maxHp = 150; this.hp = 150;
    this.jumpPower = 720;
    this.stand = new Stand(this, STAND_DEFS[key]);
    this.world.emit('awaken', this);
    return true;
  }

  teleportTo(x) {
    x = clamp(x, 30, this.world.width - 30);
    const dx = x - this.p.pelvis.x;
    const dy = (this.world.groundY - 54) - this.p.pelvis.y;
    for (const p of this.particles) { p.x += dx; p.y += dy; p.px = p.x; p.py = p.y; p.plantX = null; }
  }

  strikePose() {
    if (this.dead) return;
    this.pose = this.stand ? this.stand.def.pose : pick(['jotaro', 'giorno', 'josuke', 'kira', 'joseph']);
    this.poseTimer = 2.4;
    SFX.menace();
    if (JOJO.enabled) {
      for (let i = 0; i < 6; i++) this.world.fx.glyph(this.p.chest.x + rand(-70, 70), this.p.chest.y + rand(-70, 20), rand(26, 44));
    }
  }

  // ------------------------------------------------------------ drawing
  draw(ctx) {
    const st = this.stand;
    const special = st && st.def.art && st.def.art.special;
    const standFront = st && (st.state !== 'idle' || special === 'vines' || special === 'pistols');
    if (st && !standFront) drawStand(ctx, st);
    if (this.isClone) { ctx.save(); ctx.globalAlpha = 0.82; drawCharacter(ctx, this); ctx.restore(); }
    else drawCharacter(ctx, this);
    if (this.hitFlash > 0) {
      ctx.save();
      ctx.globalAlpha = (this.hitFlash / 0.12) * 0.45;
      ctx.fillStyle = '#fff';
      for (const p of this.particles) { if (p.ghost) continue; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 1, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    if (st && standFront) drawStand(ctx, st);
  }

  /** HUD bits drawn above everything else: selection marker, HP bar, status effects. */
  drawOverlay(ctx) {
    const H = this.p.head, C = this.p.chest, P = this.p.pelvis, t = this.world.time;
    const top = H.y - 32;
    if (this.controlled) {
      const bob = Math.sin(t * 6) * 3;
      ctx.fillStyle = '#ffd84a'; ctx.strokeStyle = '#2a1238'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(H.x - 7, top - 14 + bob); ctx.lineTo(H.x + 7, top - 14 + bob); ctx.lineTo(H.x, top - 4 + bob); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    if (!this.dead && (this.hpShow > 0 || this.controlled || (this.stand && this.hp < this.maxHp))) {
      const w = 36, x = H.x - w / 2, y = top;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - 1, y - 1, w + 2, 6);
      const k = clamp(this.hp / this.maxHp, 0, 1);
      ctx.fillStyle = k > 0.5 ? '#5fd35f' : k > 0.25 ? '#f2c33a' : '#e5484d';
      ctx.fillRect(x, y, w * k, 4);
    }
    ctx.save();
    ctx.lineCap = 'round';
    if (this.has('bound')) {
      const col = (this.statusData.bound && this.statusData.bound.color) || '#e84a2a';
      ctx.strokeStyle = col; ctx.lineWidth = 3;
      if (col === '#e84a2a') { ctx.shadowColor = '#ff8a2a'; ctx.shadowBlur = 8; }
      for (const [a, b, r] of [[C, C, 13], [P, P, 12], [C, P, 14]]) {
        const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
        ctx.beginPath(); ctx.ellipse(x, y, r, 5, Math.sin(t * 3) * 0.2 + 0.3, 0, TAU); ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;
    if (this.has('heavy')) {
      ctx.fillStyle = 'rgba(20,0,30,0.35)';
      ctx.beginPath(); ctx.ellipse(P.x, this.world.groundY, 30, 6, 0, 0, TAU); ctx.fill();
      ctx.font = `900 16px "Yu Gothic", "Meiryo", sans-serif`; ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.strokeText('ズシッ', C.x + 26, C.y - 10);
      ctx.fillStyle = '#9ef07a'; ctx.fillText('ズシッ', C.x + 26, C.y - 10);
    }
    if (this.has('spin')) {
      ctx.strokeStyle = '#f0a0d0'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 26; i++) { const a = i * 0.5 + t * 12, r = i * 0.45; ctx.lineTo(C.x + Math.cos(a) * r, C.y + Math.sin(a) * r); }
      ctx.stroke();
    }
    if (this.has('zero')) {
      ctx.strokeStyle = 'rgba(248,224,138,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(C.x, C.y - 10, 34 + Math.sin(t * 5) * 3, 60, 0, 0, TAU); ctx.stroke();
    }
    if (this.has('doom')) {
      ctx.fillStyle = 'rgba(80,20,120,0.25)';
      ctx.beginPath(); ctx.ellipse(C.x, C.y - 10, 36, 64, 0, 0, TAU); ctx.fill();
    }
    if (this.has('virus')) {
      ctx.fillStyle = 'rgba(154,58,208,0.35)';
      for (const p of this.particles) { if (p.ghost) continue; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.8, 0, TAU); ctx.fill(); }
    }
    if (this.has('slip')) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(P.x + Math.sin(t * 3 + i * 2) * 14, P.y + 40 - ((t * 30 + i * 12) % 40), 3, 0, TAU); ctx.stroke(); }
    }
    if (this.has('float')) {
      ctx.strokeStyle = '#8fe07a'; ctx.lineWidth = 2;
      ctx.beginPath(); for (const dx of [-18, 18]) { ctx.moveTo(C.x + dx, C.y + 10); ctx.lineTo(C.x + dx, C.y - 10); ctx.lineTo(C.x + dx - 4, C.y - 4); ctx.moveTo(C.x + dx, C.y - 10); ctx.lineTo(C.x + dx + 4, C.y - 4); } ctx.stroke();
    }
    if (this.has('marked')) {
      ctx.strokeStyle = '#ff5a3a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(C.x, C.y, 16, 0, TAU); ctx.moveTo(C.x - 22, C.y); ctx.lineTo(C.x + 22, C.y); ctx.moveTo(C.x, C.y - 22); ctx.lineTo(C.x, C.y + 22); ctx.stroke();
    }
    if (this.has('slow')) {
      ctx.strokeStyle = '#9fd8ff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(H.x + 22, H.y - 16, 6, 0, TAU); ctx.moveTo(H.x + 22, H.y - 16); ctx.lineTo(H.x + 22, H.y - 20); ctx.moveTo(H.x + 22, H.y - 16); ctx.lineTo(H.x + 25, H.y - 16); ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------- boxes
class Box extends Body {
  constructor(world, x, y, w, h, mass = 4, opts = {}) {
    super(world);
    this.kind = 'box';
    this.w = w; this.h = h;
    const m = mass / 4;
    const c = [
      this.addParticle(x - w / 2, y - h / 2, 2, m),
      this.addParticle(x + w / 2, y - h / 2, 2, m),
      this.addParticle(x + w / 2, y + h / 2, 2, m),
      this.addParticle(x - w / 2, y + h / 2, 2, m),
    ];
    for (const p of c) { p.friction = 0.25; p.bounce = 0.1; }
    for (let i = 0; i < 4; i++) this.link(c[i], c[(i + 1) % 4]);
    this.link(c[0], c[2]); this.link(c[1], c[3]);
    this.poly = c;
    this.color = opts.color || '#b57a3a';
    this.hp = opts.hp || 60;
  }
  frame() {
    const [a, b] = this.poly;
    const cx = (this.poly[0].x + this.poly[2].x) / 2, cy = (this.poly[0].y + this.poly[2].y) / 2;
    return { cx, cy, ang: Math.atan2(b.y - a.y, b.x - a.x) };
  }
  damage(amount) {
    if (this.frozen) return;
    this.hp -= amount;
  }
  onImpact(p, speed, other) {
    if (speed > 600 && !other) SFX.thud(speed * 1.4);
  }
  draw(ctx) {
    const { cx, cy, ang } = this.frame();
    const w = this.w, h = this.h;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.fillStyle = this.color;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(-w / 2, h / 6, w, h / 3);
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = '#6b4520'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 1; i < 3; i++) { ctx.moveTo(-w / 2, -h / 2 + (h * i) / 3); ctx.lineTo(w / 2, -h / 2 + (h * i) / 3); }
    ctx.moveTo(-w / 2 + 4, -h / 2 + 4); ctx.lineTo(w / 2 - 4, h / 2 - 4);
    ctx.stroke();
    ctx.restore();
  }
}

class RoadRoller extends Box {
  constructor(world, x, y) {
    super(world, x, y, 170, 86, 64);
    this.kind = 'roller';
    this.heavy = true;
    this.tsActive = 0;
    for (const p of this.poly) { p.bounce = 0.05; p.friction = 0.4; }
  }
  timeExempt() { return this.tsActive > 0; }
  update(dt) { if (this.tsActive > 0) this.tsActive -= dt; }
  onImpact(p, speed, other) {
    if (speed > 400) { SFX.thud(speed * 2); this.world.shake = Math.max(this.world.shake, 10); }
  }
  draw(ctx) {
    const { cx, cy, ang } = this.frame();
    const w = this.w, h = this.h;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.fillStyle = '#f2c230';
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w / 2, h / 2 - 8); ctx.lineTo(-w / 2, -h / 2 + 22); ctx.lineTo(-w / 2 + 50, -h / 2 + 22);
    ctx.lineTo(-w / 2 + 58, -h / 2); ctx.lineTo(-w / 2 + 100, -h / 2); ctx.lineTo(-w / 2 + 104, -h / 2 + 22);
    ctx.lineTo(w / 2, -h / 2 + 22); ctx.lineTo(w / 2, h / 2 - 8); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(-w / 2 + 2, h / 2 - 24, w - 4, 14);
    ctx.fillStyle = '#9fd3e8';
    ctx.fillRect(-w / 2 + 62, -h / 2 + 5, 36, 15);
    ctx.strokeRect(-w / 2 + 62, -h / 2 + 5, 36, 15);
    for (const [dx, r] of [[-w / 2 + 30, 26], [w / 2 - 34, 30]]) {
      ctx.fillStyle = '#5a5a60';
      ctx.beginPath(); ctx.arc(dx, h / 2 - r + 2, r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8b8b93';
      ctx.beginPath(); ctx.arc(dx, h / 2 - r + 2, r * 0.45, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#3a2a08';
    ctx.font = `14px ${COMIC_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('ロードローラー', w / 2 - 36, -h / 2 + 38);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- melon ball
class MelonBall extends Body {
  constructor(world, x, y) {
    super(world);
    this.kind = 'ball';
    const p = this.addParticle(x, y, 18, 2.5);
    p.bounce = 0.45; p.friction = 0.05;
    this.spin = 0;
  }
  update(dt) { this.spin += this.particles[0].vx * dt / 18; }
  damage() {}
  draw(ctx) {
    const p = this.particles[0];
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(this.spin);
    ctx.fillStyle = '#6dbb4a';
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = '#3d8a2b'; ctx.lineWidth = 4;
    for (const sx of [-11, 0, 11]) { ctx.beginPath(); ctx.moveTo(sx * 0.5, -19); ctx.quadraticCurveTo(sx * 1.4, 0, sx * 0.5, 19); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.stroke();
    ctx.restore();
  }
}

// ---------------------------------------------------------------- knives & arrows
class Stick extends Body {
  constructor(world, x, y, angle, type = 'knife') {
    super(world);
    this.kind = 'stick';
    this.type = type;
    const len = type === 'arrow' ? 44 : 26;
    const cx = Math.cos(angle), cy = Math.sin(angle);
    this.tip = this.addParticle(x + cx * len / 2, y + cy * len / 2, 2.5, 0.15, 'tip');
    this.tail = this.addParticle(x - cx * len / 2, y - cy * len / 2, 2.5, type === 'arrow' ? 0.3 : 0.2, 'tail');
    for (const p of this.particles) { p.friction = 0.4; p.bounce = 0.2; }
    this.link(this.tip, this.tail);
    this.len = len;
    this.stuckTo = null;
    this.tsFlight = 0;
    this.age = 0;
  }
  timeExempt() { return this.tsFlight > 0; }
  canCollideWith(b) { return !(b === this.owner && this.age < 0.4); }
  update(dt) {
    this.age += dt;
    if (this.tsFlight > 0) this.tsFlight -= dt;
    if (this.stuckTo && (this.stuckTo.removed)) this.stuckTo = null;
    // Fly tip-first.
    if (!this.stuckTo) {
      const vx = this.tip.vx, vy = this.tip.vy, sp = Math.hypot(vx, vy);
      if (sp > 250) {
        const tx = this.tip.x - (vx / sp) * this.len, ty = this.tip.y - (vy / sp) * this.len;
        this.tail.x += (tx - this.tail.x) * 0.2; this.tail.y += (ty - this.tail.y) * 0.2;
      }
    }
  }
  onContact(p, other) {
    const ob = other.body;
    if (this.stuckTo) return ob === this.stuckTo;
    if (ob === this.owner) return true;
    if (p !== this.tip || ob.kind !== 'ragdoll') return false;
    const rel = Math.hypot(this.tip.vx - other.vx, this.tip.vy - other.vy);
    if (this.type === 'arrow') {
      if (ob.standKey || ob.dead || rel < 150) return false;
      ob.damage(4, other);
      if (ob.awaken()) this.world.remove(this);
      return true;
    }
    if (rel < 380) return false;
    ob.hitBy(this.owner);
    ob.damage(13, other, this.tip.vx, this.tip.vy);
    other.addVel(this.tip.vx * 0.12, this.tip.vy * 0.12);
    SFX.stab();
    this.stuckTo = ob;
    const d1 = dist(this.tip.x, this.tip.y, other.x, other.y);
    const d2 = dist(this.tail.x, this.tail.y, other.x, other.y);
    this.world.extra.push(new Constraint(this.tip, other, { len: Math.max(2, d1 * 0.5) }));
    this.world.extra.push(new Constraint(this.tail, other, { len: Math.max(this.len * 0.6, d2 * 0.9) }));
    return true;
  }
  draw(ctx) {
    const a = this.tip, b = this.tail;
    const ang = Math.atan2(a.y - b.y, a.x - b.x);
    ctx.save();
    ctx.translate(b.x, b.y); ctx.rotate(ang);
    const L = this.len;
    if (this.type === 'knife') {
      ctx.fillStyle = '#3a2a22'; ctx.fillRect(0, -2.5, L * 0.38, 5);
      ctx.fillStyle = '#d9dce4';
      ctx.beginPath(); ctx.moveTo(L * 0.38, -3); ctx.lineTo(L, 0); ctx.lineTo(L * 0.38, 3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
    } else {
      ctx.strokeStyle = '#7a4e25'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L * 0.72, 0); ctx.stroke();
      ctx.fillStyle = '#e8c04a'; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(L * 0.66, -7); ctx.lineTo(L + 2, 0); ctx.lineTo(L * 0.66, 7); ctx.lineTo(L * 0.74, 0); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4f7a3a';
      ctx.beginPath(); ctx.ellipse(L * 0.7, 0, 3.2, 2.2, 0, 0, TAU); ctx.fill(); // the beetle
      ctx.fillStyle = '#b8323c';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8, -5); ctx.lineTo(12, 0); ctx.lineTo(8, 5); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}
