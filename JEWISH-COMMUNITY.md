# Jewish Community: characters and assets

Twelve original characters for Melon Sandbox, drawn from Ashkenazi, Sephardic, Mizrahi and
Beta Israel (Ethiopian Jewish) communities. They are in the spawn menu under **Jewish Community**,
and **Gather the community** places all twelve side by side. They are ordinary ragdolls (no Stands),
and they work with every tool, in JoJo mode or out of it.

Jewish life is not one look. These characters are an attempt at range: religious and secular-leaning,
Orthodox, egalitarian and everything between, young and old, women and men, and four broad heritages.
They are inspired by real traditions and are not portraits of anyone. **Please treat this as a first draft
and correct me**: if a detail is off, or something is missing that matters to you, say so and I will change it.

## How the art stays respectful

- **One shared face.** Every character uses the same anime face. Differences come from skin tone, hair,
  eye color, facial hair, clothing and accessories. No feature is exaggerated, and none is used as a signal
  of being Jewish.
- **Skin and hair vary within each heritage.** Ashkenazi characters range from very fair with red or gray
  hair to olive; Sephardic and Mizrahi from light olive to deep tan; Beta Israel characters have deep brown
  skin and tightly coiled hair.
- **The Magen David (Star of David) is only ever jewelry or embroidery**: a pendant, a kippah, a design on
  a tallit. It is never used as a badge, a target, or a label.
- **Sacred objects are left out on purpose.** Tefillin, Torah scrolls, mezuzot and siddurim are not in the
  game, because a physics sandbox throws everything around. Tallit and tzitzit are included because they
  are worn daily; say the word if you would rather drop them too.
- **No special treatment, good or bad.** They are people in a sandbox. The only difference from the plain
  Civilian is how they look. Stand AI treats every civilian the same way.

## The twelve

| Character | Heritage | Concept | Outfit |
|---|---|---|---|
| **Rabbi Yossi** (ר׳ יוסי) | Ashkenazi | A Chabad rabbi: warm, always on his way to a community event. | Black fedora, black suit jacket, white open-collar shirt, full dark beard, tzitzit worn out over the trousers. |
| **Zalman** (זלמן) | Ashkenazi | A Hasidic man dressed for Shabbat. | Round fur *shtreimel*, long black *bekishe* (coat), white shirt, long curled *peyot*, full ginger-brown beard, black trousers with white knee socks. |
| **Daniel** (דניאל) | Ashkenazi | Modern Orthodox, Israeli-style: casual and comfortable with both worlds. | Blue-and-white knitted kippah with a Magen David, short beard, blue-grey T-shirt, jeans, sneakers, tzitzit worn out. |
| **Rachel** (רחל) | Ashkenazi | An egalitarian (Reform / Conservative) woman at prayer. | Red curly hair, embroidered purple-and-gold kippah, cream tallit with blue stripes and a silver neckband, tzitzit at the corners. |
| **Miriam** (מרים) | Ashkenazi | A grandmother: gentle, silver-haired, has seen everything. | Silver bob, purple cardigan, mid-calf skirt, tan stockings, gold *chai* (חי, "life") necklace. |
| **Eli** (אלי) | Sephardic | A Moroccan-French dad, easy smile. | White kippah with gold and teal embroidery, short beard, linen shirt, tzitzit out, gold Magen David on a chain. |
| **Esther** (אסתר) | Sephardic | A woman from a Ladino-speaking family, elegant and quick-witted. | Teal *tichel* (headscarf) with gold trim and a knotted tail, rose-burgundy long dress with gold hem, dark stockings, Magen David pendant. |
| **Yosef** (יוסף) | Mizrahi (Yemenite) | A craftsman from a Yemenite family. | White turban with red stripes, long curled *peyot*, short beard, dark embroidered vest with gold edge over a white robe. |
| **Aron** (אהרן) | Mizrahi (Bukharian) | A Bukharian man in his festive best, proud of his family's silk. | Tall embroidered kippah in navy, gold and rose; striped silk *chapan* (long coat); gold sash; short beard. |
| **Shirin** (שירין) | Mizrahi (Persian) | A Persian Jewish woman, calm and dry-humored. | Long wavy dark hair, deep-teal long-sleeved dress with gold trim, mid-calf skirt, gold earrings, *hamsa* pendant. |
| **Almaz** (אלמז) | Beta Israel (Ethiopian) | A woman who carries her family's traditions with pride. | Natural coily hair, white dress, white *shamma* shawl with a woven red-green-gold border, terracotta hem trim, gold earrings. |
| **Yonatan** (יונתן) | Beta Israel (Ethiopian) | A young man in the middle of his week. | White knitted kippah with a blue Magen David, white button shirt, tzitzit out, gold *chai* necklace. |

## Asset catalog

Every asset is drawn in code (no image files) and cached like the rest of the anime art.
"Design option" is the field to set on a design in `js/community.js`.

