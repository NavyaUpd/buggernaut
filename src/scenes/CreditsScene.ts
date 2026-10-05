import Phaser from 'phaser';
import { audio } from '../audio';
import { FONTS, VIEW } from '../config';
import { input } from '../input';
import { crayonKey, ensureCrayonText, ensureCrayonTextures } from '../render/crayonArt';
import { CREDITS } from '../story/script';
import { SCENES } from './keys';

const CONTINUE_AT = 1.2; // s

interface Panel {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: number;
}

/** Credits as a comic page: three hand-ruled panels (white gutter + ink border + drop shadow) on the night (§10.6). */
export class CreditsScene extends Phaser.Scene {
  private t = 0;
  private done = false;

  constructor() {
    super(SCENES.Credits);
  }

  create(): void {
    ensureCrayonTextures(this);
    this.t = 0;
    this.done = false;
    this.cameras.main.setBackgroundColor('#141a2e');

    // faint halftone on the night behind the page
    this.add.image(0, 0, this.dots('credits_dots_night', VIEW.width, VIEW.height, 18, '#1b2340', () => 1.6)).setOrigin(0);

    const A: Panel = { x: 44, y: 34, w: 780, h: 440, fill: 0xffffff };
    const B: Panel = { x: 852, y: 34, w: 384, h: 440, fill: 0x9ed8ff };
    const C: Panel = { x: 44, y: 500, w: 1192, h: 168, fill: 0xffffff };

    // A: the team, in crayon
    const pa = this.panel(A, 0);
    const team = this.add.image(A.x + A.w / 2, A.y + A.h / 2 + 6, crayonKey('team'));
    team.setScale(Math.min((A.w - 40) / team.width, (A.h - 40) / team.height));
    pa.add(team);

    // B: logo, team name, jam + engine
    const pb = this.panel(B, 1);
    const dots = this.add.image(B.x, B.y, this.dots('credits_dots_sky', B.w, B.h, 14, '#7cc6f5', (y) => 1.2 + 2 * (y / B.h)));
    pb.add(dots.setOrigin(0));
    const logo = this.add.image(B.x + B.w / 2, B.y + 110, crayonKey('logo'));
    logo.setScale(Math.min((B.w - 36) / logo.width, 150 / logo.height)).setRotation(-0.03);
    pb.add(logo);
    const teamKey = ensureCrayonText(this, 'crayon_txt_credits_team', CREDITS.team.toLowerCase(), 46, '#24317e');
    const tn = this.add.image(B.x + B.w / 2, B.y + 236, teamKey);
    tn.setScale(Math.min(1, (B.w - 40) / tn.width)).setRotation(-0.02);
    pb.add(tn);
    const small = (y: number, s: string): Phaser.GameObjects.Text =>
      this.add
        .text(B.x + B.w / 2, y, s, {
          fontFamily: FONTS.ui,
          fontSize: '18px',
          fontStyle: 'bold',
          color: '#000000',
          align: 'center',
          wordWrap: { width: B.w - 60 },
        })
        .setOrigin(0.5);
    pb.add(this.captionBox(B.x + 24, B.y + 300, B.w - 48, 72));
    pb.add(small(B.y + 336, CREDITS.jam));
    pb.add(small(B.y + 404, CREDITS.engine));

    // C: the three names as caption boxes
    const pc = this.panel(C, 2);
    const cw = (C.w - 40 * 4) / 3;
    CREDITS.names.forEach((entry, i) => {
      const [who = entry, role = ''] = entry.split(' · ');
      const x = C.x + 40 + i * (cw + 40);
      pc.add(this.captionBox(x, C.y + 30, cw, C.h - 60, i % 2 ? -0.012 : 0.012));
      pc.add(
        this.add
          .text(x + cw / 2, C.y + 66, who, { fontFamily: FONTS.comic, fontSize: '26px', fontStyle: 'bold', color: '#000000' })
          .setOrigin(0.5),
      );
      const rk = ensureCrayonText(this, `crayon_txt_credits_role${i}`, role.toLowerCase(), 30, '#2f6bff');
      const ri = this.add.image(x + cw / 2, C.y + 110, rk);
      ri.setScale(Math.min(1, (cw - 30) / ri.width));
      pc.add(ri);
    });

    const prompt = this.add
      .text(VIEW.width / 2, VIEW.height - 26, CREDITS.restart, {
        fontFamily: FONTS.ui,
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#e9eefc',
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.time.delayedCall(CONTINUE_AT * 1000, () => {
      this.tweens.add({ targets: prompt, alpha: 0.9, duration: 400 });
      this.tweens.add({ targets: prompt, alpha: 0.4, duration: 900, delay: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  /** A hand-ruled comic panel: drop shadow, white gutter, thick ink border, slightly nudged corners. Pops in. */
  private panel(p: Panel, order: number): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    const n: [number, number][] = [
      [5, 7],
      [0, -3],
      [-3, 0],
      [-3, 2],
    ];
    const pts = (inset: number, dx = 0, dy = 0): Phaser.Math.Vector2[] => {
      const corners: [number, number][] = [
        [p.x + inset, p.y + inset],
        [p.x + p.w - inset, p.y + inset],
        [p.x + p.w - inset, p.y + p.h - inset],
        [p.x + inset, p.y + p.h - inset],
      ];
      return corners.map(([x, y], i) => new Phaser.Math.Vector2(x + (n[i]?.[0] ?? 0) + dx, y + (n[i]?.[1] ?? 0) + dy));
    };
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.55);
    g.fillPoints(pts(-8, 10, 12), true);
    g.fillStyle(0xffffff, 1);
    g.fillPoints(pts(-8), true);
    g.fillStyle(p.fill, 1);
    g.fillPoints(pts(0), true);
    c.add(g);
    // border drawn last so it sits over the panel contents
    const border = this.add.graphics();
    border.lineStyle(6, 0x000000, 1);
    border.strokePoints(pts(0), true, true);
    // panel contents (sized by the callers to fit inside) sit between the paper and the border
    const inner = this.add.container(0, 0);
    c.add(inner);
    c.add(border);
    // pop in, one after the other
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 260, delay: 150 + order * 220, ease: 'Sine.easeOut' });
    // callers add content into the masked inner container
    return inner;
  }

  /** Halftone dots baked once into a canvas texture (thousands of Graphics circles are too slow per frame). */
  private dots(key: string, w: number, h: number, step: number, color: string, radius: (y: number) => number): string {
    if (this.textures.exists(key)) return key;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    if (g) {
      g.fillStyle = color;
      for (let y = step / 2; y < h; y += step)
        for (let x = (Math.round(y / step) % 2 ? step / 2 : 0) + 4; x < w; x += step) {
          g.beginPath();
          g.arc(x, y, radius(y), 0, Math.PI * 2);
          g.fill();
        }
    }
    this.textures.addCanvas(key, c);
    return key;
  }

  private captionBox(x: number, y: number, w: number, h: number, rot = 0): Phaser.GameObjects.Graphics {
    const g = this.add.graphics({ x: x + w / 2, y: y + h / 2 });
    g.fillStyle(0xffd400, 1);
    g.fillRect(-w / 2, -h / 2, w, h);
    g.lineStyle(3, 0x000000, 1);
    g.strokeRect(-w / 2, -h / 2, w, h);
    g.setRotation(rot);
    return g;
  }

  update(_time: number, delta: number): void {
    this.t += delta / 1000;
    if (this.done || this.t < CONTINUE_AT || !input.anyPressed()) return;
    this.done = true;
    audio.start();
    audio.sfx.ui();
    this.scene.start(SCENES.Title);
  }
}
