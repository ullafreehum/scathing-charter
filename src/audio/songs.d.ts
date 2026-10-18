// Types for songs.js, Sorcerer's songs 2-4 of "Ash & Ebony" (kept as plain JS, as written).
import type { Score } from './score';
export const SONGS: readonly string[];
export function createScore(ctx: AudioContext, out: AudioNode, opts?: { manual?: boolean; song?: 0 | 1 | 2 }): Score;
