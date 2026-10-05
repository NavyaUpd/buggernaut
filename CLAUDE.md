# CLAUDE.md: BIJLI (v3, build-phase spec)
**TGC Game Jam @ Infinium '26** (IIIT Hyderabad) · GDAI · Games for Change India · Themes: **Comic · Twist · Light**
Team **Buggernaut**: Hansika Grover (systems) · Navya Upadhyay (look & sound) · Shaurya Chandel (levels, story, art pages)
Repo: https://github.com/NavyaUpd/buggernaut · Phaser 3.90 + TypeScript + Vite (Phase 0 scaffold already in repo)
**Deadline: Tue 6 Oct 2026, 16:00 IST. Build freeze: Tue 12:00. Submission upload: Tue 12:00–14:00.**

> **Read this first, Claude Code.** Every design decision is already made in this file. Your job is to **implement
> it exactly**, not to design. If something is not specified, pick the **simplest** option consistent with this file,
> implement it, and add a one-line note under `STATUS → Open decisions` so a human can confirm. **Never add
> mechanics, rooms, menus, systems or text that are not in this file.** The level data lives in `src/levels/rooms.ts`
> (provided, validated). Treat it as authoritative.
>
> Session start: *"Re-read CLAUDE.md and STATUS. Continue with my next task from §14."*
> After every task: `npm run typecheck && npm run test && npm run build`, commit, and update STATUS.

---

## 1. What we are making (one paragraph)
A short (about 12 minutes), single-screen-room **platformer** set on a monsoon night during a blackout. You are a
lineworker in a helmet and raincoat. You climb poles and **splice snapped cables** to bring the power back. **Wherever
light returns, the world turns into Chinni's comic book**: crayon clouds appear to stand on, live wires become rails to
grind, and a deadly sparking wire becomes a cartoon snake you can bounce on. Chinni is the child at home drawing this
comic. Her **crayon drawings are a power-up** that turns you into the superhero **BIJLI** for 8 seconds. On the last
street the house lights up, the helmet comes off, and **the hero is Amma**.
*Bijli* means both electricity and lightning in Hindi.

## 2. Why this wins (keep these true in every decision)
1. **Theme = verbs.** Light changes the level; Twist is the repair (twisting wires) plus light twisting hazards into
   comic twins plus the plot twist; Comic is the world that light reveals plus Chinni's power-up. Judges score theme
   association.
2. **Learnable in 30 seconds.** Four inputs. The first room teaches the whole rule with zero text.
3. **One gorgeous signature moment, repeated:** a lamp blooms and paints the rainy night into a crayon comic.
   Polish this above everything.
4. **Finished > big.** 10 tight rooms, no bugs, a real ending. Past winners at this jam's sponsors were small and complete.
5. **Heart.** The ending lands because it's earned quietly. No speeches.

## 3. What we borrow from popular games (and nothing more)
| Game | What we take | Where |
|---|---|---|
| **Celeste** | Movement model: variable jump hold, half gravity at the apex, coyote time, jump buffer, single-screen rooms, instant respawn, no health bar. Constants from its public `Player.cs` (NoelFB/Celeste), scaled ×4 for our 32 px tiles. | §5, §7 |
| **Gris** | Colour returning to the world as the core reward | comic panel reveal §9.3 |
| **Limbo / Inside** | Darkness with readable silhouettes; no tutorial text | real look §9.1 |
| **Sonic** | Grind rails: snap on, speed, sparks, jump off | rails §6.4 |
| **Super Mario** | Star power-up (BIJLI mode), bounce-on-enemy (snake) | §6.5, §6.6 |
| **Spider-Verse** | Halftone, ink lines, characters animated "on twos" (12 fps) inside the comic | §9.2 |
| **Florence / Night in the Woods** | Tiny emotional beats between chapters (phone messages) | §10 |
**Don't copy code or art from any of them.** Reimplement.

---

## 4. Hard constraints
- Browser only (WebGL). 1280×720 canvas, `Scale.FIT`. 60 fps on an integrated-GPU laptop.
- **Inputs:** A/D or ←/→ move · Space jump (W/↑ also jumps when not on a pole) · W/S climb · **E interact** (tap
  for breaker; **hold** for splice) · Esc pause · R restart room. **Nothing else.** No mouse needed.
- **No health, no lives, no score, no timer** (except strike timing). Hazards cause an instant Celeste-style respawn
  at the room spawn. Room progress (splices, breakers) is **kept** on respawn.
- **No scrolling camera.** Every room is one fixed screen, 40×22 tiles of 32 px = 1280×704, drawn at y = 8 with an
  8 px black **comic gutter** top and bottom. Each room is literally a comic panel.
- All art is generated in code **or** hand-drawn by the team (crayon pages, §9.6). All audio is procedural WebAudio.
  No third-party assets. Log tools in `CREDITS.md`.
