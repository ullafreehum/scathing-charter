// Prices, quotes and fair value. Pure functions of GameState + content.
import { C } from '../data';
import type { GameState, GoodCategory, Holiday, Legality, LocStatus, Merchant } from './types';
import { dateOf } from './calendar';

export const DEPTH: Record<GoodCategory, number> = { food: 260, drink: 160, material: 140, luxury: 36, narcotic: 60, magic: 70, medicine: 110 };
export const SELL_FACTOR = 0.9;

const STATUS_MULT: Partial<Record<LocStatus, Partial<Record<GoodCategory, number>>>> = {
  uneasy: { food: 1.08, medicine: 1.1 },
  ruined: { food: 2.2, medicine: 2.4, material: 1.9, drink: 1.4, luxury: 0.6, magic: 0.8 },
  rebuilding: { food: 1.5, medicine: 1.5, material: 1.8, drink: 1.2 },
  'refugee-swollen': { food: 1.45, medicine: 1.5, drink: 1.2, luxury: 0.85 },
  besieged: { food: 1.9, medicine: 2.1, material: 1.3, luxury: 0.6 },
  sacked: { food: 2.0, medicine: 2.2, luxury: 0.45, magic: 0.6 },
  occupied: { food: 1.6, medicine: 1.7, luxury: 0.5 },
  camp: { food: 2.0, medicine: 2.2, material: 1.6, drink: 1.3, luxury: 0.7, magic: 0.85 },
};

/** What buying `qty` at a unit price costs: each extra unit in one purchase pushes the price up a little.
 *  trade() charges exactly this, so the UI's maximum always matches the bill. */
export function bulkBuyTotal(price: number, qty: number, depth: number): number {
  return Math.round(price * qty * (1 + qty / (2 * depth)));
}
/** The most you can buy in one go: limited by cash (at the bulk price) and free cargo space. */
export function maxBuyQty(price: number | null, depth: number, cash: number, freeWeight: number, weight: number): number {
  if (!price || price <= 0) return 0;
  let lo = 0, hi = Math.max(0, Math.floor(freeWeight / weight));
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (bulkBuyTotal(price, mid, depth) <= cash) lo = mid; else hi = mid - 1; }
  return lo;
}

/** Daily recovery of market saturation toward normal (1 = none). Higher = markets remember your trades longer. */
export const SAT_RECOVERY = 0.97;
/** Days until a market you flooded or bought out is back within 5% of its normal price. */
export function satRecoveryDays(sat: number): number {
  const gap = Math.abs(sat - 1);
  if (gap <= 0.05) return 0;
  let d = 0; for (let g = gap; g > 0.05 && d < 400; g *= SAT_RECOVERY) d++;
  return d;
}

export function legalityAt(s: GameState, loc: string, good: string): Legality {
  const j = s.world.jurisdiction[loc];
  return s.world.legal[j]?.[good] ?? C.goods[good].legality[j];
}

export function holidayAt(s: GameState, loc: string): Holiday | undefined { return holidayOn(s.day, loc); }
/** The holiday (if any) at a place on a given day: used to warn about closed markets on arrival. */
export function holidayOn(day: number, loc: string): Holiday | undefined {
  const d = dateOf(day);
  const region = C.locs[loc]?.region;
  return C.holidays.find(h => h.month === d.month + 1 && h.day === d.dom && (h.scope === 'all' || (region !== undefined && h.scope.includes(region))));
}

export function marketOpen(s: GameState, loc: string): boolean {
  const st = s.world.status[loc];
  if (st === 'closed') return false;
  return !holidayAt(s, loc)?.marketClosed;
}

export function historyMult(s: GameState, loc: string, good: string): number {
  let m = 1;
  for (const pm of s.world.priceMods) {
    if (s.day < pm.start || s.day >= pm.end) continue;
    if (pm.goods !== 'all' && !pm.goods.includes(good)) continue;
    if (!pm.locs.includes(loc)) continue;
    const t = (s.day - pm.start) / (pm.end - pm.start);
    m *= 1 + (pm.mult - 1) * (1 - t);
  }
  return m;
}

/** Underlying market price before merchant margins, or null if not traded here. */
export function midPrice(s: GameState, loc: string, good: string): number | null {
  const L = C.locs[loc];
  const tend = L.tendencies[good];
  if (tend === undefined || s.world.status[loc] === 'closed') return null;
  const g = C.goods[good];
  const cell = s.markets[loc][good];
  const status = STATUS_MULT[s.world.status[loc]]?.[g.category] ?? 1;
  return g.base * tend * cell.drift * cell.shock * cell.sat * historyMult(s, loc, good) * status;
}

function handles(m: Merchant, cat: GoodCategory) { return m.categories === 'all' || m.categories.includes(cat); }

