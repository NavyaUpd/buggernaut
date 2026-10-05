import Phaser from 'phaser';
import { audio } from '../audio';
import { FONTS, VIEW } from '../config';
import { goNext } from '../game/RoomFlow';
import { input } from '../input';
import { coverScale, crayonKey, ensureCrayonText, ensureCrayonTextures, type CrayonName } from '../render/crayonArt';
import { CHAPTERS, type ChapterText } from '../story/script';
import { SCENES, type ChapterCardData } from './keys';

const DURATION = 2.5; // s (§7.3)
const SKIP_GUARD = 0.2; // s, so the key that ended the last scene can't also skip this one
const TITLE_MAX_W = 540; // the doodle panel starts at x = 640

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
    if (n === 4) audio.setRain(0.4, 1); // Ghar: no radio, only the rain getting softer

    cam.fadeIn(450, 0, 0, 0);
  }

  private radioLine(line: string): void {
    const x = 64;
    const y = 652;
    const strip = this.add.graphics().setAlpha(0);
    strip.fillStyle(0x0b0f1c, 0.88);
    strip.fillRoundedRect(x - 16, y - 26, 600, 52, 10);
    strip.lineStyle(2, 0x7fe3ff, 0.6);
    strip.strokeRoundedRect(x - 16, y - 26, 600, 52, 10);
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
      if (text.width > 540) text.setScale(540 / text.width);
    };
    this.tweens.add({ targets: strip, alpha: 1, duration: 250, delay: 500 });
    let i = 0;
    this.time.delayedCall(600, () => {
      audio.sfx.ui();
      this.time.addEvent({
        delay: 24,
        repeat: line.length - 1,
        callback: () => {
          i++;
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
