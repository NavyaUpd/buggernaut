# CLAUDE.md — BIJLI
**TGC Game Jam @ Infinium '26 (IIIT Hyderabad)** · GDAI · Games for Change India
Team **Buggernaut**: Hansika Grover (systems), Shaurya Chandel (levels & story), Navya Upadhyay (look & sound)
Repo: https://github.com/NavyaUpd/buggernaut
Themes: **Comic · Twist · Light** (all three mandatory; theme association is scored)
Hard deadline: **Tue 6 Oct 2026, 4:00 PM IST**. Internal freeze: **Tue 6 Oct, 12:00 PM**.
Target: browser game (HTML5/WebGL), **12–18 minutes**, learnable by any judge in under a minute.

> **How to use this file**
> 1. This file lives at the repo root. Commit early and often, because a steady history matters for originality checks.
> 2. In Claude Code: *"Read CLAUDE.md completely. Execute Phase 0, then Phase 1. Commit after every task. Update STATUS when a phase ends."*
> 3. Every new session: *"Re-read CLAUDE.md, read STATUS, continue."*
> 4. Each person runs their own Claude Code session on their own area (§15) and merges to `main` often.

---

## 1. The game in one breath
A monsoon night. The city's power is out. A lineworker in a helmet and raincoat climbs poles in the storm, splicing
snapped cables and dodging live wires to bring the light back, district by district. At home, a child named
**Chinni** sits by candlelight drawing a comic about the lineworker as a superhero called **BIJLI**.

**The one rule: wherever you bring the light back, the world turns into Chinni's comic, and the comic helps you through.**
Darkness is the real world: dangerous, rainy, lit only by your headlamp. Light is the comic world: bright crayon
colours, platforms Chinni drew, hazards turned friendly. Chinni's drawings are a power-up that makes you BIJLI for
8 seconds.

On the last street, the house lights up, Chinni runs to the window, the lineworker takes off the helmet, and **it's Amma**.
*Bijli* means both **electricity** and **lightning** in Hindi.

### Submission pitch (spoiler-free)
> **BIJLI** is a monsoon-night platformer about the people who bring the light back. Climb poles, splice live cables
> and dodge lightning as a lineworker. Wherever you restore the light, the city turns into a child's comic book,
> with crayon clouds to stand on, wires to grind and storm hazards turned into cartoons. One storm, one long night home.

---

## 2. Theme map (each theme is something the player does)
| Theme | Core mechanic | World | Story |
|---|---|---|---|
| **Light** | Restoring power is the goal, and **light transforms the level**: lit areas gain comic platforms, rails and friendly hazards. In the dark you see only your headlamp, lit lamps and lightning flashes. | A blacked-out city lighting up behind you, lamp by lamp | "LIGHT AA GAYI!" cheers from windows; the last light is home |
| **Twist** | **Every repair is a twist**: splicing is a physical twisting gesture. Light **twists each hazard into its comic twin**. | Every real danger has a comic double | **Plot twist**: the hero is Amma |
| **Comic** | Lit areas **are** Chinni's comic, with their own platforms, rails and rules. **Chinni's drawings** are the power-up that turns you into BIJLI. | Ink, halftone, crayon fills, onomatopoeia | The story is told through Chinni's comic pages; the finale is the last page |

The message comes through play: everyday heroes doing jobs people call "not your job". It is inspired by the real
linewomen of Telangana (§11.4).

---

## 3. Non-negotiables
1. **Four inputs only:** move, jump, climb, interact (plus pause and restart). No mode switch, no meter, no attack button.
2. **Learnable in 60 seconds:** the first lamp in L1 teaches the core rule without a single word.
3. **No text walls:** captions ≤ 10 words, key prompts, onomatopoeia, short phone messages between levels.
4. **Every judge finishes:** lit streetlamps are checkpoints, "Skip level" is in pause from the start, and total
   run time is 12–18 min.
5. **60 fps** in Chrome on a mid laptop at 1280×720, with a quality toggle and auto-downgrade.
6. **Photosensitivity:** a "Reduce flashing" toggle plus a one-line notice on the title. With it on, lightning
   becomes a soft brighten.
7. **Gender-neutral until the reveal:** no he or she pronouns, a bulky gear silhouette, and the hero is only ever
   called "Bijli" or "Crew 7".
8. **Originality and rules:** all art generated in code (SVG/procedural), all audio procedural WebAudio, all code
   written during the jam. Check the Discord rules for libraries, assets and AI tools, and log everything in
   `CREDITS.md` plus an "AI usage" section in the README.
