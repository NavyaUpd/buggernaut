// FPS + frame-cost probe on the real GPU. Usage: npm run build && npx vite preview --port 4173 & node scripts/perf.mjs
import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://localhost:4173/');
await page.waitForFunction(() => window.__bijli?.ready === true);
console.log(
  'gpu',
  await page.evaluate(() => {
    const c = document.createElement('canvas').getContext('webgl');
    const d = c && c.getExtension('WEBGL_debug_renderer_info');
    return d ? c.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'n/a';
  }),
);
const sample = () =>
  page.evaluate(() => {
    const p = window.__bijli.perf;
    return `fps ${Math.round(window.__bijli.game.loop.actualFps)}  sim ${p.sim.toFixed(2)}ms  render ${p.render.toFixed(2)}ms  upload ${p.upload.toFixed(2)}ms`;
  });
const rooms = process.argv.slice(2).length ? process.argv.slice(2) : ['2-2', '1-1', '3-1', '3-3'];
for (const id of rooms) {
  await page.evaluate((r) => window.__bijli.room(r), id);
  await page.waitForTimeout(2000);
  console.log(id, 'dark ', await sample());
  await page.evaluate(() => window.__bijli.powerAll());
  await page.waitForTimeout(4000);
  console.log(id, 'lit  ', await sample());
}
await browser.close();
