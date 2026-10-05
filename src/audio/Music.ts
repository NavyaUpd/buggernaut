// Procedural music (§11): one 4-bar loop at 96 BPM in D minor, two layers, plus the two finale modes.
// Lookahead scheduler: a 25 ms setInterval schedules every 16th-note step that falls within the next 0.12 s
// of AudioContext time, so timing stays tight even when the main thread hitches.
import type { MusicMode } from './api';
import type { Engine } from './Engine';

const BPM = 96;
const STEP = 60 / BPM / 4; // one 16th note
const BAR = STEP * 16;
const LOOKAHEAD = 0.12;
const INTERVAL_MS = 25;
/** setTargetAtTime time constant: reaches ~95% of the target in 250 ms. */
const LIGHT_TAU = 0.25 / 3;

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

type Chord = { root: number; notes: number[] };
type Pattern = Record<number, number>; // 16th step in bar → midi note

// Dark layer chords: Dm · Bb · F · C (one per bar).
const MINOR_CHORDS: Chord[] = [
  { root: 38, notes: [50, 53, 57] }, // D3 F3 A3
  { root: 34, notes: [46, 50, 53] }, // Bb2 D3 F3
  { root: 41, notes: [53, 57, 60] }, // F3 A3 C4
  { root: 36, notes: [48, 52, 55] }, // C3 E3 G3
];
// Light layer plucks, D minor pentatonic (D F G A C). Bar 0 carries the BIJLI motif instead.
const PLUCKS: Pattern[] = [
  {},
  { 0: 74, 3: 65, 6: 62, 8: 65, 11: 67, 14: 69 },
  { 0: 72, 3: 69, 6: 65, 8: 69, 10: 72, 14: 77 },
  { 0: 67, 3: 72, 6: 67, 8: 69, 10: 72, 14: 74 },
];
/** Soft low answer under the motif on every other cycle, for variety. */
const UNDER_MOTIF: Pattern = { 2: 62, 6: 65, 10: 62, 14: 69 };
/** The BIJLI motif: D A G F. */
const MOTIF: Pattern = { 0: 74, 4: 81, 8: 79, 12: 77 };

// Finale, D major, played once.
const MAJOR_CHORDS: Chord[] = [
  { root: 38, notes: [50, 54, 57] }, // D
  { root: 43, notes: [55, 59, 62] }, // G
  { root: 45, notes: [57, 61, 64] }, // A
  { root: 38, notes: [50, 54, 57] }, // D
  { root: 38, notes: [50, 54, 57, 62] }, // D (final, long)
];
const MAJOR_PLUCKS: Pattern[] = [
  { 0: 69, 4: 66, 8: 74, 12: 69 },
  { 0: 71, 4: 74, 8: 71, 12: 67 },
  { 0: 76, 4: 73, 8: 69, 12: 73 },
  { 0: 74, 4: 81, 8: 79, 12: 78 }, // the motif, resolved: D A G F#
  { 0: 74 },
];
const MAJOR_STEPS = MAJOR_PLUCKS.length * 16;

const PLAYING_MODES = ['game', 'finaleMotif', 'finaleMajor'] as const;
type PlayMode = (typeof PLAYING_MODES)[number];

export class Music {
  private mode: MusicMode = 'off';
  private light = 0;
  private bijli = false;
  private lastLight = -1;
  private ready = false;

  private step = 0;
  private nextT = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startStep: Record<PlayMode, number> = { game: 0, finaleMotif: 0, finaleMajor: 0 };
  private fadeUntil: Record<PlayMode, number> = { game: 0, finaleMotif: 0, finaleMajor: 0 };

  // Graph (built once the engine has a context).
  private modeGains!: Record<PlayMode, GainNode[]>;
  private dark!: AudioNode; // pad lowpass input (dark layer)
  private lightG!: GainNode; // light layer, gain follows setLight()
  private lightWet!: AudioNode; // light layer through the echo
  private motifIn!: AudioNode;
  private majorIn!: AudioNode;
  private majorPad!: AudioNode;

  constructor(private readonly e: Engine) {
    e.onReady(() => this.init());
  }

