// The hero: a two-segment procedural rig (prototype rig + grind/hurt/celebrate poses), real and BIJLI skins (§9.4).
// The face is ALWAYS a solid helmet shadow (#0B0F1C). Never draw a face.
import { CSS } from '../config';
import type { Player } from '../game/RoomSim';
import type { G } from './draw';

export const HERO_CANVAS = { w: 140, h: 120, ox: 70, oy: 112 } as const;

function limb(g: G, x: number, y: number, a1: number, l1: number, a2: number, l2: number, w: number, col: string, out: string, lw: number, foot?: string): void {
  const kx = x + Math.sin(a1) * l1;
  const ky = y + Math.cos(a1) * l1;
  const ex = kx + Math.sin(a1 + a2) * l2;
  const ey = ky + Math.cos(a1 + a2) * l2;
  g.lineCap = 'round';
  g.strokeStyle = out;
  g.lineWidth = w + lw * 2;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(kx, ky);
  g.lineTo(ex, ey);
  g.stroke();
  g.strokeStyle = col;
  g.lineWidth = w;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(kx, ky);
  g.lineTo(ex, ey);
  g.stroke();
  if (foot) {
    g.fillStyle = foot;
    g.strokeStyle = out;
    g.lineWidth = lw;
    g.beginPath();
    g.roundRect(ex - 5, ey - 3, 14, 7, 3);
    g.fill();
    g.stroke();
  }
}

export interface HeroPose {
  splicing: boolean;
  bijli: boolean; // BIJLI mode: cape always on
}

