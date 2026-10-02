import type Phaser from 'phaser';
import type { SceneKey } from '../scenes/keys';

/** window.__bijli — used by Playwright and for dev level-select / god mode (F1). */
export interface BijliDebug {
  game: Phaser.Game;
  ready: boolean;
  activeScenes(): string[];
  goto(key: SceneKey, data?: object): void;
}

declare global {
  interface Window {
    __bijli?: BijliDebug;
  }
}

export function installDebugAPI(game: Phaser.Game): void {
  const api: BijliDebug = {
    game,
    ready: false,
    activeScenes: () => game.scene.getScenes(true).map((s) => s.scene.key),
    goto: (key, data) => {
      for (const s of game.scene.getScenes(true)) game.scene.stop(s.scene.key);
      game.scene.start(key, data);
    },
  };
  game.events.once('ready', () => {
    api.ready = true;
  });
  window.__bijli = api;
}
