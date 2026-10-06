// Every user-facing string lives here. Hero stays gender-neutral (no pronouns, "Crew 7") until FinaleScene.

export const TITLE = {
  name: 'BIJLI',
  start: 'press any key',
  flashNotice: 'contains lightning flashes',
  flashOn: 'press F to reduce flashing (now ON)',
  flashOff: 'press F to reduce flashing (now OFF)',
} as const;

export interface ChapterText {
  num: number;
  title: string;
  radio: string | null;
}

export const CHAPTERS: ChapterText[] = [
  { num: 1, title: 'Gali No. 4', radio: 'Crew 7, the whole feeder is down. Start at Gali 4. Over.' },
  { num: 2, title: 'The Bazaar', radio: 'Crew 7, bazaar lines snapped in the wind. Some are still live, watch your step. Over.' },
  { num: 3, title: 'The Storm', radio: 'Crew 7, substation is out. Kill the breaker before you touch a live line. Over.' },
  { num: 4, title: 'Ghar', radio: null },
];

/** Phone message after each chapter (from "Chinni"). */
export const PHONE = {
  sender: 'Chinni',
  messages: [
    'bijli the fridge is making the sad noise again',
    'are you scared of thunder? i am only a little',
    'the whole sky went yellow!! was that you??',
  ],
  continue: 'press any key',
} as const;

export const GAME_TEXT = {
  holdE: 'Hold E',
  /** Splice prompt on an isolated (dead) line, and on a line that is still live. */
  holdESafe: 'line is OFF ✓  hold E to fix',
  liveLine: 'LIVE! switch its breaker OFF first',
  pressE: 'E',
  tip: 'switch it off first!',
  twist: 'TWIST!',
  powered: 'BIJLI AA GAYI!',
  shock: 'KZZZT!',
  breaker: 'KA-CHUNK',
  boing: 'BOING!',
  poof: 'POOF',
  strike: 'KRAKOOM!',
  restored: 'DISTRICT RESTORED!',
  firstBloom: 'wherever bijli comes back, my comic comes alive!',
} as const;

export const PAUSE = {
  title: 'PAUSED',
  items: ['Resume', 'Restart room', 'Skip room', 'Mute', 'Reduce flashing'],
  on: 'on',
  off: 'off',
} as const;

export const FINALE = {
  caption: 'my amma is bijli.',
  endCard: [
    'Inspired by the linewomen of Telangana, who climb poles in the storm so the rest of us have light.',
    'Never touch a fallen wire. Call your local electricity helpline.',
  ],
} as const;

export const CREDITS = {
  title: 'BIJLI',
  team: 'Team Buggernaut',
  names: ['Hansika Grover · systems', 'Navya Upadhyay · look & sound', 'Shaurya Chandel · levels, story, art pages'],
  jam: "made in 4 days at TGC Game Jam, Infinium '26",
  engine: 'made with Phaser 3',
  restart: 'press any key to play again',
} as const;

export const SAFETY_NOTE = FINALE.endCard[1];

/** First-time hint cards: shown once per run, the first time a room contains the thing. Short, with the key. */
export const HINTS: Record<string, { title: string; text: string }> = {
  move: { title: 'CREW 7', text: 'A / D to walk · Space to jump · find the broken cable and fix it' },
  splice: { title: 'BROKEN CABLE', text: 'the feeder is switched off, so this line is dead and safe. climb up (W) and hold E to twist it' },
  breaker: { title: 'LIVE LINE', text: 'sparks mean this cable is still live. tap E at its breaker: OFF, splice, then ON again' },
  rail: { title: 'LIVE WIRE RAIL', text: 'a powered, lit wire is a rail. stand on the pole top and walk toward the other pole' },
  snake: { title: 'TAAR-NAAG', text: 'a fallen live wire kills in the dark. light it up and it becomes a snake you can bounce on' },
  drawing: { title: "CHINNI'S DRAWING", text: 'optional! grab it to become BIJLI for 8 s: double jump · hold Space to glide with the cape · ride ANY wire · nothing can hurt you' },
  water: { title: 'FLOODED', text: 'water is deadly while its breaker is ON. switch it OFF before you wade in' },
  strike: { title: 'LIGHTNING STRIKES', text: 'watch the glow on the ground. it strikes when the ring closes, then waits. move between strikes' },
  dragon: { title: 'STORM DRAGON', text: 'optional! Chinni draws the storm dragon asleep: no strikes, no lightning for 8 s' },
  lives: { title: 'HELMETS', text: '3 helmets per chapter. lose them all and this street resets. splices you made stay when you lose one' },
};

/** The live objective line (top right). */
export const OBJECTIVE = {
  splice: 'fix the broken cable (hold E)',
  breakerOff: 'switch its breaker OFF first (E)',
  waterOff: 'switch the breaker OFF before the water',
  breakerOn: 'switch the breaker back ON (E)',
  exit: 'head for the exit →',
  door: 'go home →',
  cross: 'get across. the drawing is optional',
  skyline: 'close the master breaker (E)',
} as const;

export const LIVES_TEXT = {
  lost: 'HELMET LOST',
  reset: 'out of helmets. the street resets.',
} as const;
