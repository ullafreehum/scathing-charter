// Types for score.js, Sorcerer's procedural score "Ash & Ebony" (kept as plain JS, as written).
export interface Score {
  start(vol?: number): void;
  setVolume(v: number): void;
  /** 0 calm (before the eruption), 1 after Baar Dau falls, 2 duel */
  setMood(m: 0 | 1 | 2): void;
  stop(): void;
}
export function createScore(ctx: AudioContext, out: AudioNode, opts?: { manual?: boolean }): Score;
