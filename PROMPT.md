# Improved prompt

> **Original:** "create me a jojo bizzare adventure mode for melon sandbox. from scratch."

---

Build **Melon Sandbox**, a browser-based 2D ragdoll physics sandbox inspired by Melon Playground,
from scratch, with a toggleable **JoJo's Bizarre Adventure mode**.

## Constraints
- Runs by double-clicking `index.html`. No build step, no npm, no frameworks, no server.
- No copyrighted assets: every sprite is drawn with canvas code, every sound is synthesized with Web Audio.
  Character designs are *inspired by* the series (outfits, colors, catchphrases), not traced.
- Works with mouse + keyboard on desktop and with touch on tablets/phones (on-screen action pad).
- Smooth at 60 fps with ~20 ragdolls on screen.

## Core sandbox (works with JoJo mode OFF)
- **Physics:** Verlet particles + distance constraints, fixed timestep, circle–circle and circle–polygon
  collisions, ground friction and bounce, velocity clamping so nothing explodes.
- **Melon people:** 12-particle ragdolls with watermelon heads. Muscles keep them standing, balancing and
  getting back up. They walk, jump, take impact damage, bleed, get stunned, die (limp + X eyes), and can
  lose limbs from explosions or catastrophic force.
- **Props:** crate, watermelon ball, knife.
- **Tools:** Drag/throw · Control (walk/jump a character) · Delete · Pin · Explode · Heal.
- **World controls:** pause, slow-mo, clear, sound toggle, help screen.

## JoJo mode
Toggling it on re-skins the UI and background (purple/gold, halftone, ゴゴゴ) and unlocks a JoJo spawn category.

| Stand user | Stand | J | K | L |
|---|---|---|---|---|
| Delinquent in a cap | Star Platinum | ORA rush | Time stop (3.5 s) | Star Finger |
| Vampire in yellow | The World | MUDA rush | Time stop (5 s) → press again for **Road Roller** | Knife volley |
| Office worker | Killer Queen | Punch | Touch something to turn it into a bomb | Detonate the bomb |
| Pompadour student | Crazy Diamond | DORA rush | Restore nearby people (heal, revive, re-attach limbs) | Heavy punch |
| Pink-haired boss | King Crimson | Chest chop | Erase time (intangible, reappear behind target) | Epitaph blink |

**Time stop rules:** everything except the user freezes, including falling blood. Hits landed during a stop
are *stored* and all apply at once when time resumes. Thrown knives fly briefly and then hang in the air.
Star Platinum and The World users can start moving inside the other's stopped time after about a second.
Visuals: an inverted-color shockwave, then a desaturated world, a countdown, and a "time resumes" callout.

**Other features**
- **Stand Arrow** prop. Stab a normal melon person with it to awaken a random Stand (or get "not worthy").
- A Stand stat card (Power/Speed/Range/Durability/Precision/Potential hexagon) pops up when a Stand appears.
- Stand cries (ORA/MUDA/DORA) float over the fight. Two rushes that meet produce a **rush clash**.
- Menacing ゴゴゴ glyphs drift off Stand users. A **pose** key strikes a JoJo pose.
- A **"To Be Continued"** sepia freeze-frame when a Stand user dies. It can be turned off.
- **Stand AI:** uncontrolled Stand users fight each other and use their abilities. You can also let them
  attack civilians.
- Optional text-to-speech voice lines. Off by default.

## Acceptance criteria
1. Open `index.html`, spawn two Stand users, and they fight on their own with no console errors.
2. Take control of The World, stop time, rush a frozen enemy, and see all the damage land when time resumes.
3. Killer Queen can bomb a crate or a person. Crazy Diamond can put the victim back together.
4. Everything is playable by touch alone.

---

# Improved prompt — v2 (Stand roster + anime art)

> **Original:** "add more stands like gold experience and made in heaven. name exactly like manga. add more stand. I want better livings looks cool and real, like on anime. Let's get all stands from jojo. … do you need a 3d model for the stand"

---

Expand Melon Sandbox's JoJo mode into a **26-Stand roster** and upgrade every character to an **anime look**.
Stay in the existing 2D canvas engine. 3D models are not needed.

## Art direction (2D, anime-style)
- **People become anime humans. No more melon heads.** Draw a side-view anime head with a jaw, nose and ear.
  Eyes get an iris, pupil, highlight and a thick lash line. Add eyebrows, and switch expressions:
  normal, angry, shouting while rushing, hurt, dead.
- **Cel shading with ink outlines everywhere.** Limbs are tapered capsules with a shadow band and a dark outline.
  The torso is split into a lit front and a shaded back. Hair has a shaded rim.
- **Every Stand user gets a signature design:** hair silhouette, outfit colors and accessories.
  Examples: Jotaro's cap and long coat with a gold chain, Giorno's three curls with a braid and ladybug brooch,
  Bucciarati's zippers, Jolyne's hair buns. Civilians get randomized designs.
