'use strict';
/* =====================================================================
   Projectiles, zones and summons created by Stand abilities.
   Everything carries an `owner` (the Stand user) and a `team`, so
   summons never hurt their own side.
   ===================================================================== */

const isEnemyOf = (b, team, owner) => b && b !== owner && !b.removed && (team == null || b.team !== team);

function enemiesNear(world, x, y, radius, team, owner) {
  const out = [];
  for (const r of world.ragdolls()) {
    if (!isEnemyOf(r, team, owner) || r.intangible) continue;
    if (dist(r.p.chest.x, r.p.chest.y, x, y) < radius) out.push(r);
  }
  return out;
}

function nearestEnemy(world, x, y, team, owner, maxDist = Infinity) {
  let best = null, bd = maxDist;
  for (const r of world.ragdolls()) {
    if (!isEnemyOf(r, team, owner) || r.dead || r.intangible) continue;
    const d = dist(r.p.chest.x, r.p.chest.y, x, y);
    if (d < bd) { bd = d; best = r; }
  }
  return best;
}

// ---------------------------------------------------------------- projectile
const PROJ_STYLE = {
  fire:     { r: 7, color: '#ff8a2a' },
  emerald:  { r: 4, color: '#3fe07a' },
  bullet:   { r: 2.5, color: '#e8c04a' },
  nail:     { r: 3, color: '#c8c8d0' },
  blade:    { r: 3, color: '#e8ecf4' },
  bubble:   { r: 7, color: '#bfe8ff' },
  capsule:  { r: 4, color: '#b060e0' },
  bomb:     { r: 6, color: '#3a3a44' },
  disc:     { r: 5, color: '#f4f4f8' },
};

