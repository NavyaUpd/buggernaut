import Phaser from 'phaser';
import { audio } from '../audio';
import { FONTS, VIEW } from '../config';
import { goNext } from '../game/RoomFlow';
import { input } from '../input';
import {
  coverScale,
  CRAYON_SIZES,
  crayonKey,
  ensureCrayonText,
  ensureCrayonTextures,
  FINAL_CAPTION_BOX,
  hasPng,
  type CrayonName,
} from '../render/crayonArt';
import { FINALE, TITLE } from '../story/script';
import { SCENES } from './keys';

// §10 steps 2–5. Step 1 (rain out, motif, hold on the lit window) happens in room 4-1 before this scene starts.
const T = {
  window: 4000, // final_window, 4% push-in
  helmet: 5000, // final_helmet: the reveal, 3% push-in, no sting
  page: 6000, // final_page + caption
  line2Delay: 2800, // end card: second line after the first
  lineFade: 1400,
} as const;

/** The reveal: Chinni at the window → Amma lifts the helmet → "my amma is bijli." → end card. */
export class FinaleScene extends Phaser.Scene {
  private canContinue = false;
  private done = false;

  constructor() {
    super(SCENES.Finale);
  }

  create(): void {
    ensureCrayonTextures(this);
    this.canContinue = false;
    this.done = false;
    this.cameras.main.setBackgroundColor('#000000');
    audio.setRain(0, 1);
    audio.setMusic('finaleMotif', 1);

    // 2. fade in Chinni at the window, slow 4% push-in
    const win = this.cover('final_window');
    win.setAlpha(0);
    this.tweens.add({ targets: win, alpha: 1, duration: 1200, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: win, scale: win.scale * 1.04, duration: T.window, ease: 'Sine.easeInOut' });

    // 3. hard cut to the helmet coming off. No sting: the music drops out, only the fan and the drips.
    this.time.delayedCall(T.window, () => {
      const helmet = this.cover('final_helmet');
      win.destroy();
      audio.setMusic('off', 0.5);
      audio.setFan(true);
      this.tweens.add({ targets: helmet, scale: helmet.scale * 1.03, duration: T.helmet, ease: 'Sine.easeInOut' });

      // 4. Chinni's last page; the light layer of the music returns once, slow and major
      this.time.delayedCall(T.helmet, () => {
        const page = this.cover('final_page').setAlpha(0);
        this.tweens.add({ targets: page, alpha: 1, duration: 600, ease: 'Sine.easeOut', onComplete: () => helmet.destroy() });
        audio.setMusic('finaleMajor', 2);
        if (!hasPng(this, 'final_page')) this.writeCaption(page, 900);
        // 5. end card
        this.time.delayedCall(T.page, () => this.endCard());
      });
    });
  }

  private cover(name: CrayonName): Phaser.GameObjects.Image {
    const img = this.add.image(VIEW.width / 2, VIEW.height / 2, crayonKey(name));
    img.setScale(coverScale(img.width, img.height, VIEW.width, VIEW.height));
    return img;
  }

  /** Chinni writes the caption into the yellow box of the generated page, left to right. */
  private writeCaption(page: Phaser.GameObjects.Image, delay: number): void {
    const key = ensureCrayonText(this, 'crayon_txt_finale_caption', FINALE.caption, 84, '#24317e');
    const B = FINAL_CAPTION_BOX;
    const size = CRAYON_SIZES.final_page;
    const kx = page.width / size.w;
    const ky = page.height / size.h;
    const bx = (B.x + B.w / 2) * kx;
    const by = (B.y + B.h / 2) * ky;
    const x = page.x + (bx - page.width / 2) * page.scaleX;
    const y = page.y + (by - page.height / 2) * page.scaleY;
    const cap = this.add.image(x, y, key);
    const fit = Math.min((B.w * kx * page.scaleX * 0.92) / cap.width, (B.h * ky * page.scaleY * 1.25) / cap.height);
    cap.setScale(fit).setRotation(-0.015);
    cap.setCrop(0, 0, 0, cap.height);
    this.time.delayedCall(delay, () => {
      audio.sfx.penScratch();
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 1700,
        ease: 'Sine.easeInOut',
        onUpdate: (tw) => cap.setCrop(0, 0, cap.width * (tw.getValue() ?? 0), cap.height),
      });
    });
  }

  private endCard(): void {
    const black = this.add.rectangle(0, 0, VIEW.width, VIEW.height, 0x000000).setOrigin(0).setAlpha(0);
    this.tweens.add({ targets: black, alpha: 1, duration: 1000, ease: 'Sine.easeInOut' });
    const [l1 = '', l2 = ''] = FINALE.endCard;
    const line1 = this.add
      .text(VIEW.width / 2, 318, l1, {
        fontFamily: FONTS.ui,
        fontSize: '30px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 900 },
        lineSpacing: 10,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    const line2 = this.add
      .text(VIEW.width / 2, 440, l2, {
        fontFamily: FONTS.ui,
        fontSize: '22px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 900 },
      })
      .setOrigin(0.5)
      .setAlpha(0);
    const prompt = this.add
      .text(VIEW.width / 2, VIEW.height - 40, TITLE.start, { fontFamily: FONTS.ui, fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({ targets: line1, alpha: 1, duration: T.lineFade, delay: 1100 });
    this.tweens.add({
      targets: line2,
      alpha: 0.85,
      duration: T.lineFade,
      delay: 1100 + T.line2Delay,
      onComplete: () => {
        this.canContinue = true;
        this.tweens.add({ targets: prompt, alpha: 0.45, duration: 800, delay: 1200 });
      },
    });
  }

  update(): void {
    if (this.done || !this.canContinue || !input.anyPressed()) return;
    this.done = true;
    audio.start();
    audio.setFan(false);
    const cam = this.cameras.main;
    let left = false;
    const leave = (): void => {
      if (left) return;
      left = true;
      goNext(this, { kind: 'finale' });
    };
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, leave);
    cam.fade(500, 0, 0, 0, true);
    this.time.delayedCall(650, leave);
  }
}
