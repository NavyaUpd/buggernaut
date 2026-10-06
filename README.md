# BIJLI

**BIJLI** is a monsoon-night platformer about the people who bring the light back. Climb poles, splice live cables
and dodge lightning as a lineworker. Wherever you restore the light, the city turns into a child's comic book,
with crayon clouds to stand on, wires to grind and storm hazards turned into cartoons. One storm, one long night home.

_Bijli_ means both **electricity** and **lightning** in Hindi.

**Play it in your browser: ITCH_LINK_HERE**

Made by **Team Buggernaut** (Hansika Grover, Shaurya Chandel, Navya Upadhyay) for the **TGC Game Jam @ Infinium '26**
(IIIT Hyderabad). Themes: **Comic · Twist · Light**.

## Play locally

```bash
npm install
npm run dev        # http://localhost:5173
```

## Controls

| Action          | Keys                                                 |
| --------------- | ---------------------------------------------------- |
| Move            | A / D or ← / →                                       |
| Jump            | Space (or W / ↑ when not on a pole)                  |
| Climb           | W / S on poles and ladders                           |
| Interact        | E (breakers, pickups) · **hold E** to splice a cable |
| Pause / Restart | Esc or P / R                                         |

## Rooms and the proposal

The proposal promised one stormy night in seven places. The game has four chapters and 11 single-screen rooms.
Our scripted test bots clear every room in about five minutes of play without a single mistake; a first-time human takes
longer. Here is how the rooms line up:

| Proposal level    | In the game                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| 1. The lane       | Chapter 1: 1-1 First Light, 1-2 The Flash, 1-3 The Live Line                                   |
| 2. The bazaar     | Chapter 2: 2-1 Taar-Naag (the snake), 2-2 Rooftop Rails, 2-3 Chinni's Drawing (BIJLI power-up) |
| 3. The underpass  | 3-1 Underpass (flooded road, breaker and live water)                                           |
| 4. The rooftops   | 3-2 Strikes (lightning columns); 2-2 Rooftop Rails also plays on the roofs                     |
| 5. The hospital   | 3-2b City Hospital (flooded basement, two circuits, lit ward windows)                          |
| 6. The substation | 3-3 Substation (master breaker and the skyline bloom)                                          |
| 7. Home           | 4-1 Ghar, then the finale                                                                      |

Differences from the proposal, stated plainly:

- The bazaar and rooftops are split across chapters 2 and 3 rather than one level each, and the lane is three rooms.
- **The substation is a puzzle room, not the "storm's fire dragon" boss fight** from the proposal. We chose to finish
  and polish the rooms rather than add a boss late in the jam. (If this changes before the final upload, this line will too.)
- The hospital is a short puzzle room, with no "backup timer".

## How we built it

- Phaser 3 + TypeScript + Vite. All art is drawn in code and all sound is synthesised, so the build has no asset files.
- We planned the game in a design document (`CLAUDE.md`), then built it with Claude Code as our coding assistant
  (see [AI_DISCLOSURE.md](AI_DISCLOSURE.md)). The main body of code was developed in a local Claude Code session and
  **pushed to this repository in one large block on 6 Oct 2026 (early morning)**, not commit by commit. Everything after
  that is in small commits, each labelled "AI-assisted" when Claude Code wrote it.
- Every room is checked by `npm run validate-levels` (solvable once powered, exit unreachable in the dark) and by
  headless bot playthroughs in `tests/`.

## Development

| Script                    | What it does                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `npm run dev`             | Vite dev server                                                                    |
| `npm run build`           | Typecheck + production build to `dist/` (runs from a zip; `base: './'`)            |
| `npm run test`            | Vitest unit tests (pure-TS `src/core/`)                                            |
| `npm run typecheck`       | `tsc --noEmit`                                                                     |
| `npm run lint`            | ESLint + Prettier check                                                            |
| `npm run validate-levels` | Checks every level is well-formed and solvable                                     |
| `npm run e2e`             | Playwright smoke test + screenshots (`npx playwright install chromium` once first) |

The design doc and build plan live in [CLAUDE.md](CLAUDE.md).

## Real-world inspiration

Inspired by the linewomen of Telangana. In May 2022, Babburi Sirisha from Siddipet district became the first woman
appointed junior lineman at TSSPDCL after clearing the pole-climbing test, and Telangana Transco had earlier recruited
about 200 linewomen. The hero of this game is fictional.

**Never touch a fallen wire. Call your local electricity helpline.**

## AI usage

Claude Code (Anthropic) wrote most of the code and drafted the room maps; the team designed the game, story and
characters, directed every change, and tested it. All art is generated in code and all audio is procedural WebAudio.
Full, honest details in [AI_DISCLOSURE.md](AI_DISCLOSURE.md) and [CREDITS.md](CREDITS.md).

## License

MIT, see [LICENSE](LICENSE).
