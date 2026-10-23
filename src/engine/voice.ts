// What the game says to you in other people's voices (0.10.6): merchants who remember you, Drelloth, the end-screen
// look back, and the paragraph for a shut market. Pure readers of GameState; the words live in src/data/voice.ts.
import { C } from '../data';
import { DRELLOTH, HOLIDAY_CLOSED, KNEW, RUIN_GENERIC } from '../data/voice';
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

/** Gavas Drelloth on the Bank tab (or `short` for the phone status strip), by how hard the Tong presses and how you have paid. */
export function drellothLine(s: GameState, short = false): string {
  const n = s.note, pr = pressure(s), paid = n.lastPaymentDay > 0, half = !!n.halved;
  const key = n.cleared ? 'cleared' : pr >= 2 ? `p${Math.min(3, pr)}.${paid ? 'paid' : 'never'}`
    : `p${pr}.${pr === 0 && n.extended > 0 ? 'borrowed' : half ? 'half' : paid ? 'paid' : 'never'}`;
  const l = DRELLOTH[key];
  return short ? l.short : l.long;
}

const WHERE: Record<string, string> = { vivec: 'Vivec', ebonheart: 'Ebonheart' };
const townName = (id: string) => WHERE[id] ?? C.locs[id]?.name ?? id;

/** The end-screen paragraph about the eruption: what you were told and what you left behind. Null if you were not there. */
export function knewParagraph(s: GameState): string | null {
  const lost = s.stats.lostAtBaarDau;
  const ev = C.history.find(h => h.id === 'red-year-eruption');
  if (!lost || !ev?.foreshadow) return null;
  const n = ev.foreshadow.rumors.filter(id => s.heard.includes(id) && (s.heardDay[id] ?? -1) < ev.day).length;
  const names = [...new Set(lost.depositsAt ?? [])].map(townName);
  const where = names.length > 2 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names.join(' and ');
  return `${KNEW.a(n)} ${KNEW.b(n, Math.round(lost.deposits), lost.cargo, where, townName(lost.cargoAt ?? ''))}`;
}

/** The dated line for a town in a state that has text (ruin, camp, siege...), or null for an ordinary town. */
function statusParagraph(s: GameState, loc: string): string | null {
  const L = C.locs[loc]; if (!L) return null;
  const st = s.world.status[loc];
  const t = L.ruinText?.[st] ?? RUIN_GENERIC[st];
  return t ? `${L.name}, ${shortDate(s.day)}. ${t}` : null;
}

/** The paragraph that replaces the goods list when the stalls are shut (status closed, or a holiday), else null. */
export function closedParagraph(s: GameState, loc: string): string | null {
  const L = C.locs[loc]; if (!L) return null;
  if (s.world.status[loc] === 'closed') return statusParagraph(s, loc);
  const hol = holidayAt(s, loc);
  return hol?.marketClosed ? HOLIDAY_CLOSED(L.name, shortDate(s.day), hol.name) : null;
}

/** A town's own state in words, shown above its market while trade goes on (not for a closed one). */
export function ruinLine(s: GameState, loc: string): string | null {
  return s.world.status[loc] === 'closed' ? null : statusParagraph(s, loc);
}
