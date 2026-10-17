// Plain-language guidance derived from the game state: the "next step" strip and travel warnings.
import { C } from '../data';
import { holidayAt, holidayOn, legalityAt, marketOpen, pressure, shortDate, type GameState } from '../engine';
import type { Tab } from '../store/game';

export interface Hint { text: string; tab?: Tab; warn?: boolean }

const payPlaces = (g: GameState) => [g.note.seat, ...g.note.agents].map(l => C.locs[l].name).join(' or ');

/** Days until the Tong starts sending collectors (0 if it already has). */
export function daysUntilCollectors(g: GameState): number {
  const n = g.note;
  if (n.cleared) return Infinity;
  if (pressure(g) > 0) return 0;
  const late = 61 - (g.day - n.lastPaymentDay);
  let bal = n.balance, d = 0;
  while (bal / n.original <= 1.5 && d < late) { bal *= 1 + n.rate; d++; }
  return Math.max(1, Math.min(late, d));
}

export function nextSteps(g: GameState): Hint[] {
  const out: Hint[] = [];
  const loc = g.player.location;
  if (g.pending || g.over || loc === 'road' || !C.locs[loc]) return out;
  const canPay = !g.note.cleared && (loc === g.note.seat || g.note.agents.includes(loc));
  if (g.player.health < 35) out.push({ warn: true, text: `Your health is low (${g.player.health}). Heal at a temple or shrine, or rest.`, tab: 'outfitter' });
  if (!g.note.cleared) {
    const where = canPay ? 'here, in the Bank tab' : `in ${payPlaces(g)}`;
    if (pressure(g) > 0) out.push({ warn: true, text: `The Tong has sent collectors after you. Pay some of your debt ${where}.`, tab: canPay ? 'bank' : 'map' });
    else {
      const d = daysUntilCollectors(g);
      if (d <= 21) out.push({ warn: d <= 7, text: `In about ${d} day${d > 1 ? 's' : ''} the Tong starts sending collectors. Pay some debt ${where} to reset the clock.`, tab: canPay ? 'bank' : 'map' });
    }
  }
  const ch = g.charter; const offices = C.charter.offices.map(o => C.locs[o].name).join(', ');
  const atOffice = C.charter.offices.includes(loc);
  if (ch.renewDue !== null) {
    const left = ch.renewDue - g.day;
    out.push({ warn: true, text: `Renew your charter by ${shortDate(ch.renewDue)} (${left} day${left === 1 ? '' : 's'} left): ${Math.round(ch.paid * C.charter.renewalFee)} septims in ${offices}, or lose your highest tier.`, tab: atOffice ? 'bank' : 'map' });
  } else if (g.world.flags.relief && g.note.cleared) {
    const next = C.charter.tiers[ch.tier];
    if (next && g.player.cash >= next.price) out.push({ text: `You can afford the ${next.name} (${next.price.toLocaleString('en-US')} septims), sold in ${offices}.`, tab: atOffice ? 'bank' : 'map' });
    else if (next && ch.tier === 0) out.push({ text: `The Grand Council now sells the Scathing Charter, rights to rebuild the Vivec region. First tier: ${next.price.toLocaleString('en-US')} septims (Bank tab).`, tab: 'bank' });
  }
  for (const c of g.contracts) {
    const name = C.goods[c.good].name;
    if (c.destination === loc && (g.player.cargo[c.good]?.qty ?? 0) >= c.qty) out.push({ text: `You can deliver your contract here: ${c.qty} ${name} (Market tab).`, tab: 'market' });
    else {
      const left = c.deadline - g.day;
      if (left <= 10) out.push({ warn: left <= 3, text: `Contract: ${c.qty} ${name} to ${C.locs[c.destination].name} by ${shortDate(c.deadline)} (${left} day${left === 1 ? '' : 's'} left).` });
    }
  }
  const hol = holidayAt(g, loc);
  if (!marketOpen(g, loc)) out.push({ text: hol?.marketClosed ? `The market is closed today for ${hol.name}. Rest a day or travel on.` : 'Nobody trades here any more. Travel on.', tab: 'map' });
  if ((loc === 'lilmoth' || loc === 'stormhold') && !g.player.licence) out.push({ warn: true, text: 'Foreigners need a trade licence here. Buy one in the Shop & Temple tab in Lilmoth, or in Leyawiin.', tab: 'outfitter' });
  if (g.stats.trades === 0 && !Object.keys(g.player.cargo).length) out.push({ text: 'Start simple: buy a good marked ▼ (cheap) in the Market, then travel and sell it where it costs more.', tab: 'market' });
  return out.slice(0, 2);
}

/** Things worth knowing before taking a route. `days` is travel days (before the Long Chronicle time scale). */
export function travelWarnings(g: GameState, dest: string, days: number): string[] {
  const w: string[] = [];
  const L = C.locs[dest]; const st = g.world.status[dest];
  if (Object.keys(g.player.cargo).some(id => legalityAt(g, dest, id) === 'contraband')) {
    w.push(`You carry goods that are contraband there; customs may search you (guards ${L.enforcement}/5).`);
  }
  if (st === 'besieged') w.push('The town is under siege.');
  if (st === 'sacked') w.push('The town was recently sacked.');
  const arrive = g.day + days * g.timeScale;
  const hol = holidayOn(arrive, dest);
  if (hol?.marketClosed) w.push(`Its market is closed on the day you arrive (${hol.name}).`);
  if ((dest === 'lilmoth' || dest === 'stormhold') && !g.player.licence) w.push('Foreigners need a trade licence to trade there.');
  for (const c of g.contracts) if (c.destination === dest && arrive > c.deadline) w.push(`You would arrive after your contract deadline (${shortDate(c.deadline)}).`);
  return w;
}
