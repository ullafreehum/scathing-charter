// The Windows desktop app (Electron) exposes `window.desktop` through electron/preload.cjs.
// In a browser it is undefined and everything here does nothing.
import { useEffect } from 'react';
import { useGame } from '../store/game';
import { TEXT_SCALES } from './themes';

export interface DesktopBridge {
  isFullScreen(): Promise<boolean>;
  setFullScreen(on: boolean): void;
  setDialogOpen(open: boolean): void;
  onFullScreenChange(cb: (on: boolean) => void): () => void;
  onScaleStep(cb: (step: 1 | -1 | 0) => void): () => void;
  quit(): void;
}
declare global { interface Window { desktop?: DesktopBridge } }

export const desktop = (): DesktopBridge | undefined => (typeof window === 'undefined' ? undefined : window.desktop);

// Esc leaves full screen only while no dialog or menu is open; each part of the UI reports its own.
const open = new Set<string>();
export function markDialog(key: string, isOpen: boolean) {
  const d = desktop(); if (!d) return;
  if (isOpen) open.add(key); else open.delete(key);
  d.setDialogOpen(open.size > 0);
}
export function useDialogMark(key: string, isOpen: boolean) {
  useEffect(() => { markDialog(key, isOpen); return () => markDialog(key, false); }, [key, isOpen]);
}

/** App-wide: report the game's own dialogs, and turn Ctrl+Plus/Minus/0 into the Text and UI size setting. */
export function useDesktopBridge() {
  const g = useGame(s => s.game);
  const codex = useGame(s => s.codex);
  const settingsOpen = useGame(s => s.settingsOpen);
  useDialogMark('game', !!(g && (g.pending || g.inbox.length || g.duel || g.over)) || codex !== undefined || settingsOpen);
  useEffect(() => desktop()?.onScaleStep(step => {
    const { meta, setSettings } = useGame.getState();
    const i = TEXT_SCALES.findIndex(x => Math.abs(x - meta.settings.textScale) < 0.001);
    const next = step === 0 ? 1 : TEXT_SCALES[Math.max(0, Math.min(TEXT_SCALES.length - 1, (i < 0 ? TEXT_SCALES.indexOf(1) : i) + step))];
    setSettings({ textScale: next });
  }), []);
}
