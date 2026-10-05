// One room's game state + rules (§5, §6). No Phaser, no DOM: driven by RoomScene, read by RoomCanvas.
import { audio } from '../audio';
import { BIJLI, BREAKER, LIGHTNING, PLAYER, RAIL, SEQ, SPLICE, VIEW } from '../config';
import { Circuits } from '../core/circuits';
import { ease, inQuad, wipeX } from '../core/geom';
import { parseRoom, poleAt, type ParsedRail, type ParsedRoom, type PoleRun } from '../core/roomParse';
import { BijliTimer, strikeOffset, strikePhase } from '../core/timers';
import type { RoomDef, Tile } from '../levels/rooms';
import { GAME_TEXT } from '../story/script';

const T = VIEW.tile;
const OY = VIEW.offsetY;
const W = VIEW.width;
const H = VIEW.height;
const rnd = Math.random;

export interface SimInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jumpPressed: boolean; // Space this frame (W/↑ handled inside: jumps only when not at a pole)
  upPressed: boolean;
  jumpHeld: boolean; // Space held
  interact: boolean; // E held
  interactPressed: boolean; // E this frame
}

export const NO_INPUT: SimInput = {
  left: false,
  right: false,
  up: false,
  down: false,
  jumpPressed: false,
  upPressed: false,
  jumpHeld: false,
  interact: false,
  interactPressed: false,
};

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  c?: string;
  g?: number; // gravity scale
}
export interface Stamp {
  text: string;
  x: number;
  y: number;
  t: number;
  rot: number;
  fill: string;
  size: number;
  life: number;
}
export interface Bubble {
  text: string;
  x: number;
  y: number;
  t: number;
  life: number;
  tip?: boolean;
}
export interface Caption {
  text: string;
  t: number;
  dur: number;
}

export interface Player {
  x: number; // centre
  y: number; // feet
  vx: number;
  vy: number;
  face: 1 | -1;
  ground: boolean;
  coyote: number;
  buffer: number;
  varJ: number;
  varSpeed: number;
  climb: PoleRun | null;
  grind: { rail: ParsedRail; s: number; dir: 1 | -1 } | null;
  usedDouble: boolean;
  anim: number;
  squash: number;
  lean: number;
  idleT: number;
  shakeOff: number;
  hurt: number;
  celebrate: number;
  bounceCd: number;
}

export interface LampState {
  pulse: number; // -1 none, else 0..1 progress of the energy pulse along the wire
  powerT: number; // -1 off, else seconds since the lamp started (SEQ timeline)
  offT: number; // -1, else reverse bloom progress 0..1
  bubbled: boolean;
}

export type Death = 'pit' | 'snake' | 'water' | 'strike';

export class RoomSim {
  readonly room: ParsedRoom;
  readonly def: RoomDef;
  readonly circuits: Circuits;
  readonly bijli = new BijliTimer();
  /** Global across rooms: the "switch it off first!" tip shows only once per game. */
  static tipShown = false;
  static firstBloomSeen = false;

  t = 0;
  strikeT = 0;
  p: Player;
  lamps: LampState[];
  drawings: { at: Tile; taken: boolean; respawn: number }[];
  snakeSquash: number[];

  // splice / breaker
  spliceHold = 0;
  spliceBeats = 0;
  spliceTarget: Tile | null = null;
  spliceArmed = true;
  breakerCd = 0;
  spliceSnap: Map<string, number> = new Map(); // time each splice was completed (cable snaps straight)

  // lightning
  nextBolt: number;
  telegraph = 0;
  peek = 0;
  flash = 0;
  bolt: { pts: [number, number][]; fork: [number, number][][]; t: number } | null = null;
  thunderIn = -1;
  wind = 0;

  // skyline bloom (3-3)
  skylineT = -Infinity;

  // flow
  hitStop = 0;
  shake = 0;
  dying: { t: number; cause: Death } | null = null;
  respawnFlash = 0;
  done = false;
  doneT = 0;
  prompt: { text: string; x: number; y: number; progress: number } | null = null;
  hum = 0;
  lightAtFeet = 0;
  wasComic = false;

  // fx
  sparks: Particle[] = [];
  splashes: Particle[] = [];
  stars: Particle[] = [];
  drips: Particle[] = [];
  ripples: { x: number; y: number; r: number; t: number }[] = [];
  stamps: Stamp[] = [];
  bubbles: Bubble[] = [];
  captions: Caption[] = [];
  speedLines: Particle[] = [];

  constructor(def: RoomDef) {
    this.def = def;
    this.room = parseRoom(def);
    this.circuits = new Circuits(def.circuits);
    this.lamps = this.room.lamps.map(() => ({ pulse: -1, powerT: -1, offT: -1, bubbled: false }));
    this.drawings = this.room.drawings.map((at) => ({ at, taken: false, respawn: 0 }));
    this.snakeSquash = this.room.snakes.map(() => 0);
    this.p = this.freshPlayer();
    this.nextBolt = def.firstFlash ?? LIGHTNING.firstAt;
    this.captions.push({ text: def.caption, t: -0.4, dur: 3 });
  }

  private freshPlayer(): Player {
    const [sx, sy] = this.room.spawn;
    return {
      x: sx * T + T / 2,
      y: (sy + 1) * T + OY,
      vx: 0,
      vy: 0,
      face: 1,
      ground: true,
      coyote: 0,
      buffer: 0,
      varJ: 0,
      varSpeed: PLAYER.jumpSpeed,
      climb: null,
      grind: null,
      usedDouble: false,
      anim: 0,
      squash: 1,
      lean: 0,
      idleT: 0,
      shakeOff: 0,
      hurt: 0,
      celebrate: 0,
      bounceCd: 0,
    };
  }

  // ───────────────────────────── light queries ─────────────────────────────

