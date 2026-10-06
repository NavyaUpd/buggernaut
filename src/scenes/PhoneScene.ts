import Phaser from 'phaser';
import { audio } from '../audio';
import { FONTS, VIEW } from '../config';
import { goNext } from '../game/RoomFlow';
import { input } from '../input';
import { PHONE } from '../story/script';
import { SCENES, type PhoneData } from './keys';

const TYPING = 0.6; // s of "..." before the message lands
const PROMPT_AT = 1.0; // s
const CONTINUE_AT = 0.8; // s
const PW = 360; // phone size
const PH = 600;

interface Drop {
  x: number;
  y: number;
  len: number;
  spd: number;
  near: boolean;
}

/** Between chapters: one message from Chinni on the phone screen (§7.5). */
export class PhoneScene extends Phaser.Scene {
  private index = 0;
  private t = 0;
  private done = false;
  /** Real-time start (ms), so the continue guard works at any frame rate. */
  private startedAt = 0;
  private rainG!: Phaser.GameObjects.Graphics;
  private drops: Drop[] = [];

  constructor() {
    super(SCENES.Phone);
  }

  init(data: PhoneData): void {
    this.index = Phaser.Math.Clamp(Math.round(data?.index ?? 0), 0, PHONE.messages.length - 1);
    this.t = 0;
    this.done = false;
    this.startedAt = performance.now();
  }

  create(): void {
    const W = VIEW.width;
    const H = VIEW.height;
    const cx = W / 2;
    const cy = H / 2;
    this.cameras.main.setBackgroundColor('#05070f');

    // dark rainy night behind the phone
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x070b18, 0x070b18, 0x1a2244, 0x1a2244, 1);
    bg.fillRect(0, 0, W, H);
    const rng = new Phaser.Math.RandomDataGenerator(['phone']);
    let x = -40;
    while (x < W + 40) {
      const bw = rng.between(80, 170);
      const bh = rng.between(140, 330);
      bg.fillStyle(0x0d1328, 1);
      bg.fillRect(x, H - bh, bw, bh);
      for (let wy = H - bh + 18; wy < H - 30; wy += 30)
        for (let wx = x + 12; wx < x + bw - 14; wx += 24) {
          if (rng.frac() < 0.94) continue;
          bg.fillStyle(0xffb347, rng.realInRange(0.25, 0.5)); // a candle in a window
          bg.fillRect(wx, wy, 9, 13);
        }
      x += bw + rng.between(4, 18);
    }
    this.rainG = this.add.graphics();
    this.drops = [];
    for (let i = 0; i < 170; i++) this.drops.push(this.newDrop(rng.frac() * W, rng.frac() * H, i % 3 === 0));

    // the phone's glow on the rain
    const glow = this.add.graphics();
    for (let i = 6; i > 0; i--) {
      glow.fillStyle(0x9ec0ff, 0.025);
      glow.fillEllipse(cx, cy, PW + i * 70, PH + i * 40);
    }

