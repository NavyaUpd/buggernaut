// Canvas-2D drawing helpers ported from docs/style-target.html.
import { CSS, FONTS, VIEW } from '../config';

export const W = VIEW.width;
export const H = VIEW.height;
export const T = VIEW.tile;
export const OY = VIEW.offsetY;
export type G = CanvasRenderingContext2D;

let seed = 7;
/** Seeded random for baked art (deterministic per room). */
export const rnd = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
export function setSeed(s: number): void {
  seed = Math.max(1, Math.floor(s)) % 2147483647;
}

export function mk(w: number = W, h: number = H): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
export function ctx2d(c: HTMLCanvasElement): G {
  return c.getContext('2d')!;
}

export function inkLine(g: G, x1: number, y1: number, x2: number, y2: number, w = 3, col: string = CSS.ink, j = 1.6): void {
  g.strokeStyle = col;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(x1 + (rnd() - 0.5) * j, y1 + (rnd() - 0.5) * j);
  const n = Math.max(2, Math.floor(Math.hypot(x2 - x1, y2 - y1) / 18));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    g.lineTo(x1 + (x2 - x1) * t + (rnd() - 0.5) * j, y1 + (y2 - y1) * t + (rnd() - 0.5) * j);
  }
  g.stroke();
}

export function sketchRect(g: G, x: number, y: number, w: number, h: number, col = '#5a6478', lw = 1.4): void {
  for (let k = 0; k < 2; k++) {
    inkLine(g, x, y, x + w, y, lw, col, 2.4);
    inkLine(g, x, y, x, y + h, lw, col, 2.4);
    inkLine(g, x + w, y, x + w, y + h, lw, col, 2.4);
    inkLine(g, x, y + h, x + w, y + h, lw, col, 2.4);
  }
}

export function crayonFill(g: G, x: number, y: number, w: number, h: number, base: string, stroke: string, density = 0.6): void {
  g.fillStyle = base;
  g.fillRect(x, y, w, h);
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.strokeStyle = stroke;
  g.lineWidth = 2;
  for (let i = -h; i < w; i += 5) {
    if (rnd() > density) continue;
    g.globalAlpha = 0.25 + rnd() * 0.35;
    g.beginPath();
    g.moveTo(x + i, y + h + 2);
    g.lineTo(x + i + h + 4, y - 2);
    g.stroke();
  }
  g.restore();
  g.globalAlpha = 1;
}

