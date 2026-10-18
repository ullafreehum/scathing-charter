// One command for the checks in docs/QA.md. PowerShell-safe: plain Node, no shell syntax.
//   npm run check            before every push: typecheck, lint, unit tests
//   npm run check:release    before a release: the above + build + browser e2e + desktop e2e
// Balance runs and fuzzing (sim, balance, balance:focus, diagnose) are never part of this: they run only on request.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const release = process.argv.includes('--release');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
// The desktop tests need a display; on a headless Linux box wrap them in xvfb-run when it exists.
const headless = process.platform === 'linux' && !process.env.DISPLAY && existsSync('/usr/bin/xvfb-run');

const steps = [
  ['Typecheck', npx, ['tsc', '--noEmit', '-p', 'tsconfig.json']],
  ['Lint', npm, ['run', 'lint', '--silent']],
  ['Unit tests', npx, ['vitest', 'run']],
  ...(release ? [
    ['Build', npm, ['run', 'build', '--silent']],
    ['Browser e2e', npx, ['playwright', 'test', '--reporter=line']],
    ['Desktop e2e', headless ? 'xvfb-run' : npx, [...(headless ? ['-a', npx] : []), 'playwright', 'test', '-c', 'playwright.desktop.config.ts', '--reporter=line']],
  ] : []),
];

const results = [];
for (const [name, cmd, args] of steps) {
  const t = Date.now();
  process.stdout.write(`\n▶ ${name}\n`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  const ok = r.status === 0;
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name} (${((Date.now() - t) / 1000).toFixed(0)}s)`);
  if (!ok) break;
}
console.log(`\n${results.join('\n')}`);
process.exit(results.every(l => l.startsWith('PASS')) && results.length === steps.length ? 0 : 1);