  private init(): void {
    const ac = this.e.ctx;
    if (!ac || this.ready) return;
    const out = this.e.musicBus;
    const gain = (v: number, dest: AudioNode) => {
      const g = ac.createGain();
      g.gain.value = v;
      g.connect(dest);
      return g;
    };
    /** Dotted-8th feedback echo whose dry + wet both land in `dest`. Returns the input. */
    const echo = (dest: AudioNode, wet: number) => {
      const input = ac.createGain();
      input.connect(dest);
      const d = ac.createDelay(1);
      d.delayTime.value = STEP * 3;
      const fb = ac.createGain();
      fb.gain.value = 0.3;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2200;
      input.connect(d);
      d.connect(lp).connect(fb).connect(d);
      lp.connect(gain(wet, dest));
      return input;
    };

    const on = (m: PlayMode) => (this.mode === m ? 1 : 0);

    // Dark layer: everything through a 600 Hz lowpass with a slow wobble.
    const darkMode = gain(on('game'), out);
    const padLP = ac.createBiquadFilter();
    padLP.type = 'lowpass';
    padLP.frequency.value = 600;
    padLP.Q.value = 0.8;
    padLP.connect(gain(0.9, darkMode));
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoG = ac.createGain();
    lfoG.gain.value = 110;
    lfo.connect(lfoG);
    lfoG.connect(padLP.frequency);
    lfo.start();
    this.dark = padLP;

    // Light layer.
    const lightMode = gain(on('game'), out);
    this.lightG = gain(0, lightMode);
    this.lastLight = -1;
    this.lightWet = echo(this.lightG, 0.22);

    // Finale modes.
    const motifG = gain(on('finaleMotif'), out);
    this.motifIn = echo(motifG, 0.3);
    const majorG = gain(on('finaleMajor'), out);
    this.majorIn = echo(majorG, 0.25);
    const majorLP = ac.createBiquadFilter();
    majorLP.type = 'lowpass';
    majorLP.frequency.value = 1300;
    majorLP.connect(majorG);
    this.majorPad = majorLP;

    this.modeGains = { game: [darkMode, lightMode], finaleMotif: [motifG], finaleMajor: [majorG] };
    this.ready = true;
    this.applyLight();
    this.nextT = ac.currentTime + 0.05;
    this.timer = setInterval(this.tick, INTERVAL_MS);
  }

  // ---------------------------------------------------------------- controls

  setMode(mode: MusicMode, fadeSec = 1): void {
    if (mode === this.mode) return;
    const prev = this.mode;
    this.mode = mode;
    if (mode !== 'off') this.startStep[mode] = this.step;
    const ac = this.e.ctx;
    if (!ac || !this.ready) return;
    const t = ac.currentTime;
    const fade = Math.max(0.02, Number.isFinite(fadeSec) ? fadeSec : 1);
    const ramp = (g: GainNode, v: number) => {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(v, t + fade);
    };
    if (prev !== 'off') {
      for (const g of this.modeGains[prev]) ramp(g, 0);
      this.fadeUntil[prev] = t + fade;
    }
    if (mode !== 'off') {
      for (const g of this.modeGains[mode]) ramp(g, 1);
      this.fadeUntil[mode] = 0;
    }
  }

  setLight(v: number): void {
    this.light = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
    this.applyLight();
  }

  setBijli(on: boolean): void {
    this.bijli = on;
    this.applyLight();
  }

  private applyLight(): void {
    const ac = this.e.ctx;
    if (!ac || !this.ready) return;
    const target = this.bijli ? 1 : this.light;
    if (Math.abs(target - this.lastLight) < 0.01) return;
    this.lastLight = target;
    this.lightG.gain.setTargetAtTime(target, ac.currentTime, LIGHT_TAU);
  }

  // ---------------------------------------------------------------- scheduler

  private tick = (): void => {
    const ac = this.e.ctx;
    if (!ac) return;
    try {
      const now = ac.currentTime;
      if (this.nextT < now - 0.25) this.nextT = now + 0.03; // tab was throttled: skip, don't burst
      while (this.nextT < now + LOOKAHEAD) {
        this.scheduleStep(this.nextT);
        this.nextT += STEP;
        this.step++;
      }
    } catch {
      /* never throw from the timer */
    }
  };

  private scheduleStep(t: number): void {
    for (const m of PLAYING_MODES) {
      if (m !== this.mode && t >= this.fadeUntil[m]) continue;
      const rel = this.step - this.startStep[m];
      if (rel < 0) continue;
      if (m === 'game') this.playGame(rel, t);
      else if (m === 'finaleMotif') this.playMotif(rel, t);
      else this.playMajor(rel, t);
    }
  }

  private playGame(rel: number, t: number): void {
    const pos = rel % 16;
    const bar = Math.floor(rel / 16) % 4;
    const cycle = Math.floor(rel / 64);
    const chord = MINOR_CHORDS[bar]!;
    // Dark: pad on the bar, soft root pulse on every beat.
    if (pos === 0) {
      this.pad(chord.notes, t, BAR, 1.0, 'sawtooth', 0.022, 8, this.dark);
      this.pad([chord.root], t, BAR, 1.0, 'sawtooth', 0.03, 5, this.dark);
    }
    if (pos % 4 === 0) {
      const o = this.e.osc('triangle', hz(chord.root + 12), t, 0.4);
      o.connect(this.e.env(t, pos === 0 ? 0.11 : 0.07, 0.012, 0.36, this.dark));
    }
    // Light: dhol, plucks, motif.
    if (pos === 0 || pos === 8) this.kick(t, this.lightG);
    if (pos === 6 || pos === 14) this.slap(t, this.lightG);
    if (bar === 0) {
      const m = MOTIF[pos];
      if (m !== undefined) this.bell(m, t, pos === 12 ? 1.4 : 0.8, 0.075, this.lightWet);
      const u = cycle % 2 === 1 ? UNDER_MOTIF[pos] : undefined;
      if (u !== undefined) this.pluck(u, t, 0.35, 0.04, this.lightWet);
    } else {
      const p = PLUCKS[bar]![pos];
      if (p !== undefined) this.pluck(p, t, 0.45, pos % 8 === 0 ? 0.075 : 0.06, this.lightWet);
    }
  }