/** Draws into a 140×120 canvas with the feet at (70, 112). Returns the headlamp position in that canvas. */
export function drawHero(g: G, pl: Player, comic: boolean, t: number, pose: HeroPose): [number, number] {
  const out = comic ? CSS.ink : '#03050b';
  const lw = comic ? 2.4 : 1.2;
  const grind = !!pl.grind;
  const climb = !!pl.climb;
  const run = Math.abs(pl.vx) > 20 && pl.ground;
  const air = !pl.ground && !climb && !grind;
  const hurt = pl.hurt > 0;
  const cele = pl.celebrate > 0;
  const ph = pl.anim * 2;
  const breathe = Math.sin(t * 2.2) * 1.2;
  const bob = run ? -Math.abs(Math.sin(ph)) * 3.5 : climb ? 0 : grind ? 6 : cele ? -Math.abs(Math.sin(t * 8)) * 6 : breathe * 0.6;
  const shake = pl.shakeOff > 0 ? Math.sin(pl.shakeOff * 60) * 0.18 * (pl.shakeOff / 0.7) : 0;
  const caped = comic || pose.bijli;
  g.save();
  g.translate(HERO_CANVAS.ox, HERO_CANVAS.oy);
  g.scale(pl.face, 1);
  g.scale(2 - pl.squash, pl.squash);
  g.rotate(pl.lean + shake + (hurt ? -0.3 : 0) + (grind ? 0.12 : 0));
  const hipY = -26 + bob;
  const shY = -48 + bob;
  let la: number, lb: number, ka: number, kb: number;
  if (grind) {
    la = 0.7;
    lb = -0.5;
    ka = -1.5;
    kb = -1.1;
  } else if (run) {
    la = Math.sin(ph) * 0.9;
    lb = -la;
    ka = -Math.max(0, Math.cos(ph)) * 1.1 - 0.15;
    kb = -Math.max(0, -Math.cos(ph)) * 1.1 - 0.15;
  } else if (air) {
    la = pl.vy < 0 ? 0.5 : 0.25;
    lb = pl.vy < 0 ? -0.2 : -0.35;
    ka = pl.vy < 0 ? -1.2 : -0.5;
    kb = -0.3;
  } else if (climb) {
    const c = Math.sin(pl.anim * 3);
    la = 0.5 + c * 0.3;
    lb = 0.1 - c * 0.3;
    ka = -1.2;
    kb = -0.9;
  } else {
    la = 0.08;
    lb = -0.08;
    ka = -0.05 - (1 - pl.squash) * 2;
    kb = -0.05 - (1 - pl.squash) * 2;
  }
  if (caped) {
    const fl = Math.sin(t * 9) * 4 + Math.min(14, (Math.abs(pl.vx) / 300) * 12) + (air || grind ? 8 : 0);
    const up = air && pl.vy > 0 ? -8 : 0;
    g.fillStyle = CSS.magenta;
    g.beginPath();
    g.moveTo(-6, shY + 2);
    g.quadraticCurveTo(-18 - fl, shY + 20, -24 - fl, hipY + 18 + up);
    g.lineTo(2, hipY + 14);
    g.closePath();
    g.fill();
    g.strokeStyle = out;
    g.lineWidth = lw;
    g.stroke();
    g.strokeStyle = CSS.yellow;
    g.lineWidth = 3;
    g.beginPath();
    for (let i = 0; i <= 6; i++) {
      const k = i / 6;
      g.lineTo(-24 - fl + (26 + fl) * k, hipY + 18 + up - up * k + (i % 2 ? -3 : 2));
    }
    g.stroke();
  }
  limb(g, -2, hipY, lb, 13, kb, 13, 8, comic ? '#3b3426' : '#2c271c', out, lw, '#0d0d0d');
  const armSw = run ? -Math.sin(ph) * 0.9 : air ? -1.1 : 0.12 + breathe * 0.02;
  const coat = comic ? '#a8955c' : '#8a7a4f';
  const coatBack = comic ? '#7a6c45' : '#6a5d3c';
  if (climb) limb(g, -3, shY + 4, Math.PI - 0.4 - Math.sin(pl.anim * 3) * 0.4, 11, -0.6, 11, 7, coatBack, out, lw);
  else if (cele) limb(g, -3, shY + 4, Math.PI - 0.3, 11, 0.2, 11, 7, coatBack, out, lw);
  else if (grind) limb(g, -3, shY + 4, -1.4, 11, -0.3, 11, 7, coatBack, out, lw);
  else limb(g, -3, shY + 4, -armSw * 0.8, 11, -0.5, 11, 7, coatBack, out, lw);
  limb(g, 3, hipY, la, 13, ka, 13, 8, comic ? '#4a4130' : '#3a3324', out, lw, '#111');
  // raincoat with flapping hem
  const hem = Math.sin(t * 11) * 1.5 - Math.min(6, (Math.abs(pl.vx) / 300) * 6);
  g.fillStyle = coat;
  g.strokeStyle = out;
  g.lineWidth = lw;
  g.beginPath();
  g.moveTo(-11, shY);
  g.lineTo(11, shY);
  g.lineTo(14, hipY + 6);
  g.lineTo(13 + hem * 0.3, hipY + 9);
  g.lineTo(-14 + hem, hipY + 10);
  g.lineTo(-14, hipY + 4);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = 'rgba(0,0,0,.18)';
  g.fillRect(-11, shY, 5, hipY - shY + 6);
  g.fillStyle = comic ? '#fff' : '#d9e3ea';
  g.fillRect(-12, shY + 11, 25, 3.5);
  g.fillRect(-13, hipY - 1, 27, 2.5);
  g.fillStyle = '#1d1810';
  g.fillRect(-13, hipY + 2, 27, 4);
  g.fillStyle = '#c9a227';
  g.fillRect(-2, hipY + 2, 5, 4);
  g.strokeStyle = '#1d1810';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-9, shY + 2);
  g.lineTo(9, hipY + 2);
  g.stroke();
  if (caped) {
    g.fillStyle = CSS.cyan;
    g.beginPath();
    g.moveTo(-1, shY + 4);
    g.lineTo(6, shY + 10);
    g.lineTo(1, shY + 11);
    g.lineTo(5, shY + 18);
    g.lineTo(-4, shY + 10);
    g.lineTo(1, shY + 9);
    g.closePath();
    g.fill();
    g.strokeStyle = out;
    g.lineWidth = 1.4;
    g.stroke();
  }
  // head: face always in helmet shadow
  const hx = 2;
  const hy = shY - 6 + (climb ? 0 : breathe * 0.3);
  g.fillStyle = '#0b0f1c';
  g.beginPath();
  g.ellipse(hx + 1, hy, 8.5, 8, 0, 0, 7);
  g.fill();
  g.fillStyle = comic ? '#ffd23f' : '#ffc531';
  g.strokeStyle = out;
  g.lineWidth = lw;
  g.beginPath();
  g.arc(hx, hy - 4, 12, Math.PI, 0);
  g.lineTo(hx + 16, hy - 3);
  g.lineTo(hx - 13, hy - 3);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,.35)';
  g.beginPath();
  g.ellipse(hx - 4, hy - 11, 5, 2.5, -0.4, 0, 7);
  g.fill();
  g.fillStyle = '#fff6c2';
  g.beginPath();
  g.arc(hx + 10, hy - 8, 3.5, 0, 7);
  g.fill();
  if (caped) {
    g.fillStyle = CSS.cyan;
    g.beginPath();
    g.moveTo(hx - 3, hy - 15);
    g.lineTo(hx + 3, hy - 24);
    g.lineTo(hx + 1, hy - 17);
    g.lineTo(hx + 7, hy - 19);
    g.lineTo(hx - 1, hy - 10);
    g.closePath();
    g.fill();
    g.strokeStyle = out;
    g.lineWidth = 1.4;
    g.stroke();
  }
  // front arm (on top) + orange gloves
  const glove = '#ff8c1a';
  if (pose.splicing) {
    const tw = Math.sin(t * 24) * 0.5;
    limb(g, 4, shY + 4, Math.PI * 0.72 + tw, 11, -0.9, 10, 7, coat, out, lw);
    g.fillStyle = glove;
    g.beginPath();
    g.arc(18, shY - 2, 4, 0, 7);
    g.fill();
  } else if (climb) limb(g, 4, shY + 4, Math.PI - 0.2 + Math.sin(pl.anim * 3) * 0.4, 11, -0.6, 11, 7, coat, out, lw);
  else if (cele) {
    limb(g, 4, shY + 4, Math.PI - 0.1 + Math.sin(t * 10) * 0.2, 11, 0.1, 11, 7, coat, out, lw);
  } else if (grind) limb(g, 4, shY + 4, 1.4, 11, 0.3, 11, 7, coat, out, lw);
  else if (hurt) limb(g, 4, shY + 4, Math.PI * 0.8, 11, 0.4, 11, 7, coat, out, lw);
  else limb(g, 4, shY + 4, armSw, 11, -0.45 - (run ? 0.4 : 0), 11, 7, coat, out, lw);
  g.restore();
  return [HERO_CANVAS.ox + pl.face * (hx + 10), HERO_CANVAS.oy + (hy - 8) * pl.squash];
}
