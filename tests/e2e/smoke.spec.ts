import { test, expect, type Page } from '@playwright/test';

const shot = (page: Page, name: string) => page.screenshot({ path: `tests/e2e/__screenshots__/${name}.png` });

async function clearModals(page: Page) {
  for (let i = 0; i < 15; i++) {
    const cont = page.locator('[role=dialog] button').filter({ hasText: /^(Continue|Onward)$/ });
    if (await cont.count()) { await cont.first().click({ force: true, timeout: 3000 }).catch(() => {}); await page.waitForTimeout(300); continue; }
    const choice = page.locator('[role=dialog]:not([aria-label=Codex]) button').filter({ hasText: /Flee|Pass by|Decline|Wait it out|Submit/ });
    if (await choice.count()) { await choice.first().click({ force: true, timeout: 3000 }).catch(() => {}); await page.waitForTimeout(300); continue; }
    return;
  }
}

test('new game → trade → travel → codex → save/continue', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /The Scathing Charter/ })).toBeVisible();
  await expect(page.getByText(/^Version \d+\.\d+\.\d+/)).toBeVisible();
  await page.waitForTimeout(1500);
  await shot(page, '01-title');
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByLabel('World seed (optional)').fill('SMOKE1');
  await shot(page, '02-new-game');
  await page.getByRole('button', { name: 'Start game' }).click();
  await shot(page, '03-first-card');
  await clearModals(page);
  await expect(page.getByRole('heading', { name: 'Balmora' })).toBeVisible();
  await shot(page, '04-market');
  // buy a few kwama eggs
  const row = page.getByRole('row').filter({ hasText: 'Kwama Eggs' });
  await page.getByRole('radio', { name: '5', exact: true }).click();
  await row.getByRole('button', { name: /^Buy/ }).click();
  await expect(row.getByRole('cell').nth(4)).toContainText('5');
  await page.getByRole('tab', { name: 'Travel' }).click();
  await page.waitForTimeout(400);
  await shot(page, '05-map');
  await page.getByRole('button', { name: 'Go' }).first().click();
  await page.waitForTimeout(500);
  await shot(page, '06-after-travel');
  await clearModals(page);
  await page.getByRole('tab', { name: 'Bank' }).click();
  await shot(page, '07-bank');
  await page.getByRole('tab', { name: 'Tavern' }).click();
  await page.getByRole('button', { name: /Buy a round/ }).click();
  await page.waitForTimeout(300);
  await shot(page, '08-rumour');
  await clearModals(page);
  await page.getByRole('button', { name: 'Codex' }).click();
  await page.getByRole('button', { name: 'Historians disagree' }).click();
  await shot(page, '09-codex');
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.getByRole('button', { name: /Continue:/ })).toBeVisible();
});
