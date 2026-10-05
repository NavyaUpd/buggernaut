// Per-room baked layers: the real "Monsoon Noir" look, Chinni's colour comic and her notebook sketch (§9.1–9.3).
import { CSS } from '../config';
import type { ParsedRoom } from '../core/roomParse';
import { crayonFill, ctx2d, H, inkLine, mk, OY, rnd, setSeed, sketchRect, T, W, type G } from './draw';

export interface Building {
  x: number;
  w: number;
  h: number;
  top: number;
  layer: 0 | 1;
  tank: boolean;
  dish: boolean;
  laundry: boolean;
  spire: boolean;
  windows: { x: number; y: number; candle: boolean; ph: number }[];
}

export interface Puddle {
  x: number;
  w: number;
  y: number;
}

export interface Layers {
  sky: HTMLCanvasElement;
  clouds: HTMLCanvasElement;
  fog: HTMLCanvasElement;
  far: HTMLCanvasElement;
  mid: HTMLCanvasElement;
  level: HTMLCanvasElement;
  fg: HTMLCanvasElement;
  comic: HTMLCanvasElement;
  sketch: HTMLCanvasElement;
  city: Building[];
  candles: (Building['windows'][number] & { layer: number })[];
  silWin: { x: number; y: number } | null;
  puddles: Puddle[];
}

const CITY_BASE = 19 * T + OY;

function makeCity(): Building[] {
  const city: Building[] = [];
  let x = -80;
  while (x < W + 120) {
    const w = 70 + rnd() * 110;
    const h = 160 + rnd() * 250;
    city.push({ x, w, h, top: 0, layer: 0, tank: rnd() > 0.5, dish: rnd() > 0.6, laundry: false, spire: false, windows: [] });
    x += w + 6 + rnd() * 20;
  }
  x = -100;
  while (x < W + 140) {
    const w = 90 + rnd() * 130;
    const h = 90 + rnd() * 170;
    city.push({ x, w, h, top: 0, layer: 1, tank: rnd() > 0.4, dish: rnd() > 0.5, laundry: rnd() > 0.5, spire: false, windows: [] });
    x += w + 10 + rnd() * 30;
  }
  // one temple spire on the far skyline
  const far = city.filter((b) => b.layer === 0);
  const t = far[Math.floor(far.length * (0.3 + rnd() * 0.4))];
  if (t) {
    t.spire = true;
    t.tank = false;
    t.dish = false;
  }
  for (const b of city) {
    b.top = CITY_BASE - b.h - (b.layer === 0 ? 60 : 0);
    const cols = Math.floor(b.w / 22);
    const rows = Math.floor(b.h / 30);
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++)
        if (rnd() > 0.45) {
          const wy = b.top + 18 + j * 30;
          if (wy < CITY_BASE - 30) b.windows.push({ x: b.x + 10 + i * 22, y: wy, candle: rnd() > 0.9, ph: rnd() * 9 });
        }
  }
  return city;
}

function spirePath(g: G, bx: number, top: number, w: number): void {
  const cx = bx + w / 2;
  g.beginPath();
  g.moveTo(cx - w * 0.32, top);
  g.quadraticCurveTo(cx - w * 0.2, top - 70, cx, top - 120);
  g.quadraticCurveTo(cx + w * 0.2, top - 70, cx + w * 0.32, top);
  g.closePath();
}

// ───────────────────────── static props (baked) ─────────────────────────

