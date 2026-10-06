// Dynamic props, drawn every frame in both looks (§9.5).
import { CSS } from '../config';
import { strikePhase, strikeOffset } from '../core/timers';
import type { RoomSim } from '../game/RoomSim';
import { comicText, inkLine, OY, T, type G } from './draw';

const R = Math.random;

/** Where the cable from splice s leaves the pole, and where it reaches lamp i. */
export function wireEnds(sim: RoomSim, s: readonly [number, number], lampIdx: number) {
  const l = sim.room.lamps[lampIdx]!;
  const px = s[0] * T + 16;
  const side = l.hx >= px ? 1 : -1;
  const ax = px + 22 * side;
  const ay = s[1] * T + OY + 2;
  const bx = l.kind !== 'lamp' ? l.hx - 20 : l.hx + 24;
  const by = l.kind !== 'lamp' ? l.hy - 22 : l.hy - 4;
  return { ax, ay, bx, by };
}

export function drawLampHeads(g: G, sim: RoomSim, comic: boolean, t: number): void {
  sim.room.lamps.forEach((l, i) => {
    const on = sim.seq(i).lampOn;
    if (l.kind === 'ward') {
      // a hospital window: pale fluorescent light and a heart monitor, Chinni's comic version smiles
      const x = l.hx - 24;
      const y = l.hy - 20;
      g.fillStyle = on ? (comic ? '#e8fff4' : '#cfe8ff') : comic ? '#9ed8ff' : '#0c1124';
      g.fillRect(x, y, 48, 40);
      if (on) {
        const pts = [0, 0, 0, -2, 0, 0, -10, 12, -4, 0, 0, 0, 0];
        const step = 44 / (pts.length - 1);
        g.strokeStyle = comic ? CSS.red : '#ff5a6a';
        g.lineWidth = comic ? 3 : 2.5;
        g.lineJoin = 'round';
        g.beginPath();
        pts.forEach((dy, k) => (k ? g.lineTo(x + 2 + k * step, y + 22 + dy) : g.moveTo(x + 2, y + 22 + dy)));
        g.stroke();
        const bx = x + 2 + ((t * 0.7) % 1) * 44;
        g.fillStyle = comic ? CSS.red : '#ffb3bb';
        g.beginPath();
        g.arc(bx, y + 22, 3, 0, 7);
        g.fill();
        if (comic) {
          g.fillStyle = CSS.red;
          g.fillRect(x + 20, y + 5, 8, 3);
          g.fillRect(x + 22.5, y + 2.5, 3, 8); // tiny red cross
        }
      }
      g.strokeStyle = comic ? CSS.ink : '#05070e';
      g.lineWidth = comic ? 3 : 4;
      g.strokeRect(x, y, 48, 40);
      return;
    }
    if (l.kind === 'house') {
      const x = l.hx - 24;
      const y = l.hy - 20;
      g.fillStyle = on ? (comic ? CSS.yellow : '#ffd58a') : comic ? '#9ed8ff' : '#0c1124';
      g.fillRect(x, y, 48, 40);
      if (on) {
        // Chinni at the window
        g.fillStyle = comic ? '#5a3a8a' : '#3a2410';
        g.beginPath();
        g.arc(x + 26, y + 18, 7, 0, 7);
        g.fill();
        g.fillRect(x + 18, y + 25, 16, 15);
        if (comic) {
          g.fillStyle = CSS.magenta;
          g.fillRect(x + 6, y + 22, 12, 14); // her comic
        }
      }
      g.strokeStyle = comic ? CSS.ink : '#05070e';
      g.lineWidth = comic ? 3 : 4;
      g.strokeRect(x, y, 48, 40);
      g.beginPath();
      g.moveTo(x + 24, y);
      g.lineTo(x + 24, y + 40);
      g.stroke();
      return;
    }
    g.fillStyle = on ? '#fff3c4' : comic ? '#ddd' : '#363e55';
    g.beginPath();
    g.ellipse(l.hx + 24, l.hy + 2, 14, 7, 0, 0, 7);
    g.fill();
    if (comic) {
      g.strokeStyle = CSS.ink;
      g.lineWidth = 2.5;
      g.stroke();
      if (on) {
        g.strokeStyle = CSS.yellow;
        g.lineWidth = 3;
        for (let k = 0; k < 5; k++) {
          const a = Math.PI * (0.15 + k * 0.175);
          inkLine(g, l.hx + 24 + Math.cos(a) * 18, l.hy + 4 + Math.sin(a) * 12, l.hx + 24 + Math.cos(a) * 30, l.hy + 4 + Math.sin(a) * 22, 3, CSS.yellow, 1);
        }
      }
    }
    void t;
  });
}

