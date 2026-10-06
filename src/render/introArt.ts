// Procedural crayon panels for the opening story (IntroScene). Same "Chinni's crayon" look as crayonArt.ts:
// the small crayon primitives are private there, so the few we need are mirrored here (same maths, same palette).
// Each panel is plain Canvas-2D and is baked once into a Phaser CanvasTexture.
import { FONTS } from '../config';
import { INTRO_ART_LABELS as L, type IntroArt } from '../story/intro';

type G = CanvasRenderingContext2D;
type Pt = [number, number];
type Shape = readonly Pt[] | readonly (readonly Pt[])[];

/** Native size of every intro panel (it fills the panel frame in IntroScene). */
export const INTRO_ART_SIZE = { w: 1200, h: 480 } as const;
const W = INTRO_ART_SIZE.w;
const H = INTRO_ART_SIZE.h;

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
  rain: '#7fb2ff',
  shadow: '#2a2140',
} as const;

// ================= deterministic rng =================
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
  if (!g) throw new Error('introArt: 2D canvas unavailable');
  return g;
}

// ================= geometry =================
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
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
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
function outline(g: G, s: Shape, col: string = K.ink, w = 4): void {
  for (const poly of polys(s)) crayon(g, poly, col, w, { closed: true });
}
interface FillOpts {
  angle?: number;
  gap?: number;
  w?: number;
  alpha?: number;
  base?: number;
}
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
  const ux = Math.cos(ang);
  const uy = Math.sin(ang);
  for (let d = -R; d <= R; d += gap * rr(0.75, 1.25)) {
    if (rnd() < 0.07) continue;
    const px = cx - uy * d;
    const py = cy + ux * d;
    const bend = jit(gap * 0.8);
    g.globalAlpha = a * rr(0.55, 1);
    g.lineWidth = lw * rr(0.7, 1.1);
    g.beginPath();
    g.moveTo(px - ux * R + jit(2), py - uy * R + jit(2));
    g.quadraticCurveTo(px - uy * bend, py + ux * bend, px + ux * R + jit(2), py + uy * R + jit(2));
    g.stroke();
  }
  g.restore();
}
function clearShape(g: G, s: Shape): void {
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  pathOf(g, s);
  g.fill();
  g.restore();
}
function blob(g: G, s: Shape, fill: string | null, line: string | null = K.ink, lw = 4, fo: FillOpts = {}, clear = true): void {
  if (clear) clearShape(g, s);
  if (fill) scribble(g, s, fill, { base: 0.32, ...fo });
  if (line) outline(g, s, line, lw);
}
function rain(g: G, x: number, y: number, w: number, h: number, n: number, col: string = K.rain, len = 22, avoid?: (px: number, py: number) => boolean): void {
  const ang = 0.21;
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
function boltPts(x: number, y: number, h: number, lean = 0.3): Pt[] {
  const w = h * 0.42;
  const lx = (dy: number): number => x - lean * dy;
  return [
    [lx(0) + w * 0.15, y],
    [lx(h * 0.5) - w * 0.42, y + h * 0.56],
    [lx(h * 0.5) - w * 0.02, y + h * 0.5],
    [lx(h) - w * 0.32, y + h],
    [lx(h * 0.45) + w * 0.5, y + h * 0.38],
    [lx(h * 0.45) + w * 0.08, y + h * 0.44],
    [lx(0) + w * 0.62, y],
  ];
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
function cloud(g: G, cx: number, cy: number, s: number, fill: string, line: string): void {
  const parts: [number, number, number][] = [
    [-0.55, 0.12, 0.42],
    [-0.2, -0.18, 0.55],
    [0.25, -0.1, 0.5],
    [0.6, 0.15, 0.38],
  ];
  const shapes = parts.map(([dx, dy, r]) => ellipsePts(cx + dx * s, cy + dy * s, r * s, r * s * 0.85));
  const all = [...shapes, rectPts(cx - s * 0.75, cy, s * 1.5, s * 0.42)];
  clearShape(g, all);
  scribble(g, all, fill, { base: 0.4, gap: 7 });
  for (const [dx, dy, r] of parts) crayon(g, arcPts(cx + dx * s, cy + dy * s, r * s, r * s * 0.85, Math.PI * 1.02, Math.PI * 1.98), line, 4);
  crayon(g, [[cx - s * 0.85, cy + s * 0.42], [cx + s * 0.85, cy + s * 0.42]], line, 4);
}
/** Waxy hand lettering for signs and labels (centred on x). */
function hand(g: G, text: string, x: number, y: number, size: number, col: string, rot = 0, font: string = FONTS.hand): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.font = `700 ${size}px ${font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.fillStyle = col;
  for (const [dx, dy, a] of [
    [jit(size * 0.02), jit(size * 0.02), 0.6],
    [jit(size * 0.02), jit(size * 0.02), 0.6],
    [0, 0, 0.95],
  ] as const) {
    g.globalAlpha = a;
    g.fillText(text, dx, dy);
  }
  g.restore();
}
/** Bold comic onomatopoeia: white letters, thick ink outline. */
function bang(g: G, text: string, x: number, y: number, size: number, col: string, rot: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.font = `900 ${size}px ${FONTS.comic}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.strokeStyle = K.ink;
  g.lineWidth = size * 0.22;
  g.strokeText(text, 0, 0);
  g.fillStyle = col;
  g.fillText(text, 0, 0);
  g.restore();
}

// ================= paper + grain =================
let grainC: HTMLCanvasElement | null = null;
function grainTile(): HTMLCanvasElement {
  if (grainC) return grainC;
  const c = mk(160, 160);
  const g = ctx2d(c);
  let s = 12345;
  const r = (): number => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 3200; i++) {
    g.fillStyle = `rgba(0,0,0,${0.2 + r() * 0.8})`;
    const w = r() < 0.25 ? 2 + r() * 3 : 1 + r();
    g.fillRect(r() * 160, r() * 160, w, 1 + r() * 0.8);
  }
  grainC = c;
  return c;
}
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
function paper(g: G, w: number, h: number): void {
  g.save();
  g.fillStyle = K.paper;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < (w * h) / 450; i++) {
    g.fillStyle = `rgba(120,105,80,${rr(0.03, 0.1)})`;
    g.fillRect(rnd() * w, rnd() * h, rr(1, 2.5), rr(1, 2));
  }
  g.restore();
}

