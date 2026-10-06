// Canvas-2D compositor (§9.0): real → props → darkness with erased holes → comic panels (clipped) → hero → FX.
// Ported from docs/style-target.html and generalised to every room, many lamps, peeks, BIJLI and the skyline bloom.
import { CSS, DARKNESS, FONTS, FX, PERF } from '../config';
import { ease, wipeX } from '../core/geom';
import type { RoomSim } from '../game/RoomSim';
import { bakeRoom, type Layers } from './bake';
import { bubble, caption, comicText, ctx2d, drawCrayon, H, keyPrompt, mk, OY, quadPath, T, tipBubble, W, type G } from './draw';
import { drawHero, HERO_CANVAS } from './hero';
import { drawDragonPickups, drawExitArrow, drawHintCard, drawHud, drawSleepingDragon } from './hud';
import {
  drawBreakers,
  drawClouds,
  drawDog,
  drawDrawings,
  drawLampHeads,
  drawRails,
  drawSnakes,
  drawSplicePoints,
  drawStrikes,
  drawWater,
  drawWires,
} from './props';

const R = Math.random;

interface Drop {
  x: number;
  y: number;
  s: number;
  near: boolean;
}

export interface RenderOpts {
  reduceFlashing: boolean;
  /** Chapter end: the DISTRICT RESTORED! stamp over a finished room. */
  restored: boolean;
  /** 0..1 multiplier on rain (finale fade). */
  rainScale: number;
  /** Hide the hero (title screen). */
  noHero?: boolean;
  /** Hide captions/prompts (title screen). */
  noUi?: boolean;
  /** Helmets left / per chapter (HUD). */
  lives?: number;
  maxLives?: number;
}

export class RoomCanvas {
  readonly out: HTMLCanvasElement;
  private o: G;
  private frame: HTMLCanvasElement;
  private ctx: G;
  private dk: G;
  private cf: G; // comic frame: the comic layer + comic props, this frame
  private heroCv: HTMLCanvasElement;
  private hg: G;
  private prev: HTMLCanvasElement;
  private slideT = -1;
  private L: Layers | null = null;
  private sim: RoomSim | null = null;
  private rain: Drop[] = [];
  private softFlash = 0;
  private lastFlash = 0;
  private restoredT = 0;
  drawingImg: CanvasImageSource | null = null;
  /** Pre-rendered candle glows (real look) and darkness holes, one canvas per parallax layer. */
  private candleGlow: HTMLCanvasElement[] = [];
  private candleHole: HTMLCanvasElement[] = [];

  constructor() {
    this.out = mk();
    this.o = ctx2d(this.out);
    this.frame = mk();
    this.ctx = ctx2d(this.frame);
    this.dk = ctx2d(mk());
    this.cf = ctx2d(mk());
    this.heroCv = mk(HERO_CANVAS.w, HERO_CANVAS.h);
    this.hg = ctx2d(this.heroCv);
    this.prev = mk();
    const n = Math.min(PERF.maxRain, 420);
    for (let i = 0; i < n; i++) this.rain.push({ x: R() * W, y: R() * H, s: 0.5 + R(), near: i % 3 === 0 });
  }

  setRoom(sim: RoomSim, index: number, slide: boolean): void {
    if (slide && this.sim) {
      ctx2d(this.prev).drawImage(this.frame, 0, 0);
      this.slideT = 0;
    }
    this.sim = sim;
    this.L = bakeRoom(sim.room, index);
    this.restoredT = 0;
    this.candleGlow = [0, 1].map(() => mk(W + 200));
    this.candleHole = [0, 1].map(() => mk(W + 200));
    for (const c of this.L.candles) {
      const x = c.x + 100 + 5;
      const y = c.y + 7;
      const gg = ctx2d(this.candleGlow[c.layer]!);
      const gr = gg.createRadialGradient(x, y, 0, x, y, 26);
      gr.addColorStop(0, 'rgba(255,170,80,.18)');
      gr.addColorStop(1, 'rgba(255,170,80,0)');
      gg.fillStyle = gr;
      gg.fillRect(x - 26, y - 26, 52, 52);
      if (sim.room.solid(Math.floor((c.x + 5) / T), Math.floor((c.y + 7 - OY) / T))) continue;
      const hg = ctx2d(this.candleHole[c.layer]!);
      const h2 = hg.createRadialGradient(x, y, 0, x, y, 22);
      h2.addColorStop(0, 'rgba(0,0,0,.35)');
      h2.addColorStop(1, 'rgba(0,0,0,0)');
      hg.fillStyle = h2;
      hg.fillRect(x - 22, y - 22, 44, 44);
    }
  }

