// The magistrate's hearing: the animated board loads, plays cards by mouse and keyboard, and the duel ends.
import { test, expect, type Page } from '@playwright/test';
import { newGame, newDuel, step, serialize, Rng, hashSeed, type GameState } from '../../src/engine';

function withDuel(): GameState {
  let s = newGame({ seed: 'DUEL', backgroundId: 'hlaalu-bastard', name: 'Duel Dren', difficulty: 'tong' });
  while (s.inbox.length) s = step(s, { t: 'ack' }).state;
  s.duel = newDuel(new Rng(hashSeed('duel-e2e')));
  return s;
}
async function boot(page: Page) {
  await page.addInitScript(data => { localStorage.setItem('ashfall-ledger/save/auto', data); }, serialize(withDuel()));
  await page.goto('/');
  await page.getByRole('button', { name: /^Continue:/ }).click();
}
const hand = (page: Page) => page.getByRole('group', { name: 'Your hand' }).getByRole('button');
const firstPlayable = (page: Page) => hand(page).evaluateAll(bs => bs.findIndex(b => !(b as HTMLButtonElement).disabled));

test('hearing: the board plays cards by mouse and keyboard, and the duel ends', async ({ page }) => {
  test.setTimeout(240_000); // a full duel; slow when the machine is busy
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page);
  const board = page.locator('[data-turn]');
  await expect(page.locator('[data-turn] canvas')).toBeVisible({ timeout: 15_000 });
  await expect(board).toHaveAttribute('data-turn', '1');

  // Mouse: click a playable card on the canvas (8 cards 144 wide, 7 apart, centred, at y 508 to 712 of 1280×720).
  const i = await firstPlayable(page);
  expect(i).toBeGreaterThanOrEqual(0);
  const box = (await board.boundingBox())!, k = box.width / 1280;
  await page.mouse.click(box.x + (39.5 + i * 151 + 72) * k, box.y + 610 * k);
  await expect(board).toHaveAttribute('data-turn', '2');

  // Keyboard: the hidden hand buttons play the same cards; Discard lets you throw one away.
  for (let turn = 2; turn < 260; turn++) {
    if ((await board.getAttribute('data-winner')) !== '') break;
    let j = await firstPlayable(page);
    if (j < 0) { await page.getByRole('button', { name: 'Discard a card' }).click(); j = 0; }
    await hand(page).nth(j).focus();
    await page.keyboard.press('Enter');
    await expect(board).not.toHaveAttribute('data-turn', String(turn), { timeout: 10_000 }).catch(async () => {
      expect(await board.getAttribute('data-winner')).not.toBe('');
    });
  }
  await expect(page.getByRole('heading', { name: /The hearing: you (win|lose)/ })).toBeVisible();
  await page.getByRole('button', { name: 'Leave the court' }).click();
  await expect(page.locator('[data-turn]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test.describe('with animations on', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });
  test('hearing: Fast plays a turn with effects, Skip finishes at once', async ({ page }) => {
    test.setTimeout(240_000); // plays the rest of the duel turn by turn: slow under software WebGL with the bigger board
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await boot(page);
    const board = page.locator('[data-turn]');
    await expect(page.locator('[data-turn] canvas')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Fast', exact: true }).click();
    await hand(page).nth(Math.max(0, await firstPlayable(page))).focus();
    await page.keyboard.press('Enter');
    await expect(board).toHaveAttribute('data-turn', '2', { timeout: 10_000 });
    await page.getByRole('button', { name: 'Skip', exact: true }).click();
    for (let turn = 2; turn < 260 && (await board.getAttribute('data-winner')) === ''; turn++) {
      let j = await firstPlayable(page);
      if (j < 0) { await page.getByRole('button', { name: 'Discard a card' }).click(); j = 0; }
      await hand(page).nth(j).focus(); await page.keyboard.press('Enter');
      await expect(board).not.toHaveAttribute('data-turn', String(turn), { timeout: 10_000 }).catch(() => {});
    }
    await expect(page.getByRole('button', { name: 'Leave the court' })).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test('hearing: without WebGL the plain board is used', async ({ page }) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, id: string, ...rest: unknown[]) {
      return /webgl/.test(id) ? null : (get as (...a: unknown[]) => RenderingContext | null).call(this, id, ...rest);
    } as typeof get;
  });
  await boot(page);
  await expect(page.getByText('Damage hits the wall first.', { exact: false })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-turn]')).toHaveCount(0);
  const before = await page.getByText(/^Tower \d+\/100$/).first().innerText();
  const cards = page.locator('button.relative.aspect-\\[240\\/340\\]');
  const n = await cards.count(); let i = 0; while (i < n && await cards.nth(i).isDisabled()) i++;
  if (i === n) { await page.getByRole('button', { name: 'Discard a card' }).click(); i = 0; }
  await cards.nth(i).click();
  await expect(page.getByText(/^You (played|discarded) /)).toBeVisible();
  expect(before).toMatch(/Tower/);
});