- Total first playthrough: 10–14 min. Skip room is available in pause from the start.
- **Gender-neutral hero until the finale:** no pronouns, the face is always hidden in helmet shadow, and the radio
  calls the hero "Crew 7". File and asset names use `hero_*`.
- Reduce-flashing toggle (pause menu and title notice). When on, lightning is a soft 300 ms brighten.

---

## 5. Player feel (replace `MOVE` in `src/config.ts` with exactly these)
Celeste ×4, run speed slowed slightly. Units are px, px/s, px/s² and s.
```ts
export const PLAYER = {
  hitbox: { w: 22, h: 56 }, sprite: { w: 40, h: 64 },           // anchor bottom-centre
  maxRun: 300, runAccel: 3600, runReduce: 1600, airMult: 0.65,
  gravity: 3200, halfGravThreshold: 160,                          // gravity ×0.5 while jump held and |vy| < 160
  maxFall: 640, fastMaxFall: 900,                                 // fast fall while holding down
  jumpSpeed: 420, jumpHBoost: 120, varJumpTime: 0.2,              // hold jump: vy stays ≤ -420 for up to 0.2 s
  coyoteTime: 0.1, jumpBuffer: 0.12,
  climbUp: 190, climbDown: 260, poleJumpOff: { vx: 240, vy: 380 },
  grindSpeed: 520, grindSpeedBijli: 620,
  doubleJumpSpeed: 380, doubleJumpVarTime: 0.15,                  // BIJLI only
  bounceSpeed: 1100,                                              // snake bounce
  respawnFreeze: 0.15, respawnFade: 0.3,
} as const;
```
Resulting **design rules** (the rooms were validated against these, so don't change the physics without
re-validating):
- A full jump clears **3 tiles up** and **4–5 tiles across**. A tap jump is about 1 tile.
- A snake bounce clears **5 tiles up**. A BIJLI double jump clears **5 tiles up**.
Implementation: custom velocity integration in `update()`; use Arcade Physics only for tile collision (body with
gravity disabled, set velocity yourself).

---

## 6. Mechanics (the complete list; there are no others)

### 6.1 Terrain and collision
- Build an invisible Phaser **Tilemap collision layer** from the room map: `#` = full collision.
  `=` = one-way (`tile.setCollision(false,false,true,false)`). `c` = one-way **only while lit**: toggle its
  collision whenever lighting changes.
- Poles `|`, ladders `H` and splice cells `X` that sit on a pole are **climbable** (overlap test, not collision).
  Press W/S while overlapping to grab. Gravity is off while climbing. Jump to leave (poleJumpOff away from the pole,
  or straight up if no direction is held). At the pole top the player can stand with feet on the top cell.
- Falling below row 21 = respawn.

### 6.2 Splicing (the "twist")
- Overlapping an `X` cell, while climbing or standing, shows a floating **"Hold E"** prompt.
- **Hold E for 1.0 s.** Three twist beats at 0.33 / 0.66 / 1.0 s: on each, play a twist pose frame, a metallic
  creak, a 2 px shake and sparks. The hero visibly twists the two cable ends together. Releasing early cancels with
  no penalty.
- If the circuit's breaker is **closed** when the hold starts, the player is **shocked** instead: KZZZT
  onomatopoeia, cyan flash, knockback (vx 300 away, vy −300), 6 px shake, no respawn. The **first** time only, a
  crayon tip bubble appears above the breaker: **"switch it off first!"**
- On success: an ink stamp **"TWIST!"** with 80 ms hit-stop, and the cable sprite snaps straight. If the circuit is
  now complete **and** (no breaker **or** breaker closed) → **power on** (§6.3).

### 6.3 Breakers and power-on
- `B` / `M`: tap E to toggle (250 ms cooldown). The lever visibly flips, with KA-CHUNK and a red (open) or green
  (closed) lamp. Readable by both shape and colour.
- A circuit is **powered** when all of its splices are done and its breaker (if any) is closed. Power-on sequence:
  an energy pulse travels along the wire from the circuit's splice to each of its lights over 300 ms, then each
  light **blooms** (§9.3), a "BIJLI AA GAYI!" bubble pops from the nearest window or lamp, and the lit-only objects
  inside its panel become active.
- Opening the breaker of a powered circuit turns its lights off again (reverse bloom, 250 ms).
- Water `~` in room 3-1 is **deadly whenever that circuit's breaker is closed**, spliced or not. Show crawling cyan
  sparks and a 50 Hz hum while live; it is calm and dark while the breaker is open.

### 6.4 Lightning rails
- A rail is a wire between two pole tops (`rooms.ts → rails`). It's **grindable** if (its circuit is powered **and**
  its whole length is lit) **or** BIJLI mode is active.
- Attach when the player is at either pole top, or falls onto the wire within 12 px, while moving toward the other
  end. The player snaps onto the wire and moves at grind speed along it in the facing direction. Sparks spray under
  the feet, speed lines appear and a crackle loop plays. Jump leaves the rail with full jump plus current horizontal
  velocity. At the far end the player drops onto that pole (auto-grab).
