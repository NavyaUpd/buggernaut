# Credits

## Team Buggernaut

- Hansika Grover: systems
- Shaurya Chandel: levels & story
- Navya Upadhyay: look & sound

## Third-party libraries

| Library                     | Version | License | Use                   |
| --------------------------- | ------- | ------- | --------------------- |
| [Phaser](https://phaser.io) | 3.90.0  | MIT     | Game engine (runtime) |

Development-only tools (not shipped): Vite, TypeScript, Vitest, Playwright, ESLint, typescript-eslint, Prettier, tsx.

## Assets

None imported. All visuals are generated in code (SVG strings and procedural drawing); all audio is synthesised at
runtime with WebAudio.

## AI tools

- **Claude Code (Anthropic)**: coding assistant for scaffolding, systems code (room sim, validator, tests), the canvas
  renderer port, procedural audio, the procedural crayon art, and first drafts of the room maps (checked by the validator
  and bot tests). Late changes (hints, balance, extra snakes, the hospital room, docs) are separate commits marked
  "AI-assisted".
- **Claude (Anthropic, claude.ai)**: pre-submission review, balancing and level suggestions, documentation drafts.

The team designed the game, story and characters and directed and reviewed all of it. Full detail: [AI_DISCLOSURE.md](AI_DISCLOSURE.md).
No generative image, music or voice tools were used.
