import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Each launch gets a fresh user-data folder, so window state and saves start clean; the "relaunch" test reuses one.
async function launch(userData: string): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({ args: ['.', `--user-data-dir=${userData}`, ...(process.platform === 'linux' ? ['--no-sandbox'] : [])] });
  const page = await app.firstWindow();
  await page.waitForSelector('text=New game');
  return { app, page };
}
const isFull = (app: ElectronApplication) => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen());
const uiScale = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim());
// Real input through Electron's pipeline (Playwright's own key presses skip main's before-input-event).
const key = (app: ElectronApplication, keyCode: string, modifiers: ('control' | 'alt')[] = []) => app.evaluate(({ BrowserWindow }, [k, m]) => {
  const wc = BrowserWindow.getAllWindows()[0].webContents;
  wc.sendInputEvent({ type: 'keyDown', keyCode: k as string, modifiers: m as ('control' | 'alt')[] });
  wc.sendInputEvent({ type: 'keyUp', keyCode: k as string, modifiers: m as ('control' | 'alt')[] });
}, [keyCode, modifiers] as const);
let dir = '';
test.beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'scathing-desktop-')); });
test.afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

test('first launch: full screen, no menu, bridge present, game boots', async () => {
  const { app, page } = await launch(dir);
  expect(await isFull(app)).toBe(true);
  expect(await app.evaluate(({ Menu }) => Menu.getApplicationMenu())).toBeNull();
  expect(await page.evaluate(() => Object.keys(window.desktop ?? {}).sort())).toEqual(['isFullScreen', 'onFullScreenChange', 'onScaleStep', 'setDialogOpen', 'setFullScreen']);
  expect(await page.evaluate(() => typeof (window as unknown as { require?: unknown }).require)).toBe('undefined'); // no Node in the page
  await app.close();
});

test('F11 and Alt+Enter toggle full screen; Esc leaves it only with no dialog open', async () => {
  const { app, page } = await launch(dir);
  await key(app, 'F11'); await expect.poll(() => isFull(app)).toBe(false);
  await key(app, 'Enter', ['alt']); await expect.poll(() => isFull(app)).toBe(true);
  await page.getByRole('button', { name: /Settings/ }).first().click(); // a dialog is open: Esc closes it, not full screen
  await key(app, 'Escape');
  await page.waitForTimeout(300);
  expect(await isFull(app)).toBe(true);
  await key(app, 'Escape'); // nothing open now
  await expect.poll(() => isFull(app)).toBe(false);
  await app.close();
});

test('Ctrl+Plus, Ctrl+Minus and Ctrl+0 step the Text and UI size, never Chromium zoom', async () => {
  const { app, page } = await launch(dir);
  const s0 = await uiScale(page);
  await key(app, '=', ['control']); await expect.poll(() => uiScale(page)).not.toBe(s0);
  await key(app, '0', ['control']); await expect.poll(() => uiScale(page)).toBe('1');
  await key(app, '-', ['control']); await expect.poll(() => uiScale(page)).toBe('0.9');
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.getZoomFactor())).toBe(1);
  await app.close();
});

test('external links open outside; the window never navigates away', async () => {
  const { app, page } = await launch(dir);
  const url0 = page.url();
  await page.evaluate(() => { location.href = 'https://example.com/'; });
  await page.waitForTimeout(500);
  expect(page.url()).toBe(url0);
  await app.close();
});

test('relaunch keeps windowed mode, and a save survives', async () => {
  let { app, page } = await launch(dir);
  await key(app, 'F11'); await expect.poll(() => isFull(app)).toBe(false);
  await page.evaluate(() => localStorage.setItem('ashfall-ledger/qa-probe', 'kept'));
  await app.close();
  ({ app, page } = await launch(dir));
  expect(await isFull(app)).toBe(false);
  expect(await page.evaluate(() => localStorage.getItem('ashfall-ledger/qa-probe'))).toBe('kept');
  await app.close();
});
