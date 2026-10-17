// UI behaviour checks: does each control do what it is meant to do?
import { test, expect, type Page } from '@playwright/test';

const num = (s: string) => Number((s.match(/-?[\d,]+/)?.[0] ?? 'NaN').replace(/,/g, ''));
const purse = async (p: Page) => num(await p.getByTitle('Cash on hand').innerText());
const vaults = async (p: Page) => num(await p.getByTitle(/All deposits/).innerText());
const note = async (p: Page) => num(await p.getByTitle('Your debt to the Camonna Tong').innerText());
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
  await p.getByRole('button', { name: 'New game' }).click();
  await p.getByLabel('World seed (optional)').fill('UI-TEST');
  if (opts.difficulty) await p.getByRole('radio', { name: opts.difficulty }).check();
  await p.getByRole('button', { name: 'Start game' }).click();
  await clear(p);
  return errors;
}

test('new game: terms set the purse and note; New Life banner; Long Chronicle locked', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New game' }).click();
  await expect(page.getByRole('radio', { name: /Long Chronicle/ })).toBeDisabled();
  const before = await page.getByLabel('Name').inputValue();
  await page.getByRole('button', { name: /Senchal Caravaner/ }).click();
  await expect(page.getByLabel('Name')).not.toHaveValue(before);
  await page.getByRole('radio', { name: /Fair Terms/ }).check();
  await page.getByRole('button', { name: 'Start game' }).click();
  await clear(page);
  expect(await purse(page)).toBe(700);
  expect(await note(page)).toBe(2000);
  await expect(page.getByText('New Life Festival').first()).toBeVisible();
  expect(await dateText(page)).toContain('1 Morning Star, 4E 4');
});

