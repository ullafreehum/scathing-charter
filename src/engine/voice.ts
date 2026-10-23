// What the game says to you in other people's voices (0.10.6): merchants who remember you, Drelloth, the end-screen
// look back, and the paragraph for a shut market. Pure readers of GameState; the words live in src/data/voice.ts.
import { C } from '../data';
import { CLOSED, DRELLOTH, KNEW } from '../data/voice';
import type { GameState, Merchant } from './types';
import { shortDate } from './calendar';
import { holidayAt } from './market';
import { pressure } from './encounters';

/** What a merchant says: Famine-Fattened first, then a saint, a flooded market, a regular, else the usual line. */
export function merchantLine(s: GameState, m: Merchant, loc: string): string {
  const l = m.lines;
  if (l?.famine && s.player.profiteering >= 3000) return l.famine;
  if (l?.saint && s.player.mercy >= 60) return l.saint;
  if (l?.flooded) {
    const cells = s.markets[loc] ?? {};
    if (Object.entries(cells).some(([good, c]) => c.sat < 0.85 && (m.categories === 'all' || m.categories.includes(C.goods[good]?.category)))) return l.flooded;
  }
  if (l?.regular && (s.stats.visits?.[loc] ?? 0) >= 4) return l.regular;
  return m.line;
}

/** Gavas Drelloth on the Bank tab, by how hard the Tong presses and how you have paid. */
export function drellothLine(s: GameState): string {
  const n = s.note;
  if (n.cleared) return DRELLOTH.cleared;
  const pr = pressure(s);
  if (pr >= 3) return DRELLOTH.killers;
  if (pr === 2) return DRELLOTH.collectors;
  if (pr === 1) return n.extended > 0 ? DRELLOTH.lateAgain : DRELLOTH.pressed;
  if (n.lastPaymentDay > 0) return n.balance < n.original / 2 ? DRELLOTH.halved : DRELLOTH.paying;
  return DRELLOTH.patient;
}

/** The end-screen paragraph about the eruption: what you were told and what you left behind. Null if you were not there. */
export function knewParagraph(s: GameState): string | null {
  const lost = s.stats.lostAtBaarDau;
  const ev = C.history.find(h => h.id === 'red-year-eruption');
  if (!lost || !ev?.foreshadow) return null;
  const warned = ev.foreshadow.rumors.filter(id => s.heard.includes(id) && (s.heardDay[id] ?? -1) < ev.day).length;
  const first = warned > 0 ? KNEW.warned(warned) : KNEW.nobody;
  const second = lost.deposits > 0 ? KNEW.lost(Math.round(lost.deposits)) : KNEW.kept;
  return `${first} ${second}${lost.cargo > 0 ? KNEW.cargo(lost.cargo) : ''}`;
}

/** The dated paragraph that replaces the goods list when the stalls are shut, or null if the market is open. */
export function closedParagraph(s: GameState, loc: string): string | null {
  const L = C.locs[loc]; if (!L) return null;
  const date = shortDate(s.day), st = s.world.status[loc];
  if (st === 'closed') return L.ruinText?.closed ?? CLOSED.closed(L.name, date);
  const hol = holidayAt(s, loc);
  return hol?.marketClosed ? CLOSED.holiday(L.name, date, hol.name) : null;
}

/** A ruined town's own line (when it has one), shown quietly above its market. */
export function ruinLine(s: GameState, loc: string): string | null {
  const L = C.locs[loc], st = s.world.status[loc];
  const t = L?.ruinText?.[st];
  return t ? `${L.name}, ${shortDate(s.day)}. ${t}` : null;
}
