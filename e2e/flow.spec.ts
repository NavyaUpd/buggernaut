import { expect, test } from '@playwright/test';

const scenes = (page: import('@playwright/test').Page) => page.evaluate(() => window.__bijli!.activeScenes());

test('title → card → room → skip via pause → chapter end → phone → card; finale → credits @flow', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?debug');
  await page.waitForFunction(() => window.__bijli?.ready === true);
  await expect.poll(() => scenes(page)).toContain('Title');
  await page.keyboard.press('x');
  await expect.poll(() => scenes(page)).toContain('ChapterCard');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'e2e/__screenshots__/card-1.png' });
  await expect.poll(() => scenes(page), { timeout: 15_000 }).toContain('Room');
  // skip 1-1 and 1-2 through the pause menu
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press('Escape');
    await expect.poll(() => scenes(page)).toContain('Pause');
    await page.screenshot({ path: 'e2e/__screenshots__/pause.png' });
    await page.keyboard.press('s');
    await page.keyboard.press('s');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(700);
  }
  expect(await page.evaluate(() => window.__bijli!.sim()!.def.id)).toBe('1-3');
  // finish 1-3 for real-ish: power it, then teleport onto the exit
  await page.evaluate(() => {
    const s = window.__bijli!.sim()!;
    s.debugPowerAll();
    s.p.x = 39 * 32 + 10;
    s.p.y = 19 * 32 + 8;
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'e2e/__screenshots__/restored.png' });
  await expect.poll(() => scenes(page), { timeout: 15_000 }).toContain('Phone');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'e2e/__screenshots__/phone.png' });
  await page.keyboard.press('x');
  await expect.poll(() => scenes(page)).toContain('ChapterCard');
  for (const c of [2, 3, 4]) {
    await page.evaluate((ch) => window.__bijli!.goto('ChapterCard', { chapter: ch }), c);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `e2e/__screenshots__/card-${c}.png` });
  }
  await page.evaluate(() => window.__bijli!.goto('Finale', {}));
  for (const t of [3, 7, 14, 22]) {
    await page.waitForTimeout(t === 3 ? 3000 : t === 7 ? 4000 : t === 14 ? 7000 : 8000);
    await page.screenshot({ path: `e2e/__screenshots__/finale-${t}.png` });
  }
  await page.waitForTimeout(6000);
  await page.keyboard.press('x');
  await expect.poll(() => scenes(page), { timeout: 15_000 }).toContain('Credits');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'e2e/__screenshots__/credits.png' });
  expect(errors).toEqual([]);
});
