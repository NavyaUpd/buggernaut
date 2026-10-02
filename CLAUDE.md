# CLAUDE.md — BIJLI
**TGC Game Jam @ Infinium '26 (IIIT Hyderabad)** · sponsored by GDAI · co-powered by Games for Change India
Team **Buggernaut** (3 people) · Themes: **Comic · Twist · Light** (all three are mandatory and theme fit is scored)
Hard deadline: **Mon 6 Oct 2026, 4:00 PM IST**. Internal freeze: **Mon 6 Oct, 12:00 PM**.
Target: browser-playable (HTML5/WebGL), 12–18 minutes long, finishable by any judge.

> **How to use this file**
> 1. Put this file at the root of a new **public** GitHub repo. Commit from minute one and commit often, because
>    bulk uploads near the deadline look bad for originality.
> 2. Open Claude Code in the repo and say: *"Read CLAUDE.md completely. Execute Phase 0, then Phase 1. Commit after
>    every task. Update the STATUS section when a phase ends."*
> 3. Start every new session with: *"Re-read CLAUDE.md, read STATUS, continue."*
> 4. Each team member runs their own Claude Code session on their own area (see §15) and merges to `main` often.

---

## 1. The game in one breath
A monsoon night. The power is out across the city. A lineworker in a helmet and raincoat climbs poles in the storm,
splicing snapped cables and dodging live wires to bring the light back, district by district. At home, a kid named
**Chinni** sits by candlelight drawing a comic about the lineworker as a superhero called **BIJLI**.

You can **twist between the two worlds at any moment**. In the **real world** you're slow, careful and the only one
who can actually fix things. In the **comic world** you're a superhero who rides power lines as a lightning bolt and
punches storm monsters, and every monster is a real hazard re-imagined by a child. You need both worlds to get through.

On the last street, the house lights up, the kid runs to the window, Bijli takes off the helmet, and **it's Amma**.

*Bijli* means both **electricity** and **lightning** in Hindi.

### Submission pitch (use as-is, spoiler-free)
> **BIJLI** is a monsoon-night action-platformer about the people who bring the light back. Climb poles, splice
> live cables and dodge lightning as a lineworker, then twist into your kid's comic book and become BIJLI, a
> superhero who rides power lines as lightning. Two worlds, one storm, one long night home.

---

## 2. Theme map (judges score theme association, so each theme is a verb)
| Theme | Core verb (moment to moment) | World | Story |
|---|---|---|---|
| **Light** | You restore power: every splice and breaker lights up houses, streetlights and routes. In the real world you see only what your headlamp, live lamps and lightning flashes reveal. In the comic world you **ride electricity** and **catch lightning**. | A blacked-out city lighting up behind you, lamp by lamp | "LIGHT AA GAYI!" cheers from windows; the last light is home |
| **Twist** | **Twist wires**: splicing is a physical twisting gesture. **Twist worlds**: Shift flips reality ↔ comic in an ink-splash wipe. | Every hazard has a twisted comic twin | **Plot twist**: the hero is Amma |
| **Comic** | Half the gameplay happens *inside a kid's comic*, with its own physics, abilities, enemies and sound. Defeating comic monsters changes the real world. | Ink, halftone, crayon fills, onomatopoeia, panel borders | The story is told through Chinni's comic pages; the finale is the last page |

The **message** comes through play, never through text: everyday heroes, and the people who do "not your job"
jobs in the storm. It's inspired by the real linewomen of Telangana (see §11).

---

## 3. Non-negotiables
1. **Feels great in 10 seconds.** Tight platforming (coyote time, jump buffer, variable jump) and instant world switching.
2. **The switch is the star.** It must be readable, fast (≤ 300 ms), gorgeous and always useful.
3. **No text walls.** Teach through level design. On-screen text is limited to captions (≤ 10 words), key prompts,
   onomatopoeia and short phone messages between levels.
4. **Judges must finish it.** Health checkpoints at every lit streetlamp, a "Skip level" button in pause, an assist
   toggle, and a total run time of 12–18 minutes.
5. **60 fps** in Chrome on a mid laptop at 1280×720. Includes a quality toggle and auto-downgrade.
6. **Photosensitivity safety:** a "Reduce flashing" toggle in settings plus a one-line notice on the title screen.
   With it on, lightning becomes a slow brighten instead of a hard flash.
7. **Gender-neutral until the reveal.** No he or she pronouns for the hero, a bulky gear silhouette, and the hero is
   only ever called "Bijli" or "Crew 7". The reveal must feel earned, not like a trick.
8. **Originality and rules:** all art is generated in code (SVG/procedural), all audio is procedural WebAudio, and
   all code is written during the jam. Check the Discord rules for third-party libraries, assets and the AI-tool
   policy, then log everything in `CREDITS.md` plus an "AI usage" section in the README.
9. **`main` always builds.** Small commits with clear messages.
10. **Safety:** never imply kids should touch wires. The end card includes a one-line safety note (see §11).

---

