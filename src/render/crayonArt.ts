// Procedural "Chinni's crayon drawing" fallbacks for every hand-drawn page in CLAUDE.md §9.6.
// If a real photographed PNG exists (public/art/crayon/<name>.png, loaded by BootScene as `png_<name>`), it wins.
// Everything here is plain Canvas-2D so it can be baked once at boot into Phaser CanvasTextures.
import type Phaser from 'phaser';
import { FONTS } from '../config';

type G = CanvasRenderingContext2D;
type Pt = [number, number];
type Shape = readonly Pt[] | readonly (readonly Pt[])[];

// ================= palette (bright crayon box, §9.2) =================
const K = {
  ink: '#1c1b24',
  paper: '#fffdf7',
  white: '#ffffff',
  yellow: '#ffd400',
  helmet: '#ffc531',
  orange: '#ff9f1c',
  red: '#ff3b30',
  blue: '#2f6bff',
  sky: '#9ed8ff',
  green: '#2ecc71',
  dkgreen: '#1f8f4e',
  magenta: '#ff3e9a',
  pink: '#ff8fc0',
  cyan: '#4ff0ff',
  navy: '#24317e',
  night: '#1b2257',
  purple: '#6a4bc9',
  brown: '#8a5a2e',
  dkbrown: '#5a3518',
  khaki: '#a8935a',
  khakiDk: '#7d6b3d',
  silver: '#d2dce4',
  grey: '#8d93a3',
  dkgrey: '#4d5263',
  skin: '#c98a5c',
  skinDk: '#9c6038',
  hair: '#23160f',
  peach: '#ffb98c',
  teal: '#22a99a',
  rain: '#7fb2ff',
} as const;

// ================= deterministic rng (each page reseeds so art is stable between runs) =================
let seed = 1;
function reseed(s: number): void {
  seed = s >>> 0 || 1;
}
function rnd(): number {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rr = (a: number, b: number): number => a + (b - a) * rnd();
const jit = (a: number): number => (rnd() - 0.5) * 2 * a;

function mk(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}
function ctx2d(c: HTMLCanvasElement): G {
  const g = c.getContext('2d');
  if (!g) throw new Error('crayonArt: 2D canvas unavailable');
  return g;
}

// ================= geometry helpers =================
function densify(pts: readonly Pt[], step: number, closed: boolean): Pt[] {
  const src: Pt[] = closed && pts.length > 0 ? [...pts, pts[0]!] : [...pts];
  const out: Pt[] = [];
  for (let i = 0; i < src.length - 1; i++) {
    const a = src[i]!;
    const b = src[i + 1]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  const last = src[src.length - 1];
  if (last) out.push([last[0], last[1]]);
  return out;
}

function ellipsePts(cx: number, cy: number, rx: number, ry: number, rot = 0, wob = 0.035): Pt[] {
  const n = Math.max(14, Math.ceil((rx + ry) / 3.5));
  const p1 = rr(0, 6.28);
  const p2 = rr(0, 6.28);
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + wob * Math.sin(3 * a + p1) + wob * 0.6 * Math.sin(5 * a + p2);
    const x = Math.cos(a) * rx * k;
    const y = Math.sin(a) * ry * k;
    pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return pts;
}

/** Arc of an ellipse from angle a0 to a1 (radians, clockwise in screen space). */
function arcPts(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 24): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

function rectPts(x: number, y: number, w: number, h: number, wob = 0): Pt[] {
  return [
    [x + jit(wob), y + jit(wob)],
    [x + w + jit(wob), y + jit(wob)],
    [x + w + jit(wob), y + h + jit(wob)],
    [x + jit(wob), y + h + jit(wob)],
  ];
}

function quadPts(a: Pt, c: Pt, b: Pt, n = 20): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return pts;
}

function sag(x1: number, y1: number, x2: number, y2: number, s: number): Pt[] {
  return quadPts([x1, y1], [(x1 + x2) / 2, (y1 + y2) / 2 + s * 2], [x2, y2]);
}

/** A thick limb/tube around a polyline (for arms, plaits, sleeves). */
function tube(pts: readonly Pt[], w0: number, w1 = w0): Pt[] {
  const left: Pt[] = [];
  const right: Pt[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(n - 1, i + 1)]!;
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    dx /= L;
    dy /= L;
    const w = (w0 + (w1 - w0) * (i / Math.max(1, n - 1))) / 2;
    left.push([p[0] - dy * w, p[1] + dx * w]);
    right.push([p[0] + dy * w, p[1] - dx * w]);
  }
  return [...left, ...right.reverse()];
}

function isMulti(s: Shape): s is readonly (readonly Pt[])[] {
  return s.length > 0 && Array.isArray(s[0]) && Array.isArray((s[0] as readonly unknown[])[0]);
}
function polys(s: Shape): (readonly Pt[])[] {
  return isMulti(s) ? [...s] : [s as readonly Pt[]];
}
function pathOf(g: G, s: Shape): void {
  g.beginPath();
  for (const poly of polys(s)) {
    poly.forEach((p, i) => (i === 0 ? g.moveTo(p[0], p[1]) : g.lineTo(p[0], p[1])));
    g.closePath();
  }
}
function bbox(s: Shape): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const poly of polys(s))
    for (const p of poly) {
      x0 = Math.min(x0, p[0]);
      y0 = Math.min(y0, p[1]);
      x1 = Math.max(x1, p[0]);
      y1 = Math.max(y1, p[1]);
    }
  return { x0, y0, x1, y1 };
}

// ================= crayon primitives =================
interface StrokeOpts {
  passes?: number;
  jitter?: number;
  alpha?: number;
  closed?: boolean;
}

/** Waxy crayon line: several jittered passes with broken dashes so the paper tooth shows through. */
function crayon(g: G, pts: readonly Pt[], col: string, w: number, o: StrokeOpts = {}): void {
  if (pts.length < 2) return;
  const passes = o.passes ?? 3;
  const j = o.jitter ?? Math.max(0.5, w * 0.16);
  const a = o.alpha ?? 1;
  const dense = densify(pts, Math.max(3, w * 1.6), o.closed ?? false);
  g.save();
  g.strokeStyle = col;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (let p = 0; p < passes; p++) {
    const ox = jit(w * 0.22);
    const oy = jit(w * 0.22);
    g.globalAlpha = a * (p === 0 ? 0.9 : rr(0.5, 0.8));
    g.lineWidth = w * (p === 0 ? 0.78 : rr(0.55, 1.05));
    if (p > 0) {
      const d = w * rr(3, 8) + 5;
      g.setLineDash([d, rr(1, 2.6) * Math.max(1, w * 0.35)]);
      g.lineDashOffset = rr(0, d);
    } else g.setLineDash([]);
    g.beginPath();
    dense.forEach((q, i) => {
      const x = q[0] + ox + jit(j);
      const y = q[1] + oy + jit(j);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    });
    g.stroke();
  }
  g.restore();
}

/** Closed crayon outline. */
function outline(g: G, s: Shape, col: string = K.ink, w = 4): void {
  for (const poly of polys(s)) crayon(g, poly, col, w, { closed: true });
}

interface FillOpts {
  angle?: number;
  gap?: number;
  w?: number;
  alpha?: number;
  base?: number;
  cross?: boolean;
}

/** Crayon hatch fill: diagonal back-and-forth strokes with gaps and pressure changes, clipped to the shape. */
function scribble(g: G, s: Shape, col: string, o: FillOpts = {}): void {
  const ang = o.angle ?? -0.9;
  const gap = o.gap ?? 6;
  const lw = o.w ?? gap * 0.95;
  const a = o.alpha ?? 0.85;
  const b = bbox(s);
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const R = Math.hypot(b.x1 - b.x0, b.y1 - b.y0) / 2 + gap * 2;
  g.save();
  pathOf(g, s);
  g.clip();
  if (o.base) {
    g.globalAlpha = o.base;
    g.fillStyle = col;
    g.fill();
  }
  g.strokeStyle = col;
  g.lineCap = 'round';
  const passes = o.cross ? 2 : 1;
  for (let p = 0; p < passes; p++) {
    const an = ang + p * 0.55;
    const ux = Math.cos(an);
    const uy = Math.sin(an);
    for (let d = -R; d <= R; d += gap * rr(0.75, 1.25)) {
      if (rnd() < 0.07) continue;
      const px = cx - uy * d;
      const py = cy + ux * d;
      const bend = jit(gap * 0.8);
      g.globalAlpha = a * rr(0.55, 1) * (p ? 0.55 : 1);
      g.lineWidth = lw * rr(0.7, 1.1);
      g.beginPath();
      g.moveTo(px - ux * R + jit(2), py - uy * R + jit(2));
      g.quadraticCurveTo(px - uy * bend, py + ux * bend, px + ux * R + jit(2), py + uy * R + jit(2));
      g.stroke();
    }
  }
  g.restore();
}

/** Knock a shape out of the ink layer so the paper shows (a child leaving space before colouring). */
function clearShape(g: G, s: Shape): void {
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  pathOf(g, s);
  g.fill();
  g.restore();
}

/** Clear + colour + outline: the standard way Chinni draws a thing. */
function blob(g: G, s: Shape, fill: string | null, line: string | null = K.ink, lw = 4, fo: FillOpts = {}, clear = true): void {
  if (clear) clearShape(g, s);
  if (fill) scribble(g, s, fill, { base: 0.32, ...fo });
  if (line) outline(g, s, line, lw);
}

function crayonRect(g: G, x: number, y: number, w: number, h: number, col: string = K.ink, lw = 6): void {
  const o = lw * 1.3;
  crayon(g, [[x - o, y + jit(2)], [x + w + o, y + jit(2)]], col, lw);
  crayon(g, [[x + w + jit(2), y - o], [x + w + jit(2), y + h + o]], col, lw);
  crayon(g, [[x + w + o, y + h + jit(2)], [x - o, y + h + jit(2)]], col, lw);
  crayon(g, [[x + jit(2), y + h + o], [x + jit(2), y - o]], col, lw);
}

function rain(g: G, x: number, y: number, w: number, h: number, n: number, col: string = K.rain, len = 22, avoid?: (px: number, py: number) => boolean): void {
  const ang = 0.21; // ≈ 12°
  for (let i = 0; i < n; i++) {
    const px = x + rnd() * w;
    const py = y + rnd() * h;
    if (avoid && avoid(px, py)) continue;
    const l = len * rr(0.6, 1.3);
    crayon(g, [[px, py], [px - Math.sin(ang) * l, py + Math.cos(ang) * l]], col, rr(2, 3.4), { passes: 2, alpha: rr(0.55, 0.95) });
  }
}

function starPts(cx: number, cy: number, r: number, rot = -Math.PI / 2): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5;
    const rad = i % 2 ? r * 0.45 : r;
    pts.push([cx + Math.cos(a) * rad + jit(r * 0.05), cy + Math.sin(a) * rad + jit(r * 0.05)]);
  }
  return pts;
}

function heartPts(cx: number, cy: number, s: number, rot = 0): Pt[] {
  const pts: Pt[] = [];
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  for (let i = 0; i < 40; i++) {
    const t = (i / 40) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    const px = (x * s) / 16;
    const py = (y * s) / 16;
    pts.push([cx + px * c - py * sn, cy + px * sn + py * c]);
  }
  return pts;
}

/** Classic zigzag lightning bolt, top point at (x, y), height h. */
function boltPts(x: number, y: number, h: number, lean = 0.3): Pt[] {
  const w = h * 0.42;
  const L = (dy: number): number => x - lean * dy;
  return [
    [L(0) + w * 0.15, y],
    [L(h * 0.5) - w * 0.42, y + h * 0.56],
    [L(h * 0.5) - w * 0.02, y + h * 0.5],
    [L(h) - w * 0.32, y + h],
    [L(h * 0.45) + w * 0.5, y + h * 0.38],
    [L(h * 0.45) + w * 0.08, y + h * 0.44],
    [L(0) + w * 0.62, y],
  ];
}

