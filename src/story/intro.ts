// Opening story: five comic panels that set up who, why and what before chapter 1 (IntroScene).
// Rules: the hero is only ever "Crew 7" (no pronouns, no face). Chinni's own words are lowercase handwriting.

export type IntroArt = 'storm' | 'dark' | 'crew' | 'safety' | 'chinni';

export interface IntroLine {
  text: string;
  /** 'caption' = plain comic caption box lettering; 'chinni' = her crayon handwriting. */
  voice: 'caption' | 'chinni';
}

export interface IntroPanel {
  art: IntroArt;
  lines: IntroLine[];
}

export const INTRO_PANELS: IntroPanel[] = [
  {
    art: 'storm',
    lines: [
      { text: 'Monsoon night.', voice: 'caption' },
      { text: "The storm has snapped the city's power lines.", voice: 'caption' },
    ],
  },
  {
    art: 'dark',
    lines: [
      { text: 'The whole city is dark.', voice: 'caption' },
      { text: 'The hospital runs on its backup. Families wait by candlelight.', voice: 'caption' },
    ],
  },
  {
    art: 'crew',
    lines: [
      { text: 'Crew 7 is a lineworker.', voice: 'caption' },
      { text: 'The job: isolate the line, repair it, bring the light back. One street at a time.', voice: 'caption' },
    ],
  },
  {
    art: 'safety',
    lines: [
      { text: 'Rule one: a line is only touched when it is switched OFF.', voice: 'caption' },
      { text: 'If it sparks, find its breaker first.', voice: 'caption' },
    ],
  },
  {
    art: 'chinni',
    lines: [
      { text: 'At home, Chinni is drawing a comic about Crew 7.', voice: 'caption' },
      { text: 'wherever the light comes back, my comic comes alive and helps!', voice: 'chinni' },
    ],
  },
];

/** Words drawn inside the panel art (signs and labels). */
export const INTRO_ART_LABELS = {
  krak: 'KRAK!',
  kzzt: 'KZZT!',
  hospital: 'HOSPITAL',
  backup: 'backup',
  crew: 'crew 7',
  step1: 'sparks?',
  step2: 'switch OFF',
  step3: 'fixed? ON!',
  off: 'OFF',
  on: 'ON',
  comic: 'BIJLI',
} as const;

/** Small hints on the intro screen. */
export const INTRO_UI = {
  next: 'press any key',
  skip: 'esc: skip',
} as const;
