# Melon Sandbox — JoJo Mode

A 2D ragdoll physics sandbox (in the spirit of Melon Playground) with a toggleable
JoJo's Bizarre Adventure mode. Plain HTML/JS with no build step and no dependencies.
All art is drawn in code and all sound is synthesized.

## Run it
Double-click `index.html`. Or serve the folder if you prefer:

```bash
python -m http.server 8765
```

and open http://localhost:8765.

## Controls
| | |
|---|---|
| Spawn | Pick an item in the right-hand menu, click the world. Right-click / `Esc` stops placing |
| Tools | `1` Drag · `2` Control · `3` Delete · `4` Pin · `5` Boom · `6` Heal |
| Control a character | Double-click it (or Control tool) |
| Move / jump | `A` `D` / arrows · `W` / `Space` |
| Stand abilities | `J` `K` `L` · `P` pose · `Esc` release |
| World | `Space` pause (when not controlling) · `Z` slow-mo · `H` help |

On touch devices an on-screen action pad appears while you control someone.

## Stands (26, official manga names)
| Part | Stand — User | J | K | L |
|---|---|---|---|---|
| 3 | Star Platinum — Jotaro Kujo | ORA rush | Star Platinum: The World (time stop) | Star Finger |
| 3 | Magician's Red — Muhammad Avdol | Flame punch | Crossfire Hurricane | Red Bind |
| 3 | Hierophant Green — Noriaki Kakyoin | Emerald Splash | 20m Emerald Splash | Tentacle lash |
| 3 | Silver Chariot — Jean Pierre Polnareff | Rapier flurry | Armor Off | Sword launch |
| 3 | Hermit Purple — Joseph Joestar | Vine whip | Vine grab | Sunlight Yellow Overdrive |
| 3 | The World — DIO | MUDA rush | Time stop, then **Road Roller** | Knife volley |
| 4 | Crazy Diamond — Josuke Higashikata | DORA rush | Restore others | Heavy punch |
| 4 | The Hand — Okuyasu Nijimura | Erase (ガオン) | Space pull | Punch |
| 4 | Echoes ACT3 — Koichi Hirose | Rush | 3 FREEZE | ACT2 "BOING" |
| 4 | Killer Queen — Yoshikage Kira | Punch | First Bomb (K again = detonate) | Sheer Heart Attack |
| 4 | Heaven's Door — Rohan Kishibe | Punch | Turn into a book | Write a command |
| 5 | Gold Experience — Giorno Giovanna | MUDA rush | Life Giver | Life overload |
| 5 | Gold Experience Requiem — Giorno Giovanna | MUDA rush | Return to Zero | Infinite death |
| 5 | Sticky Fingers — Bruno Bucciarati | ARI ARI rush | Zipper | Zipper travel |
| 5 | Sex Pistols — Guido Mista | Shot | Six shooter | Pistols kick |
| 5 | Aerosmith — Narancia Ghirga | Machine gun | CO2 radar | Bomb drop |
| 5 | Purple Haze — Pannacotta Fugo | Rush (infects) | Virus capsule | Capsule burst |
| 5 | King Crimson — Diavolo | Chest chop | Erase time | Epitaph |
| 5 | Spice Girl — Trish Una | WANNABE rush | Soften | Soft ground |
| 6 | Stone Free — Jolyne Cujoh | ORA rush | String web | String pull |
| 6 | Whitesnake — Enrico Pucci | Punch | Disc steal | Acid fog |
| 6 | C-MOON — Enrico Pucci | Inside-out punch | Gravity repulsion | Gravity reversal |
| 6 | Made in Heaven — Enrico Pucci | Rush | Time acceleration | Speed blitz |
| 7 | Tusk ACT4 — Johnny Joestar | Nail shot | Infinite Rotation | ORA rush |
| 7 | Dirty Deeds Done Dirt Cheap — Funny Valentine | Punch | Parallel-world clone | Dimension hop |
| 8 | Soft & Wet — Josuke Higashikata (JoJolion) | ORA rush | Plunder: friction | Plunder: sight |

Hits landed in stopped time are stored and all land when time resumes. The **Stand Arrow**
awakens a random Stand in a civilian, unless they're not worthy.

## Satire Mode

A second toggle in the top bar (it works alongside JoJo mode) adds a **Satire** group to the spawn menu: made-up politicians that poke fun at the political process itself. Everyone is fictional and party-neutral, and the jokes are about promises, committees, spin and red tape.

| Character | Gag |
|---|---|
| Senator Flip-Flop | Changes sides when hit |
| President Filibuster | Never stops talking |
| Lobbyist | Coins fly out when hit |
| Pundit | Hot takes at all times |
| Bureaucrat | Slow, buried in red tape |
| Campaign Candidate | Promises melons (and drops them) |
| The Unkillable | Cannot die: no damage, limb loss, erasure, doom or gibbing gets through. Explicit Delete and Clear still remove it. |

Characters live in `js/satire.js` (`SATIRE_LIST`): add an entry and a design to add one. The Unkillable's `name` field is all you need to change to rename it.

## Art
Everything is drawn in code: an anime look with ink outlines and cel shading. Designs are
original interpretations built from each character's colors and silhouette, not traces.
Heads, torsos, limbs and Stand bodies are rendered once into cached sprites
(`sprite()` in `js/art.js`) and then rotated into place, which keeps 20+ fighters at 60 fps.

## Code map
| File | What |
|---|---|
| `js/engine.js` | Verlet physics: particles, constraints, collisions, time stop / acceleration bookkeeping |
| `js/art.js` | Anime character art: designs, hair styles, faces, cel-shaded limbs, sprite cache |
| `js/entities.js` | Ragdoll (muscles, AI hook, damage, status effects, dismemberment), crates, Road Roller, melon, knife, arrow |
| `js/stands.js` | `Stand` class (movement, hitting, timers, generic AI) and the `MOVES` ability registry |
| `js/standdefs.js` | The 26-Stand roster: names, stats, colors, art spec, J/K/L moves |
| `js/standart.js` | Stand figures, heads, patterns, auras, and the plane / pistols / vines Stands |
| `js/projectiles.js` | Projectiles, zones (virus cloud, emerald barrier, life tree, sound word), summons |
| `js/satire.js` | Satire Mode: fictional politician characters, their quips and quirks, the unkillable character |
| `js/jojo.js` | JoJo settings + presentation: backgrounds, time effects, stat card, To Be Continued |
| `js/effects.js` | Blood, fire, fog, cries, rings, sparks, ゴゴゴ |
| `js/audio.js` | Synthesized SFX + optional text-to-speech |
| `js/main.js` | Loop, rendering order, input, UI |

**Adding a Stand:**
1. Add an entry to `STAND_LIST` in `js/standdefs.js`.
2. Point its `moves` at names in `MOVES`, reusing existing moves or adding new ones.
3. Pick an `art.head` and `art.pattern`, or add new ones in `standart.js`.
4. If the user needs a new look, add a design to `DESIGNS` in `art.js`.

The spawn menu, stat card, action pad and AI pick up the new Stand automatically.
