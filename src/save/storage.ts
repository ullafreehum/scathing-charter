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

export function saveGame(s: GameState, slot: Slot = 'auto'): void {
  try { ls()?.setItem(`${KEY}/save/${slot}`, serialize(s)); } catch { /* quota or private mode: ignore */ }
}
export function loadGame(slot: Slot = 'auto'): GameState | null {
  const t = ls()?.getItem(`${KEY}/save/${slot}`);
  if (!t) return null;
  try { return deserialize(t); } catch { return null; }
}
export function slotInfo(slot: Slot): { day: number; name: string; location: string } | null {
  const g = loadGame(slot);
  return g ? { day: g.day, name: g.player.name, location: g.player.location } : null;
}
export function deleteGame(slot: Slot) { ls()?.removeItem(`${KEY}/save/${slot}`); }

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
  a.download = `ashfall-${s.player.name.replace(/[^\w-]+/g, '_')}-day${s.day}.ashfall.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export function importFile(file: File): Promise<GameState> {
  return file.text().then(deserialize);
}
