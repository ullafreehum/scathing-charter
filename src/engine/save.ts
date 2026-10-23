// Save serialisation with schema versioning and ordered migrations. Storage itself lives in src/save/.
import type { EncounterKind, GameState, ScrollId } from './types';
import { choicesFor } from './encounters';

export const SCHEMA_VERSION = 8;
type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;
/** MIGRATIONS[n] upgrades a save from version n to n+1. */
export const MIGRATIONS: Record<number, Migration> = {
  // 0 → 1: pre-release saves had no news feed or heard-rumour list.
  0: raw => {
    const world = (raw.world ?? {}) as Record<string, unknown>;
    return { ...raw, world: { news: [], ...world }, heard: raw.heard ?? [], schemaVersion: 1 };
  },
  // 1 → 2: the player's price book. Old saves start with it empty; it fills as you visit markets.
  1: raw => ({ ...raw, seen: raw.seen ?? {}, schemaVersion: 2 }),
  // 2 → 3: smuggling heat (starts at 0).
  2: raw => ({ ...raw, player: { heat: 0, ...(raw.player as Record<string, unknown>) }, schemaVersion: 3 }),
  // 3 → 4: the Scathing Charter and its warehouse.
  // 4 → 5 (0.10): one strongbox per city instead of house branches ("hlaalu:balmora" → "balmora"), new endings.
  4: raw => {
    const byCity = <T,>(rec: Record<string, T>, merge: (a: T, b: T) => T) => {
      const out: Record<string, T> = {};
      for (const [k, v] of Object.entries(rec ?? {})) { const c = k.includes(':') ? k.split(':')[1] : k; out[c] = c in out ? merge(out[c], v) : v; }
      return out;
    };
    const world = raw.world as Record<string, unknown>;
    const branches = byCity(world.branches as Record<string, 'open' | 'closed'>, (a, b) => (a === 'open' || b === 'open' ? 'open' : 'closed'));
    // Endings are now win, mark or retire; indenture is gone (a runaway debt now ends the run at 6x).
    const kind = { charter: 'win', tong: 'mark', trade: 'retire', retire: 'retire' } as Record<string, string>;
    const ending = raw.ending as { kind: string } | undefined;
    const rest = { ...raw }; delete rest.indentured;
    rest.achievements = ((raw.achievements as string[]) ?? []).filter(a => a !== 'bookworm'); // books are found, not bought
    return { ...rest, ...(ending ? { ending: { ...ending, kind: kind[ending.kind] ?? 'retire' } } : {}), deposits: byCity(raw.deposits as Record<string, number>, (a, b) => a + b), world: { ...world, branches }, schemaVersion: 5 };
  },
  // 5 → 6 (0.10): crossing cards print their stakes; a card left open in a save gets the new choice set.
  5: raw => {
    const p = raw.pending as { kind: EncounterKind } | null | undefined;
    if (!p) return { ...raw, schemaVersion: 6 };
    const scrolls = ((raw.player as Record<string, unknown>).scrolls ?? {}) as Partial<Record<ScrollId, number>>;
    return { ...raw, pending: { ...p, choices: choicesFor(p.kind, scrolls) }, schemaVersion: 6 };
  },
  // 6 → 7 (0.10): a charter tier must be held a while before the next (charter.boughtDay). Older saves have no date,
  // so the tiers they hold count as held long enough: nothing to change but the version.
  6: raw => ({ ...raw, schemaVersion: 7 }),
  // 7 → 8 (0.10.6): the day each rumour was heard, for the end screen. Rumours heard earlier have no day.
  7: raw => ({ ...raw, heardDay: raw.heardDay ?? {}, schemaVersion: 8 }),
  3: raw => ({ ...raw, charter: raw.charter ?? { tier: 0, paid: 0, renewDue: null, renewed: false, nextDividend: null, dividends: 0 }, warehouse: raw.warehouse ?? {}, schemaVersion: 4 }),
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