### Head coverings (`cover`)
| Asset | Design option | What it is | Worn by |
|---|---|---|---|
| Kippah (yarmulke), knitted | `cover: 'kippah'`, `kippah: {t: 'knit', a, b, star}` | Concentric rings of two colors, with an optional Magen David at the center. | Daniel, Yonatan |
| Kippah, embroidered | `kippah: {t: 'embroid', a, b, c}` | A base color with a gold band and diamond stitching. | Rachel, Eli |
| Kippah, Bukharian | `kippah: {t: 'embroid', tall: true, ...}` | Taller, richly embroidered cap in several colors. | Aron |
| Kippah, plain | `kippah: {t: 'velvet'}` (default colors) | Solid black cloth or velvet. Available, not used yet. | none |
| Fedora | `cover: 'fedora'` | Black felt hat with a ribbon band and pinched crown. | Rabbi Yossi |
| Shtreimel | `cover: 'shtreimel'` | A wide round fur hat with a velvet top, worn on Shabbat by many Hasidic men. | Zalman |
| Turban | `cover: 'turban'` | Wrapped cloth in two colors, with a short tail at the back. | Yosef |
| Tichel | `cover: 'tichel'` | A headscarf wrapped over the hair, knotted at the nape with trailing tails. | Esther |

### Hair and face
| Asset | Design option | Notes |
|---|---|---|
| Curly hair | `style: 'curly'` | Tight curls built from overlapping clumps. Rachel, Yonatan. |
| Natural / coily hair | `style: 'afro'` | A full rounded crown. Almaz. |
| Bob | `style: 'bob'` | Chin-length. Miriam. |
| Long wavy hair | `style: 'wavy'` | Falls past the shoulders. Shirin. |
| Full beard | `beard: 'full'`, `beardCol` | Covers jaw and chin, with a moustache. Rabbi Yossi, Zalman. |
| Short beard | `beard: 'short'` | Trimmed along the jaw. Daniel, Eli, Yosef, Aron. |
| Peyot (sidelocks) | `peyot: 'long'` or `'short'` | A curl hanging in front of the ear. Zalman, Yosef. |

### Garments
| Asset | Design option | Notes |
|---|---|---|
| Tzitzit | `tzitzit: true` | The knotted fringes of the four-cornered undergarment (*tallit katan*), worn out over the trousers. Strands sway as the character moves. A blue thread (*techelet*) can be added with `techelet: true`. Available, not used yet. |
| Tallit (prayer shawl) | `cloak: {color, trim, atarah, tzitzit}` | Draped over the shoulders with stripes along the front edge, a decorated neckband, and fringes at the lower corners. Rachel. |
| Shamma | `cloak: {color, trim: [3 colors]}` | The Ethiopian white cotton shawl with a woven border. Almaz. |
| Long coat | `coat`, `coatLong` | The bekishe, the suit jacket and the vest all use the existing coat system. |
| Modest skirt | `skirt: {len, trim}` | Hangs from the waist to mid-calf and swings as the body moves. |
| Stockings, socks | `shin: '#color'` | Colors the lower leg independently of the trousers or skirt (Hasidic white socks, dark stockings, bare legs). |
| Striped silk | `stripes: [colors]` | Vertical stripes across the torso (Bukharian *chapan*). |
| Edge embroidery | `edgeTrim: '#color'` | A trim line down the front of a vest or dress. |
| Sash | `sash: '#color'` | A cloth band at the waist. |

### Jewelry and symbols
| Asset | Design option | Notes |
|---|---|---|
| Magen David pendant | `pendant: 'magen'` | A gold six-pointed star on a chain. Eli, Esther. |
| Chai pendant | `pendant: 'chai'` | The Hebrew letters חי ("life"), a very common necklace. Miriam, Yonatan. |
| Hamsa pendant | `pendant: 'hamsa'` | A hand-shaped protective charm, common in Sephardic and Mizrahi homes. Shirin. |
| Magen David lapel pin | `acc: ['magenPin']` | A small blue star on the chest. Available, not used yet. |
| Magen David on a kippah | `kippah.star` | See Daniel and Yonatan. |
| Earrings | `acc: ['earring']` | A small gold hoop. Esther, Shirin, Almaz. |

The star itself is `hexagram()` in `js/judaica.js`: two interlocked triangles drawn as one outline.

## Notes on the details

- **Tzitzit** are drawn with four visible strands, which is a stylization. Real tzitzit have eight strings
  per corner, wound and knotted in a specific pattern.
- **Tallit** colors vary (white with black, blue or silver stripes are common); stripes here follow the
  front edge as they do when a tallit is draped over the shoulders.
- **Women and ritual garments.** Rachel wears a tallit and a kippah, which is normal in egalitarian
  communities and not in all Orthodox ones. Esther wears a tichel and Miriam's hair is uncovered, which
  reflects different customs and not a ranking.
- **Heritage labels are broad.** "Mizrahi" and "Sephardic" cover many communities with different dress.
  Yemenite, Bukharian and Persian are here as three examples, and Moroccan stands in for North African
  Sephardim.
- **Names** are common first names in these communities, with the Hebrew spelling shown in the menu.

## Ideas for next time

- More communities: Indian (Bene Israel, Cochin), Iraqi, Syrian, Georgian, Mountain Jews, Kaifeng,
  Latin American and Black American Jews, converts, and secular and cultural Jews with no visible markers.
- More garments: a *gartel* (prayer belt), *kittel*, *bar mitzvah* outfit, Israeli work clothes, a Sephardic
  *tarbush*, Moroccan *djellaba*.
- Props that fit a sandbox: a *Hanukkiah* (menorah) that lights up, a *Shabbat table* with challah and
  candlesticks, a *shofar* that plays a blast, a sukkah.
- Voice lines: greetings such as *shalom*, *l'chaim*, *mazal tov*, in the speech-bubble style used for
  Stand cries.
