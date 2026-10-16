// Zustand store: the only bridge between React and the pure engine.
import { create } from 'zustand';
import { newGame, step, netWorth, type Action, type GameState, type NewGameConfig } from '../engine';
import { DEFAULT_SETTINGS, loadGame, loadMeta, normalizeSettings, saveGame, saveMeta, type Meta, type Settings, type Slot } from '../save/storage';
import { sfx, setSound, setVolume } from '../audio/sfx';

export type Screen = 'title' | 'new' | 'game';
export type Tab = 'market' | 'map' | 'bank' | 'tavern' | 'outfitter' | 'ledger';

interface Store {
  screen: Screen; game: GameState | null; error: string | null; errorTick: number;
  tab: Tab; codex: string | null | undefined; meta: Meta; settingsOpen: boolean;
  setScreen(s: Screen): void; setTab(t: Tab): void;
  start(cfg: NewGameConfig): void; load(g: GameState): void; continueAuto(): boolean;
  act(a: Action): boolean; saveTo(slot: Slot): void;
  openCodex(id?: string | null): void; closeCodex(): void;
  setSettings(p: Partial<Settings>): void; resetSettings(): void; openSettings(): void; closeSettings(): void; clearError(): void;
}

function recordMeta(get: () => Store, set: (p: Partial<Store>) => void, g: GameState) {
  const m = get().meta;
  const unlocked = m.chronicleUnlocked || (g.over?.reason === 'calendar' && g.mode === 'red-year' && netWorth(g) > 0);
  const achievements = Array.from(new Set([...m.achievements, ...g.achievements]));
  const best = Math.max(m.bestNetWorth, g.over ? netWorth(g) : 0);
  if (unlocked !== m.chronicleUnlocked || achievements.length !== m.achievements.length || best !== m.bestNetWorth) {
    const meta = { ...m, chronicleUnlocked: unlocked, achievements, bestNetWorth: best };
    saveMeta(meta); set({ meta });
  }
}

export const useGame = create<Store>()((set, get) => {
  const meta = loadMeta();
  setSound(meta.settings.sound); setVolume(meta.settings.volume);
  return {
    screen: 'title', game: null, error: null, errorTick: 0, tab: 'market', codex: undefined, meta, settingsOpen: false,
    setScreen: screen => set({ screen }),
    setTab: tab => { sfx.page(); set({ tab }); },
    start: cfg => { const g = newGame(cfg); saveGame(g); set({ game: g, screen: 'game', tab: 'market', error: null }); },
    load: g => { saveGame(g); set({ game: g, screen: 'game', tab: 'market', error: null }); },
    continueAuto: () => { const g = loadGame('auto'); if (!g) return false; set({ game: g, screen: 'game', tab: 'market' }); return true; },
    act: a => {
      const g = get().game; if (!g) return false;
      const r = step(g, a);
      if (r.error) { sfx.bad(); set(s => ({ error: r.error!, errorTick: s.errorTick + 1 })); return false; }
      const n = r.state;
      if (a.t === 'buy') sfx.coin(); else if (a.t === 'sell') sfx.sell(); else if (a.t === 'travel') sfx.step();
      if (n.pending && !g.pending) sfx.sting();
      if (n.inbox.some(i => i.kind === 'chronicle') && !g.inbox.some(i => i.kind === 'chronicle')) sfx.boom();
      saveGame(n); recordMeta(get, set, n);
      set({ game: n, error: null });
      return true;
    },
    saveTo: slot => { const g = get().game; if (g) saveGame(g, slot); },
    openCodex: id => { sfx.page(); set({ codex: id ?? null }); },
    closeCodex: () => set({ codex: undefined }),
    setSettings: p => {
      const meta = { ...get().meta, settings: normalizeSettings({ ...get().meta.settings, ...p }) };
      setSound(meta.settings.sound); setVolume(meta.settings.volume); saveMeta(meta); set({ meta });
    },
    resetSettings: () => get().setSettings(DEFAULT_SETTINGS),
    openSettings: () => { sfx.page(); set({ settingsOpen: true }); },
    closeSettings: () => set({ settingsOpen: false }),
    clearError: () => set({ error: null }),
  };
});