## 4. Tech stack
- **Vite + TypeScript (strict) + Phaser 3** (pin the latest 3.x). Arcade Physics for platforming. WebGL renderer only.
- `vite.config.ts` uses `base: './'` so `dist/` runs from a zip (itch.io / Indieconnect HTML5 upload).
- **Custom PostFX pipelines** (GLSL) for the two-world look (§10).
- **Pure-TS core modules** with no Phaser or DOM imports: `power/` (circuit graph), `splice/`, `meter/`, `level/`
  parser and validator. These are unit-tested with **Vitest**.
- **Playwright** smoke test: boot, load L1, use the debug API to complete it, screenshot the title, L1 and the comic world.
- Audio: WebAudio, all procedural (§12).
- Lint and format: eslint + prettier. Scripts: `dev`, `build`, `preview`, `test`, `typecheck`, `lint`,
  `validate-levels`, `e2e`.

### Folder layout
```
src/
  main.ts                       # Phaser config, scene list, pipelines registration
  config.ts                     # ALL tunables (movement, meters, timings, colors) — single source of truth
  core/                         # pure TS, no Phaser
    power/graph.ts              # nodes, edges, breakers, loads, BFS powered-set, events
    power/types.ts
    splice/splice.ts            # twist progress, shock rules, gloves
    meter/hausla.ts             # comic meter (drain/refill)
    level/schema.ts             # level data types
    level/parse.ts              # ASCII map + entity data → LevelData
    level/validate.ts           # reachability + circuit solvability checks
    rng.ts
  scenes/
    BootScene.ts  TitleScene.ts  LevelScene.ts  InterstitialScene.ts
    FinaleScene.ts  CreditsScene.ts  PauseScene.ts  UIScene.ts
  world/
    WorldState.ts               # REAL | COMIC, switch logic, wipe animation driver
    Darkness.ts                 # real-world darkness render texture + light erasers
    Lightning.ts                # telegraph → flash → afterimage → thunder
    Rain.ts                     # 3 parallax layers + splashes + wind
    Wires.ts                    # catenary rendering, sway, live pulses, broken-end whip physics
    Parallax.ts
  player/
    Player.ts                   # state machine: idle/run/jump/fall/climb/zip/splice/hurt/bolt/punch
    Controller.ts               # input buffering, coyote, variable jump
    Rig.ts                      # procedural 2D rig (shared by both skins)
    skins/real.ts  skins/comic.ts
  entities/
    Pole.ts  Breaker.ts  BreakPoint.ts  Streetlamp.ts  Load.ts (houses/shops/hospital)
    Pickup.ts  CrayonCloud.ts  Water.ts  Van.ts (level exit)
    hazards/LiveWire.ts  hazards/Tree.ts  hazards/Flood.ts  hazards/Transformer.ts  hazards/StrikeZone.ts
    comic/TaarNaag.ts  comic/PedRakshas.ts  comic/Magar.ts  comic/AgniDragon.ts  comic/ToofanRaja.ts
  fx/
    pipelines/WorldPipeline.ts   # the real↔comic post shader with wipe
    pipelines/glsl/*.frag
    Onomatopoeia.ts  Sparks.ts  Shake.ts  HitStop.ts  PanelFrame.ts  SpeedLines.ts
  ui/ HUD.ts  Prompts.ts  PhoneMessage.ts  ComicPage.ts  Menus.ts
  audio/ Engine.ts  Music.ts  Sfx.ts  Ambience.ts
  art/  svg/*.ts                 # SVG strings → textures at boot
  levels/ L1_gali.ts  L2_bazaar.ts  L3_underpass.ts  L4_rooftops.ts  L5_hospital.ts  L6_substation.ts  L7_ghar.ts
  story/ script.ts               # all captions, phone messages, comic page compositions
  debug/ DebugAPI.ts             # window.__bijli for tests + level select + god mode (F1)
tests/  (vitest)   e2e/ (playwright)
```

---

## 5. Controls
| Action | Keyboard | Mouse | Notes |
|---|---|---|---|
| Move | A / D (← / →) | | |
| Jump | Space (W / ↑ too) | | variable height |
| Climb | W / S on poles and ladders | | auto-grab when pressing up near a pole |
| Interact | E | | splice / breaker / pick up / talk |
| **TWIST WORLD** | **Shift** | | switches REAL ↔ COMIC |
| Splice twist | hold E then alternate A/D, **or** hold E and circle the mouse | circle mouse | 3 full twists = joint |
| Punch (comic) | J | Left click | 3-hit combo |
| Bolt dash (comic) | K | Right click | only when touching a **live** wire |
| Pause | Esc | | Resume / Restart / Skip level / Settings |
| Restart from checkpoint | R | | |

Show prompts contextually (a small key icon near the object). Never show the whole control list at once.

---

## 6. The two worlds (core system)

### 6.1 Real world: the lineworker
- **Feel:** grounded, weighty, careful. Raincoat, helmet with headlamp, tool belt, harness.
- **Can:** run, jump (single), climb poles and ladders, ride ziplines along *dead* cables using the harness pulley,
  operate breakers, splice broken lines, pick up items.
- **Sees:** darkness everywhere except the headlamp cone (follows facing direction, ~35° wide, 320 px long), powered
  streetlamps and windows, sparks, and **lightning flashes** that reveal the whole level for an instant.
