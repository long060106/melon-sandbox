'use strict';
/* =====================================================================
   Sound: everything is synthesized with Web Audio (no audio files).
   Voice: optional browser text-to-speech for stand callouts.
   ===================================================================== */

const SFX = {
  ctx: null, master: null, noiseBuf: null, on: true, _last: {},

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.45;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  },

  ok(name, gap = 0) {
    if (!this.on || !this.ctx || this.ctx.state !== 'running') return false;
    if (gap) {
      const now = this.ctx.currentTime;
      if (this._last[name] && now - this._last[name] < gap) return false;
      this._last[name] = now;
    }
    return true;
  },

  tone(freq, dur, type = 'sine', vol = 0.3, slideTo = null, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  },

  noise(dur, vol = 0.3, freq = 1200, type = 'lowpass', delay = 0, q = 1, sweepTo = null) {
    const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t); s.stop(t + dur + 0.05);
  },

  punch(i = 1) {
    if (!this.ok('punch', 0.035)) return;
    this.noise(0.07, 0.22 * i, rand(700, 1500));
    this.tone(rand(90, 150), 0.09, 'sine', 0.28 * i, 45);
  },
  bigPunch() {
    if (!this.ok('big', 0.1)) return;
    this.noise(0.35, 0.55, 900, 'lowpass', 0, 1, 120);
    this.tone(120, 0.35, 'sine', 0.5, 30);
    this.tone(60, 0.5, 'triangle', 0.3, 25, 0.02);
  },
  thud(speed) {
    if (!this.ok('thud', 0.05)) return;
    const v = Math.min(0.35, speed / 4000);
    this.tone(rand(70, 110), 0.12, 'sine', v, 40);
    this.noise(0.06, v * 0.6, 500);
  },
  timeStop() {
    if (!this.ok('ts')) return;
    this.tone(1400, 1.1, 'sine', 0.2, 80);
    this.tone(700, 1.1, 'triangle', 0.15, 40, 0.05);
    this.noise(1.2, 0.25, 3000, 'bandpass', 0, 2, 200);
    this.tone(55, 1.6, 'sawtooth', 0.12, 35, 0.3);
  },
  timeResume() {
    if (!this.ok('tr')) return;
    this.tone(60, 0.7, 'sine', 0.25, 900);
    this.noise(0.7, 0.2, 200, 'bandpass', 0, 2, 3000);
  },
  tick() {
    if (!this.ok('tick', 0.2)) return;
    this.tone(2200, 0.04, 'square', 0.07);
    this.tone(1400, 0.05, 'square', 0.05, null, 0.12);
  },
  explosion() {
    if (!this.ok('boom', 0.08)) return;
    this.noise(1.0, 0.7, 1800, 'lowpass', 0, 1, 80);
    this.tone(70, 0.8, 'sine', 0.55, 25);
  },
  click() {
    if (!this.ok('click', 0.05)) return;
    this.tone(1800, 0.03, 'square', 0.1);
    this.tone(900, 0.04, 'square', 0.08, null, 0.03);
  },
  knife() {
    if (!this.ok('knife', 0.03)) return;
    this.noise(0.12, 0.12, 5000, 'highpass');
    this.tone(2600, 0.08, 'triangle', 0.05, 1800);
  },
  stab() {
    if (!this.ok('stab', 0.04)) return;
    this.noise(0.08, 0.2, 1600, 'bandpass', 0, 3);
  },
  heal() {
    if (!this.ok('heal', 0.2)) return;
    [660, 880, 1100, 1320].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.12, null, i * 0.06));
  },
  erase() {
    if (!this.ok('erase')) return;
    this.tone(320, 1.6, 'sawtooth', 0.1, 30);
    this.tone(333, 1.6, 'sawtooth', 0.1, 32);
    this.noise(1.4, 0.2, 400, 'bandpass', 0, 4, 60);
  },
  blink() {
    if (!this.ok('blink', 0.1)) return;
    this.noise(0.2, 0.2, 300, 'bandpass', 0, 3, 3000);
  },
  awaken() {
    if (!this.ok('awaken')) return;
    [220, 277, 330, 440, 554].forEach((f, i) => this.tone(f, 0.5, 'sawtooth', 0.08, null, i * 0.07));
    this.noise(0.8, 0.15, 800, 'bandpass', 0, 2, 4000);
  },
  menace() {
    if (!this.ok('menace', 0.5)) return;
    this.tone(48, 1.4, 'sawtooth', 0.1, 42);
    this.tone(49.5, 1.4, 'sawtooth', 0.1, 43);
  },
  spawn() {
    if (!this.ok('spawn', 0.05)) return;
    this.tone(420, 0.08, 'triangle', 0.12, 700);
  },
};

const Voice = {
  on: false,
  say(text, pitch = 1, rate = 1.15) {
    if (!this.on || !window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = pitch; u.rate = rate; u.volume = 0.9;
      speechSynthesis.speak(u);
    } catch (e) { /* TTS unavailable — ignore */ }
  },
};
