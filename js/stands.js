'use strict';
/* =====================================================================
   Stands — the Stand class (movement, hitting, timers, AI) and MOVES,
   a registry of every ability. Stand definitions (standdefs.js) map
   the J / K / L keys to move names; the AI reads each move's `ai` hint.
   ===================================================================== */

const BARRAGE_DEFAULT = {
  dur: 1.3, interval: 0.045, dmg: 1.2, radius: 25, reach: 26, vx: 230, vy: -40, style: 'fists',
  finisher: { dmg: 20, vx: 1500, vy: -380, radius: 36, stun: 1.8, breakChance: 0.12 },
};

class Stand {
  constructor(user, def, quiet = false) {
    this.user = user;
    this.def = def;
    this.world = user.world;
    const c = user.p.chest;
    this.x = c.x; this.y = c.y - 20;
    this.alpha = 0;
    this.facing = user.facing;
    this.state = 'idle';
    this.stateT = 0;
    this.stateDur = 0;
    this.hitT = 0;
    this.cryT = 0;
    // Big abilities start half-charged so fights build up instead of opening with an ultimate.
    this.cd = { J: 0.5, K: (def.cd.K || 8) * 0.5, L: 1.5 };
    this.t = rand(0, 10);
    this.timers = [];
    this.buff = {};
    this.bomb = null;
    this.bombAge = 0;
    this.rollerUsed = false;
    this.erasing = false;
    this.aim = { x: 1, y: 0 };
    this.fingerLen = 0;
    this.line = null;
    this.bar = null;
    this.planeDir = user.facing;
    this.summon = null;
    if (!quiet) this.world.emit('standappear', this);
  }

  get active() { return this.state !== 'idle'; }

  // ------------------------------------------------------------ input
  use(key) {
    const u = this.user, w = this.world;
    if (!u.canAct() || u.frozen || this.alpha < 0.5 || this.state !== 'idle') return false;
    const name = this.def.moves[key];
    const mv = MOVES[name];
    if (!mv) return false;
    if (name === 'timeStop' && w.timeStop && w.timeStop.owner === u) {
      if (!this.def.tsAlt || this.rollerUsed) return false;
      return MOVES[this.def.tsAlt].run(this) !== false;
    }
    if (name === 'bombTouch' && this.bomb && !this.bomb.removed) return MOVES.detonate.run(this) !== false;
    if (this.cd[key] > 0) return false;
    if (u.isClone && name === 'clone') return false;
    if (mv.can && !mv.can(this)) return false;
    const ok = mv.run(this, key) !== false;
    if (ok) this.cd[key] = this.def.cd[key] ?? 3;
    return ok;
  }

  labelFor(key) {
    const name = this.def.moves[key], w = this.world;
    if (name === 'timeStop' && this.def.tsAlt && w.timeStop && w.timeStop.owner === this.user && !this.rollerUsed) return 'Road Roller!';
    if (name === 'bombTouch' && this.bomb && !this.bomb.removed) return 'Detonate!';
    return this.def.labels[key];
  }
  cooldownFrac(key) {
    const name = this.def.moves[key], w = this.world;
    if (name === 'timeStop' && this.def.tsAlt && w.timeStop && w.timeStop.owner === this.user && !this.rollerUsed) return 0;
    if (name === 'bombTouch' && this.bomb && !this.bomb.removed) return 0;
    return clamp(this.cd[key] / (this.def.cd[key] || 1), 0, 1);
  }

  act(state, dur = 0.4) { this.state = state; this.stateT = 0; this.stateDur = dur; }
  after(t, fn) { this.timers.push({ t, fn }); }

  // ------------------------------------------------------------ update
  update(dt) {
    const u = this.user, w = this.world, d = this.def;
    const rate = u.has('slow') ? 0.3 : (w.accel && w.accel.owner === u ? 2 : 1);
    for (const k in this.cd) if (this.cd[k] > 0) this.cd[k] -= dt * rate;
    for (const k in this.buff) {
      if (this.buff[k] > 0) { this.buff[k] -= dt; if (this.buff[k] <= 0) this.onBuffEnd(k); }
    }
    this.t += dt;

    if (u.dead || u.removed || !JOJO.enabled) {
      this.alpha -= dt * 2;
      this.line = null;
      if (u.dead) { this.state = 'idle'; this.bomb = null; this.timers.length = 0; }
      if (this.alpha <= 0) {
        this.alpha = 0;
        if (u.dead || u.removed) u.stand = null;
      }
      if (!JOJO.enabled || u.dead) return;
    } else {
      this.alpha = Math.min(1, this.alpha + dt * 2.5);
    }

    if (this.bomb) { this.bombAge += dt; if (this.bomb.removed) this.bomb = null; }

    // King Crimson: when the erased time ends, reappear behind the target.
    if (this.erasing && !w.erase) {
      this.erasing = false;
      u.intangible = false;
      u.speedMul = 1;
      const t = u.findEnemy(700);
      if (t) {
        u.teleportTo(t.p.pelvis.x - t.facing * 44);
        u.facing = Math.sign(t.p.pelvis.x - u.p.pelvis.x) || 1;
      }
      w.fx.text(0, 0, 'Time has been erased...', { screen: true, size: 34, color: d.accent, stroke: d.dark, life: 1.6, vy: 0, vx: 0, rot: 0 });
    }

    for (let i = this.timers.length - 1; i >= 0; i--) {
      const tm = this.timers[i];
      tm.t -= dt;
      if (tm.t <= 0) { this.timers.splice(i, 1); tm.fn(); }
    }

    if (this.line) {
      this.line.t += dt;
      if (this.line.follow && this.line.follow.p) { this.line.x = this.line.follow.p.chest.x; this.line.y = this.line.follow.p.chest.y; }
      if (this.line.t > this.line.dur) this.line = null;
    }

    const c = u.p.chest, f = u.facing;
    this.facing = f;
    let tx, ty;
    const special = d.art && d.art.special;
    if (special === 'plane') {
      tx = c.x + Math.cos(this.t * 1.6) * 46; ty = c.y - 80 + Math.sin(this.t * 3) * 8;
      if (this.state === 'idle') this.planeDir = -Math.sin(this.t * 1.6) >= 0 ? 1 : -1;
      else this.planeDir = f;
    } else if (this.state === 'idle') { tx = c.x - f * 22; ty = c.y - 26 + Math.sin(this.t * 2.2) * 3; }
    else { tx = c.x + f * 32; ty = c.y - 10; }
    const k = Math.min(1, dt * 14);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;

    if (this.state === 'idle') return;
    this.stateT += dt;
    if (this.state === 'barrage') this.tickBarrage(dt);
    else if (this.state === 'finger') {
      const T = this.stateT;
      this.fingerLen = T < 0.12 ? (T / 0.12) * 190 : T < 0.25 ? 190 : Math.max(0, 190 * (1 - (T - 0.25) / 0.15));
    }
    if (this.state !== 'barrage' && this.stateT >= this.stateDur) { this.state = 'idle'; this.fingerLen = 0; }
  }

  onBuffEnd(k) {
    if (k === 'armorOff') this.user.speedMul = 1;
  }