- Rails are drawn with a slight sag but treated as straight segments for movement.

### 6.5 Taar-Naag (the snake)
- `n` cells: in the **dark** it's a snapped live wire whipping and sparking, and touching it means respawn. In
  **light** (or BIJLI) it's a goofy cartoon snake. Landing on it or walking onto it launches the player at
  `bounceSpeed` with BOING, squash on the snake and a stretch on the player.

### 6.6 Chinni's drawing → BIJLI mode
- `D` is a floating crayon page (bobbing, glowing). On touch: **8 s of BIJLI mode**.
- While active: the light mask is full screen (everything is comic, so every `c` is solid and every snake is bouncy),
  **every rail is grindable** (even unpowered ones), double jump is available, and snakes, strikes and live water
  can't hurt you. Pits still respawn you.
- A timer ring around the hero shows remaining time. The last 2 s blink with a ticking sound. On end: ink "POOF",
  the mask returns to the real lights, and if you're on a rail that is no longer grindable you fall.
- `D` respawns whenever the room resets (respawn) or after 10 s if consumed.

### 6.7 Lightning
- **Ambient flashes** every 10–16 s in rooms 1-1…3-3 (not 4-1): a 1.2 s telegraph (distant flicker, low rumble), then
  a flash: for **0.4 s the whole screen shows the comic layer** (the mask goes full), but lit-only objects do **not**
  become solid. Then thunder 0.3–1.5 s later.
  This is the "peek": players see where clouds and rails will appear. Room 1-2 is designed around it.
- **Strike columns** (3-2, 3-3): each column cycles every 3.6 s. 1.2 s telegraph: a pale vertical glow plus a
  pulsing ring on the ground. 0.25 s strike: full-height zigzag bolt, deadly, KRAKOOM, shake. Then quiet.
  Column phase offsets: 0, 1.2 and 2.4 s in listed order. BIJLI ignores strikes.

### 6.8 Respawn, exits and room flow
- Death (pit, dark snake, live water, strike): freeze 0.15 s, cyan flash, fade 0.3 s, respawn at `P`. Splices and
  breakers are kept; BIJLI ends; the drawing respawns.
- Touching `E` → next room via a **panel slide**: the current panel slides left, a black gutter passes, the next
  panel slides in (400 ms, ease in-out). In 4-1 the door `E` is inactive until the house is lit.
- 3-3: closing the master breaker `M` after the splice triggers the **skyline bloom** (§9.3) and ends the chapter.

---

## 7. Game flow (scene by scene)
1. **Boot**: generate textures (§9), load the crayon PNGs (§9.6).
2. **Title**: room 1-1's dark street with rain (no player), the crayon "BIJLI" logo, "press any key",
   "reduce flashing: F". Any key → chapter card 1.
3. **Chapter card** (crayon page, 2.5 s, any key skips) + one radio line in small type:
   - Ch1 **Gali No. 4**, *"Crew 7, the whole feeder is down. Start at Gali 4. Over."*
   - Ch2 **The Bazaar**, *"Crew 7, bazaar lines snapped in the wind. Over."*
   - Ch3 **The Storm**, *"Crew 7, substation is out. Careful up there. Over."*
   - Ch4 **Ghar** (no radio line; silence)
4. **Rooms** in order: 1-1, 1-2, 1-3 → card → 2-1, 2-2, 2-3 → card → 3-1, 3-2, 3-3 → card → 4-1. On room entry,
   Chinni's caption (from `rooms.ts`) appears in crayon handwriting at the top-left for 3 s.
5. **Between chapters**, after the "DISTRICT RESTORED!" stamp, a phone message card (a phone screen with one chat
   bubble from "Chinni", any key continues):
   - after Ch1: *"bijli the fridge is making the sad noise again"*
   - after Ch2: *"are you scared of thunder? i am only a little"*
   - after Ch3: *"the whole sky went yellow!! was that you??"*
6. **Finale** (§10). 7. **End card + credits.**
Pause (Esc): Resume · Restart room · Skip room · Mute · Reduce flashing.

---

## 8. Levels
### 8.1 The data
`src/levels/rooms.ts` (provided) contains all 10 rooms: maps, lamps (tile centre + radius in tiles), rails,
circuits, strike columns and captions. Its legend is at the top of the file. **Replace** `src/core/level/schema.ts`
types with the `RoomDef` types from `rooms.ts`, and delete anything that conflicts. A visual overview of every room
is in `docs/rooms_overview.png`.

