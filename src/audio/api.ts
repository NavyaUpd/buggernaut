// The audio contract used by every scene (§11). Implemented in Engine.ts / Music.ts / Sfx.ts, exported from index.ts.
// All methods must be safe to call before start() (they no-op until the AudioContext exists).

export type MusicMode =
  | 'off'
  | 'game' // dark layer always on, light layer gain follows setLight()
  | 'finaleMotif' // single plucked BIJLI motif, nothing else
  | 'finaleMajor'; // light layer returns once, slow, D major

export interface SfxAPI {
  jump(): void;
  land(): void;
  step(): void;
  climbTick(): void;
  twist(beat: 1 | 2 | 3): void; // metallic creak, pitch per beat
  twistStamp(): void; // TWIST! ink stamp thump
  shock(): void; // KZZZT
  breaker(closed: boolean): void; // KA-CHUNK (+ short hum up / down)
  pulse(): void; // power pulse travelling along a wire
  lampBuzz(): void; // one flicker buzz of a lamp coming on
  penScratch(): void; // Chinni's pen ruling the panel
  chime(): void; // lamp bloom: major triad quick arpeggio
  boing(): void;
  bijliPickup(): void; // stinger
  tick(): void; // BIJLI last-2-seconds tick
  poof(): void; // BIJLI ends
  strikeTelegraph(): void; // soft rising crackle at strike telegraph start
  strike(): void; // KRAKOOM crack
  rumble(): void; // distant low rumble (ambient lightning telegraph)
  thunder(): void; // brown noise, long lowpass tail
  respawn(): void; // whoosh
  slide(): void; // panel slide
  woof(): void; // the street dog waking up
  restored(): void; // DISTRICT RESTORED! fanfare
  ui(): void; // menu blip
}

export interface AudioAPI {
  /** Create/resume the AudioContext. Call on the first key press. Idempotent. */
  start(): void;
  readonly started: boolean;
  setMuted(m: boolean): void;
  /** Light mask value at the player's feet, 0..1. Engine smooths it over 250 ms into the light-layer gain. */
  setLight(v: number): void;
  /** BIJLI mode on/off: on = light layer full gain + pickup stinger handled by sfx.bijliPickup(). */
  setBijli(on: boolean): void;
  /** Rain bed level 0..1 (default 1). `fadeSec` ramps to it. */
  setRain(v: number, fadeSec?: number): void;
  setMusic(mode: MusicMode, fadeSec?: number): void;
  /** 50 Hz mains hum near live wires / live water, 0..1. */
  setHum(v: number): void;
  /** Grind crackle loop while on a rail. */
  setGrind(on: boolean): void;
  /** Finale ambience: ceiling-fan whirr + dripping water. */
  setFan(on: boolean): void;
  readonly sfx: SfxAPI;
}
