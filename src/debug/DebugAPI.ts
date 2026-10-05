import type Phaser from 'phaser';
import type { RoomSim } from '../game/RoomSim';
import type { SceneKey } from '../scenes/keys';
import { perf, type RoomScene } from '../scenes/RoomScene';

/** window.__bijli: used by Playwright and for quick room jumps from the console. */
export interface BijliDebug {
  game: Phaser.Game;
  ready: boolean;
  activeScenes(): string[];
  goto(key: SceneKey, data?: object): void;
  room(id: string): void;
  sim(): RoomSim | null;
  powerAll(): void;
  perf: typeof perf;
}

declare global {
  interface Window {
    __bijli?: BijliDebug;
  }
}

export function installDebugAPI(game: Phaser.Game): void {
  const roomScene = () => {
    const s = game.scene.getScene('Room') as RoomScene | null;
    return s && s.scene.isActive() ? s : null;
  };
  const api: BijliDebug = {
    game,
    ready: false,
    activeScenes: () => game.scene.getScenes(true).map((s) => s.scene.key),
    goto: (key, data) => {
      for (const s of game.scene.getScenes(true)) game.scene.stop(s.scene.key);
      game.scene.start(key, data);
    },
    room: (id) => api.goto('Room', { roomId: id }),
    sim: () => roomScene()?.sim ?? null,
    powerAll: () => roomScene()?.sim.debugPowerAll(),
    perf,
  };
  game.events.once('ready', () => {
    api.ready = true;
  });
  window.__bijli = api;
}
