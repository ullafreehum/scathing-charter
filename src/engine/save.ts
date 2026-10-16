// Save serialisation with schema versioning and ordered migrations. Storage itself lives in src/save/.
import type { GameState } from './types';

export const SCHEMA_VERSION = 1;
type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;
/** MIGRATIONS[n] upgrades a save from version n to n+1. */
export const MIGRATIONS: Record<number, Migration> = {
  // 0 → 1: pre-release saves had no news feed or heard-rumour list.
  0: raw => {
    const world = (raw.world ?? {}) as Record<string, unknown>;
    return { ...raw, world: { news: [], ...world }, heard: raw.heard ?? [], schemaVersion: 1 };
  },
};

export class SaveError extends Error {}

export function serialize(s: GameState): string { return JSON.stringify(s); }

export function migrate(input: unknown): GameState {
  if (!input || typeof input !== 'object') throw new SaveError('Not a save file.');
  let raw = input as Record<string, unknown>;
  let v = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;
  if (v > SCHEMA_VERSION) throw new SaveError(`This save comes from a newer version of the game (schema ${v}).`);
  while (v < SCHEMA_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) throw new SaveError(`No migration from schema ${v}.`);
    raw = m(raw); v++;
  }
  for (const k of ['seed', 'player', 'note', 'world', 'markets', 'rng', 'day']) {
    if (!(k in raw)) throw new SaveError(`Save is missing "${k}".`);
  }
  return raw as unknown as GameState;
}

export function deserialize(text: string): GameState {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new SaveError('The file is not valid JSON.'); }
  return migrate(parsed);
}