function sparkle(g: G, cx: number, cy: number, r: number, col: string): void {
  crayon(g, [[cx - r, cy], [cx + r, cy]], col, Math.max(2, r * 0.22), { passes: 2 });
  crayon(g, [[cx, cy - r], [cx, cy + r]], col, Math.max(2, r * 0.22), { passes: 2 });
  crayon(g, [[cx - r * 0.55, cy - r * 0.55], [cx + r * 0.55, cy + r * 0.55]], col, Math.max(1.5, r * 0.15), { passes: 1 });
  crayon(g, [[cx + r * 0.55, cy - r * 0.55], [cx - r * 0.55, cy + r * 0.55]], col, Math.max(1.5, r * 0.15), { passes: 1 });
}

function sparkBurst(g: G, cx: number, cy: number, r: number): void {
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + jit(0.3);
    const l = r * rr(0.6, 1.1);
    const mx = cx + Math.cos(a) * l * 0.5 + jit(4);
    const my = cy + Math.sin(a) * l * 0.5 + jit(4);
    crayon(g, [[cx, cy], [mx, my], [cx + Math.cos(a) * l, cy + Math.sin(a) * l]], i % 2 ? K.yellow : K.cyan, 3.5, { passes: 2 });
  }
}

function cloud(g: G, cx: number, cy: number, s: number, fill: string, line: string, fo: FillOpts = {}): void {
  const parts: [number, number, number][] = [
    [-0.55, 0.12, 0.42],
    [-0.2, -0.18, 0.55],
    [0.25, -0.1, 0.5],
    [0.6, 0.15, 0.38],
  ];
  const shapes = parts.map(([dx, dy, r]) => ellipsePts(cx + dx * s, cy + dy * s, r * s, r * s * 0.85));
  const baseR = rectPts(cx - s * 0.75, cy, s * 1.5, s * 0.42);
  const all = [...shapes, baseR];
  clearShape(g, all);
  scribble(g, all, fill, { base: 0.4, gap: 7, ...fo });
  for (const [dx, dy, r] of parts) crayon(g, arcPts(cx + dx * s, cy + dy * s, r * s, r * s * 0.85, Math.PI * 1.02, Math.PI * 1.98), line, 4);
  crayon(g, [[cx - s * 0.85, cy + s * 0.42], [cx + s * 0.85, cy + s * 0.42]], line, 4);
}

// ================= handwriting =================
interface HandOpts {
  align?: 'left' | 'center';
  rot?: number;
  weight?: number;
  outline?: string;
}

/** Chinni's lowercase handwriting: each letter wobbles a little in angle and baseline, waxy multi-pass fill. */
function handText(g: G, text: string, x: number, y: number, size: number, col: string, o: HandOpts = {}): number {
  g.save();
  g.font = `${o.weight ?? 700} ${size}px ${FONTS.hand}`;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.lineJoin = 'round';
  const chars = [...text];
  const total = g.measureText(text).width;
  const ws = chars.map((c) => g.measureText(c).width);
  const sum = ws.reduce((a, b) => a + b, 0) || 1;
  const k = total / sum; // keep the font's own spacing overall
  g.translate(x, y);
  g.rotate(o.rot ?? 0);
  let cx = o.align === 'center' ? -total / 2 : 0;
  const placed = chars.map((c, i) => {
    const w = (ws[i] ?? 0) * k;
    const p = { c, x: cx + w / 2, y: jit(size * 0.035), r: jit(0.07) };
    cx += w;
    return p;
  });
  const each = (fn: (c: string) => void): void => {
    for (const p of placed) {
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.r);
      fn(p.c);
      g.restore();
    }
  };
  if (o.outline) {
    g.strokeStyle = o.outline;
    g.lineWidth = size * 0.2;
    each((c) => g.strokeText(c, 0, 0));
  }
  g.fillStyle = col;
  const passes: [number, number, number][] = [
    [jit(size * 0.02), jit(size * 0.02), 0.65],
    [jit(size * 0.02), jit(size * 0.02), 0.65],
    [0, 0, 0.95],
  ];
  for (const [dx, dy, a] of passes) {
    g.globalAlpha = a;
    each((c) => g.fillText(c, dx, dy));
  }
  g.globalAlpha = 0.5;
  g.strokeStyle = col;
  g.lineWidth = Math.max(1, size * 0.03);
  each((c) => g.strokeText(c, 0, 0));
  g.restore();
  return total;
}

// ================= paper + wax grain =================
let grainC: HTMLCanvasElement | null = null;
function grainTile(): HTMLCanvasElement {
  if (grainC) return grainC;
  const c = mk(160, 160);
  const g = ctx2d(c);
  let s = 12345;
  const r = (): number => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 3200; i++) {
    g.fillStyle = `rgba(0,0,0,${0.2 + r() * 0.8})`;
    const w = r() < 0.25 ? 2 + r() * 3 : 1 + r();
    g.fillRect(r() * 160, r() * 160, w, 1 + r() * 0.8);
  }
  grainC = c;
  return c;
}
/** Punch the paper tooth into the ink layer (wax skips over the paper's bumps). */
function grain(g: G, w: number, h: number, strength: number): void {
  const p = g.createPattern(grainTile(), 'repeat');
  if (!p) return;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-out';
  g.globalAlpha = strength;
  g.fillStyle = p;
  g.fillRect(0, 0, w, h);
  g.restore();
}

function paper(g: G, w: number, h: number, ruled: boolean): void {
  g.save();
  g.fillStyle = K.paper;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < (w * h) / 450; i++) {
    g.fillStyle = `rgba(120,105,80,${rr(0.03, 0.1)})`;
    g.fillRect(rnd() * w, rnd() * h, rr(1, 2.5), rr(1, 2));
  }
  g.strokeStyle = 'rgba(150,135,110,0.08)';
  g.lineWidth = 1;
  for (let i = 0; i < 70; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + jit(20), y + jit(20), x + jit(40), y + jit(40));
    g.stroke();
  }
  if (ruled) {
    const sp = h / 18;
    g.strokeStyle = 'rgba(110,160,230,0.22)';
    g.lineWidth = Math.max(1, h / 600);
    for (let y = sp * 1.6; y < h; y += sp) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y + jit(1));
      g.stroke();
    }
    g.strokeStyle = 'rgba(255,110,110,0.28)';
    g.beginPath();
    g.moveTo(w * 0.045, 0);
    g.lineTo(w * 0.045, h);
    g.stroke();
  }
  const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(140,120,90,0)');
  vg.addColorStop(1, 'rgba(140,120,90,0.12)');
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
  g.restore();
}

interface PageSpec {
  w: number; // design size; draw() works in these units and is scaled to the target
  h: number;
  bg: 'paper' | 'ruled' | 'none';
  seed: number;
  grain: number;
  draw: (g: G) => void;
}

function renderPage(target: G, w: number, h: number, spec: PageSpec): void {
  reseed(spec.seed);
  if (spec.bg !== 'none') paper(target, w, h, spec.bg === 'ruled');
  const ink = mk(w, h);
  const ig = ctx2d(ink);
  ig.scale(w / spec.w, h / spec.h);
  spec.draw(ig);
  grain(ig, w, h, spec.grain);
  target.drawImage(ink, 0, 0);
}

// ================= shared scenery =================
function pole(g: G, x: number, top: number, bottom: number, crossY: number, crossW = 90): void {
  blob(g, rectPts(x - 9, top, 18, bottom - top, 1.5), K.brown, K.ink, 4, { gap: 5, angle: -1.3 });
  blob(g, rectPts(x - crossW / 2, crossY, crossW, 12, 1), K.dkbrown, K.ink, 3.5, { gap: 5 });
  for (const ix of [x - crossW / 2 + 8, x + crossW / 2 - 8]) blob(g, ellipsePts(ix, crossY - 8, 6, 8), K.white, K.ink, 3);
}

function building(
  g: G,
  x: number,
  top: number,
  w: number,
  bottom: number,
  wall: string,
  o: { win?: string; cols?: number; rows?: number; tank?: boolean; lit?: number[] } = {},
): void {
  blob(g, rectPts(x, top, w, bottom - top, 2), wall, K.ink, 4.5, { gap: 6, angle: -0.8 });
  crayon(g, [[x - 6, top], [x + w + 6, top]], K.ink, 6);
  if (o.tank) {
    blob(g, rectPts(x + 14, top - 34, 40, 34, 1), K.blue, K.ink, 3.5, { gap: 5 });
    blob(g, rectPts(x + 18, top - 44, 32, 10, 1), K.blue, K.ink, 3, { gap: 4 });
  }
  const cols = o.cols ?? 2;
  const rows = o.rows ?? 2;
  const ww = 26;
  const wh = 32;
  const gx = (w - cols * ww) / (cols + 1);
  let idx = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const wx = x + gx + c * (ww + gx);
      const wy = top + 26 + r * (wh + 26);
      if (wy + wh > bottom - 10) continue;
      const lit = o.lit?.includes(idx) ?? false;
      blob(g, rectPts(wx, wy, ww, wh, 1), lit ? K.yellow : (o.win ?? K.night), K.ink, 3, { gap: 4, base: 0.6 });
      idx++;
    }
}

function puddle(g: G, cx: number, cy: number, rx: number): void {
  blob(g, ellipsePts(cx, cy, rx, rx * 0.22), K.blue, K.ink, 2.5, { gap: 4, base: 0.4 });
  crayon(g, [[cx - rx * 0.5, cy - 2], [cx - rx * 0.1, cy - 4]], K.white, 3, { passes: 2 });
}

/** Left-hand corner doodles on the chapter pages (small; the title sits above them). */
function cornerStars(g: G, pts: [number, number, number, string][]): void {
  for (const [x, y, r, c] of pts) blob(g, starPts(x, y, r, -Math.PI / 2 + jit(0.3)), c, K.ink, 3, { gap: 4 });
}

/** The comic panel on the right of each chapter page, with a night sky. Title text sits on the left. */
export const CH_PANEL = { x: 640, y: 52, w: 584, h: 548 } as const;

function chapterPage(g: G, sky: [string, string], draw: (g: G) => void): void {
  const P = CH_PANEL;
  const box = rectPts(P.x, P.y, P.w, P.h);
  scribble(g, box, sky[0], { gap: 6, w: 6, alpha: 0.9, base: 0.4, angle: -0.62 });
  scribble(g, box, sky[1], { gap: 12, w: 5, alpha: 0.45, angle: 0.5 });
  g.save();
  pathOf(g, rectPts(P.x - 3, P.y - 3, P.w + 6, P.h + 6));
  g.clip();
  draw(g);
  g.restore();
  crayonRect(g, P.x, P.y, P.w, P.h, K.ink, 8);
}