### 8.2 What each room teaches (one new idea each)
| Room | Teaches | Solution (for testing) |
|---|---|---|
| **1-1 First Light** | move, jump, climb, splice, **light makes the comic** | climb pole → hold E → lamp blooms → crayon clouds → wall top → exit |
| **1-2 The Flash** | the lightning peek | flashes show 3 clouds over the pit → splice → cross on clouds → ladder → exit |
| **1-3 The Live Line** | breaker + shock + **rail** | try to splice → shocked → breaker off → splice → breaker on → grind the wire over the pit |
| **2-1 Taar-Naag** | hazard → friendly twin | splice → the light turns the deadly wire into a snake → bounce up the 5-tile wall |
| **2-2 Rooftop Rails** | two circuits in sequence | splice A → grind to the middle roof → breaker off → splice B → breaker on → clouds → exit |
| **2-3 Chinni's Drawing** | the **BIJLI** power-up | grab the drawing → climb → grind 2 dead wires (only possible as BIJLI) → exit |
| **3-1 Underpass** | water + breaker order | breaker off (water safe) → drop in → splice → ladder up → breaker on (water live) → clouds over the water → exit |
| **3-2 Strikes** | timing under pressure | cross the strike columns → splice inside a strike column between strikes → clouds → exit |
| **3-3 Substation** | the finale remix | drawing → climb → grind (BIJLI) → 2nd drawing for the strike column → splice → **master breaker** → skyline bloom |
| **4-1 Ghar** | nothing new: calm | walk, one splice, the house lights, walk to the door → finale |

### 8.3 Rules if a room must be changed (avoid it)
Each room was checked: everything needed before the first light is reachable in the dark; the exit is **not**
reachable in the dark (4-1's door is gated by logic); the exit **is** reachable after power-on; rails are fully
inside lamp light; BIJLI rooms can't be finished without the drawing. If you edit a map, keep jumps ≤ 3 up and
≤ 4 across, and ask a human to replay it.

---

## 9. Look

### 9.0 Visual reference build (match this, don't reinvent it)
`docs/style-target.html` is a playable prototype of room 1-1 at the target quality: the rainy real look, the
headlamp, the sparking splice point, the 3-beat twist, the TWIST! stamp, the energy pulse, the **lamp dropping a comic
panel** into the night (ruled border, notebook page, colour sweep), the BIJLI skin in light, lit-only clouds, the lightning peek, rain splashes
and procedural audio. **Every room must look and feel at least this good.**
`docs/rooms_overview.png` is only a layout blueprint (where things are). It is **not** the look.
- **Rendering approach (decided):** port the prototype's Canvas-2D compositing into `src/render/RoomCanvas.ts`
  (bake the real and comic layers per room, then per frame: real → props → darkness with erased holes → comic layer
  masked with `destination-in` by the light mask → hero → particles/rain/FX). Show it in Phaser as **one
  `CanvasTexture` image refreshed every frame**. Phaser keeps scenes, input, tweens, timers and transitions.
  Phaser BitmapMask is only a fallback if canvas compositing is too slow.
- Perf fallback: if fps < 50, bake and composite the comic layer at half resolution and scale it up.
- Upgrade over the prototype, in this order: hero frames per §9.4 (the prototype hero is a placeholder rig),
  rails, snake, water, strikes, breakers.

### 9.1 Real look (darkness) "Monsoon Noir"
- Palette: night `#141A2E`, wet block `#2B3550`, block edge highlight `#5C6B8A`, sodium `#FFB347`, live arc
  `#7FE3FF`, danger `#FF4D4D`, window `#FFD58A`, rain `#8FA3C7`.
- Background: 2 parallax-style static layers of procedural city silhouettes (rooftops, water tanks, dish antennas,
  tangled overhead cables, a temple spire), with sparse dim windows. Draw them **once per room** into the real RT.
- Blocks: dark wet fills with 2 px highlights on exposed top edges and drips on overhangs.
- **Darkness overlay RT:** fill `rgba(5,8,20,0.88)`, then erase the **headlamp cone** (35°, 320 px, soft edge,
  follows facing) and the **light cones** (lamp head → ground trapezoid + ground pool) of powered lamps. The headlamp is vision only and does not create comic.
- **Depth and life (required, see the prototype):** parallax layers that shift with the player's x (far ±10 px, mid ±24 px, foreground
  ±60 px); two drifting storm-cloud bands; **forked lightning behind the skyline** that lights the cloud undersides; candle-lit windows that
  flicker, one with a moving silhouette (people waiting in the blackout); ground mist drifting; puddles with rain ripples that reflect the
  lamp and the headlamp; water dripping from crossarms and wall edges; overhead cables swaying with wind gusts (the rain angle follows the
  same gust value); a dark foreground gulmohar branch and cable bundle framing the top of the panel; a **sleeping street dog** near the lamp
  that breathes and flicks an ear at thunder (its comic twin wags and hops once the light arrives).
- Rain: 2 particle layers (far thin and slow, near thick and fast), angle 12°, splashes on block tops. Under 1200 particles.