export function drawPoleStatic(g: G, room: ParsedRoom, comic: boolean): void {
  for (const pr of room.poles) {
    const x = pr.x * T + 16;
    const top = pr.top * T + OY;
    const bot = (pr.bottom + 1) * T + OY;
    if (pr.ladder) {
      g.fillStyle = comic ? '#8a5a2b' : '#2a2f40';
      g.fillRect(x - 12, top, 4, bot - top);
      g.fillRect(x + 8, top, 4, bot - top);
      for (let y = top + 8; y < bot; y += 14) g.fillRect(x - 12, y, 24, 3);
      if (comic) {
        inkLine(g, x - 12, top, x - 12, bot, 2.5);
        inkLine(g, x + 12, top, x + 12, bot, 2.5);
      }
      continue;
    }
    if (!comic) {
      const gr = g.createLinearGradient(x - 6, 0, x + 6, 0);
      gr.addColorStop(0, '#2a221a');
      gr.addColorStop(0.5, '#4a3b2b');
      gr.addColorStop(1, '#1f1913');
      g.fillStyle = gr;
    } else g.fillStyle = '#b5651d';
    g.fillRect(x - 6, top - 4, 12, bot - top + 4);
    g.fillStyle = comic ? '#b5651d' : '#3a2e22';
    g.fillRect(x - 28, top + 4, 56, 7);
    if (comic) {
      inkLine(g, x - 6, top - 4, x - 6, bot, 3);
      inkLine(g, x + 6, top - 4, x + 6, bot, 3);
      inkLine(g, x - 28, top + 4, x + 28, top + 4, 3);
      inkLine(g, x - 28, top + 11, x + 28, top + 11, 2);
    }
    for (const o of [-22, 22]) {
      g.fillStyle = comic ? '#fff' : '#58698c';
      g.fillRect(x + o - 3, top - 6, 6, 10);
    }
    g.fillStyle = comic ? CSS.ink : '#15110c';
    for (let y = top + 30; y < bot - 10; y += 26) g.fillRect(x - 10, y, 20, 3);
    if (bot - top > 150) {
      g.fillStyle = comic ? '#fff' : '#d8d0b0';
      g.fillRect(x - 7, bot - 110, 14, 18);
      g.fillStyle = comic ? CSS.red : '#8a2b22';
      g.fillRect(x - 7, bot - 104, 14, 4);
    }
  }
}

export function drawLampPostStatic(g: G, room: ParsedRoom, comic: boolean): void {
  for (const l of room.lamps) {
    if (l.kind !== 'lamp') continue;
    const x = l.hx;
    const y = l.hy;
    g.fillStyle = comic ? CSS.blue : '#232b40';
    g.fillRect(x - 4, y, 8, l.groundY - y);
    g.fillRect(x - 4, y - 6, 32, 6);
    if (comic) {
      inkLine(g, x - 4, y, x - 4, l.groundY, 3);
      inkLine(g, x + 4, y, x + 4, l.groundY, 3);
    }
  }
}

export function drawHouseStatic(g: G, room: ParsedRoom, comic: boolean): void {
  const h = room.def.house;
  if (!h) return;
  const x = h.x * T;
  const y = h.y * T + OY;
  const w = h.w * T;
  const hh = h.h * T;
  if (!comic) {
    g.fillStyle = '#1a2036';
    g.fillRect(x, y, w, hh);
    g.fillStyle = '#121729';
    g.beginPath();
    g.moveTo(x - 20, y);
    g.lineTo(x + w / 2, y - 70);
    g.lineTo(x + w + 20, y);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.04)';
    g.fillRect(x, y, 3, hh);
  } else {
    crayonFill(g, x, y, w, hh, '#ff9fc4', 'rgba(0,0,0,.2)', 0.4);
    g.fillStyle = CSS.red;
    g.beginPath();
    g.moveTo(x - 20, y);
    g.lineTo(x + w / 2, y - 70);
    g.lineTo(x + w + 20, y);
    g.closePath();
    g.fill();
    inkLine(g, x - 20, y, x + w / 2, y - 70, 3.5);
    inkLine(g, x + w / 2, y - 70, x + w + 20, y, 3.5);
    inkLine(g, x - 20, y, x + w + 20, y, 3);
    inkLine(g, x, y, x, y + hh, 3);
    inkLine(g, x + w, y, x + w, y + hh, 3);
    // a crayon flower pot by the door
    g.fillStyle = CSS.orange;
    g.fillRect(x + w - 90, y + hh - 26, 20, 26);
    g.fillStyle = CSS.green;
    g.beginPath();
    g.arc(x + w - 80, y + hh - 34, 10, 0, 7);
    g.fill();
  }
  // door (the exit)
  const [ex, ey] = room.exits[0] ?? [h.x + h.w - 3, h.y + h.h - 2];
  const dx = ex * T - 4;
  const dy = ey * T + OY;
  g.fillStyle = comic ? '#8a5a2b' : '#0c0f1c';
  g.fillRect(dx, dy, T + 8, (room.exits.length || 2) * T);
  if (comic) {
    g.strokeStyle = CSS.ink;
    g.lineWidth = 3;
    g.strokeRect(dx, dy, T + 8, (room.exits.length || 2) * T);
    g.fillStyle = CSS.yellow;
    g.beginPath();
    g.arc(dx + T, dy + T, 3, 0, 7);
    g.fill();
  }
}