// ================= ch1: Gali No. 4 (the lane, a pole and a dark lamp) =================
function ch1(g: G): void {
  chapterPage(g, [K.night, K.purple], (g) => {
    const gy = 500;
    // moon hiding behind a cloud
    blob(g, ellipsePts(1120, 130, 42, 42), K.yellow, K.ink, 4);
    cloud(g, 1080, 150, 90, K.grey, K.ink);
    cloud(g, 760, 110, 70, K.grey, K.ink);
    // the lane: houses on both sides
    building(g, 650, 270, 160, gy, K.pink, { cols: 2, rows: 3, tank: true });
    building(g, 1060, 230, 170, gy, K.green, { cols: 2, rows: 4 });
    building(g, 820, 360, 90, gy, K.orange, { cols: 1, rows: 2 });
    // road
    blob(g, rectPts(630, gy, 610, 110), K.dkgrey, K.ink, 5, { gap: 6, angle: -0.3 });
    puddle(g, 760, 555, 50);
    puddle(g, 1110, 575, 40);
    // the pole + dead lamp
    const px = 960;
    pole(g, px, 160, gy + 6, 190, 100);
    crayon(g, sag(px - 42, 182, 630, 230, 14), K.ink, 3.2);
    crayon(g, sag(px + 42, 182, 1240, 205, 16), K.ink, 3.2);
    crayon(g, sag(px - 42, 182, 630, 260, 22), K.ink, 2.6);
    crayon(g, quadPts([px + 8, 262], [px + 80, 222], [px + 132, 250]), K.dkbrown, 9);
    blob(g, [[px + 96, 244], [px + 168, 244], [px + 182, 280], [px + 82, 280]], K.dkgrey, K.ink, 4.5, { gap: 4 });
    blob(g, ellipsePts(px + 132, 288, 40, 14), K.grey, K.ink, 4, { gap: 3, base: 0.6 }); // dark glass, no light
    crayon(g, arcPts(px + 132, 288, 26, 7, 0.3, Math.PI - 0.3, 8), K.dkgrey, 3, { passes: 2 });
    // sleeping dog by the pole
    blob(g, ellipsePts(880, gy + 26, 40, 18), K.brown, K.ink, 3.5, { gap: 5 });
    blob(g, ellipsePts(920, gy + 18, 18, 15), K.brown, K.ink, 3.5, { gap: 5 });
    blob(g, ellipsePts(912, gy + 8, 6, 11, 0.5), K.dkbrown, K.ink, 3, { gap: 4 });
    crayon(g, arcPts(925, gy + 18, 6, 4, 0.2, Math.PI - 0.2, 8), K.ink, 2.5);
    for (const [zx, zy, s] of [
      [940, 470, 12],
      [962, 446, 16],
    ] as const)
      crayon(g, [[zx, zy], [zx + s, zy], [zx, zy + s], [zx + s, zy + s]], K.white, 3);
    rain(g, 640, 52, 584, 548, 150);
  });
  cornerStars(g, [
    [140, 500, 22, K.yellow],
    [250, 560, 15, K.yellow],
    [460, 520, 18, K.cyan],
  ]);
}

// ================= ch2: The Bazaar (stalls with snapped wires) =================
function stall(g: G, x: number, w: number, a: string, b: string, goods: string[]): void {
  const top = 300;
  const table = 420;
  const gy = 500;
  for (const sx of [x + 6, x + w - 6]) blob(g, rectPts(sx - 4, top, 8, table - top), K.dkbrown, K.ink, 3, { gap: 4 });
  blob(g, rectPts(x - 6, table, w + 12, gy - table, 1.5), K.brown, K.ink, 4, { gap: 5, angle: -1.2 });
  crayon(g, [[x, table + 26], [x + w, table + 26]], K.dkbrown, 3);
  // goods piled on the table
  goods.forEach((c, i) => {
    const n = 4;
    const gx = x + 18 + (i % n) * ((w - 36) / (n - 1));
    const gy2 = table - 12 - Math.floor(i / n) * 20;
    blob(g, ellipsePts(gx + (Math.floor(i / n) ? 12 : 0), gy2, 13, 12), c, K.ink, 2.6, { gap: 3.5, base: 0.5 });
  });
  // striped awning with a scalloped edge
  const ay = top - 46;
  const stripes = 6;
  const sw = (w + 24) / stripes;
  for (let i = 0; i < stripes; i++) {
    const sx = x - 12 + i * sw;
    blob(g, [[sx + 6, ay], [sx + sw + 6, ay], [sx + sw, ay + 46], [sx, ay + 46]], i % 2 ? a : b, null, 0, { gap: 4, base: 0.55 });
    blob(g, arcPts(sx + sw / 2, ay + 46, sw / 2, 12, 0, Math.PI, 10), i % 2 ? a : b, null, 0, { gap: 4, base: 0.55 });
  }
  crayon(g, [[x - 6, ay], [x + w + 18, ay]], K.ink, 4.5);
  crayon(g, [[x - 12, ay + 46], [x + w + 12, ay + 46]], K.ink, 3.5);
  for (let i = 0; i < stripes; i++) crayon(g, arcPts(x - 12 + i * sw + sw / 2, ay + 46, sw / 2, 12, 0, Math.PI, 10), K.ink, 3);
}

function ch2(g: G): void {
  chapterPage(g, [K.night, K.navy], (g) => {
    const gy = 500;
    building(g, 650, 170, 130, gy, K.purple, { cols: 2, rows: 4, win: K.night });
    building(g, 1090, 150, 140, gy, K.teal, { cols: 2, rows: 4, win: K.night });
    blob(g, rectPts(630, gy, 610, 110), K.dkgrey, K.ink, 5, { gap: 6, angle: -0.3 });
    // poles at both ends
    pole(g, 690, 120, gy, 150, 80);
    pole(g, 1180, 110, gy, 140, 80);
    // one intact wire, bunting
    crayon(g, sag(726, 142, 1144, 132, 22), K.ink, 3);
    const bunt = sag(690, 200, 1180, 196, 18);
    crayon(g, bunt, K.ink, 2.4);
    for (let i = 1; i < bunt.length - 1; i++) {
      const p = bunt[i]!;
      const col = [K.red, K.yellow, K.green, K.magenta, K.blue][i % 5]!;
      blob(g, [[p[0] - 9, p[1]], [p[0] + 9, p[1]], [p[0] + jit(2), p[1] + 22]], col, K.ink, 2.2, { gap: 3, base: 0.6 });
    }
    // wind swirls
    for (const [wx, wy] of [
      [760, 90],
      [930, 70],
    ] as const) {
      const sw: Pt[] = [];
      for (let i = 0; i < 26; i++) {
        const t = i / 25;
        const a = t * Math.PI * 3;
        sw.push([wx - 60 + t * 120 + Math.cos(a) * 18 * (1 - t), wy + Math.sin(a) * 14 * (1 - t)]);
      }
      crayon(g, sw, K.white, 3, { passes: 2, alpha: 0.85 });
    }
    // stalls
    stall(g, 690, 130, K.red, K.white, [K.orange, K.orange, K.orange, K.orange, K.red, K.orange, K.red]);
    stall(g, 860, 130, K.blue, K.yellow, [K.yellow, K.green, K.yellow, K.green, K.yellow, K.green]);
    stall(g, 1030, 130, K.green, K.white, [K.red, K.magenta, K.red, K.magenta, K.red]);
    // the snapped wire: two live ends whipping down over the stalls with sparks
    const l = quadPts([726, 170], [820, 170], [880, 236], 16);
    const r = quadPts([1144, 162], [1020, 170], [960, 246], 16);
    crayon(g, l, K.ink, 5);
    crayon(g, r, K.ink, 5);
    sparkBurst(g, 880, 238, 34);
    sparkBurst(g, 960, 248, 38);
    puddle(g, 820, 560, 46);
    puddle(g, 1130, 580, 36);
    rain(g, 640, 52, 584, 548, 140);
  });
  // a kite caught in the wind, bottom left
  const kite: Pt[] = [
    [300, 460],
    [340, 510],
    [300, 580],
    [260, 510],
  ];
  blob(g, kite, K.magenta, K.ink, 4, { gap: 5 });
  crayon(g, [[300, 460], [300, 580]], K.ink, 2.5);
  crayon(g, [[260, 510], [340, 510]], K.ink, 2.5);
  const tail: Pt[] = [];
  for (let i = 0; i < 14; i++) tail.push([300 - i * 9, 580 + Math.sin(i * 0.9) * 12 + i * 2]);
  crayon(g, tail, K.ink, 2.5);
  cornerStars(g, [[470, 500, 16, K.yellow]]);
}

// ================= ch3: The Storm (zigzag lightning over a substation) =================
function ch3(g: G): void {
  chapterPage(g, ['#2a1f5c', K.night], (g) => {
    const gy = 520;
    // heavy storm clouds
    cloud(g, 720, 100, 120, '#5c607a', K.ink);
    cloud(g, 930, 80, 140, '#4f5470', K.ink);
    cloud(g, 1150, 110, 120, '#5c607a', K.ink);
    // big zigzag lightning down to the tower
    const bolt = boltPts(1079, 108, 222, 0.18);
    for (let i = 0; i < 2; i++)
      crayon(g, bolt.map((p) => [p[0] + jit(4), p[1] + jit(4)] as Pt), K.cyan, 10 - i * 4, { closed: true, alpha: 0.7 });
    blob(g, bolt, K.yellow, K.ink, 5, { gap: 4, base: 0.6 });
    scribble(g, bolt, K.orange, { gap: 9, w: 3, alpha: 0.45, angle: 0.4 });
    const small = boltPts(700, 170, 120, 0.25);
    blob(g, small, K.yellow, K.ink, 4, { gap: 4, base: 0.6 });
    // ground
    blob(g, rectPts(630, gy, 610, 90), K.dkgrey, K.ink, 5, { gap: 6, angle: -0.3 });
    // lattice tower
    const tx = 1010;
    const tl: Pt = [tx - 70, gy];
    const trr: Pt = [tx + 70, gy];
    const top: Pt = [tx, 330];
    crayon(g, [tl, [tx - 14, 340], top], '#b9c3d6', 7);
    crayon(g, [trr, [tx + 14, 340], top], '#b9c3d6', 7);
    for (let i = 0; i < 4; i++) {
      const y0 = gy - i * 46;
      const y1 = y0 - 46;
      const hw0 = 70 - i * 14;
      const hw1 = 70 - (i + 1) * 14;
      crayon(g, [[tx - hw0, y0], [tx + hw1, y1]], '#b9c3d6', 3.5);
      crayon(g, [[tx + hw0, y0], [tx - hw1, y1]], '#b9c3d6', 3.5);
      crayon(g, [[tx - hw1, y1], [tx + hw1, y1]], '#b9c3d6', 3.5);
    }
    crayon(g, [[tx - 70, 350], [tx + 70, 350]], '#b9c3d6', 7);
    sparkBurst(g, tx, 330, 40);
    crayon(g, sag(tx - 70, 350, 640, 300, 14), K.ink, 3);
    crayon(g, sag(tx + 70, 350, 1240, 320, 14), K.ink, 3);
    // transformers with red/white insulator stacks
    for (const [bx, bw] of [
      [690, 120],
      [1110, 100],
    ] as const) {
      blob(g, rectPts(bx, 390, bw, gy - 390, 1.5), K.grey, K.ink, 4, { gap: 5 });
      for (let f = 1; f < 5; f++) crayon(g, [[bx + (bw * f) / 5, 400], [bx + (bw * f) / 5, gy - 12]], K.dkgrey, 2.5);
      for (const ix of [bx + bw * 0.25, bx + bw * 0.75])
        for (let k = 0; k < 4; k++) blob(g, ellipsePts(ix, 382 - k * 12, 9, 5), k % 2 ? K.white : K.red, K.ink, 2.2, { gap: 3, base: 0.6 });
    }
    // chain-link fence in front
    const fy = 440;
    for (let x = 620; x < 1250; x += 26) {
      crayon(g, [[x, fy], [x + 80, gy]], K.silver, 2, { passes: 2, alpha: 0.75 });
      crayon(g, [[x + 80, fy], [x, gy]], K.silver, 2, { passes: 2, alpha: 0.75 });
    }
    for (let x = 650; x < 1240; x += 110) blob(g, rectPts(x - 4, fy - 10, 8, gy - fy + 10), K.grey, K.ink, 2.5, { gap: 3 });
    crayon(g, [[630, fy], [1240, fy]], K.grey, 4);
    // danger sign
    const sx = 880;
    blob(g, [[sx, 448], [sx + 34, 506], [sx - 34, 506]], K.yellow, K.red, 5, { gap: 3, base: 0.7 });
    blob(g, boltPts(sx + 2, 462, 36, 0.2), K.ink, null, 0, { gap: 2, base: 1 });
    rain(g, 640, 52, 584, 548, 230, K.rain, 26);
  });
  blob(g, [[190, 490], [210, 530], [200, 560], [180, 560], [170, 530]], K.blue, K.ink, 3.5, { gap: 4 });
  blob(g, [[280, 540], [296, 570], [288, 594], [272, 594], [264, 570]], K.blue, K.ink, 3, { gap: 4 });
  blob(g, boltPts(420, 470, 110, 0.25), K.yellow, K.ink, 4, { gap: 4 });
}

