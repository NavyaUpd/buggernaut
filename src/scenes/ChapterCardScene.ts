import Phaser from 'phaser';
import { audio } from '../audio';
import { FONTS, VIEW } from '../config';
import { goNext } from '../game/RoomFlow';
import { input } from '../input';
import { coverScale, crayonKey, ensureCrayonText, ensureCrayonTextures, type CrayonName } from '../render/crayonArt';
import { CHAPTERS, type ChapterText } from '../story/script';
import { SCENES, type ChapterCardData } from './keys';

const DURATION = 4; // s (§7.3, lengthened from 2.5 so the radio line can be read)
const SKIP_GUARD = 0.2; // s, so the key that ended the last scene can't also skip this one
const TITLE_MAX_W = 540; // the doodle panel starts at x = 640
const RADIO_W = 860; // radio strip width; the longest line fits at full size

/** Chapter card: Chinni's crayon page, "chapter N" + title in her handwriting, and the radio line (§7.3). */
export class ChapterCardScene extends Phaser.Scene {
  private chapter = 1;
  private t = 0;
  private done = false;

  constructor() {
    super(SCENES.ChapterCard);
  }

  init(data: ChapterCardData): void {
    this.chapter = Phaser.Math.Clamp(Math.round(data?.chapter ?? 1), 1, 4);
    this.t = 0;
    this.done = false;
  }

  create(): void {
    ensureCrayonTextures(this);
    const n = this.chapter;
    const info: ChapterText = CHAPTERS.find((c) => c.num === n) ?? { num: n, title: '', radio: null };
    const cam = this.cameras.main;
    cam.setBackgroundColor('#000000');

    // the page, full screen, with a very slow drift
    const page = this.add.image(VIEW.width / 2, VIEW.height / 2, crayonKey(`ch${n}` as CrayonName));
    const s = coverScale(page.width, page.height, VIEW.width, VIEW.height);
    page.setScale(s);
    this.tweens.add({ targets: page, scale: s * 1.02, duration: (DURATION + 0.5) * 1000, ease: 'Sine.easeOut' });

    // "chapter N" + title in crayon handwriting
    const labelKey = ensureCrayonText(this, `crayon_txt_ch${n}_label`, `chapter ${n}`, 54, '#ff3b30');
    const titleKey = ensureCrayonText(this, `crayon_txt_ch${n}_title`, info.title.toLowerCase(), 118, '#24317e');
    const label = this.add.image(70, 190, labelKey).setOrigin(0, 0.5).setAlpha(0);
    const title = this.add.image(56, 300, titleKey).setOrigin(0, 0.5).setAlpha(0);
    const ts = Math.min(1, TITLE_MAX_W / Math.max(1, title.width));
    title.setScale(ts * 1.08);
    this.tweens.add({ targets: label, alpha: 1, x: 80, duration: 450, delay: 150, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: title, alpha: 1, scale: ts, duration: 500, delay: 350, ease: 'Back.easeOut' });

    // the radio line, typed out like a transcript
    if (info.radio) this.radioLine(info.radio);
    // the first card also shows the controls, once
    if (n === 1) this.controlsRow();
    if (n === 4) audio.setRain(0.4, 1); // Ghar: no radio, only the rain getting softer

    cam.fadeIn(450, 0, 0, 0);
  }