- **Stands get detailed figures:** muscular V-torso, shoulder armor, gloves and a unique head for each Stand.
  Add patterns (stars, hearts, zippers, DNA script, capsules), an animated flame-like aura, and a ghost tail,
  legs or horse legs. Some Stands aren't humanoid: Aerosmith is a plane, Sex Pistols are six tiny bullet-riders,
  and Hermit Purple is thorny vines.
- **Copyright:** designs are original interpretations built from recognizable colors and silhouettes.
  Nothing is traced from the anime.

## Names
Use the **official manga names** for Stands (e.g. *Gold Experience Requiem*, *Echoes ACT3*, *C-MOON*,
*Dirty Deeds Done Dirt Cheap*) and for their users. Show the katakana name on the stat card.

## Roster (J / K / L abilities)
| Part | Stand — User | J | K | L |
|---|---|---|---|---|
| 3 | Star Platinum — Jotaro Kujo | ORA rush | Star Platinum: The World (time stop) | Star Finger |
| 3 | Magician's Red — Muhammad Avdol | Flame punch (burn) | Crossfire Hurricane | Red Bind |
| 3 | Hierophant Green — Noriaki Kakyoin | Emerald Splash | 20m Emerald Splash (tripwire barrier) | Tentacle lash (pull) |
| 3 | Silver Chariot — Jean Pierre Polnareff | Rapier flurry | Armor Off (speed) | Sword launch |
| 3 | Hermit Purple — Joseph Joestar | Vine whip | Vine grab | Sunlight Yellow Overdrive (x3 vs vampires) |
| 3 | The World — DIO | MUDA rush | Time stop → Road Roller | Knife volley |
| 4 | Crazy Diamond — Josuke Higashikata | DORA rush | Restore | Heavy punch |
| 4 | The Hand — Okuyasu Nijimura | Erase (deletes limbs/objects) | Space pull | Punch |
| 4 | Echoes ACT3 — Koichi Hirose | Rush | 3 FREEZE (target pinned) | ACT2 sound word "BOING" |
| 4 | Killer Queen — Yoshikage Kira | Punch | First Bomb (touch / detonate) | Sheer Heart Attack |
| 4 | Heaven's Door — Rohan Kishibe | Punch | Turn into a book | Write a command |
| 5 | Gold Experience — Giorno Giovanna | MUDA rush | Life Giver (tree / frogs) | Life-energy overload (slow) |
| 5 | Gold Experience Requiem — Giorno Giovanna | MUDA rush | Return to Zero | Infinite death |
| 5 | Sticky Fingers — Bruno Bucciarati | ARRIVEDERCI rush | Zipper (unzip a limb) | Zipper travel |
| 5 | Sex Pistols — Guido Mista | Shot | Six-shot volley | Pistols kick (re-aim bullets) |
| 5 | Aerosmith — Narancia Ghirga | Machine gun | CO2 radar | Bomb drop |
| 5 | Purple Haze — Pannacotta Fugo | Rush (infects) | Virus capsule | Capsule burst |
| 5 | King Crimson — Diavolo | Chest chop | Erase time | Epitaph |
| 5 | Spice Girl — Trish Una | WANNABE rush | Soften (rubber) | Soft ground launch |
| 6 | Stone Free — Jolyne Cujoh | ORA rush | String web | String pull |
| 6 | Whitesnake — Enrico Pucci | Punch | Disc steal (removes the Stand) | Acid fog (blind) |
| 6 | C-MOON — Enrico Pucci | Inside-out punch | Gravity repulsion | Gravity inversion |
| 6 | Made in Heaven — Enrico Pucci | Rush | Time acceleration | Speed blitz |
| 7 | Tusk ACT4 — Johnny Joestar | Nail shot | Infinite Rotation | ORA rush |
| 7 | Dirty Deeds Done Dirt Cheap — Funny Valentine | Punch | Parallel-world clone (ally) | Dimension hop |
| 8 | Soft & Wet — Josuke Higashikata (JoJolion) | ORA rush | Plunder friction bubble | Plunder sight bubble |

## Systems this needs
- A **data-driven move registry**: each move has `run`, a cooldown and an AI hint (range and rate),
  so the generic AI can use any Stand.
- **Projectiles:** fire, emerald, bullet, nail, blade, bubble, capsule and bomb, with optional homing,
  pierce and a status effect on hit.
- **Status effects:** burn, virus, heavy, book, bound, rubber, slow, blind, slip, float, spin, doom (infinite death)
  and zero (Return to Zero). Each gets a visual.
- **Zones and summons:** virus cloud, emerald barrier, life tree, frogs, Sheer Heart Attack, D4C clone.
- **Teams**, so clones and summons don't attack their owner.
- **Global time acceleration** for Made in Heaven: the whole sim runs faster, the user runs faster still,
  and the sky cycles through day and night.
- The spawn menu is grouped by Part. Action-pad labels change with state (Detonate!, Road Roller!).

## Acceptance
All 26 Stands spawn, show a stat card, and use all three abilities under AI with no console errors.
Every status effect has a visible effect. It still runs at 60 fps with 20 characters.