export interface Quote {
  good: string; legality: Legality; stock: boolean;
  buy: number | null; buyFrom?: string;
  sell: number | null; sellTo?: string; sellNote?: string;
  mid: number;
}

function repMod(s: GameState, loc: string): number {
  const fid = factionKey(s.world.faction[loc]);
  const rep = fid ? s.player.rep[fid] : 0;
  return rep / 1250;
}
export function factionKey(name: string | undefined): keyof GameState['player']['rep'] | undefined {
  if (!name) return undefined;
  const n = name.toLowerCase();
  if (n.includes('hlaalu')) return 'hlaalu';
  if (n.includes('redoran')) return 'redoran';
  if (n.includes('telvanni')) return 'telvanni';
  if (n.includes('east empire')) return 'eec';
  if (n.includes('legion') || n.includes('elder council') || n.includes('count') || n.includes('jarl') || n.includes('king of skyrim')) return 'legion';
  if (n.includes('an-xileel')) return 'anxileel';
  if (n.includes('temple') || n.includes('indoril')) return 'temple';
  return undefined;
}

export function quotes(s: GameState, loc: string): Quote[] {
  const L = C.locs[loc];
  const open = marketOpen(s, loc);
  const hol = holidayAt(s, loc);
  const bg = C.backgrounds[s.player.backgroundId];
  const rm = repMod(s, loc);
  const out: Quote[] = [];
  for (const good of Object.keys(L.tendencies)) {
    const g = C.goods[good];
    const mid = midPrice(s, loc, good);
    if (mid === null) continue;
    const legality = legalityAt(s, loc, good);
    const cell = s.markets[loc][good];
    const holMult = hol?.buyMult && (!hol.categories || hol.categories.includes(g.category)) && (!hol.goods || hol.goods.includes(good)) ? hol.buyMult : 1;
    const bgBuy = bg.buyMods?.[good] ?? 1;
    let buy: number | null = null, buyFrom: string | undefined;
    let sell: number | null = null, sellTo: string | undefined, sellNote: string | undefined;
    for (const m of L.merchants) {
      if (!handles(m, g.category) && !(m.fence && legality !== 'legal')) continue;
      const canDeal = legality === 'legal' || m.fence || (legality === 'restricted' && m.eec);
      if (!canDeal) continue;
      if (open && cell.stock) {
        const p = Math.max(1, Math.round(mid * m.lean * holMult * bgBuy * (1 - rm) * (legality === 'restricted' && m.eec ? 1.12 : 1)));
        if (buy === null || p < buy) { buy = p; buyFrom = m.name; }
      }
      if (open) {
        let f = SELL_FACTOR * m.lean * holMult * (1 - L.duty) * (1 + rm);
        if (legality === 'restricted' && m.eec && !m.fence) f *= 0.75;
        if (m.fence && legality !== 'legal') f *= 1 + (bg.fenceBonus ?? 0);
        const p = Math.max(1, Math.round(mid * f));
        if (sell === null || p > sell) {
          sell = p; sellTo = m.name;
          sellNote = legality === 'restricted' ? (m.eec && !m.fence ? 'EEC licensed price' : 'black market: risk of a sting') : legality === 'contraband' ? 'fence only' : undefined;
        }
      }
    }
    // Invariant: no same-town arbitrage, whatever discounts or reputation apply.
    if (buy !== null && sell !== null && sell >= buy * 0.97) sell = Math.max(1, Math.floor(buy * 0.97));
    out.push({ good, legality, stock: cell.stock, buy, buyFrom, sell, sellTo, sellNote, mid });
  }
  return out;
}

/** Median current mid price across open markets; contraband discounted. Used for scoring. */
export function fairValue(s: GameState, good: string): number {
  const ps: number[] = [];
  for (const L of C.locList) {
    const p = midPrice(s, L.id, good);
    if (p !== null) ps.push(p);
  }
  if (!ps.length) return C.goods[good].base;
  ps.sort((a, b) => a - b);
  const med = ps[Math.floor(ps.length / 2)];
  const anyContraband = Object.values(C.goods[good].legality).filter(l => l === 'contraband').length >= 4;
  return med * (anyContraband ? 0.6 : 1);
}

export function cargoWeight(s: GameState): number {
  let w = 0;
  for (const [g, lot] of Object.entries(s.player.cargo)) w += lot.qty * C.goods[g].weight;
  return w;
}
export function capacity(s: GameState): number {
  return (C.gear[s.player.conveyance]?.capacity ?? 60) + s.player.porters * 12;
}
export function cargoValue(s: GameState): number {
  let v = 0;
  for (const [g, lot] of Object.entries(s.player.cargo)) v += lot.qty * fairValue(s, g);
  return v;
}