  lampLit(i: number): boolean {
    const l = this.lamps[i];
    return !!l && l.powerT >= SEQ.color1;
  }
  skylineFull(): boolean {
    return this.skylineT >= 2.8;
  }
  /** Gameplay light: inside a finished panel, BIJLI, or the completed skyline page. Lightning peeks don't count. */
  isLit(px: number, py: number): boolean {
    if (this.bijli.active || this.skylineFull()) return true;
    return this.room.lamps.some((l, i) => this.lampLit(i) && inQuad(px, py, l.quad));
  }
  /** Render light: also covers the colour sweep in progress and the lightning peek. */
  inComic(px: number, py: number): boolean {
    if (this.peek > 0.2 || this.bijli.active || this.skylineFull()) return true;
    return this.room.lamps.some((l, i) => {
      const k = this.seq(i).color;
      return k > 0 && inQuad(px, py, l.quad) && px < wipeX(l.box, ease.outCubic(k), py);
    });
  }
  seq(i: number): { lampOn: boolean; pool: number; sketch: number; color: number; pop: number; fade: number } {
    const l = this.lamps[i];
    const t = l ? l.powerT : -1;
    if (l && l.offT >= 0) {
      const f = 1 - l.offT;
      return { lampOn: f > 0.5, pool: f, sketch: 1, color: 1, pop: 1, fade: f };
    }
    if (t < 0) return { lampOn: false, pool: 0, sketch: 0, color: 0, pop: 0, fade: 1 };
    const lampOn = t > 0.3 || (t > 0 && t < 0.08) || (t > 0.16 && t < 0.22);
    return {
      lampOn,
      pool: ease.outCubic(ease.clamp(t / SEQ.pool)),
      sketch: ease.clamp((t - SEQ.sketch0) / (SEQ.sketch1 - SEQ.sketch0)),
      color: ease.clamp((t - SEQ.color0) / (SEQ.color1 - SEQ.color0)),
      pop: ease.clamp((t - SEQ.color1) / 0.25),
      fade: 1,
    };
  }
  railGrindable(r: ParsedRail): boolean {
    if (this.bijli.active) return true;
    if (r.circuit === null || !this.circuits.powered(r.circuit)) return false;
    for (let i = 0; i <= 12; i++) {
      const k = i / 12;
      if (!this.isLit(r.ax + (r.bx - r.ax) * k, r.ay + (r.by - r.ay) * k - 20)) return false;
    }
    return true;
  }
  snakeLit(i: number): boolean {
    const s = this.room.snakes[i]!;
    return this.isLit(((s.x0 + s.x1 + 1) / 2) * T, s.y * T + OY + 16);
  }
  waterLive(): boolean {
    return this.circuits.waterLive();
  }
  exitOpen(): boolean {
    if (!this.def.gatedExit) return true;
    return this.circuits.allPowered() && this.room.lamps.every((_, i) => this.lampLit(i));
  }
  strikeStates() {
    return this.def.strikes.map((s, i) => ({ ...s, ...strikePhase(this.strikeT, strikeOffset(i)) }));
  }

  // ───────────────────────────── collision helpers ─────────────────────────────

