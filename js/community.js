'use strict';
/* =====================================================================
   The Jewish community: twelve original characters drawn from Ashkenazi,
   Sephardic, Mizrahi and Beta Israel (Ethiopian) traditions. They are
   ordinary ragdolls with no Stands, just people, dressed and styled as
   described in JEWISH-COMMUNITY.md. Loaded after art.js and judaica.js.
   ===================================================================== */

const BLACK = '#17171d';

Object.assign(DESIGNS, {
  // ---- Ashkenazi
  jc_yossi: { // Chabad rabbi: black fedora, black jacket, white shirt, tzitzit worn out
    skin: '#efc9a3', hair: '#3a2a22', style: 'short', eye: '#4a3a2a', cover: 'fedora', hat: BLACK, beard: 'full', beardCol: '#33261f',
    top: BLACK, coat: BLACK, coatLong: 22, shirt: '#f4f4f6', bottom: BLACK, shoes: '#0e0e12', tzitzit: true, acc: [],
  },
  jc_zalman: { // Hasidic man in Shabbat dress: shtreimel, bekishe, peyot, white knee socks
    skin: '#f1d3b6', hair: '#7a4a24', style: 'short', eye: '#3c6a8a', cover: 'shtreimel', hat: '#7a4f2e', beard: 'full', peyot: 'long',
    top: '#15151b', coat: '#15151b', coatLong: 50, shirt: '#f6f6f8', bottom: '#15151b', shin: '#f2f2f4', shoes: '#0c0c10', acc: [],
  },
  jc_daniel: { // Modern Orthodox / Israeli: knitted kippah, tzitzit out over jeans
    skin: '#e9bf98', hair: '#2c1e16', style: 'messy', eye: '#3a2a1a', cover: 'kippah', kippah: { t: 'knit', a: '#2b5aa8', b: '#f2f2f2', star: true, starCol: '#f2f2f2' },
    beard: 'short', top: '#6a7f93', bottom: '#3a4a63', shoes: '#e8e8ea', sleeves: 'short', tzitzit: true, acc: ['belt'],
  },
  jc_rachel: { // Reform / Conservative woman in a tallit and an embroidered kippah
    skin: '#f5d8c0', hair: '#b5421f', style: 'curly', eye: '#4a7a5a', cover: 'kippah', kippah: { t: 'embroid', a: '#3a2a6a', b: '#e8c04a', c: '#c93a8a' },
    top: '#3a6a5a', bottom: '#2a2f45', shoes: '#6a3a2a', fem: true, acc: ['belt'],
    cloak: { color: '#f6f2e6', trim: ['#2c5fa8', '#2c5fa8'], atarah: '#c9ccd4', tzitzit: true, len: 20 },
  },
  jc_miriam: { // grandmother: silver hair, cardigan, mid-calf skirt, chai necklace
    skin: '#f3d7c0', hair: '#d9d9de', style: 'bob', eye: '#5a7a8a', top: '#6a4f86', bottom: '#3b3b4a', shin: '#c9a98c', shoes: '#3a2a2a',
    fem: true, skirt: { len: 32, trim: '#8f7ab0' }, pendant: 'chai', acc: ['collar'],
  },
  // ---- Sephardic
  jc_eli: { // Moroccan-French: white-and-gold kippah, linen shirt, tzitzit, Magen David on a chain
    skin: '#d5a06f', hair: '#17120f', style: 'short', eye: '#3a2412', cover: 'kippah', kippah: { t: 'embroid', a: '#f4f1e8', b: '#c9a23a', c: '#1f6f8a' },
    beard: 'short', top: '#ece5d3', bottom: '#4a5a6a', shoes: '#6a4a2a', tzitzit: true, pendant: 'magen', acc: ['belt'],
  },
  jc_esther: { // Sephardic woman: teal tichel, long dress with gold trim, Magen David
    skin: '#d9a676', hair: '#2a1a14', style: 'short', eye: '#4a2c18', cover: 'tichel', hat: '#1f7a7a', hat2: '#e8c04a',
    top: '#8f2f4f', bottom: '#8f2f4f', shin: '#2a2024', shoes: '#3a2230', fem: true, skirt: { len: 33, trim: '#e8c04a' }, edgeTrim: '#e8c04a',
    pendant: 'magen', acc: ['earring'],
  },
  // ---- Mizrahi
  jc_yosef: { // Yemenite: turban, long curled peyot, embroidered vest over a white robe
    skin: '#c58b5b', hair: '#1f1510', style: 'short', eye: '#2a1a10', cover: 'turban', hat: '#f1ede0', hat2: '#8f2d2d', beard: 'short', peyot: 'long',
    top: '#232232', coat: '#232232', coatLong: 40, shirt: '#f4f0e2', edgeTrim: '#c9a23a', bottom: '#ece6d4', shoes: '#5a3a22', acc: [],
  },
  jc_aron: { // Bukharian: tall embroidered kippah, striped silk chapan, sash
    skin: '#dcae83', hair: '#161012', style: 'short', eye: '#3a2a1a', cover: 'kippah', kippah: { t: 'embroid', tall: true, a: '#1f2f6a', b: '#e8c04a', c: '#c93a5a' },
    beard: 'short', top: '#7a2f66', coat: '#7a2f66', coatLong: 46, stripes: ['#c43a5a', '#2f6fb0', '#e8c04a', '#f2f2f2'], shirt: '#f4f4f4',
    sash: '#e8c04a', bottom: '#2a2a35', shoes: '#2a1a14', acc: [],
  },
  jc_shirin: { // Persian: long wavy hair, teal dress with gold trim, hamsa
    skin: '#dda97d', hair: '#1a0f0c', style: 'wavy', eye: '#3a2412', top: '#1f5a6a', bottom: '#1f5a6a', shin: '#2a2024', shoes: '#2a1a22',
    fem: true, skirt: { len: 32, trim: '#e8c04a' }, edgeTrim: '#e8c04a', pendant: 'hamsa', acc: ['earring'],
  },
  // ---- Beta Israel (Ethiopian)
  jc_almaz: { // white dress and shamma with a woven border, natural hair
    skin: '#6b4430', hair: '#120c0a', style: 'afro', eye: '#24160e', top: '#f6f3ea', bottom: '#f6f3ea', shin: '#6b4430', shoes: '#8a5a3a',
    fem: true, skirt: { len: 33, trim: '#b8452d' }, edgeTrim: '#b8452d', acc: ['earring'],
    cloak: { color: '#fbf9f2', trim: ['#b8452d', '#2f7a52', '#e8c04a'], trimW: 1.5, len: 21 },
  },
  jc_yonatan: { // white knitted kippah, button-down shirt, tzitzit, chai necklace
    skin: '#7a4f36', hair: '#120c0a', style: 'curly', eye: '#24160e', cover: 'kippah', kippah: { t: 'knit', a: '#f2f2f2', b: '#2b5aa8', star: true, starCol: '#2b5aa8' },
    top: '#e8eef4', bottom: '#2a2f45', shoes: '#2a2018', sleeves: 'short', tzitzit: true, pendant: 'chai', acc: ['belt'],
  },
});
for (const k of Object.keys(DESIGNS)) if (k.startsWith('jc_')) DESIGNS[k].key = k;

