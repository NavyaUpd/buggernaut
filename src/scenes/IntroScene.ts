// Opening story: five crayon comic panels, one at a time, that say what the game is about before chapter 1.
import Phaser from 'phaser';
import { audio } from '../audio';
import { FONTS, VIEW } from '../config';
import { goNext } from '../game/RoomFlow';
import { input } from '../input';
import { ensureCrayonText } from '../render/crayonArt';
import { INTRO_ART_SIZE, introKey, makeIntroCanvas } from '../render/introArt';
import { INTRO_PANELS, INTRO_UI, type IntroArt, type IntroPanel } from '../story/intro';
import { SCENES } from './keys';

const CPS = 40; // caption typing speed, characters per second
const MIN_HOLD = 0.6; // s a panel stays before a key can advance it
const TYPE_GUARD = 0.15; // s before a key can complete the typing (the key that started the intro can't skip it)
const HINT_AT = 1; // s
const SCRATCH_EVERY = 0.11; // s between pen-scratch sounds while typing

const PANEL = { x: 40, y: 22, w: INTRO_ART_SIZE.w, h: INTRO_ART_SIZE.h } as const;
const CAP = { x: 40, y: 530, w: 1200, h: 136 } as const;
const PAD = 34;

interface Line {
  len: number;
  set: (n: number) => void;
}