// ================= shared scenery =================
function sky(g: G, a: string, b: string): void {
  const all = rectPts(-10, -10, W + 20, H + 20);
  scribble(g, all, a, { gap: 6, w: 6, base: 0.45, alpha: 0.9, angle: -0.62 });
  scribble(g, all, b, { gap: 12, w: 5, alpha: 0.42, angle: 0.5 });
}
function pole(g: G, x: number, top: number, bottom: number, crossY: number, crossW = 90): void {
  blob(g, rectPts(x - 9, top, 18, bottom - top, 1.5), K.brown, K.ink, 4, { gap: 5, angle: -1.3 });
  blob(g, rectPts(x - crossW / 2, crossY, crossW, 12, 1), K.dkbrown, K.ink, 3.5, { gap: 5 });
  for (const ix of [x - crossW / 2 + 8, x + crossW / 2 - 8]) blob(g, ellipsePts(ix, crossY - 8, 6, 8), K.white, K.ink, 3);
}
function building(g: G, x: number, top: number, w: number, bottom: number, wall: string, o: { cols?: number; rows?: number; lit?: number[]; win?: string } = {}): void {
  blob(g, rectPts(x, top, w, bottom - top, 2), wall, K.ink, 4.5, { gap: 6, angle: -0.8 });
  crayon(g, [[x - 6, top], [x + w + 6, top]], K.ink, 6);
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
function road(g: G, gy: number): void {
  blob(g, rectPts(-10, gy, W + 20, H - gy + 10), K.dkgrey, K.ink, 5, { gap: 6, angle: -0.3 });
}
function puddle(g: G, cx: number, cy: number, rx: number): void {
  blob(g, ellipsePts(cx, cy, rx, rx * 0.22), K.blue, K.ink, 2.5, { gap: 4, base: 0.4 });
  crayon(g, [[cx - rx * 0.5, cy - 2], [cx - rx * 0.1, cy - 4]], K.white, 3, { passes: 2 });
}
function glow(g: G, cx: number, cy: number, rx: number, ry: number): void {
  const o = ellipsePts(cx, cy, rx, ry, 0, 0.05);
  clearShape(g, o);
  scribble(g, o, K.orange, { gap: 7, base: 0.3, alpha: 0.55, angle: -0.7 });
  scribble(g, ellipsePts(cx, cy, rx * 0.66, ry * 0.66), K.yellow, { gap: 6, base: 0.35, alpha: 0.6, angle: 0.6 });
}
function candle(g: G, x: number, base: number, h = 46): void {
  blob(g, rectPts(x - 11, base - h, 22, h, 1), K.white, K.ink, 3, { gap: 4, base: 0.8 });
  blob(g, ellipsePts(x, base, 24, 7), K.grey, K.ink, 3, { gap: 3, base: 0.6 });
  crayon(g, [[x, base - h], [x, base - h - 8]], K.ink, 2.5);
  blob(g, [[x, base - h - 34], [x + 10, base - h - 12], [x, base - h - 4], [x - 10, base - h - 12]], K.yellow, K.orange, 3, { gap: 3, base: 0.85 });
}

// ================= 1. storm: the city's power lines snap =================
function storm(g: G): void {
  sky(g, K.night, K.purple);
  const gy = 400;
  cloud(g, 170, 70, 130, '#5c607a', K.ink);
  cloud(g, 520, 50, 150, '#4f5470', K.ink);
  cloud(g, 900, 80, 140, '#5c607a', K.ink);
  cloud(g, 1130, 50, 110, '#4f5470', K.ink);
  // lightning
  const bolt = boltPts(780, 88, 200, 0.2);
  for (let i = 0; i < 2; i++) crayon(g, bolt.map((p) => [p[0] + jit(4), p[1] + jit(4)] as Pt), K.cyan, 10 - i * 4, { closed: true, alpha: 0.7 });
  blob(g, bolt, K.yellow, K.ink, 5, { gap: 4, base: 0.6 });
  blob(g, boltPts(250, 150, 110, 0.25), K.yellow, K.ink, 4, { gap: 4, base: 0.6 });
  // dark skyline, every window black
  const blocks: [number, number, number, string, number, number][] = [
    [-10, 230, 150, '#3b3f63', 2, 3],
    [150, 270, 110, '#46406b', 2, 2],
    [270, 200, 140, '#353a5e', 2, 3],
    [420, 290, 120, '#4a4470', 2, 2],
    [700, 250, 130, '#3b3f63', 2, 3],
    [840, 300, 100, '#46406b', 1, 2],
    [950, 210, 150, '#353a5e', 2, 3],
    [1110, 280, 110, '#4a4470', 2, 2],
  ];
  for (const [x, top, w, col, cols, rows] of blocks) building(g, x, top, w, gy, col, { cols, rows, win: '#141a36' });
  road(g, gy);
  puddle(g, 200, 440, 60);
  puddle(g, 980, 452, 48);
  // two poles, the wire between them snapped and sparking
  pole(g, 560, 150, gy + 6, 180, 96);
  pole(g, 1060, 150, gy + 6, 180, 96);
  crayon(g, sag(512, 172, -10, 200, 12), K.ink, 3.2);
  crayon(g, sag(1108, 172, 1210, 190, 6), K.ink, 3.2);
  const lEnd: Pt = [770, 320];
  const rEnd: Pt = [860, 300];
  crayon(g, quadPts([608, 172], [700, 190], lEnd), K.ink, 3.6);
  crayon(g, quadPts([1012, 172], [920, 186], rEnd), K.ink, 3.6);
  sparkBurst(g, lEnd[0], lEnd[1], 34);
  sparkBurst(g, rEnd[0], rEnd[1], 30);
  bang(g, L.krak, 815, 252, 46, K.yellow, -0.12);
  rain(g, 0, 0, W, H, 300, K.rain, 26);
}

// ================= 2. dark: the hospital on backup, a family by candlelight =================
function dark(g: G): void {
  sky(g, K.night, '#2a1f5c');
  const gy = 410;
  cloud(g, 330, 40, 110, '#4f5470', K.ink);
  cloud(g, 900, 60, 120, '#5c607a', K.ink);
  // hospital (left): dark, a few torch beams in the windows, one small backup lamp over the door
  const hx = 50;
  const hw = 480;
  const ht = 130;
  blob(g, rectPts(hx, ht, hw, gy - ht, 2), '#7d86a6', K.ink, 5, { gap: 6, angle: -0.8 });
  crayon(g, [[hx - 8, ht], [hx + hw + 8, ht]], K.ink, 7);
  // sign + red cross on the roof
  blob(g, rectPts(hx + 130, ht - 52, 220, 44, 1.5), K.white, K.ink, 4, { gap: 5, base: 0.7 });
  hand(g, L.hospital, hx + 240, ht - 30, 30, K.red, -0.01, FONTS.comic);
  const cx = hx + 410;
  const cy = ht - 50;
  blob(g, rectPts(cx - 34, cy - 34, 68, 68, 1.5), K.white, K.ink, 4, { gap: 5, base: 0.8 });
  blob(g, [[cx - 8, cy - 26], [cx + 8, cy - 26], [cx + 8, cy - 8], [cx + 26, cy - 8], [cx + 26, cy + 8], [cx + 8, cy + 8], [cx + 8, cy + 26], [cx - 8, cy + 26], [cx - 8, cy + 8], [cx - 26, cy + 8], [cx - 26, cy - 8], [cx - 8, cy - 8]], K.red, K.ink, 3, { gap: 3, base: 0.8 });
  // windows: 5 x 3, most dark, two with torch beams
  const torch = new Set([1, 8]);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 5; c++) {
      const wx = hx + 30 + c * 92;
      const wy = ht + 28 + r * 70;
      if (r === 2 && c === 2) continue; // the door goes here
      const i = r * 5 + c;
      blob(g, rectPts(wx, wy, 52, 46, 1), K.night, K.ink, 3, { gap: 4, base: 0.7 });
      if (torch.has(i)) {
        const beam: Pt[] = [
          [wx + 12, wy + 14],
          [wx + 50, wy + 4],
          [wx + 50, wy + 42],
        ];
        blob(g, beam, K.yellow, null, 0, { gap: 3, base: 0.75 }, false);
        blob(g, ellipsePts(wx + 12, wy + 14, 5, 5), K.white, K.ink, 2, { gap: 2, base: 0.9 });
      }
    }
  // door with the backup lamp glowing over it
  const dx = hx + hw / 2 - 40;
  glow(g, dx + 40, ht + 176, 70, 40);
  blob(g, rectPts(dx, ht + 196, 80, gy - ht - 196, 1.5), K.sky, K.ink, 4, { gap: 5, base: 0.5 });
  crayon(g, [[dx + 40, ht + 196], [dx + 40, gy]], K.ink, 3);
  blob(g, ellipsePts(dx + 40, ht + 178, 14, 10), K.yellow, K.ink, 3, { gap: 3, base: 0.9 });
  // generator box humming beside it
  const gx = hx + hw + 14;
  blob(g, rectPts(gx, gy - 64, 76, 64, 1.5), K.green, K.ink, 4, { gap: 5 });
  for (let i = 0; i < 4; i++) crayon(g, [[gx + 12 + i * 17, gy - 50], [gx + 12 + i * 17, gy - 18]], K.dkgreen, 3);
  crayon(g, [[gx, gy - 30], [hx + hw, gy - 40]], K.ink, 3);
  hand(g, L.backup, gx + 38, gy - 84, 24, K.yellow, -0.06);
  // a house (right): one big window, a family around a candle
  const ox = 640;
  const ow = 520;
  const ot = 170;
  blob(g, rectPts(ox, ot, ow, gy - ot, 2), K.peach, K.ink, 5, { gap: 6, angle: -0.8 });
  blob(g, [[ox - 24, ot + 4], [ox + ow / 2, ot - 80], [ox + ow + 24, ot + 4]], K.red, K.ink, 5, { gap: 5 });
  const wx = ox + 70;
  const wy = ot + 40;
  const ww = 380;
  const wh = 170;
  const win = rectPts(wx, wy, ww, wh, 1.5);
  blob(g, win, '#2a2140', K.ink, 5, { gap: 5, base: 0.7 });
  g.save();
  pathOf(g, win);
  g.clip();
  glow(g, wx + ww / 2, wy + wh - 30, 200, 120);
  // silhouettes: grandmother, parent-sized figure, two children (no faces, just shapes against the glow)
  const figs: [number, number, number][] = [
    [wx + 70, wy + 92, 30],
    [wx + 130, wy + 112, 22],
    [wx + 260, wy + 108, 24],
    [wx + 318, wy + 90, 30],
  ];
  for (const [fx, fy, r] of figs) {
    blob(g, ellipsePts(fx, fy + r * 2.4, r * 1.5, r * 1.6), K.shadow, null, 0, { gap: 3, base: 0.9 }, false);
    blob(g, ellipsePts(fx, fy, r, r * 1.05), K.shadow, null, 0, { gap: 3, base: 0.9 }, false);
  }
  blob(g, rectPts(wx + 120, wy + wh - 34, 160, 40), K.brown, K.ink, 3, { gap: 4, base: 0.6 });
  candle(g, wx + ww / 2 + 6, wy + wh - 34, 30);
  g.restore();
  outline(g, win, K.ink, 5);
  blob(g, rectPts(ox + 470, ot + 110, 46, gy - ot - 110, 1.5), K.brown, K.ink, 4, { gap: 5 });
  road(g, gy);
  puddle(g, 600, 440, 50);
  rain(g, 0, 0, W, H, 230, K.rain, 24, (x, y) => x > wx && x < wx + ww && y > wy && y < wy + wh);
}

