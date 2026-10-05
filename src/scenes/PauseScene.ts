// Pause (Esc): Resume · Restart room · Skip room · Mute · Reduce flashing.
import Phaser from 'phaser';
import { audio } from '../audio';
import { FONTS, VIEW } from '../config';
import { input, settings } from '../input';
import { PAUSE } from '../story/script';
import { SCENES } from './keys';
import type { RoomScene } from './RoomScene';

export class PauseScene extends Phaser.Scene {
  private sel = 0;
  private items: Phaser.GameObjects.Text[] = [];

  constructor() {
    super(SCENES.Pause);
  }

  create(): void {
    this.sel = 0;
    const { width: W, height: H } = VIEW;
    this.add.rectangle(0, 0, W, H, 0x05070f, 0.72).setOrigin(0);
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1).fillRect(W / 2 - 230, H / 2 - 200, 460, 400);
    g.lineStyle(6, 0x000000, 1).strokeRect(W / 2 - 230, H / 2 - 200, 460, 400);
    this.add
      .text(W / 2, H / 2 - 150, PAUSE.title, { fontFamily: FONTS.comic, fontSize: '48px', fontStyle: 'bold', color: '#FFD400' })
      .setOrigin(0.5)
      .setStroke('#000', 10);
    this.items = PAUSE.items.map((_, i) =>
      this.add.text(W / 2, H / 2 - 70 + i * 54, '', { fontFamily: FONTS.ui, fontSize: '28px', fontStyle: 'bold', color: '#000' }).setOrigin(0.5),
    );
    this.refresh();
  }

  private label(i: number): string {
    const base = PAUSE.items[i]!;
    if (i === 3) return `${base}: ${settings.muted ? PAUSE.on : PAUSE.off}`;
    if (i === 4) return `${base}: ${settings.reduceFlashing ? PAUSE.on : PAUSE.off}`;
    return base;
  }

  private refresh(): void {
    this.items.forEach((t, i) => {
      t.setText((i === this.sel ? '▶ ' : '') + this.label(i));
      t.setColor(i === this.sel ? '#FF3E9A' : '#000000');
    });
  }

  private room(): RoomScene {
    return this.scene.get(SCENES.Room) as RoomScene;
  }

  private resume(): void {
    this.scene.stop();
    this.scene.resume(SCENES.Room);
  }

  update(): void {
    if (input.pressed('escape')) return this.resume();
    if (input.pressed('w') || input.pressed('arrowup')) {
      this.sel = (this.sel + PAUSE.items.length - 1) % PAUSE.items.length;
      audio.sfx.ui();
      this.refresh();
    }
    if (input.pressed('s') || input.pressed('arrowdown')) {
      this.sel = (this.sel + 1) % PAUSE.items.length;
      audio.sfx.ui();
      this.refresh();
    }
    if (input.pressed('enter') || input.pressed(' ') || input.pressed('e')) {
      audio.sfx.ui();
      switch (this.sel) {
        case 0:
          return this.resume();
        case 1:
          this.room().restartRoom();
          return this.resume();
        case 2:
          this.scene.stop();
          this.scene.resume(SCENES.Room);
          this.room().advance();
          return;
        case 3:
          settings.muted = !settings.muted;
          audio.setMuted(settings.muted);
          break;
        case 4:
          settings.reduceFlashing = !settings.reduceFlashing;
          break;
      }
      this.refresh();
    }
  }
}
