// localStorage persistence + file export/import. Engine-side (de)serialisation lives in engine/save.ts.
import { deserialize, serialize, type GameState } from '../engine';

const KEY = 'ashfall-ledger';
export type Slot = 'auto' | '1' | '2' | '3';
export interface Meta { chronicleUnlocked: boolean; achievements: string[]; bestNetWorth: number; settings: Settings }
export interface Settings { sound: boolean; volume: number; theme: string; font: string; textScale: number; ash: boolean; animations: boolean; hints: boolean }
export const DEFAULT_SETTINGS: Settings = { sound: true, volume: 0.8, theme: 'ashlands', font: 'classic', textScale: 1, ash: true, animations: true, hints: true };
const DEFAULT_META: Meta = { chronicleUnlocked: false, achievements: [], bestNetWorth: 0, settings: DEFAULT_SETTINGS };

/** Fill in missing settings and migrate the old {motion, largeText} switches. */
export function normalizeSettings(s: Partial<Settings> & { motion?: boolean; largeText?: boolean } = {}): Settings {
  const clamp = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
  return {
    sound: s.sound ?? DEFAULT_SETTINGS.sound,
    volume: clamp(s.volume, 0, 1, DEFAULT_SETTINGS.volume),
    theme: typeof s.theme === 'string' ? s.theme : DEFAULT_SETTINGS.theme,
    font: typeof s.font === 'string' ? s.font : DEFAULT_SETTINGS.font,
    textScale: clamp(s.textScale, 0.8, 1.6, s.largeText ? 1.12 : 1),
    ash: s.ash ?? s.motion ?? true,
    animations: s.animations ?? s.motion ?? true,
    hints: s.hints ?? true,
  };
}

function ls(): Storage | null { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } }

/** What a save menu shows about a slot, kept beside the save so menus need not parse the whole game. */
export interface SlotInfo { day: number; name: string; location: string; seed: string; savedAt?: number }

export function saveGame(s: GameState, slot: Slot = 'auto'): boolean {
  try {
    const store = ls(); if (!store) return false;
    store.setItem(`${KEY}/save/${slot}`, serialize(s));
    const info: SlotInfo = { day: s.day, name: s.player.name, location: s.player.location, seed: s.seed, savedAt: Date.now() };
    store.setItem(`${KEY}/slot/${slot}`, JSON.stringify(info));
    return true;
  } catch { return false; /* quota or private mode */ }
}
export function loadGame(slot: Slot = 'auto'): GameState | null {
  const t = ls()?.getItem(`${KEY}/save/${slot}`);
  if (!t) return null;
  try { return deserialize(t); } catch { return null; }
}
export function slotInfo(slot: Slot): SlotInfo | null {
  const store = ls(); if (!store?.getItem(`${KEY}/save/${slot}`)) return null;
  try { const t = store.getItem(`${KEY}/slot/${slot}`); if (t) return JSON.parse(t) as SlotInfo; } catch { /* fall back to the save itself */ }
  const g = loadGame(slot); // saves made before slot info existed: no save time
  return g ? { day: g.day, name: g.player.name, location: g.player.location, seed: g.seed } : null;
}
export function deleteGame(slot: Slot) { ls()?.removeItem(`${KEY}/save/${slot}`); ls()?.removeItem(`${KEY}/slot/${slot}`); }

/** "today 14:32", "yesterday 09:10" or "12 Oct 09:10", in the player's own clock. */
export function savedWhen(ts: number | undefined): string {
  if (!ts) return 'time unknown';
  const d = new Date(ts), now = new Date();
  const hm = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  if (diff === 0) return `today ${hm}`;
  if (diff === 1) return `yesterday ${hm}`;
  return `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' })} ${hm}`;
}

export function loadMeta(): Meta {
  try {
    const t = ls()?.getItem(`${KEY}/meta`); if (!t) return DEFAULT_META;
    const m = { ...DEFAULT_META, ...JSON.parse(t) } as Meta; return { ...m, settings: normalizeSettings(m.settings) };
  } catch { return DEFAULT_META; }
}
export function saveMeta(m: Meta) { try { ls()?.setItem(`${KEY}/meta`, JSON.stringify(m)); } catch { /* ignore */ } }

export function exportFile(s: GameState) {
  const blob = new Blob([serialize(s)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `scathing-charter-${s.player.name.replace(/[^\w-]+/g, '_')}-day${s.day}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export function importFile(file: File): Promise<GameState> {
  return file.text().then(deserialize);
}