// ================= 3. crew: Crew 7 on a pole, from behind (face never visible) =================
function crewBack(g: G, x: number, y: number): void {
  // x = pole centre, y = helmet top. Seen from behind: back of the helmet, coat, band, belt, boots.
  // legs wrapped round the pole
  for (const s of [-1, 1]) {
    const leg = quadPts([x + s * 26, y + 190], [x + s * 50, y + 236], [x + s * 14, y + 272], 10);
    blob(g, tube(leg, 30, 24), K.khakiDk, K.ink, 3.5, { gap: 4 });
    blob(g, ellipsePts(x + s * 14, y + 280, 20, 12, s * 0.4), K.ink, K.ink, 3, { gap: 3, base: 0.9 });
  }
  // arms up to the crossarm, gloved hands
  for (const s of [-1, 1]) {
    const arm = quadPts([x + s * 40, y + 86], [x + s * 74, y + 40], [x + s * 56, y - 8], 10);
    blob(g, tube(arm, 30, 24), K.khaki, K.ink, 3.5, { gap: 4 });
    blob(g, tube(arm.slice(7, 9), 30), K.silver, K.ink, 2.5, { gap: 3, base: 0.8 });
    blob(g, ellipsePts(x + s * 56, y - 14, 15, 13), K.orange, K.ink, 3, { gap: 3, base: 0.8 });
  }
  // raincoat body
  const coat: Pt[] = [
    [x - 44, y + 70],
    [x + 44, y + 70],
    [x + 56, y + 130],
    [x + 54, y + 200],
    [x - 54, y + 200],
    [x - 56, y + 130],
  ];
  blob(g, coat, K.khaki, K.ink, 4.5, { gap: 5, base: 0.45 });
  g.save();
  pathOf(g, coat);
  g.clip();
  blob(g, rectPts(x - 70, y + 112, 140, 20), K.silver, K.ink, 3, { gap: 3, base: 0.85 });
  crayon(g, [[x - 60, y + 122], [x + 60, y + 122]], K.white, 4, { passes: 2 });
  g.restore();
  // tool belt + harness strap round the pole
  blob(g, rectPts(x - 58, y + 170, 116, 18, 1), K.dkbrown, K.ink, 3, { gap: 3, base: 0.7 });
  blob(g, rectPts(x + 22, y + 176, 18, 30, 1), K.brown, K.ink, 2.5, { gap: 3 });
  crayon(g, [[x + 31, y + 176], [x + 34, y + 160]], K.grey, 4);
  crayon(g, arcPts(x, y + 166, 64, 18, 0, Math.PI, 12), K.orange, 5);
  // back of the helmet: a dome, no face anywhere
  blob(g, ellipsePts(x, y + 70, 30, 12), K.dkgrey, K.ink, 3, { gap: 3, base: 0.8 }); // collar
  const dome: Pt[] = [...arcPts(x, y + 50, 44, 46, Math.PI, Math.PI * 2, 18), [x + 50, y + 56], [x - 50, y + 56]];
  blob(g, dome, K.helmet, K.ink, 4.5, { gap: 4, base: 0.6 });
  crayon(g, [[x, y + 6], [x, y + 50]], K.orange, 4);
  crayon(g, [[x - 50, y + 56], [x + 50, y + 56]], K.ink, 5);
  // headlamp beam, from the front of the helmet up to the snapped wire
  blob(g, [[x + 34, y + 20], [x + 240, y - 90], [x + 270, y - 20]], K.yellow, null, 0, { gap: 4, base: 0.35, alpha: 0.6 }, false);
}
function crew(g: G): void {
  sky(g, K.night, K.purple);
  const gy = 420;
  // far down the street: a block already lit (the light coming back, street by street)
  glow(g, 170, 300, 200, 150);
  building(g, 40, 230, 120, gy, K.pink, { cols: 2, rows: 3, lit: [0, 1, 2, 3, 4, 5] });
  building(g, 170, 270, 100, gy, K.green, { cols: 2, rows: 2, lit: [0, 1, 2, 3] });
  // nearer: still dark
  building(g, 300, 200, 140, gy, '#3b3f63', { cols: 2, rows: 3, win: '#141a36' });
  building(g, 460, 260, 120, gy, '#46406b', { cols: 2, rows: 2, win: '#141a36' });
  building(g, 940, 180, 160, gy, '#353a5e', { cols: 2, rows: 3, win: '#141a36' });
  building(g, 1110, 250, 110, gy, '#4a4470', { cols: 2, rows: 2, win: '#141a36' });
  road(g, gy);
  puddle(g, 360, 450, 50);
  puddle(g, 1000, 446, 60);
  // the pole and Crew 7 halfway up it
  const px = 760;
  pole(g, px, 30, gy + 8, 60, 140);
  crayon(g, sag(px - 62, 52, -10, 110, 10), K.ink, 3.2);
  crayon(g, quadPts([px + 62, 52], [px + 120, 70], [px + 168, 140]), K.ink, 3.6);
  crayon(g, quadPts([1210, 70], [1100, 80], [px + 230, 120]), K.ink, 3.6);
  sparkBurst(g, px + 168, 140, 24);
  sparkBurst(g, px + 230, 120, 22);
  crewBack(g, px, 84);
  hand(g, L.crew, px - 120, 200, 28, K.yellow, -0.1);
  crayon(g, quadPts([px - 90, 214], [px - 70, 230], [px - 52, 236]), K.yellow, 3);
  rain(g, 0, 0, W, H, 240, K.rain, 24);
}