9. **`main` always builds.** Small commits.
10. **Safety:** never imply players should touch wires. The end card includes a safety line (§11.3).

---

## 4. Tech stack
- **Vite + TypeScript (strict) + Phaser 3** (pin the latest 3.x), Arcade Physics, WebGL renderer.
- `vite.config.ts`: `base: './'` so `dist/` runs from a zip (itch.io / Indieconnect HTML5).
- **One custom PostFX pipeline** (`WorldPipeline`) renders the real look and the comic look, mixed per pixel by a
  **light mask** (§10.3).
- **Pure-TS core** (no Phaser/DOM): `power/`, `splice/`, `level/` parser and validator, tested with **Vitest**.
- **Playwright** smoke test: boot, load L1, complete it via the debug API, take screenshots.
- Procedural WebAudio (§12). Lint/format: eslint + prettier.
- Scripts: `dev`, `build`, `preview`, `test`, `typecheck`, `lint`, `validate-levels`, `e2e`.

### Folder layout
```
src/
  main.ts                       # Phaser config, scenes, pipeline registration
  config.ts                     # ALL tunables — single source of truth
  core/                         # pure TS, no Phaser
    power/graph.ts power/types.ts   # nodes, edges, breakers, loads, powered-set BFS, events
    splice/splice.ts                # hold progress, shock rule, gloves
    level/schema.ts level/parse.ts level/validate.ts
    rng.ts
  scenes/ BootScene TitleScene LevelScene InterstitialScene FinaleScene CreditsScene PauseScene UIScene
  world/
    LightField.ts               # builds the light mask RT (lamps, windows, live wires, headlamp, flashes)
    ComicLayer.ts               # comic-only objects; solid only where lit (clouds, ladders, rails, friendly twins)
    Lightning.ts Rain.ts Wires.ts Parallax.ts
  player/ Player.ts Controller.ts Rig.ts skins/real.ts skins/bijli.ts
  entities/
    Pole.ts Breaker.ts BreakPoint.ts Streetlamp.ts Load.ts Pickup.ts Van.ts Water.ts
    hazards/ LiveWire.ts Tree.ts Flood.ts Fire.ts StrikeZone.ts      # each has a real + comic form
    boss/ AgniDragon.ts
  fx/ pipelines/WorldPipeline.ts pipelines/glsl/*.frag Onomatopoeia.ts Sparks.ts Shake.ts HitStop.ts SpeedLines.ts
  ui/ HUD.ts Prompts.ts PhoneMessage.ts ComicPage.ts Menus.ts
  audio/ Engine.ts Music.ts Sfx.ts Ambience.ts
  art/svg/*.ts                  # SVG strings → textures at boot
  levels/ L1_gali.ts … L7_ghar.ts
  story/script.ts               # every user-facing string
  debug/DebugAPI.ts             # window.__bijli: level select, god mode (F1), complete-splice, toggle light mask view
tests/ e2e/
```

---

## 5. Controls (that's all of them)
| Action | Keys |
|---|---|
| Move | A / D or ← / → |
| Jump | Space (or W / ↑ when not on a pole) |
| Climb | W / S on poles and ladders |
| Interact | E: breakers, pickups. **Splice: hold E** (about 1 s) |
| Pause / Restart | Esc / R |
Prompts appear only near objects. There is never a full control list on screen.

---

## 6. Core system: light makes the comic

### 6.1 The light field
- Each frame `LightField` renders a **light mask** (a half-resolution render texture, 0 = dark, 1 = lit) from:
  powered streetlamps (soft circles, radius 180–260 px), lit windows (warm rectangles with spill), powered live
  wires (thin glowing bands, ±40 px), the headlamp cone (35°, 320 px, **real-world vision only, does NOT create
  comic**), lightning flashes (full screen, 0.4 s), and BIJLI mode (full screen).
- The same mask drives three things:
  1. **Vision:** darkness alpha = 1 − mask (with the headlamp added for vision only).
  2. **Rendering:** `WorldPipeline` mixes the real look and the comic look per pixel by the mask, with an inky,
     noisy edge where light meets dark (§10.3).
  3. **Gameplay:** comic objects are solid or active only where the mask is > 0.5 at their position (sampled from a
     CPU-side coarse grid at 16 px cells, updated when lights change, not every frame).

