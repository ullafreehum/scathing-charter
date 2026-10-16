// Builds release/AshGame-offline.zip: the built game + zero-dependency launcher (Windows/macOS/Linux).
// Usage: npm run package:offline   (runs the production build first)
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const out = 'release', dir = join(out, 'AshGame');
if (!existsSync('dist/index.html')) { console.error('Run "npm run build" first.'); process.exit(1); }
rmSync(out, { recursive: true, force: true });
mkdirSync(join(dir, 'launcher'), { recursive: true });
cpSync('dist', join(dir, 'game'), { recursive: true });
cpSync('offline/server.mjs', join(dir, 'launcher', 'server.mjs'));
for (const f of ['Play The Scathing Charter.cmd', 'Make desktop shortcut.cmd', 'README-OFFLINE.txt']) cpSync(join('offline', f), join(dir, f));
const zip = join(out, 'AshGame-offline.zip');
if (process.platform === 'win32') execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${dir}' -DestinationPath '${zip}' -Force"`, { stdio: 'inherit' });
else execSync(`cd ${out} && zip -qr AshGame-offline.zip AshGame`, { stdio: 'inherit' });
console.log(`Created ${zip}`);