function quadPt(ax: number, ay: number, mx: number, my: number, bx: number, by: number, k: number): [number, number] {
  return [(1 - k) * (1 - k) * ax + 2 * (1 - k) * k * mx + k * k * bx, (1 - k) * (1 - k) * ay + 2 * (1 - k) * k * my + k * k * by];
}

export function drawWires(g: G, sim: RoomSim, comic: boolean, t: number): void {
  const sway = Math.sin(t * 1.4) * 6 * sim.wind;
  for (const c of sim.def.circuits) {
    const live = sim.circuits.powered(c.id);
    for (const s of c.splices) {
      const spliced = sim.circuits.isSpliced(s);
      sim.room.lamps.forEach((l, i) => {
        if (l.circuit !== c.id) return;
        const { ax, ay, bx, by } = wireEnds(sim, s, i);
        if (!spliced) {
          // snapped: the lamp end hangs, the pole end dangles
          g.strokeStyle = comic ? CSS.ink : '#070a14';
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(bx, by);
          g.quadraticCurveTo((ax + bx) / 2 + 20 + sway, by + 60, ax + (bx > ax ? 30 : -30) + sway * 0.6, ay + 66);
          g.stroke();
          g.beginPath();
          g.moveTo(ax, ay);
          g.lineTo(ax + (bx > ax ? 8 : -8) + sway * 0.3, ay + 22);
          g.stroke();
          return;
        }
        const st = sim.lamps[i]!;
        const pulsing = st.pulse >= 0;
        const on = live || pulsing;
        const snapK = Math.min(1, (sim.t - (sim.spliceSnap.get(`${s[0]},${s[1]}`) ?? -9)) / 0.25);
        const mx = (ax + bx) / 2 + sway * 0.4;
        const my = Math.max(ay, by) + 8 + 18 * (1 - snapK * 0.5) + (1 - snapK) * 30;
        g.strokeStyle = on ? (comic ? CSS.cyan : '#7fe3ff') : comic ? '#555' : '#4a5168';
        g.lineWidth = on ? 3 : 2.5;
        if (on && !comic) {
          g.save();
          g.strokeStyle = 'rgba(127,227,255,.22)';
          g.lineWidth = 10;
          g.beginPath();
          g.moveTo(ax, ay);
          g.quadraticCurveTo(mx, my, bx, by);
          g.stroke();
          g.restore();
        }
        g.beginPath();
        g.moveTo(ax, ay);
        g.quadraticCurveTo(mx, my, bx, by);
        g.stroke();
        if (on) {
          g.setLineDash([6, 18]);
          g.lineDashOffset = -t * 120;
          g.strokeStyle = 'rgba(255,255,255,.8)';
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(ax, ay);
          g.quadraticCurveTo(mx, my, bx, by);
          g.stroke();
          g.setLineDash([]);
        }
        if (pulsing) {
          const [px, py] = quadPt(ax, ay, mx, my, bx, by, st.pulse);
          const gr = g.createRadialGradient(px, py, 0, px, py, 30);
          gr.addColorStop(0, '#fff');
          gr.addColorStop(0.3, 'rgba(127,227,255,.9)');
          gr.addColorStop(1, 'rgba(127,227,255,0)');
          g.fillStyle = gr;
          g.beginPath();
          g.arc(px, py, 30, 0, 7);
          g.fill();
        }
      });
    }
  }
}

