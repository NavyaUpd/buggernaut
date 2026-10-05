// Procedural sound effects (§11). Every method is a no-op before start() and never throws.
import type { SfxAPI } from './api';
import { rnd, type Engine } from './Engine';

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export class Sfx implements SfxAPI {
  constructor(private readonly e: Engine) {}

  /** Run `fn` with the start time and the SFX bus, only if audio is running; swallow any error. */
  private p(fn: (t: number, out: AudioNode, e: Engine) => void): void {
    const ac = this.e.ctx;
    if (!ac) return;
    try {
      fn(ac.currentTime + 0.005, this.e.sfxBus, this.e);
    } catch {
      /* never throw from a sound */
    }
  }

  jump(): void {
    this.p((t, out, e) => {
      const f = rnd(290, 320);
      e.blip(f, f * 1.7, 'sine', 0.07, 0.004, 0.09, t, out);
      e.blip(f * 2, f * 3, 'triangle', 0.02, 0.004, 0.06, t, out);
    });
  }

  land(): void {
    this.p((t, out, e) => {
      e.blip(130, 55, 'sine', 0.16, 0.002, 0.11, t, out);
      e.burst(e.brown, 'lowpass', 500, 200, 0.7, 0.16, 0.002, 0.09, t, out);
      e.burst(e.white, 'bandpass', 1600, 900, 1.2, 0.035, 0.002, 0.07, t, out); // wet splat
    });
  }

  step(): void {
    this.p((t, out, e) => {
      e.burst(e.white, 'bandpass', rnd(900, 1500), rnd(500, 800), 1.6, rnd(0.025, 0.04), 0.003, 0.05, t, out);
      e.blip(rnd(85, 115), 60, 'triangle', 0.035, 0.002, 0.04, t, out);
    });
  }

  climbTick(): void {
    this.p((t, out, e) => {
      e.blip(rnd(1600, 2000), 1400, 'square', 0.012, 0.001, 0.02, t, out);
      e.burst(e.white, 'bandpass', 3200, 3200, 3, 0.03, 0.001, 0.025, t, out);
      e.blip(rnd(150, 180), 120, 'triangle', 0.03, 0.001, 0.03, t, out);
    });
  }

  twist(beat: 1 | 2 | 3): void {
    this.p((t, out, e) => {
      const f = beat === 1 ? 170 : beat === 2 ? 215 : 270;
      // Creak: saw with a wobbling bend through a narrow band.
      const o = e.osc('sawtooth', f, t, 0.22);
      o.frequency.linearRampToValueAtTime(f * 1.25, t + 0.08);
      o.frequency.linearRampToValueAtTime(f * 1.12, t + 0.2);
      const bp = e.filter('bandpass', f * 5, 6);
      o.connect(bp);
      bp.connect(e.env(t, 0.12, 0.01, 0.2, out));
      // Metal ring: inharmonic partials.
      e.blip(f * 5.4, f * 5.3, 'sine', 0.025, 0.002, 0.25, t, out);
      e.blip(f * 7.1, f * 7.0, 'sine', 0.018, 0.002, 0.2, t, out);
      // Copper grit.
      e.burst(e.white, 'bandpass', 2600, 3400, 2, 0.04, 0.005, 0.12, t, out);
    });
  }

  twistStamp(): void {
    this.p((t, out, e) => {
      e.blip(130, 45, 'sine', 0.32, 0.002, 0.2, t, out, 0.15);
      e.burst(e.brown, 'lowpass', 700, 250, 0.7, 0.28, 0.002, 0.14, t, out);
      e.burst(e.white, 'highpass', 2200, 2200, 0.7, 0.07, 0.001, 0.04, t, out); // paper slap
      e.blip(160, 110, 'sawtooth', 0.04, 0.003, 0.18, t, out); // the prototype's twist blip, underneath
    });
  }

  shock(): void {
    this.p((t, out, e) => {
      const ac = e.ctx!;
      const dur = 0.45;
      // Stutter gate: 0..1 square at ~32 Hz on a gain.
      const gate = ac.createGain();
      gate.gain.value = 0.5;
      const lfo = e.osc('square', 32, t, dur);
      const lfoG = ac.createGain();
      lfoG.gain.value = 0.5;
      lfo.connect(lfoG);
      lfoG.connect(gate.gain);
      gate.connect(e.env(t, 1, 0.003, dur, out));
      // Harsh buzz: two saws beating + a fizz of noise.
      const s1 = e.osc('sawtooth', 62, t, dur);
      const s2 = e.osc('sawtooth', 93.5, t, dur);
      s1.frequency.linearRampToValueAtTime(48, t + dur);
      const sg = ac.createGain();
      sg.gain.value = 0.11;
      s1.connect(sg);
      s2.connect(sg);
      sg.connect(gate);
      const n = e.noise(e.white, t, dur);
      const bp = e.filter('bandpass', 2500, 0.8);
      const ng = ac.createGain();
      ng.gain.value = 0.16;
      n.connect(bp).connect(ng).connect(gate);
      // Initial crack.
      e.burst(e.white, 'highpass', 1500, 1500, 0.7, 0.22, 0.001, 0.035, t, out);
    });
  }

  breaker(closed: boolean): void {
    this.p((t, out, e) => {
      // KA
      e.blip(190, 75, 'sine', 0.14, 0.001, 0.07, t, out);
      e.burst(e.white, 'bandpass', 900, 600, 1.5, 0.08, 0.001, 0.05, t, out);
      // CHUNK
      const t2 = t + 0.09;
      e.blip(115, 42, 'sine', 0.26, 0.001, 0.14, t2, out);
      e.burst(e.brown, 'lowpass', 600, 220, 0.7, 0.22, 0.001, 0.12, t2, out);
      e.blip(1300, 1100, 'square', 0.02, 0.001, 0.015, t2, out);
      // Hum up (closed) or down (open).
      const t3 = t + 0.15;
      const [f0, f1] = closed ? [40, 100] : [100, 40];
      const o = e.osc('sawtooth', f0, t3, 0.45);
      o.frequency.exponentialRampToValueAtTime(f1, t3 + 0.4);
      const lp = e.filter('lowpass', 500, 1);
      o.connect(lp);
      lp.connect(e.env(t3, 0.07, closed ? 0.12 : 0.01, closed ? 0.3 : 0.38, out));
    });
  }

  pulse(): void {
    this.p((t, out, e) => {
      const o = e.osc('sawtooth', 200, t, 0.32);
      o.frequency.exponentialRampToValueAtTime(1600, t + 0.3);
      const bp = e.filter('bandpass', 600, 2);
      bp.frequency.setValueAtTime(600, t);
      bp.frequency.exponentialRampToValueAtTime(3000, t + 0.3);
      o.connect(bp);
      bp.connect(e.env(t, 0.07, 0.2, 0.12, out));
      e.blip(400, 2400, 'sine', 0.03, 0.22, 0.1, t, out);
      e.burst(e.white, 'highpass', 4000, 4000, 0.7, 0.02, 0.2, 0.1, t, out);
    });
  }

  lampBuzz(): void {
    this.p((t, out, e) => {
      e.blip(100, 100, 'sawtooth', 0.05, 0.005, 0.07, t, out);
      e.blip(200, 200, 'square', 0.008, 0.005, 0.06, t, out);
    });
  }

  penScratch(): void {
    this.p((t, out, e) => {
      e.burst(e.white, 'bandpass', 2400 + Math.random() * 1500, 2400 + Math.random() * 1500, 2, 0.08, 0.01, 0.09, t, out);
    });
  }

  chime(): void {
    this.p((t, out, e) => {
      // F major triad + octave (all inside the D-minor pentatonic), quick arpeggio, triangle.
      [698.46, 880, 1046.5, 1396.91].forEach((f, i) => {
        const ti = t + i * 0.07;
        e.osc('triangle', f, ti, 1.2).connect(e.env(ti, 0.1, 0.02, 1.1, out));
      });
    });
  }

  boing(): void {
    this.p((t, out, e) => {
      const ac = e.ctx!;
      const o = e.osc('sine', 150, t, 0.5);
      o.frequency.exponentialRampToValueAtTime(560, t + 0.12);
      o.frequency.exponentialRampToValueAtTime(320, t + 0.45);
      const vib = e.osc('sine', 17, t, 0.5);
      const vg = ac.createGain();
      vg.gain.setValueAtTime(5, t);
      vg.gain.linearRampToValueAtTime(40, t + 0.4);
      vib.connect(vg);
      vg.connect(o.frequency);
      o.connect(e.env(t, 0.16, 0.005, 0.45, out));
      const o2 = e.osc('triangle', 300, t, 0.3);
      o2.frequency.exponentialRampToValueAtTime(1120, t + 0.12);
      o2.connect(e.env(t, 0.03, 0.005, 0.25, out));
    });
  }

  bijliPickup(): void {
    this.p((t, out, e) => {
      // Bright pentatonic run up two octaves.
      [62, 65, 67, 69, 72, 74, 77, 81].forEach((n, i) => {
        const ti = t + i * 0.045;
        e.blip(hz(n), hz(n), 'square', 0.025, 0.003, 0.16, ti, out);
        e.blip(hz(n), hz(n), 'triangle', 0.06, 0.003, 0.22, ti, out);
      });
      // Shimmer: high partials with tremolo.
      const ac = e.ctx!;
      const ts = t + 0.3;
      const trem = ac.createGain();
      trem.gain.value = 0.6;
      const lfo = e.osc('sine', 11, ts, 0.9);
      const lg = ac.createGain();
      lg.gain.value = 0.4;
      lfo.connect(lg);
      lg.connect(trem.gain);
      trem.connect(e.env(ts, 0.05, 0.05, 0.8, out));
      for (const f of [2349.3, 2793.8, 3520]) e.osc('sine', f, ts, 0.9).connect(trem);
      e.burst(e.white, 'highpass', 5000, 9000, 0.7, 0.04, 0.15, 0.5, t + 0.1, out);
      // Low punch.
      e.blip(150, 60, 'sine', 0.2, 0.002, 0.18, t, out);
    });
  }

  tick(): void {
    this.p((t, out, e) => {
      e.blip(1600, 1500, 'square', 0.03, 0.001, 0.025, t, out);
      e.blip(3200, 3200, 'sine', 0.02, 0.001, 0.015, t, out);
    });
  }

  poof(): void {
    this.p((t, out, e) => {
      e.burst(e.white, 'lowpass', 3500, 250, 0.8, 0.13, 0.01, 0.32, t, out);
      e.blip(420, 110, 'sine', 0.06, 0.005, 0.22, t, out);
    });
  }

  strikeTelegraph(): void {
    this.p((t, out, e) => {
      const ac = e.ctx!;
      const dur = 1.15;
      const n = e.noise(e.crackle, t, dur);
      const bp = e.filter('bandpass', 700, 1.2);
      bp.frequency.setValueAtTime(700, t);
      bp.frequency.exponentialRampToValueAtTime(3500, t + dur);
      n.connect(bp);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + dur - 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
      bp.connect(g).connect(out);
      const o = e.osc('sine', 70, t, dur);
      o.frequency.exponentialRampToValueAtTime(160, t + dur);
      const og = ac.createGain();
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.05, t + dur - 0.05);
      og.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
      o.connect(og).connect(out);
    });
  }

  strike(): void {
    this.p((t, out, e) => {
      // KRAK: bright noise crack.
      e.burst(e.white, 'highpass', 900, 600, 0.7, 0.45, 0.001, 0.22, t, out);
      e.burst(e.white, 'bandpass', 3200, 1800, 1, 0.25, 0.001, 0.12, t, out);
      // OOM: low boom with a rolling tail.
      e.blip(95, 32, 'sine', 0.5, 0.004, 0.8, t, out, 0.5);
      e.burst(e.brown, 'lowpass', 900, 120, 0.7, 0.55, 0.01, 1.5, t + 0.02, out);
    });
  }

  rumble(): void {
    this.p((t, out, e) => {
      e.burst(e.brown, 'lowpass', 160, 100, 0.7, 0.3, 0.45, 1.2, t, out);
    });
  }

  thunder(): void {
    this.p((t, _out, e) => {
      // The prototype's thunder (brown noise, lowpass, long tail), with a closing filter and a second roll.
      e.burst(e.brown, 'lowpass', 420, 140, 0.7, 0.75, 0.05, 2.8, t, e.ambBus);
      e.burst(e.brown, 'lowpass', 260, 110, 0.7, 0.4, 0.3, 1.8, t + rnd(0.35, 0.7), e.ambBus);
    });
  }

  respawn(): void {
    this.p((t, out, e) => {
      e.burst(e.white, 'bandpass', 300, 2600, 1.2, 0.12, 0.2, 0.17, t, out);
      e.blip(200, 820, 'sine', 0.04, 0.2, 0.15, t, out);
    });
  }

  slide(): void {
    this.p((t, out, e) => {
      e.burst(e.white, 'bandpass', 1800, 450, 0.8, 0.1, 0.18, 0.27, t, out);
      e.burst(e.brown, 'lowpass', 400, 200, 0.7, 0.08, 0.15, 0.25, t, out);
    });
  }

  woof(): void {
    this.p((t, out, e) => {
      const bark = (ti: number, f: number) => {
        const o = e.osc('square', f, ti, 0.11);
        o.frequency.exponentialRampToValueAtTime(f * 0.7, ti + 0.1);
        const lp = e.filter('lowpass', 1300, 1.5);
        o.connect(lp);
        lp.connect(e.env(ti, 0.06, 0.008, 0.09, out));
        e.burst(e.white, 'bandpass', 900, 600, 1.2, 0.03, 0.005, 0.07, ti, out);
      };
      bark(t, 330);
      bark(t + 0.14, 280);
    });
  }

  restored(): void {
    this.p((t, out, e) => {
      // D-major fanfare: D A D up, then a held D major chord, with two dhol hits.
      [62, 69, 74].forEach((n, i) => {
        const ti = t + i * 0.11;
        e.blip(hz(n), hz(n), 'square', 0.035, 0.004, 0.12, ti, out);
        e.blip(hz(n), hz(n), 'triangle', 0.08, 0.004, 0.14, ti, out);
      });
      const tc = t + 0.36;
      const lp = e.filter('lowpass', 3000, 0.7);
      lp.connect(e.env(tc, 0.045, 0.02, 1.3, out));
      for (const n of [74, 78, 81, 86]) {
        e.osc('square', hz(n), tc, 1.35).connect(lp);
        e.osc('triangle', hz(n), tc, 1.35, 6).connect(lp);
      }
      for (const ti of [t, tc]) {
        e.blip(120, 48, 'sine', 0.3, 0.002, 0.25, ti, out, 0.12);
        e.burst(e.white, 'bandpass', 2300, 1500, 1.4, 0.1, 0.001, 0.07, ti, out);
      }
    });
  }

  ui(): void {
    this.p((t, out, e) => {
      e.blip(880, 620, 'square', 0.035, 0.003, 0.05, t, out);
    });
  }
}
