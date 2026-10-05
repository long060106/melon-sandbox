// Satire Mode: made-up politicians who poke fun at the political process itself.
// Every character is fictional and party-neutral. The jokes are about politics (promises, committees,
// spin, red tape), never about real people or groups of people.
const SATIRE = { enabled: false };

const SAT_SUIT = (o) => Object.assign({ skin: '#f1c9a5', eye: '#3a2a1a', sleeves: 'long', acc: ['collar'], coatLong: 40 }, o);

Object.assign(DESIGNS, {
  sat_flipflop:  SAT_SUIT({ hair: '#9a9aa4', style: 'short', top: '#2a3a6a', coat: '#2a3a6a', shirt: '#eef0f6', bottom: '#2a3a6a', shoes: '#1a1a22' }),
  sat_filibuster: SAT_SUIT({ skin: '#e8b890', hair: '#d8d8de', style: 'messy', top: '#7a2530', coat: '#7a2530', shirt: '#eef0f6', bottom: '#2a2a30', shoes: '#16161a' }),
  sat_lobbyist:  SAT_SUIT({ skin: '#e3ae84', hair: '#1a1a22', style: 'short', top: '#2f6a4a', coat: '#2f6a4a', shirt: '#f2e8c8', bottom: '#2f6a4a', shoes: '#3a2a1a' }),
  sat_pundit:    SAT_SUIT({ skin: '#f3d6bc', hair: '#a0522d', style: 'messy', top: '#e0b030', coat: '#33333c', shirt: '#e0b030', bottom: '#33333c', shoes: '#16161a' }),
  sat_bureaucrat: SAT_SUIT({ skin: '#f1c9a5', hair: '#6a6a72', style: 'buzz', top: '#8a8a92', coat: '#8a8a92', shirt: '#eef0f6', bottom: '#6a6a72', shoes: '#2a2a2a' }),
  sat_candidate: SAT_SUIT({ skin: '#c98a62', hair: '#1a1a22', style: 'ponytail', fem: true, top: '#3a6fb0', coat: '#3a6fb0', shirt: '#f2f2f6', bottom: '#3a6fb0', shoes: '#2a2a30' }),
  sat_unkillable: { skin: '#f1c9a5', hair: '#e8c04a', style: 'messy', eye: '#2f6a8a', top: '#e85a9a', shirt: '#5ad0e8', bottom: '#8a5ab0', shoes: '#f2f2f2', sleeves: 'short', acc: ['belt'] },
});
for (const k of Object.keys(DESIGNS)) DESIGNS[k].key = k;

// quirk: flip | filibuster | lobby | pundit | tape | promise | immortal
const SATIRE_LIST = [
  { id: 'sat_flipflop', name: 'Senator Flip-Flop', sub: 'Changes sides when hit', color: '#2a3a6a', quirk: 'flip',
    quips: ['I have always held this exact position.', 'I support it. I oppose it. Both.', 'Let me clarify my clarification.'],
    hit: ['I was always against that!', 'Flip!', 'New poll, new me.'] },
  { id: 'sat_filibuster', name: 'President Filibuster', sub: 'Never stops talking', color: '#7a2530', quirk: 'filibuster', talk: 1.6,
    quips: ['As I was saying... (4 hours ago)', 'Allow me to read the phone book.', 'I will now recite every bill ever.', 'I yield nothing. Ever.'],
    hit: ['I will not be interrupted!', 'Point of order!'] },
  { id: 'sat_lobbyist', name: 'Lobbyist', sub: 'Coins fly out when hit', color: '#2f6a4a', quirk: 'lobby',
    quips: ['Have you considered a donation?', 'This is a gift, not a bribe.', 'My client loves this bill.'],
    hit: ['That is a billable hour!', 'Cash only!'] },
  { id: 'sat_pundit', name: 'Pundit', sub: 'Hot takes at all times', color: '#e0b030', quirk: 'pundit', talk: 2,
    quips: ['HOT TAKE!', 'BREAKING: nothing happened!', 'Both sides are wrong!', 'Sources say: I said so.', 'This changes everything (again)!'],
    hit: ['I am being SILENCED on live TV!', 'Ratings gold!'] },
  { id: 'sat_bureaucrat', name: 'Bureaucrat', sub: 'Slow, buried in red tape', color: '#8a8a92', quirk: 'tape', speed: 0.55,
    quips: ['Please fill out form 27-B.', 'Your call is important to us.', 'That window is closed.', 'Take a number.'],
    hit: ['This requires a permit.', 'Form 27-C, in triplicate.'] },
  { id: 'sat_candidate', name: 'Campaign Candidate', sub: 'Promises melons', color: '#3a6fb0', quirk: 'promise', talk: 2.4,
    quips: ['Vote for me!', 'I kiss all the babies.', 'Free melons for everyone!', 'I will fix everything on day one.'],
    hit: ['My opponent did this!', 'Negative ad!'] },
  { id: 'sat_unkillable', name: 'The Unkillable', sub: 'Cannot die. Try anything.', color: '#e85a9a', quirk: 'immortal', immortal: true, hp: 100,
    quips: ['Still here!', 'Is that your best?', 'Plot armor: ON.', 'Hit me again!'],
    hit: ['NOPE!', 'Tickles!', 'Not today.', 'Is that all?', 'Rude.', 'Ow! Just kidding.'] },
];

