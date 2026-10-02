import { expect, test } from '@playwright/test';

test('boots to title and enters L1 @shots', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await page.waitForFunction(() => window.__bijli?.ready === true);
  await expect.poll(() => page.evaluate(() => window.__bijli!.activeScenes())).toContain('Title');
  await page.screenshot({ path: 'e2e/__screenshots__/title.png' });

  await page.evaluate(() => window.__bijli!.goto('Level', { levelId: 'L1' }));
  await expect.poll(() => page.evaluate(() => window.__bijli!.activeScenes())).toContain('Level');
  await page.screenshot({ path: 'e2e/__screenshots__/l1.png' });

  expect(errors).toEqual([]);
});