class Projectile extends Body {
  constructor(world, owner, x, y, vx, vy, type, o = {}) {
    super(world);
    this.kind = 'proj';
    this.type = type;
    this.owner = owner;
    this.team = owner ? owner.team : null;
    const st = PROJ_STYLE[type] || {};
    const p = this.addParticle(x, y, o.r ?? st.r ?? 4, o.mass ?? 0.2, 'p');
    p.setVel(vx, vy);
    p.bounce = 0.3; p.friction = 0.1;
    this.p = p;
    this.color = o.color || st.color || '#fff';
    this.dmg = o.dmg ?? 8;
    this.life = o.life ?? 3;
    this.grav = o.grav ?? 0;
    this.homing = o.homing || 0;          // turn rate (rad/s-ish); 0 = straight
    this.homeDelay = o.homeDelay || 0;
    this.target = o.target || null;
    this.pierce = !!o.pierce;
    this.knock = o.knock ?? 260;
    this.status = o.status || null;       // [name, seconds]
    this.stunT = o.stun || 0;
    this.onHit = o.onHit || null;
    this.onEnd = o.onEnd || null;         // fires on ground / timeout
    this.ghost = !!o.ghost;               // purely visual (Whitesnake disc)
    this.speed = Math.hypot(vx, vy);
    this.age = 0;
    this.tsFlight = 0;
    this.hitSet = new Set();
    this.trail = [];
    this.spin = 0;
  }
  timeExempt() { return this.tsFlight > 0; }
  canCollideWith(b) {
    if (this.ghost || b === this.owner || b.kind === 'proj' || b.kind === 'zone') return false;
    return this.team == null || b.team !== this.team;
  }
  update(dt) {
    const p = this.p, w = this.world;
    this.age += dt; this.life -= dt; this.spin += dt * 30;
    if (this.tsFlight > 0) this.tsFlight -= dt;
    if (this.grav < 1) p.addVel(0, -GRAVITY * (1 - this.grav) * dt);
    if (this.homing && this.age > this.homeDelay) {
      let t = this.target;
      if (!t || !t.alive) t = this.target = nearestEnemy(w, p.x, p.y, this.team, this.owner, 900);
      if (t) {
        const tx = t.p.chest.x - p.x, ty = t.p.chest.y - p.y, tl = Math.hypot(tx, ty) || 1;
        const vx = p.vx, vy = p.vy, sp = Math.max(this.speed, Math.hypot(vx, vy));
        const k = Math.min(1, this.homing * dt);
        const nx = lerp(vx / sp, tx / tl, k), ny = lerp(vy / sp, ty / tl, k), nl = Math.hypot(nx, ny) || 1;
        p.setVel((nx / nl) * sp, (ny / nl) * sp);
      }
    }
    this.trail.push(p.x, p.y);
    if (this.trail.length > 16) this.trail.splice(0, 2);
    const onGround = p.y + p.r >= w.groundY - 0.5 || p.x <= p.r + 0.5 || p.x >= w.width - p.r - 0.5;
    if (this.life <= 0 || (onGround && this.grav > 0 && this.age > 0.05) || (onGround && this.grav === 0 && this.age > 0.05)) this.end();
  }
  end() {
    if (this.removed) return;
    this.world.remove(this);
    if (this.onEnd) this.onEnd(this);
    else if (this.type === 'bullet' || this.type === 'nail') this.world.fx.spark(this.p.x, this.p.y, 3, '#ffe27a', 200);
  }
  onContact(p, other) {
    const b = other.body;
    if (this.ghost) return true;
    if (this.hitSet.has(b)) return true;
    this.hitSet.add(b);
    const vx = p.vx, vy = p.vy, sp = Math.hypot(vx, vy) || 1;
    const nx = vx / sp, ny = vy / sp;
    if (b.kind === 'ragdoll') {
      b.hitBy(this.owner);
      b.damage(this.dmg, other, vx, vy);
      other.addVel(nx * this.knock, ny * this.knock - 80);
      if (this.status) b.addStatus(this.status[0], this.status[1], this.owner);
      if (this.stunT) b.stun = Math.max(b.stun, this.stunT);
    } else {
      const m = b.heavy ? 0.1 : 0.6;
      for (const q of b.particles) q.addVel(nx * this.knock * m, ny * this.knock * m);
      if (b.damage) b.damage(this.dmg);
    }
    if (this.onHit) this.onHit(this, b, other);
    this.world.fx.spark(p.x, p.y, 4, this.color, 260);
    if (!this.pierce) { this.world.remove(this); if (this.onEnd) this.onEnd(this); }
    return true;
  }
  draw(ctx) {
    const p = this.p, t = this.trail;
    const ang = Math.atan2(p.y - p.py, p.x - p.px);
    // Trail.
    if (t.length > 4 && this.type !== 'bubble' && this.type !== 'disc') {
      ctx.save();
      ctx.strokeStyle = this.color; ctx.lineCap = 'round';
      for (let i = 2; i < t.length; i += 2) {
        ctx.globalAlpha = (i / t.length) * 0.5;
        ctx.lineWidth = p.r * (i / t.length) * 1.4;
        ctx.beginPath(); ctx.moveTo(t[i - 2], t[i - 1]); ctx.lineTo(t[i], t[i + 1]); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save();
    ctx.translate(p.x, p.y);
    switch (this.type) {
      case 'fire': {
        ctx.shadowColor = '#ff6a00'; ctx.shadowBlur = 14;
        dotInk(ctx, 0, 0, p.r, '#ff8a2a', 1.2);
        ctx.rotate(ang + Math.PI / 2);
        ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, -3, 2.2, 3, 0, 0, Math.PI * 2); ctx.moveTo(0, 0); ctx.lineTo(0, 6); ctx.moveTo(-4, 1); ctx.lineTo(4, 1); ctx.stroke();
        break;
      }
      case 'emerald':
        ctx.rotate(this.spin * 0.2);
        ctx.shadowColor = '#3fe07a'; ctx.shadowBlur = 10;
        flatBlob(ctx, [[0, -5], [4, 0], [0, 5], [-4, 0]], '#3fe07a', false, 1);
        ctx.fillStyle = '#c8ffd8'; ctx.fillRect(-1, -2, 1.6, 1.6);
        break;
      case 'bullet':
        ctx.rotate(ang);
        flatBlob(ctx, [[-4, -1.8], [2, -1.8], [4.5, 0], [2, 1.8], [-4, 1.8]], '#e8c04a', false, 0.8);
        break;
      case 'nail':
        ctx.rotate(ang);
        ctx.fillStyle = '#c8c8d0'; ctx.fillRect(-5, -1.2, 9, 2.4);
        ctx.strokeStyle = '#6a6a78'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(0, 0, 3.5 + Math.sin(this.spin) * 0.8, this.spin, this.spin + 4); ctx.stroke();
        break;
      case 'blade':
        ctx.rotate(ang);
        ctx.strokeStyle = '#e8ecf4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(8, 0); ctx.stroke();
        ctx.fillStyle = '#e8c04a'; ctx.fillRect(-20, -3, 2.4, 6);
        break;
      case 'bubble':
        ctx.fillStyle = 'rgba(200,240,255,0.25)'; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,150,220,0.7)'; ctx.beginPath(); ctx.arc(0, 0, p.r - 1.5, 3.6, 5); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-2.5, -2.5, 1.3, 0, 7); ctx.fill();
        break;
      case 'capsule':
        ctx.rotate(this.spin * 0.3);
        flatBlob(ctx, [[-5, -2.2], [5, -2.2], [5, 2.2], [-5, 2.2]], '#f4f0f8', true, 0.9);
        ctx.fillStyle = '#b060e0'; ctx.fillRect(0, -2.2, 5, 4.4);
        break;
      case 'bomb':
        dotInk(ctx, 0, 0, p.r, '#3a3a44', 1.2);
        ctx.fillStyle = '#e8c04a'; ctx.fillRect(-1, -p.r - 3, 2, 3);
        break;
      case 'disc':
        ctx.rotate(this.spin * 0.2);
        ctx.fillStyle = '#e8e8f0'; ctx.strokeStyle = '#8a8aa0'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(0, 0, 7, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#8a6ad0'; ctx.beginPath(); ctx.ellipse(0, 0, 2, 1, 0, 0, Math.PI * 2); ctx.fill();
        break;
      default:
        dotInk(ctx, 0, 0, p.r, this.color, 1);
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------- zones (no particles)
class Zone extends Body {
  constructor(world, owner, x, y) {
    super(world);
    this.kind = 'zone';
    this.owner = owner;
    this.team = owner ? owner.team : null;
    this.x = x; this.y = y;
    this.t = 0;
  }
  containsPoint() { return false; }
  center() { return { x: this.x, y: this.y }; }
}

/** Purple Haze: a flesh-eating virus cloud. Hurts anyone who isn't on the owner's team. */
class VirusCloud extends Zone {
  constructor(world, owner, x, y, r = 70, dur = 4) {
    super(world, owner, x, y);
    this.r = r; this.dur = dur;
    this.blobs = Array.from({ length: 9 }, () => ({ a: rand(0, 6.28), d: rand(0, r * 0.7), s: rand(0.5, 1.2), ph: rand(0, 6) }));
  }
  update(dt) {
    this.t += dt;
    if (this.t > this.dur) { this.world.remove(this); return; }
    for (const r of enemiesNear(this.world, this.x, this.y, this.r, this.team, this.owner)) r.addStatus('virus', 1.2, this.owner);
  }
  draw(ctx) {
    const k = Math.min(1, this.t / 0.3) * Math.min(1, (this.dur - this.t) / 0.6);
    ctx.save();
    ctx.globalAlpha = 0.35 * k;
    for (const b of this.blobs) {
      const x = this.x + Math.cos(b.a + this.t * 0.3) * b.d, y = this.y + Math.sin(b.a + this.t * 0.3) * b.d * 0.6;
      const rr = this.r * 0.45 * b.s * (1 + 0.1 * Math.sin(this.t * 3 + b.ph));
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, '#c070ff'); g.addColorStop(1, 'rgba(120,40,180,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

/** Hierophant Green: 20m Emerald Splash — a web of tripwires that fires emeralds at intruders. */
class EmeraldBarrier extends Zone {
  constructor(world, owner, x, y, r = 280, dur = 8) {
    super(world, owner, x, y);
    this.r = r; this.dur = dur;
    this.cool = new Map();
    this.wires = Array.from({ length: 11 }, (_, i) => {
      const a = rand(Math.PI, Math.PI * 2), b = a + rand(0.6, 2.2);
      return [a, b];
    });
  }
  update(dt) {
    this.t += dt;
    if (this.t > this.dur || !this.owner || this.owner.dead) { this.world.remove(this); return; }
    for (const r of enemiesNear(this.world, this.x, this.y, this.r, this.team, this.owner)) {
      const c = this.cool.get(r) || 0;
      if (this.world.time < c) continue;
      this.cool.set(r, this.world.time + 0.45);
      for (let i = 0; i < 3; i++) {
        const a = rand(Math.PI * 1.05, Math.PI * 1.95);
        const sx = this.x + Math.cos(a) * this.r * 0.9, sy = Math.min(this.world.groundY - 10, this.y + Math.sin(a) * this.r * 0.9);
        const dx = r.p.chest.x - sx, dy = r.p.chest.y - sy, dl = Math.hypot(dx, dy) || 1;
        this.world.add(new Projectile(this.world, this.owner, sx, sy, (dx / dl) * 1000, (dy / dl) * 1000, 'emerald', { dmg: 5, life: 1.2, knock: 200 }));
      }
      this.world.fx.text(r.p.head.x, r.p.head.y - 30, 'EMERALD SPLASH!', { size: 22, color: '#3fe07a' });
    }
  }
  draw(ctx) {
    const k = Math.min(1, this.t / 0.4) * Math.min(1, (this.dur - this.t) / 0.5);
    ctx.save();
    ctx.globalAlpha = 0.55 * k;
    ctx.strokeStyle = '#6dff9a'; ctx.lineWidth = 1;
    ctx.shadowColor = '#3fe07a'; ctx.shadowBlur = 6;
    ctx.beginPath();
    for (const [a, b] of this.wires) {
      const y1 = Math.min(this.world.groundY, this.y + Math.sin(a) * this.r), y2 = Math.min(this.world.groundY, this.y + Math.sin(b) * this.r);
      ctx.moveTo(this.x + Math.cos(a) * this.r, y1); ctx.lineTo(this.x + Math.cos(b) * this.r, y2);
    }
    ctx.stroke();
    ctx.restore();
  }
}

/** Gold Experience: a tree bursts out of the ground and launches whoever stands on it. */
class LifeTree extends Zone {
  constructor(world, owner, x) {
    super(world, owner, x, world.groundY);
    this.h = 0;
    this.launched = false;
  }
  update(dt) {
    this.t += dt;
    this.h = Math.min(150, this.t / 0.3 * 150);
    if (!this.launched && this.t > 0.05) {
      this.launched = true;
      for (const r of this.world.ragdolls()) {
        if (!isEnemyOf(r, this.team, this.owner)) continue;
        if (Math.abs(r.p.pelvis.x - this.x) < 40 && r.p.pelvis.y > this.world.groundY - 140) {
          r.hitBy(this.owner);
          for (const p of r.particles) p.addVel(rand(-80, 80), -1150);
          r.damage(12, r.p.pelvis);
          r.stun = Math.max(r.stun, 1);
        }
      }
    }
    if (this.t > 5) this.world.remove(this);
  }
  draw(ctx) {
    const k = Math.min(1, (5 - this.t) / 0.6);
    const x = this.x, g = this.world.groundY, h = this.h;
    ctx.save();
    ctx.globalAlpha = k;
    flatBlob(ctx, [[x - 8, g], [x - 5, g - h * 0.7], [x - 3, g - h], [x + 3, g - h], [x + 5, g - h * 0.7], [x + 8, g]], '#7a4a26', false, 1.6);
    if (h > 60) {
      for (const [dx, dy, r] of [[-20, -h + 6, 22], [18, -h + 2, 24], [0, -h - 14, 26], [-6, -h + 20, 18], [14, -h + 22, 16]]) {
        celBlob(ctx, circlePts(x + dx, g + dy, r * Math.min(1, (h - 60) / 90), 9), '#4caf50');
      }
      ctx.fillStyle = '#ffb0c8';
      for (const [dx, dy] of [[-12, -h], [10, -h - 10], [22, -h + 12], [-18, -h + 18]]) { ctx.beginPath(); ctx.arc(x + dx, g + dy, 2.2, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  }
}

/** Echoes ACT2: a sound word stuck on a target — "BOING" bounces them sky-high. */
class SoundWord extends Zone {
  constructor(world, owner, target, word = 'ボヨヨン') {
    super(world, owner, 0, 0);
    this.target = target; this.word = word; this.fired = false;
  }
  update(dt) {
    this.t += dt;
    const r = this.target;
    if (!r || r.removed) { this.world.remove(this); return; }
    this.x = r.p.chest.x; this.y = r.p.chest.y;
    if (!this.fired && this.t > 0.45) {
      this.fired = true;
      r.hitBy(this.owner);
      for (const p of r.particles) p.addVel(rand(-60, 60), -1250);
      r.stun = Math.max(r.stun, 1.2);
      this.world.fx.text(this.x, this.y - 40, 'BOING!!', { size: 40, color: '#7ec96a' });
      SFX.bigPunch();
    }
    if (this.t > 0.9) this.world.remove(this);
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(1 + Math.sin(this.t * 30) * 0.08, 1);
    ctx.font = `900 18px "Yu Gothic", "Meiryo", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.strokeText(this.word, 0, 0);
    ctx.fillStyle = '#9ef07a'; ctx.fillText(this.word, 0, 0);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- creatures
class Creature extends Body {
  constructor(world, owner, x, y, r, mass) {
    super(world);
    this.kind = 'creature';
    this.owner = owner;
    this.team = owner ? owner.team : null;
    this.c = this.addParticle(x, y, r, mass, 'c');
    this.c.bounce = 0.2; this.c.friction = 0.3;
    this.t = 0;
  }
  canCollideWith(b) { return b !== this.owner && (this.team == null || b.team !== this.team); }
}

/** Gold Experience's frogs: hop at enemies and bite. */
class Frog extends Creature {
  constructor(world, owner, x, y) { super(world, owner, x, y, 7, 0.6); this.hopT = rand(0.2, 0.6); this.dir = 1; }
  update(dt) {
    this.t += dt; this.hopT -= dt;
    if (this.t > 10) { this.world.fx.spark(this.c.x, this.c.y, 6, '#7ec96a'); this.world.remove(this); return; }
    if (this.hopT <= 0 && this.c.grounded) {
      this.hopT = rand(0.5, 0.8);
      const e = nearestEnemy(this.world, this.c.x, this.c.y, this.team, this.owner, 600);
      this.dir = e ? Math.sign(e.p.pelvis.x - this.c.x) || 1 : (Math.random() < 0.5 ? -1 : 1);
      this.c.addVel(this.dir * 240, -430);
    }
  }
  onContact(p, other) {
    const b = other.body;
    if (b.kind === 'ragdoll' && isEnemyOf(b, this.team, this.owner) && this.world.time - (this.lastBite || 0) > 0.5) {
      this.lastBite = this.world.time;
      b.hitBy(this.owner); b.damage(6, other); other.addVel(this.dir * 200, -120);
    }
    return false;
  }
  draw(ctx) {
    const c = this.c;
    ctx.save(); ctx.translate(c.x, c.y); ctx.scale(this.dir, 1);
    celBlob(ctx, [[-7, 4], [-6, -3], [0, -6], [6, -4], [8, 2], [4, 6], [-4, 6]], '#5fbf4a', true, 1.3);
    dotInk(ctx, 3, -6, 2.2, '#fff', 1); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(3.6, -6, 1, 0, 7); ctx.fill();
    ctx.restore();
  }
}

/** Killer Queen: Sheer Heart Attack — an automatic bomb tank that hunts the nearest enemy. */
class SheerHeartAttack extends Creature {
  constructor(world, owner, x, y) { super(world, owner, x, y, 9, 3); this.dir = owner ? owner.facing : 1; this.stuckT = 0; this.talkT = 1; }
  timeExempt() { return false; }
  update(dt) {
    this.t += dt; this.talkT -= dt;
    if (this.t > 14) { this.world.fx.spark(this.c.x, this.c.y, 8, '#e8a3c8'); this.world.remove(this); return; }
    const e = nearestEnemy(this.world, this.c.x, this.c.y, this.team, this.owner, 2000);
    if (e) this.dir = Math.sign(e.p.pelvis.x - this.c.x) || this.dir;
    if (this.c.grounded) {
      const v = this.c.x - this.c.px;
      this.c.px -= (this.dir * 230 * DT - v) * 0.2;
      if (Math.abs(v) < 0.3) { this.stuckT += dt; if (this.stuckT > 0.4) { this.stuckT = 0; this.c.addVel(0, -520); } }
    }
    if (this.talkT <= 0) {
      this.talkT = 2.2;
      this.world.fx.text(this.c.x, this.c.y - 26, 'LOOK HERE!', { size: 18, color: '#e8a3c8', life: 1 });
    }
  }
  onContact(p, other) {
    const b = other.body;
    if (b.kind === 'ragdoll' && isEnemyOf(b, this.team, this.owner)) {
      this.world.remove(this);
      b.hitBy(this.owner);
      this.world.explode(this.c.x, this.c.y, 110, 1200, this.owner);
      this.world.fx.text(this.c.x, this.c.y - 50, 'SHEER HEART ATTACK!', { size: 28, color: '#e8a3c8' });
      return true;
    }
    return false;
  }
  draw(ctx) {
    const c = this.c;
    ctx.save(); ctx.translate(c.x, c.y); ctx.scale(this.dir, 1);
    flatBlob(ctx, [[-11, 3], [11, 3], [11, 9], [-11, 9]], '#4a4a52', true, 1.3);
    ctx.fillStyle = '#8a8a92'; for (let x = -8; x <= 8; x += 4) { ctx.beginPath(); ctx.arc(x + (this.t * 20 % 4), 6, 1.4, 0, 7); ctx.fill(); }
    celBlob(ctx, [[-9, 3], [-8, -6], [0, -10], [8, -6], [9, 3]], '#e8e2d8', true, 1.4);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(1, -4, 1.6, 0, 7); ctx.arc(5, -4, 1.6, 0, 7); ctx.fill();
    ctx.fillRect(1, 0, 5, 1);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-2, -9); ctx.lineTo(-4, -15); ctx.stroke();
    ctx.restore();
  }
}
