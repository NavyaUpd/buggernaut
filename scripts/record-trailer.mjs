// Records the submission video + screenshots by driving the real game with the test bot (debug autopilot).
// Usage: npm run build && npx vite preview --port 4173 --strictPort  (separate terminal), then node scripts/record-trailer.mjs
import { chromium } from '@playwright/test';
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'submission';
mkdirSync(OUT, { recursive: true });
const VID = join(OUT, '_video');
rmSync(VID, { recursive: true, force: true });

// The bot, injected into the page: every helper is a generator yielding one frame of input.
const BOT = String.raw`
window.__bot = (() => {
  const S = () => window.__bijli.sim();
  const X = (tx) => tx * 32 + 16;
  const FEET = (row) => row * 32 + 8;
  const N = { left: false, right: false, up: false, down: false, jumpPressed: false, upPressed: false, jumpHeld: false, interact: false, interactPressed: false };
  function* wait(n) { for (let i = 0; i < n; i++) yield N; }
  function* hold(n, inp) { for (let i = 0; i < n; i++) yield { ...N, ...inp }; }
  function* walkTo(x, settle = false) {
    let n = 0;
    while (Math.abs(S().p.x - x) > 12 && n++ < 600) {
      const r = x > S().p.x;
      const stuck = S().p.ground && Math.abs(S().p.vx) < 1 && n > 2;
      yield { ...N, right: r, left: !r, jumpPressed: stuck, jumpHeld: true };
    }
    let k = 0;
    while (!S().p.ground && !S().p.climb && !S().p.grind && !S().dying && k++ < 90) yield N;
    if (settle) {
      let m = 0;
      while (S().p.ground && Math.abs(S().p.x - x) > 8 && m++ < 60) yield { ...N, right: x > S().p.x, left: x < S().p.x };
      yield* wait(8);
    }
  }
  function* hop(tx) {
    yield { ...N, jumpPressed: true, jumpHeld: true };
    let n = 0;
    while (n++ < 60) {
      yield { ...N, right: tx > S().p.x + 4, left: tx < S().p.x - 4, jumpHeld: true };
      if (S().p.ground && n > 5) break;
    }
  }
  function* climb(f = 120) { yield { ...N, up: true, upPressed: true }; yield* hold(f, { up: true }); }
  function* down(f = 150) { yield { ...N, down: true }; yield* hold(f, { down: true }); }
  function* holdE(f = 70) { yield* hold(f, { interact: true, interactPressed: true }); }
  function* tapE() { yield { ...N, interact: true, interactPressed: true }; yield* wait(2); }
  function* grab(x) { yield* walkTo(x); yield { ...N, jumpPressed: true, jumpHeld: true }; yield* hold(40, { jumpHeld: true }); }
  const scripts = {
    '1-1': function* () {
      yield* wait(50); yield* walkTo(400); yield* climb(); yield* holdE(); yield* wait(150);
      yield { ...N, right: true }; yield* walkTo(745); yield* hop(770); yield* hop(880); yield* hop(1000); yield* walkTo(1262);
    },
    '1-3': function* () {
      yield* wait(30); yield* walkTo(X(9)); yield* climb(160); yield* holdE(10); yield* wait(90);
      yield* walkTo(X(5)); yield* tapE(); yield* wait(20); yield* walkTo(X(9)); yield* climb(160); yield* holdE(); yield* wait(30);
      yield* down(120); yield* walkTo(X(5)); yield* tapE(); yield* wait(150);
      yield* walkTo(X(9)); yield* climb(160); yield { ...N, right: true }; yield* wait(120); yield* down(150); yield* walkTo(39 * 32 + 10);
    },
    '2-1': function* () {
      yield* wait(30); yield* walkTo(X(8)); yield* climb(); yield* holdE(); yield* wait(170); yield* down(150); yield* walkTo(X(25));
      let n = 0;
      while (!(S().p.ground && S().p.y === FEET(14)) && n++ < 160) yield { ...N, right: true, jumpHeld: true };
      yield* walkTo(1262);
    },
    '2-3': function* () {
      yield* wait(40); yield* grab(X(4)); yield* walkTo(X(6), true); yield* climb(110); yield { ...N, right: true }; yield* wait(100);
      yield* down(150); yield* walkTo(X(35)); yield* hop(X(39)); yield* wait(10);
    },
    '3-3': function* () {
      yield* wait(40); yield* grab(X(4)); yield* walkTo(X(7), true); yield* climb(110); yield { ...N, right: true }; yield* wait(60);
      yield* down(80); yield* walkTo(X(23)); yield* walkTo(X(27)); yield* climb(100); yield* holdE(); yield* down(80);
      yield* walkTo(X(31)); yield* tapE(); yield* wait(60 * 8);
    },
  };
  return {
    run(id) {
      return new Promise((resolve) => {
        const g = scripts[id]();
        const t0 = performance.now();
        window.__bijli.autopilot.fn = (sim) => {
          if (sim.done || performance.now() - t0 > 70000) { window.__bijli.autopilot.fn = null; resolve(sim.done); return N; }
          const r = g.next();
          if (r.done) { window.__bijli.autopilot.fn = null; resolve(true); return N; }
          return r.value;
        };
      });
    },
  };
})();
`;

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: VID, size: { width: 1280, height: 720 } } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:4173/?debug');
await page.waitForFunction(() => window.__bijli?.ready === true);
await page.evaluate(BOT);
const scenes = () => page.evaluate(() => window.__bijli.activeScenes());
const until = async (fn, arg, timeout = 60_000) => {
  try {
    await page.waitForFunction(fn, arg, { timeout, polling: 30 });
  } catch {
    console.log('timed out waiting:', String(fn).slice(0, 80));
  }
};
const within = (p, ms = 75_000) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);
const shot = (name) => page.screenshot({ path: join(OUT, name) });
const sim = (fn) => page.evaluate(fn);

