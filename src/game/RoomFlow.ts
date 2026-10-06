// The fixed order of the whole game (§7). Scenes call `nextAfter(step)` to know where to go.
import type Phaser from 'phaser';
import { SCENES, type SceneKey } from '../scenes/keys';

export type Step =
  | { kind: 'intro' }
  | { kind: 'card'; chapter: number }
  | { kind: 'room'; roomId: string }
  | { kind: 'phone'; index: number }
  | { kind: 'finale' }
  | { kind: 'credits' };

export const FLOW: Step[] = [
  { kind: 'intro' },
  { kind: 'card', chapter: 1 },
  { kind: 'room', roomId: '1-1' },
  { kind: 'room', roomId: '1-2' },
  { kind: 'room', roomId: '1-3' },
  { kind: 'phone', index: 0 },
  { kind: 'card', chapter: 2 },
  { kind: 'room', roomId: '2-1' },
  { kind: 'room', roomId: '2-2' },
  { kind: 'room', roomId: '2-2b' },
  { kind: 'room', roomId: '2-3' },
  { kind: 'phone', index: 1 },
  { kind: 'card', chapter: 3 },
  { kind: 'room', roomId: '3-1' },
  { kind: 'room', roomId: '3-1b' },
  { kind: 'room', roomId: '3-2' },
  { kind: 'room', roomId: '3-2b' },
  { kind: 'room', roomId: '3-3' },
  { kind: 'phone', index: 2 },
  { kind: 'card', chapter: 4 },
  { kind: 'room', roomId: '4-1' },
  { kind: 'finale' },
  { kind: 'credits' },
];

function same(a: Step, b: Step): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function nextStep(cur: Step): Step | null {
  const i = FLOW.findIndex((s) => same(s, cur));
  return i >= 0 && i + 1 < FLOW.length ? FLOW[i + 1]! : null;
}

/** Last room of a chapter → the DISTRICT RESTORED! stamp plays before leaving. */
export function endsChapter(roomId: string): boolean {
  const next = nextStep({ kind: 'room', roomId });
  return next !== null && next.kind !== 'room';
}

export function sceneFor(step: Step): { key: SceneKey; data: object } {
  switch (step.kind) {
    case 'intro':
      return { key: SCENES.Intro, data: {} };
    case 'card':
      return { key: SCENES.ChapterCard, data: { chapter: step.chapter } };
    case 'room':
      return { key: SCENES.Room, data: { roomId: step.roomId } };
    case 'phone':
      return { key: SCENES.Phone, data: { index: step.index } };
    case 'finale':
      return { key: SCENES.Finale, data: {} };
    case 'credits':
      return { key: SCENES.Credits, data: {} };
  }
}

/** Start the scene that follows `cur` (wraps to the title after credits). */
export function goNext(scene: Phaser.Scene, cur: Step): void {
  const nxt = nextStep(cur);
  if (!nxt) {
    scene.scene.start(SCENES.Title);
    return;
  }
  const { key, data } = sceneFor(nxt);
  scene.scene.start(key, data);
}