const COMMUNITY_LIST = [
  { id: 'jc_yossi',   name: 'Rabbi Yossi', he: 'ר׳ יוסי',  sub: 'Ashkenazi · Chabad rabbi',           color: '#17171d' },
  { id: 'jc_zalman',  name: 'Zalman',      he: 'זלמן',     sub: 'Ashkenazi · Hasidic, Shabbat dress', color: '#6a4528' },
  { id: 'jc_daniel',  name: 'Daniel',      he: 'דניאל',    sub: 'Ashkenazi · Modern Orthodox',        color: '#2b5aa8' },
  { id: 'jc_rachel',  name: 'Rachel',      he: 'רחל',      sub: 'Ashkenazi · tallit and kippah',      color: '#b5421f' },
  { id: 'jc_miriam',  name: 'Miriam',      he: 'מרים',     sub: 'Ashkenazi · grandmother',            color: '#d9d9de' },
  { id: 'jc_eli',     name: 'Eli',         he: 'אלי',      sub: 'Sephardic · Moroccan',               color: '#c9a23a' },
  { id: 'jc_esther',  name: 'Esther',      he: 'אסתר',     sub: 'Sephardic · tichel',                 color: '#1f7a7a' },
  { id: 'jc_yosef',   name: 'Yosef',       he: 'יוסף',     sub: 'Mizrahi · Yemenite',                 color: '#8f2d2d' },
  { id: 'jc_aron',    name: 'Aron',        he: 'אהרן',     sub: 'Mizrahi · Bukharian',                color: '#7a2f66' },
  { id: 'jc_shirin',  name: 'Shirin',      he: 'שירין',    sub: 'Mizrahi · Persian',                  color: '#1f5a6a' },
  { id: 'jc_almaz',   name: 'Almaz',       he: 'אלמז',     sub: 'Beta Israel · Ethiopian',            color: '#b8452d' },
  { id: 'jc_yonatan', name: 'Yonatan',     he: 'יונתן',    sub: 'Beta Israel · Ethiopian',            color: '#2b5aa8' },
];
