// Procedural WebAudio engine (§11): context, master chain, shared noise buffers, envelope helpers and the
// ambience beds (rain, 50 Hz hum, grind crackle, finale fan + drips). Music.ts and Sfx.ts build on top of it.
// Everything here is a no-op until start() has created the AudioContext, and nothing here throws.

type Ctor = typeof AudioContext;

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);
export const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export class Engine {
  ctx: AudioContext | null = null;
  /** Buses: everything ends up in `mix` → mute gain → limiter → speakers. */
  sfxBus!: GainNode;
  musicBus!: GainNode;
  ambBus!: GainNode;
  /** Shared buffers, generated once on start(): 2 s white, 4 s brown, 1 s electric crackle. */
  white!: AudioBuffer;
  brown!: AudioBuffer;
  crackle!: AudioBuffer;

  private muteG!: GainNode;
  private rainG!: GainNode;
  private humG!: GainNode;
  private grindG!: GainNode;
  private fanG!: GainNode;

  // State remembered before start() so calls made early still take effect once audio starts.
  private muted = false;
  private rain = 1;
  private hum = 0;
  private grind = false;
  private fan = false;
  private dripTimer: ReturnType<typeof setTimeout> | null = null;
  private readyCbs: Array<() => void> = [];

  get started(): boolean {
    return this.ctx !== null;
  }

  /** Register a callback that runs once the context and buses exist (Music uses this). */
  onReady(cb: () => void): void {
    if (this.ctx) cb();
    else this.readyCbs.push(cb);
  }

  start(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    let ac: AudioContext;
    try {
      const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
      const C = w.AudioContext ?? w.webkitAudioContext;
      if (!C) return;
      ac = new C();
    } catch {
      return;
    }
    try {
      this.build(ac);
      this.ctx = ac;
      if (ac.state === 'suspended') ac.resume().catch(() => {});
    } catch {
      try {
        ac.close().catch(() => {});
      } catch {
        /* ignore */
      }
      return;
    }
    const cbs = this.readyCbs;
    this.readyCbs = [];
    for (const cb of cbs) {
      try {
        cb();
      } catch {
        /* never throw out of start() */
      }
    }
    // Apply state requested before start().
    this.setGrind(this.grind);
    this.setFan(this.fan);
  }

  private build(ac: AudioContext): void {
    // Master: mix → mute → limiter-ish compressor → destination.
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.knee.value = 6;
    comp.ratio.value = 12;
    comp.attack.value = 0.002;
    comp.release.value = 0.2;
    comp.connect(ac.destination);
    this.muteG = ac.createGain();
    this.muteG.gain.value = this.muted ? 0 : 0.9;
    this.muteG.connect(comp);

    const bus = (v: number) => {
      const g = ac.createGain();
      g.gain.value = v;
      g.connect(this.muteG);
      return g;
    };
    this.sfxBus = bus(0.9);
    this.musicBus = bus(0.55);
    this.ambBus = bus(1);

    this.white = this.makeNoise(ac, 2, false);
    this.brown = this.makeNoise(ac, 4, true);
    this.crackle = this.makeCrackle(ac, 1);

    this.buildRain(ac);
    this.buildHum(ac);
    this.buildGrind(ac);
    this.buildFan(ac);
  }

  private makeNoise(ac: AudioContext, sec: number, brown: boolean): AudioBuffer {
    const b = ac.createBuffer(1, Math.floor(ac.sampleRate * sec), ac.sampleRate);
    const d = b.getChannelData(0);
    let l = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) {
        l = (l + 0.02 * w) / 1.02;
        d[i] = l * 3.5;
      } else d[i] = w;
    }
    return b;
  }

  /** Sparse electric crackle: random decaying clicks over a faint noise floor. Loops seamlessly enough. */
  private makeCrackle(ac: AudioContext, sec: number): AudioBuffer {
    const b = ac.createBuffer(1, Math.floor(ac.sampleRate * sec), ac.sampleRate);
    const d = b.getChannelData(0);
    let left = 0;
    let amp = 0;
    let len = 1;
    for (let i = 0; i < d.length; i++) {
      if (left <= 0 && Math.random() < 0.0016) {
        len = 20 + Math.floor(Math.random() * 260);
        left = len;
        amp = 0.3 + Math.random() * 0.7;
      }
      const w = Math.random() * 2 - 1;
      if (left > 0) {
        d[i] = w * amp * (left / len);
        left--;
      } else d[i] = w * 0.05;
    }
    return b;
  }

  private loop(buf: AudioBuffer, dest: AudioNode): AudioBufferSourceNode {
    const s = dest.context.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.connect(dest);
    s.start(0, Math.random() * buf.duration);
    return s;
  }

  private biq(ac: BaseAudioContext, type: BiquadFilterType, f: number, q = 0.7): BiquadFilterNode {
    const b = ac.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    return b;
  }

  private buildRain(ac: AudioContext): void {
    this.rainG = ac.createGain();
    this.rainG.gain.value = this.rain;
    this.rainG.connect(this.ambBus);
    // Hiss layer (the prototype's rain): white → lowpass 1500 → highpass 450.
    const lp = this.biq(ac, 'lowpass', 1500);
    const hp = this.biq(ac, 'highpass', 450);
    const g1 = ac.createGain();
    g1.gain.value = 0.05;
    lp.connect(hp).connect(g1).connect(this.rainG);
    this.loop(this.white, lp);
    // Body layer: soft low roar.
    const lp2 = this.biq(ac, 'lowpass', 500);
    const g2 = ac.createGain();
    g2.gain.value = 0.035;
    lp2.connect(g2).connect(this.rainG);
    this.loop(this.brown, lp2);
    // Slow gusting of the hiss.
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoG = ac.createGain();
    lfoG.gain.value = 0.012;
    lfo.connect(lfoG).connect(g1.gain);
    lfo.start();
  }

  private buildHum(ac: AudioContext): void {
    this.humG = ac.createGain();
    this.humG.gain.value = this.hum * 0.07;
    this.humG.connect(this.ambBus);
    const harm: Array<[number, number]> = [
      [50, 1],
      [100, 0.6],
      [150, 0.4],
      [200, 0.22],
      [250, 0.1],
    ];
    for (const [f, v] of harm) {
      const o = ac.createOscillator();
      o.frequency.value = f;
      const g = ac.createGain();
      g.gain.value = v;
      o.connect(g).connect(this.humG);
      o.start();
    }
    // Buzzy edge so the hum is audible on laptop speakers.
    const saw = ac.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.value = 100;
    const bp = this.biq(ac, 'bandpass', 700, 1.5);
    const g = ac.createGain();
    g.gain.value = 0.25;
    saw.connect(bp).connect(g).connect(this.humG);
    saw.start();
  }

  private buildGrind(ac: AudioContext): void {
    this.grindG = ac.createGain();
    this.grindG.gain.value = 0;
    this.grindG.connect(this.sfxBus);
    const hp = this.biq(ac, 'highpass', 1100);
    const g = ac.createGain();
    g.gain.value = 0.9;
    hp.connect(g).connect(this.grindG);
    this.loop(this.crackle, hp);
    // Electric whine under the crackle.
    const bp = this.biq(ac, 'bandpass', 1500, 3);
    const wg = ac.createGain();
    wg.gain.value = 0.35;
    bp.connect(wg).connect(this.grindG);
    for (const f of [180, 181.7]) {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.connect(bp);
      o.start();
    }
  }

  private buildFan(ac: AudioContext): void {
    this.fanG = ac.createGain();
    this.fanG.gain.value = 0;
    this.fanG.connect(this.ambBus);
    // Whirr: band-limited noise, amplitude-modulated by the blade rate.
    const bp = this.biq(ac, 'bandpass', 240, 0.9);
    const am = ac.createGain();
    am.gain.value = 0.6;
    bp.connect(am).connect(this.fanG);
    this.loop(this.white, bp);
    const lfo = ac.createOscillator();
    lfo.frequency.value = 3.4;
    const lfoG = ac.createGain();
    lfoG.gain.value = 0.35;
    lfo.connect(lfoG).connect(am.gain);
    lfo.start();
    // Motor hum.
    const m = ac.createOscillator();
    m.frequency.value = 96;
    const mg = ac.createGain();
    mg.gain.value = 0.05;
    m.connect(mg).connect(this.fanG);
    m.start();
  }

  // ---------------------------------------------------------------- public controls

  setMuted(m: boolean): void {
    this.muted = m;
    const ac = this.ctx;
    if (!ac) return;
    this.muteG.gain.setTargetAtTime(m ? 0 : 0.9, ac.currentTime, 0.03);
  }

  setRain(v: number, fadeSec = 0.5): void {
    this.rain = clamp01(v);
    const ac = this.ctx;
    if (!ac) return;
    const g = this.rainG.gain;
    const t = ac.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(this.rain, t + Math.max(0.02, Number.isFinite(fadeSec) ? fadeSec : 0.5));
  }

  setHum(v: number): void {
    const nv = clamp01(v);
    if (Math.abs(nv - this.hum) < 0.005 && this.ctx) return;
    this.hum = nv;
    const ac = this.ctx;
    if (!ac) return;
    this.humG.gain.setTargetAtTime(this.hum * 0.07, ac.currentTime, 0.12);
  }

  setGrind(on: boolean): void {
    this.grind = on;
    const ac = this.ctx;
    if (!ac) return;
    this.grindG.gain.setTargetAtTime(on ? 0.14 : 0, ac.currentTime, on ? 0.02 : 0.07);
  }

  setFan(on: boolean): void {
    this.fan = on;
    const ac = this.ctx;
    if (!ac) return;
    this.fanG.gain.setTargetAtTime(on ? 0.22 : 0, ac.currentTime, 0.6);
    if (on && this.dripTimer === null) this.scheduleDrip();
    if (!on && this.dripTimer !== null) {
      clearTimeout(this.dripTimer);
      this.dripTimer = null;
    }
  }

  private scheduleDrip(): void {
    this.dripTimer = setTimeout(() => {
      this.dripTimer = null;
      if (!this.fan) return;
      try {
        this.drip();
      } catch {
        /* ignore */
      }
      this.scheduleDrip();
    }, rnd(450, 1900));
  }

  private drip(): void {
    const ac = this.ctx;
    if (!ac) return;
    const t = ac.currentTime + 0.01;
    const f = rnd(900, 1500);
    const v = rnd(0.03, 0.06);
    this.blip(f, f * 1.9, 'sine', v, 0.002, 0.09, t, this.ambBus, 0.035);
    this.blip(f * 1.02, f * 1.9, 'sine', v * 0.35, 0.002, 0.08, t + 0.16, this.ambBus, 0.035);
  }

  // ---------------------------------------------------------------- helpers for Music / Sfx

  /** Gain with an exponential attack/decay envelope starting at `t`, connected to `dest`. Connect a source into it. */
  env(t: number, v: number, a: number, d: number, dest: AudioNode): GainNode {
    const ac = this.ctx!;
    const g = ac.createGain();
    const peak = Math.max(0.0002, v);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + Math.max(0.001, a));
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.001, a) + Math.max(0.005, d));
    g.connect(dest);
    return g;
  }

  /** Oscillator started at `t` and stopped after `dur`. Not connected. */
  osc(type: OscillatorType, f: number, t: number, dur: number, detune = 0): OscillatorNode {
    const ac = this.ctx!;
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (detune) o.detune.setValueAtTime(detune, t);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  /** Noise source playing a random slice of `buf` from `t` for `dur`. Not connected. */
  noise(buf: AudioBuffer, t: number, dur: number): AudioBufferSourceNode {
    const ac = this.ctx!;
    const s = ac.createBufferSource();
    s.buffer = buf;
    const len = Math.min(dur + 0.05, buf.duration);
    if (len < dur + 0.05) s.loop = true;
    s.start(t, Math.random() * Math.max(0, buf.duration - len));
    s.stop(t + dur + 0.05);
    return s;
  }

  filter(type: BiquadFilterType, f: number, q = 0.7): BiquadFilterNode {
    return this.biq(this.ctx!, type, f, q);
  }

  /** Pitched blip: f → f1 (exponential glide over `glide`, default the whole note), enveloped. */
  blip(
    f: number,
    f1: number,
    type: OscillatorType,
    v: number,
    a: number,
    d: number,
    t: number,
    dest: AudioNode,
    glide = a + d,
  ): OscillatorNode {
    const o = this.osc(type, f, t, a + d);
    if (f1 !== f) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + Math.max(0.005, glide));
    o.connect(this.env(t, v, a, d, dest));
    return o;
  }

  /** Filtered noise burst. The filter frequency glides f → f1 over the burst. */
  burst(
    buf: AudioBuffer,
    ftype: BiquadFilterType,
    f: number,
    f1: number,
    q: number,
    v: number,
    a: number,
    d: number,
    t: number,
    dest: AudioNode,
  ): BiquadFilterNode {
    const s = this.noise(buf, t, a + d);
    const fl = this.filter(ftype, f, q);
    fl.frequency.setValueAtTime(f, t);
    if (f1 !== f) fl.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t + a + d);
    s.connect(fl);
    fl.connect(this.env(t, v, a, d, dest));
    return fl;
  }
}