for (const d of SATIRE_LIST) {
  d.color = d.color || '#fff';
}

const satPick = (a) => a[(Math.random() * a.length) | 0];

Ragdoll.prototype.satSay = function (str, long) {
  if (!SATIRE.enabled && !this.immortal) return;
  const H = this.p.head;
  this.world.fx.text(H.x, H.y - 46, str, { size: 19, color: '#fff', stroke: '#1a1030', life: long ? 2.6 : 1.5, vx: 0, vy: -14, rot: 0 });
};

Ragdoll.prototype.satHit = function (amount) {
  const s = this.sat;
  if (this.satQuipT > 0 || this.dead) return;
  if (amount < 2 && !this.immortal) return;
  this.satQuipT = 0.8;
  this.satSay(satPick(s.hit));
  const H = this.p.head, fx = this.world.fx;
  if (s.quirk === 'flip') { this.facing *= -1; fx.text(H.x, H.y - 70, 'FLIP!', { size: 26, color: '#7ab0ff' }); }
  else if (s.quirk === 'lobby') for (let i = 0; i < 3; i++) fx.text(H.x + rand(-30, 30), H.y - 10, '$', { size: 26, color: '#ffd84a', vy: rand(-140, -60), life: 1.2 });
  else if (s.quirk === 'tape') fx.text(H.x, H.y - 70, '▭▭ RED TAPE ▭▭', { size: 18, color: '#ff6a6a' });
  else if (s.quirk === 'immortal') fx.ring(H.x, H.y + 10, 8, 40, 0.35, '#ffd84a', 3);
};

Ragdoll.prototype.satUpdate = function (dt) {
  const s = this.sat;
  this.satQuipT = Math.max(0, this.satQuipT - dt);
  this.satT -= dt;
  if (this.satT > 0 || this.dead || this.has('book')) return;
  this.satT = (s.talk || 4.5) * rand(0.8, 1.6);
  this.satSay(satPick(s.quips), s.quirk === 'filibuster');
  if (s.quirk === 'promise' && SATIRE.enabled && this.satMelons < 6) {
    this.satMelons++;
    this.world.add(new MelonBall(this.world, this.p.head.x + this.facing * 24, this.p.head.y - 50));
  }
};

Ragdoll.prototype.satThink = function (dt) {
  const s = this.sat;
  if (!SATIRE.enabled && !this.immortal) { this.moveDir = 0; return; }
  this.satWalkT = (this.satWalkT || 0) - dt;
  const x = this.p.pelvis.x;
  if (this.satWalkT <= 0) {
    this.satWalkT = rand(1.2, 3);
    this.moveDir = satPick([-1, 0, 1, 1, -1]);
    if (Math.random() < 0.15) this.jumpReq = true;
  }
  if (x < 90) this.moveDir = 1;
  else if (x > this.world.width - 90) this.moveDir = -1;
  if (this.moveDir) this.facing = this.moveDir;
  this.speedMul = s.speed || 1;
};
