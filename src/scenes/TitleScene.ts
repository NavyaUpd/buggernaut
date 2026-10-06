// Title: room 1-1's dark street with rain (no player), the crayon logo, "press any key", "reduce flashing: F".
import Phaser from 'phaser';
import { audio } from '../audio';
import { FONTS, VIEW } from '../config';
import { FLOW, sceneFor } from '../game/RoomFlow';
import { NO_INPUT, RoomSim } from '../game/RoomSim';
import { input, settings } from '../input';
import { ROOM_BY_ID } from '../levels/rooms';
import { TITLE } from '../story/script';
import { SCENES } from './keys';
import { ensureRoomTexture, roomCanvas } from './RoomScene';

export class TitleScene extends Phaser.Scene {
  private sim!: RoomSim;
  private tex!: Phaser.Textures.CanvasTexture;
  private flashText!: Phaser.GameObjects.Text;
  private startText!: Phaser.GameObjects.Text;
  private leaving = false;

  constructor() {
    super(SCENES.Title);
  }

  create(): void {
    this.leaving = false;
    this.sim = new RoomSim(ROOM_BY_ID['1-1']!);
    this.sim.p.x = -400; // no player on the title
    // a new game: the once-per-game tip, captions and hint cards come back. Reset AFTER building the backdrop sim,
    // which would otherwise use up 1-1's "move" card on the title screen.
    RoomSim.resetRun();
    this.tex = ensureRoomTexture(this);
    roomCanvas().setRoom(this.sim, 0, false);
    this.add.image(0, 0, 'roomcv').setOrigin(0, 0);
    const cx = VIEW.width / 2;
    if (this.textures.exists('crayon_logo')) {
      const logo = this.add.image(cx, VIEW.height * 0.36, 'crayon_logo');
      logo.setScale(Math.min(1, 760 / logo.width));
      this.tweens.add({ targets: logo, y: logo.y - 8, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else {
      this.add.text(cx, VIEW.height * 0.36, TITLE.name, { fontFamily: FONTS.hand, fontSize: '140px', color: '#FFD400' }).setOrigin(0.5);
    }
    this.startText = this.add
      .text(cx, VIEW.height * 0.66, TITLE.start, { fontFamily: FONTS.ui, fontSize: '28px', fontStyle: 'bold', color: '#e9eefc' })
      .setOrigin(0.5)
      .setShadow(0, 2, '#000', 6, true, true);
    this.tweens.add({ targets: this.startText, alpha: 0.35, duration: 900, yoyo: true, repeat: -1 });
    this.flashText = this.add
      .text(cx, VIEW.height - 34, '', { fontFamily: FONTS.ui, fontSize: '16px', fontStyle: 'bold', color: '#8fa3c7' })
      .setOrigin(0.5);
    this.refreshFlash();
    audio.setMusic('game', 1);
    audio.setRain(1, 0.5);
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  private refreshFlash(): void {
    this.flashText.setText(`${TITLE.flashNotice}   ·   ${settings.reduceFlashing ? TITLE.flashOn : TITLE.flashOff}`);
  }

  update(_t: number, delta: number): void {
    const dt = Math.min(delta / 1000, 1 / 30);
    this.sim.p.x = -400;
    this.sim.update(dt, NO_INPUT);
    this.sim.messages.length = 0;
    roomCanvas().render(dt, { reduceFlashing: settings.reduceFlashing, restored: false, rainScale: 1, noHero: true, noUi: true });
    this.tex.refresh();
    if (this.leaving) return;
    if (input.pressed('f')) {
      settings.reduceFlashing = !settings.reduceFlashing;
      audio.sfx.ui();
      this.refreshFlash();
      return;
    }
    if (input.anyPressed()) {
      this.leaving = true;
      audio.start();
      audio.sfx.ui();
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(420, () => {
        const first = sceneFor(FLOW[0]!);
        this.scene.start(first.key, first.data);
      });
    }
  }
}
