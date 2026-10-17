// Desktop shell for The Scathing Charter: opens the built game (dist/) in its own window.
// No Node access in the page; preload.cjs exposes a small `window.desktop` API.
// Saves stay in localStorage under the app's user-data folder, which depends on
// appId/productName, so never rename those (players would lose saves).
const { app, BrowserWindow, Menu, ipcMain, screen, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

if (!app.requestSingleInstanceLock()) app.quit();

const MIN_W = 1024, MIN_H = 600;
const statePath = () => path.join(app.getPath('userData'), 'window.json');
let dialogOpen = false; // reported by the game: Esc belongs to an open dialog or menu

function loadState() {
  try { return JSON.parse(fs.readFileSync(statePath(), 'utf8')); } catch { return null; }
}
function saveState(win) {
  const s = { fullscreen: win.isFullScreen(), bounds: win.getNormalBounds() };
  try { fs.writeFileSync(statePath(), JSON.stringify(s)); } catch { /* not fatal */ }
}
// Saved bounds only if they still land on a connected display; otherwise centre on the primary one.
function initialBounds(saved) {
  const b = saved?.bounds;
  if (b && screen.getAllDisplays().some(d => {
    const a = d.workArea;
    return b.x < a.x + a.width && b.x + b.width > a.x && b.y < a.y + a.height && b.y + b.height > a.y;
  })) return { ...b, width: Math.max(b.width, MIN_W), height: Math.max(b.height, MIN_H) };
  const a = screen.getPrimaryDisplay().workArea;
  const width = Math.max(MIN_W, Math.min(1600, a.width)), height = Math.max(MIN_H, Math.min(900, a.height));
  return { x: a.x + Math.round((a.width - width) / 2), y: a.y + Math.round((a.height - height) / 2), width, height };
}

function createWindow() {
  const saved = loadState();
  const win = new BrowserWindow({
    ...initialBounds(saved),
    minWidth: MIN_W, minHeight: MIN_H,
    fullscreen: saved ? saved.fullscreen === true : true, // first launch: true full screen
    show: false,
    backgroundColor: '#0f0c0b',
    title: 'The Scathing Charter',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });
  win.once('ready-to-show', () => win.show());

  const wc = win.webContents;
  // Game zoom is the in-game "Text and UI size" setting; Chromium zoom stays at 1.
  wc.setVisualZoomLevelLimits(1, 1);
  wc.on('zoom-changed', () => wc.setZoomFactor(1));
  wc.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    const key = input.key, mod = input.control || input.meta;
    if (key === 'F11' || (input.alt && key === 'Enter')) {
      e.preventDefault(); win.setFullScreen(!win.isFullScreen());
    } else if (key === 'Escape' && win.isFullScreen() && !dialogOpen) {
      e.preventDefault(); win.setFullScreen(false);
    } else if (mod && (key === '+' || key === '=' || key === '-' || key === '_' || key === '0')) {
      e.preventDefault();
      wc.send('desktop:scale-step', key === '0' ? 0 : key === '-' || key === '_' ? -1 : 1);
    }
  });
  const sendFs = () => wc.send('desktop:fullscreen', win.isFullScreen());
  win.on('enter-full-screen', sendFs);
  win.on('leave-full-screen', sendFs);
  win.on('close', () => saveState(win));

  // External links open in the player's browser; the game window never navigates away.
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  wc.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); }
  });
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  return win;
}

const winOf = e => BrowserWindow.fromWebContents(e.sender);
ipcMain.handle('desktop:is-fullscreen', e => winOf(e)?.isFullScreen() ?? false);
ipcMain.on('desktop:set-fullscreen', (e, on) => winOf(e)?.setFullScreen(on === true));
ipcMain.on('desktop:dialog-open', (_e, open) => { dialogOpen = open === true; });

Menu.setApplicationMenu(null);
app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
