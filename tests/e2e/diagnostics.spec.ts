// UI diagnostics: inject saves at critical moments and check the screens render and respond, with no JS errors.
import { test, expect, type Page } from '@playwright/test';
import { newGame, step, buildPending, serialize, D, RED_YEAR_END, type Action, type GameState } from '../../src/engine';
import { C } from '../../src/data';

const shot = (page: Page, name: string) => page.screenshot({ path: `tests/e2e/__screenshots__/diag-${name}.png` });
function act(s: GameState, a: Action): GameState { const r = step(s, a); if (r.error) throw new Error(`${a.t}: ${r.error}`); return r.state; }
function drain(s: GameState) { while (s.inbox.length) s = act(s, { t: 'ack' }); return s; }
function until(s: GameState, day: number) { while (s.day < day - 7) s = drain(act(drain(s), { t: 'wait', days: 7 })); while (s.day < day) s = drain(act(drain(s), { t: 'wait', days: 1 })); return s; }
const base = () => drain(newGame({ seed: 'DIAG', backgroundId: 'hlaalu-bastard', name: 'Diagnostic Dren', difficulty: 'tong' }));

async function boot(page: Page, s: GameState, errors: string[]) {
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.addInitScript(data => { localStorage.setItem('ashfall-ledger/save/auto', data); }, serialize(s));
  await page.goto('/');
  await page.getByRole('button', { name: /^Continue:/ }).click();
}
const contBtn = (page: Page) => page.locator('[role=dialog] button').filter({ hasText: /^(Continue|Onward)$/ });
const cont = (page: Page) => contBtn(page).first().click({ force: true, timeout: 3000 });

test('the Red Year strikes: chronicle card, disaster, ruined Balmora, wiped vault', async ({ page }) => {
  const errors: string[] = [];
  let s = base(); s.player.cash = 5000;
  s = act(s, { t: 'travel', route: 'balmora~vivec', mode: 0 }); s = drain(s);
  if (s.pending) s = drain(act(s, { t: 'choose', choice: s.pending.choices.includes('pass') ? 'pass' : s.pending.choices.includes('wait-out') ? 'wait-out' : 'flee' }));
  if (s.player.location === 'vivec') s = act(s, { t: 'deposit', house: 'hlaalu', amount: 500 });
  s.player.location = 'balmora';
  s = until(s, D(5, 2, 2));
  await boot(page, s, errors);
  await page.getByRole('tab', { name: 'Tavern' }).click();
  await page.getByRole('button', { name: /^Rest 1 day/ }).click();
  await expect(page.getByRole('heading', { name: /The Red Year/ })).toBeVisible();
  await shot(page, '01-red-year-card');
  await cont(page);
  await expect(page.getByRole('heading', { name: /You were at Balmora/ })).toBeVisible();
  for (let i = 0; i < 8 && await contBtn(page).count(); i++) { await cont(page); await page.waitForTimeout(200); }
  await expect(page.getByLabel('Status: Ruined')).toBeVisible();
  await page.getByRole('tab', { name: 'Bank' }).click();
  await expect(page.locator('li', { hasText: 'Vivec City' }).locator('.line-through')).toBeVisible();
  await page.getByRole('tab', { name: 'Travel' }).click();
  await shot(page, '02-after-eruption-map');
  expect(errors).toEqual([]);
});

test('an encounter resolves and the journey completes', async ({ page }) => {
  const errors: string[] = [];
  const s = base(); s.player.cash = 2000;
  const def = C.encounters.find(e => e.id === 'tong-toll')!;
  s.player.location = 'road';
  s.pending = buildPending(s, def, 'balmora~vivec', 'vivec', 1);
  await boot(page, s, errors);
  await expect(page.getByRole('heading', { name: /Camonna Tong/ })).toBeVisible();
  await expect(page.getByText(/On the road to Vivec City/)).toBeVisible();
  await shot(page, '03-encounter');
  await page.locator('[role=dialog] button').filter({ hasText: 'Pay' }).click({ force: true });
  await expect(page.locator('[role=dialog]')).toContainText('change hands');
  await cont(page);
  await expect(page.getByRole('heading', { name: 'Vivec City' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('the end screen appears and the Long Chronicle continues', async ({ page }) => {
  const errors: string[] = [];
  let s = base(); s.player.cash = 50000;
  s = act(s, { t: 'pay', amount: 5000 });
  s = until(s, RED_YEAR_END - 1);
  await boot(page, s, errors);
  await page.getByRole('tab', { name: 'Tavern' }).click();
  await page.getByRole('button', { name: /^Rest 1 day/ }).click();
  for (let i = 0; i < 8 && !(await page.getByText(/Campaign complete/).count()); i++) { await cont(page).catch(() => {}); await page.waitForTimeout(200); }
  await expect(page.getByText(/Campaign complete/)).toBeVisible();
  await shot(page, '04-end-screen');
  await page.getByRole('button', { name: /Continue into the Long Chronicle/ }).click();
  await expect(page.getByText('Long Chronicle').first()).toBeVisible();
  await expect(page.getByText('31 Evening Star, 4E 6').first()).toBeVisible();
  await page.waitForTimeout(300);
  for (let i = 0; i < 5 && await contBtn(page).count(); i++) { await cont(page).catch(() => {}); await page.waitForTimeout(200); }
  await page.getByRole('tab', { name: 'Tavern' }).click();
  await page.getByRole('button', { name: /^Rest 1 day/ }).click();
  await expect(page.getByText('7 Morning Star, 4E 7').first()).toBeVisible();
  await shot(page, '05-long-chronicle');
  expect(errors).toEqual([]);
});

test('codex disputes, save export/import, and phone layout', async ({ page, browserName }) => {
  const errors: string[] = [];
  const s = base(); s.codex.push('dispute:D-23');
  await boot(page, s, errors);
  await page.getByRole('button', { name: 'Codex' }).click();
  await page.getByRole('button', { name: 'Historians disagree' }).click();
  await page.getByRole('button', { name: /D-23/ }).click();
  await expect(page.locator('article blockquote')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '☰' }).click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export save file' }).click()]);
  const path = await dl.path();
  expect(dl.suggestedFilename()).toMatch(/\.ashfall\.json$/);
  // import it back from the title screen
  await page.getByRole('button', { name: 'Quit to title' }).click();
  await page.locator('input[type=file]').setInputFiles(path!);
  await expect(page.getByRole('heading', { name: 'Balmora' })).toBeVisible();
  // phone width: no horizontal page overflow
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await shot(page, `06-phone-${browserName}`);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});