- **Hazards are real and deadly-ish:** sparking live wires, flood water (deadly when a live line touches it),
  falling branches, transformer arcs and lightning strike zones.

### 6.2 Comic world: BIJLI (as drawn by Chinni)
- **Feel:** fast, bouncy, loud, joyful. Bright crayon colours, ink outlines, halftone, onomatopoeia, animated
  **on twos** (12 fps poses) so it feels hand-drawn.
- **Can:** run faster, jump higher, **double jump**, **punch** (3-hit combo), **bolt dash** along *live* wires,
  stand on **crayon clouds** (comic-only platforms), and **catch lightning** (touching a strike refills the meter).
- **Cannot:** splice, operate breakers, zipline, or pick up real items. **Comic can't fix anything permanently.**
- **The world is fully lit.** It's a kid's imagination with no darkness, which makes it tempting.
- **Hazards become monsters** (§8). Defeating or stunning a monster changes the real world, temporarily or permanently.

### 6.3 Hausla meter ("courage")
- The comic world drains **Hausla**: 100 max, drain 12/s, so about 8 s at a time.
- It refills slowly in the real world (+4/s) and in bursts: **crayon drawing pickup +50**, **successful splice +30**,
  **catching lightning (comic) +100**.
- At 0 you're thrown back to the real world, with a short "POOF" and a 1.5 s switch lockout.
- This forces the core rhythm: **switch in to cross or fight, switch out to fix.**

### 6.4 The switch ("Twist")
- Shift starts a **radial ink-splash wipe** centred on the player: 280 ms, ease-out, with a jagged ink-noise
  boundary and a thick black rim.
- Entities swap their real or comic form **as the wipe edge passes them**: compare their distance to the centre
  against the wipe radius.
- Music crossfades between the two arrangements of the same song (§12), so the beat never breaks.
- Cooldown is 300 ms. The switch is allowed mid-air, and momentum is preserved.
- If switching to the real world would put the player inside a comic-only cloud, the player falls through, which
  is intended and great for drops.

### 6.5 Cross-world interplay (the heart of the design; every level uses at least two of these)
| Comic action | Real-world effect |
|---|---|
| Punch **Taar-Naag** (cobra) 3× → stunned | The sparking live wire is **pinned and grounded for 6 s**: a safe window to pass or splice next to it |
| Defeat **Ped-Rakshas** (tree demon), who bows down | The real fallen tree is now **permanently a ramp** |
| Ride **Magar** (crocodile) across the flood | No real equivalent: crocs exist only in comic, so you must switch back before the meter ends or fall in |
| Catch lightning from **Toofan Raja** | Meter refill; strike zones are telegraphed identically in both worlds |
| Bolt dash along **live** lines | Splicing in the real world **extends the dash network**, so fixing opens comic routes |
| Crayon clouds as platforms | Clouds don't exist in real; switching mid-air above a gap is a deliberate trick |

---

## 7. Mechanics in detail

### 7.1 Platforming feel (put all numbers in `config.ts`; these are starting values)
| Param | Real | Comic |
|---|---|---|
| Max run speed | 210 px/s | 270 px/s |
| Ground accel / decel | 1800 / 2400 px/s² | 2600 / 3000 |
| Air control multiplier | 0.75 | 0.95 |
| Jump velocity | 600 | 680 (double jump 560) |
| Gravity / fall multiplier | 1700 / 1.6 | 1500 / 1.4 |
| Max fall speed | 900 | 820 |
| Coyote time / jump buffer | 100 ms / 120 ms | same |
| Variable jump cut (release early) | ×0.45 velocity | same |
| Climb speed | 140 | 180 |
| Zipline speed | 360 (along dead cable, downhill bias) | n/a |
| Bolt dash speed | n/a | 950 px/s along wire, choose branch with direction keys at junctions |
| I-frames after hit | 900 ms | same |
Health is **3 sparks** (hearts) shared by both worlds. Touching a live wire or a hit costs 1. Falling into
energised water is instant death and respawns at the last checkpoint.

### 7.2 Power network (`core/power/graph.ts`, pure and tested)
- **Nodes:** `Source` (substation/feeder), `Pole`, `Breaker` (open/closed), `Load` (house, shop, streetlamp,
  hospital, lift, shutter), `Junction`.
- **Edges:** wire segments `{id, a, b, state: 'intact'|'broken', phase?: 'R'|'Y'|'B'}`.
- **Powered set:** BFS from every Source through intact edges, passing a Breaker node only if `closed`.
- **Events:** `onPowered(loadId)` lights windows, streetlamps become checkpoints, lifts and shutters activate, and a
  "LIGHT AA GAYI!" bubble pops from a window. `onDepowered` reverses it.
- **Splice rule:** a broken edge can be spliced only if **neither endpoint is powered**. Otherwise the player gets
  shocked (−1 spark, knockback, "KZZZT!") unless they hold **Rubber Gloves** (single use).
  Players learn to **open the upstream breaker → splice → close the breaker**.
- **Win condition per level:** all target loads powered (the HUD shows `houses lit / total`). Then the celebration
  plays and the exit (the crew van) unlocks.