### 6.2 What light turns on (comic objects, authored per level)
| Comic object | Effect inside light | Outside light |
|---|---|---|
| **Crayon cloud** | One-way platform; bobs gently | Not drawn, not solid |
| **Drawn ladder / rope** | Climbable | Absent |
| **Lightning rail** (any powered wire inside light) | Land on it to **grind** at 520 px/s in your facing direction; jump to leave. Speed lines + crackle. | A live wire = hazard |
| **Friendly twins** of hazards | See §8: the hazard becomes a helpful comic version | The hazard is dangerous |

The rule players learn by L2: **dark = careful, light = playground.**

### 6.3 Lightning flashes (the peek)
Every 10–16 s: a 1.2 s telegraph (rumble, distant flicker), then a strike. The whole screen turns comic for 0.4 s,
showing every crayon cloud, ladder and rail in the level, including ones not yet unlocked. It's a free hint about where
lighting will open paths. Comic objects revealed by a flash are **not** solid (visual only), except in BIJLI mode.

### 6.4 Power-up: Chinni's drawing → BIJLI mode
- A floating crayon page (visible in both looks). Touching it gives **8 s of BIJLI mode**, like a star power-up:
  - The whole screen is comic (mask = 1), so every comic object is solid and every wire is a rail, even unpowered ones.
  - Double jump, run speed +25%, jump +12%.
  - **Touching a hazard knocks it out** (THWACK! + confetti dots). Snapped wires go limp for good, branches shatter,
    the fire dragon takes a hit (boss).
  - Invulnerable to shocks and hits, but **not** to falling into flood water (keeps the floods meaningful).
- The last 2 s blink with a ticking sound, then the world snaps back to light/dark with an ink "POOF".
- Placement: before the hardest dark stretches (L4+), and 3 refills in the boss arena. Two per level at most outside the boss.

### 6.5 The storm fights back (L4 onward)
- A telegraphed strike can hit a lamp. It flickers for 1 s, then goes out for 6 s. Its comic objects fade and stop
  being solid, so a player standing on its cloud falls. That's fair because of the flicker warning.
- Lamps restored by the player are never permanently lost: after 6 s they relight with a cheer.

---

## 7. Mechanics in detail

### 7.1 Platforming feel (starting values; all in `config.ts`)
| Param | Normal | BIJLI mode |
|---|---|---|
| Max run speed | 220 px/s | 275 |
| Ground accel / decel | 1900 / 2400 px/s² | 2600 / 3000 |
| Air control | 0.8 | 0.95 |
| Jump velocity | 620 | 690 (+ double jump 560) |
| Gravity / fall multiplier | 1700 / 1.6 | 1550 / 1.45 |
| Max fall speed | 900 | 840 |
| Coyote / jump buffer | 100 ms / 120 ms | same |
| Variable jump cut | ×0.45 velocity | same |
| Climb speed | 150 | 190 |
| Rail grind speed | 520 | 620 |
| I-frames after hit | 900 ms | always invulnerable |
Health is **3 sparks**. A shock or hit costs 1. Live flood water is instant respawn at the last lit lamp.

### 7.2 Power network (`core/power/graph.ts`, pure and tested)
- **Nodes:** `Source`, `Pole`, `Breaker` (open/closed), `Load` (house, shop, streetlamp, hospital wing, pump,
  shutter, lift), `Junction`.
- **Edges:** `{id, a, b, state: 'intact'|'broken', phase?: 'R'|'Y'|'B'}`.
- **Powered set:** BFS from every Source through intact edges, passing a Breaker only if closed.
- **Events:** `onPowered(loadId)` lights its windows and lamp, updates `LightField` (which turns on comic objects
  in range), plays a "LIGHT AA GAYI!" bubble and makes the lamp a checkpoint. `onDepowered` reverses it.
- **Splice rule:** a broken edge can be spliced only if neither endpoint is powered. Otherwise the player is
  shocked (−1, knockback, KZZZT!) unless they hold **Rubber Gloves** (single use).
- **Level win:** all target loads powered → celebration → the van exit opens.
- **Validator** (`validate-levels`): prove a breaker/splice sequence exists that powers all targets, and that every
  splice point is reachable. Reachability is checked twice, in darkness only and with all comic objects active,
  and must not require a lightning-flash-only path. Fail the build otherwise.

### 7.3 Splicing (the twist), kept deliberately simple
- At a `BreakPoint`, **hold E for about 1 s**. That's the whole input. The hero grabs both frayed ends and twists
  them together on screen: three quick twist beats (creak, small shake, sparks) timed across the hold, shown in a
  small close-up inset with a comic-panel border.
- Releasing E early cancels with no penalty. The world keeps running during the hold (rain, rising flood,
  generator timer), which gives tension without needing skill input.