// ================= ch4: Ghar (a small house with one window) =================
function ch4(g: G): void {
  chapterPage(g, [K.night, K.purple], (g) => {
    const gy = 510;
    blob(g, ellipsePts(1150, 120, 36, 36), K.yellow, K.ink, 4);
    cloud(g, 1110, 146, 70, K.grey, K.ink);
    cornerStars(g, [
      [720, 110, 12, K.yellow],
      [860, 80, 9, K.yellow],
      [960, 150, 10, K.yellow],
    ]);
    // grass
    blob(g, rectPts(630, gy, 610, 100), K.green, K.ink, 5, { gap: 6, angle: -1.2 });
    for (let x = 650; x < 1230; x += 34) crayon(g, [[x, gy + 4], [x + 6, gy - 12], [x + 12, gy + 4]], K.dkgreen, 3, { passes: 2 });
    // coconut tree
    const trunk = quadPts([720, gy + 6], [690, 360], [740, 230], 16);
    blob(g, tube(trunk, 28, 16), K.brown, K.ink, 3.5, { gap: 4, angle: 0.2 });
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.55;
      const end: Pt = [740 + Math.cos(a) * 110, 230 + Math.sin(a) * 50 + 40];
      const mid: Pt = [740 + Math.cos(a) * 60, 230 + Math.sin(a) * 50 - 10];
      const leaf = quadPts([740, 230], mid, end, 10);
      blob(g, tube(leaf, 22, 4), K.green, K.ink, 3, { gap: 4 });
    }
    for (const [cx, cy] of [
      [730, 246],
      [752, 250],
    ] as const)
      blob(g, ellipsePts(cx, cy, 10, 10), K.dkbrown, K.ink, 2.5, { gap: 3 });
    // the house
    const hx = 850;
    const hw = 270;
    const ht = 330;
    blob(g, rectPts(hx, ht, hw, gy - ht, 2), K.peach, K.ink, 5, { gap: 6, angle: -0.8 });
    blob(g, [[hx - 26, ht + 4], [hx + hw / 2, ht - 120], [hx + hw + 26, ht + 4]], K.red, K.ink, 5, { gap: 5 });
    // the one window: dark, with a small candle glow (people waiting in the blackout)
    const wx = hx + 40;
    const wy = ht + 50;
    blob(g, rectPts(wx, wy, 86, 80, 1.5), K.night, K.ink, 4.5, { gap: 4, base: 0.65 });
    blob(g, ellipsePts(wx + 43, wy + 54, 20, 18), K.orange, null, 0, { gap: 4, base: 0.45, alpha: 0.6 });
    blob(g, ellipsePts(wx + 43, wy + 52, 5, 8), K.yellow, null, 0, { gap: 2, base: 0.9 });
    crayon(g, [[wx + 43, wy], [wx + 43, wy + 80]], K.dkbrown, 4);
    crayon(g, [[wx, wy + 40], [wx + 86, wy + 40]], K.dkbrown, 4);
    // door + step + pot
    blob(g, rectPts(hx + 170, ht + 70, 64, gy - ht - 70, 1.5), K.brown, K.ink, 4.5, { gap: 5 });
    blob(g, ellipsePts(hx + 222, ht + 140, 4, 4), K.yellow, K.ink, 2, { gap: 2 });
    blob(g, [[hx + 142, gy - 30], [hx + 166, gy - 30], [hx + 162, gy], [hx + 146, gy]], K.orange, K.ink, 3, { gap: 3 });
    crayon(g, [[hx + 154, gy - 30], [hx + 146, gy - 54]], K.dkgreen, 4);
    crayon(g, [[hx + 154, gy - 30], [hx + 164, gy - 52]], K.dkgreen, 4);
    // path from the door
    blob(g, [[hx + 172, gy], [hx + 232, gy], [hx + 262, 600], [hx + 130, 600]], K.peach, K.ink, 3.5, { gap: 6 });
    // the pole outside with the one snapped wire
    pole(g, 1185, 230, gy + 4, 254, 60);
    crayon(g, quadPts([1160, 248], [1130, 280], [1140, 330], 10), K.ink, 3.5);
    crayon(g, quadPts([hx + hw, 360], [1110, 370], [1112, 404], 10), K.ink, 3.5);
    sparkBurst(g, 1140, 332, 18);
    puddle(g, 800, 560, 44);
    rain(g, 640, 52, 584, 548, 70);
  });
  blob(g, heartPts(220, 520, 34, -0.2), K.red, K.ink, 4, { gap: 4 });
  cornerStars(g, [[420, 540, 18, K.yellow]]);
}

// ================= Chinni (girl about 8, big T-shirt) =================
function chinniFace(g: G, cx: number, cy: number, r: number): void {
  // plaits behind the head with red ribbons
  for (const s of [-1, 1]) {
    const pl = quadPts([cx + s * r * 0.8, cy + r * 0.1], [cx + s * r * 1.35, cy + r * 0.7], [cx + s * r * 1.15, cy + r * 1.5], 10);
    blob(g, tube(pl, r * 0.42, r * 0.28), K.hair, K.ink, 3.5, { gap: 4, base: 0.6 });
    const bx = cx + s * r * 1.2;
    const by = cy + r * 1.35;
    blob(g, [[bx, by], [bx - r * 0.3, by - r * 0.2], [bx - r * 0.3, by + r * 0.2]], K.red, K.ink, 3, { gap: 3 });
    blob(g, [[bx, by], [bx + r * 0.3, by - r * 0.2], [bx + r * 0.3, by + r * 0.2]], K.red, K.ink, 3, { gap: 3 });
  }
  blob(g, ellipsePts(cx, cy, r, r * 1.02), K.skin, K.ink, 4.5, { gap: 5, base: 0.45 });
  // hair cap + fringe
  const cap: Pt[] = [...arcPts(cx, cy - r * 0.02, r * 1.06, r * 1.08, Math.PI * 0.98, Math.PI * 2.02, 20)];
  for (let i = 0; i <= 6; i++) cap.push([cx + r * (0.95 - (i / 6) * 1.9), cy - r * (0.32 + (i % 2) * 0.16)]);
  blob(g, cap, K.hair, K.ink, 4, { gap: 4, base: 0.6 });
  // eyes: big, shiny
  for (const s of [-1, 1]) {
    const ex = cx + s * r * 0.36;
    const ey = cy + r * 0.05;
    blob(g, ellipsePts(ex, ey, r * 0.13, r * 0.17), K.ink, null, 0, { gap: 2, base: 1 });
    blob(g, ellipsePts(ex + r * 0.04, ey - r * 0.06, r * 0.045, r * 0.045), K.white, null, 0, { base: 1 }, false);
    crayon(g, arcPts(ex, ey - r * 0.32, r * 0.16, r * 0.08, Math.PI * 1.1, Math.PI * 1.9, 8), K.hair, 3.5);
    blob(g, ellipsePts(cx + s * r * 0.58, cy + r * 0.38, r * 0.16, r * 0.1), K.pink, null, 0, { gap: 3, base: 0.5 }, false);
  }
  crayon(g, [[cx, cy + r * 0.2], [cx - r * 0.05, cy + r * 0.32], [cx + r * 0.03, cy + r * 0.34]], K.skinDk, 3);
  // open happy smile
  const mouth: Pt[] = [[cx - r * 0.32, cy + r * 0.46], [cx + r * 0.32, cy + r * 0.46], ...arcPts(cx, cy + r * 0.46, r * 0.32, r * 0.3, 0, Math.PI, 12)];
  blob(g, mouth, '#a3202e', K.ink, 3.5, { gap: 3, base: 0.7 });
  blob(g, ellipsePts(cx, cy + r * 0.66, r * 0.14, r * 0.07), K.pink, null, 0, { gap: 2, base: 0.7 }, false);
}

function openComic(g: G, cx: number, cy: number, w: number, h: number, rot: number): void {
  g.save();
  g.translate(cx, cy);
  g.rotate(rot);
  for (const s of [-1, 1]) {
    const pg: Pt[] = s < 0 ? [[-w / 2, -h / 2 + 6], [0, -h / 2], [0, h / 2], [-w / 2, h / 2 + 4]] : [[0, -h / 2], [w / 2, -h / 2 + 6], [w / 2, h / 2 + 4], [0, h / 2]];
    blob(g, pg, K.white, K.ink, 4, { base: 1, gap: 30 });
    const x0 = s < 0 ? -w / 2 + 10 : 10;
    const pw = w / 2 - 20;
    crayonRect(g, x0, -h / 2 + 12, pw, h * 0.42, K.ink, 2.5);
    crayonRect(g, x0, -h / 2 + 18 + h * 0.42, pw * 0.48, h * 0.42, K.ink, 2.5);
    crayonRect(g, x0 + pw * 0.52, -h / 2 + 18 + h * 0.42, pw * 0.48, h * 0.42, K.ink, 2.5);
  }
  // tiny doodles inside her comic: a caped hero, a bolt, a lamp, a cloud
  const hx = -w / 4;
  const hy = -h / 2 + 12 + h * 0.22;
  blob(g, [[hx - 4, hy - 8], [hx + 4, hy - 8], [hx + 22, hy + 22], [hx - 18, hy + 22]], K.magenta, K.ink, 2, { gap: 3, base: 0.7 });
  blob(g, ellipsePts(hx, hy - 14, 8, 6), K.helmet, K.ink, 2, { gap: 3, base: 0.8 });
  blob(g, boltPts(w / 4, -h / 2 + 18, h * 0.3, 0.2), K.yellow, K.ink, 2, { gap: 3, base: 0.8 });
  blob(g, ellipsePts(-w / 2 + 10 + (w / 2 - 20) * 0.24, h * 0.2, 10, 10), K.yellow, K.ink, 2, { gap: 3, base: 0.8 });
  blob(g, ellipsePts(w / 4 + 22, h * 0.2, 14, 9), K.sky, K.blue, 2, { gap: 3, base: 0.8 });
  crayon(g, [[0, -h / 2], [0, h / 2]], K.ink, 3);
  g.restore();
}