  // ------------------------------------------------------------ targeting helpers
  foe(maxDist = 600) {
    const u = this.user, t = u.target;
    if (t && t.alive && !t.intangible && t.team !== u.team &&
        dist(t.p.chest.x, t.p.chest.y, u.p.chest.x, u.p.chest.y) <= maxDist) return t;
    return u.findEnemy(maxDist);
  }
  faceTo(t) { if (t) this.user.facing = Math.sign(t.p.pelvis.x - this.user.p.pelvis.x) || this.user.facing; this.facing = this.user.facing; }
  aimFrom(x, y, t) {
    if (!t) return this.user.facing > 0 ? 0 : Math.PI;
    return Math.atan2(t.p.chest.y - y, t.p.chest.x - x);
  }
  shoot(type, x, y, ang, speed, o = {}) {
    const w = this.world, u = this.user;
    const pr = new Projectile(w, u, x, y, Math.cos(ang) * speed, Math.sin(ang) * speed, type, o);
    if (w.timeStop && w.timeStop.owner === u) pr.tsFlight = 0.26;
    w.add(pr);
    return pr;
  }
  setLine(target, color, dur = 0.3, thorns = false) {
    this.line = { x: target.p.chest.x, y: target.p.chest.y, follow: target, color, t: 0, dur, thorns };
  }

  // ------------------------------------------------------------ hitting
  /** Hit everything (except the user's side) near (cx, cy). Returns the bodies hit. */
  hit(cx, cy, radius, vx, vy, dmg, o = {}) {
    const w = this.world, u = this.user, out = [];
    for (const b of w.bodies) {
      if (b === u || b.removed || b.intangible || b.kind === 'zone') continue;
      if (b.team != null && b.team === u.team) continue;
      if (b.owner === u) continue;
      if (o.exclude && o.exclude.has(b)) continue;
      let hp = null, hd = Infinity;
      for (const p of b.particles) {
        if (p.ghost) continue;
        const d = dist(cx, cy, p.x, p.y) - p.r;
        if (d < radius && d < hd) { hd = d; hp = p; }
      }
      if (!hp && b.poly && pointInPoly(cx, cy, b.poly)) hp = b.poly[0];
      if (!hp) continue;
      out.push(b);
      b._hitP = hp;
      const m = b.heavy ? 0.12 : 1;
      if (b.kind === 'ragdoll') b.hitBy(u);
      if (o.whole) for (const p of b.particles) p.addVel(vx * m * 0.8, vy * m * 0.8);
      else for (const p of b.particles) if (dist(cx, cy, p.x, p.y) - p.r < radius * 1.7) p.addVel(vx * m, vy * m);
      hp.addVel(vx * m * 0.4, vy * m * 0.4);
      if (b.damage && dmg) b.damage(dmg, hp, vx, vy);
      if (b.kind === 'ragdoll') {
        if (o.stun) b.stun = Math.max(b.stun, o.stun);
        if (o.breakChance && Math.random() < o.breakChance) b.breakJoint(LIMBS[(Math.random() * 4) | 0]);
      }
      w.fx.spark(hp.x, hp.y, o.sparks || 3, o.sparkColor || this.def.accent);
    }
    return out;
  }

  /** Sweep a line and hit the first thing on it. */
  lineHit(sx, sy, ang, len, width, speed, dmg, o = {}) {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    for (let s = 0; s <= len; s += 8) {
      const hits = this.hit(sx + dx * s, sy + dy * s, width, dx * speed, dy * speed - (o.lift || 0), dmg, o);
      if (hits.length) return { hits, x: sx + dx * s, y: sy + dy * s };
    }
    return { hits: [], x: sx + dx * len, y: sy + dy * len };
  }

  /** Generic delayed melee strike. */
  strike(o) {
    const w = this.world;
    this.act(o.state || 'punch', o.dur || 0.42);
    this.after(o.delay ?? 0.16, () => {
      const f = this.facing;
      const cx = this.x + f * (o.reach ?? 34), cy = this.y + (o.dy || 0);
      const hits = this.hit(cx, cy, o.radius ?? 32, f * (o.vx ?? 1200), o.vy ?? -300, o.dmg ?? 16,
        { whole: true, stun: o.stun, breakChance: o.breakChance, sparks: 10, sparkColor: o.sparkColor });
      if (hits.length) {
        if (o.big !== false) {
          SFX.bigPunch();
          w.shake = Math.max(w.shake, 8);
          w.fx.ring(cx, cy, 8, 55, 0.3, o.ringColor || this.def.accent, 5);
        } else SFX.punch(0.8);
      } else SFX.punch(0.5);
      if (o.slash) w.fx.slash(cx - f * 30, cy - 34, cx + f * 34, cy + 30, this.def.color, 0.35, 7);
      if (o.cry !== false && this.def.cry) this.cry(this.def.cry + '!', 50, { color: this.def.accent });
      if (o.text) w.fx.text(cx, cy - 60, o.text, { size: o.textSize || 26, color: o.textColor || this.def.accent });
      if (o.onHit) for (const b of hits) o.onHit(this, b);
    });
  }

  clashFoe() {
    for (const r of this.world.ragdolls()) {
      const s = r.stand;
      if (!s || s === this || s.state !== 'barrage' || r.dead || r.team === this.user.team) continue;
      if (dist(s.x, s.y, this.x, this.y) < 95) return s;
    }
    return null;
  }

  cry(str, size = rand(24, 40), extra = {}) {
    const f = this.facing;
    this.world.fx.text(this.x + f * rand(10, 70), this.y + rand(-50, 20), str, {
      size, color: extra.color || this.def.color, stroke: '#140a1f', life: extra.life || 0.7,
      vx: f * rand(20, 80), vy: rand(-80, -30), ...extra,
    });
  }

  say(text, size = 30, color = null) {
    this.world.fx.text(this.user.p.head.x, this.user.p.head.y - 50, text, { size, color: color || this.def.accent, life: 1.2, vy: -30 });
  }
  callout(text, size = 56, color = null) {
    this.world.fx.text(0, -30, text, { screen: true, size, color: color || this.def.accent, stroke: '#140a1f', life: 1.6, vx: 0, vy: 0, rot: rand(-0.06, 0.06) });
  }