export function comicText(g: G, text: string, x: number, y: number, size: number, rot: number, fill: string, scale = 1): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(scale, scale);
  g.font = `900 ${size}px ${FONTS.comic}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = size * 0.22;
  g.strokeStyle = CSS.ink;
  g.strokeText(text, 0, 0);
  g.fillStyle = fill;
  g.fillText(text, 0, 0);
  g.restore();
}

/** Speech bubble that pops in (k = seconds alive) and shrinks away at `life`. */
export function bubble(g: G, text: string, x: number, y: number, k: number, life = 2.8): void {
  const pop = k < 0.15 ? (k / 0.15) * 1.1 : k < 0.25 ? 1.1 - (k - 0.15) : 1;
  const out = k > life - 0.3 ? Math.max(0, 1 - (k - (life - 0.3)) / 0.3) : 1;
  const s = pop * out;
  if (s <= 0) return;
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.font = `900 24px ${FONTS.ui}`;
  const w = g.measureText(text).width + 40;
  g.fillStyle = '#fff';
  g.strokeStyle = CSS.ink;
  g.lineWidth = 3.5;
  g.beginPath();
  g.ellipse(0, 0, w / 2, 30, -0.04, 0, 7);
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(10, 26);
  g.lineTo(36, 62);
  g.lineTo(30, 24);
  g.fill();
  g.stroke();
  g.fillRect(8, 19, 24, 8);
  g.fillStyle = CSS.red;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 0, 1);
  g.restore();
}

/** Chinni's crayon tip bubble (handwriting on paper, wobbly outline). */
export function tipBubble(g: G, text: string, x: number, y: number, k: number, life: number): void {
  const a = Math.min(1, k * 4, (life - k) * 2);
  if (a <= 0) return;
  g.save();
  g.globalAlpha = a;
  g.translate(x, y + Math.sin(k * 3) * 3);
  g.rotate(-0.04);
  g.font = `700 22px ${FONTS.hand}`;
  const w = g.measureText(text).width + 36;
  g.fillStyle = '#fffdf2';
  g.beginPath();
  g.ellipse(0, 0, w / 2, 30, 0, 0, 7);
  g.fill();
  for (let i = 0; i < 2; i++) {
    g.strokeStyle = i ? CSS.magenta : CSS.blue;
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(i * 1.5, i, w / 2 + i * 2, 30 + i, 0.02 * i, 0, 7);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(-8, 28);
  g.lineTo(-14, 56);
  g.lineTo(8, 29);
  g.fillStyle = '#fffdf2';
  g.fill();
  g.strokeStyle = CSS.blue;
  g.stroke();
  g.fillStyle = CSS.blue;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 0, 2);
  g.restore();
}

export function drawCrayon(g: G, x: number, y: number, ang: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.lineWidth = 2.5;
  g.strokeStyle = CSS.ink;
  g.fillStyle = CSS.magenta;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(16, -9);
  g.lineTo(16, 9);
  g.closePath();
  g.fill();
  g.stroke();
  g.beginPath();
  g.rect(16, -9, 62, 18);
  g.fill();
  g.stroke();
  g.fillStyle = '#fff';
  g.fillRect(28, -9, 8, 18);
  g.fillRect(58, -9, 8, 18);
  g.strokeRect(28, -9, 8, 18);
  g.strokeRect(58, -9, 8, 18);
  g.restore();
}

/** Chinni's room caption: notebook strip, top-left, handwriting. */
export function caption(g: G, text: string, t: number, dur: number): void {
  const a = Math.min(1, Math.max(0, t * 3), (dur - t) * 2);
  if (a <= 0) return;
  g.save();
  g.globalAlpha = a;
  g.translate(36, 58);
  g.rotate(-0.015);
  g.font = `700 24px ${FONTS.hand}`;
  const w = g.measureText(text).width + 34;
  g.fillStyle = '#fff';
  g.fillRect(0, -32, w, 48);
  g.strokeStyle = '#cfe0fb';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(0, -4);
  g.lineTo(w, -4);
  g.stroke();
  g.strokeStyle = '#ffb3b3';
  g.beginPath();
  g.moveTo(14, -32);
  g.lineTo(14, 16);
  g.stroke();
  g.strokeStyle = CSS.ink;
  g.lineWidth = 3;
  g.strokeRect(0, -32, w, 48);
  g.fillStyle = CSS.blue;
  g.fillText(text, 22, 0);
  g.restore();
}

/** Rounded key prompt ("Hold E" / "E"), with an optional hold-progress ring. */
export function keyPrompt(g: G, text: string, x: number, y: number, progress: number): void {
  g.save();
  g.font = `700 16px ${FONTS.ui}`;
  const w = g.measureText(text).width + 20;
  const px = Math.max(8, Math.min(W - w - 8, x - w / 2));
  g.fillStyle = '#fff';
  g.strokeStyle = CSS.ink;
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(px, y - 14, w, 28, 8);
  g.fill();
  g.stroke();
  g.fillStyle = CSS.ink;
  g.textBaseline = 'middle';
  g.fillText(text, px + 10, y + 1);
  if (progress > 0) {
    g.strokeStyle = CSS.yellow;
    g.lineWidth = 5;
    g.beginPath();
    g.arc(x, y + 44, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, progress));
    g.stroke();
  }
  g.restore();
}

export function quadPath(g: G, q: readonly (readonly [number, number])[]): void {
  g.beginPath();
  q.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
}