test('market: amount picker, buy and sell, filters, capped amounts, next-step hint', async ({ page }) => {
  const errors = await start(page);
  await expect(page.getByLabel('Next steps')).toContainText('Start simple');
  const row = page.getByRole('row').filter({ hasText: 'Kwama Eggs' });
  const unit = num(await row.getByRole('cell').nth(2).innerText());
  const p0 = await purse(page);
  await page.getByRole('radio', { name: '5', exact: true }).click();
  await expect(row.getByRole('button', { name: /^Buy/ })).toHaveText('Buy 5');
  await row.getByRole('button', { name: /^Buy/ }).click();
  const p1 = await purse(page);
  expect(p0 - p1).toBeGreaterThanOrEqual(unit * 5);
  expect(p0 - p1).toBeLessThanOrEqual(Math.ceil(unit * 5 * 1.03));
  await expect(row.getByRole('cell').nth(4)).toHaveText('5');
  expect((await load(page))[0]).toBe(10);
  await expect(page.getByText(/Start simple/)).toHaveCount(0);
  // the total shows next to Buy; Undo takes the trade back; ▸ writes out the row's details
  await expect(row.getByRole('cell').nth(6)).toContainText('space left');
  await page.getByRole('button', { name: /Undo last trade/ }).click();
  expect(await purse(page)).toBe(p0);
  await row.getByRole('button', { name: /^Buy/ }).click();
  expect(await purse(page)).toBe(p1);
  await row.getByRole('button', { name: 'Details' }).click();
  await expect(page.getByText(/You own 5, bought at/)).toBeVisible();
  await row.getByRole('button', { name: 'Details' }).click();
  // the ☰ menu closes on Escape and on a click outside it
  await page.getByRole('button', { name: '☰' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Export save file' })).toHaveCount(0);
  await page.getByRole('button', { name: '☰' }).click();
  await page.mouse.click(5, 600);
  await expect(page.getByRole('button', { name: 'Export save file' })).toHaveCount(0);
  // "My cargo" filter shows only what you carry
  await page.getByRole('radio', { name: 'My cargo' }).click();
  await expect(page.getByRole('row')).toHaveCount(2);
  await page.getByRole('radio', { name: 'All', exact: true }).click();
  // Max sells everything you own of it
  await page.getByRole('radio', { name: 'Max' }).click();
  page.once('dialog', d => d.accept()); // selling at a loss asks first
  await row.getByRole('button', { name: /^Sell/ }).click();
  expect(await purse(page)).toBeGreaterThan(p1);
  expect((await load(page))[0]).toBe(0);
  // a huge custom amount is capped to what you can afford and carry
  await page.getByLabel('Custom amount').fill('999');
  const shown = num(await row.getByRole('button', { name: /^Buy/ }).innerText());
  expect(shown).toBeGreaterThan(0); expect(shown).toBeLessThan(999);
  // contraband is labelled, and selling it here needs a fence (J'Dhannar is one)
  await expect(page.getByRole('row', { name: /^Moon Sugar/ })).toContainText('Contraband');
  expect(errors).toEqual([]);
});

test('tavern: free rumour on New Life, rest advances one day for 3 dr, porter adds 12 stone', async ({ page }) => {
  const errors = await start(page);
  await page.getByRole('tab', { name: 'Tavern' }).click();
  const p0 = await purse(page);
  await page.getByRole('button', { name: /Buy a round/ }).click();
  await expect(page.getByRole('status')).toContainText(/Rumour/);
  await expect(page.locator('[role=dialog]')).toHaveCount(0);
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
  await page.getByRole('button', { name: /Buy a round/ }).click();
  await clear(page);
  expect(await purse(page)).toBe(p1 - 5);
  expect(errors).toEqual([]);
});

test('strongbox: deposit, withdraw with fee, pay the note', async ({ page }) => {
  const errors = await start(page);
  await page.keyboard.press('Tab');
  await page.getByRole('tab', { name: 'Market' }).click();
  await page.keyboard.press('b');
  await expect(page.getByRole('tab', { name: 'Bank' })).toHaveAttribute('aria-selected', 'true');
  const p0 = await purse(page);
  await page.getByLabel('Strongbox amount').fill('200');
  await page.getByRole('button', { name: 'Deposit', exact: true }).click();
  expect(await purse(page)).toBe(p0 - 200);
  expect(await vaults(page)).toBe(200);
  await page.getByRole('button', { name: 'Withdraw', exact: true }).click();
  expect(await vaults(page)).toBe(0);
  expect(await purse(page)).toBe(p0 - 1); // 1% fee, halved for the Hlaalu by-blow, rounded up
  await page.getByLabel('Payment amount').fill('100');
  const n0 = await note(page);
  await page.getByRole('button', { name: 'Pay', exact: true }).click();
  expect(await note(page)).toBe(n0 - 100);
  await expect(page.getByText('(here)')).toBeVisible();
  expect(errors).toEqual([]);
});

test('travel: map views, zoom, travel card, planner, keys; Go moves you and the calendar', async ({ page }) => {
  const errors = await start(page);
  await page.getByRole('tab', { name: 'Travel' }).click();
  // views and zoom
  const svg = page.getByRole('img', { name: 'Map of eastern Tamriel' });
  await page.getByRole('button', { name: 'All Tamriel' }).click();
  await expect.poll(async () => Number((await svg.getAttribute('viewBox'))!.split(' ')[2])).toBeGreaterThanOrEqual(1000);
  await page.getByRole('button', { name: 'Vvardenfell', exact: true }).click();
  await expect.poll(async () => Number((await svg.getAttribute('viewBox'))!.split(' ')[2])).toBeLessThan(400);
  // a far town: the planner proposes a chain of journeys
  await page.getByRole('button', { name: 'All Tamriel' }).click();
  await expect.poll(async () => Number((await svg.getAttribute('viewBox'))!.split(' ')[2])).toBeGreaterThanOrEqual(1000);
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Imperial City', exact: true }).click({ force: true });
  const far = page.getByRole('group', { name: 'Travel to Imperial City' });
  await expect(far).toContainText('Fastest way');
  await far.getByRole('button', { name: 'Plan this route' }).click();
  await expect(page.getByLabel('Next steps')).toContainText('Route plan to Imperial City');
  await page.screenshot({ path: 'tests/e2e/__screenshots__/ui-map-plan.png' });
  await far.getByRole('button', { name: 'Close' }).click();
  // number key 1 opens the nearest destination's card
  await page.keyboard.press('1');
  await expect(page.getByRole('group', { name: /^Travel to / })).toBeVisible();
  await page.keyboard.press('Escape');
  // click a reachable town, travel from its card
  await page.getByRole('button', { name: 'My routes' }).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /Ald’ruhn, reachable/ }).click({ force: true });
  const card = page.getByRole('group', { name: 'Travel to Ald’ruhn' });
  await expect(card.getByRole('button', { name: 'Go' })).toHaveCount(1);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/ui-map-card.png' });
  await card.getByRole('button', { name: 'Go' }).click();
  await clear(page);
  await expect(page.getByRole('heading', { level: 2, name: 'Ald’ruhn' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Market' })).toHaveAttribute('aria-selected', 'true');
  // the price book remembers Balmora: in the Market column and in Travel
  await expect(page.getByText(/Balmora, \d+ days? ago/).first()).toBeVisible();
  await page.getByRole('tab', { name: 'Travel' }).click();
  await page.getByTitle('Show on the map').filter({ hasText: 'Balmora' }).click();
  await expect(page.getByRole('group', { name: 'Travel to Balmora' })).toContainText(/Prices seen (today|\d+ days? ago)/);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/ui-travel-outlook.png' });
  await page.getByRole('tab', { name: 'Market' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/ui-market-pricebook.png' });
  expect(await dateText(page)).not.toContain('1 Morning Star');
  expect(errors).toEqual([]);
});

test('outfitter, codex links, ledger, keyboard, save slot, settings', async ({ page }) => {
  const errors = await start(page);
  await page.getByRole('tab', { name: 'Shop & Temple' }).click();
  const p0 = await purse(page);
  await page.getByRole('button', { name: /^Buy Scroll of Chameleon/ }).click();
  await expect.poll(() => purse(page)).toBe(p0 - 150);
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
  await page.getByRole('tab', { name: 'Journal' }).click();
  await expect(page.getByText(/You owe Gavas Drelloth/)).toBeVisible();
  await expect(page.getByText(/Achievements \d+\/20/)).toBeVisible();
  // keyboard: c opens codex
  await page.getByRole('tab', { name: 'Journal' }).focus();
  await page.keyboard.press('c');
  await expect(page.getByRole('dialog', { name: 'Codex' })).toBeVisible();
  await page.keyboard.press('Escape');
  // save slot → title lists it; continue works
  await page.getByRole('button', { name: '☰' }).click();
  await page.getByRole('button', { name: 'Save to slot 2' }).click();
  await expect(page.getByText('✓ Saved in slot 2')).toBeVisible();
  await page.getByRole('button', { name: 'Quit to title' }).click();
  await expect(page.getByRole('button', { name: /Slot 2:/ })).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: /Slot 2:/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Balmora' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('settings: themes, fonts, text size, motion and sound persist', async ({ page }) => {
  const errors = await start(page);
  const html = page.locator('html');
  // lore badges are codex-only
  await page.getByRole('tab', { name: 'Bank' }).click();
  await expect(page.getByText('Invented for this game')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Market' }).click();
  for (const [name, id] of [['Ashlands', 'ashlands'], ['Bitter Coast', 'bitter-coast'], ['Azura’s Coast', 'azuras-coast'], ['Ascadian Isles', 'ascadian-isles'], ['West Gash', 'west-gash']]) {
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('radio', { name: new RegExp(`^${name}`) }).click();
    await expect(html).toHaveAttribute('data-theme', id);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0);
    await page.screenshot({ path: `tests/e2e/__screenshots__/theme-${id}.png` });
  }
  await page.getByRole('button', { name: 'Settings' }).click();
  const dlg = page.getByRole('dialog', { name: 'Settings' });
  await dlg.getByRole('radio', { name: /^Atkinson Hyperlegible/ }).click();
  await expect(html).toHaveAttribute('data-caps', 'off');
  await dlg.getByRole('radio', { name: 'Text size 125%' }).click();
  expect(await html.evaluate(e => e.style.getPropertyValue('--ui-scale'))).toBe('1.25');
  await dlg.getByRole('checkbox', { name: 'Falling ash' }).uncheck();
  await expect(page.locator('canvas')).toHaveCount(0);
  await dlg.getByRole('checkbox', { name: 'Sound on' }).uncheck();
  await expect(dlg.getByLabel('Volume')).toBeDisabled();
  await page.screenshot({ path: 'tests/e2e/__screenshots__/ui-settings.png' });
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'west-gash');
  expect(await html.evaluate(e => e.style.getPropertyValue('--ui-scale'))).toBe('1.25');
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('checkbox', { name: 'Sound on' })).not.toBeChecked();
  await page.getByRole('button', { name: 'Reset to defaults' }).click();
  await expect(html).toHaveAttribute('data-theme', 'ashlands');
  await expect(page.getByRole('checkbox', { name: 'Falling ash' })).toBeChecked();
  expect(errors).toEqual([]);
});