  /** Crayon keycaps for the four inputs: A/D · Space · W/S · E. Shown on the first chapter card only. */
  private controlsRow(): void {
    const groups: { keys: string[]; label: string }[] = [
      { keys: ['A', 'D'], label: 'move' },
      { keys: ['Space'], label: 'jump' },
      { keys: ['W', 'S'], label: 'climb' },
      { keys: ['E'], label: 'hold to splice' },
    ];
    const KEY = 54;
    const GAP = 8;
    const SPACE_W = 118;
    let x = 64;
    const y = 384;
    const g = this.add.graphics().setAlpha(0);
    const labels: Phaser.GameObjects.Text[] = [];
    const caps: Phaser.GameObjects.Text[] = [];
    groups.forEach((grp, gi) => {
      const x0 = x;
      grp.keys.forEach((k) => {
        const w = k === 'Space' ? SPACE_W : KEY;
        g.fillStyle(0x000000, 0.35);
        g.fillRoundedRect(x + 3, y + 5, w, KEY, 10);
        g.fillStyle(0xffffff, 1);
        g.fillRoundedRect(x, y, w, KEY, 10);
        g.lineStyle(4, 0x000000, 1);
        g.strokeRoundedRect(x, y, w, KEY, 10);
        caps.push(
          this.add
            .text(x + w / 2, y + KEY / 2 + 1, k, { fontFamily: FONTS.comic, fontSize: k === 'Space' ? '24px' : '30px', fontStyle: 'bold', color: '#24317e' })
            .setOrigin(0.5)
            .setAlpha(0),
        );
        x += w + GAP;
      });
      const mid = (x0 + x - GAP) / 2;
      labels.push(
        this.add
          .text(mid, y + KEY + 22, grp.label, { fontFamily: FONTS.hand, fontSize: '22px', color: '#ff3b30' })
          .setOrigin(0.5)
          .setAlpha(0),
      );
      x += gi === groups.length - 1 ? 0 : 26;
    });
    this.tweens.add({ targets: [g, ...caps, ...labels], alpha: 1, duration: 400, delay: 700, ease: 'Cubic.easeOut' });
  }

  private radioLine(line: string): void {
    const x = 64;
    const y = 652;
    const strip = this.add.graphics().setAlpha(0);
    strip.fillStyle(0x0b0f1c, 0.88);
    strip.fillRoundedRect(x - 16, y - 26, RADIO_W, 52, 10);
    strip.lineStyle(2, 0x7fe3ff, 0.6);
    strip.strokeRoundedRect(x - 16, y - 26, RADIO_W, 52, 10);
    // little radio-wave glyph
    strip.fillStyle(0x7fe3ff, 1);
    strip.fillCircle(x + 6, y, 4);
    strip.lineStyle(2.5, 0x7fe3ff, 0.9);
    for (const r of [9, 15]) {
      strip.beginPath();
      strip.arc(x + 6, y, r, -0.8, 0.8);
      strip.strokePath();
    }
    const text = this.add
      .text(x + 30, y, '', { fontFamily: FONTS.ui, fontSize: '19px', color: '#cfe0fb', fontStyle: 'bold' })
      .setOrigin(0, 0.5);
    const fit = (): void => {
      if (text.width > RADIO_W - 60) text.setScale((RADIO_W - 60) / text.width);
    };
    this.tweens.add({ targets: strip, alpha: 1, duration: 250, delay: 500 });
    let i = 0;
    this.time.delayedCall(600, () => {
      audio.sfx.ui();
      this.time.addEvent({
        delay: 14,
        repeat: Math.ceil(line.length / 2) - 1,
        callback: () => {
          i = Math.min(line.length, i + 2);
          text.setText(`"${line.slice(0, i)}${i < line.length ? '' : '"'}`);
          fit();
        },
      });
    });
  }

  update(_time: number, delta: number): void {
    this.t += delta / 1000;
    if (this.t > SKIP_GUARD && input.anyPressed()) {
      audio.start();
      this.finish(160);
    } else if (this.t >= DURATION) this.finish(320);
  }

  private finish(fadeMs: number): void {
    if (this.done) return;
    this.done = true;
    let left = false;
    const leave = (): void => {
      if (left) return;
      left = true;
      goNext(this, { kind: 'card', chapter: this.chapter });
    };
    const cam = this.cameras.main;
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, leave);
    cam.fade(fadeMs, 0, 0, 0, true); // forced, so it also works while the fade-in is still running
    this.time.delayedCall(fadeMs + 120, leave);
  }
}
