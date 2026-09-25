'use strict';
/* =====================================================================
   Visual effects: juice droplets + stains, floating text (stand cries),
   shockwave rings, flashes, sparks, menacing ゴ glyphs, slash lines.
   Droplets and sparks hang in the air while time is stopped.
   ===================================================================== */

const COMIC_FONT = '"Bangers", "Impact", "Arial Black", sans-serif';

class Effects {
  constructor(world) {
    this.world = world;
    this.drops = [];
    this.stains = [];
    this.texts = [];
    this.rings = [];
    this.flashes = [];
    this.sparks = [];
    this.glyphs = [];
    this.slashes = [];
    this.flames = [];
    this.fogs = [];
    this.flags = [];
    this.gore = true;
  }

  clear() {
    this.drops.length = this.stains.length = this.texts.length = 0;
    this.rings.length = this.flashes.length = this.sparks.length = 0;
    this.glyphs.length = this.slashes.length = 0;
    this.flames.length = this.fogs.length = this.flags.length = 0;
  }

  fire(x, y, count = 1) {
    for (let i = 0; i < count; i++) {
      if (this.flames.length > 250) this.flames.shift();
      this.flames.push({ x: x + rand(-4, 4), y: y + rand(-4, 4), vx: rand(-20, 20), vy: rand(-90, -40), r: rand(3, 7), t: 0, life: rand(0.3, 0.6) });
    }
  }

  fog(x, y, r) {
    for (let i = 0; i < 12; i++) {
      this.fogs.push({ x: x + rand(-r, r) * 0.8, y: y + rand(-r, r) * 0.4, r: rand(r * 0.3, r * 0.55), t: 0, life: rand(2.5, 3.5) });
    }
  }

  flag(x, y) { this.flags.push({ x, y, t: 0, life: 0.9 }); }

  // ------------------------------------------------------------ spawners
  blood(x, y, count = 8, vx = 0, vy = 0, color = '#c0162c') {
    if (!this.gore) color = '#6cc24a';
    count = Math.min(count, 40);
    for (let i = 0; i < count; i++) {
      if (this.drops.length > 600) this.drops.shift();
      this.drops.push({
        x, y,
        vx: vx * 0.4 + rand(-160, 160),
        vy: vy * 0.4 + rand(-260, 40),
        r: rand(1.5, 3.6),
        color,
      });
    }
  }

  text(x, y, str, o = {}) {
    if (this.texts.length > 80) this.texts.shift();
    this.texts.push({
      x, y, str,
      size: o.size || 28,
      color: o.color || '#fff',
      stroke: o.stroke || '#1a0d24',
      life: o.life || 0.9,
      t: 0,
      vx: o.vx ?? rand(-20, 20),
      vy: o.vy ?? -60,
      rot: o.rot ?? rand(-0.25, 0.25),
      screen: !!o.screen,   // drawn in screen space, centered (callouts)
      font: o.font || COMIC_FONT,
    });
  }

  ring(x, y, r0, r1, life = 0.4, color = '#fff', width = 4) {
    this.rings.push({ x, y, r0, r1, life, t: 0, color, width });
  }

  flash(x, y, r, life = 0.25, color = 'rgba(255,240,200,1)') {
    this.flashes.push({ x, y, r, life, t: 0, color });
  }

