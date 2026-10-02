# BIJLI

**BIJLI** is a monsoon-night platformer about the people who bring the light back. Climb poles, splice live cables
and dodge lightning as a lineworker. Wherever you restore the light, the city turns into a child's comic book,
with crayon clouds to stand on, wires to grind and storm hazards turned into cartoons. One storm, one long night home.

_Bijli_ means both **electricity** and **lightning** in Hindi.

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
| Pause / Restart | Esc / R                                              |

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

This project was built with the help of Claude Code (Anthropic) as a coding assistant. All art is generated in code
(SVG/procedural) and all audio is procedural WebAudio. Details in [CREDITS.md](CREDITS.md).

## License

MIT, see [LICENSE](LICENSE).