export function drawSplicePoints(g: G, sim: RoomSim, comic: boolean, t: number): void {
  for (const s of sim.room.splices) {
    const x = s[0] * T + 16;
    const y = s[1] * T + OY + 4;
    if (sim.circuits.isSpliced(s)) {
      g.fillStyle = comic ? CSS.orange : '#b87333';
      g.beginPath();
      g.ellipse(x + 14, y + 2, 6, 4, 0.3, 0, 7);
      g.fill();
      if (comic) {
        g.strokeStyle = CSS.ink;
        g.lineWidth = 2;
        g.stroke();
      }
      continue;
    }
    // two frayed copper ends, sparkling
    const tw = sim.spliceTarget && sim.spliceTarget[0] === s[0] && sim.spliceTarget[1] === s[1] ? sim.spliceHold : 0;
    g.strokeStyle = comic ? CSS.orange : '#c47a3a';
    g.lineWidth = 3;
    g.lineCap = 'round';
    for (const side of [-1, 1]) {
      const ex = x + 14 + side * (8 - tw * 7);
      const ey = y + 6 + side * 2;
      g.beginPath();
      g.moveTo(x + 14 + side * 22, y + 8);
      g.lineTo(ex, ey);
      g.stroke();
      for (let k = -1; k <= 1; k++) {
        g.beginPath();
        g.moveTo(ex, ey);
        g.lineTo(ex - side * 5, ey + k * 4 + Math.sin(t * 30 + k) * 1.5);
        g.stroke();
      }
    }
    const glow = 0.5 + 0.5 * Math.sin(t * 9);
    g.fillStyle = `rgba(127,227,255,${0.35 + glow * 0.4})`;
    g.beginPath();
    g.arc(x + 14, y + 6, 5 + glow * 4, 0, 7);
    g.fill();
    if (comic) {
      g.fillStyle = CSS.yellow;
      g.save();
      g.translate(x + 14, y - 10);
      g.rotate(t * 2);
      g.beginPath();
      for (let k = 0; k < 8; k++) {
        const r = k % 2 ? 4 : 10;
        g.lineTo(Math.cos((k / 8) * Math.PI * 2) * r, Math.sin((k / 8) * Math.PI * 2) * r);
      }
      g.closePath();
      g.fill();
      g.strokeStyle = CSS.ink;
      g.lineWidth = 2;
      g.stroke();
      g.restore();
    }
  }
}

export function drawRails(g: G, sim: RoomSim, comic: boolean, t: number): void {
  for (const r of sim.room.rails) {
    const grind = sim.railGrindable(r);
    const powered = r.circuit !== null && sim.circuits.powered(r.circuit);
    const sag = 10 + Math.sin(t * 1.3 + r.idx) * 2 * sim.wind;
    const mx = (r.ax + r.bx) / 2;
    const my = (r.ay + r.by) / 2 + sag;
    const ax = r.ax + (r.bx > r.ax ? 22 : -22);
    const bx = r.bx + (r.bx > r.ax ? -22 : 22);
    const ay = r.ay + 2;
    const by = r.by + 2;
    const live = comic ? grind : powered;
    g.lineCap = 'round';
    if (live) {
      if (!comic) {
        g.strokeStyle = 'rgba(127,227,255,.22)';
        g.lineWidth = 11;
        g.beginPath();
        g.moveTo(ax, ay);
        g.quadraticCurveTo(mx, my, bx, by);
        g.stroke();
      }
      g.strokeStyle = comic ? CSS.cyan : '#7fe3ff';
      g.lineWidth = comic ? 5 : 3;
      g.beginPath();
      g.moveTo(ax, ay);
      g.quadraticCurveTo(mx, my, bx, by);
      g.stroke();
      if (comic) {
        g.strokeStyle = CSS.ink;
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(ax, ay - 3);
        g.quadraticCurveTo(mx, my - 3, bx, by - 3);
        g.stroke();
        // zigzag scribble riding the rail
        g.strokeStyle = CSS.yellow;
        g.lineWidth = 2.5;
        g.beginPath();
        const n = 26;
        for (let i = 0; i <= n; i++) {
          const k = i / n;
          const [px, py] = quadPt(ax, ay, mx, my, bx, by, k);
          g.lineTo(px, py - 8 + (i % 2 ? -6 : 0) + Math.sin(t * 20 + i) * 1.5);
        }
        g.stroke();
      } else {
        g.setLineDash([6, 18]);
        g.lineDashOffset = -t * 160;
        g.strokeStyle = 'rgba(255,255,255,.85)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(ax, ay);
        g.quadraticCurveTo(mx, my, bx, by);
        g.stroke();
        g.setLineDash([]);
      }
    } else {
      g.strokeStyle = comic ? '#3a3a3a' : '#0a0e1a';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(ax, ay);
      g.quadraticCurveTo(mx, my, bx, by);
      g.stroke();
    }
  }
}