// ================= 4. safety: sparks? → switch OFF → fixed? ON! =================
function breakerBox(g: G, x: number, y: number, on: boolean): void {
  crayon(g, [[x, y + 150], [x, 444]], K.dkgrey, 10);
  blob(g, rectPts(x - 70, y, 140, 150, 2), K.silver, K.ink, 5, { gap: 5, base: 0.5 });
  // status lamp
  const lc = on ? K.green : K.red;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    crayon(g, [[x + Math.cos(a) * 24, y + 30 + Math.sin(a) * 24], [x + Math.cos(a) * 36, y + 30 + Math.sin(a) * 36]], lc, 4, { passes: 2 });
  }
  blob(g, ellipsePts(x, y + 30, 16, 16), lc, K.ink, 3.5, { gap: 3, base: 0.85 });
  // lever: up = ON, down = OFF (shape and colour)
  const pv: Pt = [x, y + 98];
  const tip: Pt = [x + 18, on ? y + 56 : y + 140];
  blob(g, ellipsePts(pv[0], pv[1], 12, 12), K.dkgrey, K.ink, 3, { gap: 3, base: 0.8 });
  crayon(g, [pv, tip], K.ink, 9);
  blob(g, ellipsePts(tip[0], tip[1], 13, 13), lc, K.ink, 3.5, { gap: 3, base: 0.9 });
  hand(g, on ? L.on : L.off, x - 38, on ? y + 66 : y + 128, 26, K.ink, -0.05, FONTS.comic);
}
function stepNum(g: G, n: number, x: number, y: number): void {
  blob(g, ellipsePts(x, y, 26, 26), K.yellow, K.ink, 4, { gap: 4, base: 0.7 });
  hand(g, String(n), x, y + 2, 32, K.ink, 0, FONTS.comic);
}
function arrow(g: G, x0: number, x1: number, y: number): void {
  crayon(g, quadPts([x0, y], [(x0 + x1) / 2, y - 26], [x1, y]), K.magenta, 8);
  crayon(g, [[x1 - 26, y - 20], [x1, y], [x1 - 30, y + 12]], K.magenta, 8);
}
function safety(g: G): void {
  // comic daylight: Chinni drawing the rule, like a page from a safety poster
  sky(g, K.sky, '#7cc6f5');
  for (let i = 0; i < 3; i++) blob(g, rectPts(30 + i * 390, 30, 360, 420, 2), K.white, K.ink, 5, { gap: 30, base: 0.85 });
  // 1. a snapped live wire sparking: hands off
  stepNum(g, 1, 70, 70);
  crayon(g, quadPts([40, 150], [150, 150], [200, 250]), K.ink, 6);
  sparkBurst(g, 200, 252, 46);
  sparkBurst(g, 206, 246, 30);
  bang(g, L.kzzt, 260, 160, 40, K.cyan, 0.12);
  // a glove with a red "no" ring: hands off a sparking line
  const hx = 120;
  const hy = 350;
  for (let i = 0; i < 4; i++) blob(g, tube([[hx - 18 + i * 12, hy - 4], [hx - 22 + i * 13, hy - 34 - (i % 3) * 4]], 11), K.orange, K.ink, 2.5, { gap: 3, base: 0.8 });
  blob(g, tube([[hx + 22, hy + 6], [hx + 36, hy - 10]], 11), K.orange, K.ink, 2.5, { gap: 3, base: 0.8 });
  blob(g, ellipsePts(hx + 2, hy + 12, 24, 24), K.orange, K.ink, 3, { gap: 3, base: 0.8 });
  crayon(g, ellipsePts(hx, hy, 54, 54), K.red, 8, { closed: true });
  crayon(g, [[hx - 38, hy - 38], [hx + 38, hy + 38]], K.red, 8);
  hand(g, L.step1, 285, 350, 32, K.red, -0.05);
  // 2. find the breaker, switch it OFF (red)
  stepNum(g, 2, 460, 70);
  breakerBox(g, 600, 110, false);
  hand(g, L.step2, 600, 400, 32, K.red, -0.03);
  // 3. twist it, then switch ON (green) and the lamp lights
  stepNum(g, 3, 850, 70);
  crayon(g, quadPts([830, 150], [900, 150], [940, 170]), K.ink, 6);
  crayon(g, quadPts([1050, 170], [1000, 150], [960, 170]), K.ink, 6);
  for (let i = 0; i < 4; i++) crayon(g, arcPts(950, 170, 10, 8, i, i + 3.2, 8), K.orange, 4); // the twist
  breakerBox(g, 1060, 200, true);
  blob(g, ellipsePts(900, 260, 34, 38), K.yellow, K.ink, 4, { gap: 4, base: 0.8 });
  blob(g, rectPts(886, 296, 28, 18, 1), K.grey, K.ink, 3, { gap: 3 });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    crayon(g, [[900 + Math.cos(a) * 48, 260 + Math.sin(a) * 50], [900 + Math.cos(a) * 66, 260 + Math.sin(a) * 68]], K.orange, 4, { passes: 2 });
  }
  hand(g, L.step3, 960, 400, 32, K.dkgreen, -0.04);
  arrow(g, 330, 420, 240);
  arrow(g, 720, 810, 240);
}

