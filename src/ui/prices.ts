// Reading the player's price book (GameState.seen): what they last saw, where, and how long ago.
import { C } from '../data';
import { quotes, type GameState } from '../engine';

export interface Seen { loc: string; price: number; age: number }

/** Highest sale price seen for a good anywhere except `exclude`. */
export function bestSeenSell(g: GameState, good: string, exclude: string): Seen | null {
  let best: Seen | null = null;
  for (const [loc, p] of Object.entries(g.seen ?? {})) {
    const price = p.sell[good];
    if (loc === exclude || price === undefined || g.world.status[loc] === 'closed') continue;
    if (!best || price > best.price) best = { loc, price, age: g.day - p.day };
  }
  return best;
}

export interface DestinationOutlook {
  age: number;
  cargoThere: number; cargoHere: number; unsellable: number;
  runs: { good: string; gain: number }[];
}

/** What the price book says about a destination: your cargo's value there, and goods to carry from here. */
export function outlook(g: GameState, dest: string): DestinationOutlook | null {
  const p = g.seen?.[dest];
  if (!p) return null;
  const here = quotes(g, g.player.location);
  let cargoThere = 0, cargoHere = 0, unsellable = 0;
  for (const [good, lot] of Object.entries(g.player.cargo)) {
    const there = p.sell[good];
    if (there === undefined) unsellable += lot.qty; else cargoThere += there * lot.qty;
    cargoHere += (here.find(q => q.good === good)?.sell ?? 0) * lot.qty;
  }
  const runs = here.filter(q => q.buy !== null && p.sell[q.good] !== undefined)
    .map(q => ({ good: q.good, gain: Math.round(p.sell[q.good] - q.buy!) }))
    .filter(r => r.gain > 0)
    .sort((a, b) => b.gain / C.goods[b.good].weight - a.gain / C.goods[a.good].weight)
    .slice(0, 3);
  return { age: g.day - p.day, cargoThere: Math.round(cargoThere), cargoHere: Math.round(cargoHere), unsellable, runs };
}

export const ago = (days: number) => (days <= 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`);
