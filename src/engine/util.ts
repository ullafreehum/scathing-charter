// Small helpers shared by the engine's action modules.
import { C } from '../data';
import type { GameState, LogEntry } from './types';

export function unlock(s: GameState, id: string) { if (C.codex[id] && !s.codex.includes(id)) s.codex.push(id); }
export function log(s: GameState, text: string, tone: LogEntry['tone'] = 'neutral') { s.log.push({ day: s.day, text, tone }); if (s.log.length > 400) s.log.splice(0, s.log.length - 400); }
export function here(s: GameState) { return C.locs[s.player.location]; }
