import { expect, test } from '@playwright/test';

test('boots to title, plays room 1-1 lit, every room loads @shots', async ({ page }) => {
  test.setTimeout(420_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?debug');
  await page.waitForFunction(() => window.__bijli?.ready === true);
  await expect.poll(() => page.evaluate(() => window.__bijli!.activeScenes())).toContain('Title');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'e2e/__screenshots__/title.png' });

  for (const id of ['1-1', '1-2', '1-3', '2-1', '2-2', '2-2b', '2-3', '3-1', '3-1b', '3-2', '3-2b', '3-3', '4-1']) {
    await page.evaluate((rid) => window.__bijli!.room(rid), id);
    await expect.poll(() => page.evaluate(() => window.__bijli!.activeScenes())).toContain('Room');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `e2e/__screenshots__/room-${id}-dark.png` });
    await page.evaluate(() => window.__bijli!.powerAll());
    await page.waitForFunction(() => { const s = window.__bijli!.sim(); return !!s && s.lamps.every((l) => l.powerT > 2.4) && (!Number.isFinite(s.skylineT) || s.skylineT > 3); }, null, { timeout: 30_000 });
    console.log(id, 'fps', await page.evaluate(() => Math.round(window.__bijli!.game.loop.actualFps)));
    await page.screenshot({ path: `e2e/__screenshots__/room-${id}-lit.png` });
  }
  expect(errors).toEqual([]);
});