- **Validator** (`validate-levels`): for each level, prove there exists a sequence of breaker toggles and splices
  that powers all targets, and that every splice point is reachable in the real world (grid flood-fill using climb
  and jump reach). Fail the build if not.

### 7.3 Splicing (twist gesture)
- Press E at a `BreakPoint` (real world only). A **close-up inset panel** opens in the lower third (a comic-style
  panel border even in the real world): two frayed copper ends in gloved hands.
- **Twist input:** hold E and either circle the mouse (accumulate angle; 360° = 1 twist) or alternate A/D (each
  alternation = 90°). **3 twists** completes the joint. Each twist gives a metallic creak, a small shake and sparks
  (if live, see shock rule).
- **The world keeps running** during the splice: rain, the flood rising, the generator timer. The player can cancel by releasing E.
- Success: an ink-stamp "TWIST!" panel freeze (80 ms hit-stop), a +30 Hausla burst, and the cable straightens and
  turns grey (dead) until its breaker closes.
- **Assist mode** (settings): auto-twist when E is held for 1.2 s.

### 7.4 Breakers
- These are lever boxes on poles or walls. E toggles them with a big chunky lever animation, "KA-CHUNK" and a short
  hum-up or hum-down.
- The current state is readable by colour **and** shape: lever up/down plus a green or red lamp.

### 7.5 Light and darkness (real world)
- A `Darkness` render texture is filled black at about 0.88 alpha, then light shapes are **erased** each frame:
  headlamp cone, powered streetlamps (soft circles), lit windows (rectangles with warm spill), sparks (tiny
  flicker), lightning (full clear plus a fade-in over 600 ms).
- **Streetlamps are checkpoints** once powered: respawn there.
- **Lightning cadence:** every 10–16 s, a 1.2 s telegraph (rumble, distant flicker), then a strike. Strike zones
  are marked by a ground glow in both worlds. The flash reveals the whole level for about 0.35 s, which is how
  players read routes in dark sections.

### 7.6 Comic combat
- Punch: 3-hit combo (12 / 12 / 20 knockback), 48 px range, 250 ms between hits, 60 ms hit-stop on contact,
  onomatopoeia per hit (THWACK, POW, DHISHOOM!).
- Monsters have simple readable patterns (§8). A defeated monster explodes into crayon scribbles and confetti dots.

### 7.7 Pickups
| Pickup | World | Effect |
|---|---|---|
| **Chai** (steel tumbler) | real | +1 spark |
| **Crayon drawing** | both (visible in both) | +50 Hausla, collectible (3 per level). Collecting all 3 unlocks a bonus page of Chinni's comic in the gallery |
| **Rubber gloves** | real | one free live splice without a shock |
| **Battery** | real | wider and longer headlamp for 20 s |

---

## 8. Hazards and their comic twins
| Real hazard | Comic twin | Comic behaviour | Effect of beating it in comic |
|---|---|---|---|
| **Snapped live wire**: whips with spring physics and sparks, touching = −1 | **Taar-Naag**, a cobra made of wire with an electric hood | Rears up for 0.6 s telegraph, lunges, retreats. 3 punches → stunned 6 s | Real wire pinned and grounded for 6 s |
| **Fallen gulmohar tree** blocking a path, swaying branches drop | **Ped-Rakshas**, a grumpy tree demon throwing seed pods | Throws 3 pods in an arc, then pauses (punch window). 6 hits | Real tree becomes a **permanent ramp** |
| **Flood water**: rises over time in some levels; deadly if a live line touches it | **Magar**, crocodiles drifting on the water | Rideable moving platforms; they snap if you stand too long (1.5 s) | none (comic-only traversal) |
| **Burning transformer**: arcs and explosions | **Agni-Dragon** (L6 boss) | 3 phases (§9, L6) | each phase defeated lets you splice one of the 3 phases (R, Y, B) in real |
| **Lightning strike zones** | **Toofan Raja**, a storm-cloud villain face in the sky | Throws bolts on the same telegraph | catching a bolt = +100 Hausla |

**Never demonise animals or people.** Street dogs, cows and stranded people stay neutral and are shown kindly in
both worlds; in comic they cheer.

---

## 9. Levels (7 total, each adds ONE new wrinkle; 1.5–3 min each)
Tile size 32 px. Viewport 1280×720 (40 × 22.5 tiles). Levels are authored as ASCII maps plus an entity/network
block (§9.8). Every level ends with the van exit after all targets are lit.