/** Comic intro (5 panels, ~30–40 s if read): any key completes the caption, the next key turns the page, Esc skips. */
export class IntroScene extends Phaser.Scene {
  private idx = 0;
  private shownAt = 0; // performance.now() when the current panel appeared (guards use real time, not frame time)
  private typed = 0;
  private total = 0;
  private scratchT = 0;
  private done = false;
  private lines: Line[] = [];
  private page: Phaser.GameObjects.Container | null = null;
  private dots: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super(SCENES.Intro);
  }

  create(): void {
    this.idx = 0;
    this.done = false;
    this.page = null;
    const cam = this.cameras.main;
    cam.setBackgroundColor('#141a2e');
    audio.setMusic('game');
    audio.setRain(1);

    this.add.image(0, 0, this.halftone('intro_dots_night', VIEW.width, VIEW.height, 18, '#1b2340')).setOrigin(0);

    const small = { fontFamily: FONTS.ui, fontSize: '16px', fontStyle: 'bold', color: '#e9eefc' };
    const hint = this.add.text(VIEW.width - 40, VIEW.height - 26, INTRO_UI.next, small).setOrigin(1, 0.5).setAlpha(0);
    const skip = this.add.text(40, VIEW.height - 26, INTRO_UI.skip, { ...small, color: '#8d9ac0' }).setOrigin(0, 0.5).setAlpha(0);
    this.time.delayedCall(HINT_AT * 1000, () => {
      this.tweens.add({ targets: skip, alpha: 0.8, duration: 400 });
      this.tweens.add({ targets: hint, alpha: 0.95, duration: 400 });
      this.tweens.add({ targets: hint, alpha: 0.45, duration: 900, delay: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    this.dots = this.add.graphics();

    this.ensureArt(INTRO_PANELS[0]?.art ?? 'storm');
    this.show(0);
    cam.fadeIn(400, 0, 0, 0);
  }

  /** Bake a panel's crayon art once (cached across visits). */
  private ensureArt(art: IntroArt): string {
    const key = introKey(art);
    if (!this.textures.exists(key)) {
      try {
        this.textures.addCanvas(key, makeIntroCanvas(art));
      } catch (e) {
        console.warn(`IntroScene: could not draw ${art}`, e);
      }
    }
    return key;
  }

  private show(i: number): void {
    const panel = INTRO_PANELS[i];
    if (!panel) return this.finish();
    this.idx = i;
    this.shownAt = performance.now();
    this.typed = 0;
    this.scratchT = 0;

    // the old page slides off to the left
    const old = this.page;
    if (old) {
      this.tweens.add({ targets: old, x: -90, alpha: 0, duration: 260, ease: 'Cubic.easeIn', onComplete: () => old.destroy() });
    }

    const c = this.add.container(90, 0).setAlpha(0);
    this.page = c;
    c.add(this.panelFrame(panel));
    this.lines = this.captionBox(c, panel, i);
    this.total = this.lines.reduce((a, l) => a + l.len, 0);
    this.tweens.add({ targets: c, x: 0, alpha: 1, duration: 360, delay: old ? 120 : 0, ease: 'Cubic.easeOut' });
    this.drawDots(i);

    // bake the next page while this one is being read
    const next = INTRO_PANELS[i + 1];
    if (next) this.time.delayedCall(450, () => this.ensureArt(next.art));
  }

  /** The art inside a hand-ruled comic panel: drop shadow, white gutter, thick ink border (like the room panels). */
  private panelFrame(panel: IntroPanel): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    const p = PANEL;
    const nudge: [number, number][] = [
      [5, 6],
      [0, -3],
      [-3, 0],
      [-4, 2],
    ];
    const pts = (inset: number, dx = 0, dy = 0): Phaser.Math.Vector2[] =>
      (
        [
          [p.x + inset, p.y + inset],
          [p.x + p.w - inset, p.y + inset],
          [p.x + p.w - inset, p.y + p.h - inset],
          [p.x + inset, p.y + p.h - inset],
        ] as [number, number][]
      ).map(([x, y], k) => new Phaser.Math.Vector2(x + (nudge[k]?.[0] ?? 0) + dx, y + (nudge[k]?.[1] ?? 0) + dy));
    const back = this.add.graphics();
    back.fillStyle(0x000000, 0.55);
    back.fillPoints(pts(-8, 10, 12), true);
    back.fillStyle(0xffffff, 1);
    back.fillPoints(pts(-8), true);
    c.add(back);
    const art = this.add.image(p.x + 2, p.y + 2, this.ensureArt(panel.art)).setOrigin(0);
    art.setDisplaySize(p.w - 4, p.h - 4);
    c.add(art);
    const border = this.add.graphics();
    border.lineStyle(6, 0x000000, 1);
    border.strokePoints(pts(0), true, true);
    c.add(border);
    return c;
  }

  /** Yellow comic caption box under the panel; returns the typed lines. */
  private captionBox(c: Phaser.GameObjects.Container, panel: IntroPanel, i: number): Line[] {
    const rot = i % 2 ? 0.006 : -0.006;
    const box = this.add.graphics({ x: CAP.x + CAP.w / 2, y: CAP.y + CAP.h / 2 }).setRotation(rot);
    const hw = CAP.w / 2;
    const hh = CAP.h / 2;
    box.fillStyle(0x000000, 0.5);
    box.fillRect(-hw + 8, -hh + 9, CAP.w, CAP.h);
    box.fillStyle(0xfff1a8, 1);
    box.fillRect(-hw, -hh, CAP.w, CAP.h);
    box.lineStyle(5, 0x000000, 1);
    box.strokeRect(-hw, -hh, CAP.w, CAP.h);
    c.add(box);

    const maxW = CAP.w - PAD * 2;
    const n = panel.lines.length;
    const lines: Line[] = [];
    panel.lines.forEach((ln, k) => {
      const y = CAP.y + (n === 1 ? CAP.h / 2 : k === 0 ? 42 : 96);
      if (ln.voice === 'chinni') {
        // Chinni's crayon handwriting, revealed left to right as it "types"
        const key = ensureCrayonText(this, `crayon_txt_intro_${i}_${k}`, ln.text, 38, '#24317e');
        const img = this.add.image(CAP.x + PAD - 10, y, key).setOrigin(0, 0.5);
        const s = Math.min(1, (maxW + 20) / img.width);
        img.setScale(s);
        const fw = img.frame.width;
        const fh = img.frame.height;
        img.setCrop(0, 0, 0, fh);
        c.add(img);
        lines.push({ len: ln.text.length, set: (m) => img.setCrop(0, 0, Math.ceil(fw * Math.min(1, m / ln.text.length)), fh) });
      } else {
        const size = k === 0 ? 30 : 26;
        const tx = this.add
          .text(CAP.x + PAD, y, ln.text, { fontFamily: FONTS.comic, fontSize: `${size}px`, fontStyle: 'bold', color: '#14131c' })
          .setOrigin(0, 0.5);
        if (tx.width > maxW) tx.setScale(maxW / tx.width);
        tx.setText('');
        c.add(tx);
        lines.push({ len: ln.text.length, set: (m) => tx.setText(ln.text.slice(0, m)) });
      }
    });
    return lines;
  }

  /** Five page dots at the bottom: filled up to the current panel. */
  private drawDots(i: number): void {
    const g = this.dots;
    if (!g) return;
    g.clear();
    const n = INTRO_PANELS.length;
    const x0 = VIEW.width / 2 - ((n - 1) * 22) / 2;
    for (let k = 0; k < n; k++) {
      g.fillStyle(k <= i ? 0xffd400 : 0x3a4566, 1);
      g.fillCircle(x0 + k * 22, VIEW.height - 26, k === i ? 6 : 4.5);
    }
  }

  private renderCaption(): void {
    let left = Math.floor(this.typed);
    for (const l of this.lines) {
      l.set(Math.max(0, Math.min(l.len, left)));
      left -= l.len;
    }
  }

  update(_time: number, delta: number): void {
    if (this.done) return;
    const dt = Math.min(0.1, delta / 1000);
    const age = (performance.now() - this.shownAt) / 1000;
    if (input.pressed('escape')) {
      audio.sfx.ui();
      return this.finish();
    }
    const full = this.typed >= this.total;
    if (!full) {
      this.typed = Math.min(this.total, this.typed + CPS * dt);
      this.scratchT -= dt;
      if (this.scratchT <= 0) {
        audio.sfx.penScratch();
        this.scratchT = SCRATCH_EVERY;
      }
      this.renderCaption();
    }
    if (!input.anyPressed()) return;
    if (!full) {
      if (age >= TYPE_GUARD) {
        this.typed = this.total;
        this.renderCaption();
      }
    } else if (age >= MIN_HOLD) {
      audio.sfx.ui();
      this.show(this.idx + 1);
    }
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    let left = false;
    const leave = (): void => {
      if (left) return;
      left = true;
      goNext(this, { kind: 'intro' });
    };
    const cam = this.cameras.main;
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, leave);
    cam.fade(320, 0, 0, 0, true);
    this.time.delayedCall(440, leave);
  }

  /** Faint halftone dots behind the page, baked once. */
  private halftone(key: string, w: number, h: number, step: number, color: string): string {
    if (this.textures.exists(key)) return key;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    if (g) {
      g.fillStyle = color;
      for (let y = step / 2; y < h; y += step)
        for (let x = (Math.round(y / step) % 2 ? step / 2 : 0) + 4; x < w; x += step) {
          g.beginPath();
          g.arc(x, y, 1.6, 0, Math.PI * 2);
          g.fill();
        }
    }
    this.textures.addCanvas(key, c);
    return key;
  }
}