// title → intro (two panels) → chapter 1
await page.waitForTimeout(3500);
await page.keyboard.press('x');
await until(() => window.__bijli.activeScenes().includes('Intro'));
for (let i = 0; i < 4; i++) {
  await page.waitForTimeout(i % 2 ? 900 : 3600);
  await page.keyboard.press('x');
}
await page.waitForTimeout(3200);
await page.keyboard.press('Escape');
await until(() => window.__bijli.activeScenes().includes('Room'), null, 20_000);

// 1-1: first light (screenshot mid-bloom)
const r11 = page.evaluate(() => window.__bot.run('1-1'));
await until(() => (window.__bijli.sim()?.lamps[0]?.powerT ?? -1) > 1.38);
await shot('2-bloom-midway.png');
await within(r11);
await page.waitForTimeout(900);

// 1-3: the live line (shock → breaker → splice → grind)
await page.evaluate(() => window.__bijli.room('1-3'));
await page.waitForTimeout(300);
await within(page.evaluate(() => window.__bot.run('1-3')));
await until(() => window.__bijli.activeScenes().includes('Phone'), null, 30_000);
await page.waitForTimeout(2600);

// 2-1: Taar-Naag (dark room screenshot, then the snake bounce)
await page.evaluate(() => window.__bijli.room('2-1'));
await page.waitForTimeout(1800);
await shot('1-dark-room.png');
const r21 = page.evaluate(() => window.__bot.run('2-1'));
await until(() => { const s = window.__bijli.sim(); return !!s && s.p.vy < -620 && !s.p.ground; });
await page.waitForTimeout(60);
await shot('3-snake-bounce.png');
await within(r21);
await page.waitForTimeout(700);

// 2-3: Chinni's drawing, BIJLI grind
await page.evaluate(() => window.__bijli.room('2-3'));
await page.waitForTimeout(300);
const r23 = page.evaluate(() => window.__bot.run('2-3'));
await until(() => { const s = window.__bijli.sim(); return !!s && !!s.p.grind && s.bijli.active && s.p.x > 360; });
await shot('4-bijli-grind.png');
await within(r23);
await until(() => window.__bijli.activeScenes().includes('Phone'), null, 30_000);
await page.waitForTimeout(2600);

// 3-3: substation → skyline bloom
await page.evaluate(() => window.__bijli.room('3-3'));
await page.waitForTimeout(300);
const r33 = page.evaluate(() => window.__bot.run('3-3'));
await until(() => { const s = window.__bijli.sim(); return !!s && s.skylineT > 3.2; }, null, 90_000);
await shot('5-skyline-bloom.png');
await until(() => window.__bijli.activeScenes().includes('Phone'), null, 30_000);
await page.waitForTimeout(2500);
void r33;

await ctx.close();
await browser.close();
const vid = readdirSync(VID).find((f) => f.endsWith('.webm'));
if (vid) renameSync(join(VID, vid), join(OUT, 'bijli-gameplay.webm'));
rmSync(VID, { recursive: true, force: true });
console.log('page errors:', JSON.stringify(errs));