**L1 · Gali No. 4 (basti lane).** Real world only. ~120×30 tiles.
Teaches run, jump, climb a pole, open a breaker, splice a dead line, close the breaker, and lamps as checkpoints.
Lightning is introduced in a dark stretch where only flashes show the gap. 6 houses to light.
Opening caption (Chinni's crayon): *"Tonight the whole city went dark. Except BIJLI."*

**L2 · Bazaar.** Comic unlock. ~160×30.
Between levels, Chinni's phone message: *"I drew you a cape. Now you have powers."*
A live snapped wire blocks a narrow lane; switching shows Taar-Naag; punch, stun, switch back, pass. Then splice the
feeder, and the newly live line across the bazaar rooftops becomes the first **bolt dash** run. Crayon clouds are
introduced over an awning gap. Lighting the shops makes their shutters roll up and reveal new routes.

**L3 · Underpass.** Rising flood + breaker sequencing. ~140×35.
Water rises slowly (2 tiles/min) and a live line dangles near it. You must open the upstream breaker **before**
touching water areas. Magar crocs carry you across the deepest section in comic. Tension comes from the meter
draining mid-crossing. Finish by lighting the underpass lamps, at which point the water stops rising (drainage pumps
are loads too).

**L4 · Rooftops.** Verticality, wind and lightning. ~70×90 (vertical).
Water tanks, laundry lines, dish antennas and satellite TV boxes. Wind gusts push you (telegraphed by rain angle).
Toofan Raja appears and you catch bolts for meter. Ped-Rakshas blocks the top; beat it to make the ramp. A zipline
descent at the end over the whole lit-up neighbourhood is the money shot.

**L5 · Hospital.** Timer + choice of order. ~150×40.
The hospital generator's fuel bar is the timer: generous, 3:30. The network branches so three feeders can be fixed in
any order, and the HUD shows which wing each powers. Phone message before: *"Nani says the hospital is dark too."*
Emotional beat: when the last wing lights, a nurse waves from a window and a comic bubble reads
*"The babies are warm again."* No death or fail-shaming: if the timer ends, the generator sputters and you get
+60 s ("the staff found more diesel"). Never punish harshly here.

**L6 · Substation (boss).** ~100×40 arena.
**Agni-Dragon**, comic twin of the burning transformer. Three phases, one per electrical phase **R / Y / B**
(red, yellow and blue cable colours):
1. **R:** the dragon sweeps fire; punch its glowing chest node (3×) to stun → switch to real → splice the red phase
   cable while it's quelled (6 s window).
2. **Y:** the dragon flies; bolt dash along the live arena cables to reach its head height, then punch → splice yellow.
3. **B:** flood plus lightning; catch a Toofan bolt to max the meter, then a final combo → splice blue → close the
   main breaker. The whole city skyline lights up in a wave and the music hits the full theme.

**L7 · Ghar (home).** No enemies, no timer. ~90×25.
The rain thins to a drizzle and the music is just a soft solo. One last broken service line, to a small house with
a candle in the window. Splice. Close the breaker. The house lights. **Chinni** runs to the window holding the comic.
Cut to the **Finale** (§11).

**Total:** ~14 min for a first-time player. The level-select unlocks after first completion. "Skip level" is in
pause from the start (judges).

### 9.8 Level data format
```ts
export const L1: LevelSource = {
  id: 'L1', name: 'Gali No. 4', music: 'theme', weather: { rain: 0.7, wind: 0.2, lightning: [12, 16] },
  map: [
    '................................................',
    '..........|.........|..........H...............',
    '.....P....|...L.....|....B.....H......X........',
    '##########=####=#####=##########################',
    // ...
  ],
  // legend: '#' solid, '=' one-way (balcony/awning), 'H' ladder, '|' pole (climbable), 'P' spawn,
  // 'L' streetlamp, 'B' breaker, 'X' break point, 'C' crayon, 'T' chai, 'G' gloves, 'K' crayon cloud (comic only),
  // 'W' water start level, 'V' van exit, 'S' strike zone, 'h' house load, 'n' Taar-Naag hazard anchor
  network: {
    nodes: [{ id: 'SRC', kind: 'source', at: [0, 2] }, { id: 'P1', kind: 'pole', at: [10, 1] } /* ... */],
    edges: [{ id: 'e1', a: 'SRC', b: 'P1', state: 'intact' }, { id: 'e2', a: 'P1', b: 'P2', state: 'broken' }],
    breakers: [{ id: 'BR1', node: 'P1', closed: true }],
    loads: [{ id: 'h1', node: 'P3', kind: 'house', at: [22, 3] }],
    targets: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  },
  story: { caption: 'Tonight the whole city went dark. Except BIJLI.' },
};
```

---

## 10. Art direction: two worlds, one screen
**Rule:** both worlds share the same level geometry. The difference comes from the **post shader**, **lighting**
and **entity skins**. That keeps the art workload manageable while looking like two different games.

### 10.1 Real world: "Monsoon Noir"
- Deep night, heavy rain, wet everything. Light is precious: warm sodium lamps, cold cyan arcs.
- Palette: night `#141A2E`, rain slate `#5C6B8A`, wet highlight `#2B3550`, sodium lamp `#FFB347`,
  live arc `#7FE3FF`, danger `#FF4D4D`, window warmth `#FFD58A`.
- Post: cool colour grade, slight desaturation, film grain, vignette, subtle chromatic aberration at the edges.
- Details: rain on 3 parallax layers angled by wind, splashes on tile tops, puddle shimmer, dripping awnings,
  tangled overhead cables (the iconic Indian street look), hanging laundry, posters, a chai stall shutter,
  scooters under tarps, a temple bell, glowing mosquito-coil embers in windows.
- Lightning: one frame of pure white silhouette (everything black against white), then a 600 ms fade of the
  revealed level. (Softened with "Reduce flashing".)

### 10.2 Comic world: "Chinni's Comic"
- Bright, flat, joyful. Crayon-textured fills, wobbly ink outlines, halftone shading, misregistered print colours.
- Palette: paper `#FFFFFF`, ink `#000000`, crayon yellow `#FFD400`, crayon red `#FF3B30`, crayon blue `#2F6BFF`,
  crayon green `#2ECC71`, BIJLI cyan `#4FF0FF`, cape magenta `#FF3E9A`.
- Post: posterize (4 levels), Sobel ink edges on luminance (2 px, slight wobble noise), halftone dots in darker
  bands, a 1–2 px CMY misregistration on edges, paper texture, saturation boost.
- **Panel frame:** in comic mode a thick black border and white gutter frame the screen, slightly tilted (±0.5°).
- **Animate on twos:** comic sprites update poses at 12 fps while the camera stays at 60.
- **Onomatopoeia** for every comic action: KZZZT, THWACK, DHISHOOM, WHOOSH, KRAKOOM, BOING, TWIST!
- **Crayon captions** in a kid's handwriting style at level starts and key moments.
- The sky becomes a crayon storm with Toofan Raja's grumpy face.

### 10.3 The wipe (signature moment, make it perfect)
One `WorldPipeline` post shader receives both style branches plus uniforms:
`uMix` (0 or 1), `uCenter` (player screen position), `uRadius` (animated), `uTime`, `uNoiseScale`.
Pixels inside the radius render as the target world. The boundary uses fbm noise for an ink-splash edge with a 6 px
black rim and a few flying ink droplets (particles). Add a 1-frame white flash and a camera zoom punch (1.03×) at the
start. Entity skins swap as the edge passes them (§6.4).

### 10.4 Characters (procedural rig, no imported art)
- `Rig.ts`: a 2D skeleton (torso, head, upper and lower arms, upper and lower legs, hands, feet) built from
  SVG-generated part textures. Animations are procedural curves: idle breathe, run cycle, jump squash and stretch,
  climb, zipline hang, splice (hunched, hands together), punch combo, hurt, bolt (body becomes a lightning streak),
  helmet-off (finale).
- **Real skin:** hard hat with headlamp, raincoat over a khaki-style work uniform, tool belt, harness, rubber
  boots. Bulky, gender-neutral silhouette.
- **Comic skin (BIJLI):** helmet → helmet with a lightning crest, raincoat → flowing cape with a sari-border
  pattern (an easter egg that only makes sense after the reveal), pliers → glowing gauntlets, a lightning emblem
  drawn in crayon on the chest.
- **Chinni:** about 8 years old, big T-shirt, crayon in hand. Appears in the interstitials and the finale.
- **Amma (reveal):** the same face that was always under the helmet. A tired, warm smile, hair tied up, rain on her face.

### 10.5 Juice checklist (each item ≤ 30 min, Phase 4)
- Landing dust + squash · footstep splashes · wet footprints that fade
- Coyote-jump forgiveness visual (none, just feel) · jump buffer
- Screen shake: light on punch, medium on lightning, heavy on boss phase end
- Hit-stop 60 ms on punch contact, 80 ms on splice success
- Camera: lookahead in move direction, vertical deadzone, zoom-out on bolt dash, zoom-in on splice
- Sparks on every live-wire contact · arcing glow on live cables · energy pulses travelling along newly powered
  wires toward each load (very satisfying: **power visibly flows** home)
- Windows popping on in sequence with a "LIGHT AA GAYI!" bubble and a ceiling fan starting to spin inside
- Streetlamp checkpoint: a flicker-flicker-ON with a moth swarm
- Speed lines on bolt dash · afterimages · cape physics
- District restored: comic splash page "DISTRICT RESTORED!" with a halftone burst
- Pause and level transitions as page turns

---

## 11. Story, script and the twist

### 11.1 Voice rules
- No pronouns for the hero before the finale. Radio calls the hero **"Crew 7"**. Chinni calls the hero **"Bijli"**.
- Chinni's lines: short, funny, brave, lowercase crayon handwriting. Radio lines: terse, procedural.
- Humour lives in the comic world: monster names, onomatopoeia and Chinni's dramatic captions. The heart lives in the
  real world: the quiet, the rain, the lit windows.

### 11.2 Interstitials (between levels, skippable with Space)
Each is one **comic page** composed from game art (3–4 panels) plus one **phone message**:
- after L1: page "BIJLI VS THE DARK" · message: *"bijli the fridge is making the sad noise again"*
- after L2: page "BIJLI GETS A CAPE" · *"are you scared of thunder? i am only a little"*
- after L3: page "THE CROCODILE RIVER" · *"i ate dinner. dal. no light so i ate in the dark lol"*
- after L4: page "TOOFAN RAJA IS ANGRY" · *"Nani says the hospital is dark too"*
- after L5: page "BIJLI SAVES THE BABIES" · *"i'm drawing the last page. come home and see"*
- after L6: page "THE DRAGON (BIG ONE)" · *"the whole sky went yellow!! was that you??"*
Radio between levels: *"Crew 7, Bazaar feeder down. Over."* · *"Crew 7, underpass flooding, isolate before entry."* and so on.

### 11.3 Finale sequence (FinaleScene, scripted, about 60 s, no input except "continue")
1. The house lights. A warm window glow spreads over wet ground. The rain stops. Silence, then a ceiling fan starts inside.
2. Chinni runs to the window, presses the comic against the glass: the last page is blank except the title
   **"BIJLI COMES HOME"**.
3. The lineworker stands under the porch light, unclips the harness and lifts off the helmet. **It's Amma.**
   Hair tied up, rain on her face, tired smile. (Hold the shot. No music sting, just the fan and dripping water.)
4. Chinni's crayon hand draws the last panel live on screen: Amma in her raincoat, and the BIJLI cape drawn over her
   shoulders. Caption in crayon: **"my amma is bijli."**
5. A soft cut to the comic world version of the street: every house lit, Toofan Raja asleep, BIJLI's cape fluttering.
   The theme plays once, slowly.
6. End card (plain, respectful):
   *"Inspired by the linewomen of Telangana, who climb poles in the storm so the rest of us have light."*
   Second line: *"Never touch a fallen wire. Call your local electricity helpline."* (Before adding any phone
   number, verify it for Telangana.)
7. Credits as comic panels: the team as Chinni-style crayon drawings.

### 11.4 Real-world grounding (for the README and submission page; accurate, don't embellish)
- Babburi Sirisha from Siddipet district became the **first woman appointed junior lineman** at Telangana's
  southern power distribution company (TSSPDCL) in May 2022, after clearing the pole-climbing test. She was posted
  in the Medchal circle.
- Telangana Transco had earlier recruited about **200 linewomen**, the first time in the state's power sector.
- Our hero is **fictional**. Do not use real names or likenesses in-game.

---

## 12. Audio (procedural WebAudio, `audio/`)
- **One song, two arrangements**, same tempo (112 BPM) and key (D minor → D major at the finale), crossfaded on the
  switch (120 ms) so the twist feels musical:
  - *Real:* low pad, a pulse bass on quarter notes, sparse plucked melody, rain as part of the mix.
  - *Comic:* synth brass stabs, dhol pattern (kick on 1 and 3, dhol "dha" accents), bouncy bass, a heroic
    four-note BIJLI motif.
  - Boss: both layers at once. Finale: a solo plucked version of the motif, then the full major-key theme in the
    comic coda.
- **Ambience:** rain bed (filtered noise, intensity by level), distant traffic in L2, water rush in L3, wind in
  L4, generator chug in L5, transformer hum in L6.
- **Electric hum at 50 Hz with harmonics** (Indian mains frequency) near live lines; pitch rises with proximity.
- **SFX:** footsteps (wet), ladder clanks, splice creak per twist, spark crackle, breaker KA-CHUNK, power-up surge
  (rising sweep + click), fan spin-up, thunder (brown-noise burst with a long lowpass tail, delayed after the flash
  by 0.3–1.5 s), punch thwacks, bolt-dash zap, monster grunts (formant-filtered noise), UI clicks.
- Master, music and SFX volume sliders. Mute = M. Audio starts on the title screen click.

---

## 13. UI and UX
- **HUD** (small, at the edges): 3 sparks (top-left), Hausla meter as a lightning-shaped bar (top-left, under the
  sparks), district bar "🏠 4/6 lit" (top-right), timer only in L5.
- **Contextual prompts** only, near objects, as key icons.
- **Title screen is playable ambience:** a rainy street at night with one lineworker silhouette on a pole. Shift
  toggles the title art into the comic version. This teaches the twist before the game even starts.
- **Pause:** Resume · Restart from checkpoint · Skip level · Settings (volume, Reduce flashing, Splice assist,
  Quality, Reduced motion) · Level select (after first unlock).
- **Accessibility:** a "Reduce flashing" notice on the title, hazard states readable by shape and animation (not
  colour alone), remappable keys (stretch), assist toggles.
- **First 10 seconds:** the player spawns, rain falls, a single dead lamp is ahead, "E" floats over the breaker.
  No text box.

---

## 14. Performance budget
- 60 fps at 1280×720 on integrated graphics. Under 1500 active rain particles. Darkness RT at half resolution in
  medium quality.
- One post pipeline pass for the world style plus one for the wipe (merged if possible).
- Pool all particles and onomatopoeia objects. No allocation in the update loop.
- **Quality toggle:** High (all), Medium (half-res darkness, fewer rain layers, no misregistration), Low (no ink
  edges, minimal rain). Auto-drop one level if average fps < 50 for 3 s.

---

## 15. Team split (3 people, 3 Claude Code sessions)
| Role | Owns | First deliverable |
|---|---|---|
| **Systems lead** | `player/`, `core/` (power graph, splice, meter, level parser/validator), comic combat, monsters AI, tests, debug API | Greybox controller that feels great + power graph tests |
| **Levels & story lead** | `levels/`, `story/`, interstitial pages, the finale script, tuning `config.ts`, playtests, the twist's pacing | L1 greybox fully playable and validated |
| **Look & sound lead** | `fx/` pipelines + wipe, `world/` (darkness, rain, lightning, wires), rig + skins, onomatopoeia, `audio/`, UI, title, trailer GIFs, submission page | The wipe shader on a test scene + rain/darkness |
Merge to `main` at least every 3 hours. When conflicts arise, `config.ts` belongs to the Levels lead.

---

## 16. Phases (each ends with typecheck + tests + build green, a commit, and STATUS updated)

**Phase 0 · Scaffold (≤ 1 h, tonight).**
Vite + TS + Phaser, eslint/prettier, Vitest, Playwright, all scripts, `config.ts`, empty scenes,
`window.__bijli` debug API, public repo, README with the pitch, `CREDITS.md`.

**Phase 1 · Greybox core (tonight → Sat morning).**
Player controller with all feel params, ASCII level parser, L1 greybox (rectangles), poles + climbing, power graph
+ breakers + break points + splice (inset panel, twist input), loads lighting up (placeholder rectangles), lamps as
checkpoints, darkness RT + headlamp. Unit tests for graph, splice and meter.
**Look lead in parallel:** `WorldPipeline` with both styles and the wipe on a test scene.
*Exit check:* L1 is playable start to finish in greybox, and the wipe GIF is posted in the team thread.

**Phase 2 · The twist works (Sat 3 Oct).**
World switch with the wipe, Hausla meter, comic movement (double jump, faster), punch combo, Taar-Naag + the
grounded-wire window, bolt dash on the live-wire graph, crayon clouds, lightning system, rain, wire rendering
(catenary, live pulses, broken-end whip). L2 greybox playable. Validator enforced in CI.
*Exit check:* a 30 s clip of "punch cobra → switch → splice → bolt dash".

**Phase 3 · Content (Sun 4 Oct).**
L3 flood + Magar, L4 vertical + wind + Ped-Rakshas + Toofan Raja, L5 hospital timer, L6 Agni-Dragon boss, L7 home.
Interstitial pages + phone messages. Real and comic skins on the rig. First audio pass (song in both arrangements,
core SFX).
*Exit check:* the whole game is playable start to end, ugly in places.

**Phase 4 · Beauty + feel + finale (Mon 5 Oct).**
Finale sequence, all juice (§10.5), full audio, title screen, UI polish, quality toggle, Reduce flashing, assist,
skip level. **3+ outside playtests** (people who've never seen it). Fix every stuck point over 30 s and every
moment someone doesn't understand the twist.
*Exit check:* a 2-minute capture that the whole team is proud of.

**Phase 5 · Ship (Tue 6 Oct; freeze 12:00, deadline 16:00).**
Bug sweep, perf on the weakest laptop available, `npm run build`, zip `dist/`, test the zip in a fresh browser
profile, upload, submit on Indieconnect. Submission page: pitch (§1), 4–6 screenshots (both worlds), 1 GIF of the
wipe, controls, team, `CREDITS.md`, AI-usage note, and a 2-minute video that stops before L7 (no spoilers).
Confirm all 3 members are in the Discord team thread.

### Cut list (cut in this order if behind)
1. Crayon collectible gallery → 2. Wind gusts (L4) → 3. Magar crocs (replace with a breaker-only flood puzzle) →
4. L5 branching order (make it linear) → 5. Boss phase 3 → 6. Zipline.
**Never cut:** the world switch + wipe, splicing, the power-flows-home lighting, Taar-Naag interplay, bolt dash,
lightning reveals, L7 + the finale.

---

## 17. Working rules for Claude Code
- Before each task, restate it in 2 lines and list the files you will touch.
- After each change, run `npm run typecheck && npm run test && npm run build`. Never leave `main` red.
- `core/` must not import Phaser or the DOM. Every tunable goes in `config.ts`, and every user-facing string goes in
  `story/script.ts`.
- New or changed levels must pass `npm run validate-levels`.
- After any visual change, take a Playwright screenshot (`npm run e2e -- --grep shots`) and **look at it** before
  calling the task done.
- Ask before adding a dependency, and check it against the jam rules. Prefer writing it.
- No placeholder art may ship. If a sprite is missing, draw it as SVG in the house style.
- Prefer clarity for a first-time player over cleverness, then make it juicier.
- Keep the hero's gender ambiguous in every asset, string and filename until `FinaleScene` (e.g. name it
  `hero_real`, not `lineman`).
- Commit messages: `feat(player): coyote time`, `fix(power): breaker BFS`, `art(wipe): ink rim`.

---

## 18. Definition of done (judge's-eye checklist)
- [ ] Opens in the browser, title in < 5 s, audio starts on first click.
- [ ] Without instructions, a new player splices their first line within 60 s.
- [ ] A new player understands the twist (switch) within the first 30 s of L2.
- [ ] All three themes are visible in a single 20 s clip: lightning bolt dash (Light), ink-wipe switch + splice
      (Twist), the comic world (Comic).
- [ ] The full game takes 12–18 min, with skip-level available.
- [ ] 60 fps on a mid laptop; no softlocks; restart works everywhere.
- [ ] The finale lands. Test it on someone and watch their face.
- [ ] README, CREDITS, AI-usage note, public repo with a steady commit history.

---

## STATUS
- Phase: 0
- Last working build: —
- What works: —
- Known bugs: —
- Next task: Phase 0 scaffold
