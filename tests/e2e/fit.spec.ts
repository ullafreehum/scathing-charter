// Screen fit: the game scales from 1024x600 to 4K and ultrawide with no sideways scroll and the top bar in view.
import { test, expect, type Page } from '@playwright/test';
import { newGame, newDuel, step, serialize, Rng, hashSeed, type GameState } from '../../src/engine';

const SIZES: [number, number][] = [[1024, 600], [1280, 720], [1366, 768], [1920, 1080], [2560, 1440], [3840, 2160], [3440, 1440]];
const fresh = () => newGame({ seed: 'FIT', backgroundId: 'hlaalu-bastard', name: 'Fit Fendyn', difficulty: 'tong' });
function drained(): GameState { let s = fresh(); while (s.inbox.length) s = step(s, { t: 'ack' }).state; return s; }

async function boot(page: Page, s: GameState) {
  await page.addInitScript(data => { localStorage.setItem('ashfall-ledger/save/auto', data); }, serialize(s));
  await page.goto('/');
  await page.getByRole('button', { name: /^Continue:/ }).click();
}
async function fits(page: Page, name: string) {
  const [w, h] = [page.viewportSize()!.width, page.viewportSize()!.height];
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: `tests/e2e/__screenshots__/fit-${w}x${h}-${name}.png` });
}

for (const [w, h] of SIZES) {
  test.describe(`${w}x${h}`, () => {
    test.use({ viewport: { width: w, height: h } });
    test('title and dialog fit', async ({ page }) => {
      const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto('/');
      await expect(page.getByRole('button', { name: 'New game' })).toBeVisible();
      await fits(page, 'title');
      await boot(page, fresh());
      await expect(page.getByRole('dialog')).toBeVisible();
      await fits(page, 'dialog');
      await page.close();
    });
    test('market, map and hearing fit', async ({ page }) => {
      const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
      await boot(page, drained());
      const bar = page.getByTitle('Cash on hand');
      await expect(bar).toBeInViewport();
      await fits(page, 'market');
      await page.getByRole('tab', { name: 'Travel' }).click();
      await page.waitForTimeout(400);
      await fits(page, 'map');
      expect(errors).toEqual([]);
    });
    test('hearing fits', async ({ page }) => {
      const s = drained(); s.duel = newDuel(new Rng(hashSeed('fit')));
      await boot(page, s);
      await expect(page.getByText('The hearing')).toBeVisible();
      await fits(page, 'duel');
    });
  });
}
