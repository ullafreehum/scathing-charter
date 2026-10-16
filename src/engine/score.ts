import { C } from '../data';
import type { GameState } from './types';
import { cargoValue } from './market';

export function depositsTotal(s: GameState): number {
  let t = 0;
  for (const v of Object.values(s.deposits)) t += v;
  for (const f of s.frozen) t += f.amount * f.ratio;
  return t;
}
export function netWorth(s: GameState): number {
  return Math.round(s.player.cash + depositsTotal(s) + cargoValue(s) - (s.note.cleared ? 0 : s.note.balance));
}

export const WEALTH_TITLES: [number, string][] = [
  [0, 'Ash-Eater'], [2000, 'Scrib-Peddler'], [10000, 'Guar-Cart Trader'], [40000, 'Factor of the Inner Sea'],
  [120000, 'Writ-Holder of Narsis'], [Infinity, 'Merchant-Prince of the Red Year'],
];
export function wealthTitle(nw: number): string {
  for (const [lim, name] of WEALTH_TITLES) if (nw < lim) return name;
  return WEALTH_TITLES[WEALTH_TITLES.length - 1][1];
}
export function conductTitles(s: GameState): string[] {
  const t: string[] = [];
  if (s.player.mercy >= 60) t.push("Saint's Ledger");
  if (s.player.profiteering >= 3000) t.push('Famine-Fattened');
  if (s.achievements.includes('unbowed')) t.push('Unbowed by the Tong');
  if (s.achievements.includes('witness')) t.push('Witness at Scathing Bay');
  if (s.stats.smuggled >= 50) t.push('Smuggler of the Bitter Coast');
  return t;
}

const PROVINCES: Record<string, string> = { vvardenfell: 'Morrowind', mainland: 'Morrowind', solstheim: 'Skyrim', skyrim: 'Skyrim', cyrodiil: 'Cyrodiil', blackmarsh: 'Black Marsh', elsweyr: 'Elsweyr' };

/** Achievement predicates; definitions (names/text) live in src/data/achievements.ts. */
export function checkAchievements(s: GameState): void {
  const nw = netWorth(s);
  const provinces = new Set(s.stats.visited.map(l => PROVINCES[C.locs[l].region]));
  const tests: Record<string, () => boolean> = {
    'first-profit': () => s.stats.profit > 0,
    'note-cleared': () => s.note.cleared,
    unbowed: () => s.note.cleared && !s.world.fired.includes('red-year-eruption'),
    'five-provinces': () => provinces.size >= 5,
    licensed: () => s.player.licence && s.player.backgroundId !== 'lukiul',
    bookworm: () => s.player.books.length >= 5,
    lorekeeper: () => s.codex.length >= 60,
    loremaster: () => s.codex.length >= 140,
    frostmoth: () => s.stats.visited.includes('fort-frostmoth'),
    smuggler: () => s.stats.smuggled >= 50,
    saint: () => s.player.mercy >= 60,
    profiteer: () => s.player.profiteering >= 3000,
    blade: () => s.stats.fightsWon >= 5,
    'ten-thousand': () => nw >= 10000,
    'merchant-prince': () => nw >= 100000,
    relief: () => s.stats.reliefDelivered >= 3,
    survivor: () => s.over?.reason === 'calendar' && s.day >= s.endDay && s.mode === 'red-year',
    chronicler: () => s.mode === 'long-chronicle' && s.over?.reason === 'calendar',
    contractor: () => s.stats.contractsDone >= 10,
  };
  for (const [id, f] of Object.entries(tests)) {
    if (!s.achievements.includes(id) && f()) { s.achievements.push(id); s.inbox.push({ kind: 'achievement', id }); }
  }
}