function finalWindow(g: G): void {
  const W = 1280;
  const H = 720;
  const all = rectPts(0, 0, W, H);
  // outside wall at night
  scribble(g, all, K.night, { gap: 6, w: 6, base: 0.5, alpha: 0.9, angle: -0.7 });
  scribble(g, all, K.purple, { gap: 12, w: 5, alpha: 0.4, angle: 0.55 });
  // warm glow spilling around the window
  const glow = ellipsePts(640, 355, 470, 345, 0, 0.05);
  clearShape(g, glow);
  scribble(g, glow, K.orange, { gap: 7, base: 0.28, alpha: 0.55, angle: -0.7 });
  scribble(g, ellipsePts(640, 355, 400, 300), K.yellow, { gap: 7, base: 0.3, alpha: 0.6, angle: 0.6 });
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const r0 = 330 + jit(10);
    crayon(g, [[640 + Math.cos(a) * r0 * 1.15, 355 + Math.sin(a) * r0 * 0.85], [640 + Math.cos(a) * (r0 + 70) * 1.15, 355 + Math.sin(a) * (r0 + 70) * 0.85]], K.yellow, 5, { passes: 2 });
  }
  // open teal shutters
  blob(g, [[262, 72], [340, 92], [340, 608], [262, 632]], K.teal, K.ink, 5, { gap: 6 });
  blob(g, [[940, 92], [1018, 72], [1018, 632], [940, 608]], K.teal, K.ink, 5, { gap: 6 });
  for (const sx of [282, 300, 320, 960, 980, 1000]) crayon(g, [[sx, 140], [sx, 560]], '#167a70', 3);
  // the lit room behind the window
  const ox = 340;
  const oy = 92;
  const ow = 600;
  const oh = 516;
  const room = rectPts(ox, oy, ow, oh);
  clearShape(g, room);
  scribble(g, room, K.yellow, { gap: 5, base: 0.6, alpha: 0.85, angle: -0.8 });
  scribble(g, room, K.orange, { gap: 13, w: 5, alpha: 0.35, angle: 0.5 });
  // ceiling fan + bulb
  crayon(g, [[640, oy], [640, oy + 40]], K.dkbrown, 4);
  blob(g, ellipsePts(640, oy + 46, 14, 9), K.dkbrown, K.ink, 3, { gap: 3 });
  blob(g, [[600, oy + 42], [500, oy + 34], [500, oy + 50], [600, oy + 52]], K.brown, K.ink, 3, { gap: 4 });
  blob(g, [[680, oy + 42], [780, oy + 34], [780, oy + 50], [680, oy + 52]], K.brown, K.ink, 3, { gap: 4 });
  crayon(g, [[420, oy], [420, oy + 60]], K.ink, 2.5);
  blob(g, ellipsePts(420, oy + 76, 16, 18), K.white, K.ink, 3.5, { gap: 3, base: 0.9 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    crayon(g, [[420 + Math.cos(a) * 26, oy + 76 + Math.sin(a) * 26], [420 + Math.cos(a) * 40, oy + 76 + Math.sin(a) * 40]], K.orange, 3.5, { passes: 2 });
  }
  // Chinni: big T-shirt, sleeves down past the elbows
  const cx = 640;
  const tee: Pt[] = [
    [cx - 70, 392],
    [cx + 70, 392],
    [cx + 150, 420],
    [cx + 196, 520],
    [cx + 140, 548],
    [cx + 120, 500],
    [cx + 132, 640],
    [cx - 132, 640],
    [cx - 120, 500],
    [cx - 140, 548],
    [cx - 196, 520],
    [cx - 150, 420],
  ];
  blob(g, tee, K.blue, K.ink, 5, { gap: 5, base: 0.4 });
  crayon(g, [[cx + 120, 500], [cx + 112, 430]], K.ink, 3);
  crayon(g, [[cx - 120, 500], [cx - 112, 430]], K.ink, 3);
  blob(g, arcPts(cx, 392, 52, 30, 0, Math.PI, 12), K.skin, K.ink, 3.5, { gap: 4 }); // loose neckline
  blob(g, starPts(cx + 160, 470, 16), K.yellow, K.ink, 2.5, { gap: 3 });
  chinniFace(g, cx, 300, 84);
  // arms up to hold her comic
  for (const s of [-1, 1]) {
    const arm = quadPts([cx + s * 170, 530], [cx + s * 150, 560], [cx + s * 105, 520], 8);
    blob(g, tube(arm, 34, 28), K.skin, K.ink, 3.5, { gap: 4 });
  }
  openComic(g, cx, 492, 270, 150, -0.05);
  for (const s of [-1, 1]) blob(g, ellipsePts(cx + s * 128, 520, 20, 18), K.skin, K.ink, 3.5, { gap: 4 });
  // window grill (the middle is open where she leans out)
  for (const gx of [372, 412, 452, 828, 868, 908]) crayon(g, [[gx, oy], [gx, oy + oh]], K.dkgrey, 6);
  for (const gy of [240, 420]) {
    crayon(g, [[ox, gy], [470, gy]], K.dkgrey, 6);
    crayon(g, [[810, gy], [ox + ow, gy]], K.dkgrey, 6);
  }
  // frame + sill + tulsi pot
  crayonRect(g, ox, oy, ow, oh, K.dkbrown, 16);
  crayonRect(g, ox - 8, oy - 8, ow + 16, oh + 16, K.ink, 4);
  blob(g, rectPts(300, 600, 680, 34, 1.5), K.brown, K.ink, 5, { gap: 5 });
  blob(g, [[880, 548], [946, 548], [936, 600], [890, 600]], K.orange, K.ink, 4, { gap: 4 });
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.35;
    const stem = quadPts([913, 548], [913 + Math.cos(a) * 20, 520], [913 + Math.cos(a) * 46, 548 + Math.sin(a) * 60]);
    crayon(g, stem, K.dkgreen, 4);
    blob(g, ellipsePts(913 + Math.cos(a) * 46, 548 + Math.sin(a) * 60, 9, 6, a), K.green, K.ink, 2, { gap: 3 });
  }
  // rain outside only
  const inWin = (x: number, y: number): boolean => x > ox - 10 && x < ox + ow + 10 && y > oy - 10 && y < oy + oh + 20;
  rain(g, 0, 0, W, H, 260, K.rain, 26, inWin);
  for (let i = 0; i < 8; i++) {
    const dx = 320 + rnd() * 640;
    blob(g, ellipsePts(dx, 646 + rnd() * 30, 8, 3), K.rain, null, 0, { gap: 2, base: 0.7 }, false);
  }
  crayonRect(g, 22, 22, W - 44, H - 44, K.ink, 9);
}

// ================= Amma, lifting the helmet (THE reveal) =================
function finalHelmet(g: G): void {
  const W = 1280;
  const H = 720;
  const all = rectPts(0, 0, W, H);
  scribble(g, all, K.night, { gap: 6, w: 6, base: 0.5, alpha: 0.9, angle: -0.7 });
  scribble(g, all, K.purple, { gap: 12, w: 5, alpha: 0.4, angle: 0.55 });
  // the warm light that came back, behind her
  const halo = ellipsePts(640, 330, 390, 330, 0, 0.025);
  clearShape(g, halo);
  scribble(g, halo, K.yellow, { gap: 6, base: 0.4, alpha: 0.75, angle: -0.6 });
  scribble(g, ellipsePts(640, 330, 390, 330), K.orange, { gap: 14, w: 5, alpha: 0.3, angle: 0.6 });
  // hearts all around (Chinni loves her)
  for (const [hx, hy, s, rot] of [
    [150, 170, 40, -0.3],
    [1120, 150, 44, 0.25],
    [120, 470, 34, 0.2],
    [1150, 450, 36, -0.2],
    [230, 640, 26, 0.1],
    [1060, 640, 28, -0.15],
  ] as const)
    blob(g, heartPts(hx, hy, s, rot), K.magenta, K.ink, 4, { gap: 4 });
  rain(g, 0, 0, W, H, 170, K.rain, 26, (x, y) => (x - 640) ** 2 / 390 ** 2 + (y - 330) ** 2 / 330 ** 2 < 1);
  // khaki raincoat shoulders with reflective bands
  const coat: Pt[] = [
    [270, 730],
    [300, 600],
    [370, 548],
    [520, 512],
    [640, 520],
    [760, 512],
    [910, 548],
    [980, 600],
    [1010, 730],
  ];
  blob(g, ellipsePts(640, 500, 52, 40), K.skin, K.ink, 3.5, { gap: 4 }); // neck
  blob(g, rectPts(596, 452, 88, 70), K.skin, null, 0, { gap: 4 });
  blob(g, coat, K.khaki, K.ink, 5, { gap: 5, base: 0.45 });
  const band: Pt[] = [
    [285, 640],
    [995, 640],
    [1000, 676],
    [280, 676],
  ];
  g.save();
  pathOf(g, coat);
  g.clip();
  blob(g, band, K.silver, K.ink, 3.5, { gap: 4, base: 0.75 });
  crayon(g, [[285, 658], [995, 658]], K.white, 5, { passes: 2 });
  g.restore();
  blob(g, [[560, 516], [640, 528], [604, 590]], K.khakiDk, K.ink, 4, { gap: 4 });
  blob(g, [[720, 516], [640, 528], [676, 590]], K.khakiDk, K.ink, 4, { gap: 4 });
  crayon(g, [[640, 590], [640, 720]], K.khakiDk, 4);
  // both arms raised, lifting the helmet off
  for (const s of [-1, 1]) {
    const arm: Pt[] = quadPts([640 + s * 250, 590], [640 + s * 370, 370], [640 + s * 200, 170], 14);
    blob(g, tube(arm, 96, 66), K.khaki, K.ink, 4.5, { gap: 5, base: 0.45 });
    const cuff = arm.slice(10, 12);
    blob(g, tube(cuff, 74), K.silver, K.ink, 3, { gap: 3, base: 0.8 });
  }
  // hair: tied up in a bun, a few loose wet strands
  const fx = 640;
  const fy = 340;
  blob(g, ellipsePts(fx, 214, 50, 40), K.hair, K.ink, 4, { gap: 4, base: 0.65 });
  crayon(g, arcPts(fx, 214, 42, 30, Math.PI * 0.15, Math.PI * 0.85, 8), '#5a3a2a', 3);
  const hairBack: Pt[] = [...arcPts(fx, fy + 6, 142, 160, Math.PI * 0.92, Math.PI * 2.08, 28)];
  blob(g, hairBack, K.hair, K.ink, 4.5, { gap: 4, base: 0.65 });
  // ears + gold earrings
  for (const s of [-1, 1]) {
    blob(g, ellipsePts(fx + s * 124, fy + 18, 18, 26), K.skin, K.ink, 3.5, { gap: 4 });
    crayon(g, ellipsePts(fx + s * 126, fy + 60, 13, 15), K.yellow, 5, { closed: true });
    crayon(g, ellipsePts(fx + s * 126, fy + 60, 13, 15), K.orange, 2, { closed: true, passes: 1 });
  }
  // face
  blob(g, ellipsePts(fx, fy + 10, 120, 140), K.skin, K.ink, 5, { gap: 5, base: 0.5 });
  // hairline with a middle parting
  const hl: Pt[] = [
    ...arcPts(fx, fy + 6, 124, 146, Math.PI * 1.02, Math.PI * 1.5, 12),
    [fx + 6, fy - 112],
    ...arcPts(fx, fy + 6, 124, 146, Math.PI * 1.5, Math.PI * 1.98, 12),
    [fx + 106, fy - 46],
    [fx + 40, fy - 104],
    [fx, fy - 128],
    [fx - 40, fy - 104],
    [fx - 106, fy - 46],
  ];
  blob(g, hl, K.hair, K.ink, 4, { gap: 4, base: 0.65 });
  crayon(g, quadPts([fx - 104, fy - 46], [fx - 128, fy + 10], [fx - 108, fy + 60], 10), K.hair, 6);
  crayon(g, quadPts([fx + 70, fy - 86], [fx + 104, fy - 30], [fx + 86, fy + 10], 10), K.hair, 5);
  // tired, smiling eyes (closed happy arcs, lashes, soft shadows under them)
  for (const s of [-1, 1]) {
    const ex = fx + s * 50;
    const ey = fy - 4;
    crayon(g, arcPts(ex, ey + 8, 28, 18, Math.PI * 1.08, Math.PI * 1.92, 10), K.ink, 6);
    const lash0 = s < 0 ? Math.PI * 1.15 : Math.PI * 1.85;
    for (let i = 0; i < 3; i++) {
      const a = lash0 + s * i * -0.18;
      const lx = ex + Math.cos(a) * 28;
      const ly = ey + 8 + Math.sin(a) * 18;
      crayon(g, [[lx, ly], [lx + Math.cos(a) * 12, ly + Math.sin(a) * 12]], K.ink, 3, { passes: 2 });
    }
    crayon(g, arcPts(ex, ey + 18, 22, 10, Math.PI * 0.2, Math.PI * 0.8, 8), '#9a6a8a', 3, { passes: 2, alpha: 0.7 });
    crayon(g, arcPts(ex - s * 4, ey - 34, 30, 12, Math.PI * 1.15, Math.PI * 1.85, 8), K.hair, 5);
    blob(g, ellipsePts(fx + s * 78, fy + 52, 26, 15), K.pink, null, 0, { gap: 3, base: 0.5, alpha: 0.9 }, false);
  }
  // bindi
  blob(g, ellipsePts(fx, fy - 56, 9, 9), K.red, K.ink, 2, { gap: 2, base: 1 });
  // nose
  crayon(g, [[fx + 4, fy + 14], [fx - 8, fy + 46], [fx + 8, fy + 52]], K.skinDk, 4);
  // a big warm smile
  const mouth: Pt[] = [[fx - 52, fy + 74], ...arcPts(fx, fy + 74, 52, 40, 0.05, Math.PI - 0.05, 14).reverse(), [fx + 52, fy + 74]];
  mouth.reverse();
  blob(g, mouth, '#a3202e', K.ink, 4.5, { gap: 3, base: 0.75 });
  blob(g, [[fx - 40, fy + 78], [fx + 40, fy + 78], [fx + 34, fy + 92], [fx - 34, fy + 92]], K.white, null, 0, { base: 0.9 }, false);
  crayon(g, [[fx - 54, fy + 72], [fx + 54, fy + 72]], '#c03348', 4);
  // rain drops on her face
  for (const [dx, dy, s] of [
    [-70, -76, 1],
    [84, -64, 0.9],
    [-96, 30, 1.1],
    [100, 24, 0.85],
    [22, 128, 0.9],
    [-30, -100, 0.7],
  ] as const) {
    const x = fx + dx;
    const y = fy + dy;
    const drop: Pt[] = [[x, y - 14 * s], [x + 8 * s, y + 2 * s], [x + 6 * s, y + 8 * s], [x, y + 10 * s], [x - 6 * s, y + 8 * s], [x - 8 * s, y + 2 * s]];
    blob(g, drop, K.cyan, K.blue, 2.5, { gap: 2, base: 0.7 });
    crayon(g, [[x - 2 * s, y - 2 * s], [x - 3 * s, y + 4 * s]], K.white, 2.5, { passes: 1 });
  }
  // the yellow helmet, lifted off above her head
  const hx = 640;
  const hy = 150;
  const dome: Pt[] = [...arcPts(hx, hy, 220, 128, Math.PI, Math.PI * 2, 28)];
  blob(g, dome, K.helmet, K.ink, 5.5, { gap: 5, base: 0.6 });
  scribble(g, arcPts(hx + 80, hy, 120, 110, Math.PI * 1.45, Math.PI * 2, 14).concat([[hx + 80, hy]]), K.orange, { gap: 8, w: 4, alpha: 0.4 });
  crayon(g, arcPts(hx, hy, 60, 126, Math.PI * 1.08, Math.PI * 1.92, 14), '#e0a400', 5);
  blob(g, ellipsePts(hx, hy + 2, 250, 22), K.helmet, K.ink, 5, { gap: 5, base: 0.6 });
  blob(g, ellipsePts(hx, hy - 62, 36, 32), K.grey, K.ink, 4.5, { gap: 4 });
  blob(g, ellipsePts(hx, hy - 62, 20, 18), K.white, K.ink, 3, { base: 1 });
  // drips falling off the brim
  for (const dx of [-200, -120, 60, 170, 230]) {
    const x = hx + dx;
    const y = hy + 40 + rnd() * 26;
    blob(g, [[x, y - 8], [x + 5, y + 3], [x, y + 7], [x - 5, y + 3]], K.cyan, K.blue, 2, { gap: 2, base: 0.7 });
  }
  // orange gloves gripping the brim
  for (const s of [-1, 1]) {
    blob(g, ellipsePts(hx + s * 200, hy + 14, 48, 40, s * 0.4), K.orange, K.ink, 4.5, { gap: 4, base: 0.5 });
    for (let k = 0; k < 3; k++) crayon(g, [[hx + s * (178 + k * 14), hy - 18], [hx + s * (174 + k * 14), hy + 4]], K.ink, 2.5, { passes: 2 });
  }
  crayonRect(g, 22, 22, W - 44, H - 44, K.ink, 9);
}

