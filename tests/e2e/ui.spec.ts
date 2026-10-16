// UI behaviour checks: does each control do what it is meant to do?
import { test, expect, type Page } from '@playwright/test';

const num = (s: string) => Number((s.match(/-?[\d,]+/)?.[0] ?? 'NaN').replace(/,/g, ''));
const purse = async (p: Page) => num(await p.getByTitle('Cash on hand').innerText());
const vaults = async (p: Page) => num(await p.getByTitle(/All deposits/).innerText());
const note = async (p: Page) => num(await p.getByTitle('Your Camonna Tong note').innerText());
const load = async (p: Page) => (await p.getByTitle(/Cargo weight/).innerText()).match(/(\d+)\/(\d+)/)!.slice(1).map(Number);
const dateText = (p: Page) => p.locator('header .h-display').nth(1).innerText();
async function clear(p: Page) {
  for (let i = 0; i < 10; i++) {
    const b = p.locator('[role=dialog] button').filter({ hasText: /^(Continue|Onward)$/ });
    if (await b.count()) { await b.first().click({ force: true, timeout: 2000 }).catch(() => {}); await p.waitForTimeout(150); continue; }
    const c = p.locator('[role=dialog]:not([aria-label=Codex]) button').filter({ hasText: /Pass by|Decline|Wait it out|Flee|Submit/ });
    if (await c.count()) { await c.first().click({ force: true, timeout: 2000 }).catch(() => {}); await p.waitForTimeout(150); continue; }
    return;
  }
}
async function start(p: Page, opts: { difficulty?: RegExp } = {}) {
  const errors: string[] = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto('/');
  await p.getByRole('button', { name: 'New Ledger' }).click();
  await p.getByLabel('Seed (same seed, same world)').fill('UI-TEST');
  if (opts.difficulty) await p.getByRole('radio', { name: opts.difficulty }).check();
  await p.getByRole('button', { name: 'Sign the note' }).click();
  await clear(p);
  return errors;
}

test('new game: terms set the purse and note; New Life banner; Long Chronicle locked', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Ledger' }).click();
  await expect(page.getByRole('radio', { name: /Long Chronicle/ })).toBeDisabled();
  const before = await page.getByLabel('Name').inputValue();
  await page.getByRole('button', { name: /Senchal Caravaner/ }).click();
  await expect(page.getByLabel('Name')).not.toHaveValue(before);
  await page.getByRole('radio', { name: /Fair Terms/ }).check();
  await page.getByRole('button', { name: 'Sign the note' }).click();
  await clear(page);
  expect(await purse(page)).toBe(700);
  expect(await note(page)).toBe(2000);
  await expect(page.getByText('New Life Festival').first()).toBeVisible();
  expect(await dateText(page)).toContain('1 Morning Star, 4E 4');
});

