// Small helpers shared by the engine's action modules.
import { C } from '../data';
import { LOG_VOICE, type LogKey } from '../data/voice';
import type { GameState, LogEntry } from './types';

export function unlock(s: GameState, id: string) { if (C.codex[id] && !s.codex.includes(id)) s.codex.push(id); }
export function log(s: GameState, text: string, tone: LogEntry['tone'] = 'neutral') { s.log.push({ day: s.day, text, tone }); if (s.log.length > 400) s.log.splice(0, s.log.length - 400); }
/** A Ledger line in the trader's voice: naive until the eruption, sober after it (src/data/voice.ts). */
export function logV<K extends LogKey>(s: GameState, key: K, tone: LogEntry['tone'], ...args: Parameters<(typeof LOG_VOICE)[K]['before']>) {
  const v = LOG_VOICE[key][s.world.flags.erupted ? 'after' : 'before'] as (...a: unknown[]) => string;
  log(s, v(...args), tone);
}
export function here(s: GameState) { return C.locs[s.player.location]; }