export function drawBreakers(g: G, sim: RoomSim, comic: boolean, t: number): void {
  for (const b of sim.room.breakers) {
    const c = sim.circuits.circuitOfBreaker(b);
    if (!c) continue;
    const closed = sim.circuits.isClosed(c.id);
    const master = c.master === true;
    const w = master ? 34 : 26;
    const h = master ? 42 : 32;
    const x = b[0] * T + 16 - w / 2;
    const y = b[1] * T + OY + 2;
    const post = (Math.floor((y + h - OY) / T) + 1) * T + OY;
    g.fillStyle = comic ? '#888' : '#1c2234';
    g.fillRect(b[0] * T + 14, y + h, 4, Math.max(0, post - y - h));
    g.fillStyle = comic ? '#c9d1e0' : '#39425c';
    g.fillRect(x, y, w, h);
    g.strokeStyle = comic ? CSS.ink : '#0b0f1c';
    g.lineWidth = comic ? 3 : 2;
    g.strokeRect(x, y, w, h);
    // status lamp: red open / green closed
    const col = closed ? CSS.green : CSS.red;
    g.fillStyle = col;
    g.beginPath();
    g.arc(x + w / 2, y + 7, 4 + (closed ? 0 : Math.sin(t * 6) * 0.8), 0, 7);
    g.fill();
    // lever: up = closed, down = open (shape AND colour)
    g.strokeStyle = comic ? CSS.ink : '#0b0f1c';
    g.lineWidth = 5;
    g.lineCap = 'round';
    const pivotY = y + h * 0.62;
    g.beginPath();
    g.moveTo(x + w / 2, pivotY);
    g.lineTo(x + w / 2 + 6, pivotY + (closed ? -12 : 12));
    g.stroke();
    g.fillStyle = closed ? (comic ? CSS.green : '#7ad38f') : comic ? CSS.red : '#d36a6a';
    g.beginPath();
    g.arc(x + w / 2 + 6, pivotY + (closed ? -12 : 12), 4, 0, 7);
    g.fill();
    if (master) comicText(g, 'M', x + w / 2, y - 12, 18, 0, CSS.yellow);
  }
}