// ================= 5. chinni: at home, drawing the comic by candlelight =================
function chinniFace(g: G, cx: number, cy: number, r: number): void {
  for (const s of [-1, 1]) {
    const pl = quadPts([cx + s * r * 0.8, cy + r * 0.1], [cx + s * r * 1.35, cy + r * 0.7], [cx + s * r * 1.15, cy + r * 1.5], 10);
    blob(g, tube(pl, r * 0.42, r * 0.28), K.hair, K.ink, 3.5, { gap: 4, base: 0.6 });
    const bx = cx + s * r * 1.2;
    const by = cy + r * 1.35;
    blob(g, [[bx, by], [bx - r * 0.3, by - r * 0.2], [bx - r * 0.3, by + r * 0.2]], K.red, K.ink, 3, { gap: 3 });
    blob(g, [[bx, by], [bx + r * 0.3, by - r * 0.2], [bx + r * 0.3, by + r * 0.2]], K.red, K.ink, 3, { gap: 3 });
  }
  blob(g, ellipsePts(cx, cy, r, r * 1.02), K.skin, K.ink, 4.5, { gap: 5, base: 0.45 });
  const cap: Pt[] = [...arcPts(cx, cy - r * 0.02, r * 1.06, r * 1.08, Math.PI * 0.98, Math.PI * 2.02, 20)];
  for (let i = 0; i <= 6; i++) cap.push([cx + r * (0.95 - (i / 6) * 1.9), cy - r * (0.32 + (i % 2) * 0.16)]);
  blob(g, cap, K.hair, K.ink, 4, { gap: 4, base: 0.6 });
  // eyes looking down at her page
  for (const s of [-1, 1]) {
    const ex = cx + s * r * 0.36;
    const ey = cy + r * 0.12;
    crayon(g, arcPts(ex, ey - r * 0.04, r * 0.15, r * 0.1, 0.15, Math.PI - 0.15, 8), K.ink, 4);
    blob(g, ellipsePts(cx + s * r * 0.58, cy + r * 0.4, r * 0.16, r * 0.1), K.pink, null, 0, { gap: 3, base: 0.5 }, false);
  }
  crayon(g, [[cx, cy + r * 0.22], [cx - r * 0.05, cy + r * 0.34], [cx + r * 0.03, cy + r * 0.36]], K.skinDk, 3);
  crayon(g, arcPts(cx, cy + r * 0.48, r * 0.22, r * 0.12, 0.2, Math.PI - 0.2, 10), '#a3202e', 4);
}
function comicPage(g: G, cx: number, cy: number, w: number, h: number, rot: number): void {
  g.save();
  g.translate(cx, cy);
  g.rotate(rot);
  blob(g, rectPts(-w / 2, -h / 2, w, h, 2), K.white, K.ink, 4, { base: 1, gap: 30 });
  // two panels: Crew 7 (caped, helmeted, faceless doodle) on a pole, and a lamp lighting up
  const p1 = rectPts(-w / 2 + 12, -h / 2 + 12, w * 0.55, h - 24, 1);
  blob(g, p1, K.sky, K.ink, 3, { gap: 5, base: 0.5 });
  const p2 = rectPts(-w / 2 + 24 + w * 0.55, -h / 2 + 12, w * 0.45 - 36, h - 24, 1);
  blob(g, p2, K.yellow, K.ink, 3, { gap: 5, base: 0.45 });
  const hx = -w / 2 + 12 + w * 0.3;
  const hy = -h / 2 + 50;
  crayon(g, [[hx + 28, -h / 2 + 14], [hx + 28, h / 2 - 14]], K.brown, 6);
  blob(g, [[hx - 6, hy + 2], [hx + 6, hy + 2], [hx + 30, hy + 56], [hx + 8, hy + 46], [hx - 26, hy + 58]], K.magenta, K.ink, 2.5, { gap: 3, base: 0.75 });
  blob(g, rectPts(hx - 10, hy + 2, 20, 36, 1), K.khaki, K.ink, 2.5, { gap: 3, base: 0.7 });
  blob(g, [...arcPts(hx, hy, 13, 13, Math.PI, Math.PI * 2, 10), [hx + 14, hy + 3], [hx - 14, hy + 3]], K.helmet, K.ink, 2.5, { gap: 3, base: 0.8 });
  blob(g, boltPts(hx - 30, hy - 26, 34, 0.2), K.yellow, K.ink, 2, { gap: 3, base: 0.85 });
  const lx = -w / 2 + 24 + w * 0.55 + (w * 0.45 - 36) / 2;
  blob(g, ellipsePts(lx, -6, 16, 18), K.white, K.ink, 3, { gap: 3, base: 0.9 });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    crayon(g, [[lx + Math.cos(a) * 24, -6 + Math.sin(a) * 26], [lx + Math.cos(a) * 34, -6 + Math.sin(a) * 36]], K.orange, 3, { passes: 2 });
  }
  hand(g, L.comic, -w / 2 + 12 + w * 0.2, h / 2 - 34, 22, K.magenta, -0.05, FONTS.comic);
  g.restore();
}
function chinni(g: G): void {
  // the room at night: dim walls, the candle's warm light in the middle
  const all = rectPts(-10, -10, W + 20, H + 20);
  scribble(g, all, '#3a2a55', { gap: 6, w: 6, base: 0.55, alpha: 0.9, angle: -0.7 });
  scribble(g, all, K.night, { gap: 12, w: 5, alpha: 0.4, angle: 0.55 });
  glow(g, 640, 300, 520, 260);
  // window on the back wall with the rain outside
  const wx = 960;
  const wy = 40;
  const win = rectPts(wx, wy, 190, 170, 1.5);
  blob(g, win, K.night, K.ink, 5, { gap: 5, base: 0.75 });
  g.save();
  pathOf(g, win);
  g.clip();
  rain(g, wx, wy, 190, 170, 40, K.rain, 20);
  blob(g, boltPts(wx + 120, wy + 20, 70, 0.2), K.yellow, K.ink, 2.5, { gap: 3, base: 0.6 });
  g.restore();
  crayon(g, [[wx + 95, wy], [wx + 95, wy + 170]], K.dkbrown, 5);
  crayon(g, [[wx, wy + 85], [wx + 190, wy + 85]], K.dkbrown, 5);
  // her drawings taped to the wall
  blob(g, rectPts(70, 50, 120, 96, 2), K.white, K.ink, 3.5, { gap: 30, base: 0.9 });
  blob(g, heartPts(130, 98, 30, -0.1), K.magenta, K.ink, 3, { gap: 3 });
  blob(g, rectPts(220, 80, 104, 84, 2), K.white, K.ink, 3.5, { gap: 30, base: 0.9 });
  blob(g, boltPts(270, 92, 60, 0.2), K.yellow, K.ink, 3, { gap: 3, base: 0.7 });
  blob(g, starPts(820, 90, 26), K.yellow, K.ink, 3, { gap: 3 });
  // Chinni, behind the table
  const cx = 470;
  const tee: Pt[] = [
    [cx - 60, 270],
    [cx + 60, 270],
    [cx + 130, 300],
    [cx + 150, 380],
    [cx - 150, 380],
    [cx - 130, 300],
  ];
  blob(g, tee, K.blue, K.ink, 5, { gap: 5, base: 0.4 });
  blob(g, arcPts(cx, 270, 44, 24, 0, Math.PI, 12), K.skin, K.ink, 3.5, { gap: 4 });
  blob(g, starPts(cx - 80, 330, 16), K.yellow, K.ink, 2.5, { gap: 3 });
  chinniFace(g, cx, 186, 74);
  // the table
  const table: Pt[] = [
    [-10, 360],
    [W + 10, 350],
    [W + 10, H + 10],
    [-10, H + 10],
  ];
  blob(g, table, K.brown, K.ink, 5, { gap: 6, angle: -0.25, base: 0.45 });
  crayon(g, [[-10, 360], [W + 10, 350]], K.dkbrown, 7);
  // her comic on the table, and her arm drawing on it with a red crayon
  comicPage(g, 640, 412, 330, 150, 0.03);
  const arm = quadPts([cx + 120, 320], [cx + 150, 390], [cx + 210, 410], 10);
  blob(g, tube(arm, 38, 30), K.skin, K.ink, 3.5, { gap: 4 });
  blob(g, tube(quadPts([cx + 110, 300], [cx + 130, 320], [cx + 150, 350], 6), 50, 44), K.blue, K.ink, 4, { gap: 4 });
  blob(g, ellipsePts(cx + 220, 410, 20, 16), K.skin, K.ink, 3.5, { gap: 4 });
  blob(g, tube([[cx + 214, 396], [cx + 250, 360]], 12), K.red, K.ink, 2.5, { gap: 3, base: 0.8 });
  // the other arm resting, and crayons scattered
  blob(g, ellipsePts(cx - 110, 380, 46, 20, 0.1), K.skin, K.ink, 3.5, { gap: 4 });
  const crayons: [number, number, number, string][] = [
    [220, 430, 0.3, K.yellow],
    [270, 450, -0.2, K.magenta],
    [180, 470, 0.8, K.green],
    [880, 440, -0.4, K.blue],
    [930, 465, 0.2, K.cyan],
  ];
  for (const [x, y, a, col] of crayons) blob(g, tube([[x - Math.cos(a) * 30, y - Math.sin(a) * 30], [x + Math.cos(a) * 30, y + Math.sin(a) * 30]], 14), col, K.ink, 2.5, { gap: 3, base: 0.8 });
  // the candle that lights it all
  candle(g, 1040, 400, 60);
}

const DRAW: Record<IntroArt, { seed: number; draw: (g: G) => void }> = {
  storm: { seed: 71, draw: storm },
  dark: { seed: 72, draw: dark },
  crew: { seed: 73, draw: crew },
  safety: { seed: 74, draw: safety },
  chinni: { seed: 75, draw: chinni },
};

/** Bake one intro panel (paper + waxy ink with paper tooth) into a fresh canvas at INTRO_ART_SIZE. */
export function makeIntroCanvas(art: IntroArt): HTMLCanvasElement {
  const spec = DRAW[art];
  const c = mk(W, H);
  const g = ctx2d(c);
  reseed(spec.seed);
  paper(g, W, H);
  const ink = mk(W, H);
  const ig = ctx2d(ink);
  spec.draw(ig);
  grain(ig, W, H, 0.45);
  g.drawImage(ink, 0, 0);
  return c;
}

export const introKey = (art: IntroArt): string => `intro_${art}`;
