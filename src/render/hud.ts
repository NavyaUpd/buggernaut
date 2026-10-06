// HUD + new optional-power-up visuals: helmets (lives), objective line, first-time hint cards, exit arrow,
// the storm-dragon drawing pickup and the sleeping storm dragon that calms the sky.
import { CALM, CSS, FONTS } from '../config';
import type { RoomSim } from '../game/RoomSim';
import { comicText, OY, T, W, type G } from './draw';

function helmet(g: G, x: number, y: number, full: boolean): void {
  g.save();
  g.translate(x, y);
  g.globalAlpha = full ? 1 : 0.35;
  g.fillStyle = full ? '#ffc531' : '#556';
  g.strokeStyle = CSS.ink;
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(0, 0, 12, Math.PI, 0);
  g.lineTo(16, 1);
  g.lineTo(-14, 1);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = full ? '#fff6c2' : '#889';
  g.beginPath();
  g.arc(8, -5, 3, 0, 7);
  g.fill();
  g.restore();
}

export function drawHud(g: G, sim: RoomSim, lives: number, maxLives: number, objective: string, t: number): void {
  // helmets, top right
  for (let i = 0; i < maxLives; i++) helmet(g, W - 34 - i * 38, OY + 30, i < lives);
  if (sim.calmLeft > 0) {
    const k = sim.calmLeft / CALM.duration;
    const blink = sim.calmLeft <= CALM.warn && Math.floor(t * 8) % 2 === 1;
    g.save();
    g.fillStyle = 'rgba(10,12,30,.6)';
    g.fillRect(W - 230, OY + 50, 200, 26);
    g.fillStyle = blink ? CSS.red : '#b69cff';
    g.fillRect(W - 226, OY + 54, 192 * k, 18);
    g.strokeStyle = CSS.ink;
    g.lineWidth = 2;
    g.strokeRect(W - 226, OY + 54, 192, 18);
    g.font = `700 13px ${FONTS.ui}`;
    g.fillStyle = '#fff';
    g.textBaseline = 'middle';
    g.fillText('storm asleep', W - 220, OY + 63);
    g.restore();
  }
  let barY = sim.calmLeft > 0 ? OY + 84 : OY + 50;
  if (sim.def.timer && sim.timeLeft > 0 && !sim.circuits.allPowered()) {
    const k = sim.timeLeft / sim.def.timer;
    const low = sim.timeLeft <= 10;
    const blink = low && Math.floor(t * 4) % 2 === 1;
    const secs = Math.ceil(sim.timeLeft);
    g.save();
    g.fillStyle = 'rgba(10,12,30,.6)';
    g.fillRect(W - 230, barY, 200, 26);
    g.fillStyle = blink ? '#fff' : low ? CSS.red : CSS.green;
    g.fillRect(W - 226, barY + 4, 192 * k, 18);
    g.strokeStyle = CSS.ink;
    g.lineWidth = 2;
    g.strokeRect(W - 226, barY + 4, 192, 18);
    g.font = `700 13px ${FONTS.ui}`;
    g.fillStyle = low ? '#fff' : CSS.ink;
    g.textBaseline = 'middle';
    g.fillText(`hospital backup ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, W - 220, barY + 13);
    g.restore();
    barY += 34;
  }
  if (!objective) return;
  g.save();
  g.font = `700 15px ${FONTS.ui}`;
  const w = g.measureText(objective).width + 20;
  const y = barY + 10;
  g.fillStyle = 'rgba(5,8,20,.62)';
  g.beginPath();
  g.roundRect(W - 16 - w, y - 13, w, 26, 8);
  g.fill();
  g.fillStyle = '#e9eefc';
  g.textBaseline = 'middle';
  g.fillText(objective, W - 6 - w, y + 1);
  g.restore();
}

/** First-time hint card: a crayon note pinned top-centre with a yellow title tab. */
export function drawHintCard(g: G, card: { title: string; text: string; t: number; life: number }): void {
  const a = Math.min(1, card.t * 4, (card.life - card.t) * 3);
  if (a <= 0) return;
  g.save();
  g.globalAlpha = a;
  const slide = (1 - Math.min(1, card.t * 4)) * -20;
  g.translate(W / 2, OY + 70 + slide);
  g.rotate(-0.01);
  g.font = `700 19px ${FONTS.hand}`;
  // wrap into at most 2 lines of ~560 px
  const words = card.text.split(' ');
  const lines: string[] = [''];
  for (const wd of words) {
    const tryLine = (lines[lines.length - 1] + ' ' + wd).trim();
    if (g.measureText(tryLine).width > 560 && lines[lines.length - 1]) lines.push(wd);
    else lines[lines.length - 1] = tryLine;
  }
  const w = Math.max(...lines.map((l) => g.measureText(l).width)) + 44;
  const h = 26 + lines.length * 26;
  g.fillStyle = '#fffdf2';
  g.fillRect(-w / 2, 0, w, h);
  g.strokeStyle = '#cfe0fb';
  g.lineWidth = 1.2;
  for (let y = 28; y < h; y += 26) {
    g.beginPath();
    g.moveTo(-w / 2, y);
    g.lineTo(w / 2, y);
    g.stroke();
  }
  g.strokeStyle = CSS.ink;
  g.lineWidth = 3;
  g.strokeRect(-w / 2, 0, w, h);
  g.fillStyle = CSS.blue;
  g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, -w / 2 + 22, 22 + i * 26 + 4));
  // title tab
  g.font = `900 16px ${FONTS.comic}`;
  const tw = g.measureText(card.title).width + 22;
  g.fillStyle = CSS.yellow;
  g.fillRect(-w / 2 + 14, -16, tw, 26);
  g.strokeRect(-w / 2 + 14, -16, tw, 26);
  g.fillStyle = CSS.ink;
  g.fillText(card.title, -w / 2 + 25, -3);
  g.restore();
}

/** Bouncing arrow over the exit once it is open, so the goal is never a guess. */
export function drawExitArrow(g: G, sim: RoomSim, t: number): void {
  if (!sim.exitOpen() || sim.done || !sim.room.exits.length) return;
  const top = sim.room.exits.reduce((a, e) => (e[1] < a[1] ? e : a));
  const x = Math.min(W - 22, top[0] * T + 16);
  const y = top[1] * T + OY - 26 + Math.sin(t * 5) * 6;
  g.save();
  g.translate(x, y);
  g.fillStyle = CSS.yellow;
  g.strokeStyle = CSS.ink;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(-9, -22);
  g.lineTo(9, -22);
  g.lineTo(9, -6);
  g.lineTo(17, -6);
  g.lineTo(0, 10);
  g.lineTo(-17, -6);
  g.lineTo(-9, -6);
  g.closePath();
  g.fill();
  g.stroke();
  g.restore();
}

/** The storm-dragon drawing pickup: a purple crayon page with a sleepy dragon doodle. */
export function drawDragonPickups(g: G, sim: RoomSim, t: number): void {
  for (const d of sim.dragons) {
    if (d.taken) continue;
    const x = d.at[0] * T + 16;
    const y = d.at[1] * T + OY + 16 + Math.sin(t * 3 + 1) * 5;
    const gr = g.createRadialGradient(x, y, 0, x, y, 46);
    gr.addColorStop(0, 'rgba(182,156,255,.55)');
    gr.addColorStop(1, 'rgba(182,156,255,0)');
    g.fillStyle = gr;
    g.fillRect(x - 46, y - 46, 92, 92);
    g.save();
    g.translate(x, y);
    g.rotate(Math.sin(t * 2 + 1) * 0.12);
    g.fillStyle = '#fff';
    g.fillRect(-17, -20, 34, 40);
    g.strokeStyle = CSS.ink;
    g.lineWidth = 2;
    g.strokeRect(-17, -20, 34, 40);
    g.fillStyle = '#b69cff';
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.arc(-10 + i * 6, 4 + Math.sin(i) * 3, 4, 0, 7);
      g.fill();
    }
    g.beginPath();
    g.arc(10, -2, 6, 0, 7);
    g.fill();
    g.fillStyle = CSS.ink;
    g.font = `700 10px ${FONTS.hand}`;
    g.fillText('z', 8, -11);
    g.fillText('z', 13, -15);
    g.restore();
  }
}

/** While the storm sleeps: Chinni's storm dragon curled asleep across the sky, snoring zzz. */
export function drawSleepingDragon(g: G, sim: RoomSim, t: number): void {
  if (sim.calmLeft <= 0) return;
  const a = Math.min(1, (CALM.duration - sim.calmLeft) * 2, sim.calmLeft * 1.5);
  const tw = Math.floor(t * 12) / 12;
  g.save();
  g.globalAlpha = a * 0.92;
  const breathe = Math.sin(tw * 2) * 4;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 26; i++) {
    const u = i / 26;
    pts.push([230 + u * 820, 120 + Math.sin(u * Math.PI * 2.2) * 34 + breathe * u]);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const [x, y] = pts[i]!;
    const r = 26 - Math.abs(i / pts.length - 0.45) * 26;
    g.fillStyle = i % 2 ? '#b69cff' : '#9f86f0';
    g.strokeStyle = CSS.ink;
    g.lineWidth = 2.5;
    g.beginPath();
    g.arc(x, y, Math.max(8, r), 0, 7);
    g.fill();
    g.stroke();
    if (i % 3 === 0) {
      g.fillStyle = CSS.yellow;
      g.beginPath();
      g.moveTo(x - 6, y - r + 2);
      g.lineTo(x, y - r - 12);
      g.lineTo(x + 6, y - r + 2);
      g.fill();
      g.stroke();
    }
  }
  // head, eyes closed, little smile
  const [hx, hy] = pts[pts.length - 1]!;
  g.fillStyle = '#b69cff';
  g.beginPath();
  g.ellipse(hx + 30, hy - 6, 34, 24, -0.1, 0, 7);
  g.fill();
  g.stroke();
  g.lineWidth = 3;
  g.beginPath();
  g.arc(hx + 34, hy - 12, 7, 0.2, Math.PI - 0.2);
  g.stroke();
  g.beginPath();
  g.arc(hx + 46, hy + 4, 6, 0.3, Math.PI - 0.3);
  g.stroke();
  for (let k = 0; k < 3; k++) {
    const p = (t * 0.6 + k / 3) % 1;
    comicText(g, 'z', hx + 70 + p * 40 + k * 6, hy - 30 - p * 60, 16 + p * 14, 0.2, '#fff', 1);
  }
  g.restore();
}