- Splicing a line that is still live shocks you (−1, KZZZT!) unless you hold Rubber Gloves, so players learn to
  open the upstream breaker first.
- Success: an ink-stamp "TWIST!" with 80 ms hit-stop. The cable straightens (dead/grey) until its breaker closes.
  Then **an energy pulse runs along the wire to each load**, lamps flicker on, and the comic blooms outward from each lamp.
- The Twist theme lives in what the player **sees and hears** here (the twisting animation and the stamp), not in a
  complicated gesture. Mechanics may change later; keep the splice logic in `core/splice/` behind a simple
  `startSplice / tick / cancel` API so it's easy to swap.

### 7.4 Breakers
Lever boxes on poles and walls. E toggles them with a chunky lever animation and KA-CHUNK. State is shown by both
shape (lever up/down) and colour (green/red lamp).

### 7.5 Pickups
| Pickup | Effect |
|---|---|
| **Chinni's drawing** | 8 s BIJLI mode (§6.4) |
| **Chai** (steel tumbler) | +1 spark |
| **Rubber gloves** | one live splice without a shock |
| **Battery** | wider, longer headlamp for 20 s (vision only) |
| **Crayon** (collectible, 3 per level) | unlocks a bonus page of Chinni's comic in the gallery |

---

## 8. Hazards and their friendly comic twins
| Real hazard (in the dark) | Comic twin (in light) | How it helps |
|---|---|---|
| **Snapped live wire**: whips and sparks, touch = −1 | **Taar-Naag**, a goofy cartoon snake | Bounce on its head for a high jump (BOING!) |
| **Fallen gulmohar tree** blocking the path, branches drop | **Ped-Bhaiya**, a sleepy tree that bows | Its trunk becomes a ramp |
| **Flood water** (rises in L3; deadly near live lines) | Crocodiles drifting on the water | Hop across them as moving platforms (they sink after 1.5 s of standing) |
| **Lightning strike zones** (telegraphed ground glow) | **Toofan Raja**, a grumpy cloud face in the sky | Purely visual in light; strikes still telegraphed |
| **Burning transformer** (L6) | **Agni-Dragon**, the one twin light can't tame | The boss: only BIJLI mode can hurt it (§9, L6) |
A twin applies only while its position is lit. If a storm strike knocks out the lamp, it turns back into the real
hazard. Never demonise animals or people: dogs, cows and stranded people stay neutral and kind in both looks.

---

## 9. Levels (7, each adds ONE idea, 1.5–3 min each)
Tiles are 32 px. The viewport is 1280×720. Every level ends at the crew van once all targets are lit.

**L1 · Gali No. 4 (lane).** ~120×30. Teaches run, jump, climb, breaker → splice → breaker. The **first lamp
lights**, the lane blooms into comic, and a crayon cloud appears that is the only way up to a balcony. A dark
stretch where only lightning shows the gap teaches flashes. 6 houses.
Caption: *"Tonight the whole city went dark. Except BIJLI."*

**L2 · Bazaar.** ~160×30. A sparking wire blocks a narrow lane, deadly in the dark. Light the lane and it becomes
Taar-Naag; bounce off it to reach the rooftops. The first **lightning rail** grind across the bazaar wires. Lit
shops roll up their shutters and open routes.

**L3 · Underpass.** ~140×35. Water rises 2 tiles/min. You must open the upstream breaker before splicing near
water, then light the underpass lamps so the water fills with crocodiles to hop across. Lighting the pumps stops
the rise.

**L4 · Rooftops.** ~70×90 (vertical). Wind gusts (telegraphed by rain angle), and storm strikes knock lamps out
(§6.5). The **first Chinni's drawing** comes before a long unlit gap: in BIJLI mode, every wire is a rail and you
fly through. Ped-Bhaiya becomes the ramp to the top. The zipline-free descent is a long rail grind over the lit
neighbourhood (money shot).

**L5 · Hospital.** ~150×40. The generator fuel bar is the timer (3:30, generous). Three feeders can be fixed in
any order, and the HUD shows which wing each powers. When the last wing lights, a nurse waves and a bubble reads
*"The babies are warm again."* If the timer runs out, the staff find more diesel (+60 s). Never punish harshly here.

**L6 · Substation (boss).** ~100×40 arena. The burning transformer, lit by your own restored lamps, becomes
**Agni-Dragon**. Three phases, one per electrical phase **R / Y / B**:
1. The dragon sweeps fire across the floor. Grab a drawing, then as BIJLI jump-touch its glowing chest node (one
   hit = stagger). While it's staggered (6 s), splice the **red** cable.
