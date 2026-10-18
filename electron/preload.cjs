// The only bridge between the game page and the desktop shell. The game checks
// `window.desktop` and works unchanged in a browser, where it is undefined.
const { contextBridge, ipcRenderer } = require('electron');

const listen = (channel, cb) => {
  const h = (_e, v) => cb(v);
  ipcRenderer.on(channel, h);
  return () => ipcRenderer.removeListener(channel, h);
};

contextBridge.exposeInMainWorld('desktop', {
  isFullScreen: () => ipcRenderer.invoke('desktop:is-fullscreen'),
  setFullScreen: on => ipcRenderer.send('desktop:set-fullscreen', on === true),
  /** Call with true while any in-game dialog or menu is open, so Esc closes it instead of leaving full screen. */
  setDialogOpen: open => ipcRenderer.send('desktop:dialog-open', open === true),
  /** cb(true|false) whenever full screen changes (F11, Alt+Enter, Esc, or setFullScreen). Returns an unsubscribe. */
  onFullScreenChange: cb => listen('desktop:fullscreen', cb),
  /** cb(+1 | -1 | 0) on Ctrl+Plus / Ctrl+Minus / Ctrl+0: step the "Text and UI size" setting (0 = reset to 100%). */
  onScaleStep: cb => listen('desktop:scale-step', cb),
  /** Close the game (the Exit button on the title screen). */
  quit: () => ipcRenderer.send('desktop:quit'),
});