export function drawSnakes(g: G, sim: RoomSim, comic: boolean, t: number): void {
  sim.room.snakes.forEach((s, i) => {
    const x0 = s.x0 * T;
    const x1 = (s.x1 + 1) * T;
    const gy = (s.y + 1) * T + OY;
    const friendly = sim.bijli.active || sim.snakeLit(i);
    if (!comic || !friendly) {
      if (comic) return; // the comic layer only shows the cartoon twin
      if (friendly) return; // in light the real layer is covered by the comic anyway
      // snapped live wire whipping and sparking
      g.strokeStyle = '#05070d';
      g.lineWidth = 4;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x0 - 6, gy - 2);
      const n = 10;
      let hx = 0;
      let hy = 0;
      for (let k = 1; k <= n; k++) {
        const u = k / n;
        hx = x0 + (x1 - x0) * u;
        hy = gy - 4 - Math.sin(u * Math.PI) * 20 - Math.sin(t * 14 + u * 9) * 10 * u;
        g.lineTo(hx, hy);
      }
      g.stroke();
      const f = 0.6 + 0.4 * Math.sin(t * 40);
      g.fillStyle = `rgba(127,227,255,${f})`;
      g.beginPath();
      g.arc(hx, hy, 5 + f * 3, 0, 7);
      g.fill();
      if (R() < 0.5) sim.sparks.push({ x: hx, y: hy, vx: (R() - 0.5) * 300, vy: -R() * 220, t: 0.3 });
      return;
    }
    // goofy cartoon snake (on twos)
    const tw = Math.floor(t * 12) / 12;
    const sq = sim.snakeSquash[i] ?? 0;
    const squash = 1 - Math.sin((sq / 0.35) * Math.PI) * 0.45;
    const cx = (x0 + x1) / 2;
    g.save();
    g.translate(cx, gy);
    g.scale(1 + (1 - squash) * 0.6, squash);
    const w = (x1 - x0) / 2 + 10;
    g.fillStyle = CSS.green;
    g.strokeStyle = CSS.ink;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(-w, 0);
    for (let k = 0; k <= 12; k++) {
      const u = k / 12;
      g.lineTo(-w + 2 * w * u, -10 - Math.sin(u * Math.PI * 2 + tw * 6) * 5);
    }
    g.lineTo(w, 0);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = CSS.yellow;
    g.fillRect(-w + 8, -8, 2 * w - 16, 6);
    // head
    g.fillStyle = CSS.green;
    g.beginPath();
    g.ellipse(w - 4, -26 + Math.sin(tw * 5) * 3, 16, 14, 0, 0, 7);
    g.fill();
    g.stroke();
    for (const ex of [-6, 6]) {
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(w - 4 + ex, -34 + Math.sin(tw * 5) * 3, 6, 0, 7);
      g.fill();
      g.stroke();
      g.fillStyle = CSS.ink;
      g.beginPath();
      g.arc(w - 3 + ex, -33 + Math.sin(tw * 5) * 3, 2.5, 0, 7);
      g.fill();
    }
    g.lineWidth = 2.5;
    g.beginPath();
    g.arc(w - 4, -24 + Math.sin(tw * 5) * 3, 7, 0.2, Math.PI - 0.2);
    g.stroke();
    g.strokeStyle = CSS.red;
    g.beginPath();
    g.moveTo(w + 10, -22);
    g.lineTo(w + 20, -20 + Math.sin(tw * 9) * 3);
    g.stroke();
    g.restore();
  });
}

export function drawWater(g: G, sim: RoomSim, comic: boolean, t: number): void {
  const cells = sim.room.waterCells;
  if (!cells.length) return;
  const live = sim.waterLive() && !sim.bijli.active;
  const xs = cells.map((c) => c[0]);
  const ys = cells.map((c) => c[1]);
  const x0 = Math.min(...xs) * T;
  const x1 = (Math.max(...xs) + 1) * T;
  const y0 = Math.min(...ys) * T + OY + 6;
  const y1 = (Math.max(...ys) + 1) * T + OY;
  g.fillStyle = comic ? (live ? 'rgba(47,107,255,.85)' : 'rgba(47,107,255,.7)') : live ? 'rgba(14,32,52,.9)' : 'rgba(10,16,30,.88)';
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.strokeStyle = comic ? '#fff' : 'rgba(143,163,199,.35)';
  g.lineWidth = comic ? 3 : 1.5;
  g.beginPath();
  for (let x = x0; x <= x1; x += 8) g.lineTo(x, y0 + Math.sin(x * 0.05 + t * 2) * 2);
  g.stroke();
  if (comic) {
    g.strokeStyle = CSS.ink;
    g.lineWidth = 3;
    g.strokeRect(x0, y0, x1 - x0, y1 - y0);
  }
  if (live) {
    // crawling cyan sparks
    g.strokeStyle = comic ? CSS.yellow : 'rgba(127,227,255,.9)';
    g.lineWidth = 2;
    for (let k = 0; k < 7; k++) {
      const sx = x0 + ((k * 137 + t * 90 * (k % 2 ? 1 : -1)) % (x1 - x0) + (x1 - x0)) % (x1 - x0);
      const sy = y0 + 4 + ((k * 23) % Math.max(8, y1 - y0 - 10));
      g.beginPath();
      g.moveTo(sx, sy);
      for (let j = 1; j < 5; j++) g.lineTo(sx + j * 7, sy + (j % 2 ? -5 : 5) * Math.sin(t * 30 + k));
      g.stroke();
    }
  }
}