2. The dragon flies. The arena lamps relight crayon clouds and rails; grind up to a drawing at the top, hit its
   head, then splice **yellow**.
3. Storm strikes knock lamps out while the floor floods. Chain two drawings, deliver the final hit, splice
   **blue**, close the main breaker. The skyline lights up in a wave and the theme hits full.

**L7 · Ghar (home).** ~90×25. No enemies, no timer, the rain thins to a drizzle. One last service line to a small
house with a candle in the window. Splice, close the breaker, the house lights. **Chinni** runs to the window.
Cut to the finale (§11.3).

**Total:** about 14 min first play. Level select unlocks after first completion. Skip level is always in pause.

### 9.8 Level data format
```ts
export const L1: LevelSource = {
  id: 'L1', name: 'Gali No. 4', music: 'theme',
  weather: { rain: 0.7, wind: 0.2, lightning: [12, 16], stormStrikesLamps: false },
  map: [
    '................................................',
    '..........|.........|....c.....H...............',
    '.....P....|...L.....|....B.....H......X........',
    '##########=####=#####=##########################',
  ],
  // legend: '#' solid · '=' one-way (balcony/awning) · 'H' ladder · '|' pole · 'P' spawn · 'L' streetlamp
  // 'B' breaker · 'X' break point · 'V' van · 'S' strike zone · 'W' water level · 'h' house load
  // pickups: 'D' Chinni's drawing · 'T' chai · 'G' gloves · 'y' battery · 'C' crayon collectible
  // comic objects (solid only when lit): 'c' crayon cloud · 'k' drawn ladder · 'n' Taar-Naag anchor · 't' tree twin
  network: {
    nodes: [{ id: 'SRC', kind: 'source', at: [0, 2] }, { id: 'P1', kind: 'pole', at: [10, 1] }],
    edges: [{ id: 'e1', a: 'SRC', b: 'P1', state: 'intact' }, { id: 'e2', a: 'P1', b: 'P2', state: 'broken' }],
    breakers: [{ id: 'BR1', node: 'P1', closed: true }],
    loads: [{ id: 'L1a', node: 'P2', kind: 'streetlamp', at: [15, 2], lightRadius: 220 }],
    targets: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  },
  story: { caption: 'Tonight the whole city went dark. Except BIJLI.' },
};
```

---

## 10. Art direction: one city, two looks, blended by light

### 10.1 In the dark: "Monsoon Noir"
- Deep night, heavy rain, wet surfaces. Light is precious.
- Palette: night `#141A2E`, rain slate `#5C6B8A`, wet highlight `#2B3550`, sodium lamp `#FFB347`, live arc `#7FE3FF`,
  danger `#FF4D4D`, window warmth `#FFD58A`.
- Post: cool grade, slight desaturation, film grain, vignette.
- Details: 3 parallax rain layers angled by wind, splashes, puddle shimmer, dripping awnings, tangled overhead cables,
  laundry lines, posters, a chai stall shutter, scooters under tarps, a temple bell.
- Lightning: one frame of black silhouettes against white, then the 0.4 s comic peek, then a fade back.

### 10.2 In the light: "Chinni's Comic"
- Bright, flat, joyful. Crayon-textured fills, wobbly ink outlines, halftone shading, misregistered print colours.
- Palette: paper `#FFFFFF`, ink `#000000`, crayon yellow `#FFD400`, red `#FF3B30`, blue `#2F6BFF`, green `#2ECC71`,
  BIJLI cyan `#4FF0FF`, cape magenta `#FF3E9A`.
- Post: posterize (4 levels), Sobel ink edges on luminance (2 px, slight wobble), halftone in darker bands,
  1–2 px CMY misregistration, paper texture, saturation boost.
- Comic objects (clouds, ladders, twins) are drawn in crayon style with visible strokes, **animated on twos**
  (12 fps), so they read as drawn rather than real.
- Onomatopoeia: KZZZT, TWIST!, KA-CHUNK, BOING, WHOOSH, KRAKOOM, THWACK, LIGHT AA GAYI!

### 10.3 The light boundary (signature visual)
`WorldPipeline` gets the scene, the light mask and `uTime`. Per pixel: `t = smoothstep(0.45, 0.55, mask + fbm(uv*8 + time)*0.12)`,
then `mix(realLook, comicLook, t)`. A thin black ink rim sits where `t ≈ 0.5`. The result is that light pools look
like a comic page **painted into** a rainy photo-like night, and the edge crawls slightly like wet ink.
When a lamp powers up, its radius animates from 0 to full over 450 ms with an overshoot (the "bloom"), which is the
most satisfying moment of the game. Make it perfect.