// ───────────────────────── bake ─────────────────────────

export function bakeRoom(room: ParsedRoom, roomIndex: number): Layers {
  setSeed(7 + roomIndex * 977);
  const city = makeCity();
  const candles = city.flatMap((b) => b.windows.filter((w) => w.candle).map((w) => ({ ...w, layer: b.layer })));
  const silW = candles.find((c) => c.layer === 1 && c.x > 500 && c.x < 1100) ?? candles[0];
  const silWin = silW ? { x: silW.x, y: silW.y } : null;
  const solid = (x: number, y: number) => room.solid(x, y);

  // puddles on exposed ground tops
  const puddles: Puddle[] = [];
  for (let y = 10; y < 21; y++) {
    let x = 0;
    while (x < 40) {
      if (!(solid(x, y) && !solid(x, y - 1) && room.cell(x, y - 1) !== '~')) {
        x++;
        continue;
      }
      let x2 = x;
      while (x2 + 1 < 40 && solid(x2 + 1, y) && !solid(x2 + 1, y - 1)) x2++;
      const run = x2 - x + 1;
      for (let k = 0; k < Math.floor(run / 7); k++) {
        if (rnd() > 0.7) continue;
        const pw = 50 + rnd() * 60;
        const px = x * T + rnd() * Math.max(1, run * T - pw);
        puddles.push({ x: px, w: pw, y: y * T + OY });
      }
      x = x2 + 1;
    }
  }

  // ---- REAL ----
  const sky = mk();
  let g = ctx2d(sky);
  const sk = g.createLinearGradient(0, 0, 0, H);
  sk.addColorStop(0, '#070b18');
  sk.addColorStop(0.55, '#141c36');
  sk.addColorStop(1, '#232d50');
  g.fillStyle = sk;
  g.fillRect(0, 0, W, H);

  const clouds = mk(W * 2, 300);
  g = ctx2d(clouds);
  for (let i = 0; i < 90; i++) {
    const x = rnd() * W * 2;
    const y = 20 + rnd() * 200;
    const rx = 80 + rnd() * 200;
    const ry = 20 + rnd() * 50;
    const gr = g.createRadialGradient(x, y, 0, x, y, rx);
    gr.addColorStop(0, `rgba(44,56,94,${0.25 + rnd() * 0.25})`);
    gr.addColorStop(1, 'rgba(44,56,94,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, 7);
    g.fill();
  }
  const fog = mk(W * 2, 160);
  g = ctx2d(fog);
  for (let i = 0; i < 60; i++) {
    const x = rnd() * W * 2;
    const y = 60 + rnd() * 60;
    const r = 140 + rnd() * 160;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(120,140,190,.05)');
    gr.addColorStop(1, 'rgba(120,140,190,0)');
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const far = mk(W + 200);
  const mid = mk(W + 200);
  for (const [c, layer, col] of [
    [far, 0, '#111933'],
    [mid, 1, '#19223f'],
  ] as const) {
    const g2 = ctx2d(c);
    for (const b of city.filter((bb) => bb.layer === layer)) {
      const bx = b.x + 100;
      g2.fillStyle = col;
      g2.fillRect(bx, b.top, b.w, H);
      if (b.spire) {
        spirePath(g2, bx, b.top, b.w);
        g2.fill();
        g2.fillRect(bx + b.w / 2 - 1, b.top - 140, 2, 22);
      }
      if (b.tank) {
        g2.fillRect(bx + 12, b.top - 22, 26, 22);
        g2.fillRect(bx + 16, b.top - 30, 18, 8);
        g2.fillRect(bx + 14, b.top - 2, 3, 6);
      }
      if (b.dish) {
        g2.beginPath();
        g2.ellipse(bx + b.w - 20, b.top - 8, 11, 6, -0.5, 0, 7);
        g2.fill();
        g2.fillRect(bx + b.w - 21, b.top - 6, 2, 8);
      }
      g2.fillStyle = 'rgba(255,255,255,.035)';
      g2.fillRect(bx, b.top, 3, H);
      for (const w of b.windows) {
        if (w.candle) continue;
        g2.fillStyle = 'rgba(30,40,70,.9)';
        g2.fillRect(w.x + 100, w.y, 10, 14);
      }
      if (b.laundry && layer === 1) {
        g2.strokeStyle = '#0d1428';
        g2.lineWidth = 1.5;
        g2.beginPath();
        g2.moveTo(bx + 6, b.top + 30);
        g2.lineTo(bx + b.w - 6, b.top + 36);
        g2.stroke();
        for (let k = 0; k < 4; k++) {
          g2.fillStyle = '#0d1428';
          g2.fillRect(bx + 14 + (k * (b.w - 30)) / 4, b.top + 32 + k, 12, 16);
        }
      }
    }
    if (layer === 1) {
      g2.strokeStyle = 'rgba(8,11,22,.95)';
      g2.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        const y0 = 160 + rnd() * 150;
        g2.beginPath();
        g2.moveTo(0, y0);
        g2.quadraticCurveTo(W / 2 + 100, y0 + 40 + rnd() * 70, W + 200, y0 + (rnd() - 0.5) * 90);
        g2.stroke();
      }
    }
  }
  const level = mk();
  g = ctx2d(level);
  drawHouseStatic(g, room, false);
  for (let y = 0; y < 22; y++)
    for (let x = 0; x < 40; x++) {
      const px = x * T;
      const py = y * T + OY;
      if (room.oneway(x, y)) {
        g.fillStyle = '#3a4566';
        g.fillRect(px, py, T, 8);
        g.fillStyle = '#6d7ea3';
        g.fillRect(px, py, T, 2);
        continue;
      }
      if (!solid(x, y)) continue;
      const gr = g.createLinearGradient(0, py, 0, py + T);
      gr.addColorStop(0, '#2f3a58');
      gr.addColorStop(1, '#232c46');
      g.fillStyle = gr;
      g.fillRect(px, py, T, T);
      g.fillStyle = 'rgba(0,0,0,.22)';
      if ((x + y) % 2) g.fillRect(px, py + T / 2, T, 1);
      g.fillRect(px + (y % 2 ? 0 : 16), py, 1, T / 2);
      if (rnd() > 0.7) {
        g.fillStyle = 'rgba(80,120,90,.25)';
        g.fillRect(px + rnd() * 20, py + rnd() * 20, 6, 4);
      }
      if (!solid(x, y - 1)) {
        g.fillStyle = '#6d7ea3';
        g.fillRect(px, py, T, 2);
        g.fillStyle = 'rgba(143,163,199,.22)';
        g.fillRect(px, py + 2, T, 5);
      }
      if (!solid(x - 1, y)) {
        g.fillStyle = 'rgba(109,126,163,.5)';
        g.fillRect(px, py, 2, T);
      }
      if (!solid(x + 1, y)) {
        g.fillStyle = 'rgba(0,0,0,.4)';
        g.fillRect(px + T - 3, py, 3, T);
      }
      if (!solid(x, y + 1) && y < 21) {
        // overhang drips
        g.fillStyle = 'rgba(143,163,199,.3)';
        for (let k = 0; k < 3; k++) g.fillRect(px + 4 + rnd() * 24, py + T, 1.5, 3 + rnd() * 5);
      }
    }
  drawPoleStatic(g, room, false);
  drawLampPostStatic(g, room, false);

  const fg = mk(W + 300);
  g = ctx2d(fg);
  g.fillStyle = '#04060d';
  g.strokeStyle = '#04060d';
  g.lineWidth = 9;
  g.beginPath();
  g.moveTo(0, 30);
  g.quadraticCurveTo(130, 60, 220, 40);
  g.stroke();
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(120, 52);
  g.quadraticCurveTo(170, 110, 160, 150);
  g.stroke();
  for (let i = 0; i < 70; i++) {
    const t = rnd();
    const bx = 20 + t * 200;
    const by = 36 + Math.sin(t * 3) * 14 + rnd() * 90;
    g.beginPath();
    g.ellipse(bx, by, 9 + rnd() * 6, 4 + rnd() * 3, rnd() * 3, 0, 7);
    g.fill();
  }
  g.lineWidth = 4;
  for (const [y, s] of [
    [60, 1.0],
    [80, 0.8],
    [96, 1.3],
  ] as const) {
    g.beginPath();
    g.moveTo(0, y);
    g.quadraticCurveTo(W / 2 + 150, y + 70 * s, W + 300, y - 10);
    g.stroke();
  }

  // ---- COMIC ----
  const comic = mk();
  g = ctx2d(comic);
  g.fillStyle = CSS.sky;
  g.fillRect(0, 0, W, H);
  g.fillStyle = CSS.dot;
  for (let y = 0; y < H; y += 12)
    for (let x = (y / 12) % 2 ? 6 : 0; x < W; x += 12) {
      g.beginPath();
      g.arc(x, y, 1.2 + 2.2 * (y / H), 0, 7);
      g.fill();
    }
  // loose crayon hatch strokes in the sky
  g.strokeStyle = 'rgba(47,107,255,.12)';
  g.lineWidth = 3;
  for (let i = 0; i < 40; i++) {
    const x = rnd() * W;
    const y = rnd() * 300;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 40 + rnd() * 50, y - 10 - rnd() * 10);
    g.stroke();
  }
  const sunX = 900 + rnd() * 200;
  g.fillStyle = CSS.yellow;
  g.beginPath();
  g.arc(sunX, 120, 56, 0, 7);
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = CSS.ink;
  g.stroke();
  g.lineWidth = 3;
  g.beginPath();
  g.arc(sunX, 128, 26, 0.2, Math.PI - 0.2);
  g.stroke();
  g.fillStyle = CSS.ink;
  g.beginPath();
  g.arc(sunX - 16, 108, 4, 0, 7);
  g.arc(sunX + 16, 108, 4, 0, 7);
  g.fill();
  for (const [cx, cy] of [
    [110, 90],
    [330, 120],
    [560, 80],
    [760, 130],
    [1200, 90],
  ] as const) {
    const parts = [
      [0, 0, 40],
      [34, 6, 30],
      [-32, 8, 28],
      [10, -18, 26],
    ] as const;
    g.fillStyle = '#fff';
    for (const [dx, dy, r] of parts) {
      g.beginPath();
      g.arc(cx + dx, cy + dy, r, 0, 7);
      g.fill();
    }
    g.strokeStyle = CSS.blue;
    g.lineWidth = 3;
    for (const [dx, dy, r] of parts) {
      g.beginPath();
      g.arc(cx + dx, cy + dy, r, Math.PI * 1.05, Math.PI * 1.95);
      g.stroke();
    }
  }
  const bcols = ['#ff7eb6', '#7ee0c3', '#ffd400', '#b69cff', '#ff9f1c', '#7cc6f5'];
  city.forEach((b, i) => {
    crayonFill(g, b.x, b.top, b.w, H - b.top, bcols[i % bcols.length]!, 'rgba(0,0,0,.25)', 0.35);
    inkLine(g, b.x, b.top, b.x + b.w, b.top);
    inkLine(g, b.x, b.top, b.x, H);
    inkLine(g, b.x + b.w, b.top, b.x + b.w, H);
    if (b.spire) {
      g.fillStyle = CSS.orange;
      spirePath(g, b.x, b.top, b.w);
      g.fill();
      g.strokeStyle = CSS.ink;
      g.lineWidth = 3;
      g.stroke();
      g.fillStyle = CSS.red;
      g.beginPath();
      g.moveTo(b.x + b.w / 2, b.top - 140);
      g.lineTo(b.x + b.w / 2 + 16, b.top - 133);
      g.lineTo(b.x + b.w / 2, b.top - 126);
      g.fill();
    }
    if (b.tank) {
      g.fillStyle = CSS.blue;
      g.fillRect(b.x + 12, b.top - 22, 26, 22);
      inkLine(g, b.x + 12, b.top - 22, b.x + 38, b.top - 22, 3);
      inkLine(g, b.x + 12, b.top - 22, b.x + 12, b.top);
      inkLine(g, b.x + 38, b.top - 22, b.x + 38, b.top);
    }
    for (const w of b.windows) {
      g.fillStyle = CSS.yellow;
      g.fillRect(w.x, w.y, 10, 14);
      g.strokeStyle = CSS.ink;
      g.lineWidth = 2;
      g.strokeRect(w.x, w.y, 10, 14);
    }
    if (b.laundry) {
      const ly = b.top + 30;
      inkLine(g, b.x + 6, ly, b.x + b.w - 6, ly + 6, 2);
      for (let k = 0; k < 4; k++) {
        g.fillStyle = [CSS.red, CSS.green, CSS.magenta, CSS.blue][k]!;
        const lx = b.x + 14 + (k * (b.w - 30)) / 4;
        g.fillRect(lx, ly + 2 + k, 12, 16);
        g.strokeStyle = CSS.ink;
        g.lineWidth = 2;
        g.strokeRect(lx, ly + 2 + k, 12, 16);
      }
    }
  });
  drawHouseStatic(g, room, true);
  for (let y = 0; y < 22; y++)
    for (let x = 0; x < 40; x++) {
      if (!solid(x, y)) continue;
      const px = x * T;
      const py = y * T + OY;
      const wall = y < 19;
      crayonFill(g, px, py, T, T, wall ? '#ff6b5b' : CSS.yellow, wall ? '#c2412f' : CSS.orange, 0.8);
      if (wall && (x + y) % 2 === 0) {
        g.strokeStyle = 'rgba(0,0,0,.35)';
        g.lineWidth = 2;
        g.strokeRect(px + 3, py + 4, T - 6, T / 2 - 4);
      }
    }
  for (let y = 0; y < 22; y++)
    for (let x = 0; x < 40; x++) {
      const px = x * T;
      const py = y * T + OY;
      if (room.oneway(x, y)) {
        crayonFill(g, px, py, T, 8, CSS.red, '#fff', 0.5);
        inkLine(g, px, py, px + T, py, 3);
        continue;
      }
      if (!solid(x, y)) continue;
      if (!solid(x, y - 1)) {
        g.fillStyle = CSS.green;
        g.fillRect(px, py - 2, T, 6);
        inkLine(g, px - 1, py - 2, px + T + 1, py - 2, 3.5);
      }
      if (!solid(x - 1, y)) inkLine(g, px, py - 2, px, py + T, 3.5);
      if (!solid(x + 1, y)) inkLine(g, px + T, py - 2, px + T, py + T, 3.5);
      if (!solid(x, y + 1) && y < 21) inkLine(g, px, py + T, px + T, py + T, 3.5);
    }
  drawPoleStatic(g, room, true);
  drawLampPostStatic(g, room, true);

  // ---- SKETCH (Chinni's notebook page) ----
  const sketch = mk();
  g = ctx2d(sketch);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = '#cfe0fb';
  g.lineWidth = 1.5;
  for (let y = 40; y < H; y += 30) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }
  g.strokeStyle = '#ffb3b3';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(96, 0);
  g.lineTo(96, H);
  g.stroke();
  for (const b of city) {
    sketchRect(g, b.x, b.top, b.w, H - b.top);
    b.windows.forEach((w, i) => {
      if (i % 2) sketchRect(g, w.x, w.y, 10, 14, '#8a93a6', 1);
    });
  }
  g.beginPath();
  g.arc(sunX, 120, 56, 0, 7);
  g.strokeStyle = '#5a6478';
  g.lineWidth = 1.6;
  g.stroke();
  for (let y = 0; y < 22; y++)
    for (let x = 0; x < 40; x++) {
      if (!solid(x, y)) continue;
      const px = x * T;
      const py = y * T + OY;
      if (!solid(x, y - 1)) inkLine(g, px, py, px + T, py, 1.6, '#5a6478', 2.4);
      if (!solid(x - 1, y)) inkLine(g, px, py, px, py + T, 1.6, '#5a6478', 2.4);
      if (!solid(x + 1, y)) inkLine(g, px + T, py, px + T, py + T, 1.6, '#5a6478', 2.4);
    }
  for (const pr of room.poles) {
    const x = pr.x * T + 16;
    inkLine(g, x - 6, pr.top * T + OY, x - 6, (pr.bottom + 1) * T + OY, 1.4, '#5a6478', 2);
    inkLine(g, x + 6, pr.top * T + OY, x + 6, (pr.bottom + 1) * T + OY, 1.4, '#5a6478', 2);
  }

  return { sky, clouds, fog, far, mid, level, fg, comic, sketch, city, candles, silWin, puddles };
}
