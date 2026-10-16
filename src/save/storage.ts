// localStorage persistence + file export/import. Engine-side (de)serialisation lives in engine/save.ts.
import { deserialize, serialize, type GameState } from '../engine';

const KEY = 'ashfall-ledger';
export type Slot = 'auto' | '1' | '2' | '3';
export interface Meta { chronicleUnlocked: boolean; achievements: string[]; bestNetWorth: number; settings: Settings }
export interface Settings { sound: boolean; motion: boolean; largeText: boolean }
const DEFAULT_META: Meta = { chronicleUnlocked: false, achievements: [], bestNetWorth: 0, settings: { sound: true, motion: true, largeText: false } };

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
  try { const t = ls()?.getItem(`${KEY}/meta`); return t ? { ...DEFAULT_META, ...JSON.parse(t) } : DEFAULT_META; } catch { return DEFAULT_META; }
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
