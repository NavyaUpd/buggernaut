// Every user-facing string lives here (CLAUDE.md §17). Hero stays gender-neutral until FinaleScene (§3.7, §11.1).

export const TITLE = {
  name: 'BIJLI',
  start: 'click or press any key',
  flashNotice: 'Contains lightning flashes. "Reduce flashing" is in Settings.',
} as const;

export const LEVEL_CAPTIONS: Record<string, string> = {
  L1: 'Tonight the whole city went dark. Except BIJLI.',
};

export const SAFETY_NOTE = 'Never touch a fallen wire. Call your local electricity helpline.';
