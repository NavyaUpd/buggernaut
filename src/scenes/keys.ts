export const SCENES = {
  Boot: 'Boot',
  Title: 'Title',
  Level: 'Level',
  Interstitial: 'Interstitial',
  Finale: 'Finale',
  Credits: 'Credits',
  Pause: 'Pause',
  UI: 'UI',
} as const;

export type SceneKey = (typeof SCENES)[keyof typeof SCENES];