  // ------------------------------------------------------------ barrage
  startBarrage() {
    const b = this.def.barrage || {};
    this.bar = { ...BARRAGE_DEFAULT, ...b, finisher: { ...BARRAGE_DEFAULT.finisher, ...(b.finisher || {}) } };
    this.act('barrage', this.bar.dur);
    this.hitT = 0; this.cryT = 0;
    if (this.def.voice.rush) Voice.say(this.def.voice.rush, this.def.voice.pitch, 1.5);
  }
  tickBarrage(dt) {
    const f = this.facing, d = this.def, B = this.bar;
    this.hitT -= dt; this.cryT -= dt;
    const foe = this.clashFoe();
    const fast = (this.buff.armorOff > 0 ? 0.6 : 1) * (this.world.accel && this.world.accel.owner === this.user ? 0.6 : 1);
    if (this.hitT <= 0) {
      this.hitT = B.interval * fast;
      const cx = this.x + f * B.reach, cy = this.y + rand(-10, 16);
      const ex = foe ? new Set([foe.user]) : null;
      const hits = this.hit(cx, cy, B.radius, f * B.vx, B.vy, B.dmg, { exclude: ex, sparks: 2 });
      if (hits.length) { SFX.punch(0.8); if (B.onHit) for (const b of hits) B.onHit(this, b, false); }
      if (foe) {
        const mx = (this.x + foe.x) / 2, my = (this.y + foe.y) / 2;
        this.world.fx.spark(mx, my + rand(-15, 15), 4, '#fff', 520);
        SFX.punch(0.6);
      }
    }
    if (this.cryT <= 0 && B.cry !== '' && (B.cry || d.cry)) {
      this.cryT = 0.1;
      const c = B.cry || d.cry;
      this.cry(Math.random() < 0.2 ? c + 'AA' : c);
    }
    if (this.stateT > B.dur) {
      const F = B.finisher;
      const cx = this.x + f * (B.reach + 4), cy = this.y;
      const hits = this.hit(cx, cy, F.radius, f * F.vx, F.vy, F.dmg, { whole: true, stun: F.stun, breakChance: F.breakChance, sparks: 12 });
      const txt = F.text || ((B.cry || d.cry) ? (B.cry || d.cry) + '!!' : null);
      if (txt) this.cry(txt, 66, { color: d.accent, life: 1.1, rot: rand(-0.2, 0.2) });
      if (hits.length) {
        SFX.bigPunch();
        this.world.shake = Math.max(this.world.shake, 12);
        this.world.fx.ring(cx, cy, 10, 70, 0.35, d.accent, 6);
        if (B.onHit) for (const b of hits) B.onHit(this, b, true);
      }
      this.act('recover', 0.3);
    }
  }

  // ------------------------------------------------------------ AI
  ai(t, adx, dir, dt) {
    const u = this.user, w = this.world, d = this.def;
    u.moveDir = 0;
    if (this.state !== 'idle' || !u.canAct()) return;
    // Killer Queen: keep away from the bomb, then click.
    if (this.bomb && !this.bomb.removed) {
      if (this.bombAge > 2.5 || adx > 160) { this.use('K'); return; }
      u.moveDir = -dir;
      return;
    }
    const inOwnTS = w.timeStop && w.timeStop.owner === u;
    if (inOwnTS && d.tsAlt && !this.rollerUsed && w.timeStop.t > 1.8 && Math.random() < dt * 1.2) { this.use('K'); return; }
    for (const key of ['K', 'L', 'J']) {
      const mv = MOVES[d.moves[key]];
      const a = mv && mv.ai;
      if (!a || this.cd[key] > 0) continue;
      if (adx < (a.min || 0) || adx > (a.max ?? 9999)) continue;
      if (mv.can && !mv.can(this)) continue;
      if (a.when && !a.when(this, t)) continue;
      if (Math.random() < (a.p || 1) * dt) { u.facing = dir; this.facing = dir; if (this.use(key)) return; }
    }
    const pref = d.range || 55;
    if (adx > pref + 12) u.moveDir = dir;
    else if (adx < pref - 50 || adx < 26) u.moveDir = -dir;
    if (u.moveDir && Math.random() < 0.25 * dt) u.jumpReq = true;
  }
}

// =====================================================================
//   MOVES — run(stand) performs the ability (return false = not used,
//   no cooldown). ai: { min, max, p (tries/sec), when(stand, target) }.
// =====================================================================
const hurtAllyNear = (s) => s.world.ragdolls().some(o => o !== s.user && o.team !== s.user.target?.team &&
  (o.hp < o.maxHp * 0.6 || o.brokenGroups.size) && dist(o.p.chest.x, o.p.chest.y, s.user.p.chest.x, s.user.p.chest.y) < 240);

