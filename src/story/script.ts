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
  items: ['Resume', 'Restart room', 'Skip room', 'Mute', 'Reduce flashing', 'How to play'],
  on: 'on',
  off: 'off',
  helpTitle: 'HOW TO PLAY',
  helpEmpty: 'nothing yet. hints appear as you meet new things.',
  helpBack: 'press any key to go back',
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

/**
 * First-time hint cards: one line, 10 words or fewer (tests enforce it). Each shows once per run, the first time the
 * player comes near the thing it explains; the pause menu's "How to play" lists the ones seen so far.
 */
export const HINTS: Record<string, { title: string; text: string }> = {
  move: { title: 'CREW 7', text: 'walk with A and D, jump with Space' },
  splice: { title: 'BROKEN CABLE', text: 'line is off. climb with W, hold E to fix' },
  breaker: { title: 'LIVE LINE', text: 'sparks mean live. switch its breaker OFF with E first' },
  rail: { title: 'LIVE WIRE RAIL', text: 'a lit, powered wire is a rail. walk onto it' },
  snake: { title: 'TAAR-NAAG', text: "kills in the dark. lit up, it's a jump pad" },
  drawing: { title: "CHINNI'S DRAWING", text: 'optional: 8 s of BIJLI. double jump, glide, ride wires' },
  water: { title: 'FLOODED', text: 'water kills while its breaker is ON. switch it OFF' },
  strike: { title: 'LIGHTNING STRIKES', text: 'watch the glow. cross after it strikes, before it glows' },
  dragon: { title: 'STORM DRAGON', text: 'optional: the storm sleeps for 8 s. no strikes' },
  lives: { title: 'HELMETS', text: 'a fall costs a helmet and your unfinished repair' },
  timer: { title: 'BACKUP POWER', text: 'the backup is running out. restore both lines in time' },
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
  reset: 'out of helmets. this street starts over.',
} as const;
