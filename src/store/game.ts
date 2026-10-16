// Zustand store: the only bridge between React and the pure engine.
import { create } from 'zustand';
import { C } from '../data';
import { newGame, step, netWorth, type Action, type GameState, type NewGameConfig } from '../engine';
import { DEFAULT_SETTINGS, loadGame, loadMeta, normalizeSettings, saveGame, saveMeta, type Meta, type Settings, type Slot } from '../save/storage';
import { sfx, setSound, setVolume } from '../audio/sfx';

export type Screen = 'title' | 'new' | 'game';
export type Tab = 'market' | 'map' | 'bank' | 'tavern' | 'outfitter' | 'ledger';
export type TradeQty = number | 'max';
export interface Toast { id: number; title: string; text: string; star?: boolean }

let toastId = 0;
/** Minor inbox items (rumours, achievements, settlements) become toasts instead of blocking cards. */
function drainNotices(g: GameState, out: Toast[]): GameState {
  for (let i = 0; i < 50; i++) {
    const it = g.inbox[0];
    if (!it || !((it.kind === 'result' && it.notice) || it.kind === 'achievement')) break;
    if (it.kind === 'achievement') { const a = C.achievements.find(x => x.id === it.id); out.push({ id: ++toastId, title: 'Achievement', text: a ? `${a.name}: ${a.text}` : it.id, star: true }); }
    else out.push({ id: ++toastId, title: it.title, text: it.text });
    const r = step(g, { t: 'ack' }); if (r.error) break; g = r.state;
  }
  return g;
}

interface Store {
  screen: Screen; game: GameState | null; error: string | null; errorTick: number;
  tab: Tab; codex: string | null | undefined; meta: Meta; settingsOpen: boolean;
  toasts: Toast[]; tradeQty: TradeQty;
  dismissToast(id: number): void; setTradeQty(q: TradeQty): void;
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
    screen: 'title', game: null, error: null, errorTick: 0, tab: 'market', codex: undefined, meta, settingsOpen: false, toasts: [], tradeQty: 1,
    setScreen: screen => set({ screen }),
    setTab: tab => { sfx.page(); set({ tab }); },
    start: cfg => { const g = newGame(cfg); saveGame(g); set({ game: g, screen: 'game', tab: 'market', error: null, toasts: [] }); },
    load: g => { const t: Toast[] = []; g = drainNotices(g, t); saveGame(g); set({ game: g, screen: 'game', tab: 'market', error: null, toasts: t }); },
    continueAuto: () => { const g = loadGame('auto'); if (!g) return false; get().load(g); return true; },
    act: a => {
      const g = get().game; if (!g) return false;
      const r = step(g, a);
      if (r.error) { sfx.bad(); set(s => ({ error: r.error!, errorTick: s.errorTick + 1 })); return false; }
      const fresh: Toast[] = [];
      const n = drainNotices(r.state, fresh);
      if (a.t === 'buy') sfx.coin(); else if (a.t === 'sell') sfx.sell(); else if (a.t === 'travel') sfx.step();
      if (n.pending && !g.pending) sfx.sting();
      if (n.inbox.some(i => i.kind === 'chronicle') && !g.inbox.some(i => i.kind === 'chronicle')) sfx.boom();
      saveGame(n); recordMeta(get, set, n);
      // Arriving somewhere new opens the Market: that is nearly always the next step.
      const arrived = n.player.location !== g.player.location && n.player.location !== 'road';
      for (const t of fresh) setTimeout(() => get().dismissToast(t.id), t.text.length > 120 ? 11000 : 7000);
      set(s => ({ game: n, error: null, tab: arrived ? 'market' : s.tab, toasts: fresh.length ? [...s.toasts, ...fresh].slice(-3) : s.toasts }));
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
    dismissToast: id => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
    setTradeQty: q => set({ tradeQty: q }),
  };
});
