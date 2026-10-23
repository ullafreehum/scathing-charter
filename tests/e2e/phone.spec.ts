// The Android layout in a browser (?phone): five Market rows fit at 892×412, and the small phone-only touches.
import { test, expect } from '@playwright/test';
import { newGame, newDuel, step, serialize, Rng, hashSeed } from '../../src/engine';

test.use({ viewport: { width: 892, height: 412 }, hasTouch: true });

test('phone: five market rows, no empty Sell button, Drelloth in the strip, resume keeps the scroll', async ({ page }) => {
  await page.goto('/?phone');
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByLabel('World seed (optional)').fill('PHONE-TEST');
  await page.getByRole('button', { name: 'Start game' }).click();
  for (let i = 0; i < 6; i++) {
    const b = page.locator('[role=dialog] button').filter({ hasText: /^(Continue|Onward)$/ });
    if (await b.count()) { await b.first().click({ force: true }); await page.waitForTimeout(200); }
  }
  await expect(page.locator('.phone-strip')).toContainText('Drelloth');
  await expect(page.locator('.market-notice.open')).toHaveCount(1); // first sight of the town notice: open in full
  await page.getByLabel('Hide the hint').click();
  await page.evaluate(() => document.querySelector('.market-notice')?.remove()); // an ordinary day has no notice
  await expect(page.locator('.phone-nosell').first()).toBeAttached();
  await expect(page.getByText('Nothing to sell')).toHaveCount(0);
  const full = await page.evaluate(() => {
    const sc = document.querySelector('.phone-scroll')!.getBoundingClientRect();
    return [...document.querySelectorAll('.market-table tbody tr')].filter(r => { const b = r.getBoundingClientRect(); return b.top >= sc.top - 1 && b.bottom <= sc.bottom + 1; }).length;
  });
  expect(full).toBeGreaterThanOrEqual(5);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/phone-market.png' });
  // back from the background: the Market list is where it was left
  const hide = (hidden: boolean) => page.evaluate(h => { Object.defineProperty(document, 'hidden', { value: h, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }, hidden);
  await page.locator('.phone-scroll').evaluate(e => { e.scrollTop = 90; });
  await hide(true);
  await page.locator('.phone-scroll').evaluate(e => { e.scrollTop = 0; });
  await hide(false);
  await expect.poll(() => page.locator('.phone-scroll').evaluate(e => e.scrollTop)).toBe(90);
});

for (const [w, h] of [[640, 360], [740, 360], [844, 390], [932, 430]]) test(`phone ${w}×${h}: the status strip and tabs fit`, async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('/?phone');
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByLabel('World seed (optional)').fill('PHONE-SIZES');
  await page.getByRole('button', { name: 'Start game' }).click();
  for (let i = 0; i < 6; i++) {
    const b = page.locator('[role=dialog] button').filter({ hasText: /^(Continue|Onward)$/ });
    if (await b.count()) { await b.first().click({ force: true }); await page.waitForTimeout(200); }
  }
  const clipped = await page.evaluate(() => [...document.querySelectorAll('.phone-strip > *, .phone-strip .btn > span, .market-head > *')]
    .filter(e => getComputedStyle(e).display !== 'none' && e.scrollWidth > e.clientWidth + 1).map(e => e.textContent));
  expect(clipped).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const journal = await page.locator('.phone-tab', { hasText: 'Journal' }).boundingBox();
  expect(journal!.y + journal!.height).toBeLessThanOrEqual(h);
  await ctx.close();
});

for (const [w, h] of [[640, 360], [892, 412]]) test(`phone ${w}×${h}: the hearing fills the screen and a card plays on the second tap`, async ({ browser }) => {
  let s = newGame({ seed: 'DUEL', backgroundId: 'hlaalu-bastard', name: 'Duel Dren', difficulty: 'tong' });
  while (s.inbox.length) s = step(s, { t: 'ack' }).state;
  s.duel = newDuel(new Rng(hashSeed('duel-e2e')));
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.addInitScript(data => { localStorage.setItem('ashfall-ledger/save/auto', data); }, serialize(s));
  await page.goto('/?phone');
  await expect(page.getByRole('button', { name: 'Card duel (practice)' })).toBeVisible();
  await page.getByRole('button', { name: /^Continue:/ }).click();
  const board = page.locator('[data-turn]');
  await expect(board.locator('canvas')).toBeVisible();
  const b = (await board.boundingBox())!;
  expect(b.height).toBeGreaterThan(h * 0.9); // full screen: as big as fits beside 24 px margins
  expect(b.x).toBeGreaterThanOrEqual(23);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
  const play = page.locator('.duel-zone button.btn-ember'), discard = page.locator('.duel-zone').getByRole('button', { name: 'Discard' });
  await expect(play).toHaveText('Tap a card');
  await expect(discard).toBeDisabled();
  const tap = () => page.touchscreen.tap(b.x + b.width * 0.09, b.y + b.height * 0.85);
  await tap(); await tap(); // a double-tap only selects
  await page.waitForTimeout(400);
  await expect(board).toHaveAttribute('data-turn', '1');
  await expect(play).not.toHaveText('Tap a card');
  await page.screenshot({ path: `tests/e2e/__screenshots__/phone-duel-${w}-selected.png` });
  await discard.click(); // throws the selected card away
  await expect(board).not.toHaveAttribute('data-turn', '1');
  await page.screenshot({ path: `tests/e2e/__screenshots__/phone-duel-${w}.png` });
  await ctx.close();
});

test('phone: a fine to contest shows in the Market, and Contest opens the hearing full screen', async ({ browser }) => {
  let s = newGame({ seed: 'DUEL', backgroundId: 'hlaalu-bastard', name: 'Duel Dren', difficulty: 'tong' });
  while (s.inbox.length) s = step(s, { t: 'ack' }).state;
  s.appeal = { loc: s.player.location, goods: {}, fine: 120, until: s.day + 30 };
  const ctx = await browser.newContext({ viewport: { width: 892, height: 412 }, hasTouch: true, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.addInitScript(data => { localStorage.setItem('ashfall-ledger/save/auto', data); }, serialize(s));
  await page.goto('/?phone');
  await page.getByRole('button', { name: /^Continue:/ }).click();
  await expect(page.getByText('A fine to contest.')).toBeVisible();
  await page.screenshot({ path: 'tests/e2e/__screenshots__/phone-contest.png' });
  await page.getByRole('button', { name: 'Contest' }).click();
  await expect(page.locator('.duel-phone [data-turn] canvas')).toBeVisible();
  await ctx.close();
});