// ================= Chinni's last page: Amma as BIJLI =================
/** Where the caption box sits on the generated final page (1280×720 design space). FinaleScene writes the caption in it. */
export const FINAL_CAPTION_BOX = { x: 190, y: 574, w: 900, h: 118 } as const;

function hemBorder(g: G, hem: readonly Pt[], depth: number): void {
  const inner: Pt[] = [];
  for (let i = 0; i < hem.length; i++) {
    const p = hem[i]!;
    inner.push([p[0], p[1] - depth]);
  }
  const band = [...hem, ...inner.slice().reverse()];
  blob(g, band, K.yellow, K.ink, 3.5, { gap: 4, base: 0.75 }, false);
  // zigzag sari-border pattern
  const dense = densify(hem, 18, false);
  const zz: Pt[] = dense.map((p, i) => [p[0], p[1] - (i % 2 ? depth * 0.8 : depth * 0.2)]);
  crayon(g, zz, K.red, 4);
}

function finalPage(g: G, withCaption: boolean): void {
  // the comic panel
  const P = { x: 44, y: 36, w: 1192, h: 512 };
  const box = rectPts(P.x, P.y, P.w, P.h);
  scribble(g, box, K.sky, { gap: 6, w: 6, base: 0.45, alpha: 0.85, angle: -0.6 });
  g.save();
  pathOf(g, box);
  g.clip();
  // halftone-ish dots
  for (let y = P.y + 10; y < P.y + P.h; y += 26)
    for (let x = P.x + ((y / 26) % 2 ? 13 : 0); x < P.x + P.w; x += 26) {
      g.fillStyle = 'rgba(47,107,255,0.18)';
      g.beginPath();
      g.arc(x + jit(1), y + jit(1), 2.6, 0, 7);
      g.fill();
    }
  // smiling sun, clouds, bolts, stars
  blob(g, ellipsePts(1100, 130, 58, 58), K.yellow, K.ink, 5, { gap: 5, base: 0.5 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    crayon(g, [[1100 + Math.cos(a) * 72, 130 + Math.sin(a) * 72], [1100 + Math.cos(a) * 98, 130 + Math.sin(a) * 98]], K.orange, 5);
  }
  for (const s of [-1, 1]) blob(g, ellipsePts(1100 + s * 18, 118, 5, 6), K.ink, null, 0, { base: 1 });
  crayon(g, arcPts(1100, 136, 26, 18, 0.2, Math.PI - 0.2, 10), K.ink, 4);
  cloud(g, 300, 110, 90, K.white, K.blue, { base: 0.9 });
  cloud(g, 840, 90, 70, K.white, K.blue, { base: 0.9 });
  blob(g, boltPts(470, 70, 120, 0.25), K.yellow, K.ink, 4, { gap: 4, base: 0.6 });
  blob(g, boltPts(930, 190, 100, 0.25), K.yellow, K.ink, 4, { gap: 4, base: 0.6 });
  // ground
  blob(g, rectPts(P.x - 4, 486, P.w + 8, 70), K.green, K.ink, 5, { gap: 6, angle: -1.2 });
  // the lamp is on now
  const lx = 190;
  blob(g, [[lx - 10, 488], [lx + 10, 488], [lx + 6, 180], [lx - 6, 180]], K.red, K.ink, 4, { gap: 4 });
  crayon(g, quadPts([lx, 186], [lx + 40, 150], [lx + 80, 178]), K.ink, 7);
  const cone: Pt[] = [[lx + 60, 196], [lx + 100, 196], [lx + 170, 488], [lx - 10, 488]];
  clearShape(g, cone);
  scribble(g, cone, K.yellow, { gap: 6, base: 0.5, alpha: 0.7, angle: -1.2 });
  blob(g, [[lx + 56, 172], [lx + 104, 172], [lx + 110, 196], [lx + 50, 196]], K.dkgrey, K.ink, 4, { gap: 4 });
  blob(g, ellipsePts(lx + 80, 200, 22, 9), K.yellow, K.ink, 3, { base: 0.9 });
  // home, with every window lit
  building(g, 990, 330, 200, 488, K.peach, { cols: 2, rows: 2, lit: [0, 1, 2, 3] });
  blob(g, [[970, 334], [1090, 250], [1210, 334]], K.red, K.ink, 5, { gap: 5 });
  // AMMA as BIJLI
  // cape behind, flying to the right, with the yellow zigzag sari-border hem
  const hem: Pt[] = [
    [985, 452],
    [900, 476],
    [810, 500],
    [720, 482],
    [630, 506],
    [548, 470],
  ];
  const cape: Pt[] = [[586, 226], [700, 226], [800, 278], [930, 360], ...hem, [556, 350]];
  blob(g, cape, K.magenta, K.ink, 5, { gap: 5, base: 0.45 });
  hemBorder(g, hem, 28);
  crayon(g, quadPts([700, 240], [820, 330], [900, 470]), '#c42a76', 3, { passes: 2 });
  crayon(g, quadPts([680, 250], [740, 380], [720, 482]), '#c42a76', 3, { passes: 2 });
  // legs + boots
  for (const [x0, x1] of [
    [612, 600],
    [668, 686],
  ] as const) {
    blob(g, tube([[x0, 420], [x1, 500]], 26), K.dkgrey, K.ink, 3.5, { gap: 4 });
    blob(g, ellipsePts(x1 + (x1 > 640 ? 8 : -8), 508, 24, 13), K.ink, null, 0, { gap: 3, base: 0.9 });
  }
  // raincoat
  const coat: Pt[] = [
    [586, 222],
    [694, 222],
    [740, 446],
    [540, 446],
  ];
  blob(g, coat, K.khaki, K.ink, 5, { gap: 5, base: 0.45 });
  g.save();
  pathOf(g, coat);
  g.clip();
  for (const by of [318, 410]) {
    blob(g, rectPts(520, by, 240, 20), K.silver, K.ink, 3, { gap: 3, base: 0.8 });
    crayon(g, [[520, by + 10], [760, by + 10]], K.white, 4, { passes: 2 });
  }
  g.restore();
  crayon(g, [[640, 236], [640, 446]], K.khakiDk, 3);
  // cyan BIJLI bolt on her chest
  blob(g, ellipsePts(640, 272, 30, 30), K.yellow, K.ink, 3.5, { gap: 3, base: 0.6 });
  blob(g, boltPts(642, 250, 44, 0.2), K.cyan, K.ink, 3, { gap: 2, base: 0.9 });
  // arms: one fist up, one hand on the hip
  blob(g, tube(quadPts([592, 238], [520, 200], [508, 112], 10), 34, 30), K.khaki, K.ink, 4, { gap: 4 });
  blob(g, ellipsePts(506, 100, 22, 22), K.orange, K.ink, 4, { gap: 3, base: 0.6 });
  blob(g, tube(quadPts([690, 238], [770, 300], [716, 352], 10), 34, 30), K.khaki, K.ink, 4, { gap: 4 });
  blob(g, ellipsePts(714, 352, 18, 18), K.orange, K.ink, 3.5, { gap: 3, base: 0.6 });
  // head: bun, bindi, earrings, big smile
  const hx = 640;
  const hy = 168;
  blob(g, ellipsePts(hx, hy - 54, 22, 18), K.hair, K.ink, 3.5, { gap: 3, base: 0.7 });
  blob(g, ellipsePts(hx, hy + 2, 52, 56), K.hair, K.ink, 4, { gap: 3, base: 0.7 });
  blob(g, ellipsePts(hx, hy + 8, 44, 48), K.skin, K.ink, 4, { gap: 4, base: 0.5 });
  blob(g, [...arcPts(hx, hy + 4, 47, 50, Math.PI * 1.05, Math.PI * 1.95, 12), [hx + 30, hy - 22], [hx, hy - 36], [hx - 30, hy - 22]], K.hair, K.ink, 3, { gap: 3, base: 0.7 });
  for (const s of [-1, 1]) {
    blob(g, ellipsePts(hx + s * 17, hy + 6, 5, 6), K.ink, null, 0, { base: 1 });
    blob(g, ellipsePts(hx + s * 28, hy + 26, 9, 6), K.pink, null, 0, { gap: 2, base: 0.6 }, false);
    crayon(g, ellipsePts(hx + s * 46, hy + 30, 6, 7), K.yellow, 3, { closed: true, passes: 2 });
  }
  blob(g, ellipsePts(hx, hy - 12, 4, 4), K.red, null, 0, { base: 1 });
  crayon(g, arcPts(hx, hy + 26, 18, 13, 0.15, Math.PI - 0.15, 10), '#a3202e', 4.5);
  // the helmet, taken off, resting by her boots
  blob(g, [...arcPts(780, 508, 44, 34, Math.PI, Math.PI * 2, 14)], K.helmet, K.ink, 4, { gap: 4, base: 0.6 });
  blob(g, ellipsePts(780, 510, 52, 8), K.helmet, K.ink, 3.5, { gap: 3, base: 0.6 });
  blob(g, ellipsePts(762, 490, 9, 8), K.grey, K.ink, 2.5, { gap: 2 });
  // power sparkles
  sparkle(g, 470, 210, 18, K.cyan);
  sparkle(g, 820, 160, 16, K.yellow);
  sparkle(g, 560, 70, 12, K.magenta);
  sparkle(g, 900, 250, 12, K.cyan);
  g.restore();
  crayonRect(g, P.x, P.y, P.w, P.h, K.ink, 9);
  // caption box
  const B = FINAL_CAPTION_BOX;
  const cb = rectPts(B.x, B.y, B.w, B.h, 2);
  blob(g, cb, K.yellow, K.ink, 6, { gap: 6, base: 0.5, alpha: 0.75 });
  if (withCaption) handText(g, 'my amma is bijli.', B.x + B.w / 2, B.y + B.h * 0.68, 76, K.navy, { align: 'center', rot: -0.015 });
}

// ================= credits: three crayon kids (the team) =================
function kid(g: G, cx: number, base: number, shirt: string, hair: 'long' | 'bun' | 'short', item: 'wrench' | 'brush' | 'crayon'): void {
  const hy = base - 250;
  const r = 50;
  // legs + shoes
  for (const s of [-1, 1]) {
    crayon(g, [[cx + s * 18, base - 90], [cx + s * 24, base - 14]], K.ink, 6);
    blob(g, ellipsePts(cx + s * 30, base - 10, 20, 11), s < 0 ? K.red : K.blue, K.ink, 3, { gap: 3 });
  }
  // body
  const body: Pt[] = [
    [cx - 40, base - 196],
    [cx + 40, base - 196],
    [cx + 70, base - 86],
    [cx - 70, base - 86],
  ];
  blob(g, body, shirt, K.ink, 4.5, { gap: 5 });
  // hair behind
  if (hair === 'long') blob(g, [[cx - r - 6, hy - 10], [cx + r + 6, hy - 10], [cx + r + 14, hy + 80], [cx - r - 14, hy + 80]], K.hair, K.ink, 3.5, { gap: 4, base: 0.6 });
  if (hair === 'bun') blob(g, ellipsePts(cx, hy - r - 8, 22, 18), K.hair, K.ink, 3.5, { gap: 3, base: 0.6 });
  // head
  blob(g, ellipsePts(cx, hy, r, r * 1.02), K.skin, K.ink, 4.5, { gap: 5, base: 0.45 });
  const cap: Pt[] = [...arcPts(cx, hy, r * 1.05, r * 1.06, Math.PI, Math.PI * 2, 16)];
  if (hair === 'short') for (let i = 0; i <= 8; i++) cap.push([cx + r * (1 - (i / 8) * 2), hy - r * (0.35 + (i % 2) * 0.3)]);
  else cap.push([cx + r * 0.2, hy - r * 0.4], [cx - r * 0.5, hy - r * 0.45]);
  blob(g, cap, K.hair, K.ink, 3.5, { gap: 3, base: 0.6 });
  if (hair === 'long') blob(g, starPts(cx + r * 0.6, hy - r * 0.6, 12), K.yellow, K.ink, 2.5, { gap: 3 });
  for (const s of [-1, 1]) {
    blob(g, ellipsePts(cx + s * 18, hy + 4, 6, 8), K.ink, null, 0, { base: 1 });
    blob(g, ellipsePts(cx + s * 32, hy + 22, 9, 6), K.pink, null, 0, { gap: 2, base: 0.6 }, false);
  }
  crayon(g, arcPts(cx, hy + 20, 18, 14, 0.2, Math.PI - 0.2, 10), K.ink, 4);
  // arms
  crayon(g, [[cx - 40, base - 180], [cx - 86, base - 130], [cx - 90, base - 110]], K.ink, 6);
  crayon(g, [[cx + 40, base - 180], [cx + 84, base - 220], [cx + 90, base - 250]], K.ink, 6);
  blob(g, ellipsePts(cx - 90, base - 108, 11, 11), K.skin, K.ink, 3, { gap: 3 });
  blob(g, ellipsePts(cx + 90, base - 254, 11, 11), K.skin, K.ink, 3, { gap: 3 });
  const ix = cx + 90;
  const iy = base - 254;
  if (item === 'wrench') {
    blob(g, tube([[ix, iy + 30], [ix, iy - 70]], 16), K.grey, K.ink, 3.5, { gap: 3 });
    const jaw: Pt[] = [];
    for (let i = 0; i <= 20; i++) {
      const a = Math.PI * (-0.28 + (i / 20) * 1.56) + Math.PI / 2;
      jaw.push([ix + Math.cos(a) * 26, iy - 84 - Math.sin(a) * -26]);
    }
    jaw.push([ix - 8, iy - 112], [ix - 8, iy - 92], [ix + 8, iy - 92], [ix + 8, iy - 112]);
    blob(g, jaw, K.grey, K.ink, 3.5, { gap: 3 });
    const cog: Pt[] = [];
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const rad = Math.floor(i / 2) % 2 ? 22 : 30;
      cog.push([cx - 120 + Math.cos(a) * rad, base - 40 + Math.sin(a) * rad]);
    }
    blob(g, cog, K.yellow, K.ink, 3.5, { gap: 3 });
    blob(g, ellipsePts(cx - 120, base - 40, 9, 9), K.white, K.ink, 3, { base: 1 });
  } else if (item === 'brush') {
    blob(g, tube([[ix + 2, iy + 26], [ix + 14, iy - 70]], 10), K.brown, K.ink, 3, { gap: 3 });
    blob(g, ellipsePts(ix + 16, iy - 82, 9, 16, 0.1), K.blue, K.ink, 3, { gap: 2, base: 0.8 });
    // headphones
    crayon(g, arcPts(cx, hy, r + 10, r + 14, Math.PI * 1.05, Math.PI * 1.95, 14), K.magenta, 8);
    for (const s of [-1, 1]) blob(g, ellipsePts(cx + s * (r + 6), hy + 4, 12, 20), K.magenta, K.ink, 3, { gap: 3 });
    // music notes
    for (const [nx, ny] of [
      [cx - 130, hy - 30],
      [cx - 96, hy - 80],
    ] as const) {
      blob(g, ellipsePts(nx, ny, 10, 8, -0.3), K.ink, null, 0, { base: 1 });
      crayon(g, [[nx + 8, ny], [nx + 8, ny - 40], [nx + 22, ny - 30]], K.ink, 3.5);
    }
  } else {
    blob(g, [[ix - 12, iy + 30], [ix + 12, iy + 30], [ix + 12, iy - 60], [ix, iy - 84], [ix - 12, iy - 60]], K.magenta, K.ink, 3.5, { gap: 3 });
    blob(g, rectPts(ix - 12, iy - 30, 24, 12), K.white, K.ink, 2.5, { base: 1 });
    const pp: Pt[] = [
      [cx - 150, base - 150],
      [cx - 70, base - 156],
      [cx - 66, base - 76],
      [cx - 148, base - 72],
    ];
    blob(g, pp, K.white, K.ink, 3.5, { base: 1 });
    blob(g, boltPts(cx - 106, base - 146, 64, 0.2), K.yellow, K.ink, 2.5, { gap: 3, base: 0.8 });
  }
}