const MOVES = {
  // ---------------------------------------------------------- melee basics
  barrage: { run: s => s.startBarrage(), ai: { max: 64, p: 3 } },
  punch: { run: s => s.strike({ dmg: 16 }), ai: { max: 62, p: 2 } },
  lightPunch: { run: s => s.strike({ dmg: 9, vx: 600, vy: -160, stun: 0.4, radius: 28, big: false }), ai: { max: 58, p: 3 } },
  chop: { run: s => s.strike({ state: 'chop', delay: 0.2, dmg: 34, vx: 800, vy: -200, stun: 1.6, breakChance: 0.2, slash: true, cry: false }), ai: { max: 62, p: 2 } },

  // ---------------------------------------------------------- Star Platinum / The World
  starFinger: {
    run(s) {
      const t = s.foe(260);
      const hx = s.x, hy = s.y - 6;
      if (t) {
        const dx = t.p.chest.x - hx, dy = t.p.chest.y - hy, l = Math.hypot(dx, dy) || 1;
        s.aim = { x: dx / l, y: dy / l };
        s.faceTo(t);
      } else s.aim = { x: s.user.facing, y: 0 };
      s.act('finger', 0.4);
      s.world.fx.text(s.x, s.y - 60, 'STAR FINGER!', { size: 30, color: s.def.accent });
      s.after(0.12, () => {
        const sx = s.x + s.aim.x * 14, sy = s.y - 6 + s.aim.y * 14;
        const r = s.lineHit(sx, sy, Math.atan2(s.aim.y, s.aim.x), 190, 10, 1000, 18, { stun: 1, sparks: 8, lift: 200 });
        if (r.hits.length) SFX.bigPunch();
      });
    },
    ai: { min: 70, max: 190, p: 1.2 },
  },
  timeStop: {
    can: s => !s.world.timeStop && !s.world.erase && !s.world.accel,
    run(s) {
      s.rollerUsed = false;
      s.user.pose = s.def.pose;
      s.user.poseTimer = 0.9;
      s.world.startTimeStop(s.user, s.def.tsDur, s.def);
    },
    ai: { max: 320, p: 0.6 },
  },
  roadRoller: {
    run(s) {
      const u = s.user, w = s.world;
      const t = s.foe(900);
      const x = clamp(t ? t.p.pelvis.x : u.p.pelvis.x + u.facing * 160, 100, w.width - 100);
      const rr = new RoadRoller(w, x, -140);
      rr.owner = u; rr.tsActive = 3;
      for (const p of rr.particles) p.setVel(0, 900);
      w.add(rr);
      s.rollerUsed = true;
      w.fx.text(0, -40, 'ROAD ROLLER DA!!', { screen: true, size: 64, color: '#f2c230', stroke: '#3a2a08', life: 1.6, vx: 0, vy: 0, rot: -0.06 });
      Voice.say('road roller da!', s.def.voice.pitch, 1.1);
    },
  },
  knives: {
    run(s) {
      const u = s.user, w = s.world, hand = u.p.fHand;
      const t = s.foe(700);
      const ang = s.aimFrom(hand.x, hand.y, t);
      if (t) s.faceTo(t);
      const inTS = w.timeStop && w.timeStop.owner === u;
      for (let i = -2; i <= 2; i++) {
        const a = ang + i * 0.08;
        const k = new Stick(w, hand.x + Math.cos(a) * 22, hand.y + Math.sin(a) * 22, a, 'knife');
        k.owner = u;
        k.tsFlight = inTS ? 0.26 : 0;
        for (const p of k.particles) p.setVel(Math.cos(a) * 1300, Math.sin(a) * 1300);
        w.add(k);
      }
      SFX.knife();
      s.cry('MUDA!', 40, { color: s.def.accent });
      s.act('cast', 0.3);
    },
    ai: { min: 140, max: 480, p: 1.4 },
  },

  // ---------------------------------------------------------- Killer Queen
  bombTouch: {
    run(s) {
      const u = s.user, w = s.world, f = u.facing;
      const cx = u.p.chest.x + f * 36, cy = u.p.chest.y;
      let best = null, bd = 60;
      for (const b of w.bodies) {
        if (b === u || b.removed || b.intangible || b.kind === 'zone' || b.kind === 'proj') continue;
        for (const p of b.particles) { const d = dist(cx, cy, p.x, p.y) - p.r; if (d < bd) { bd = d; best = b; } }
        if (b.poly && pointInPoly(cx, cy, b.poly)) { best = b; bd = 0; }
      }
      if (!best) { w.fx.text(s.x, s.y - 40, 'nothing to touch...', { size: 20, color: '#ddd' }); return false; }
      s.bomb = best; s.bombAge = 0;
      s.act('touch', 0.35);
      SFX.click();
      w.fx.text(s.x + f * 20, s.y - 50, 'Killer Queen has already touched it.', { size: 20, color: s.def.color, life: 1.4, vy: -25 });
    },
    ai: { max: 64, p: 3 },
  },
  detonate: {
    run(s) {
      if (!s.bomb || s.bomb.removed) { s.bomb = null; return false; }
      s.act('detonate', 0.5);
      SFX.click();
      s.world.fx.text(s.x, s.y - 64, '*click*', { size: 30, color: '#fff' });
      Voice.say('killer queen', s.def.voice.pitch, 1.0);
      s.after(0.3, () => {
        const b = s.bomb, w = s.world;
        s.bomb = null;
        if (!b || b.removed) return;
        const c = b.kind === 'ragdoll' ? { x: b.p.chest.x, y: b.p.chest.y } : b.center();
        if (b.kind === 'ragdoll') { b.hitBy(s.user); b.damage(300, b.p.chest); b.gib(); w.explode(c.x, c.y, 110, 900, s.user); }
        else { w.remove(b); w.explode(c.x, c.y, 150, 1400, s.user); }
        w.fx.text(c.x, c.y - 70, 'KILLER QUEEN!', { size: 44, color: s.def.color, life: 1.2 });
      });
    },
  },
  sheerHeartAttack: {
    can: s => !(s.summon && !s.summon.removed),
    run(s) {
      const u = s.user, w = s.world;
      s.summon = w.add(new SheerHeartAttack(w, u, u.p.pelvis.x + u.facing * 30, w.groundY - 12));
      s.callout('SHEER HEART ATTACK!', 52, s.def.color);
      s.act('cast', 0.3);
    },
    ai: { min: 90, max: 700, p: 0.6 },
  },

  // ---------------------------------------------------------- Crazy Diamond / King Crimson
  restore: {
    run(s) {
      const u = s.user, w = s.world, c = u.p.chest;
      let n = 0;
      for (const r of w.ragdolls()) {
        if (r === u) continue; // Crazy Diamond can't heal its own user
        if (dist(r.p.chest.x, r.p.chest.y, c.x, c.y) < 260) {
          r.restore(); n++;
          w.fx.spark(r.p.chest.x, r.p.chest.y, 10, '#ff9ad2', 300);
        }
      }
      w.fx.ring(c.x, c.y, 10, 260, 0.7, '#ff8fd0', 6);
      s.act('touch', 0.35);
      SFX.heal();
      s.cry(n ? 'DORARARA!' : 'DORA?', 44, { color: s.def.accent });
    },
    ai: { p: 0.5, when: s => hurtAllyNear(s) },
  },
  timeErase: {
    can: s => !s.world.erase && !s.world.timeStop && !s.world.accel,
    run(s) {
      const u = s.user, w = s.world;
      w.erase = { owner: u, t: 0, dur: 3.2 };
      s.erasing = true;
      u.intangible = true;
      u.speedMul = 1.6;
      s.callout('KING CRIMSON!', 70, s.def.color);
      SFX.erase();
      Voice.say('king crimson', s.def.voice.pitch, 0.9);
    },
    ai: { p: 0.3, when: s => s.user.hp < s.user.maxHp * 0.7 || Math.random() < 0.3 },
  },
  epitaph: {
    run(s) {
      const u = s.user, w = s.world;
      const t = s.foe(650);
      if (!t) return false;
      const ox = u.p.chest.x, oy = u.p.chest.y;
      u.teleportTo(t.p.pelvis.x - t.facing * 44);
      s.faceTo(t);
      w.fx.ring(ox, oy, 40, 4, 0.35, s.def.color, 5);
      w.fx.ring(u.p.chest.x, u.p.chest.y, 4, 50, 0.35, s.def.color, 5);
      w.fx.text(u.p.chest.x, u.p.chest.y - 70, 'Epitaph', { size: 26, color: s.def.accent, stroke: s.def.dark });
      SFX.blink();
    },
    ai: { min: 200, max: 650, p: 1.2 },
  },

  // ---------------------------------------------------------- Magician's Red
  firePunch: {
    run: s => s.strike({ dmg: 12, vx: 900, sparkColor: '#ff8a2a', ringColor: '#ff6a2a', onHit: (st, b) => b.addStatus && b.addStatus('burn', 3, st.user) }),
    ai: { max: 62, p: 2.5 },
  },
  crossfire: {
    run(s) {
      const u = s.user, t = s.foe(600), h = u.p.fHand;
      if (t) s.faceTo(t);
      const ang = s.aimFrom(h.x, h.y, t);
      const boom = (pr) => { s.world.fx.flash(pr.p.x, pr.p.y, 40, 0.25, 'rgba(255,160,60,1)'); s.world.fx.fire(pr.p.x, pr.p.y, 6); };
      s.shoot('fire', h.x, h.y, ang, 720, { r: 10, dmg: 14, status: ['burn', 4], grav: 0.1, onEnd: boom, life: 2 });
      for (const off of [-0.2, 0.2]) s.shoot('fire', h.x, h.y, ang + off, 650, { r: 6, dmg: 7, status: ['burn', 3], grav: 0.1, onEnd: boom, life: 2 });
      s.callout('CROSSFIRE HURRICANE!', 48, '#ff8a2a');
      s.act('cast', 0.35);
      SFX.explosion();
    },
    ai: { min: 90, max: 450, p: 1 },
  },
  redBind: {
    run(s) {
      const t = s.foe(320);
      if (!t) return false;
      s.faceTo(t);
      t.hitBy(s.user);
      t.addStatus('bound', 3, s.user, { color: '#e84a2a' });
      t.addStatus('burn', 3, s.user);
      s.setLine(t, '#ff6a2a', 0.35);
      s.say('RED BIND!', 30, '#ff8a2a');
      s.act('cast', 0.35);
    },
    ai: { max: 300, p: 0.8 },
  },

  // ---------------------------------------------------------- Hierophant Green
  emeraldSplash: {
    run(s) {
      const u = s.user, t = s.foe(600), h = u.p.fHand;
      if (t) s.faceTo(t);
      const ang = s.aimFrom(h.x, h.y, t);
      for (let i = 0; i < 9; i++) s.shoot('emerald', h.x, h.y, ang + rand(-0.32, 0.32), rand(850, 1050), { dmg: 4.5, life: 1.4, knock: 180 });
      s.callout('EMERALD SPLASH!', 50, '#3fe07a');
      s.act('cast', 0.35);
      SFX.knife();
    },
    ai: { min: 80, max: 520, p: 1.4 },
  },
  emeraldBarrier: {
    can: s => !(s.summon && !s.summon.removed),
    run(s) {
      const u = s.user, w = s.world;
      s.summon = w.add(new EmeraldBarrier(w, u, u.p.chest.x, w.groundY - 40));
      s.callout('20m EMERALD SPLASH!', 50, '#3fe07a');
      s.act('cast', 0.4);
    },
    ai: { max: 400, p: 0.5 },
  },
  tentacle: {
    run(s) {
      const t = s.foe(200);
      if (!t) return false;
      s.faceTo(t);
      const u = s.user, dir = Math.sign(u.p.chest.x - t.p.chest.x) || 1;
      t.hitBy(u);
      for (const p of t.particles) p.addVel(dir * 780, -220);
      t.damage(8, t.p.chest);
      t.stun = Math.max(t.stun, 0.6);
      s.setLine(t, '#3fe07a', 0.3);
      s.act('cast', 0.3);
    },
    ai: { min: 70, max: 190, p: 1.5 },
  },

  // ---------------------------------------------------------- Silver Chariot
  armorOff: {
    can: s => !(s.buff.armorOff > 0),
    run(s) {
      s.buff.armorOff = 6;
      s.user.speedMul = 1.7;
      s.say('ARMOR OFF!', 32);
      s.world.fx.spark(s.x, s.y, 16, '#e8ecf4', 500);
      SFX.knife();
    },
    ai: { max: 300, p: 0.3 },
  },
  swordLaunch: {
    run(s) {
      const u = s.user, t = s.foe(600), h = u.p.fHand;
      if (t) s.faceTo(t);
      s.shoot('blade', h.x, h.y, s.aimFrom(h.x, h.y, t), 1450, { dmg: 22, knock: 500, life: 1.2 });
      s.say('Silver Chariot!', 26);
      s.act('cast', 0.3);
      SFX.knife();
    },
    ai: { min: 90, max: 450, p: 1 },
  },

  // ---------------------------------------------------------- Hermit Purple
  vineWhip: {
    run(s) {
      const u = s.user, t = s.foe(200), h = u.p.fHand;
      if (t) s.faceTo(t);
      const ang = s.aimFrom(h.x, h.y, t);
      const r = s.lineHit(h.x, h.y, ang, 170, 12, 700, 11, { stun: 0.6, lift: 150 });
      s.line = { x: r.x, y: r.y, color: s.def.color, t: 0, dur: 0.25, thorns: true };
      s.act('cast', 0.3);
      SFX.punch(1);
    },
    ai: { min: 30, max: 170, p: 2 },
  },
  vineGrab: {
    run(s) {
      const t = s.foe(280);
      if (!t) return false;
      s.faceTo(t);
      const u = s.user, dir = Math.sign(u.p.chest.x - t.p.chest.x) || 1;
      t.hitBy(u);
      for (const p of t.particles) p.addVel(dir * 850, -260);
      t.addStatus('bound', 1.3, u, { color: '#a060d8' });
      s.setLine(t, s.def.color, 0.5, true);
      s.say('HERMIT PURPLE!', 26);
      s.act('cast', 0.4);
    },
    ai: { min: 90, max: 280, p: 1 },
  },
  hamon: {
    run: s => s.strike({
      dmg: 22, sparkColor: '#ffe24a', ringColor: '#ffe24a', text: 'SUNLIGHT YELLOW OVERDRIVE!', textColor: '#ffe24a', cry: false,
      onHit: (st, b) => {
        if (b.design && b.design.vampire) { b.damage(38, b.p.chest); st.world.fx.text(b.p.head.x, b.p.head.y - 30, 'THE RIPPLE BURNS!', { size: 22, color: '#ffe24a' }); }
        if (b.kind === 'ragdoll') st.world.fx.spark(b.p.chest.x, b.p.chest.y, 16, '#ffe24a', 500);
      },
    }),
    ai: { max: 62, p: 2 },
  },

  // ---------------------------------------------------------- The Hand
  eraseSwipe: {
    run(s) {
      s.act('chop', 0.45);
      s.after(0.18, () => {
        const w = s.world, f = s.facing, u = s.user;
        const cx = s.x + f * 34, cy = s.y;
        let any = false;
        for (const b of w.bodies) {
          if (b === u || b.removed || b.intangible || b.kind === 'zone' || (b.team != null && b.team === u.team)) continue;
          let hp = null, hd = 34;
          for (const p of b.particles) { if (p.ghost) continue; const d = dist(cx, cy, p.x, p.y) - p.r; if (d < hd) { hd = d; hp = p; } }
          if (!hp && b.poly && pointInPoly(cx, cy, b.poly)) hp = b.poly[0];
          if (!hp) continue;
          any = true;
          if (b.kind !== 'ragdoll') { w.remove(b); continue; }
          b.hitBy(u);
          const g = PART_GROUP[hp.name];
          if (g && !b.erased.has(g)) { b.eraseLimb(g); b.damage(10, hp, 0, 0, true); b.stun = Math.max(b.stun, 0.8); }
          else b.damage(30, hp);
        }
        w.fx.slash(cx - f * 10, cy - 36, cx + f * 10, cy + 36, '#9fd8ff', 0.35, 10);
        w.fx.text(cx, cy - 50, 'ガオン!', { size: 38, color: '#9fd8ff', font: '"Yu Gothic", "Meiryo", sans-serif' });
        SFX.blink();
        if (any) w.shake = Math.max(w.shake, 6);
      });
    },
    ai: { max: 70, p: 2 },
  },
  spacePull: {
    run(s) {
      const t = s.foe(460);
      if (!t) return false;
      const u = s.user, w = s.world;
      s.faceTo(t);
      w.fx.ring(t.p.chest.x, t.p.chest.y, 40, 4, 0.3, '#9fd8ff', 4);
      t.teleportTo(u.p.pelvis.x + u.facing * 46);
      t.stun = Math.max(t.stun, 0.7);
      w.fx.text(t.p.chest.x, t.p.chest.y - 60, 'ガオン', { size: 34, color: '#9fd8ff' });
      s.act('chop', 0.4);
      SFX.blink();
    },
    ai: { min: 120, max: 460, p: 0.9 },
  },

  // ---------------------------------------------------------- Echoes
  threeFreeze: {
    run(s) {
      const t = s.foe(250);
      if (!t) return false;
      s.faceTo(t);
      t.hitBy(s.user);
      t.addStatus('heavy', 4, s.user);
      s.callout('3 FREEZE!', 58, s.def.accent);
      s.act('touch', 0.35);
      SFX.thud(3000);
    },
    ai: { max: 250, p: 0.8 },
  },
  soundEffect: {
    run(s) {
      const t = s.foe(320);
      if (!t) return false;
      s.faceTo(t);
      s.world.add(new SoundWord(s.world, s.user, t));
      s.say('ECHOES ACT2!', 26);
      s.act('cast', 0.3);
    },
    ai: { min: 60, max: 320, p: 0.8 },
  },

  // ---------------------------------------------------------- Heaven's Door
  bookify: {
    run(s) {
      const t = s.foe(110);
      if (!t) return false;
      s.faceTo(t);
      t.hitBy(s.user);
      t.addStatus('book', 4.5, s.user);
      s.callout("HEAVEN'S DOOR!", 54, s.def.accent);
      s.act('touch', 0.4);
      SFX.click();
    },
    ai: { max: 100, p: 1.5 },
  },
  writeCommand: {
    run(s) {
      const t = s.foe(130);
      if (!t) return false;
      if (!t.has('book')) return MOVES.bookify.run(s);
      s.faceTo(t);
      const u = s.user, dir = Math.sign(t.p.chest.x - u.p.chest.x) || 1;
      s.world.fx.text(t.p.head.x, t.p.head.y - 50, '"Fly backward at 70 km/h"', { size: 20, color: '#fff', life: 1.6, vy: -20 });
      s.act('touch', 0.4);
      s.after(0.35, () => {
        t.status.book = 0;
        for (const p of t.particles) p.addVel(dir * 1500, -350);
        t.stun = Math.max(t.stun, 1.2);
      });
    },
    ai: { max: 130, p: 2, when: (s, t) => t.has('book') },
  },

  // ---------------------------------------------------------- Gold Experience / Requiem
  lifeGiver: {
    run(s) {
      const u = s.user, w = s.world;
      const t = s.foe(500);
      if (t) w.add(new LifeTree(w, u, t.p.pelvis.x));
      let frogs = 0;
      for (const b of w.bodies) {
        if (frogs >= 4 || b.removed || b.heavy) continue;
        if (!['box', 'ball', 'stick', 'proj'].includes(b.kind) || b.owner === u) continue;
        const c = b.center();
        if (dist(c.x, c.y, u.p.chest.x, u.p.chest.y) > 220) continue;
        w.remove(b); frogs++;
        w.add(new Frog(w, u, c.x, Math.min(c.y, w.groundY - 10)));
        w.fx.spark(c.x, c.y, 10, '#8fe07a', 300);
      }
      if (!t && !frogs) return false;
      s.callout('GOLD EXPERIENCE!', 54, s.def.accent);
      s.act('touch', 0.4);
      SFX.heal();
    },
    ai: { max: 500, p: 0.6 },
  },
  lifeOverload: {
    run: s => s.strike({ dmg: 10, vx: 500, text: 'Your senses are running wild...', textSize: 20, onHit: (st, b) => b.addStatus && b.addStatus('slow', 4, st.user) }),
    ai: { max: 62, p: 1.5 },
  },
  returnToZero: {
    can: s => !s.user.has('zero'),
    run(s) {
      s.user.addStatus('zero', 5, s.user);
      s.callout('GOLD EXPERIENCE REQUIEM', 46, '#f8e08a');
      s.world.fx.ring(s.user.p.chest.x, s.user.p.chest.y, 10, 120, 0.6, '#f8e08a', 6);
      SFX.awaken();
    },
    ai: { p: 0.8, when: s => s.user.hp < s.user.maxHp * 0.85 },
  },
  infiniteDeath: {
    run(s) {
      const t = s.foe(80);
      if (!t) return false;
      s.faceTo(t);
      t.hitBy(s.user);
      t.addStatus('doom', 6.5, s.user);
      s.world.fx.text(0, 10, 'You will never arrive at the truth.', { screen: true, size: 30, color: '#f8e08a', life: 2.2, vx: 0, vy: 0, rot: 0 });
      s.act('touch', 0.4);
    },
    ai: { max: 80, p: 1.2 },
  },

  // ---------------------------------------------------------- Sticky Fingers
  unzip: {
    run(s) {
      const t = s.foe(80);
      if (!t) return false;
      s.faceTo(t);
      const left = LIMBS.filter(g => !t.isBroken(g));
      if (!left.length) return false;
      const g = pick(left);
      t.hitBy(s.user);
      t.breakJoint(g, true);
      t.damage(6, t.p[STUMP[g]], 0, 0, true);
      for (const n of DETACH[g]) t.p[n].addVel(s.facing * 400, -300);
      s.world.fx.text(t.p.chest.x, t.p.chest.y - 50, 'ZIIIP!', { size: 30, color: '#d8dce8' });
      s.act('touch', 0.35);
      SFX.knife();
    },
    ai: { max: 80, p: 1.5 },
  },
  zipTravel: {
    run(s) {
      const t = s.foe(650);
      if (!t) return false;
      const u = s.user, w = s.world;
      u.intangible = true;
      w.fx.ring(u.p.pelvis.x, w.groundY, 30, 4, 0.35, '#d8dce8', 4);
      w.fx.text(u.p.chest.x, u.p.chest.y - 50, 'ZIP!', { size: 26, color: '#d8dce8' });
      s.after(0.35, () => {
        u.intangible = false;
        if (!t.alive) return;
        u.teleportTo(t.p.pelvis.x - t.facing * 44);
        s.faceTo(t);
        w.fx.ring(u.p.pelvis.x, w.groundY, 4, 30, 0.35, '#d8dce8', 4);
      });
      SFX.blink();
    },
    ai: { min: 150, max: 650, p: 0.8 },
  },

  // ---------------------------------------------------------- Sex Pistols
  gunShot: {
    run(s) {
      const u = s.user, t = s.foe(800), h = u.p.fHand;
      if (t) s.faceTo(t);
      s.shoot('bullet', h.x + u.facing * 10, h.y, s.aimFrom(h.x, h.y, t), 1600, { dmg: 12, homing: 7, homeDelay: 0.08, target: t, life: 1.5 });
      s.world.fx.text(h.x + u.facing * 20, h.y - 10, 'BANG!', { size: 20, color: '#fff' });
      SFX.punch(1.2);
      s.act('cast', 0.25);
    },
    ai: { min: 50, max: 800, p: 2.2 },
  },
  sixShots: {
    run(s) {
      const u = s.user, t = s.foe(800);
      if (t) s.faceTo(t);
      s.callout('SEX PISTOLS!', 52, s.def.color);
      s.act('cast', 0.7);
      for (let i = 0; i < 6; i++) {
        s.after(i * 0.1, () => {
          const h = u.p.fHand;
          s.shoot('bullet', h.x + u.facing * 10, h.y, s.aimFrom(h.x, h.y, t) + rand(-0.3, 0.3), 1500, { dmg: 9, homing: 6, homeDelay: 0.12, target: t, life: 1.6 });
          SFX.punch(1);
        });
      }
    },
    ai: { min: 50, max: 800, p: 0.8 },
  },
  pistolsKick: {
    can: s => s.world.bodies.some(b => b.kind === 'proj' && b.owner === s.user && !b.removed),
    run(s) {
      const t = s.foe(900);
      for (const b of s.world.bodies) {
        if (b.kind !== 'proj' || b.owner !== s.user || b.removed) continue;
        b.target = t; b.homing = 14; b.homeDelay = 0; b.speed *= 1.4; b.dmg *= 1.3;
        s.world.fx.spark(b.p.x, b.p.y, 3, '#f2d23a');
      }
      s.say('PASS PASS PASS!', 26, s.def.color);
    },
    ai: { p: 3 },
  },

  // ---------------------------------------------------------- Aerosmith
  machineGun: {
    run(s) {
      const u = s.user, t = s.foe(800);
      if (t) s.faceTo(t);
      s.callout('VOLARE VIA!', 50, s.def.accent);
      s.act('cast', 0.9);
      for (let i = 0; i < 12; i++) {
        s.after(i * 0.065, () => {
          const tt = t && t.alive ? t : null;
          const ang = s.aimFrom(s.x, s.y, tt) + rand(-0.08, 0.08);
          const marked = tt && tt.has('marked');
          s.shoot('bullet', s.x, s.y, ang, 1500, { dmg: 4, knock: 120, homing: marked ? 5 : 0, target: tt, life: 1.2 });
          SFX.punch(0.6);
        });
      }
    },
    ai: { min: 40, max: 800, p: 1.5 },
  },
  radar: {
    run(s) {
      let n = 0;
      for (const r of s.world.ragdolls()) {
        if (r === s.user || r.team === s.user.team || r.dead) continue;
        if (dist(r.p.chest.x, r.p.chest.y, s.user.p.chest.x, s.user.p.chest.y) < 800) { r.addStatus('marked', 7, s.user); n++; }
      }
      s.world.fx.ring(s.x, s.y, 5, 300, 0.8, '#ff5a3a', 3);
      s.say('CO2 RADAR!', 26, '#ff5a3a');
      if (!n) return false;
    },
    ai: { p: 0.5, when: (s, t) => !t.has('marked') },
  },
  bombDrop: {
    run(s) {
      const t = s.foe(700);
      if (!t) return false;
      s.faceTo(t);
      const w = s.world, T = 0.7;
      const vx = (t.p.chest.x - s.x) / T, vy = (t.p.chest.y - s.y - 0.5 * GRAVITY * T * T) / T;
      s.shoot('bomb', s.x, s.y, Math.atan2(vy, vx), Math.hypot(vx, vy), {
        grav: 1, dmg: 10, life: 3, onEnd: pr => w.explode(pr.p.x, pr.p.y, 100, 1100, s.user),
      });
      s.say('BOMB!', 26);
      s.act('cast', 0.3);
    },
    ai: { min: 60, max: 650, p: 0.8 },
  },

  // ---------------------------------------------------------- Purple Haze
  capsule: {
    run(s) {
      const u = s.user, t = s.foe(450), h = u.p.fHand, w = s.world;
      if (t) s.faceTo(t);
      const T = 0.55;
      const tx = t ? t.p.chest.x : h.x + u.facing * 200, ty = t ? t.p.chest.y : w.groundY - 30;
      const vx = (tx - h.x) / T, vy = (ty - h.y - 0.5 * GRAVITY * 0.6 * T * T) / T;
      s.shoot('capsule', h.x, h.y, Math.atan2(vy, vx), Math.hypot(vx, vy), {
        grav: 0.6, dmg: 3, life: 2.5, onEnd: pr => { w.add(new VirusCloud(w, u, pr.p.x, pr.p.y, 75, 4)); SFX.stab(); },
      });
      s.say('PURPLE HAZE!', 26);
      s.act('cast', 0.3);
    },
    ai: { min: 80, max: 420, p: 0.9 },
  },
  capsuleBurst: {
    run(s) {
      const u = s.user, w = s.world;
      w.add(new VirusCloud(w, u, s.x + s.facing * 60, s.y, 120, 5));
      s.callout('UBASHAAAA!!', 58, s.def.color);
      s.act('cast', 0.4);
      SFX.explosion();
    },
    ai: { max: 140, p: 0.5 },
  },

  // ---------------------------------------------------------- Spice Girl
  soften: {
    run(s) {
      const t = s.foe(90);
      if (!t) return false;
      s.faceTo(t);
      t.hitBy(s.user);
      t.addStatus('rubber', 5, s.user);
      for (const p of t.particles) p.addVel(s.facing * 900, -500);
      s.say('SOFTEN!', 28);
      s.act('touch', 0.35);
      SFX.punch(1);
    },
    ai: { max: 90, p: 1.5 },
  },
  softGround: {
    run(s) {
      const t = s.foe(420);
      if (!t) return false;
      const w = s.world;
      t.hitBy(s.user);
      for (const p of t.particles) p.addVel(rand(-80, 80), -1300);
      t.stun = Math.max(t.stun, 1);
      for (let i = 0; i < 3; i++) w.fx.ring(t.p.pelvis.x, w.groundY, 5 + i * 8, 60 + i * 20, 0.5 + i * 0.1, s.def.color, 3);
      s.say('SPICE GIRL!', 28);
      s.act('cast', 0.3);
    },
    ai: { min: 60, max: 420, p: 0.8 },
  },

  // ---------------------------------------------------------- Stone Free
  stringWeb: {
    run(s) {
      const t = s.foe(220);
      if (!t) return false;
      s.faceTo(t);
      t.hitBy(s.user);
      t.addStatus('bound', 3, s.user, { color: '#6ac8ff' });
      s.setLine(t, '#6ac8ff', 0.5);
      s.say('STONE FREE!', 28);
      s.act('cast', 0.35);
    },
    ai: { max: 220, p: 0.9 },
  },
  stringPull: {
    run(s) {
      const t = s.foe(360);
      if (!t) return false;
      s.faceTo(t);
      const u = s.user, dir = Math.sign(u.p.chest.x - t.p.chest.x) || 1;
      t.hitBy(u);
      for (const p of t.particles) p.addVel(dir * 900, -300);
      s.setLine(t, '#6ac8ff', 0.4);
      s.act('cast', 0.3);
    },
    ai: { min: 90, max: 360, p: 1 },
  },

  // ---------------------------------------------------------- Whitesnake
  discSteal: {
    run(s) {
      const t = s.foe(90);
      if (!t) return false;
      s.faceTo(t);
      const u = s.user, w = s.world;
      t.hitBy(u);
      const disc = s.shoot('disc', t.p.head.x, t.p.head.y, Math.atan2(u.p.chest.y - t.p.head.y, u.p.chest.x - t.p.head.x), 500, { ghost: true, life: 0.6 });
      disc.team = u.team;
      if (t.stand && t.standKey) {
        const name = t.stand.def.name;
        t.lostStand = t.standKey;
        t.standKey = null;
        t.stand = null;
        w.fx.text(t.p.head.x, t.p.head.y - 50, `STAND DISC: ${name}!`, { size: 24, color: '#f4f4f8', life: 1.6 });
      } else {
        t.addStatus('book', 4, u);
        w.fx.text(t.p.head.x, t.p.head.y - 50, 'MEMORY DISC!', { size: 26, color: '#f4f4f8' });
      }
      s.act('touch', 0.4);
      SFX.click();
    },
    ai: { max: 90, p: 1.5 },
  },
  acidFog: {
    run(s) {
      const u = s.user, w = s.world;
      let n = 0;
      for (const r of w.ragdolls()) {
        if (r === u || r.team === u.team) continue;
        if (dist(r.p.chest.x, r.p.chest.y, u.p.chest.x, u.p.chest.y) < 300) { r.addStatus('blind', 5, u); n++; }
      }
      w.fx.fog(u.p.chest.x, u.p.chest.y, 300);
      s.say('WHITESNAKE...', 26);
      if (!n) return false;
    },
    ai: { max: 280, p: 0.5 },
  },

  // ---------------------------------------------------------- C-MOON
  insideOut: {
    run: s => s.strike({
      dmg: 38, text: 'INSIDE OUT!', cry: false,
      onHit: (st, b) => { if (b.kind === 'ragdoll') { st.world.fx.blood(b.p.chest.x, b.p.chest.y, 30, 0, -200); b.stun = Math.max(b.stun, 1.5); } },
    }),
    ai: { max: 62, p: 1.6 },
  },
  gravityPush: {
    run(s) {
      const u = s.user, w = s.world, c = u.p.chest;
      for (const b of w.bodies) {
        if (b === u || b.removed || b.kind === 'zone' || (b.team != null && b.team === u.team)) continue;
        const bc = b.kind === 'ragdoll' ? b.p.chest : b.center();
        const dx = bc.x - c.x, dy = bc.y - c.y, d = Math.hypot(dx, dy) || 1;
        if (d > 240) continue;
        const k = (1 - d / 240) * (b.heavy ? 0.2 : 1);
        for (const p of b.particles) p.addVel((dx / d) * 1200 * k, -500 * k);
        if (b.kind === 'ragdoll') { b.hitBy(u); b.damage(8 * k + 2, b.p.chest); }
      }
      w.fx.ring(c.x, c.y, 10, 240, 0.5, s.def.color, 6);
      s.callout('C-MOON!', 56, s.def.accent);
      SFX.bigPunch();
    },
    ai: { max: 150, p: 1 },
  },
  gravityFlip: {
    run(s) {
      const u = s.user;
      let n = 0;
      for (const r of s.world.ragdolls()) {
        if (r === u || r.team === u.team) continue;
        if (dist(r.p.chest.x, r.p.chest.y, u.p.chest.x, u.p.chest.y) < 320) { r.hitBy(u); r.addStatus('float', 3, u); n++; }
      }
      if (!n) return false;
      s.say('The gravity... is reversed!', 24);
    },
    ai: { max: 300, p: 0.7 },
  },

  // ---------------------------------------------------------- Made in Heaven
  accelerate: {
    can: s => !s.world.accel && !s.world.timeStop && !s.world.erase,
    run(s) {
      s.world.accel = { owner: s.user, t: 0, dur: 14 };
      s.callout('MADE IN HEAVEN!!', 64, '#ffffff');
      Voice.say('made in heaven', s.def.voice.pitch, 0.9);
      SFX.awaken();
      s.world.emit('accel', s.world.accel);
    },
    ai: { max: 700, p: 0.4 },
  },
  blitz: {
    run(s) {
      const t = s.foe(520);
      if (!t) return false;
      const u = s.user, w = s.world;
      s.faceTo(t);
      const f = u.facing, x0 = u.p.pelvis.x, x1 = clamp(t.p.pelvis.x + f * 70, 30, w.width - 30);
      for (let x = x0; f > 0 ? x < x1 : x > x1; x += f * 20) {
        s.hit(x, u.p.chest.y, 26, f * 700, -250, 7, { sparks: 2 });
        w.fx.ring(x, u.p.chest.y, 4, 16, 0.25, '#ffffff', 2);
      }
      u.teleportTo(x1);
      u.facing = -f;
      w.fx.text(u.p.chest.x, u.p.chest.y - 60, '...', { size: 30, color: '#fff' });
      SFX.blink();
    },
    ai: { min: 70, max: 520, p: 1 },
  },

  // ---------------------------------------------------------- Tusk ACT4
  nailShot: {
    run(s) {
      const u = s.user, t = s.foe(800), h = u.p.fHand;
      if (t) s.faceTo(t);
      s.shoot('nail', h.x, h.y, s.aimFrom(h.x, h.y, t), 1500, { dmg: 16, knock: 350, life: 1.4 });
      s.say('TUSK!', 24);
      s.act('cast', 0.25);
      SFX.knife();
    },
    ai: { min: 60, max: 800, p: 2 },
  },
  infiniteRotation: {
    run(s) {
      const u = s.user, t = s.foe(800), h = u.p.fHand;
      if (t) s.faceTo(t);
      s.shoot('nail', h.x, h.y, s.aimFrom(h.x, h.y, t), 1100, { dmg: 10, homing: 5, target: t, status: ['spin', 6], life: 4, knock: 200 });
      s.callout('ACT4 — INFINITE ROTATION!', 44, s.def.color);
      s.act('cast', 0.35);
    },
    ai: { min: 60, max: 800, p: 0.7 },
  },

  // ---------------------------------------------------------- D4C
  clone: {
    can: s => !(s.summon && !s.summon.removed),
    run(s) {
      const u = s.user, w = s.world;
      const x = clamp(u.p.pelvis.x - u.facing * 40, 30, w.width - 30);
      const c = new Ragdoll(w, x, u.p.pelvis.y, {
        design: u.design, stand: s.def.id, quiet: true,
        team: u.team, clone: true, life: 12, hp: 90, name: `${u.name} (neighbor world)`, facing: u.facing,
      });
      c.aiDelay = 0.3;
      s.summon = w.add(c);
      w.fx.ring(x, u.p.chest.y, 4, 60, 0.5, s.def.color, 5);
      s.say('DOJYAAAN', 30);
    },
    ai: { p: 0.5 },
  },
  dimensionHop: {
    run(s) {
      const t = s.foe(700);
      if (!t) return false;
      const u = s.user, w = s.world;
      const ox = u.p.chest.x, oy = u.p.chest.y;
      u.teleportTo(t.p.pelvis.x - t.facing * 44);
      s.faceTo(t);
      w.fx.ring(ox, oy, 40, 4, 0.35, s.def.color, 5);
      w.fx.flag(u.p.chest.x, u.p.chest.y);
      w.fx.text(u.p.chest.x, u.p.chest.y - 70, '*between the flag*', { size: 20, color: '#fff' });
      SFX.blink();
    },
    ai: { min: 150, max: 700, p: 0.8 },
  },

  // ---------------------------------------------------------- Soft & Wet
  bubbleFriction: {
    run(s) {
      const u = s.user, t = s.foe(500), h = u.p.fHand;
      if (t) s.faceTo(t);
      s.shoot('bubble', h.x, h.y, s.aimFrom(h.x, h.y, t), 480, { dmg: 3, homing: 2.5, target: t, status: ['slip', 4], life: 2.5, knock: 60 });
      s.say('PLUNDER: FRICTION', 22);
      s.act('cast', 0.3);
    },
    ai: { min: 40, max: 460, p: 1 },
  },
  bubbleSight: {
    run(s) {
      const u = s.user, t = s.foe(500), h = u.p.fHand;
      if (t) s.faceTo(t);
      s.shoot('bubble', h.x, h.y, s.aimFrom(h.x, h.y, t), 480, { dmg: 3, homing: 2.5, target: t, status: ['blind', 5], life: 2.5, knock: 60 });
      s.say('PLUNDER: SIGHT', 22);
      s.act('cast', 0.3);
    },
    ai: { min: 40, max: 460, p: 0.8, when: (s, t) => !t.has('blind') },
  },
};