export function drawStrikes(g: G, sim: RoomSim, comic: boolean, t: number): void {
  sim.def.strikes.forEach((s, i) => {
    const ph = strikePhase(sim.strikeT, strikeOffset(i));
    const x0 = s.x * T;
    const w = s.w * T;
    const cx = x0 + w / 2;
    let gy = 19 * T + OY;
    for (let y = 0; y < 22; y++)
      if (sim.room.solid(s.x, y) || sim.room.solid(s.x + s.w - 1, y)) {
        gy = y * T + OY;
        break;
      }
    if (ph.state === 'telegraph') {
      const a = 0.12 + 0.25 * ph.k;
      const gr = g.createLinearGradient(x0, 0, x0 + w, 0);
      const col = comic ? '255,212,0' : '200,215,255';
      gr.addColorStop(0, `rgba(${col},0)`);
      gr.addColorStop(0.5, `rgba(${col},${a})`);
      gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr;
      g.fillRect(x0 - 10, OY, w + 20, gy - OY);
      const pr = 10 + ((t * 40) % 24) + ph.k * 10;
      g.strokeStyle = comic ? CSS.red : `rgba(200,215,255,${0.4 + ph.k * 0.5})`;
      g.lineWidth = comic ? 3 : 2;
      g.beginPath();
      g.ellipse(cx, gy - 2, pr + w * 0.3, (pr + w * 0.3) * 0.25, 0, 0, 7);
      g.stroke();
    } else if (ph.state === 'strike') {
      const pts: [number, number][] = [[cx + (R() - 0.5) * 10, OY]];
      while (pts[pts.length - 1]![1] < gy) {
        const [x, y] = pts[pts.length - 1]!;
        pts.push([cx + (R() - 0.5) * w * 0.9, Math.min(gy, y + 30 + R() * 30)]);
        void x;
      }
      g.fillStyle = comic ? 'rgba(255,212,0,.35)' : 'rgba(220,230,255,.3)';
      g.fillRect(x0 - 12, OY, w + 24, gy - OY);
      g.lineJoin = 'miter';
      for (const [lw, col] of comic
        ? ([
            [14, CSS.ink],
            [8, CSS.yellow],
          ] as const)
        : ([
            [10, 'rgba(160,190,255,.5)'],
            [4, '#fff'],
          ] as const)) {
        g.strokeStyle = col;
        g.lineWidth = lw;
        g.beginPath();
        pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.stroke();
      }
    }
  });
}

export function drawDrawings(g: G, sim: RoomSim, comic: boolean, t: number, img: CanvasImageSource | null): void {
  for (const d of sim.drawings) {
    if (d.taken) continue;
    const x = d.at[0] * T + 16;
    const y = d.at[1] * T + OY + 16 + Math.sin(t * 3 + d.at[0]) * 5;
    const gr = g.createRadialGradient(x, y, 0, x, y, 46);
    gr.addColorStop(0, comic ? 'rgba(255,62,154,.45)' : 'rgba(255,214,120,.55)');
    gr.addColorStop(1, 'rgba(255,214,120,0)');
    g.fillStyle = gr;
    g.fillRect(x - 46, y - 46, 92, 92);
    g.save();
    g.translate(x, y);
    g.rotate(Math.sin(t * 2) * 0.12);
    if (img) g.drawImage(img, -20, -20, 40, 40);
    else {
      g.fillStyle = '#fff';
      g.fillRect(-16, -20, 32, 40);
      g.strokeStyle = CSS.ink;
      g.lineWidth = 2;
      g.strokeRect(-16, -20, 32, 40);
      g.fillStyle = CSS.magenta;
      g.beginPath();
      g.moveTo(-4, -8);
      g.lineTo(-12, 12);
      g.lineTo(4, 12);
      g.fill();
      g.fillStyle = CSS.yellow;
      g.beginPath();
      g.arc(0, -10, 5, 0, 7);
      g.fill();
    }
    g.restore();
  }
}