function team(g: G): void {
  crayon(g, quadPts([30, 372], [480, 360], [930, 374]), K.green, 8);
  for (let x = 40; x < 930; x += 40) crayon(g, [[x, 372], [x + 6, 356], [x + 12, 372]], K.dkgreen, 3, { passes: 2 });
  kid(g, 190, 362, K.green, 'long', 'wrench');
  kid(g, 480, 362, K.yellow, 'bun', 'brush');
  kid(g, 770, 362, K.red, 'short', 'crayon');
  blob(g, boltPts(480, 8, 60, 0.25), K.yellow, K.ink, 3.5, { gap: 3 });
  for (const [x, y, c] of [
    [60, 60, K.yellow],
    [330, 40, K.cyan],
    [640, 40, K.magenta],
    [900, 70, K.yellow],
  ] as const)
    blob(g, starPts(x, y, 16), c, K.ink, 3, { gap: 3 });
  blob(g, heartPts(330, 150, 22), K.magenta, K.ink, 3, { gap: 3 });
  blob(g, heartPts(640, 150, 20, 0.2), K.red, K.ink, 3, { gap: 3 });
}

// ================= in-game drawing pickup (96×96) =================
function drawingPage(g: G): void {
  g.save();
  g.translate(48, 50);
  g.rotate(-0.12);
  const page: Pt[] = [
    [-31, -38],
    [17, -38],
    [31, -24],
    [31, 38],
    [-31, 38],
  ];
  pathOf(g, page);
  g.fillStyle = K.white;
  g.fill();
  g.save();
  pathOf(g, page);
  g.clip();
  g.strokeStyle = 'rgba(110,160,230,0.45)';
  g.lineWidth = 1;
  for (let y = -28; y < 38; y += 9) {
    g.beginPath();
    g.moveTo(-31, y);
    g.lineTo(31, y);
    g.stroke();
  }
  // caped hero doodle (face hidden in helmet shadow, like the game sprite)
  blob(g, [[-6, -10], [4, -10], [16, 20], [-18, 20]], K.magenta, K.ink, 1.6, { gap: 2.2, base: 0.7 });
  crayon(g, [[16, 20], [12, 15], [8, 20], [4, 15], [0, 20], [-4, 15], [-8, 20], [-12, 15], [-18, 20]], K.yellow, 1.8, { passes: 2 });
  blob(g, rectPts(-6, -10, 10, 18), K.khaki, K.ink, 1.6, { gap: 2, base: 0.7 });
  blob(g, ellipsePts(-1, -15, 6, 5), '#0b0f1c', null, 0, { base: 1 });
  blob(g, [...arcPts(-1, -16, 8, 7, Math.PI, Math.PI * 2, 10)], K.helmet, K.ink, 1.6, { gap: 2, base: 0.8 });
  blob(g, boltPts(-1, -7, 12, 0.2), K.cyan, null, 0, { base: 1 });
  crayon(g, [[-4, 8], [-6, 22]], K.ink, 2);
  crayon(g, [[2, 8], [4, 22]], K.ink, 2);
  crayon(g, [[-6, -6], [-14, -16]], K.ink, 2);
  blob(g, boltPts(20, -26, 18, 0.25), K.yellow, K.ink, 1.4, { gap: 2, base: 0.8 });
  blob(g, starPts(-21, -24, 5), K.yellow, K.ink, 1.2, { gap: 2, base: 0.8 });
  g.restore();
  blob(g, [[17, -38], [17, -24], [31, -24]], '#dfe6ee', K.ink, 1.6, { base: 1 }, false);
  outline(g, page, K.ink, 2.2);
  g.restore();
}