### 9.2 Comic look (light) "Chinni's Comic"
- Palette: paper `#FFFFFF`, ink `#000000`, crayon yellow `#FFD400`, red `#FF3B30`, blue `#2F6BFF`, green
  `#2ECC71`, sky `#9ED8FF`, BIJLI cyan `#4FF0FF`, cape magenta `#FF3E9A`.
- The **same room** is redrawn: sky `#9ED8FF` with a halftone dot overlay (64 px generated dot pattern, 20%) and
  loose crayon hatch strokes; blocks in crayon yellow/orange with **3 px black outlines** on exposed edges and
  diagonal crayon texture; buildings bright with lit windows; poles red-brown with ink outlines.
- Comic-only objects: crayon clouds (white with a blue crayon outline, slight bob), the snake, rails glowing cyan
  with zigzag scribbles, onomatopoeia.
- **Characters in light animate on twos** (pose updates at 12 fps) while the rest of the game runs at 60.

### 9.3 Comic panels: how the two looks combine (signature system)
**Light doesn't make a round blob. Every powered lamp drops a COMIC PANEL into the night.** The lit area is a slightly tilted,
hand-ruled panel frame (white gutter + thick ink border + drop shadow onto the real night). Inside the panel is Chinni's comic;
outside is the real storm. Multiple lamps give multiple panels that can overlap like a comic page collage. The room itself is
already a panel (§4 gutters), so the whole game reads as a comic page being drawn.
- **Panel geometry** (per lamp, from `rooms.ts` radius r in px): left = x − 1.06r, right = x + 1.04r, top = y − 0.95r, bottom =
  bottom of the room. Corners are nudged (TL +6/+10, TR 0/−4, BR −4/0, BL −4/0) so it looks hand-ruled, not perfect. "Lit" for
  gameplay = **inside this quad** (point-in-polygon), and only once the colour stage has finished.
- **Power-on sequence** (exact timings in `docs/style-target.html`, `SEQ`):
  1. **0–0.55 s, real light:** the lamp buzzes and flickers on (0, .08, .16, .22, steady at .3). A **physical light cone** (trapezoid
     from the lamp head to the ground) and a warm ground pool appear in the real look. Nothing is comic yet.
  2. **0.55–1.15 s, the panel is ruled:** Chinni's pen travels the panel perimeter drawing the white gutter + ink border. Once it is
     about a third of the way round, her **notebook page** (white, ruled blue lines, red margin, pencil outlines of the same scene) fades
     in inside it. Pen-scratch SFX.
  3. **1.05–1.85 s, colour sweeps in:** a slanted, zig-zag-edged sweep paints the full-colour comic across the panel from left to right.
     A big magenta crayon rides the sweep edge, leaving a crayon line and sparkles. The panel's drop shadow fades in.
  4. **1.85 s, payoff:** the panel does a tiny 1.2% pop, a yellow **caption box** appears in its top-left corner in Chinni's handwriting
     (*"meanwhile, in gali no. 4..."*), the "BIJLI AA GAYI!" speech bubble pops, the chime plays, the dog wakes up, and lit-only objects
     (clouds, snake, rails) become active.
  - The **first** panel of the game also shows Chinni's caption *"wherever bijli comes back, my comic comes alive!"*.
  - The hero's costume swap at the panel edge spawns a burst of ink stars, and the hero always draws **on top** of the border
    (a classic "breaking the panel" comic look).
- **Lightning peek:** the whole screen fades (0.55 s envelope) into one full comic page with its own white gutter and ink border, then back.
- **BIJLI mode:** the same full-page panel stays up for 8 s.
- **Skyline bloom** (3-3): every background window pops on over 2 s, then the full-page panel is ruled around the whole screen and stays.
- **Implementation:** canvas compositing exactly as in the prototype. Bake `sketchC` (notebook) and `comicC` (colour) per room. Per frame,
  mask each with `destination-in`: the notebook with the panel quad, the colour with the quad ∩ the sweep polygon. Then stroke the
  border (16 px white, then 6 px black) along the perimeter up to the pen's progress.

### 9.4 Hero sprite (generate as SVG frames at boot, 40×64, anchor bottom-centre)
- **Real skin:** dome helmet `#FFC531` with a headlamp disc, **face area always a solid shadow `#0B0F1C`** (never
  draw a face), khaki raincoat `#8A7A4F`, reflective silver bands `#D9E3EA` at the chest and cuffs (they read in the
  dark), orange gloves, black boots, a tool belt. Chunky, bulky, gender-neutral silhouette.
- **BIJLI skin:** same body plus a magenta cape `#FF3E9A` with a yellow zigzag **sari-border** hem, a cyan lightning
  emblem on the chest, and a lightning crest on the helmet. Black 2 px ink outline on everything.