### 10.4 Characters (procedural rig, no imported art)
- `Rig.ts`: 2D skeleton (torso, head, arms, legs, hands, feet) from SVG part textures. Procedural animations:
  idle, run, jump squash/stretch, climb, grind crouch, splice (hunched, hands together), hurt, celebrate,
  helmet-off (finale).
- **Real skin:** hard hat with headlamp, raincoat over a khaki-style uniform, tool belt, harness, rubber boots.
  Bulky and gender-neutral.
- **BIJLI skin** (when standing in light or in BIJLI mode): the helmet gains a lightning crest, the raincoat
  becomes a cape with a **sari-border pattern** (an easter egg that makes sense only after the reveal), pliers
  become glowing gauntlets, and a crayon lightning emblem appears on the chest. The skin swap follows the light
  mask at the player's position, so the hero looks like a superhero exactly where Chinni's comic exists.
- **Chinni:** about 8, big T-shirt, crayon in hand. **Amma (reveal):** tired, warm smile, hair tied up, rain on her face.

### 10.5 Juice checklist (Phase 4, each ≤ 30 min)
- Landing dust + squash, wet footsteps, fading footprints
- Lamp bloom (radius overshoot + moth swarm + "LIGHT AA GAYI!" + ceiling fan spinning in a window)
- Energy pulse travelling along wires from breaker to loads
- Rail grind: sparks under the feet, speed lines, camera zoom-out
- Taar-Naag bounce: BOING + squash on the snake
- BIJLI mode: screen-edge crayon border, music stinger, afterimages, a 2 s warning blink
- Splice: inset panel, ink stamp, 80 ms hit-stop
- Shake: light on bounce, medium on lightning, heavy on boss stagger
- District restored: a comic splash page "DISTRICT RESTORED!"
- Level transitions as page turns. Reduced-motion toggle removes shake and page turns.

---

## 11. Story, script and the twist

### 11.1 Voice rules
- No pronouns for the hero before the finale. Radio says **"Crew 7"**; Chinni says **"Bijli"**.
- Chinni: short, funny, brave, lowercase crayon handwriting. Radio: terse and procedural.
- Humour lives in the light (cartoon twins, onomatopoeia, Chinni's captions). The heart lives in the dark (the
  quiet, the rain, windows coming on).

### 11.2 Interstitials (between levels, skippable with Space)
Each is a 3–4 panel **comic page** composed from game art, plus one **phone message**:
- after L1: "BIJLI VS THE DARK" · *"bijli the fridge is making the sad noise again"*
- after L2: "THE SNAKE WAS ACTUALLY NICE" · *"are you scared of thunder? i am only a little"*
- after L3: "CROCODILE RIVER" · *"i ate dinner in the dark lol. dal."*
- after L4: "I DREW YOU POWERS" · *"Nani says the hospital is dark too"*
- after L5: "BIJLI SAVES THE BABIES" · *"i'm drawing the last page. come home and see"*
- after L6: "THE DRAGON (BIG ONE)" · *"the whole sky went yellow!! was that you??"*
Radio between levels: *"Crew 7, Bazaar feeder down. Over."* · *"Crew 7, underpass flooding. Isolate before entry."*

### 11.3 Finale (FinaleScene, scripted, about 60 s)
1. The house lights. A warm glow spreads over wet ground. The rain stops. Silence, then a ceiling fan starts inside.
2. Chinni runs to the window and presses the comic to the glass. The last page is blank except **"BIJLI COMES HOME"**.
3. The lineworker unclips the harness and lifts off the helmet. **It's Amma.** Hold the shot; no music sting,
   just the fan and dripping water.
4. Chinni's crayon hand draws the last panel live: Amma in her raincoat with the BIJLI cape drawn over her
   shoulders. Caption: **"my amma is bijli."**
5. The whole street blooms into the comic look, every house lit, Toofan Raja asleep. The theme plays once, slowly.
6. End card: *"Inspired by the linewomen of Telangana, who climb poles in the storm so the rest of us have light."*
   Then: *"Never touch a fallen wire. Call your local electricity helpline."* (Verify any helpline number before adding it.)
7. Credits as comic panels with crayon portraits of the team.

### 11.4 Real-world grounding (README and submission page only; accurate, not embellished)
- In May 2022, Babburi Sirisha from Siddipet district became the first woman appointed junior lineman at TSSPDCL
  after clearing the pole-climbing test, and was posted in the Medchal circle.