  spark(x, y, count = 6, color = '#ffe27a', speed = 420) {
    for (let i = 0; i < count; i++) {
      if (this.sparks.length > 300) this.sparks.shift();
      const a = rand(0, Math.PI * 2), s = rand(speed * 0.3, speed);
      this.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.15, 0.4), t: 0, color });
    }
  }

  glyph(x, y, size = rand(20, 34), color = '#8a3fd1') {
    if (this.glyphs.length > 60) this.glyphs.shift();
    this.glyphs.push({ x, y, size, t: 0, life: rand(1.4, 2.2), vx: rand(-14, 14), vy: rand(-30, -14), ph: rand(0, 6), color });
  }

  slash(x1, y1, x2, y2, color = '#ff2a4a', life = 0.3, width = 6) {
    this.slashes.push({ x1, y1, x2, y2, color, life, t: 0, width });
  }

  // ------------------------------------------------------------ update
  update(dt, timeFrozen) {
    const gy = this.world.groundY;
    if (!timeFrozen) {
      for (let i = this.drops.length - 1; i >= 0; i--) {
        const d = this.drops[i];
        d.vy += GRAVITY * dt;
        d.x += d.vx * dt; d.y += d.vy * dt;
        if (d.y >= gy) {
          if (this.stains.length > 260) this.stains.shift();
          this.stains.push({ x: d.x, w: d.r * rand(2, 4), color: d.color, a: rand(0.55, 0.9) });
          this.drops.splice(i, 1);
        } else if (d.x < -50 || d.x > this.world.width + 50) this.drops.splice(i, 1);
      }
      for (const f of this.flames) { f.x += f.vx * dt; f.y += f.vy * dt; }
      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const s = this.sparks[i];
        s.t += dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        s.vx *= 0.92; s.vy *= 0.92;
        if (s.t > s.life) this.sparks.splice(i, 1);
      }
    }
    const age = (arr) => {
      for (let i = arr.length - 1; i >= 0; i--) { arr[i].t += dt; if (arr[i].t > arr[i].life) arr.splice(i, 1); }
    };
    for (const t of this.texts) { t.x += t.vx * dt; t.y += t.vy * dt; }
    for (const g of this.glyphs) { g.x += g.vx * dt + Math.sin(g.t * 6 + g.ph) * 0.4; g.y += g.vy * dt; }
    age(this.texts); age(this.rings); age(this.flashes); age(this.glyphs); age(this.slashes);
    if (!timeFrozen) age(this.flames);
    age(this.fogs); age(this.flags);
  }

  // ------------------------------------------------------------ draw
  drawStains(ctx) {
    const gy = this.world.groundY;
    for (const s of this.stains) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.ellipse(s.x, gy + 1, s.w, s.w * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawWorld(ctx) {
    for (const d of this.drops) {
      ctx.fillStyle = d.color;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    }
    for (const f of this.flashes) {
      const k = 1 - f.t / f.life;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      g.addColorStop(0, f.color);
      g.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.globalAlpha = k;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.6 + 0.4 * (1 - k)), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const r of this.rings) {
      const k = r.t / r.life;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(r.x, r.y, lerp(r.r0, r.r1, 1 - (1 - k) * (1 - k)), 0, Math.PI * 2); ctx.stroke();
    }
    for (const s of this.slashes) {
      const k = s.t / s.life;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width * (1 - k * 0.7);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const f of this.flames) {
      const k = f.t / f.life;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = k < 0.3 ? '#fff0a0' : k < 0.6 ? '#ffa030' : '#e84a1a';
      ctx.beginPath();
      ctx.moveTo(f.x - f.r * (1 - k), f.y);
      ctx.quadraticCurveTo(f.x, f.y - f.r * 2.4 * (1 - k * 0.5), f.x + f.r * (1 - k), f.y);
      ctx.arc(f.x, f.y, f.r * (1 - k), 0, Math.PI);
      ctx.fill();
    }
    for (const g of this.fogs) {
      const k = g.t / g.life;
      ctx.globalAlpha = Math.min(1, g.t / 0.3) * (1 - k) * 0.5;
      const gr = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
      gr.addColorStop(0, 'rgba(235,240,250,1)'); gr.addColorStop(1, 'rgba(235,240,250,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2); ctx.fill();
    }
    for (const f of this.flags) {
      const k = f.t / f.life;
      ctx.globalAlpha = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
      ctx.save();
      ctx.translate(f.x - 30, f.y - 40);
      ctx.fillStyle = '#6a5a4a'; ctx.fillRect(-2, 0, 3, 90);
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = i % 2 ? '#f4f4f4' : '#c8283a';
        ctx.beginPath();
        for (let x = 0; x <= 60; x += 6) ctx.lineTo(x, i * 5 + Math.sin(x * 0.12 + f.t * 12) * 3);
        for (let x = 60; x >= 0; x -= 6) ctx.lineTo(x, i * 5 + 5 + Math.sin(x * 0.12 + f.t * 12) * 3);
        ctx.fill();
      }
      ctx.fillStyle = '#2a3a8a'; ctx.fillRect(0, -1, 24, 19);
      ctx.restore();
    }
    for (const s of this.sparks) {
      ctx.globalAlpha = 1 - s.t / s.life;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.03, s.y - s.vy * 0.03); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawGlyphs(ctx) {
    for (const g of this.glyphs) {
      const k = g.t / g.life;
      const a = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4);
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.transform(1, 0, -0.18, 1, 0, 0);
      ctx.scale(1 + 0.08 * Math.sin(g.t * 9 + g.ph), 1);
      ctx.globalAlpha = a * 0.9;
      ctx.font = `900 ${g.size}px "Yu Gothic", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 5; ctx.strokeStyle = '#1b0826';
      ctx.strokeText('ゴ', 0, 0);
      ctx.fillStyle = g.color;
      ctx.fillText('ゴ', 0, 0);
      ctx.restore();
    }
  }

  drawTexts(ctx, screenW, screenH) {
    for (const t of this.texts) {
      const k = t.t / t.life;
      const pop = Math.min(1, t.t / 0.07);
      const scale = (0.4 + 0.6 * pop) * (1 + 0.25 * (1 - pop));
      ctx.save();
      if (t.screen) ctx.translate(screenW / 2 + t.x, screenH * 0.3 + t.y);
      else ctx.translate(t.x, t.y);
      ctx.rotate(t.rot);
      ctx.scale(scale, scale);
      ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      ctx.font = `${t.size}px ${t.font}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(4, t.size / 6);
      ctx.strokeStyle = t.stroke;
      ctx.strokeText(t.str, 0, 0);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, 0, 0);
      ctx.restore();
    }
  }
}