export function drawClouds(g: G, sim: RoomSim, t: number): void {
  const room = sim.room;
  for (let y = 0; y < 22; y++) {
    let x = 0;
    while (x < 40) {
      if (!room.cloud(x, y)) {
        x++;
        continue;
      }
      let x2 = x;
      while (room.cloud(x2 + 1, y)) x2++;
      const cx = ((x + x2 + 1) / 2) * T;
      const cy = y * T + OY + 10 + Math.sin(t * 2 + x) * 2;
      const w = (x2 - x + 1) * T;
      const parts = [
        [-w * 0.32, 4, 16],
        [-w * 0.1, -4, 20],
        [w * 0.14, -2, 18],
        [w * 0.34, 4, 14],
      ] as const;
      g.fillStyle = '#fff';
      for (const [dx, dy, r] of parts) {
        g.beginPath();
        g.arc(cx + dx, cy + dy, r, 0, 7);
        g.fill();
      }
      g.fillRect(cx - w / 2 + 6, cy, w - 12, 14);
      g.strokeStyle = CSS.blue;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(cx - w / 2 + 2, cy + 14);
      g.lineTo(cx + w / 2 - 2, cy + 14);
      g.stroke();
      for (const [dx, dy, r] of parts) {
        g.beginPath();
        g.arc(cx + dx, cy + dy, r, Math.PI * 1.02, Math.PI * 1.98);
        g.stroke();
      }
      x = x2 + 1;
    }
  }
}

export function drawDog(g: G, sim: RoomSim, comic: boolean, t: number, awake: boolean): void {
  const d = sim.def.dog;
  if (!d) return;
  const x = d[0] * T + 16;
  const y = (d[1] + 1) * T + OY;
  if (!comic) {
    const br = Math.sin(t * 2) * 1.2;
    g.fillStyle = '#0d1120';
    g.beginPath();
    g.ellipse(x, y - 9 - br * 0.3, 22, 10 + br * 0.4, 0, Math.PI, 0);
    g.fill();
    g.fillRect(x - 22, y - 9, 44, 9);
    g.beginPath();
    g.ellipse(x + 18, y - 10, 9, 8, 0, 0, 7);
    g.fill();
    g.beginPath();
    g.moveTo(x + 18, y - 17);
    g.lineTo(x + 24, y - 24 + (sim.flash > 0 ? -4 : 0));
    g.lineTo(x + 25, y - 14);
    g.fill();
    g.fillStyle = 'rgba(160,180,215,.25)';
    g.fillRect(x - 14, y - 18 - br * 0.3, 20, 2);
    return;
  }
  const wag = Math.sin(t * (awake ? 22 : 3)) * (awake ? 0.7 : 0.1);
  const hop = awake ? Math.abs(Math.sin(t * 7)) * 3 : 0;
  g.save();
  g.translate(x, y - hop);
  g.lineWidth = 2.5;
  g.strokeStyle = CSS.ink;
  g.fillStyle = '#e8a64b';
  g.save();
  g.translate(-20, -18);
  g.rotate(-0.6 + wag);
  g.beginPath();
  g.ellipse(0, -8, 4, 10, 0, 0, 7);
  g.fill();
  g.stroke();
  g.restore();
  g.beginPath();
  g.ellipse(0, -16, 22, 11, 0, 0, 7);
  g.fill();
  g.stroke();
  for (const lx of [-14, -4, 8, 16]) {
    g.beginPath();
    g.rect(lx - 3, -8, 6, 8);
    g.fill();
    g.stroke();
  }
  g.fillStyle = '#7a4b1c';
  g.beginPath();
  g.ellipse(-4, -19, 7, 5, 0, 0, 7);
  g.fill();
  g.fillStyle = '#e8a64b';
  g.beginPath();
  g.ellipse(22, -26, 11, 10, 0, 0, 7);
  g.fill();
  g.stroke();
  g.fillStyle = '#7a4b1c';
  g.beginPath();
  g.ellipse(17, -32, 4, 8, -0.5, 0, 7);
  g.fill();
  g.stroke();
  g.fillStyle = CSS.ink;
  g.beginPath();
  g.arc(25, -28, 2.2, 0, 7);
  g.arc(32, -24, 2.5, 0, 7);
  g.fill();
  g.lineWidth = 2;
  g.beginPath();
  g.arc(27, -22, 4, 0.2, 2.4);
  g.stroke();
  if (awake) {
    g.fillStyle = CSS.red;
    g.beginPath();
    g.arc(30, -18, 3, 0, Math.PI);
    g.fill();
    comicText(g, '♥', 6, -54 - Math.sin(t * 3) * 4, 20, 0, CSS.magenta);
  }
  g.restore();
}