    const phone = this.add.container(cx, cy + 30).setAlpha(0);
    const g = this.add.graphics();
    phone.add(g);
    // body + screen
    g.fillStyle(0x000000, 0.5);
    g.fillRoundedRect(-PW / 2 + 10, -PH / 2 + 14, PW, PH, 46);
    g.fillStyle(0x0c0e13, 1);
    g.fillRoundedRect(-PW / 2, -PH / 2, PW, PH, 46);
    g.lineStyle(4, 0x2b3142, 1);
    g.strokeRoundedRect(-PW / 2, -PH / 2, PW, PH, 46);
    const sx = -PW / 2 + 14;
    const sy = -PH / 2 + 14;
    const sw = PW - 28;
    const sh = PH - 28;
    g.fillStyle(0x0f1420, 1);
    g.fillRoundedRect(sx, sy, sw, sh, 34);
    // wallpaper doodle dots
    g.fillStyle(0x1a2236, 1);
    for (let yy = sy + 110; yy < sy + sh - 70; yy += 26)
      for (let xx = sx + 18 + ((yy / 26) % 2 ? 13 : 0); xx < sx + sw - 10; xx += 26) g.fillCircle(xx, yy, 2);
    // notch
    g.fillStyle(0x000000, 1);
    g.fillRoundedRect(-46, sy + 8, 92, 22, 11);
    // status bar: weak signal, no wifi, low battery (blackout night)
    const st = sy + 19;
    for (let i = 0; i < 4; i++) {
      g.fillStyle(i === 0 ? 0xe9eefc : 0x3a4256, 1);
      g.fillRect(sx + 26 + i * 7, st + 4 - i * 3, 5, 6 + i * 3);
    }
    g.lineStyle(2, 0xe9eefc, 1);
    g.strokeRoundedRect(sx + sw - 58, st - 3, 32, 15, 4);
    g.fillStyle(0xe9eefc, 1);
    g.fillRect(sx + sw - 25, st + 1, 3, 7);
    g.fillStyle(0xff4d4d, 1);
    g.fillRect(sx + sw - 55, st, 6, 9);
    // header: back chevron, avatar, name
    const hy = sy + 72;
    g.fillStyle(0x161c2b, 1);
    g.fillRect(sx, sy + 42, sw, 62);
    g.lineStyle(1, 0x262e42, 1);
    g.lineBetween(sx, sy + 104, sx + sw, sy + 104);
    g.lineStyle(3, 0x7fb2ff, 1);
    g.lineBetween(sx + 27, hy - 10, sx + 18, hy);
    g.lineBetween(sx + 18, hy, sx + 27, hy + 10);
    this.avatar(g, sx + 62, hy);
    const name = this.add
      .text(sx + 92, hy, PHONE.sender, { fontFamily: FONTS.ui, fontSize: '22px', fontStyle: 'bold', color: '#e9eefc' })
      .setOrigin(0, 0.5);
    phone.add(name);
    // input pill
    g.fillStyle(0x1a2132, 1);
    g.fillRoundedRect(sx + 14, sy + sh - 58, sw - 78, 42, 21);
    g.fillStyle(0x2f6bff, 1);
    g.fillCircle(sx + sw - 34, sy + sh - 37, 20);
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(sx + sw - 42, sy + sh - 46, sx + sw - 42, sy + sh - 28, sx + sw - 24, sy + sh - 37);
    // rain drops on the glass
    for (let i = 0; i < 9; i++) {
      const dx = sx + 20 + rng.frac() * (sw - 40);
      const dy = sy + 120 + rng.frac() * (sh - 200);
      const r = rng.realInRange(3, 7);
      g.fillStyle(0xbfd4ff, 0.08);
      g.fillCircle(dx, dy, r);
      g.fillStyle(0xffffff, 0.22);
      g.fillCircle(dx - r * 0.35, dy - r * 0.35, r * 0.3);
    }

    this.tweens.add({ targets: phone, alpha: 1, y: cy, duration: 380, ease: 'Cubic.easeOut' });

    // typing indicator, then the message
    const bubbleBottom = sy + sh - 84;
    const left = sx + 16;
    const typing = this.add.container(left, bubbleBottom);
    const tg = this.add.graphics();
    tg.fillStyle(0x262e42, 1);
    tg.fillRoundedRect(0, -46, 86, 46, 20);
    tg.fillTriangle(0, -10, 0, 0, 14, -6);
    typing.add(tg);
    for (let i = 0; i < 3; i++) {
      const dot = this.add.circle(24 + i * 19, -23, 5.5, 0xaab4cc);
      typing.add(dot);
      this.tweens.add({ targets: dot, y: -30, duration: 220, yoyo: true, repeat: -1, delay: i * 120, ease: 'Sine.easeInOut' });
    }
    typing.setScale(0.6).setAlpha(0);
    phone.add(typing);
    this.tweens.add({ targets: typing, scale: 1, alpha: 1, duration: 160, delay: 120, ease: 'Back.easeOut' });

