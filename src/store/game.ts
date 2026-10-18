// Zustand store: the only bridge between React and the pure engine.
import { create } from 'zustand';
import { C } from '../data';
import { newGame, step, netWorth, type Action, type GameState, type NewGameConfig } from '../engine';
import { DEFAULT_SETTINGS, loadGame, loadMeta, normalizeSettings, saveGame, saveMeta, type Meta, type Settings, type Slot } from '../save/storage';
import { sfx, setSound, setVolume } from '../audio/sfx';

export type Screen = 'title' | 'new' | 'game' | 'duel';
export type Tab = 'market' | 'map' | 'bank' | 'tavern' | 'outfitter' | 'ledger';
export type TradeQty = number | 'max';
export interface Toast { id: number; title: string; text: string; star?: boolean }
/** A yes/no question in the game's own dialog (instead of the browser's confirm box). */
export interface Ask { title: string; text: string; yes: string; no?: string }
let answerAsk: ((yes: boolean) => void) | null = null;

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
  toasts: Toast[]; tradeQty: TradeQty; plan: string | null;
  trip: { id: number; from: string; to: string; days: number } | null; clearTrip(): void;
  tick: { id: number; days: number } | null; clearTick(): void;
  dismissToast(id: number): void; setTradeQty(q: TradeQty): void; setPlan(dest: string | null): void;
  setScreen(s: Screen): void; setTab(t: Tab): void;
  start(cfg: NewGameConfig): void; load(g: GameState): void; continueAuto(): boolean;
  act(a: Action): boolean; saveTo(slot: Slot): boolean;
  /** States before each buy or sell since the last other action, newest last: Undo steps back through them. */
  undo: GameState[]; undoTrade(): void;
  openCodex(id?: string | null): void; closeCodex(): void;
  ask: Ask | null; confirm(q: Ask): Promise<boolean>; answer(yes: boolean): void;
  setSettings(p: Partial<Settings>): void; resetSettings(): void; openSettings(): void; closeSettings(): void; clearError(): void;
}

function recordMeta(get: () => Store, set: (p: Partial<Store>) => void, g: GameState) {
  const m = get().meta;
  const unlocked = m.chronicleUnlocked || ((g.over?.reason === 'calendar' || g.over?.reason === 'won') && g.mode === 'red-year' && netWorth(g) > 0);
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
    screen: 'title', game: null, error: null, errorTick: 0, tab: 'market', codex: undefined, meta, settingsOpen: false, undo: [], toasts: [], tradeQty: 1, plan: null, trip: null, tick: null, ask: null,
    setScreen: screen => set({ screen }),
    setTab: tab => { sfx.page(); set({ tab }); },
    start: cfg => { const g = newGame(cfg); saveGame(g); set({ game: g, screen: 'game', tab: 'market', error: null, toasts: [], plan: null, undo: [] }); },
    load: g => { const t: Toast[] = []; g = drainNotices(g, t); saveGame(g); set({ game: g, screen: 'game', tab: 'market', error: null, toasts: t, plan: null, undo: [] }); },
    continueAuto: () => { const g = loadGame('auto'); if (!g) return false; get().load(g); return true; },
    act: a => {
      const g = get().game; if (!g) return false;
      const r = step(g, a);
      if (r.error) { sfx.bad(); set(s => ({ error: r.error!, errorTick: s.errorTick + 1 })); return false; }
      const fresh: Toast[] = [];
      const n = drainNotices(r.state, fresh);
      if (a.t === 'buy') sfx.coin(); else if (a.t === 'sell') sfx.sell(); else if (a.t === 'travel') sfx.step(); else if (a.t === 'heal') sfx.heal();
      if (n.pending && !g.pending) sfx.sting();
      if (n.inbox.some(i => i.kind === 'chronicle') && !g.inbox.some(i => i.kind === 'chronicle')) sfx.boom();
      saveGame(n); recordMeta(get, set, n);
      // Arriving somewhere new opens the Market: that is nearly always the next step.
      const arrived = n.player.location !== g.player.location && n.player.location !== 'road';
      for (const t of fresh) setTimeout(() => get().dismissToast(t.id), t.text.length > 120 ? 11000 : 7000);
      const trip = arrived && C.locs[g.player.location] ? { id: n.actions.length, from: g.player.location === 'road' ? (g.pending?.routeId.split('~').find(x => x !== n.player.location) ?? '') : g.player.location, to: n.player.location, days: n.day - g.day } : null;
      const tick = n.day > g.day ? { id: n.actions.length, days: n.day - g.day } : null;
      // Trades can be undone until anything else happens (travel, waiting, the bank...).
      const undo = a.t === 'buy' || a.t === 'sell' ? [...get().undo, g].slice(-20) : [];
      set(s => ({ game: n, error: null, undo, tab: arrived ? 'market' : s.tab, trip: trip ?? s.trip, tick: tick ?? s.tick, plan: s.plan === n.player.location ? null : s.plan, toasts: fresh.length ? [...s.toasts, ...fresh].slice(-3) : s.toasts }));
      return true;
    },
    undoTrade: () => {
      const u = get().undo; const g = u[u.length - 1]; if (!g) return;
      sfx.page(); saveGame(g); set({ game: g, undo: u.slice(0, -1), error: null });
    },
    saveTo: slot => { const g = get().game; return !!g && saveGame(g, slot); },
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
    setPlan: plan => set({ plan }),
    clearTrip: () => set({ trip: null }),
    clearTick: () => set({ tick: null }),
    confirm: q => new Promise<boolean>(res => { answerAsk?.(false); answerAsk = res; set({ ask: q }); }),
    answer: yes => { const r = answerAsk; answerAsk = null; set({ ask: null }); r?.(yes); },
  };
});
