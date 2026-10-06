// Captures the lamp-bloom GIF frames by stepping the game loop manually (deterministic 20 fps), then PIL builds the GIF.
// Usage: npm run build && npx vite preview --port 4173 --strictPort, then node scripts/record-gif.mjs && python scripts/make-gif.py
import { chromium } from '@playwright/test';
import { mkdirSync, rmSync } from 'node:fs';

const DIR = 'submission/_gif';
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
await page.goto('http://localhost:4173/?debug');
await page.waitForFunction(() => window.__bijli?.ready === true);
await page.evaluate(() => window.__bijli.room('1-1'));
await page.waitForTimeout(1500);
// stand the hero on the pole top, as if the splice was just made, and let the room settle past its caption
await page.evaluate(() => {
  const s = window.__bijli.sim();
  s.messages.length = 0;
  s.nextBolt = 999; // no lightning peek over the bloom
  s.p.x = 12 * 32 + 16;
  s.p.y = 9 * 32 + 8;
  s.p.face = 1;
});
await page.evaluate(() => window.__bijli.game.loop.sleep());
let t = await page.evaluate(() => performance.now());
const step = async (n) => {
  for (let i = 0; i < n; i++) {
    t += 1000 / 60;
    await page.evaluate((tt) => {
      window.__bijli.sim().messages.length = 0; // keep captions and hint cards out of the GIF
      window.__bijli.game.step(tt, 1000 / 60);
    }, t);
  }
};
await step(20);
await page.evaluate(() => window.__bijli.sim().debugPowerAll());
for (let f = 0; f < 66; f++) {
  await step(3); // 3 game frames at 60 Hz = one GIF frame at 20 fps
  await page.screenshot({ path: `${DIR}/f${String(f).padStart(3, '0')}.png` });
}
await browser.close();
console.log('frames ok');
