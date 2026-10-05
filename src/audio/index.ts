// The game's single audio instance (§11). Every method is safe before start() and never throws.
import type { AudioAPI, MusicMode } from './api';
import { Engine } from './Engine';
import { Music } from './Music';
import { Sfx } from './Sfx';

const engine = new Engine();
const music = new Music(engine);
const sfx = new Sfx(engine);

const safe = (fn: () => void): void => {
  try {
    fn();
  } catch {
    /* audio must never break the game */
  }
};

export const audio: AudioAPI = {
  start: () => safe(() => engine.start()),
  get started() {
    return engine.started;
  },
  setMuted: (m: boolean) => safe(() => engine.setMuted(m)),
  setLight: (v: number) => safe(() => music.setLight(v)),
  setBijli: (on: boolean) => safe(() => music.setBijli(on)),
  setRain: (v: number, fadeSec?: number) => safe(() => engine.setRain(v, fadeSec)),
  setMusic: (mode: MusicMode, fadeSec?: number) => safe(() => music.setMode(mode, fadeSec)),
  setHum: (v: number) => safe(() => engine.setHum(v)),
  setGrind: (on: boolean) => safe(() => engine.setGrind(on)),
  setFan: (on: boolean) => safe(() => engine.setFan(on)),
  sfx,
};

export type { AudioAPI, MusicMode, SfxAPI } from './api';