test('market: buy and sell move cash, cargo, load; errors show a toast', async ({ page }) => {
  const errors = await start(page);
  const row = page.getByRole('row').filter({ hasText: 'Kwama Eggs' });
  const unit = num(await row.getByRole('cell').nth(2).innerText());
  const p0 = await purse(page);
  await row.getByLabel(/Quantity/).fill('5');
  await row.getByRole('button', { name: 'Buy', exact: true }).click();
  const p1 = await purse(page);
  expect(p0 - p1).toBeGreaterThanOrEqual(unit * 5);
  expect(p0 - p1).toBeLessThanOrEqual(Math.ceil(unit * 5 * 1.03));
  await expect(row.getByRole('cell').nth(4)).toHaveText('5');
  expect((await load(page))[0]).toBe(10);
  // selling all returns cash and clears the hold
  await row.getByRole('button', { name: 'All', exact: true }).click();
  expect(await purse(page)).toBeGreaterThan(p1);
  expect((await load(page))[0]).toBe(0);
  // too much → toast, nothing changes
  await row.getByLabel(/Quantity/).fill('999');
  const p2 = await purse(page);
  await row.getByRole('button', { name: 'Buy', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await purse(page)).toBe(p2);
  await expect(page.getByRole('alert')).toBeHidden({ timeout: 6000 });
  // contraband is labelled, and selling it here needs a fence (J'Dhannar is one)
  await expect(page.getByRole('row', { name: /^Moon Sugar/ })).toContainText('Contraband');
  expect(errors).toEqual([]);
});

test('tavern: free rumour on New Life, rest advances one day for 3 dr, porter adds 12 stone', async ({ page }) => {
  const errors = await start(page);
  await page.getByRole('tab', { name: 'Tavern' }).click();
  const p0 = await purse(page);
  await page.getByRole('button', { name: /Stand a round/ }).click();
  await expect(page.locator('[role=dialog]')).toContainText(/Tavern talk/);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/ui-rumour.png' });
  await clear(page);
  expect(await purse(page)).toBe(p0);
  await page.getByRole('button', { name: /^Rest 1 day/ }).click();
  await clear(page);
  expect(await dateText(page)).toContain('2 Morning Star, 4E 4');
  expect(await purse(page)).toBe(p0 - 3);
  const cap0 = (await load(page))[1];
  await page.getByRole('button', { name: 'Hire porter' }).click();
  expect((await load(page))[1]).toBe(cap0 + 12);
  expect(await purse(page)).toBe(p0 - 3 - 100);
  await page.getByRole('button', { name: 'Dismiss porter' }).click();
  expect((await load(page))[1]).toBe(cap0);
  // second rumour costs 5 (no longer New Life)
  const p1 = await purse(page);
  await page.getByRole('button', { name: /Stand a round/ }).click();
  await clear(page);
  expect(await purse(page)).toBe(p1 - 5);
  expect(errors).toEqual([]);
});

test('counting-house: deposit, withdraw with fee, pay the note', async ({ page }) => {
  const errors = await start(page);
  await page.keyboard.press('Tab');
  await page.getByRole('tab', { name: 'Market' }).click();
  await page.keyboard.press('b');
  await expect(page.getByRole('tab', { name: 'Counting-house' })).toHaveAttribute('aria-selected', 'true');
  const p0 = await purse(page);
  await page.getByLabel('Amount').fill('200');
  await page.getByRole('button', { name: 'Deposit 200' }).first().click();
  expect(await purse(page)).toBe(p0 - 200);
  expect(await vaults(page)).toBe(200);
  await page.getByRole('button', { name: 'Withdraw 200' }).first().click();
  expect(await vaults(page)).toBe(0);
  expect(await purse(page)).toBe(p0 - 1); // 1% fee, halved for the Hlaalu by-blow, rounded up
  await page.getByLabel('Amount').fill('100');
  const n0 = await note(page);
  await page.getByRole('button', { name: 'Pay', exact: true }).click();
  expect(await note(page)).toBe(n0 - 100);
  // EEC has no branch in Balmora
  await expect(page.getByText('No branch of this house here.').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('travel: map click filters departures; Go moves you and the calendar', async ({ page }) => {
  const errors = await start(page);
  await page.getByRole('tab', { name: 'Travel' }).click();
  await page.getByRole('button', { name: /Ald’ruhn, reachable/ }).click();
  await expect(page.getByRole('heading', { name: /To Ald’ruhn/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Go' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Go' }).click();
  await clear(page);
  await expect(page.getByRole('heading', { level: 2, name: 'Ald’ruhn' })).toBeVisible();
  expect(await dateText(page)).not.toContain('1 Morning Star');
  expect(errors).toEqual([]);
});

test('outfitter, codex links, ledger, keyboard, save slot, settings', async ({ page }) => {
  const errors = await start(page);
  await page.getByRole('tab', { name: 'Outfitter & Temple' }).click();
  const p0 = await purse(page);
  await page.getByRole('button', { name: /^Buy Scroll of Chameleon/ }).click();
  expect(await purse(page)).toBe(p0 - 150);
  await expect(page.getByText(/Scrolls: Chameleon 1/)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Heal/ })).toBeDisabled();
  await page.screenshot({ path: 'tests/e2e/__screenshots__/ui-outfitter.png' });
  // codex link from a good name
  await page.getByRole('tab', { name: 'Market' }).click();
  await page.getByRole('row').filter({ hasText: 'Saltrice' }).getByRole('button', { name: 'Saltrice' }).click();
  await expect(page.getByRole('dialog', { name: 'Codex' }).locator('article h2')).toHaveText('Saltrice');
  await expect(page.getByRole('dialog', { name: 'Codex' }).locator('article')).toContainText('Sources');
  await expect(page.getByRole('dialog', { name: 'Codex' }).getByRole('button', { name: 'Goods' })).toHaveClass(/bg-ash-700/);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/ui-codex.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Codex' })).toHaveCount(0);
  // ledger
  await page.getByRole('tab', { name: 'Ledger' }).click();
  await expect(page.getByText(/You owe Gavas Drelloth/)).toBeVisible();
  await expect(page.getByText(/Achievements \d+\/21/)).toBeVisible();
  // keyboard: c opens codex
  await page.getByRole('tab', { name: 'Ledger' }).focus();
  await page.keyboard.press('c');
  await expect(page.getByRole('dialog', { name: 'Codex' })).toBeVisible();
  await page.keyboard.press('Escape');
  // save slot → title lists it; continue works
  await page.getByRole('button', { name: '☰' }).click();
  await page.getByRole('button', { name: 'Save to slot 2' }).click();
  await page.getByRole('button', { name: '☰' }).click();
  await page.getByRole('button', { name: 'Title screen' }).click();
  await expect(page.getByRole('button', { name: /Slot 2:/ })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Large text' }).check();
  await expect(page.locator('body')).toHaveClass(/large-text/);
  await page.getByRole('checkbox', { name: 'Ash & motion' }).uncheck();
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Large text' })).toBeChecked();
  await page.getByRole('button', { name: /Slot 2:/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Balmora' })).toBeVisible();
  expect(errors).toEqual([]);
});