- Telangana Transco had earlier recruited about 200 linewomen, a first for the state's power sector.
- Our hero is fictional. No real names or likenesses in-game.

---

## 12. Audio (procedural WebAudio)
- **One song whose arrangement follows the light:** 112 BPM, D minor → D major at the finale.
  - *Dark layer:* low pad, pulse bass, sparse plucked melody, rain in the mix.
  - *Light layer:* synth brass stabs, dhol pattern, bouncy bass, the four-note BIJLI motif.
  - The light layer's volume follows **the light mask value at the player's position** (smoothed over 250 ms):
    walk into light and the band kicks in, step back into dark and it falls away. BIJLI mode adds a full-band stinger.
  - Boss: both layers. Finale: solo plucked motif, then the full major-key theme.
- **Ambience:** rain bed by level intensity, traffic (L2), water rush (L3), wind (L4), generator chug (L5),
  transformer hum (L6).
- **50 Hz mains hum** with harmonics near live wires, louder as you get closer.
- **SFX:** wet footsteps, ladder clanks, splice creaks, spark crackle, breaker KA-CHUNK, power surge, lamp bloom
  chime, fan spin-up, thunder (delayed 0.3–1.5 s after the flash), rail grind, BOING, BIJLI pickup, THWACK, UI clicks.
- Master/music/SFX sliders. Mute is M. Audio starts on the title click.

---

## 13. UI and UX
- **HUD:** 3 sparks (top-left), district bar "🏠 4/6 lit" (top-right), BIJLI timer ring around the hero (only
  during BIJLI mode), generator timer in L5 only.
- **Title screen:** a rainy dark street with one lineworker on a pole. The player can press E on one breaker and
  the street blooms into the comic, which teaches the core rule before the game starts. Includes the
  "Reduce flashing" notice.
- **Pause:** Resume · Restart from checkpoint · Skip level · Settings (volumes, Reduce flashing,
  Quality, Reduced motion) · Level select (after unlock).
- **Accessibility:** hazard states readable by shape and motion (not colour alone), skip level.
- **First 10 seconds of L1:** spawn in rain, a single dead lamp ahead, an "E" floating over the breaker. No text box.

---

## 14. Performance budget
- 60 fps at 1280×720 on integrated graphics. Light mask at half resolution. Rain under 1500 particles.
- One post pass (`WorldPipeline`) for everything. Coarse CPU light grid (16 px cells) is updated only on light events
  (lamp on/off, BIJLI start/end), never per frame.
- Pool particles and onomatopoeia. No allocation in update loops.
- Quality: High (all) · Medium (fewer rain layers, no misregistration) · Low (no ink edges, minimal rain).
  Auto-drop one level if the fps average is < 50 for 3 s.

---

## 15. Team split
| Who | Owns | First deliverable |
|---|---|---|
| **Hansika** (systems) | `player/`, `core/` (power graph, splice, level parser/validator), comic object solidity from the light grid, rail grind, BIJLI mode, hazards + twins, boss logic, tests, debug API | Greybox controller that feels great + power graph tests |
| **Shaurya** (levels & story) | `levels/`, `story/`, interstitial pages, finale script, tuning `config.ts`, placement of drawings/clouds/rails, playtests | L1 greybox fully playable and validated |
| **Navya** (look & sound) | `fx/` (WorldPipeline + light boundary), `world/` (LightField, rain, lightning, wires), rig + both skins, onomatopoeia, `audio/`, UI, title, GIFs, submission page | Light-mask comic blend on a test scene + rain/darkness |
Merge to `main` at least every 3 hours. `config.ts` conflicts are resolved by Shaurya.

---

## 16. Phases (each ends with typecheck + tests + build green, a commit and a STATUS update)
**Phase 0 · Scaffold (≤ 1 h).** Vite + TS + Phaser, eslint/prettier, Vitest, Playwright, all scripts, `config.ts`,
empty scenes, `window.__bijli`, README with pitch, `CREDITS.md`.

**Phase 1 · Greybox core.** Controller with all feel params, ASCII parser, L1 greybox, poles/climbing, power graph +
breakers + break points + splicing (hold E + twist animation), loads lighting, lamps as checkpoints, `LightField` mask +
darkness + headlamp, crayon cloud solidity from the light grid. Unit tests for graph and splice.
*Navya in parallel:* `WorldPipeline` blending real ↔ comic by a mask on a test scene.
*Exit check:* in L1, light the first lamp and climb the cloud that appears. Post the GIF in the team thread.

