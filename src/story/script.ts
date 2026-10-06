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
