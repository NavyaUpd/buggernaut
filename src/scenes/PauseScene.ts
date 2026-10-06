// Pause (Esc / P): Resume · Restart room · Skip room · Mute · Reduce flashing · How to play.
import Phaser from 'phaser';
import { audio } from '../audio';
import { FONTS, VIEW } from '../config';
import { RoomSim } from '../game/RoomSim';
import { input, settings } from '../input';
import { HINTS, PAUSE } from '../story/script';
import { SCENES } from './keys';
import type { RoomScene } from './RoomScene';

const HELP = 5; // index of "How to play" in PAUSE.items

export class PauseScene extends Phaser.Scene {
  private sel = 0;
  private items: Phaser.GameObjects.Text[] = [];
  private help: Phaser.GameObjects.Container | null = null;

  constructor() {
    super(SCENES.Pause);
  }

  create(): void {
    this.sel = 0;
    this.help = null;
    const { width: W, height: H } = VIEW;
    this.add.rectangle(0, 0, W, H, 0x05070f, 0.72).setOrigin(0);
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1).fillRect(W / 2 - 230, H / 2 - 230, 460, 460);
    g.lineStyle(6, 0x000000, 1).strokeRect(W / 2 - 230, H / 2 - 230, 460, 460);
    this.add
      .text(W / 2, H / 2 - 180, PAUSE.title, { fontFamily: FONTS.comic, fontSize: '48px', fontStyle: 'bold', color: '#FFD400' })
      .setOrigin(0.5)
      .setStroke('#000', 10);
    this.items = PAUSE.items.map((_, i) =>
      this.add.text(W / 2, H / 2 - 100 + i * 54, '', { fontFamily: FONTS.ui, fontSize: '28px', fontStyle: 'bold', color: '#000' }).setOrigin(0.5),
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

  /** The hint cards met so far this run, in the order they were met. */
  private openHelp(): void {
    const { width: W, height: H } = VIEW;
    const seen = [...RoomSim.seenHints].filter((id) => HINTS[id]);
    const c = this.add.container(0, 0);
    const boxH = Math.max(220, 150 + seen.length * 40);
    const top = H / 2 - boxH / 2;
    const g = this.add.graphics();
    g.fillStyle(0x05070f, 0.6).fillRect(0, 0, W, H);
    g.fillStyle(0xfffdf2, 1).fillRect(W / 2 - 440, top, 880, boxH);
    g.lineStyle(6, 0x000000, 1).strokeRect(W / 2 - 440, top, 880, boxH);
    c.add(g);
    c.add(
      this.add
        .text(W / 2, top + 42, PAUSE.helpTitle, { fontFamily: FONTS.comic, fontSize: '36px', fontStyle: 'bold', color: '#FFD400' })
        .setOrigin(0.5)
        .setStroke('#000', 8),
    );
    if (!seen.length) {
      c.add(this.add.text(W / 2, top + 110, PAUSE.helpEmpty, { fontFamily: FONTS.hand, fontSize: '22px', color: '#2F6BFF' }).setOrigin(0.5));
    }
    seen.forEach((id, i) => {
      const h = HINTS[id]!;
      const y = top + 92 + i * 40;
      c.add(this.add.text(W / 2 - 410, y, h.title, { fontFamily: FONTS.comic, fontSize: '18px', fontStyle: 'bold', color: '#000' }));
      c.add(this.add.text(W / 2 - 190, y - 2, h.text, { fontFamily: FONTS.hand, fontSize: '20px', color: '#2F6BFF' }));
    });
    c.add(
      this.add
        .text(W / 2, top + boxH - 26, PAUSE.helpBack, { fontFamily: FONTS.ui, fontSize: '16px', fontStyle: 'bold', color: '#5C6B8A' })
        .setOrigin(0.5),
    );
    this.help = c;
  }

  private closeHelp(): void {
    this.help?.destroy(true);
    this.help = null;
  }

  private room(): RoomScene {
    return this.scene.get(SCENES.Room) as RoomScene;
  }

  private resume(): void {
    this.scene.stop();
    this.scene.resume(SCENES.Room);
  }

  update(): void {
    if (this.help) {
      // any key closes the How to play page and returns to the menu (never falls through to a menu action)
      if (input.anyPressed()) {
        audio.sfx.ui();
        this.closeHelp();
      }
      return;
    }
    if (input.pressed('escape') || input.pressed('p')) return this.resume();
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
        case HELP:
          this.openHelp();
          return;
      }
      this.refresh();
    }
  }
}