- **Character animation (the prototype rig is the minimum bar):** two-segment legs and arms (knees and elbows bend), body bob and forward lean
  with speed, a raincoat hem that flaps with motion, a tool belt + harness strap + reflective bands, idle breathing, an **idle shake-off** after 4 s
  standing still (body wobble + flying droplets), squash on landing with knee bend, hand-over-hand climbing, a twisting-hands splice pose,
  a headlamp beam that bobs with the stride, and wet footstep splashes with soft step sounds. In light, the cape trails with velocity and the rig
  updates on twos.
- Frames: idle ×2, run ×6, jumpUp ×1, fall ×1, climb ×2, splice ×3 (twist poses), grind ×1 (crouch), hurt ×1,
  celebrate ×2. Squash 0.85/1.15 on land and jump.

### 9.5 Other sprites (generated)
- Pole (wood/concrete, crossarm, insulators), lamp post (sodium head; dim glass when unpowered), breaker box
  (lever + status lamp), splice point (two frayed copper ends that **sparkle** to attract the eye), wires (catenary
  sag 6–12 px; grey dead, glowing cyan live with travelling dashes), the drawing (folded crayon page), water
  (dark band with ripples; live = crawling sparks), strike bolt (white zigzag + glow), snake twins (dark: black wire
  + spark head; light: lime green `#2ECC71` cartoon snake with a yellow belly, big white eyes and a smile).

### 9.6 Hand-drawn crayon pages (Shaurya: real crayons on paper, photographed in daylight)
Hand-drawn art **is** Chinni's comic, so it's authentic, original and fast. Scan or photo → clean the background to
white → PNG ≤ 1600 px wide → `public/art/crayon/`.
1. `logo.png`, "BIJLI" with a lightning bolt · 2. `drawing.png`, the power-up page (small) ·
3. `ch1.png`…`ch4.png`, chapter cards · 4. `captions/*.png` (optional; otherwise use the font below) ·
5. **Finale panels:** `final_window.png` (Chinni at the window, holding her comic), `final_helmet.png` (the
lineworker lifting the helmet: **Amma**, tired, smiling, rain on her face), `final_page.png` (Chinni's last page:
Amma in her raincoat with the BIJLI cape drawn on, caption **"my amma is bijli."**) · 6. `team.png` for the credits.
If photos aren't ready, use placeholder rectangles with a label (never ship them).
**Text font:** captions use a handwriting-style canvas font stack (`"Segoe Print","Bradley Hand","Comic Sans MS",cursive`)
in lowercase. UI uses `"Trebuchet MS",sans-serif`, bold.

### 9.7 Juice (all required; each is small)
Landing dust · jump/land squash · wet footstep splashes · splice sparks + 3 twist beats + TWIST! stamp + hit-stop ·
energy pulse along wires · comic panel reveal (§9.3) · "BIJLI AA GAYI!" bubble · snake BOING with squash · grind sparks +
speed lines · BIJLI pickup stinger + ring timer · shock KZZZT + knockback · lightning peek · strike telegraph glow ·
respawn flash · panel-slide room transitions · DISTRICT RESTORED! stamp. Screen shake max 6 px (off with reduced
flashing).

---

## 10. Finale (FinaleScene, about 45 s, input only to continue at the end)
1. In 4-1, after the house lights and the player reaches the door: the rain fades out over 2 s, the music drops to a
   single plucked motif, and the screen holds 1 s on the lit window.
2. Fade to `final_window.png` (slow 4% push-in, 4 s).
3. Cut to `final_helmet.png`: **the reveal**. Hold 5 s, push-in 3%. **No sound sting**: only a ceiling fan
   whirr and dripping water.
4. `final_page.png` with the caption **"my amma is bijli."** (6 s). The light layer of the music returns once,
   slow and major.
5. End card on black, white text:
   *"Inspired by the linewomen of Telangana, who climb poles in the storm so the rest of us have light."*
   then *"Never touch a fallen wire. Call your local electricity helpline."*
6. Credits: `team.png` plus names, "made in 4 days at TGC Game Jam, Infinium '26", and "made with Phaser 3".

---

## 11. Audio (procedural WebAudio, `src/audio/`)
- **Music:** one loop at 96 BPM in D minor with two layers.
  - *Dark layer* (always on): low pad (2 detuned saws through a lowpass at 600 Hz) and a soft pulse on the root.
  - *Light layer*: pentatonic plucks (D F G A C), a dhol-like pattern (kick on 1 and 3, a slap on the "and" of 2
    and 4), and a 4-note BIJLI motif (D A G F) every 4 bars.
  - Light layer gain = the light mask value at the player's feet, smoothed over 250 ms. BIJLI mode = full gain plus a stinger.
- **SFX:** rain bed (filtered noise), thunder (brown noise, long lowpass tail), jump, land, footstep, climb tick,
  twist creak ×3, TWIST stamp, shock, breaker KA-CHUNK, power pulse, lamp bloom chime (major triad, quick arpeggio),
  boing, grind loop, BIJLI pickup, timer tick, strike crack, respawn whoosh, panel slide, 50 Hz hum near live wires and water.
