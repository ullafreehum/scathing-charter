// The Scathing Charter offline launcher: serves the built game from ./game on 127.0.0.1 and opens it in
// Google Chrome (its own app window and profile, so saves live next to the game). Zero dependencies.
// Usage: node launcher/server.mjs [--no-browser] [--port 51735]
import http from 'node:http';
import { createReadStream, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, normalize, extname, dirname, resolve } from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GAME = join(ROOT, 'game');
const PROFILE = join(ROOT, 'chrome-profile');
const args = process.argv.slice(2);
const NO_BROWSER = args.includes('--no-browser');
// A fixed port matters: browser saves are tied to the exact address, port included.
const PORT = Number(args[args.indexOf('--port') + 1]) || 51735;
const URL = `http://127.0.0.1:${PORT}/`;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8' };

const say = (m) => console.log(`  ${m}`);
console.log('\n  THE SCATHING CHARTER (offline)\n  ==============================\n');
if (!existsSync(join(GAME, 'index.html'))) { say(`Game files not found in ${GAME}. Re-extract the ZIP so the "game" folder sits next to this launcher.`); process.exit(1); }

function findChrome() {
  if (process.env.ASHGAME_BROWSER) return process.env.ASHGAME_BROWSER;
  const env = process.env;
  const candidates = process.platform === 'win32'
    ? [join(env['ProgramFiles'] ?? 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
       join(env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
       join(env['LOCALAPPDATA'] ?? '', 'Google\\Chrome\\Application\\chrome.exe')]
    : process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
    : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  for (const c of candidates) if (c && existsSync(c)) return c;
  if (process.platform === 'win32') {
    for (const hive of ['HKLM', 'HKCU']) {
      try {
        const out = execSync(`reg query "${hive}\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" /ve`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
        const m = out.match(/REG_SZ\s+(.+chrome\.exe)/i); if (m && existsSync(m[1].trim())) return m[1].trim();
      } catch { /* not in this hive */ }
    }
  }
  return null;
}

function openChrome() {
  if (NO_BROWSER) { say(`Serving at ${URL} (no browser launched).`); return; }
  const chrome = findChrome();
  if (!chrome) {
    say('Google Chrome was not found in the usual places.');
    say(`Open Chrome yourself and go to:  ${URL}`);
    say('Keep this window open while you play.');
    return;
  }
  mkdirSync(PROFILE, { recursive: true });
  const started = Date.now();
  const child = spawn(chrome, [`--app=${URL}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check', '--disable-features=Translate', '--window-size=1440,900'], { stdio: 'ignore', detached: false });
  say('Opening the game in a Google Chrome window...');
  say('Close the game window when you are done; this window will close by itself.');
  child.on('error', e => { say(`Could not start Chrome (${e.message}). Open Chrome and go to ${URL}`); });
  child.on('exit', () => {
    if (Date.now() - started < 6000) {
      // Chrome handed the window to an instance that was already running: keep serving until this window is closed.
      say('Chrome was already open with the game profile, so this window keeps the game running.');
      say('Close this window when you are finished playing.');
      return;
    }
    say('Game window closed. Goodbye, outlander.');
    server.close(); setTimeout(() => process.exit(0), 300);
  });
}

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = normalize(join(GAME, urlPath));
    if (!file.startsWith(GAME)) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) file = join(GAME, 'index.html');
    res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    createReadStream(file).pipe(res);
  } catch { res.writeHead(500).end(); }
});

server.on('error', e => {
  if (e.code === 'EADDRINUSE') {
    say('The game is already running (or another program uses its port). Opening a window to it...');
    openChrome();
    if (NO_BROWSER) process.exit(0);
  } else { say(`Server error: ${e.message}`); process.exit(1); }
});
server.listen(PORT, '127.0.0.1', () => { say(`Game server ready on ${URL}`); openChrome(); });