  get sliding(): boolean {
    return this.slideT >= 0;
  }

  render(dt: number, opts: RenderOpts): void {
    const sim = this.sim;
    const L = this.L;
    if (!sim || !L) return;
    this.renderFrame(sim, L, dt, opts);
    const o = this.o;
    if (this.slideT >= 0) {
      this.slideT += dt / (FX.slideMs / 1000);
      const k = ease.inOut(Math.min(1, this.slideT));
      const gap = 90;
      const off = k * (W + gap);
      o.fillStyle = '#000';
      o.fillRect(0, 0, W, H);
      o.drawImage(this.prev, -off, 0);
      o.drawImage(this.frame, W + gap - off, 0);
      if (this.slideT >= 1) this.slideT = -1;
    } else o.drawImage(this.frame, 0, 0);
  }

  private renderFrame(sim: RoomSim, L: Layers, dt: number, opts: RenderOpts): void {
    const ctx = this.ctx;
    const dk = this.dk;
    const p = sim.p;
    const t = sim.t;
    const twos = Math.floor(t * 12) / 12;
    const rf = opts.reduceFlashing;
    const par = (p.x - W / 2) / (W / 2);
    const shakeAmt = rf ? 0 : Math.min(FX.maxShake, sim.shake);
    const sx = (R() - 0.5) * shakeAmt * 2;
    const sy = (R() - 0.5) * shakeAmt * 2;
    if (sim.flash > this.lastFlash + 0.05) this.softFlash = 0.3;
    this.lastFlash = sim.flash;
    this.softFlash = Math.max(0, this.softFlash - dt);
    const seqs = sim.room.lamps.map((_, i) => sim.seq(i));
    const bijli = sim.bijli.active;
    const skyK = Number.isFinite(sim.skylineT) ? sim.skylineT : -1;

    ctx.save();
    ctx.translate(sx, sy);

    // ───────── REAL WORLD, back to front ─────────
    ctx.drawImage(L.sky, 0, 0);
    ctx.drawImage(L.clouds, -((t * 8) % W), 0);
    ctx.globalAlpha = 0.6;
    ctx.drawImage(L.clouds, -((t * 14 + 400) % W), 60);
    ctx.globalAlpha = 1;
    if (sim.telegraph > 0 && !rf) {
      ctx.fillStyle = `rgba(150,170,230,${0.12 * Math.abs(Math.sin(t * 37)) * sim.telegraph})`;
      ctx.fillRect(0, 0, W, 320);
    }
    if (sim.bolt) {
      const b = sim.bolt;
      const a = (b.t / 0.2) * (rf ? 0.4 : 1);
      const x0 = b.pts[0]![0];
      const gl = ctx.createRadialGradient(x0, 60, 0, x0, 60, 420);
      gl.addColorStop(0, `rgba(200,215,255,${0.55 * a})`);
      gl.addColorStop(1, 'rgba(200,215,255,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(0, 0, W, 400);
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.shadowColor = '#bcd0ff';
      ctx.shadowBlur = 18;
      ctx.lineWidth = 3;
      ctx.beginPath();
      b.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.lineWidth = 1.5;
      for (const f of b.fork) {
        ctx.beginPath();
        f.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }
    ctx.drawImage(L.far, -100 - par * 10, 0);
    for (const c of L.candles) {
      const off = c.layer === 0 ? -par * 10 : -par * 24;
      const f = 0.55 + 0.25 * Math.sin(t * 9 + c.ph) + 0.15 * Math.sin(t * 23 + c.ph * 2);
      ctx.fillStyle = `rgba(255,190,110,${f})`;
      ctx.fillRect(c.x + off, c.y, 10, 14);
    }
    ctx.drawImage(L.mid, -100 - par * 24, 0);
    if (L.silWin) {
      const off = -par * 24;
      const sw = Math.sin(t * 0.8);
      ctx.fillStyle = 'rgba(255,190,110,.8)';
      ctx.fillRect(L.silWin.x + off, L.silWin.y, 10, 14);
      ctx.fillStyle = '#120c08';
      ctx.fillRect(L.silWin.x + off + 3 + sw * 2, L.silWin.y + 4, 4, 10);
      ctx.beginPath();
      ctx.arc(L.silWin.x + off + 5 + sw * 2, L.silWin.y + 4, 2.5, 0, 7);
      ctx.fill();
    }
    ctx.drawImage(this.candleGlow[0]!, -100 - par * 10, 0);
    ctx.drawImage(this.candleGlow[1]!, -100 - par * 24, 0);
    // skyline bloom: every window pops on over 2 s
    if (skyK > 0) {
      const k = Math.min(1, skyK / 2);
      L.city.forEach((b) => {
        const off = b.layer === 0 ? -par * 10 : -par * 24;
        b.windows.forEach((w, j) => {
          if ((j * 7919 + Math.floor(b.x)) % 100 > k * 100) return;
          ctx.fillStyle = CSS.window;
          ctx.fillRect(w.x + off, w.y, 10, 14);
        });
      });
    }
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.drawImage(L.fog, -((t * 20) % W), 19 * T + OY - 150);
    ctx.restore();
    ctx.drawImage(L.level, 0, 0);
    // puddles: ripples + lamp/headlamp reflections
    for (const pd of L.puddles) {
      const cx = pd.x + pd.w / 2;
      ctx.fillStyle = 'rgba(10,14,28,.85)';
      ctx.beginPath();
      ctx.ellipse(cx, pd.y + 4, pd.w / 2, 4, 0, 0, 7);
      ctx.fill();
      sim.room.lamps.forEach((l, i) => {
        if (seqs[i]!.lampOn && Math.abs(cx - l.hx) < 260 && Math.abs(pd.y - l.groundY) < 4) {
          ctx.fillStyle = 'rgba(255,190,110,.55)';
          ctx.fillRect(l.hx + 20 + (cx - l.hx) * 0.15 - 3, pd.y + 1, 6, 6);
        }
      });
      if (Math.abs(cx - p.x) < 240 && Math.sign(cx - p.x) === p.face && Math.abs(pd.y - p.y) < 40) {
        ctx.fillStyle = 'rgba(255,246,194,.4)';
        ctx.fillRect(pd.x + pd.w * 0.3, pd.y + 2, pd.w * 0.4, 2);
      }
      if (R() < dt * 4) sim.ripples.push({ x: pd.x + R() * pd.w, y: pd.y + 3, r: 1, t: 0.6 });
    }
    ctx.strokeStyle = 'rgba(160,180,215,.4)';
    ctx.lineWidth = 1;
    for (const r of sim.ripples) {
      ctx.globalAlpha = Math.max(0, r.t / 0.6);
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.r, r.r * 0.3, 0, 0, 7);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    this.drawProps(ctx, sim, false, t);
    ctx.fillStyle = 'rgba(160,180,215,.6)';
    for (const d of sim.drips) ctx.fillRect(d.x, d.y, 1.5, 5);
    // physical light cones of lamps that are on
    sim.room.lamps.forEach((l, i) => {
      const sq = seqs[i]!;
      if (!sq.lampOn) return;
      const hx0 = l.kind !== 'lamp' ? l.hx : l.hx + 24;
      const hy0 = l.kind !== 'lamp' ? l.hy + 20 : l.hy + 6;
      const spread = l.r * T * 1.05 * Math.max(0.35, sq.pool);
      const fl = sq.pool < 1 ? 0.6 + 0.4 * Math.sin(t * 50) : 1;
      const cg = ctx.createLinearGradient(0, hy0, 0, l.groundY);
      cg.addColorStop(0, `rgba(255,200,120,${0.42 * fl})`);
      cg.addColorStop(1, `rgba(255,179,71,${0.12 * fl})`);
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(hx0 - 12, hy0);
      ctx.lineTo(hx0 + 12, hy0);
      ctx.lineTo(hx0 + spread, l.groundY);
      ctx.lineTo(hx0 - spread, l.groundY);
      ctx.closePath();
      ctx.fill();
      const pg = ctx.createRadialGradient(hx0, l.groundY, 0, hx0, l.groundY, spread * 1.1);
      pg.addColorStop(0, `rgba(255,190,100,${0.45 * fl})`);
      pg.addColorStop(1, 'rgba(255,190,100,0)');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.ellipse(hx0, l.groundY + 4, spread * 1.1, 26, 0, 0, 7);
      ctx.fill();
    });

    // ───────── darkness with holes ─────────
    const hg = this.hg;
    hg.clearRect(0, 0, HERO_CANVAS.w, HERO_CANVAS.h);
    const heroIsComic = sim.inComic(p.x, p.y - 24);
    const pose = { splicing: sim.spliceHold > 0, bijli };
    const savedAnim = p.anim;
    if (heroIsComic) p.anim = Math.floor(p.anim * 2) / 2; // on twos
    const [lhx, lhy] = drawHero(hg, p, heroIsComic, heroIsComic ? twos : t, pose);
    p.anim = savedAnim;
    if (bijli && sim.bijli.warning && Math.floor(t * 8) % 2 === 1) {
      // the last BIJLI seconds: the hero flashes white in time with the blinking ring, so the end is obvious
      hg.globalCompositeOperation = 'source-atop';
      hg.fillStyle = 'rgba(255,255,255,.75)';
      hg.fillRect(0, 0, HERO_CANVAS.w, HERO_CANVAS.h);
      hg.globalCompositeOperation = 'source-over';
    }
    const hx = p.x - HERO_CANVAS.ox + lhx;
    const hy = p.y - HERO_CANVAS.oy + lhy;
    const beamA = (p.face > 0 ? 0 : Math.PI) + (p.climb ? 0 : 0.08) + Math.sin(p.anim * 2) * 0.03;
    const half = ((DARKNESS.headlampDeg / 2) * Math.PI) / 180;
    dk.globalCompositeOperation = 'source-over';
    dk.clearRect(0, 0, W, H);
    dk.fillStyle = `rgba(5,8,20,${DARKNESS.alpha})`;
    dk.fillRect(0, 0, W, H);
    dk.globalCompositeOperation = 'destination-out';
    const coneLen = DARKNESS.headlampLen + 40;
    const cone = dk.createRadialGradient(hx, hy, 0, hx, hy, coneLen);
    cone.addColorStop(0, 'rgba(0,0,0,.95)');
    cone.addColorStop(0.7, 'rgba(0,0,0,.5)');
    cone.addColorStop(1, 'rgba(0,0,0,0)');
    dk.fillStyle = cone;
    dk.beginPath();
    dk.moveTo(hx, hy);
    dk.arc(hx, hy, coneLen, beamA - half - 0.02, beamA + half + 0.02);
    dk.closePath();
    dk.fill();
    this.hole(dk, p.x, p.y - 30, 100, 0.55);
    for (const s of sim.room.splices) if (!sim.circuits.isSpliced(s)) this.hole(dk, s[0] * T + 28, s[1] * T + OY + 12, 70 + Math.sin(t * 20) * 12, 0.85);
    for (const b of sim.room.breakers) this.hole(dk, b[0] * T + 16, b[1] * T + OY + 10, 46, 0.6);
    for (const d of sim.drawings) if (!d.taken) this.hole(dk, d.at[0] * T + 16, d.at[1] * T + OY + 16, 80, 0.85);
    sim.room.snakes.forEach((s, i) => {
      if (!sim.snakeLit(i)) this.hole(dk, (s.x1 + 1) * T, s.y * T + OY + 10, 80, 0.7 + 0.2 * Math.sin(t * 40));
    });
    if (sim.waterLive() && sim.room.waterCells.length) {
      for (let k = 0; k < sim.room.waterCells.length; k += 3) {
        const [wx, wy] = sim.room.waterCells[k]!;
        this.hole(dk, wx * T + 16, wy * T + OY + 16, 50, 0.25);
      }
    }
    for (const st of sim.strikeStates()) {
      if (st.state === 'quiet') continue;
      const a = st.state === 'strike' ? 0.95 : 0.25 * st.k;
      dk.fillStyle = `rgba(0,0,0,${a})`;
      dk.fillRect(st.x * T - 20, 0, st.w * T + 40, H);
    }
    dk.drawImage(this.candleHole[0]!, -100 - par * 10, 0);
    dk.drawImage(this.candleHole[1]!, -100 - par * 24, 0);
    sim.room.lamps.forEach((l, i) => {
      const sq = seqs[i]!;
      if (sq.lampOn) {
        const hx0 = l.kind !== 'lamp' ? l.hx : l.hx + 24;
        const hy0 = l.kind !== 'lamp' ? l.hy + 20 : l.hy + 6;
        const spread = l.r * T * 1.05 * Math.max(0.35, sq.pool);
        dk.fillStyle = 'rgba(0,0,0,.8)';
        dk.beginPath();
        dk.moveTo(hx0 - 14, hy0 - 4);
        dk.lineTo(hx0 + 14, hy0 - 4);
        dk.lineTo(hx0 + spread + 30, l.groundY + 30);
        dk.lineTo(hx0 - spread - 30, l.groundY + 30);
        dk.closePath();
        dk.fill();
        this.hole(dk, hx0, hy0, 120, 0.9);
      }
      if (sq.color > 0) {
        dk.fillStyle = `rgba(0,0,0,${sq.fade})`;
        quadPath(dk, l.quad);
        dk.fill();
      }
    });
    if (skyK > 0) {
      dk.fillStyle = `rgba(0,0,0,${Math.min(0.6, skyK / 3)})`;
      dk.fillRect(0, 0, W, H);
    }
    if (!rf && (sim.flash > 0 || sim.bolt)) {
      dk.fillStyle = `rgba(0,0,0,${Math.max(sim.flash / 0.12, sim.bolt ? (sim.bolt.t / 0.2) * 0.7 : 0)})`;
      dk.fillRect(0, 0, W, H);
    }
    ctx.drawImage(dk.canvas, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const beam = ctx.createRadialGradient(hx, hy, 0, hx, hy, DARKNESS.headlampLen + 10);
    beam.addColorStop(0, 'rgba(255,246,194,.18)');
    beam.addColorStop(1, 'rgba(255,246,194,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.arc(hx, hy, DARKNESS.headlampLen + 10, beamA - half + 0.03, beamA + half - 0.03);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    for (const q of sim.sparks) {
      ctx.fillStyle = `rgba(127,227,255,${Math.min(1, q.t * 2)})`;
      ctx.fillRect(q.x, q.y, 3, 3);
    }

    // ───────── CHINNI'S COMIC ─────────
    const peekA = sim.peek > 0 ? Math.min(1, sim.peek / 0.15, (0.55 - sim.peek) / 0.1 + 0.001) : 0;
    const anyPanel = seqs.some((s) => s.sketch > 0);
    const fullPage = bijli || skyK >= 2;
    if (anyPanel || peekA > 0 || fullPage) this.buildComicFrame(sim, L, t, twos, seqs);
    sim.room.lamps.forEach((l, i) => {
      const sq = seqs[i]!;
      if (sq.sketch <= 0) return;
      this.drawPanel(ctx, sim, i, sq, t);
      void l;
    });
    if (peekA > 0 && !fullPage) this.fullPage(ctx, peekA * 0.92, 1);
    if (bijli) this.fullPage(ctx, 1, 1);
    else if (skyK >= 2) this.fullPage(ctx, ease.clamp((skyK - 2) / 0.8), ease.clamp((skyK - 2) / 0.8));
    // lamp glare while the lamp flickers on
    sim.room.lamps.forEach((l, i) => {
      const s = sim.lamps[i]!;
      if (seqs[i]!.lampOn && s.powerT >= 0 && s.powerT < 0.62 && l.kind === 'lamp') {
        ctx.fillStyle = 'rgba(255,255,230,.7)';
        ctx.beginPath();
        ctx.arc(l.hx + 24, l.hy + 2, 18 + Math.sin(t * 60) * 4, 0, 7);
        ctx.fill();
      }
    });

    drawSleepingDragon(ctx, sim, t);
    // ───────── hero + FX ─────────
    if (!opts.noHero) {
      const dying = sim.dying;
      const vis = dying ? (dying.t < 0.15 ? 1 : Math.max(0, 1 - (dying.t - 0.15) / 0.15)) : 1;
      if (!heroIsComic) {
        hg.globalCompositeOperation = 'source-atop';
        hg.fillStyle = 'rgba(8,12,28,.3)';
        hg.fillRect(0, 0, HERO_CANVAS.w, HERO_CANVAS.h);
        hg.globalCompositeOperation = 'source-over';
      }
      if (dying && dying.t < 0.15) {
        hg.globalCompositeOperation = 'source-atop';
        hg.fillStyle = 'rgba(127,227,255,.85)';
        hg.fillRect(0, 0, HERO_CANVAS.w, HERO_CANVAS.h);
        hg.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = vis;
      ctx.drawImage(this.heroCv, Math.round(p.x - HERO_CANVAS.ox), Math.round(p.y - HERO_CANVAS.oy));
      ctx.globalAlpha = 1;
      if (bijli) this.bijliRing(ctx, sim, t);
    }
    for (const q of sim.splashes) {
      ctx.fillStyle = 'rgba(190,205,230,.85)';
      ctx.fillRect(q.x, q.y, 2, 2);
    }
    for (const q of sim.stars) {
      ctx.fillStyle = q.c ?? CSS.yellow;
      ctx.fillRect(q.x - 2, q.y - 2, 4, 4);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 2;
    for (const s of sim.speedLines) {
      ctx.globalAlpha = s.t / 0.2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - p.face * 50, s.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    this.drawRain(ctx, sim, dt, opts.rainScale * (sim.def.rain ?? 1) * (sim.calmLeft > 0 ? 0.3 : 1));
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(L.fg, -100 - par * 60 + Math.sin(t * 0.9) * 4 * sim.wind, 0);
    ctx.restore();
    if (rf) {
      if (this.softFlash > 0) {
        ctx.fillStyle = `rgba(235,242,255,${0.14 * Math.sin(Math.PI * (1 - this.softFlash / 0.3))})`;
        ctx.fillRect(0, 0, W, H);
      }
    } else if (sim.flash > 0) {
      ctx.fillStyle = `rgba(235,242,255,${(sim.flash / 0.12) * 0.75})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (!opts.noUi) drawExitArrow(ctx, sim, t);
    for (const s of sim.stamps) {
      const k = Math.min(1, s.t / 0.12);
      const sc = (k < 1 ? 1.6 - 0.6 * k : 1) * (s.t > s.life - 0.2 ? Math.max(0, 1 - (s.t - (s.life - 0.2)) * 5) : 1);
      comicText(ctx, s.text, s.x, s.y, s.size, s.rot, s.fill, sc);
    }
    for (const b of sim.bubbles) {
      if (b.tip) tipBubble(ctx, b.text, Math.max(160, b.x), b.y, b.t, b.life);
      else bubble(ctx, b.text, b.x, b.y, b.t, b.life);
    }
    if (!opts.noUi && sim.prompt && !sim.dying) keyPrompt(ctx, sim.prompt.text, sim.prompt.x, sim.prompt.y, sim.prompt.progress);
    ctx.restore();
    if (!opts.noUi) {
      const cap = sim.captions.find((c) => c.t >= 0);
      if (cap) caption(ctx, cap.text, cap.t, cap.dur);
      const card = sim.hintCards.find((c) => c.t >= 0);
      if (card && !sim.done) drawHintCard(ctx, card);
      if (opts.lives !== undefined) drawHud(ctx, sim, opts.lives, opts.maxLives ?? 3, sim.objective(), t);
    }
    // respawn: cyan flash, then fade
    if (sim.respawnFlash > 0) {
      ctx.fillStyle = `rgba(127,227,255,${sim.respawnFlash * 0.35})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (sim.dying && sim.dying.t > 0.15) {
      const k = (sim.dying.t - 0.15) / 0.3;
      ctx.fillStyle = `rgba(0,0,0,${Math.sin(Math.min(1, k) * Math.PI) * 0.85})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (opts.restored) {
      this.restoredT += dt;
      const k = Math.min(1, this.restoredT / 0.35);
      ctx.fillStyle = `rgba(0,0,0,${0.55 * k})`;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(this.restoredT * 0.2);
      ctx.fillStyle = CSS.yellow;
      ctx.beginPath();
      for (let i = 0; i < 32; i++) {
        const r = (i % 2 ? 160 : 330) * ease.outBack(k);
        const a = (i / 32) * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.62);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = CSS.ink;
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.restore();
      comicText(ctx, 'DISTRICT', W / 2, H / 2 - 36, 64, -0.05, CSS.red, 0.5 + 0.5 * ease.outBack(k));
      comicText(ctx, 'RESTORED!', W / 2, H / 2 + 34, 72, -0.05, '#fff', 0.5 + 0.5 * ease.outBack(Math.min(1, k * 1.2)));
    }
    // comic gutters: the room is a panel
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, OY);
    ctx.fillRect(0, H - OY, W, OY);
  }

  private hole(dk: G, x: number, y: number, r: number, a: number): void {
    const g = dk.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    dk.fillStyle = g;
    dk.fillRect(x - r, y - r, r * 2, r * 2);
  }

  private drawProps(g: G, sim: RoomSim, comic: boolean, t: number): void {
    drawWater(g, sim, comic, t);
    drawRails(g, sim, comic, t);
    drawWires(g, sim, comic, t);
    drawLampHeads(g, sim, comic, t);
    drawSplicePoints(g, sim, comic, t);
    drawBreakers(g, sim, comic, t);
    drawSnakes(g, sim, comic, t);
    drawDrawings(g, sim, comic, t, this.drawingImg);
    drawDragonPickups(g, sim, t);
    drawStrikes(g, sim, comic, t);
  }

  private buildComicFrame(sim: RoomSim, L: Layers, t: number, twos: number, seqs: ReturnType<RoomSim['seq']>[]): void {
    const cf = this.cf;
    cf.drawImage(L.comic, 0, 0);
    this.drawProps(cf, sim, true, t);
    drawClouds(cf, sim, twos);
    const d = sim.def.dog;
    const awake = !!d && sim.room.lamps.some((l, i) => seqs[i]!.color >= 1 && l.circuit && sim.isLit(d[0] * T + 16, d[1] * T + OY + 16));
    drawDog(cf, sim, true, twos, awake);
    void L;
  }

  private drawPanel(ctx: G, sim: RoomSim, i: number, sq: ReturnType<RoomSim['seq']>, t: number): void {
    const l = sim.room.lamps[i]!;
    const q = l.quad;
    const box = l.box;
    const pop = sq.pop > 0 && sq.pop < 1 ? 1 + Math.sin(sq.pop * Math.PI) * 0.012 : 1;
    const pcx = (box.x0 + box.x1) / 2;
    const pcy = (box.y0 + box.y1) / 2;
    ctx.save();
    ctx.globalAlpha = sq.fade;
    ctx.translate(pcx, pcy);
    ctx.scale(pop, pop);
    ctx.translate(-pcx, -pcy);
    if (sq.color > 0) {
      ctx.save();
      ctx.translate(10, 10);
      ctx.fillStyle = `rgba(0,0,0,${0.45 * sq.color})`;
      quadPath(ctx, q);
      ctx.fill();
      ctx.restore();
    }
    // 1) notebook page fills the ruled panel
    const nb = ease.clamp((sq.sketch - 0.3) / 0.6);
    if (nb > 0 && sq.color < 1) {
      ctx.save();
      quadPath(ctx, q);
      ctx.clip();
      ctx.globalAlpha = nb * sq.fade;
      ctx.drawImage(this.L!.sketch, 0, 0);
      ctx.restore();
    }
    // 2) colour sweeps across behind the crayon
    if (sq.color > 0) {
      const k = ease.outCubic(sq.color);
      ctx.save();
      quadPath(ctx, q);
      ctx.clip();
      if (sq.color < 1) {
        ctx.beginPath();
        ctx.moveTo(box.x0 - 400, box.y0 - 40);
        for (let y = box.y0 - 40; y <= box.y1 + 40; y += 14) ctx.lineTo(wipeX(box, k, y) + (Math.floor(y / 14) % 2 ? 10 : -6), y);
        ctx.lineTo(box.x0 - 400, box.y1 + 40);
        ctx.closePath();
        ctx.clip();
      }
      ctx.drawImage(this.cf.canvas, 0, 0);
      ctx.restore();
      if (sq.color < 1) {
        ctx.save();
        quadPath(ctx, q);
        ctx.clip();
        ctx.strokeStyle = CSS.magenta;
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let y = box.y0 - 20; y <= box.y1 + 20; y += 14) ctx.lineTo(wipeX(box, k, y) + (Math.floor(y / 14) % 2 ? 10 : -6), y);
        ctx.stroke();
        ctx.restore();
        const cyy = box.y0 + (box.y1 - box.y0) * (0.5 + 0.35 * Math.sin(t * 9));
        drawCrayon(ctx, wipeX(box, k, cyy) + 4, cyy, Math.PI * 0.8);
        for (let s = 0; s < 2; s++) sim.stars.push({ x: wipeX(box, k, cyy), y: cyy, vx: (R() - 0.5) * 140, vy: -R() * 140, t: 0.3, c: CSS.magenta });
      }
    }
    // 3) the border, ruled by Chinni's pen: white gutter + thick ink line
    this.strokePerimeter(ctx, q, Math.min(1, sq.sketch * 1.05), sq.sketch < 1);
    // caption box in the panel corner
    if (sq.color >= 1 && sq.fade >= 1) {
      ctx.save();
      ctx.globalAlpha = sq.pop;
      ctx.translate(Math.max(14, q[0][0] + 14), Math.max(OY + 14, q[0][1] + 12));
      ctx.rotate(-0.03);
      ctx.font = `700 17px ${FONTS.hand}`;
      const txt = sim.def.panelCaption;
      const w = ctx.measureText(txt).width + 22;
      ctx.fillStyle = '#ffe66d';
      ctx.fillRect(0, 0, w, 30);
      ctx.strokeStyle = CSS.ink;
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, w, 30);
      ctx.fillStyle = CSS.ink;
      ctx.fillText(txt, 11, 21);
      ctx.restore();
    }
    ctx.restore();
  }

  private strokePerimeter(ctx: G, q: readonly (readonly [number, number])[], frac: number, pen: boolean): void {
    const per = [...q, q[0]!];
    const segLen = per.slice(1).map((pt, i) => Math.hypot(pt[0] - per[i]![0], pt[1] - per[i]![1]));
    const perim = segLen.reduce((a, b) => a + b, 0);
    const d = perim * frac;
    const along = (dd: number): [number, number] => {
      let acc = 0;
      for (let i = 0; i < segLen.length; i++) {
        if (acc + segLen[i]! >= dd) {
          const k = (dd - acc) / segLen[i]!;
          return [per[i]![0] + (per[i + 1]![0] - per[i]![0]) * k, per[i]![1] + (per[i + 1]![1] - per[i]![1]) * k];
        }
        acc += segLen[i]!;
      }
      return [per[per.length - 1]![0], per[per.length - 1]![1]];
    };
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const [w, col] of [
      [16, '#fff'],
      [6, CSS.ink],
    ] as const) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(per[0]![0], per[0]![1]);
      let acc = 0;
      for (let i = 0; i < segLen.length; i++) {
        if (acc + segLen[i]! <= d) ctx.lineTo(per[i + 1]![0], per[i + 1]![1]);
        else {
          const [x, y] = along(d);
          ctx.lineTo(x, y);
          break;
        }
        acc += segLen[i]!;
      }
      ctx.stroke();
    }
    if (pen && frac < 1) {
      const [px, py] = along(d);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-0.9);
      ctx.fillStyle = CSS.ink;
      ctx.fillRect(-3, -40, 6, 34);
      ctx.fillStyle = CSS.yellow;
      ctx.fillRect(-4, -60, 8, 22);
      ctx.strokeStyle = CSS.ink;
      ctx.lineWidth = 2;
      ctx.strokeRect(-4, -60, 8, 22);
      ctx.restore();
    }
  }

  /** The whole screen as one comic page with its own white gutter + ink border (peek, BIJLI, skyline). */
  private fullPage(ctx: G, alpha: number, border: number): void {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.cf.canvas, 0, 0);
    ctx.restore();
    const q: [number, number][] = [
      [10, OY + 10],
      [W - 10, OY + 8],
      [W - 12, H - OY - 10],
      [12, H - OY - 8],
    ];
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha * 1.2);
    this.strokePerimeter(ctx, q, border, border < 1);
    ctx.restore();
  }

  private bijliRing(ctx: G, sim: RoomSim, t: number): void {
    const p = sim.p;
    const f = sim.bijli.fraction;
    if (sim.bijli.warning && Math.floor(t * 8) % 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = CSS.ink;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 34, 46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f);
    ctx.stroke();
    ctx.strokeStyle = sim.bijli.warning ? CSS.red : CSS.cyan;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }

  private drawRain(g: G, sim: RoomSim, dt: number, scale: number): void {
    if (scale <= 0.01) return;
    const wx = 120 + sim.wind * 150;
    const n = Math.floor(this.rain.length * Math.min(1, scale));
    // four batched paths: far/near × real/comic
    const paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    for (let i = 0; i < n; i++) {
      const r = this.rain[i]!;
      const sp = r.near ? 1.25 + r.s * 0.5 : 0.55 + r.s * 0.35;
      r.y += 900 * sp * dt;
      r.x -= wx * sp * dt;
      if (r.y > H || r.x < -40) {
        r.y = -20 - R() * 100;
        r.x = R() * (W + 300);
      }
      const len = (r.near ? 22 : 12) * sp;
      const path = paths[(r.near ? 2 : 0) + (sim.inComic(r.x, r.y) ? 1 : 0)]!;
      path.moveTo(r.x, r.y);
      path.lineTo(r.x + (wx / 900) * len, r.y - len);
      if (r.near) {
        const ty = Math.floor((r.y - OY) / T);
        const tx = Math.floor(r.x / T);
        if (sim.room.solid(tx, ty) && !sim.room.solid(tx, ty - 1) && R() < 0.5) {
          sim.splashes.push({ x: r.x, y: ty * T + OY, vx: (R() - 0.5) * 60, vy: -40 - R() * 60, t: 0.18 });
          r.y = -20;
        }
      }
    }
    g.lineCap = 'round';
    const style: [string, number][] = [
      ['rgba(160,180,215,.13)', 1],
      ['rgba(47,107,255,.32)', 1],
      ['rgba(160,180,215,.26)', 1.8],
      ['rgba(47,107,255,.6)', 1.8],
    ];
    paths.forEach((path, i) => {
      g.strokeStyle = style[i]![0];
      g.lineWidth = style[i]![1];
      g.stroke(path);
    });
  }

}