  private playMotif(rel: number, t: number): void {
    const pos = rel % 64; // motif over 2 bars, then 2 bars of silence
    const notes: Pattern = { 0: 62, 8: 69, 16: 67, 24: 65 };
    const n = notes[pos];
    if (n !== undefined) this.bell(n, t, pos === 24 ? 3 : 2.2, 0.07, this.motifIn);
  }

  private playMajor(rel: number, t: number): void {
    if (rel >= MAJOR_STEPS) return; // plays once
    const pos = rel % 16;
    const bar = Math.floor(rel / 16);
    const last = bar === MAJOR_PLUCKS.length - 1;
    if (pos === 0) {
      const c = MAJOR_CHORDS[bar]!;
      this.pad(c.notes, t, BAR, last ? 4 : 1.2, 'triangle', 0.035, 6, this.majorPad, 1.0);
      this.pad([c.root + 12], t, BAR, last ? 4 : 1.2, 'sine', 0.05, 0, this.majorPad, 1.0);
    }
    const p = MAJOR_PLUCKS[bar]![pos];
    if (p === undefined) return;
    if (bar === 3) this.bell(p, t, pos === 12 ? 1.6 : 0.9, 0.07, this.majorIn);
    else this.pluck(p, t, last ? 3 : 0.9, 0.065, this.majorIn);
  }

  // ---------------------------------------------------------------- voices

  /** Sustained chord: two detuned oscillators per note, slow attack, release after `dur`. */
  private pad(
    notes: number[],
    t: number,
    dur: number,
    rel: number,
    type: OscillatorType,
    v: number,
    cents: number,
    dest: AudioNode,
    atk = 0.8,
  ): void {
    const ac = this.e.ctx!;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + atk);
    g.gain.setValueAtTime(v, t + dur - 0.1);
    g.gain.linearRampToValueAtTime(0, t + dur + rel);
    g.connect(dest);
    for (const n of notes) {
      for (const c of cents ? [-cents, cents] : [0]) {
        this.e.osc(type, hz(n), t, dur + rel, c).connect(g);
      }
    }
  }

  /** Plucked string-ish note: triangle + a little square, through a closing lowpass. */
  private pluck(n: number, t: number, decay: number, v: number, dest: AudioNode): void {
    const f = hz(n);
    const lp = this.e.filter('lowpass', 3600, 1.2);
    lp.frequency.setValueAtTime(3600, t);
    lp.frequency.exponentialRampToValueAtTime(600, t + decay);
    lp.connect(this.e.env(t, v, 0.004, decay, dest));
    this.e.osc('triangle', f, t, decay + 0.01).connect(lp);
    const sq = this.e.osc('square', f, t, decay + 0.01, 4);
    const sg = this.e.ctx!.createGain();
    sg.gain.value = 0.22;
    sq.connect(sg).connect(lp);
  }

  /** Bell-pluck for the BIJLI motif: sine + octave + triangle, longer ring. */
  private bell(n: number, t: number, decay: number, v: number, dest: AudioNode): void {
    const f = hz(n);
    const g = this.e.env(t, v, 0.006, decay, dest);
    this.e.osc('triangle', f, t, decay + 0.01).connect(g);
    const o2 = this.e.osc('sine', f * 2, t, decay * 0.6);
    o2.connect(this.e.env(t, v * 0.35, 0.004, decay * 0.5, dest));
  }

  /** Dhol bass side ("dha"). */
  private kick(t: number, dest: AudioNode): void {
    this.e.blip(120, 48, 'sine', 0.3, 0.002, 0.24, t, dest, 0.12);
    this.e.burst(this.e.white, 'lowpass', 1400, 1400, 0.7, 0.05, 0.001, 0.02, t, dest);
  }

  /** Dhol treble side slap ("ta"). */
  private slap(t: number, dest: AudioNode): void {
    this.e.burst(this.e.white, 'bandpass', 2300, 1500, 1.4, 0.13, 0.001, 0.07, t, dest);
    this.e.blip(480, 330, 'triangle', 0.06, 0.001, 0.07, t, dest);
  }

  /** Stop the scheduler (not used by the game; for completeness / HMR). */
  dispose(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }
}
