'use strict';
/* =====================================================================
   JoJo mode — settings + presentation layer:
   backgrounds, time-stop / time-erase screen effects, Stand stat card,
   and the "To Be Continued" freeze frame.
   ===================================================================== */

const JOJO = {
  enabled: true,
  menacing: true,
  tbc: true,
  ai: true,
  civilians: false,
  cards: [],          // queued stat cards { def, t }
  tbcState: null,     // { t } while the freeze frame is showing

  showCard(def) {
    this.cards = this.cards.filter(c => c.def !== def);
    this.cards.push({ def, t: 0 });
  },

  update(dt) {
    if (this.cards.length) {
      this.cards[0].t += dt;
      if (this.cards[0].t > 2.8) this.cards.shift();
    }
    if (this.tbcState) this.tbcState.t += dt;
  },

  // ------------------------------------------------------------ backgrounds
  drawBackground(ctx, w, h, time) {
    if (!this.enabled) {
      ctx.fillStyle = '#d7dadf';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.07)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < w; x += 40) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); }
      for (let y = 0; y < h; y += 40) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
      ctx.stroke();
      return;
    }
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#2a0f45');
    g.addColorStop(0.55, '#5b1f6e');
    g.addColorStop(1, '#b3346f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Speed lines from a vanishing point.
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    const vx = w * 0.5, vy = h * 0.35;
    ctx.beginPath();
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * TAU + time * 0.02;
      ctx.moveTo(vx + Math.cos(a) * 120, vy + Math.sin(a) * 120);
      ctx.lineTo(vx + Math.cos(a) * 2000, vy + Math.sin(a) * 2000);
    }
    ctx.stroke();
    ctx.restore();
    // Halftone dots.
    ctx.fillStyle = 'rgba(255,190,240,0.09)';
    for (let y = 12; y < h; y += 22) {
      for (let x = (y / 22) % 2 ? 11 : 0; x < w; x += 22) {
        const r = 1 + 2.5 * (y / h);
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      }
    }
    // Giant faint ゴゴゴ.
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#fff';
    ctx.font = `900 ${Math.min(220, w / 5)}px "Yu Gothic", "Meiryo", sans-serif`;
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText('ゴゴゴ', w - 30, 70 + Math.sin(time) * 4);
    ctx.restore();
  },

  drawGround(ctx, world) {
    const gy = world.groundY, w = world.width, h = world.height;
    if (this.enabled) {
      const g = ctx.createLinearGradient(0, gy, 0, h);
      g.addColorStop(0, '#2b1236'); g.addColorStop(1, '#12061a');
      ctx.fillStyle = g;
      ctx.fillRect(0, gy, w, h - gy);
      ctx.fillStyle = '#f1c75b'; ctx.fillRect(0, gy, w, 3);
    } else {
      ctx.fillStyle = '#5b6068'; ctx.fillRect(0, gy, w, h - gy);
      ctx.fillStyle = '#44484f'; ctx.fillRect(0, gy, w, 4);
    }
  },

  // ------------------------------------------------------------ time effects
  /** Called after the world is drawn but before time-exempt bodies are redrawn. */
  drawTimeStopTint(ctx, ts, w, h) {
    const fadeIn = clamp((ts.t - 0.25) / 0.3, 0, 1);
    const fadeOut = clamp((ts.dur - ts.t) / 0.35, 0, 1);
    const k = Math.min(fadeIn, fadeOut);
    if (k <= 0) return;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = 'hsl(0,0%,50%)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = k * 0.35;
    ctx.fillStyle = ts.def ? ts.def.tint : '#4a3aa8';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  },

  /** Inverted-color shockwave that expands from the time stopper, then collapses. */
  drawTimeStopWave(ctx, ts, w, h) {
    const o = ts.owner.p.chest;
    const maxR = Math.hypot(w, h);
    let r = 0;
    if (ts.t < 0.35) r = (ts.t / 0.35) * maxR;
    else if (ts.t < 0.65) r = (1 - (ts.t - 0.35) / 0.3) * maxR;
    else if (ts.dur - ts.t < 0.3) r = (1 - (ts.dur - ts.t) / 0.3) * maxR * 0.25;
    if (r <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, TAU); ctx.fill();
    ctx.restore();
  },

  drawTimeStopHud(ctx, ts, w) {
    const left = Math.max(0, ts.dur - ts.t);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `28px ${COMIC_FONT}`;
    ctx.lineWidth = 6; ctx.strokeStyle = '#140a1f'; ctx.fillStyle = ts.def ? ts.def.accent : '#fff';
    const s = `TIME STOPPED — ${left.toFixed(1)}s`;
    ctx.strokeText(s, w / 2, 96); ctx.fillText(s, w / 2, 96);
    // Clock face.
    const cx = w / 2, cy = 140, R = 22;
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - R + 5); ctx.stroke();
    const a = -Math.PI / 2 + (ts.t / ts.dur) * TAU;
    ctx.strokeStyle = ts.def ? ts.def.accent : '#fff';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (R - 4), cy + Math.sin(a) * (R - 4)); ctx.stroke();
    ctx.restore();
  },

  /** Made in Heaven: days and nights flash by; the sun and moon streak across the sky. */
  drawAccel(ctx, ac, w, h, time) {
    const k = Math.min(clamp(ac.t / 0.6, 0, 1), clamp((ac.dur - ac.t) / 0.6, 0, 1));
    const speed = 2 + ac.t * 1.2;
    const day = (Math.sin(time * speed) + 1) / 2;
    ctx.save();
    ctx.globalAlpha = k * 0.35;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = day > 0.5 ? '#ffe6b0' : '#2a2a6a';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = k * 0.7;
    for (let i = 0; i < 3; i++) {
      const a = (time * speed + i * 2.1) % (Math.PI * 2);
      const x = w / 2 - Math.cos(a) * w * 0.55, y = h * 0.75 - Math.sin(a) * h * 0.6;
      ctx.strokeStyle = i % 2 ? 'rgba(220,230,255,0.8)' : 'rgba(255,220,120,0.9)';
      ctx.lineWidth = i % 2 ? 6 : 10; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(w / 2, h * 0.75, Math.hypot(w * 0.55, h * 0.6) * 0.72, Math.PI + a - 0.5, Math.PI + a); ctx.stroke();
    }
    ctx.restore();
  },

  /** King Crimson: the world keeps moving, but the screen shows a crimson void. */
  drawErase(ctx, er, w, h, time) {
    const k = Math.min(clamp(er.t / 0.3, 0, 1), clamp((er.dur - er.t) / 0.3, 0, 1));
    ctx.save();
    ctx.globalAlpha = k * 0.55;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#b01030';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = k * 0.8;
    // Drifting void specks (deterministic so they don't flicker).
    for (let i = 0; i < 90; i++) {
      const sx = (Math.sin(i * 12.9898) * 43758.5453) % 1, sy = (Math.sin(i * 78.233) * 12345.678) % 1;
      const x = (Math.abs(sx) * w + time * 30 * (1 + (i % 3))) % w;
      const y = (Math.abs(sy) * h + Math.sin(time + i) * 10);
      ctx.fillStyle = i % 4 ? 'rgba(255,255,255,0.8)' : 'rgba(255,120,150,0.9)';
      ctx.fillRect(x, y, i % 5 ? 2 : 3, i % 5 ? 2 : 3);
    }
    ctx.restore();
  },

  // ------------------------------------------------------------ stat card
  drawCard(ctx, w, h) {
    const c = this.cards[0];
    if (!c) return;
    const d = c.def, t = c.t;
    const slide = t < 0.25 ? 1 - t / 0.25 : t > 2.5 ? (t - 2.5) / 0.3 : 0;
    const cw = 300, ch = 250;
    const sc = clamp(w / 1100, 0.55, 1);
    const x = w - (cw + 20) * sc + slide * (cw + 40) * sc, y = 64;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    ctx.transform(1, 0, -0.06, 1, 0, 0);
    ctx.fillStyle = 'rgba(20,8,32,0.88)';
    ctx.strokeStyle = d.color; ctx.lineWidth = 3;
    roundRect(ctx, 0, 0, cw, ch, 10); ctx.fill(); ctx.stroke();

    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#bbb'; ctx.font = `14px ${COMIC_FONT}`;
    ctx.fillText('STAND NAME', 16, 12);
    ctx.fillStyle = '#888'; ctx.textAlign = 'right';
    ctx.fillText(d.partName ? d.partName.split(' — ')[0].toUpperCase() : '', cw - 14, 12);
    ctx.textAlign = 'left';
    const title = `「${d.name}」`;
    let fs = 30;
    ctx.font = `${fs}px ${COMIC_FONT}`;
    while (ctx.measureText(title).width > cw - 20 && fs > 14) { fs -= 1; ctx.font = `${fs}px ${COMIC_FONT}`; }
    ctx.lineWidth = 5; ctx.strokeStyle = '#000';
    ctx.strokeText(title, 10, 28 + (30 - fs) / 2);
    ctx.fillStyle = d.color; ctx.fillText(title, 10, 28 + (30 - fs) / 2);
    ctx.fillStyle = '#aaa'; ctx.font = `12px "Yu Gothic", "Meiryo", sans-serif`;
    ctx.fillText(d.jp, 16, 62);
    ctx.fillStyle = '#999'; ctx.font = `12px ${COMIC_FONT}`;
    ctx.fillText(`USER: ${d.user.toUpperCase()}`, 16, 78);

    // Hexagon stat chart.
    const keys = Object.keys(d.stats);
    const cx = 95, cy = 168, R = 58;
    const val = (g) => ({ A: 1, B: 0.8, C: 0.6, D: 0.4, E: 0.2, '?': 0.5, '∞': 1.15 }[g] ?? 0.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
    for (const ring of [0.2, 0.4, 0.6, 0.8, 1]) {
      ctx.beginPath();
      keys.forEach((_, i) => {
        const a = -Math.PI / 2 + (i / 6) * TAU;
        ctx.lineTo(cx + Math.cos(a) * R * ring, cy + Math.sin(a) * R * ring);
      });
      ctx.closePath(); ctx.stroke();
    }
    const grow = Math.min(1, t / 0.6);
    ctx.fillStyle = d.aura.replace(/[\d.]+\)$/, '0.75)');
    ctx.strokeStyle = d.color; ctx.lineWidth = 2;
    ctx.beginPath();
    keys.forEach((k, i) => {
      const a = -Math.PI / 2 + (i / 6) * TAU, r = R * val(d.stats[k]) * grow;
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    });
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.font = `13px ${COMIC_FONT}`;
    keys.forEach((k, i) => {
      ctx.fillStyle = '#ddd';
      ctx.fillText(k.toUpperCase(), 180, 100 + i * 23);
      ctx.fillStyle = d.accent; ctx.font = `18px ${COMIC_FONT}`;
      ctx.fillText(d.stats[k], 270, 97 + i * 23);
      ctx.font = `13px ${COMIC_FONT}`;
    });
    ctx.restore();
  },

  // ------------------------------------------------------------ to be continued
  drawTbc(ctx, w, h) {
    const s = this.tbcState;
    if (!s) return;
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = 'hsl(0,0%,50%)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#d9a25e';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(80,50,20,0.18)';
    ctx.fillRect(0, 0, w, h);

    const slide = Math.min(1, s.t / 0.35);
    const aw = 330, ah = 62;
    const x = 24 - (1 - slide) * (aw + 60), y = h - ah - 90;
    ctx.translate(x, y);
    // Arrow pointing left.
    ctx.fillStyle = '#f3e3b0'; ctx.strokeStyle = '#3b2a12'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, ah / 2); ctx.lineTo(ah * 0.7, 0); ctx.lineTo(ah * 0.7, ah * 0.2); ctx.lineTo(aw, ah * 0.2);
    ctx.lineTo(aw, ah * 0.8); ctx.lineTo(ah * 0.7, ah * 0.8); ctx.lineTo(ah * 0.7, ah); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3b2a12';
    ctx.font = `italic 700 26px "Georgia", serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('To Be Continued', ah * 0.7 + (aw - ah * 0.7) / 2, ah / 2 + 1);
    ctx.restore();

    if (s.t > 0.8) {
      ctx.save();
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(s.t * 4);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.font = `18px ${COMIC_FONT}`;
      ctx.fillText('click or press any key to continue', w / 2, h - 30);
      ctx.restore();
    }
  },
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