// ================= logo: "BIJLI" with a lightning bolt (transparent) =================
function logo(g: G): void {
  const W = 900;
  const H = 320;
  const word = 'BIJLI';
  // big lightning bolt behind the letters
  const bolt = boltPts(500, 18, 290, 0.36);
  crayon(g, bolt, K.white, 30, { closed: true, passes: 2 });
  blob(g, bolt, K.cyan, K.ink, 7, { gap: 5, base: 0.7 }, false);
  scribble(g, bolt, K.white, { gap: 14, w: 4, alpha: 0.6, angle: 0.5 });
  // chunky crayon letters, each a little tilted like a child wrote them
  const font = (px: number): string => `900 ${px}px "Arial Black", "Arial Bold", ${FONTS.comic}`;
  const m = ctx2d(mk(4, 4));
  let size = 230;
  m.font = font(size);
  const gapX = 14;
  const widths = (): number[] => [...word].map((c) => m.measureText(c).width);
  let total = widths().reduce((a, b) => a + b, 0) + gapX * (word.length - 1);
  if (total > W - 90) {
    size *= (W - 90) / total;
    m.font = font(size);
    total = widths().reduce((a, b) => a + b, 0) + gapX * (word.length - 1);
  }
  const ws = widths();
  const baseY = H / 2 + size * 0.36;
  let x = (W - total) / 2;
  const letters = [...word].map((c, i) => {
    const w = ws[i] ?? 0;
    const L = { c, x: x + w / 2, y: baseY + jit(size * 0.05), r: jit(0.08), w };
    x += w + gapX;
    return L;
  });
  const fills = [K.yellow, K.orange, K.yellow, K.red, K.yellow];
  const place = (gg: G, L: (typeof letters)[number], fn: () => void): void => {
    gg.save();
    gg.translate(L.x, L.y);
    gg.rotate(L.r);
    gg.font = font(size);
    gg.textAlign = 'center';
    gg.textBaseline = 'alphabetic';
    gg.lineJoin = 'round';
    fn();
    gg.restore();
  };
  // white sticker edge (reads on the dark title street), then waxy black outline
  for (const L of letters)
    place(g, L, () => {
      g.strokeStyle = K.white;
      g.lineWidth = size * 0.2;
      g.strokeText(L.c, 0, 0);
    });
  for (const L of letters)
    for (let p = 0; p < 3; p++)
      place(g, L, () => {
        g.globalAlpha = p ? 0.7 : 1;
        g.strokeStyle = K.ink;
        g.lineWidth = size * (p ? 0.07 : 0.1);
        if (p) g.setLineDash([size * rr(0.2, 0.5), size * 0.03]);
        g.strokeText(L.c, jit(2), jit(2));
      });
  // crayon colour inside each letter
  letters.forEach((L, i) => {
    const lay = mk(W, H);
    const lg = ctx2d(lay);
    place(lg, L, () => {
      lg.fillStyle = fills[i] ?? K.yellow;
      lg.fillText(L.c, 0, 0);
    });
    lg.globalCompositeOperation = 'source-atop';
    const b = rectPts(L.x - L.w, baseY - size, L.w * 2, size * 1.3);
    scribble(lg, b, K.orange, { gap: 7, w: 5, alpha: 0.55, angle: -0.9 });
    scribble(lg, b, i % 2 ? K.yellow : K.red, { gap: 15, w: 4, alpha: 0.35, angle: 0.4 });
    crayon(lg, [[L.x - L.w * 0.32, baseY - size * 0.66], [L.x - L.w * 0.32, baseY - size * 0.3]], K.white, size * 0.06, { passes: 2, alpha: 0.85 });
    g.drawImage(lay, 0, 0);
  });
  // magenta scribble underline + sparks
  const ul: Pt[] = [];
  for (let i = 0; i <= 12; i++) ul.push([90 + i * 60, baseY + 26 + Math.sin(i * 1.3) * 5]);
  crayon(g, ul, K.magenta, 10);
  sparkle(g, 72, 70, 20, K.cyan);
  sparkle(g, 840, 60, 24, K.yellow);
  sparkle(g, 830, 250, 14, K.magenta);
}

// ================= registry =================
export const CRAYON_NAMES = ['logo', 'drawing', 'ch1', 'ch2', 'ch3', 'ch4', 'final_window', 'final_helmet', 'final_page', 'team'] as const;
export type CrayonName = (typeof CRAYON_NAMES)[number];

const SPECS: Record<CrayonName, PageSpec> = {
  logo: { w: 900, h: 320, bg: 'none', seed: 11, grain: 0.14, draw: logo },
  drawing: { w: 96, h: 96, bg: 'none', seed: 12, grain: 0.18, draw: drawingPage },
  ch1: { w: 1280, h: 720, bg: 'ruled', seed: 21, grain: 0.5, draw: ch1 },
  ch2: { w: 1280, h: 720, bg: 'ruled', seed: 22, grain: 0.5, draw: ch2 },
  ch3: { w: 1280, h: 720, bg: 'ruled', seed: 23, grain: 0.5, draw: ch3 },
  ch4: { w: 1280, h: 720, bg: 'ruled', seed: 24, grain: 0.5, draw: ch4 },
  final_window: { w: 1280, h: 720, bg: 'paper', seed: 31, grain: 0.5, draw: finalWindow },
  final_helmet: { w: 1280, h: 720, bg: 'paper', seed: 32, grain: 0.5, draw: finalHelmet },
  final_page: { w: 1280, h: 720, bg: 'ruled', seed: 33, grain: 0.5, draw: (g) => finalPage(g, true) },
  team: { w: 960, h: 400, bg: 'none', seed: 41, grain: 0.35, draw: team },
};

/** Native size of each generated page. */
export const CRAYON_SIZES: Record<CrayonName, { w: number; h: number }> = Object.fromEntries(
  CRAYON_NAMES.map((n) => [n, { w: SPECS[n].w, h: SPECS[n].h }]),
) as Record<CrayonName, { w: number; h: number }>;

/** Draw any page into a 2D context of the given size. */
export function drawCrayonPage(name: CrayonName, g: G, w: number, h: number): void {
  renderPage(g, w, h, SPECS[name]);
}
export const drawLogo = (g: G, w = 900, h = 320): void => drawCrayonPage('logo', g, w, h);
export const drawDrawing = (g: G, w = 96, h = 96): void => drawCrayonPage('drawing', g, w, h);
export const drawCh1 = (g: G, w = 1280, h = 720): void => drawCrayonPage('ch1', g, w, h);
export const drawCh2 = (g: G, w = 1280, h = 720): void => drawCrayonPage('ch2', g, w, h);
export const drawCh3 = (g: G, w = 1280, h = 720): void => drawCrayonPage('ch3', g, w, h);
export const drawCh4 = (g: G, w = 1280, h = 720): void => drawCrayonPage('ch4', g, w, h);
export const drawFinalWindow = (g: G, w = 1280, h = 720): void => drawCrayonPage('final_window', g, w, h);
export const drawFinalHelmet = (g: G, w = 1280, h = 720): void => drawCrayonPage('final_helmet', g, w, h);
/** `withCaption: false` leaves the yellow caption box empty so FinaleScene can write it in. */
export function drawFinalPage(g: G, w = 1280, h = 720, withCaption = true): void {
  renderPage(g, w, h, { ...SPECS.final_page, draw: (gg) => finalPage(gg, withCaption) });
}
export const drawTeam = (g: G, w = 960, h = 400): void => drawCrayonPage('team', g, w, h);

/** Bake a page into a fresh canvas at its native size. */
export function makeCrayonCanvas(name: CrayonName): HTMLCanvasElement {
  const { w, h } = CRAYON_SIZES[name];
  const c = mk(w, h);
  const g = ctx2d(c);
  if (name === 'final_page') drawFinalPage(g, w, h, false);
  else drawCrayonPage(name, g, w, h);
  return c;
}

/** Waxy crayon handwriting on a transparent canvas, sized to the text. */
export function crayonTextCanvas(text: string, size: number, color: string, opts: { outline?: string; weight?: number } = {}): HTMLCanvasElement {
  const m = ctx2d(mk(4, 4));
  m.font = `${opts.weight ?? 700} ${size}px ${FONTS.hand}`;
  const tw = m.measureText(text).width;
  const pad = Math.ceil(size * 0.3);
  const c = mk(tw * 1.06 + pad * 2, size * 1.9);
  const g = ctx2d(c);
  reseed(text.length * 7919 + Math.round(size));
  const o: HandOpts = { align: 'left', rot: 0 };
  if (opts.outline) o.outline = opts.outline;
  if (opts.weight) o.weight = opts.weight;
  handText(g, text, pad, size * 1.25, size, color, o);
  grain(g, c.width, c.height, 0.3);
  return c;
}

// ================= Phaser glue =================
export const crayonKey = (name: CrayonName): string => `crayon_${name}`;
export const pngKey = (name: CrayonName): string => `png_${name}`;
/** True when the team's photographed PNG for this page was loaded (BootScene). */
export function hasPng(scene: Phaser.Scene, name: CrayonName): boolean {
  return scene.textures.exists(pngKey(name));
}

/** Make every `crayon_<name>` texture: the loaded PNG if there is one, else the procedural fallback. Idempotent. */
export function ensureCrayonTextures(scene: Phaser.Scene): void {
  for (const name of CRAYON_NAMES) {
    const key = crayonKey(name);
    if (scene.textures.exists(key)) continue;
    if (hasPng(scene, name)) {
      const src = scene.textures.get(pngKey(name)).getSourceImage();
      if (src instanceof HTMLImageElement && scene.textures.addImage(key, src)) continue;
      if (src instanceof HTMLCanvasElement && scene.textures.addCanvas(key, src)) continue;
    }
    try {
      scene.textures.addCanvas(key, makeCrayonCanvas(name));
    } catch (e) {
      console.warn(`crayonArt: could not draw ${name}`, e);
    }
  }
}

/** Cached handwriting texture; returns its key. */
export function ensureCrayonText(scene: Phaser.Scene, key: string, text: string, size: number, color: string, opts: { outline?: string } = {}): string {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, crayonTextCanvas(text, size, color, opts));
  return key;
}

/** Scale an image so it covers the whole 1280×720 view; returns the scale used. */
export function coverScale(texW: number, texH: number, viewW = 1280, viewH = 720): number {
  return Math.max(viewW / Math.max(1, texW), viewH / Math.max(1, texH));
}