- Audio starts on the first key press. Mute in pause.

---

## 12. Code layout (fit into the existing scaffold)
```
src/config.ts                 PLAYER (§5), colours, light, lightning, BIJLI, strike timing — all numbers here
src/levels/rooms.ts           provided room data (authoritative)
src/core/                     pure TS, unit-tested: circuits.ts (powered state, shock rule, water live),
                              roomParse.ts (map → cells, markers, rails), timers.ts (strike phases, BIJLI)
src/scenes/                   Boot, Title, ChapterCard, Room (one scene, loads a RoomDef), Phone, Finale, Credits, Pause, UI
src/game/                     Player.ts (controller + states), Climb.ts, Rail.ts, Splice.ts, Breaker.ts,
                              Snake.ts, Strikes.ts, Water.ts, Drawing.ts, Respawn.ts, RoomFlow.ts
src/render/                   bakeReal.ts, bakeComic.ts, LightMask.ts, Darkness.ts, Rain.ts, Wires.ts,
                              HeroSprites.ts (SVG frames), Props.ts, Onomatopoeia.ts, PanelSlide.ts
src/audio/                    Engine.ts, Music.ts, Sfx.ts
public/art/crayon/            hand-drawn PNGs (§9.6)
docs/rooms_overview.png       level overview
```
Tests (Vitest): circuits (shock when the breaker is closed; powered only when complete + closed; water live rule), roomParse (every
map is 40×22 with exactly one `P`, at least one `E`, and markers match circuit coordinates), strike phase timing.
`npm run validate-levels` = the roomParse checks over every room.

---

## 13. Do-not list
- No new mechanics, enemies, collectibles, currencies, health, dialogue trees or level select.
- No scrolling camera, no zoom except the finale push-ins.
- Don't show the hero's face or use pronouns before `FinaleScene`.
- Don't print instructions on screen except: "Hold E" / "E" prompts, the one "switch it off first!" tip, the room
  caption, chapter cards and phone messages.
- Don't add libraries. Phaser only.
- Don't change room maps or physics numbers without a human replaying the room.
- Don't ship placeholder art.

---

## 14. Build plan (about 24 hours of team time, milestones are hard gates)
**M1, playable core (target +5 h).**
- Hansika: `Player` with exact §5 feel, collision layer, climbing, Room scene loading 1-1 from `rooms.ts`, splice
  hold, circuits + breakers + shock, respawn, exit → next room.
- Navya: `bakeReal` and `bakeComic` for 1-1, comic panels (ruled border, notebook fill, colour sweep, caption box), darkness + headlamp. Prototype
  on 1-1 first.
- Shaurya: crayon pages (logo, ch1–4, drawing, the 3 finale panels), the caption font fallback, ChapterCard + Phone scenes.
- *Gate:* 1-1 fully playable with the bloom. Record a GIF and post it in the Discord team thread.

**M2, all rooms playable (target +11 h).**
- Hansika: lit-only clouds, rails, snake, BIJLI, strikes, water rule, lightning peek, all 10 rooms.
- Navya: rain, wires, props, hero SVG frames (both skins), onomatopoeia, panel slide, skyline bloom.
- Shaurya: play every room and file exact bugs, room flow + chapter cards + phone cards wired, FinaleScene.
- *Gate:* title → credits playable start to end (art can be rough). **If missed, cut 2-2 and 3-2.**

**M3, beauty and sound (target +17 h).** Navya: audio (§11), juice list (§9.7), title screen. Hansika: bug fixes,
pause menu, reduce flashing, perf (60 fps). Shaurya: finale timing, captions, 3 outside playtesters (watch silently,
note every stuck moment over 20 s).

**M4, polish freeze (Tue 10:00).** Fix only playtest blockers. **Tue 12:00 build freeze:** `npm run build`, zip
`dist/`, test the zip in a clean browser profile.

**Submission (Tue 12:00–14:00, Shaurya):**
- Indieconnect page: pitch (§15), 5 screenshots (dark room, a bloom mid-way, the snake bounce, a BIJLI grind,
  the skyline bloom), a GIF of a lamp bloom, controls, team, "Inspired by" note, AI usage.
- A 2-minute video that stops before 4-1.
- Confirm all 3 members are in the Discord team thread. Check that the public repo has steady commits.

**Cut order if behind:** 3-2 → 2-2 → ambient lightning peek outside 1-2 → hero celebrate/hurt frames → rain splashes.
**Never cut:** bloom, splice, clouds, rails, snake, BIJLI, 3-3 skyline bloom, 4-1 + finale.

---

