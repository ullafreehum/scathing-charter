import { defineConfig } from '@playwright/test';

// The Electron desktop app, driven through Playwright's Electron support. Needs `npm run build` first
// (npm run test:desktop does both). On Linux without a display, run it under xvfb-run.
export default defineConfig({
  testDir: 'tests/desktop',
  timeout: 90_000,
  workers: 1,
});
