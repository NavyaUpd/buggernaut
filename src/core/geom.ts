// Panel geometry and point-in-polygon (§9.3). Pure TS.
import { PANEL, VIEW } from '../config';

export type Pt = readonly [number, number];
export type Quad = readonly [Pt, Pt, Pt, Pt]; // TL, TR, BR, BL

const T = VIEW.tile;
const OY = VIEW.offsetY;

/** Tile centre in px. */
export function tileCentre(x: number, y: number): [number, number] {
  return [x * T + T / 2, y * T + OY + T / 2];
}

/** The hand-ruled comic panel a lamp at tile (x, y) with radius r tiles drops into the night. */
export function panelQuad(tx: number, ty: number, rTiles: number): Quad {
  const [x, y] = tileCentre(tx, ty);
  const r = rTiles * T;
  const x0 = x - r * PANEL.left;
  const x1 = x + r * PANEL.right;
  const y0 = y - r * PANEL.top;
  const y1 = VIEW.height - OY;
  const n = PANEL.nudge;
  return [
    [x0 + n[0]![0], y0 + n[0]![1]],
    [x1 + n[1]![0], y0 + n[1]![1]],
    [x1 + n[2]![0], y1 + n[2]![1]],
    [x0 + n[3]![0], y1 + n[3]![1]],
  ];
}

export function inQuad(px: number, py: number, q: readonly Pt[]): boolean {
  let ins = false;
  for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
    const [xi, yi] = q[i]!;
    const [xj, yj] = q[j]!;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function quadBox(q: readonly Pt[]): Box {
  const xs = q.map((p) => p[0]);
  const ys = q.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

/** x of the slanted colour-sweep edge at row py, for sweep progress k in 0..1 (prototype wipeX). */
export function wipeX(box: Box, k: number, py: number): number {
  const s = PANEL.wipeSlant;
  return box.x0 - 140 + (box.x1 - box.x0 + 300 + (box.y1 - box.y0) * s) * k - (py - box.y0) * s;
}

export const ease = {
  outCubic: (k: number) => 1 - Math.pow(1 - k, 3),
  inOut: (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
  outBack: (k: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
  },
  clamp: (k: number) => Math.max(0, Math.min(1, k)),
};

/** Deterministic PRNG (Park–Miller), so baked art is identical every run. */
export function makeRng(seed: number): () => number {
  let s = Math.max(1, Math.floor(seed)) % 2147483647;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
