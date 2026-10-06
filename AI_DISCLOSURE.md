# AI disclosure

BIJLI was made with the help of AI. This page says exactly where. The same summary goes on the itch.io page.

## Tools

- **Claude Code** (Anthropic), a coding assistant that runs in the terminal and edits the repository.
- **Claude** (Anthropic, claude.ai), used for the pre-submission review, for balancing and level suggestions and for drafting
  documentation, in a chat/project session that has no direct access to our submission.

No image, music or sound generators were used. No third-party art, audio or fonts were imported.

## What the AI wrote

- **Code**: project scaffold, the room simulation (`src/game/RoomSim.ts`), collision and movement, the circuit rules,
  the level validator (`src/core/reach.ts`, `scripts/validate-levels.ts`), the headless bot tests in `tests/` and the
  Playwright smoke test in `e2e/`.
- **Rendering and audio code**: the canvas renderer that turns lit areas into Chinni's comic, the procedural crayon art
  (all drawn in code, no image files) and the procedural WebAudio sound.
- **Level data**: first drafts of the room maps in `src/levels/rooms.ts`, checked by the validator and by the bot tests.
- **Late changes on 6 Oct 2026** (each one is a separate commit marked "AI-assisted"): the first-time controls hints
  and the key-cap row on the chapter 1 card, lighter darkness, the 60 fps cap, the P pause key, the BIJLI end-of-timer
  flash, extra snakes in rooms 2-2, 2-3 and 3-2, the new hospital room (3-2b) and this documentation.
- **Playtest round on 6 Oct 2026, afternoon** (commit "playtest round" and after): the opening story comic, optional
  routes in 2-3 and 3-3 so power-ups are never required, the cape glide, the storm-dragon drawing, slower strike timing,
  3 helmets per chapter, per-lamp neighbour reactions and story beats, first-time hint cards, the objective line, the
  exit arrow, the "line is OFF" splice prompt, and the rewritten README. These were built from the team's playtest notes.

## What the team did

- **Concept and proposal**: the game idea, the three-theme mapping (Comic, Twist, Light), the story, the twist and the
  characters (Chinni, Amma, the unnamed lineworker).
- **Design direction**: the design document and every decision in it, the level list and the order of the story, the
  wording of captions and radio lines, what to cut and what to keep.
- **Review and decisions**: reading the AI's changes, choosing which suggestions to accept, and committing and
  submitting the game.
- **Testing**: playing the full game end to end and writing a playtest feedback list (difficulty curve, optional
  power-ups, story clarity, onboarding, a storm-room bug report). The final round of changes was built from that list,
  and the team played the final build before submitting.

## How we kept it honest

- All art is generated in code and all audio is synthesised at runtime, so there are no external assets to license.
- The level validator and bot tests were written so that every room is checked for solvability, and the exit being
  unreachable in the dark, instead of trusting the AI's level drawings.
- Commit history: the first large block of code was pushed on 6 Oct 2026 (early morning) from one local Claude Code
  session. Everything after that is in small, labelled commits. See the README's "How we built it".