  private hitsSolid(x: number, y: number, w = PLAYER.hitbox.w, h = PLAYER.hitbox.h): boolean {
    const x0 = Math.floor((x - w / 2) / T);
    const x1 = Math.floor((x + w / 2 - 1) / T);
    const y0 = Math.floor((y - h - OY) / T);
    const y1 = Math.floor((y - 1 - OY) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.room.solid(tx, ty)) return true;
    return false;
  }
  private isPoleTop(tx: number, ty: number): boolean {
    return this.room.climbable(tx, ty) && !this.room.climbable(tx, ty - 1);
  }
  /** Platform you land on from above (excluding full solids). */
  private oneWayAt(tx: number, ty: number, down: boolean): boolean {
    const r = this.room;
    if (r.oneway(tx, ty)) return true;
    if (r.cloud(tx, ty)) return this.isLit(tx * T + 16, ty * T + OY + 16);
    if (this.isPoleTop(tx, ty) && !down) {
      // only the pole column under the player's centre
      return Math.floor(this.p.x / T) === tx;
    }
    return false;
  }
  /** Cells overlapped by the hitbox grown by `grow` px. */
  private overlapCells(grow: number): Tile[] {
    const { x, y } = this.p;
    const w = PLAYER.hitbox.w / 2 + grow;
    const x0 = Math.floor((x - w) / T);
    const x1 = Math.floor((x + w - 1) / T);
    const y0 = Math.floor((y - PLAYER.hitbox.h - grow - OY) / T);
    const y1 = Math.floor((y + grow - 1 - OY) / T);
    const out: Tile[] = [];
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) out.push([tx, ty]);
    return out;
  }
  private climbableUnder(): PoleRun | undefined {
    const tx = Math.floor(this.p.x / T);
    for (const dy of [-1, -28, -50]) {
      const ty = Math.floor((this.p.y + dy - OY) / T);
      const pr = poleAt(this.room, tx, ty);
      if (pr) return pr;
    }
    return undefined;
  }

  // ───────────────────────────── main update ─────────────────────────────

  update(dt: number, inp: SimInput): void {
    this.t += dt;
    this.wind = 0.6 + 0.4 * Math.sin(this.t * 0.35) + 0.25 * Math.sin(this.t * 1.3);
    this.updateFx(dt);
    if (this.done) {
      this.doneT += dt;
      return;
    }
    if (this.dying) {
      this.dying.t += dt;
      if (this.dying.t >= PLAYER.respawnFreeze + PLAYER.respawnFade) this.respawn();
      return;
    }
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      return;
    }
    this.strikeT += dt;
    this.updateLightning(dt);
    this.updateLamps(dt);
    this.updateBijli(dt);
    this.updatePlayer(dt, inp);
    this.updateInteract(dt, inp);
    this.updateHazards();
    this.updateAmbient(dt);
    this.updateExit();
  }

  private updatePlayer(dt: number, inp: SimInput): void {
    const p = this.p;
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const splicing = this.spliceHold > 0;
    p.bounceCd = Math.max(0, p.bounceCd - dt);
    p.hurt = Math.max(0, p.hurt - dt);
    const nearPole = this.climbableUnder();
    // W/↑ jumps only when not on or at a pole
    if (inp.jumpPressed || (inp.upPressed && !p.climb && !nearPole)) p.buffer = PLAYER.jumpBuffer;
    const jumpHeld = inp.jumpHeld || (inp.up && !p.climb && !nearPole);

    if (p.grind) {
      this.updateGrind(dt);
      return;
    }

    // grab a pole / ladder
    if (!p.climb && !splicing) {
      const tx = Math.floor(p.x / T);
      const below = Math.floor((p.y + 4 - OY) / T);
      const onTop = p.ground && this.isPoleTop(tx, below);
      if (nearPole && (inp.up || (inp.down && !p.ground))) this.startClimb(nearPole);
      else if (onTop && inp.down) {
        const pr = poleAt(this.room, tx, below);
        if (pr) {
          this.startClimb(pr);
          p.y += 6;
        }
      }
    }

    if (p.climb) {
      const pr = p.climb;
      const px = pr.x * T + T / 2;
      if (dir) p.face = dir > 0 ? -1 : 1; // face the pole: holding right puts you on its left side
      // hang beside the pole, on whichever side isn't a wall
      if (this.hitsSolid(px - 10 * p.face, p.y)) p.face = -p.face as 1 | -1;
      const side = this.hitsSolid(px - 10 * p.face, p.y) ? 0 : 10 * p.face;
      p.x += (px - side - p.x) * Math.min(1, dt * 18);
      p.vy = splicing ? 0 : inp.up ? -PLAYER.climbUp : inp.down ? PLAYER.climbDown : 0;
      const topY = pr.top * T + OY;
      const botY = (pr.bottom + 1) * T + OY;
      const before = p.y;
      p.y += p.vy * dt;
      if (Math.floor(before / 22) !== Math.floor(p.y / 22) && p.vy !== 0) audio.sfx.climbTick();
      p.anim += Math.abs(p.vy) * dt * 0.06;
      if (p.y <= topY) {
        // reached the top: stand on it
        p.y = topY;
        p.x = px;
        p.climb = null;
        p.ground = true;
        p.vy = 0;
      } else if (p.y >= botY) {
        p.y = botY;
        if (this.hitsSolidBelow()) {
          if (inp.down) p.climb = null;
        }
      }
      if (p.climb && p.buffer > 0 && !inp.interact) {
        p.climb = null;
        p.buffer = 0;
        p.vy = -PLAYER.poleJumpOff.vy;
        p.vx = dir * PLAYER.poleJumpOff.vx;
        if (dir) p.face = dir > 0 ? 1 : -1;
        p.varJ = 0.12;
        p.varSpeed = PLAYER.poleJumpOff.vy;
        p.squash = 1.15;
        audio.sfx.jump();
      }
      if (p.climb) {
        this.tryAttachFromPoleTop(inp);
        return;
      }
    }

    // run
    if (dir && !splicing) p.face = dir > 0 ? 1 : -1;
    const mult = p.ground ? 1 : PLAYER.airMult;
    const target = splicing ? 0 : dir * PLAYER.maxRun;
    const acc = Math.abs(p.vx) > PLAYER.maxRun && Math.sign(p.vx) === dir ? PLAYER.runReduce : dir ? PLAYER.runAccel : PLAYER.runReduce * 2;
    p.vx += Math.sign(target - p.vx) * Math.min(Math.abs(target - p.vx), acc * mult * dt);
    // gravity
    let g = PLAYER.gravity;
    if (Math.abs(p.vy) < PLAYER.halfGravThreshold && jumpHeld) g *= 0.5;
    p.vy = Math.min(inp.down ? PLAYER.fastMaxFall : PLAYER.maxFall, p.vy + g * dt);
    if (p.varJ > 0) {
      if (jumpHeld) p.vy = Math.min(p.vy, -p.varSpeed);
      else p.varJ = 0;
      p.varJ -= dt;
    }
    p.coyote = p.ground ? PLAYER.coyoteTime : p.coyote - dt;
    p.buffer -= dt;
    if (p.buffer > 0 && !splicing) {
      if (p.coyote > 0) {
        p.vy = -PLAYER.jumpSpeed;
        p.vx += dir * PLAYER.jumpHBoost;
        p.varJ = PLAYER.varJumpTime;
        p.varSpeed = PLAYER.jumpSpeed;
        p.buffer = 0;
        p.coyote = 0;
        p.ground = false;
        p.squash = 1.15;
        audio.sfx.jump();
        for (let i = 0; i < 5; i++) this.splashes.push({ x: p.x + (rnd() - 0.5) * 16, y: p.y, vx: (rnd() - 0.5) * 120, vy: -rnd() * 140, t: 0.35 });
      } else if (this.bijli.active && !p.usedDouble) {
        p.usedDouble = true;
        p.vy = -PLAYER.doubleJumpSpeed;
        p.varJ = PLAYER.doubleJumpVarTime;
        p.varSpeed = PLAYER.doubleJumpSpeed;
        p.buffer = 0;
        p.squash = 1.15;
        audio.sfx.jump();
        for (let i = 0; i < 10; i++)
          this.stars.push({ x: p.x + (rnd() - 0.5) * 20, y: p.y, vx: (rnd() - 0.5) * 220, vy: rnd() * 120, t: 0.4, c: '#4ff0ff' });
      }
    }
    // horizontal move
    const nx = p.x + p.vx * dt;
    // never soft-lock: if the hitbox is already embedded (knockback into a corner), let it move out freely
    if (!this.hitsSolid(p.x, p.y) && this.hitsSolid(nx, p.y)) {
      const s = Math.sign(p.vx);
      let guard = 64;
      while (!this.hitsSolid(p.x + s, p.y) && guard-- > 0) p.x += s;
      p.vx = 0;
    } else p.x = nx;
    p.x = Math.max(PLAYER.hitbox.w / 2, Math.min(W - PLAYER.hitbox.w / 2, p.x));
    // vertical move + landing
    const was = p.ground;
    const prevY = p.y;
    p.ground = false;
    let ny = p.y + p.vy * dt;
    if (p.vy >= 0) {
      const x0 = Math.floor((p.x - PLAYER.hitbox.w / 2) / T);
      const x1 = Math.floor((p.x + PLAYER.hitbox.w / 2 - 1) / T);
      const yA = Math.floor((p.y - OY) / T);
      const yB = Math.floor((ny - OY) / T);
      for (let ty = yA; ty <= yB; ty++) {
        let hit = false;
        for (let tx = x0; tx <= x1; tx++) {
          if (this.room.solid(tx, ty) || (this.oneWayAt(tx, ty, inp.down && !this.room.cloud(tx, ty)) && p.y - OY <= ty * T + 1)) hit = true;
        }
        if (hit) {
          ny = ty * T + OY;
          p.vy = 0;
          p.ground = true;
          break;
        }
      }
      p.y = ny;
    } else {
      if (this.hitsSolid(p.x, ny)) {
        p.vy = 0;
        p.varJ = 0;
      } else p.y = ny;
    }
    if (p.ground) p.usedDouble = false;
    if (p.ground && !was) {
      p.squash = 0.85;
      for (let i = 0; i < 8; i++) this.splashes.push({ x: p.x + (rnd() - 0.5) * 22, y: p.y, vx: (rnd() - 0.5) * 200, vy: -rnd() * 180, t: 0.45 });
      audio.sfx.land();
    }
    const prevA = p.anim;
    p.anim += Math.abs(p.vx) * dt * 0.032;
    if (p.ground && Math.floor(prevA / Math.PI) !== Math.floor(p.anim / Math.PI)) {
      audio.sfx.step();
      this.splashes.push({ x: p.x + p.face * 6, y: p.y, vx: -p.face * 40, vy: -60, t: 0.25 });
    }
    // fall onto a rail
    if (!p.ground && p.vy > 0) {
      for (const r of this.room.rails) {
        const lo = Math.min(r.ax, r.bx) + 6;
        const hi = Math.max(r.ax, r.bx) - 6;
        if (p.x < lo || p.x > hi) continue;
        const k = (p.x - r.ax) / (r.bx - r.ax);
        const ry = r.ay + (r.by - r.ay) * k;
        if (prevY <= ry + 2 && p.y >= ry - RAIL.attachPx && this.railGrindable(r)) {
          const d: 1 | -1 = Math.sign(r.bx - r.ax) * p.face > 0 ? 1 : -1;
          this.startGrind(r, k, d);
          return;
        }
      }
    }
    // idle shake-off
    if (p.ground && Math.abs(p.vx) < 5) p.idleT += dt;
    else {
      p.idleT = 0;
      p.shakeOff = 0;
    }
    if (p.idleT > 4 && p.shakeOff <= 0) {
      p.shakeOff = 0.7;
      p.idleT = 0;
      for (let i = 0; i < 16; i++)
        this.splashes.push({ x: p.x + (rnd() - 0.5) * 30, y: p.y - 30 - rnd() * 30, vx: (rnd() - 0.5) * 320, vy: -rnd() * 200, t: 0.5 });
    }
    p.shakeOff = Math.max(0, p.shakeOff - dt);
    this.tryAttachFromPoleTop(inp);
  }

  private hitsSolidBelow(): boolean {
    const tx = Math.floor(this.p.x / T);
    const ty = Math.floor((this.p.y + 1 - OY) / T);
    return this.room.solid(tx, ty) || this.room.oneway(tx, ty);
  }

  private startClimb(pr: PoleRun): void {
    const p = this.p;
    p.climb = pr;
    p.vx = 0;
    p.vy = 0;
    p.varJ = 0;
    p.ground = false;
    p.usedDouble = false;
    const topY = pr.top * T + OY + 2;
    const botY = (pr.bottom + 1) * T + OY;
    p.y = Math.max(topY, Math.min(botY, p.y));
  }

  /** At a pole top, pressing toward the far end of a grindable rail snaps onto it. */
  private tryAttachFromPoleTop(inp: SimInput): void {
    const p = this.p;
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (!dir || this.spliceHold > 0) return;
    for (const r of this.room.rails) {
      for (const end of [0, 1] as const) {
        const ex = end ? r.bx : r.ax;
        const ey = end ? r.by : r.ay;
        const ox = end ? r.ax : r.bx;
        if (Math.sign(ox - ex) !== dir) continue;
        const atTop = (p.ground || p.climb) && Math.abs(p.x - ex) < 18 && p.y >= ey - 4 && p.y <= ey + (p.climb ? 70 : 4);
        if (atTop && this.railGrindable(r)) {
          const d: 1 | -1 = end ? -1 : 1;
          this.startGrind(r, end, d);
          return;
        }
      }
    }
  }

  private startGrind(r: ParsedRail, s: number, dir: 1 | -1): void {
    const p = this.p;
    p.grind = { rail: r, s, dir };
    p.climb = null;
    p.ground = false;
    p.vy = 0;
    p.varJ = 0;
    p.usedDouble = false;
    p.face = Math.sign(r.bx - r.ax) * dir > 0 ? 1 : -1;
    audio.setGrind(true);
    this.shake = Math.max(this.shake, 2);
    for (let i = 0; i < 12; i++) this.sparks.push({ x: p.x, y: p.y, vx: (rnd() - 0.5) * 300, vy: -rnd() * 260, t: 0.4 });
  }

  private updateGrind(dt: number): void {
    const p = this.p;
    const g = p.grind!;
    const r = g.rail;
    if (!this.railGrindable(r)) {
      // power or BIJLI gone: fall
      p.grind = null;
      audio.setGrind(false);
      p.vx = 0;
      p.vy = 0;
      return;
    }
    const len = Math.hypot(r.bx - r.ax, r.by - r.ay);
    const speed = this.bijli.active ? PLAYER.grindSpeedBijli : PLAYER.grindSpeed;
    g.s += (g.dir * speed * dt) / len;
    const k = Math.max(0, Math.min(1, g.s));
    p.x = r.ax + (r.bx - r.ax) * k;
    p.y = r.ay + (r.by - r.ay) * k;
    p.vx = (Math.sign(r.bx - r.ax) * g.dir * speed * Math.abs(r.bx - r.ax)) / len;
    p.anim += dt * 8;
    p.buffer -= dt;
    if (rnd() < 0.9) this.sparks.push({ x: p.x - p.face * 6, y: p.y, vx: -p.vx * 0.3 + (rnd() - 0.5) * 120, vy: -rnd() * 160, t: 0.3 });
    if (rnd() < 0.5) this.speedLines.push({ x: p.x - p.face * (30 + rnd() * 60), y: p.y - 10 - rnd() * 50, vx: -p.vx * 0.2, vy: 0, t: 0.2 });
    if (p.buffer > 0) {
      p.grind = null;
      audio.setGrind(false);
      p.buffer = 0;
      p.vy = -PLAYER.jumpSpeed;
      p.varJ = PLAYER.varJumpTime;
      p.varSpeed = PLAYER.jumpSpeed;
      p.squash = 1.15;
      audio.sfx.jump();
      return;
    }
    if (g.s >= 1 || g.s <= 0) {
      const endX = g.s >= 1 ? r.bx : r.ax;
      const endY = g.s >= 1 ? r.by : r.ay;
      const xdir = Math.sign(p.vx);
      // chain onto another rail leaving the same pole top in the same direction
      for (const o of this.room.rails) {
        if (o === r || !this.railGrindable(o)) continue;
        if (Math.abs(o.ax - endX) < 2 && Math.abs(o.ay - endY) < 2 && Math.sign(o.bx - o.ax) === xdir) {
          p.grind = { rail: o, s: 0, dir: 1 };
          return;
        }
        if (Math.abs(o.bx - endX) < 2 && Math.abs(o.by - endY) < 2 && Math.sign(o.ax - o.bx) === xdir) {
          p.grind = { rail: o, s: 1, dir: -1 };
          return;
        }
      }
      p.grind = null;
      audio.setGrind(false);
      const pr = poleAt(this.room, Math.floor(endX / T), Math.round((endY - OY) / T));
      if (pr) {
        this.startClimb(pr);
        p.y = pr.top * T + OY + 44;
        p.face = xdir > 0 ? 1 : -1;
      }
      p.vx = 0;
    }
  }

  // ───────────────────────────── splice / breakers ─────────────────────────────

  private updateInteract(dt: number, inp: SimInput): void {
    const p = this.p;
    this.breakerCd = Math.max(0, this.breakerCd - dt);
    this.prompt = null;
    if (!inp.interact) this.spliceArmed = true;
    const cells = this.overlapCells(SPLICE.reachPx);
    const has = (ch: string) => cells.find(([x, y]) => this.room.cell(x, y) === ch);
    const x = cells.find(([cx, cy]) => this.room.cell(cx, cy) === 'X' && !this.circuits.isSpliced([cx, cy]));
    const b = has('B') ?? has('M');
    if (x && !p.grind) {
      const [cx, cy] = x;
      this.prompt = { text: GAME_TEXT.holdE, x: cx * T + 16, y: cy * T + OY - 30, progress: this.spliceHold / SPLICE.holdTime };
      if (inp.interact && this.spliceArmed) {
        if (this.spliceHold === 0 && this.circuits.wouldShock([cx, cy])) {
          this.shock([cx, cy]);
          return;
        }
        this.spliceTarget = [cx, cy];
        this.spliceHold += dt;
        const beat = SPLICE.beats.filter((t) => this.spliceHold >= t).length;
        if (beat > this.spliceBeats) {
          this.spliceBeats = beat;
          this.shake = Math.max(this.shake, 2);
          audio.sfx.twist(beat as 1 | 2 | 3);
          for (let i = 0; i < 16; i++)
            this.sparks.push({ x: cx * T + 16, y: cy * T + OY + 8, vx: (rnd() - 0.5) * 420, vy: -rnd() * 320, t: 0.5 });
        }
        if (this.spliceHold >= SPLICE.holdTime) this.completeSplice([cx, cy]);
      } else this.cancelSplice();
    } else this.cancelSplice();

    if (b && !p.grind) {
      const [bx, by] = b;
      if (!x) this.prompt = { text: GAME_TEXT.pressE, x: bx * T + 16, y: by * T + OY - 34, progress: 0 };
      if (inp.interactPressed && this.breakerCd <= 0) {
        this.breakerCd = BREAKER.cooldown;
        this.toggleBreaker([bx, by]);
      }
    }
  }

  private cancelSplice(): void {
    this.spliceHold = 0;
    this.spliceBeats = 0;
    this.spliceTarget = null;
  }

  private shock(at: Tile): void {
    const p = this.p;
    this.spliceArmed = false;
    this.cancelSplice();
    const sx = at[0] * T + 16;
    const away = p.x === sx ? -p.face : Math.sign(p.x - sx);
    p.climb = null;
    p.ground = false;
    p.vx = away * SPLICE.shockKnock.vx;
    p.vy = -SPLICE.shockKnock.vy;
    p.varJ = 0;
    p.hurt = 0.5;
    this.shake = 6;
    this.flash = Math.max(this.flash, 0.12);
    audio.sfx.shock();
    this.stamps.push({ text: GAME_TEXT.shock, x: sx, y: at[1] * T + OY - 40, t: 0, rot: 0.1, fill: '#4ff0ff', size: 42, life: 0.9 });
    for (let i = 0; i < 26; i++) this.sparks.push({ x: sx, y: at[1] * T + OY + 10, vx: (rnd() - 0.5) * 600, vy: (rnd() - 0.7) * 500, t: 0.5 });
    if (!RoomSim.tipShown) {
      const c = this.circuits.circuitOfSplice(at);
      if (c?.breaker) {
        RoomSim.tipShown = true;
        this.bubbles.push({ text: GAME_TEXT.tip, x: c.breaker[0] * T + 16, y: c.breaker[1] * T + OY - 70, t: 0, life: 5, tip: true });
      }
    }
  }

  private completeSplice(at: Tile): void {
    const c = this.circuits.circuitOfSplice(at);
    const nowPowered = this.circuits.splice(at);
    this.spliceSnap.set(`${at[0]},${at[1]}`, this.t);
    this.cancelSplice();
    this.spliceArmed = false;
    this.hitStop = SPLICE.hitStop;
    this.shake = Math.max(this.shake, 5);
    audio.sfx.twistStamp();
    this.stamps.push({ text: GAME_TEXT.twist, x: at[0] * T + 16 + 80, y: at[1] * T + OY - 30, t: 0, rot: -0.12, fill: '#ffd400', size: 46, life: 1.2 });
    if (c && nowPowered) this.powerOn(c.id);
  }

  private toggleBreaker(at: Tile): void {
    const c = this.circuits.circuitOfBreaker(at);
    const wasPowered = c ? this.circuits.powered(c.id) : false;
    const closed = this.circuits.toggle(at);
    if (closed === null || !c) return;
    audio.sfx.breaker(closed);
    this.stamps.push({ text: GAME_TEXT.breaker, x: at[0] * T + 16, y: at[1] * T + OY - 50, t: 0, rot: -0.06, fill: closed ? '#2ecc71' : '#ff3b30', size: 30, life: 0.8 });
    this.shake = Math.max(this.shake, 2);
    const nowPowered = this.circuits.powered(c.id);
    if (!wasPowered && nowPowered) this.powerOn(c.id);
    if (wasPowered && !nowPowered) this.powerOff(c.id);
  }

  private powerOn(id: string): void {
    this.room.lamps.forEach((l, i) => {
      if (l.circuit !== id) return;
      const s = this.lamps[i]!;
      s.pulse = 0;
      s.powerT = -1;
      s.offT = -1;
      s.bubbled = false;
    });
    audio.sfx.pulse();
    const c = this.circuits.get(id);
    if (c?.master && this.def.skyline) this.skylineT = -SEQ.pulse - SEQ.color1;
  }

  private powerOff(id: string): void {
    this.room.lamps.forEach((l, i) => {
      if (l.circuit !== id) return;
      const s = this.lamps[i]!;
      if (s.powerT >= 0) s.offT = 0;
      s.powerT = -1;
      s.pulse = -1;
    });
  }

  private updateLamps(dt: number): void {
    let bubbleDone = false;
    this.room.lamps.forEach((l, i) => {
      const s = this.lamps[i]!;
      if (s.pulse >= 0) {
        s.pulse += dt / SEQ.pulse;
        if (s.pulse >= 1) {
          s.pulse = -1;
          s.powerT = 0;
        }
      }
      if (s.offT >= 0) {
        s.offT += dt / SEQ.offFade;
        if (s.offT >= 1) s.offT = -1;
      }
      if (s.powerT >= 0) {
        const p0 = s.powerT;
        s.powerT += dt;
        const p1 = s.powerT;
        for (const f of SEQ.flick) if (p0 < f && p1 >= f) audio.sfx.lampBuzz();
        if (p1 > SEQ.sketch0 && p1 < SEQ.color1 && Math.floor(p0 * 14) !== Math.floor(p1 * 14)) audio.sfx.penScratch();
        if (p0 < SEQ.color1 && p1 >= SEQ.color1) {
          audio.sfx.chime();
          if (!s.bubbled && !bubbleDone) {
            // one bubble per power-on, from the lamp nearest the player
            const same = this.room.lamps.filter((o) => o.circuit === l.circuit);
            const near = same.reduce((a, o) => (Math.abs(o.hx - this.p.x) < Math.abs(a.hx - this.p.x) ? o : a), l);
            const bx = Math.min(W - 160, Math.max(160, near.hx + 40));
            this.bubbles.push({ text: GAME_TEXT.powered, x: bx, y: Math.max(70, near.hy - 120), t: 0, life: 2.8 });
            same.forEach((o) => (this.lamps[o.idx]!.bubbled = true));
            bubbleDone = true;
          }
          if (this.def.dog && inQuad(this.def.dog[0] * T + 16, this.def.dog[1] * T + OY + 16, l.quad)) setTimeout(() => audio.sfx.woof(), 450);
          if (!RoomSim.firstBloomSeen) {
            RoomSim.firstBloomSeen = true;
            this.captions.push({ text: GAME_TEXT.firstBloom, t: -1.2, dur: 5 });
          }
        }
      }
    });
    if (Number.isFinite(this.skylineT)) {
      const before = this.skylineT;
      this.skylineT += dt;
      if (before < 2 && this.skylineT >= 2) audio.sfx.penScratch();
      if (before < 2.8 && this.skylineT >= 2.8) audio.sfx.restored();
    }
  }

  // ───────────────────────────── BIJLI + drawings ─────────────────────────────

  private updateBijli(dt: number): void {
    const ev = this.bijli.update(dt);
    if (ev === 'tick') audio.sfx.tick();
    if (ev === 'ended') this.endBijli(true);
    for (const d of this.drawings) {
      if (d.taken) {
        d.respawn -= dt;
        if (d.respawn <= 0) d.taken = false;
        continue;
      }
      const [dx, dy] = d.at;
      const cx = dx * T + 16;
      const cy = dy * T + OY + 16;
      const p = this.p;
      if (Math.abs(p.x - cx) < PLAYER.hitbox.w / 2 + 16 && p.y > cy - 20 && p.y - PLAYER.hitbox.h < cy + 20) {
        d.taken = true;
        d.respawn = BIJLI.drawingRespawn;
        this.bijli.start();
        audio.setBijli(true);
        audio.sfx.bijliPickup();
        this.shake = Math.max(this.shake, 3);
        this.stamps.push({ text: 'BIJLI!', x: p.x, y: p.y - 90, t: 0, rot: -0.08, fill: '#ff3e9a', size: 52, life: 1.1 });
        for (let i = 0; i < 24; i++)
          this.stars.push({ x: cx, y: cy, vx: (rnd() - 0.5) * 420, vy: (rnd() - 0.8) * 380, t: 0.6, c: i % 2 ? '#ffd400' : '#ff3e9a' });
      }
    }
  }

  private endBijli(withPoof: boolean): void {
    if (!this.bijli.active && !withPoof) return;
    this.bijli.stop();
    audio.setBijli(false);
    if (withPoof) {
      audio.sfx.poof();
      this.stamps.push({ text: GAME_TEXT.poof, x: this.p.x, y: this.p.y - 80, t: 0, rot: 0.08, fill: '#ffffff', size: 40, life: 0.9 });
      for (let i = 0; i < 18; i++)
        this.stars.push({ x: this.p.x, y: this.p.y - 30, vx: (rnd() - 0.5) * 300, vy: (rnd() - 0.5) * 300, t: 0.5, c: '#111', g: 0 });
    }
  }

  // ───────────────────────────── hazards ─────────────────────────────

  private updateHazards(): void {
    const p = this.p;
    const bijli = this.bijli.active;
    // pit
    if (p.y > H + 60) return this.die('pit');
    const x0 = p.x - PLAYER.hitbox.w / 2;
    const x1 = p.x + PLAYER.hitbox.w / 2;
    const y0 = p.y - PLAYER.hitbox.h;
    // snakes
    this.room.snakes.forEach((s, i) => {
      const sx0 = s.x0 * T + 2;
      const sx1 = (s.x1 + 1) * T - 2;
      const sy0 = s.y * T + OY + 10;
      const sy1 = (s.y + 1) * T + OY;
      if (x1 < sx0 || x0 > sx1 || p.y < sy0 || y0 > sy1) return;
      if (bijli || this.snakeLit(i)) {
        if (p.bounceCd <= 0) {
          p.bounceCd = 0.25;
          p.climb = null;
          p.ground = false;
          p.vy = -PLAYER.bounceSpeed;
          p.varJ = 0;
          p.usedDouble = false;
          p.squash = 1.3;
          this.snakeSquash[i] = 0.35;
          audio.sfx.boing();
          this.stamps.push({ text: GAME_TEXT.boing, x: p.x, y: sy0 - 50, t: 0, rot: -0.1, fill: '#2ecc71', size: 40, life: 0.9 });
        }
      } else this.die('snake');
    });
    if (this.dying) return;
    // water
    if (this.waterLive() && !bijli) {
      for (const [wx, wy] of this.room.waterCells) {
        const cx0 = wx * T;
        const cy0 = wy * T + OY + 6;
        if (x1 > cx0 && x0 < cx0 + T && p.y > cy0 && y0 < cy0 + T) return this.die('water');
      }
    }
    // strikes
    if (!bijli) {
      for (const s of this.strikeStates()) {
        if (s.state !== 'strike') continue;
        if (x1 > s.x * T + 4 && x0 < (s.x + s.w) * T - 4) return this.die('strike');
      }
    }
  }

  private die(cause: Death): void {
    if (this.dying) return;
    this.dying = { t: 0, cause };
    this.respawnFlash = 1;
    this.shake = Math.max(this.shake, cause === 'pit' ? 0 : 4);
    if (cause === 'strike') {
      audio.sfx.strike();
      this.stamps.push({ text: GAME_TEXT.strike, x: this.p.x, y: this.p.y - 120, t: 0, rot: 0.06, fill: '#ffffff', size: 54, life: 1 });
    }
    if (cause === 'snake' || cause === 'water') audio.sfx.shock();
    for (let i = 0; i < 22; i++)
      this.sparks.push({ x: this.p.x, y: this.p.y - 30, vx: (rnd() - 0.5) * 500, vy: (rnd() - 0.6) * 500, t: 0.5 });
    this.p.grind = null;
    audio.setGrind(false);
  }

  private respawn(): void {
    this.dying = null;
    this.p = this.freshPlayer();
    this.cancelSplice();
    this.endBijli(false);
    for (const d of this.drawings) {
      d.taken = false;
      d.respawn = 0;
    }
    audio.sfx.respawn();
  }

  // ───────────────────────────── lightning ─────────────────────────────

  private updateLightning(dt: number): void {
    this.peek = Math.max(0, this.peek - dt);
    this.flash = Math.max(0, this.flash - dt);
    if (this.bolt) {
      this.bolt.t -= dt;
      if (this.bolt.t <= 0) this.bolt = null;
    }
    if (this.thunderIn >= 0) {
      this.thunderIn -= dt;
      if (this.thunderIn < 0) audio.sfx.thunder();
    }
    // strike column sfx
    const prev = this.def.strikes.map((_, i) => strikePhase(this.strikeT - dt, strikeOffset(i)).state);
    this.def.strikes.forEach((s, i) => {
      const now = strikePhase(this.strikeT, strikeOffset(i)).state;
      if (now === prev[i]) return;
      if (now === 'telegraph') audio.sfx.strikeTelegraph();
      if (now === 'strike') {
        audio.sfx.strike();
        this.shake = Math.max(this.shake, 4);
        this.flash = Math.max(this.flash, 0.06);
        const cx = (s.x + s.w / 2) * T;
        this.stamps.push({ text: GAME_TEXT.strike, x: cx, y: 120 + rnd() * 80, t: 0, rot: (rnd() - 0.5) * 0.3, fill: '#ffffff', size: 38, life: 0.6 });
        for (let k = 0; k < 14; k++) this.sparks.push({ x: cx, y: 600, vx: (rnd() - 0.5) * 500, vy: -rnd() * 400, t: 0.45 });
      }
    });
    if (!this.def.lightning) {
      this.telegraph = 0;
      return;
    }
    const before = this.nextBolt;
    this.nextBolt -= dt;
    if (before > LIGHTNING.telegraph && this.nextBolt <= LIGHTNING.telegraph) audio.sfx.rumble();
    this.telegraph = this.nextBolt < LIGHTNING.telegraph && this.nextBolt > 0 ? 1 - this.nextBolt / LIGHTNING.telegraph : 0;
    if (this.nextBolt <= 0) {
      const [a, b] = LIGHTNING.interval;
      this.nextBolt = a + rnd() * (b - a);
      this.peek = LIGHTNING.peek;
      this.flash = 0.12;
      this.shake = Math.max(this.shake, 3);
      const pts: [number, number][] = [[200 + rnd() * 880, 0]];
      while (pts[pts.length - 1]![1] < 300) {
        const [x, y] = pts[pts.length - 1]!;
        pts.push([x + (rnd() - 0.5) * 70, y + 20 + rnd() * 25]);
      }
      const f0 = pts[3] ?? pts[0]!;
      const fork: [number, number][] = [[f0[0], f0[1]]];
      for (let i = 0; i < 5; i++) {
        const l = fork[fork.length - 1]!;
        fork.push([l[0] + 20 + rnd() * 30, l[1] + 15 + rnd() * 20]);
      }
      this.bolt = { pts, fork: [fork], t: 0.2 };
      const [d0, d1] = LIGHTNING.thunderDelay;
      this.thunderIn = d0 + rnd() * (d1 - d0);
    }
  }

  // ───────────────────────────── ambient + fx ─────────────────────────────

  private updateAmbient(dt: number): void {
    const p = this.p;
    // drips from crossarms and wall edges
    for (const pr of this.room.poles) {
      if (pr.ladder || rnd() > dt * 1.2) continue;
      this.drips.push({ x: pr.x * T + 16 - 24 + rnd() * 48, y: pr.top * T + OY + 10, vx: 0, vy: 0, t: 3 });
    }
    // music light + hum
    this.lightAtFeet = this.inComic(p.x, p.y - 20) ? 1 : 0;
    audio.setLight(this.lightAtFeet);
    let hum = 0;
    const near = (x: number, y: number, r: number) => Math.max(0, 1 - Math.hypot(x - p.x, y - (p.y - 28)) / r);
    if (this.waterLive() && !this.bijli.active) for (const [wx, wy] of this.room.waterCells) hum = Math.max(hum, near(wx * T + 16, wy * T + OY + 16, 220));
    this.room.snakes.forEach((s, i) => {
      if (!this.snakeLit(i)) hum = Math.max(hum, near((s.x0 + s.x1 + 1) * 16, s.y * T + OY + 16, 260));
    });
    for (const sp of this.room.splices) {
      const c = this.circuits.circuitOfSplice(sp);
      if (c && !this.circuits.isSpliced(sp) && this.circuits.isClosed(c.id) && c.breaker)
        hum = Math.max(hum, near(sp[0] * T + 16, sp[1] * T + OY + 16, 200) * 0.7);
    }
    this.hum = hum;
    audio.setHum(hum);
    // costume swap stars at panel edges
    const comic = this.inComic(p.x, p.y - 24);
    if (comic !== this.wasComic) {
      this.wasComic = comic;
      for (let i = 0; i < 10; i++)
        this.stars.push({ x: p.x + (rnd() - 0.5) * 20, y: p.y - 30, vx: (rnd() - 0.5) * 260, vy: -rnd() * 260, t: 0.4, c: comic ? '#ffd400' : '#9fb3dd' });
    }
    // unspliced splice points sparkle
    for (const sp of this.room.splices) {
      if (this.circuits.isSpliced(sp) || rnd() > dt * 7) continue;
      for (let i = 0; i < 3; i++) this.sparks.push({ x: sp[0] * T + 28, y: sp[1] * T + OY + 12, vx: (rnd() - 0.3) * 220, vy: -rnd() * 140, t: 0.35 });
    }
  }

  private updateFx(dt: number): void {
    for (const arr of [this.sparks, this.splashes, this.stars]) {
      for (const q of arr) {
        q.t -= dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.vy += 900 * (q.g ?? 1) * dt;
      }
    }
    this.sparks = this.sparks.filter((q) => q.t > 0).slice(-260);
    this.splashes = this.splashes.filter((q) => q.t > 0).slice(-260);
    this.stars = this.stars.filter((q) => q.t > 0).slice(-200);
    for (const s of this.speedLines) {
      s.t -= dt;
      s.x += s.vx * dt;
    }
    this.speedLines = this.speedLines.filter((s) => s.t > 0);
    for (const d of this.drips) {
      d.vy += 1400 * dt;
      d.y += d.vy * dt;
      const tx = Math.floor(d.x / T);
      const ty = Math.floor((d.y - OY) / T);
      if (this.room.solid(tx, ty) || d.y > H) {
        d.t = 0;
        this.ripples.push({ x: d.x, y: ty * T + OY + 2, r: 1, t: 0.5 });
      }
    }
    this.drips = this.drips.filter((d) => d.t > 0);
    for (const r of this.ripples) {
      r.t -= dt;
      r.r += 26 * dt;
    }
    this.ripples = this.ripples.filter((r) => r.t > 0).slice(-60);
    for (const s of this.stamps) s.t += dt;
    this.stamps = this.stamps.filter((s) => s.t < s.life);
    for (const b of this.bubbles) b.t += dt;
    this.bubbles = this.bubbles.filter((b) => b.t < b.life);
    for (const c of this.captions) c.t += dt;
    this.captions = this.captions.filter((c) => c.t < c.dur);
    for (let i = 0; i < this.snakeSquash.length; i++) this.snakeSquash[i] = Math.max(0, this.snakeSquash[i]! - dt);
    this.shake = Math.max(0, this.shake - dt * 30);
    this.respawnFlash = Math.max(0, this.respawnFlash - dt * 2.5);
    const p = this.p;
    p.squash += (1 - p.squash) * Math.min(1, dt * 11);
    p.lean += ((p.climb || p.grind ? 0 : (p.vx / PLAYER.maxRun) * 0.14) - p.lean) * Math.min(1, dt * 10);
    p.celebrate = Math.max(0, p.celebrate - dt);
  }

  private updateExit(): void {
    const p = this.p;
    if (this.def.skyline && this.skylineFull() && this.skylineT > 3.6) {
      this.finish();
      return;
    }
    if (!this.exitOpen()) return;
    for (const [ex, ey] of this.room.exits) {
      const cx0 = ex * T;
      const cy0 = ey * T + OY;
      if (p.x + 11 > cx0 && p.x - 11 < cx0 + T && p.y > cy0 && p.y - PLAYER.hitbox.h < cy0 + T) {
        this.finish();
        return;
      }
    }
  }

  private finish(): void {
    this.done = true;
    this.doneT = 0;
    this.p.celebrate = 1.2;
    this.p.vx = 0;
    audio.setGrind(false);
    this.endBijli(false);
  }

  // ───────────────────────────── debug ─────────────────────────────

  /** Splice everything and close every breaker (debug / tests). */
  debugPowerAll(): void {
    for (const c of this.def.circuits) {
      if (c.breaker && !this.circuits.isClosed(c.id)) this.circuits.toggle(c.breaker);
      for (const s of c.splices) if (!this.circuits.isSpliced(s)) this.circuits.splice(s);
      this.powerOn(c.id);
    }
  }
}
