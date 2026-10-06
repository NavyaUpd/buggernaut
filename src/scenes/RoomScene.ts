// Hosts one room at a time: drives RoomSim, renders RoomCanvas into a CanvasTexture, chains rooms with a panel slide.
import Phaser from 'phaser';
import { audio } from '../audio';
import { endsChapter, goNext, nextStep } from '../game/RoomFlow';
import { RoomSim, runLives, type SimInput } from '../game/RoomSim';
import { LIVES } from '../config';
import { LIVES_TEXT } from '../story/script';
import { input, settings } from '../input';
import { ROOM_BY_ID, ROOMS } from '../levels/rooms';
import { RoomCanvas } from '../render/RoomCanvas';
import { SCENES, type RoomData } from './keys';

let shared: RoomCanvas | null = null;
/** One compositor for the whole game (keeps the previous frame for panel slides). */
export function roomCanvas(): RoomCanvas {
  return (shared ??= new RoomCanvas());
}
const TEX = 'roomcv';
/** Smoothed per-frame cost in ms (read via window.__bijli.perf). */
export const perf = { sim: 0, render: 0, upload: 0 };

export function readInput(): SimInput {
  return {
    left: input.left,
    right: input.right,
    up: input.up,
    down: input.downKey,
    jumpPressed: input.pressed(' '),
    upPressed: input.pressed('w') || input.pressed('arrowup'),
    jumpHeld: input.isDown(' '),
    interact: input.interact,
    interactPressed: input.pressed('e'),
  };
}

export function ensureRoomTexture(scene: Phaser.Scene): Phaser.Textures.CanvasTexture {
  const rc = roomCanvas();
  const ex = scene.textures.get(TEX);
  if (ex && ex.key === TEX) return ex as Phaser.Textures.CanvasTexture;
  return scene.textures.addCanvas(TEX, rc.out)!;
}

export class RoomScene extends Phaser.Scene {
  sim!: RoomSim;
  private tex!: Phaser.Textures.CanvasTexture;
  private roomId = '1-1';
  private leaving = 0; // seconds into the leave sequence
  private finaleT = -1;
  private rainScale = 1;
  private countedDeaths = 0;
  private resetPending = false;

  constructor() {
    super(SCENES.Room);
  }

  init(data: Partial<RoomData>): void {
    this.roomId = data.roomId && ROOM_BY_ID[data.roomId] ? data.roomId : '1-1';
  }

  create(): void {
    this.tex = ensureRoomTexture(this);
    this.add.image(0, 0, TEX).setOrigin(0, 0);
    const rc = roomCanvas();
    if (this.textures.exists('crayon_drawing')) rc.drawingImg = this.textures.get('crayon_drawing').getSourceImage() as CanvasImageSource;
    this.loadRoom(this.roomId, false);
    audio.setMusic('game', 1);
    this.events.on(Phaser.Scenes.Events.RESUME, () => input.endFrame());
  }

  loadRoom(id: string, slide: boolean): void {
    this.roomId = id;
    const def = ROOM_BY_ID[id]!;
    this.sim = new RoomSim(def);
    this.countedDeaths = 0;
    if (runLives.chapter !== def.chapter) {
      runLives.chapter = def.chapter;
      runLives.lives = LIVES.perChapter;
    }
    this.leaving = 0;
    this.finaleT = -1;
    this.rainScale = 1;
    roomCanvas().setRoom(this.sim, ROOMS.indexOf(def), slide);
    audio.setRain(def.rain ?? 1, 1);
    audio.setGrind(false);
    audio.setBijli(false);
    if (slide) audio.sfx.slide();
  }

  restartRoom(): void {
    this.loadRoom(this.roomId, false);
  }

  /** Leave this room now (pause → Skip room, or after it is finished). */
  advance(): void {
    const nxt = nextStep({ kind: 'room', roomId: this.roomId });
    if (nxt && nxt.kind === 'room') this.loadRoom(nxt.roomId, true);
    else {
      audio.setHum(0);
      audio.setGrind(false);
      goNext(this, { kind: 'room', roomId: this.roomId });
    }
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 1 / 30);
    if (input.pressed('escape') || input.pressed('p')) {
      audio.sfx.ui();
      this.scene.launch(SCENES.Pause);
      this.scene.pause();
      return;
    }
    if (input.pressed('r') && !this.sim.done) this.restartRoom();
    const sim = this.sim;
    const t0 = performance.now();
    sim.update(dt, readInput());
    if (sim.deaths > this.countedDeaths) {
      this.countedDeaths = sim.deaths;
      runLives.lives = Math.max(0, runLives.lives - 1);
      sim.stamps.push({ text: LIVES_TEXT.lost, x: 1280 - 140, y: 100, t: 0, rot: -0.06, fill: '#ff3b30', size: 30, life: 1.4 });
      sim.hintOnce('lives');
      if (runLives.lives === 0) this.resetPending = true;
    }
    if (this.resetPending && !sim.dying) {
      // out of helmets: this street starts over (splices + breakers reset), helmets refill
      this.resetPending = false;
      runLives.lives = LIVES.perChapter;
      this.loadRoom(this.roomId, false);
      this.sim.captions.unshift({ text: LIVES_TEXT.reset, t: 0, dur: 3 });
      return;
    }
    if (sim.done) this.updateLeave(dt);
    const t1 = performance.now();
    roomCanvas().render(dt, {
      reduceFlashing: settings.reduceFlashing,
      restored: sim.done && endsChapter(this.roomId) && this.roomId !== '4-1',
      rainScale: this.rainScale,
      lives: runLives.lives,
      maxLives: LIVES.perChapter,
    });
    const t2 = performance.now();
    this.tex.refresh();
    const t3 = performance.now();
    const k = 0.05;
    perf.sim += (t1 - t0 - perf.sim) * k;
    perf.render += (t2 - t1 - perf.render) * k;
    perf.upload += (t3 - t2 - perf.upload) * k;
  }

  private updateLeave(dt: number): void {
    this.leaving += dt;
    const id = this.roomId;
    if (id === '4-1') {
      // finale step 1: the rain fades over 2 s, the music drops to a plucked motif, hold 1 s on the lit window
      if (this.finaleT < 0) {
        this.finaleT = 0;
        audio.setRain(0, 2);
        audio.setMusic('finaleMotif', 1.5);
        audio.setHum(0);
      }
      this.finaleT += dt;
      this.rainScale = Math.max(0, 1 - this.finaleT / 2);
      if (this.finaleT > 3.2) {
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.finaleT = -99;
        this.time.delayedCall(650, () => goNext(this, { kind: 'room', roomId: id }));
      }
      return;
    }
    if (endsChapter(id)) {
      if (this.leaving > 0.05 && this.leaving - dt <= 0.05) audio.sfx.restored();
      if (this.leaving > 2.2) {
        this.leaving = -999;
        this.advance();
      }
      return;
    }
    if (this.leaving > 0.25) {
      this.leaving = -999;
      this.advance();
    }
  }
}