**Phase 2 · The rule works everywhere.** Rail grinding, lightning flashes + comic peek, Taar-Naag twin (bounce),
BIJLI power-up, rain, wire rendering (catenary, live pulses, whipping broken ends), lamp bloom. L2 greybox
playable. Validator in CI.
*Exit check:* a 30 s clip of "splice → lamp blooms → bounce the snake → grind the rail".

**Phase 3 · Content.** L3 (flood + crocs), L4 (vertical, wind, storm knocks lamps out, tree twin, first drawing),
L5 (hospital timer), L6 (Agni-Dragon), L7 (home). Interstitials + phone messages. Both skins on the rig. First
audio pass (dark/light layers, core SFX).
*Exit check:* the whole game is playable start to end.

**Phase 4 · Beauty, feel, finale.** Finale sequence, all juice (§10.5), full audio, title screen, UI, quality
toggle, Reduce flashing, skip level. **3+ outside playtests**: fix every 30 s+ stuck point and any
moment where someone doesn't get "light makes the comic".
*Exit check:* a 2-minute capture the whole team is proud of.

**Phase 5 · Ship (freeze Tue 12:00, deadline 16:00).** Bug sweep, perf on the weakest laptop, `npm run build`, zip
`dist/`, test in a fresh browser profile, upload, submit on Indieconnect. Submission page: pitch (§1), 4–6
screenshots (dark and lit), 1 GIF of a lamp bloom, controls, team, `CREDITS.md`, AI-usage note, a 2-minute video
that stops before L7. Confirm all 3 members are in the Discord team thread.

### Cut list (in order, if behind)
1. Crayon collectibles/gallery → 2. Wind gusts → 3. Storm knocking lamps out → 4. Crocodiles (make L3 a
breaker-sequencing flood puzzle) → 5. L5 branching order → 6. Boss phase 3.
**Never cut:** splicing, the light-mask comic blend and lamp bloom, crayon clouds, rail grind, BIJLI drawings, L7 + finale.

---

## 17. Working rules for Claude Code
- Before each task, restate it in 2 lines and list the files you'll touch.
- After each change: `npm run typecheck && npm run test && npm run build`. Never leave `main` red.
- `core/` never imports Phaser or the DOM. Tunables go in `config.ts`; user-facing strings go in `story/script.ts`.
- New or changed levels must pass `npm run validate-levels`.
- After any visual change, take a Playwright screenshot and **look at it** before calling the task done.
- Ask before adding a dependency, and check it against the jam rules. Prefer writing it.
- No placeholder art may ship. Missing sprites get drawn as SVG in the house style.
- Clarity for a first-time player comes first, then juice.
- Keep the hero's gender ambiguous in every asset, string and filename until `FinaleScene` (`hero_real`, `hero_bijli`).
- Commit messages: `feat(light): lamp bloom`, `fix(power): breaker BFS`, `art(pipeline): ink rim`.

---

## 18. Definition of done (judge's-eye checklist)
- [ ] Opens in the browser, title in < 5 s, audio on first click.
- [ ] A new player splices their first line within 60 s with no instructions.
- [ ] A new player says some version of "oh, the light makes the comic" by the end of L1.
- [ ] One 20 s clip shows all three themes: a splice twist, a lamp blooming into comic, a rail grind under lightning.
- [ ] Full run is 12–18 min, with skip level available.
- [ ] 60 fps on a mid laptop; no softlocks; restart works everywhere.
- [ ] The finale lands. Watch someone's face.
- [ ] README, CREDITS, AI-usage note, public repo with a steady commit history.

---

## STATUS
- Phase: 0 done → starting 1
- Last working build: 2026-10-02 (Phase 0 scaffold, updated to the "light makes the comic" design)
- What works: Vite + TS strict + Phaser 3.90.0 boots to a placeholder title → empty LevelScene. `config.ts` holds
  the §7.1 / §6 tunables. `window.__bijli` debug API (ready, activeScenes, goto). Scripts: dev, build, preview,
  test, typecheck, lint (eslint + prettier; `core/` blocked from importing Phaser/DOM), validate-levels
  (structural checks only), e2e (Playwright smoke + screenshots to `e2e/__screenshots__/`).
- Known bugs: Phaser bundle is ~1.2 MB (fine for the jam; no code-splitting).
- Next task: Phase 1. Hansika: controller + power graph/splice + tests. Shaurya: ASCII parser consumer + L1 greybox.
  Navya: WorldPipeline mask blend on a test scene + LightField.
