// Crash test: hundreds of random clicks across the live UI; any page/console error or blank screen fails.
import { test, expect } from '@playwright/test';

const SKIP = /Title screen|Quit to title|Export|Import|Save to slot|Credits|New game|☰/;

for (const seed of ['MONKEY-A', 'MONKEY-B']) {
  test(`random clicking does not crash (${seed})`, async ({ page }) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
    page.on('dialog', d => d.dismiss());
    await page.goto('/');
    await page.getByRole('button', { name: 'New game' }).click();
    await page.getByLabel('World seed (optional)').fill(seed);
    await page.getByRole('button', { name: 'Start game' }).click();
    let r = seed.charCodeAt(seed.length - 1);
    const rnd = (n: number) => { r = (r * 1103515245 + 12345) % 2147483648; return r % n; };
    let clicks = 0;
    for (let i = 0; i < 300; i++) {
      const els = page.locator('button:not([disabled]), [role=tab], [role=button]');
      const n = await els.count();
      if (!n) break;
      const el = els.nth(rnd(n));
      // the DOM can change between count() and here (e.g. a toast auto-dismisses), so never wait unbounded
      const label = ((await el.textContent({ timeout: 1000 }).catch(() => '')) ?? '').trim();
      if (SKIP.test(label)) continue;
      await el.click({ force: true, timeout: 1500 }).catch(() => {});
      clicks++;
      if (i % 40 === 0) await page.keyboard.press('Escape');
    }
    await expect(page.locator('#root')).not.toBeEmpty();
    const text = await page.locator('#root').innerText();
    expect(text.length).toBeGreaterThan(50);
    console.log(`${seed}: ${clicks} random clicks, ${errors.length} errors`);
    expect(errors).toEqual([]);
  });
}