## 15. Submission text (spoiler-free)
> **BIJLI** is a monsoon-night platformer about the people who bring the light back. Climb poles and splice snapped
> cables as a lineworker in a city-wide blackout. Wherever you restore the light, the rainy night turns into a
> child's crayon comic: clouds to stand on, wires to grind, and dangers turned into cartoons. Grab Chinni's drawings
> to become BIJLI, the superhero she's drawing at home. *Bijli* means both electricity and lightning.
> Controls: A/D move · Space jump · W/S climb · E interact (hold to splice) · Esc pause.

**Themes in one line each:**
- **Light** is what changes the level.
- **Twist**: every repair is a twist, light twists dangers into comic twins, and the story has a twist.
- **Comic**: the lit world is a child's comic, and her drawings are the power-up.

---

## STATUS
- Phase: build (v3). Updated Tue 6 Oct ~01:10 IST.
- Milestone: **M2 gate met** (title → credits playable end to end; every room solvable). Next: M3 (real-browser playtests, feel tuning, juice gaps).
- Works:
  - All 10 rooms in ;  checks §8.3 with jump envelopes simulated from .
  -  (pure TS): §5 movement, climb, pole-top standing, splice + shock + tip, breakers, power-on SEQ, lit-only clouds, rails (incl. chaining), snake, BIJLI, live water, strikes, lightning peek, respawn, gated exits, skyline bloom.
  - Headless playthroughs of **every** room in  (38 tests); Playwright  (screenshots every room dark + lit) and  (title → card → pause skip → DISTRICT RESTORED → phone → finale → credits).
  - Renderer  ports the style target (panels, notebook, colour sweep, ruled border, caption box, bubble, peek, BIJLI page, skyline, panel slide). Procedural audio in .
  - Crayon pages: procedural fallbacks in ; dropping real PNGs into  replaces them automatically.
  - Perf probe: > bijli@0.0.1 build
> tsc --noEmit && vite build

[36mvite v8.3.2 [32mbuilding client environment for production...[36m[39m
transforming...
✓ 36 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                    0.43 kB │ gzip:   0.30 kB
dist/assets/index-BMoEYigz.js  1,362.48 kB │ gzip: 372.52 kB

[32m✓ built in 1.49s[39m then gpu ANGLE (AMD, AMD Radeon(TM) Graphics (0x0000164C) Direct3D11 vs_5_0 ps_5_0, D3D11)
2-2 dark  fps 43  sim 0.17ms  render 1.50ms  upload 0.10ms
2-2 lit   fps 53  sim 0.17ms  render 2.29ms  upload 0.08ms
1-1 dark  fps 54  sim 0.16ms  render 1.28ms  upload 0.09ms
1-1 lit   fps 59  sim 0.16ms  render 1.81ms  upload 0.06ms
3-1 dark  fps 56  sim 0.17ms  render 1.83ms  upload 0.08ms
3-1 lit   fps 59  sim 0.17ms  render 1.83ms  upload 0.07ms
3-3 dark  fps 57  sim 0.18ms  render 2.41ms  upload 0.08ms
3-3 lit   fps 59  sim 0.15ms  render 2.61ms  upload 0.07ms (render ~2–4 ms CPU/frame).
- Known bugs / unverified:
  - Not yet played by a human with a keyboard: feel, prompts and the audio mix need a real playtest.
  - FPS in headless-GPU Chrome on this AMD iGPU was 44–58; needs checking in a real browser (half-res comic fallback not built yet).
- Open decisions (for humans to confirm):
  - **rooms.ts was not in the repo**, so 1-1 was taken from the style target and 1-2…4-1 were authored from §8.2 and validated. If Shaurya has the real file, swap it in and run > bijli@0.0.1 validate-levels
> tsx scripts/validate-levels.ts

✓ 1-1 First Light
✓ 1-2 The Flash
✓ 1-3 The Live Line
✓ 2-1 Taar-Naag
✓ 2-2 Rooftop Rails
✓ 2-3 Chinni's Drawing
✓ 3-1 Underpass
✓ 3-2 Strikes
✓ 3-3 Substation
✓ 4-1 Ghar
10 room(s) checked, 0 failed.
Unknown command: "test"


Did you mean this?
  npm test # Test a package
To see a list of supported npm commands, run:
  npm help.
  - Collision is custom AABB-vs-grid in RoomSim (as in the prototype), not a Phaser Tilemap/Arcade layer: one code path, testable headlessly.
  - Hero is the procedural canvas rig (prototype rig + grind/hurt/celebrate poses), drawn per frame, instead of SVG frames baked at boot.
  - Panel masking uses canvas clip paths (quad ∩ sweep) instead of  (same result, fewer full-screen composites).
  - Room 3-3 also has an  (gated like 4-1) so every map keeps ≥ 1 exit; the chapter ends automatically after the skyline bloom.
  - At a rail's far end the hero auto-continues onto another grindable rail leaving the same pole top in the same direction (2-3).
  - Captions for 1-2…4-1 and every room's panel caption box were written by Claude in Chinni's voice; Shaurya please review.
  - Pole cells standing in water count as water (3-1 splice pole).
