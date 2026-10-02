import Phaser from 'phaser';
import { COLORS, VIEW } from '../config';
import { TITLE } from '../story/script';
import { SCENES } from './keys';

/** Placeholder title — becomes the playable rainy-street ambience in Phase 4 (§13). */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Title);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.real.night);
    const cx = VIEW.width / 2;
    this.add
      .text(cx, VIEW.height * 0.4, TITLE.name, { fontFamily: 'sans-serif', fontSize: '120px', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setColor('#FFB347');
    this.add
      .text(cx, VIEW.height * 0.6, TITLE.start, { fontFamily: 'sans-serif', fontSize: '24px' })
      .setOrigin(0.5)
      .setColor('#5C6B8A');
    this.add
      .text(cx, VIEW.height - 32, TITLE.flashNotice, { fontFamily: 'sans-serif', fontSize: '16px' })
      .setOrigin(0.5)
      .setColor('#5C6B8A');

    const start = () => this.scene.start(SCENES.Level, { levelId: 'L1' });
    this.input.keyboard?.once('keydown', start);
    this.input.once('pointerdown', start);
  }
}