    this.time.delayedCall(TYPING * 1000 + 120, () => {
      typing.destroy();
      const msg = PHONE.messages[this.index] ?? '';
      const txt = this.add.text(18, 0, msg, {
        fontFamily: FONTS.ui,
        fontSize: '21px',
        color: '#f2f5ff',
        wordWrap: { width: 236 },
        lineSpacing: 4,
      });
      const bw = Math.max(80, txt.width + 36);
      const bh = txt.height + 28;
      txt.setPosition(18, -bh + 14);
      const bubble = this.add.container(left, bubbleBottom);
      const bgB = this.add.graphics();
      bgB.fillStyle(0x262e42, 1);
      bgB.fillRoundedRect(0, -bh, bw, bh, 20);
      bgB.fillTriangle(0, -12, 0, 0, 16, -7);
      bubble.add([bgB, txt]);
      bubble.setScale(0.7).setAlpha(0);
      phone.add(bubble);
      this.tweens.add({ targets: bubble, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
      audio.sfx.ui();
    });

    const prompt = this.add
      .text(cx, H - 22, PHONE.continue, { fontFamily: FONTS.ui, fontSize: '16px', color: '#8fa3c7', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setAlpha(0);
    this.time.delayedCall(PROMPT_AT * 1000, () => {
      this.tweens.add({ targets: prompt, alpha: 0.85, duration: 400 });
      this.tweens.add({ targets: prompt, alpha: 0.35, duration: 900, delay: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  /** Chinni's little avatar: yellow circle, plaits, a smile. */
  private avatar(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0xffd400, 1);
    g.fillCircle(x, y, 22);
    g.fillStyle(0x23160f, 1);
    g.fillCircle(x - 13, y + 8, 6);
    g.fillCircle(x + 13, y + 8, 6);
    g.fillStyle(0xc98a5c, 1);
    g.fillCircle(x, y + 3, 12);
    g.fillStyle(0x23160f, 1);
    g.slice(x, y + 1, 13, Math.PI, 0, false);
    g.fillPath();
    g.fillCircle(x - 4, y + 3, 1.6);
    g.fillCircle(x + 4, y + 3, 1.6);
    g.lineStyle(1.5, 0x23160f, 1);
    g.beginPath();
    g.arc(x, y + 6, 4, 0.3, Math.PI - 0.3);
    g.strokePath();
    g.fillStyle(0x2ecc71, 1);
    g.fillCircle(x + 16, y + 16, 5);
    g.lineStyle(2, 0x161c2b, 1);
    g.strokeCircle(x + 16, y + 16, 5);
  }

  private newDrop(x: number, y: number, near: boolean): Drop {
    return { x, y, near, len: near ? 26 : 14, spd: near ? 900 : 560 };
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    this.t += dt;
    // rain
    const g = this.rainG;
    g.clear();
    const tan = Math.tan((12 * Math.PI) / 180);
    for (const d of this.drops) {
      d.y += d.spd * dt;
      d.x -= d.spd * dt * tan;
      if (d.y > VIEW.height + 30) {
        d.y = -30;
        d.x = Math.random() * (VIEW.width + 200);
      }
      g.lineStyle(d.near ? 2 : 1, 0x8fa3c7, d.near ? 0.35 : 0.2);
      g.lineBetween(d.x, d.y, d.x + d.len * tan, d.y - d.len);
    }
    // guard in real seconds: frame time (capped per frame) would stretch it on slow machines and swallow key presses
    if (!this.done && (performance.now() - this.startedAt) / 1000 > CONTINUE_AT && input.anyPressed()) {
      this.done = true;
      audio.start();
      audio.sfx.ui();
      goNext(this, { kind: 'phone', index: this.index });
    }
  }
}
