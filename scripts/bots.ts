// The archetype bots shared by the balance scripts (balance.ts, focus-balance.ts). No output, no side effects.
import { C } from '../src/data';
import { CARD, jobsAt,
  newGame, step, quotes, routeOptions, capacity, cargoWeight, power, D, DEPTH, charterPrice, charterReadyDay, netWorth,
  type Action, type Difficulty, type GameState, type RouteOption,
} from '../src/engine';

export type Strat = 'idle' | 'greedy' | 'smuggler' | 'prudent' | 'contractor' | 'oracle';
export const ERUPT = D(5, 2, 3);
const FAMINE = new Set(['saltrice', 'healing-draughts', 'timber', 'kwama-eggs']);
export interface Mem { heatPeak: number; profit: Record<string, number>; legs: Record<string, number>; bought: Record<string, string>; clearedDay: number | null; peakDebt: number;
  /** crossing-card choices taken, as "kind:choice" → count */
  cards: Record<string, number>;
  /** first day the bot had under 20 septims and nothing to sell, and whether it got back above 200 */
  brokeDay: number | null; recovered: boolean;
  /** economy log (focus-balance.ts): see Track */
  track: Track }

/** What the economy designer reads per run. Filled by act() while play() runs. */
export interface Track {
  /** every journey: day, route risk, whether it was a 1-day Vvardenfell hop, whether a card came up, trading profit so far */
  trips: { day: number; risk: number; shortHop: boolean; card: boolean; profit: number }[];
  /** septims paid to the Tong, and every loan (day, amount) */
  paid: number; loans: { day: number; amount: number }[];
  /** profit from sales into a price spike (cell shock above 1.3), and from all sales */
  spikeProfit: number; saleProfit: number;
  /** day each charter tier was bought, and cash on chosen days */
  tierDay: Record<number, number>; cashOn: Record<number, number>;
  /** net worth on WORTH_DAYS */
  worthOn: Record<number, number>;
}
export const CASH_DAYS = [30, 398, 427] as const;
export const WORTH_DAYS = [600, 800, 1000] as const;
let tracking: Track | null = null;

export function act(s: GameState, a: Action): GameState {
  const r = step(s, a); if (r.error) return s;
  const n = r.state, t = tracking;
  if (t) {
    if (a.t === 'pay') t.paid += s.player.cash - n.player.cash;
    else if (a.t === 'borrow') t.loans.push({ day: s.day, amount: n.player.cash - s.player.cash });
    else if (a.t === 'charter') t.tierDay[n.charter.tier] = n.day;
    else if (a.t === 'sell') {
      const gain = n.stats.profit - s.stats.profit; t.saleProfit += gain;
      if ((s.markets[s.player.location]?.[a.good]?.shock ?? 1) > 1.3) t.spikeProfit += gain;
    } else if (a.t === 'travel') {
      const route = C.routeList.find(x => x.id === a.route)!; const mode = route.modes[a.mode];
      const shortHop = mode.days === 1 && C.locs[route.a].region === 'vvardenfell' && C.locs[route.b].region === 'vvardenfell';
      t.trips.push({ day: s.day, risk: mode.risk, shortHop, card: !!n.pending, profit: n.stats.profit });
    }
    for (const d of CASH_DAYS) if (s.day < d && n.day >= d) t.cashOn[d] = n.player.cash;
    for (const d of WORTH_DAYS) if (s.day < d && n.day >= d) t.worthOn[d] = netWorth(n);
  }
  return n;
}

// next hop toward a destination over open routes (BFS)
function nextHop(s: GameState, to: string): string | null {
  const open = C.routeList.filter(r => !((s.world.routes[r.id]?.closed) ?? r.closed) && s.world.status[r.a] !== 'closed' && s.world.status[r.b] !== 'closed');
  const prev: Record<string, string> = {}; const q = [s.player.location]; const seen = new Set(q);
  while (q.length) { const x = q.shift()!; if (x === to) break; for (const r of open) { const y = r.a === x ? r.b : r.b === x ? r.a : null; if (y && !seen.has(y)) { seen.add(y); prev[y] = x; q.push(y); } } }
  if (!seen.has(to) || to === s.player.location) return null;
  let cur = to; while (prev[cur] !== s.player.location) cur = prev[cur];
  return cur;
}

function choose(s: GameState, st: Strat): string {
  const p = s.pending!; const ch = p.choices; const has = (c: string) => ch.includes(c);
  if (p.kind === 'mercy') return st === 'prudent' || st === 'contractor' || st === 'oracle' ? 'at-cost' : has('sell-dear') && st !== 'idle' ? 'sell-dear' : 'pass';
  if (p.kind === 'hazard') return st === 'greedy' || st === 'smuggler' ? 'press-on' : 'wait-out';
  if (p.kind === 'enforcer') return s.player.cash >= CARD.tongPay * 2 ? 'pay-note' : st === 'greedy' || st === 'smuggler' ? 'flee' : 'ask-time';
  if (p.kind === 'opportunity') return st === 'smuggler' || (p.defId === 'buried-caravan') ? 'deal' : 'decline';
  if (p.customs) return has('chameleon') ? 'chameleon' : s.player.cash >= p.bribe * 2 ? 'bribe' : 'declare';
  if (has('fight') && power(s) > p.threat + 2) return 'fight';
  if (has('bribe') && s.player.cash >= p.bribe * 3) return 'bribe';
  if (has('chameleon') && st === 'smuggler') return 'chameleon';
  return 'flee';
}

function sellOff(s: GameState, st: Strat, mem: Mem): GameState {
  const pre = st === 'oracle' && s.day < ERUPT && s.day > ERUPT - 70;
  for (const q of quotes(s, s.player.location)) {
    const lot = s.player.cargo[q.good]; if (!lot || q.sell === null) continue;
    if (pre && FAMINE.has(q.good)) continue; // hoard for the Red Year
    const legalOk = q.legality === 'legal' || st === 'smuggler';
    const stale = lot.qty > 0 && (C.goods[q.good].perishable ?? 0) > 0;
    if (!legalOk) continue;
    if (q.sell >= lot.cost * 1.03 || stale || (st !== 'smuggler' && q.legality !== 'legal')) {
      const before = s.player.cash; const cost = lot.cost * lot.qty;
      const n = act(s, { t: 'sell', good: q.good, qty: lot.qty });
      if (n !== s) {
        const gain = n.player.cash - before - cost; mem.profit[q.good] = (mem.profit[q.good] ?? 0) + gain;
        const leg = `${C.goods[q.good].name}: ${C.locs[mem.bought[q.good] ?? s.player.location]?.name ?? '?'} → ${C.locs[s.player.location].name}`;
        mem.legs[leg] = (mem.legs[leg] ?? 0) + gain; s = n;
      }
    }
  }
  return s;
}

const cushionOf = (st: Strat) => st === 'greedy' ? 3000 : st === 'smuggler' ? 5000 : 10000;
const tierPrice = (s: GameState) => charterPrice(s, (s.charter.tier + 1) as 1 | 2 | 3);
const holdOver = (s: GameState) => charterReadyDay(s) <= s.day;
/** Where a bot saving for the next tier should head: an office once it can pay, else the strongbox holding the rest. */
function charterGoal(s: GameState, st: Strat): string | null {
  if (!s.world.flags.relief || !s.note.cleared || s.charter.tier >= 3 || !holdOver(s)) return null;
  const need = tierPrice(s) + cushionOf(st);
  const near = (to: readonly string[]) => to.filter(x => x === s.player.location || nextHop(s, x)).sort((a, b) => hops(s, a) - hops(s, b))[0] ?? null;
  if (s.player.cash > need) return C.charter.offices.includes(s.player.location) ? null : near(C.charter.offices);
  const banked = Object.entries(s.deposits).filter(([, v]) => v > 0);
  if (banked.length && s.player.cash + banked.reduce((a, [, v]) => a + v, 0) > need) return near(banked.map(([k]) => k).filter(k => k !== s.player.location));
  return null;
}
function hops(s: GameState, to: string): number {
  let n = 0; let x = s; // walk the BFS path; cheap enough for the few targets used
  while (x.player.location !== to && n < 40) { const h = nextHop(x, to); if (!h) return 99; x = { ...x, player: { ...x.player, location: h } }; n++; }
  return n;
}

function upkeep(s: GameState, st: Strat): GameState {
  const loc = s.player.location; const L = C.locs[loc];
  if (s.player.health < 55) s = act(s, { t: 'heal' });
  const atTong = loc === s.note.seat || s.note.agents.includes(loc);
  if (!s.note.cleared && atTong) {
    const keep = st === 'prudent' || st === 'oracle' ? 900 : 1500;
    if (s.player.cash > keep + 200) s = act(s, { t: 'pay', amount: s.player.cash - keep });
  }
  if (st === 'idle') return s;
  if (L?.outfitter) {
    if (s.note.cleared && s.player.conveyance === 'pack-guar' && s.player.cash > 5000) s = act(s, { t: 'gear', id: 'guar-cart' });
    if (s.note.cleared && s.player.conveyance === 'guar-cart' && s.player.cash > 45000) s = act(s, { t: 'gear', id: 'chartered-hold' });
    if (s.player.cash > 2500 && s.player.weapon === 'chitin-dagger') s = act(s, { t: 'gear', id: 'steel-axe' });
    if (st === 'smuggler' && s.player.scrolls.chameleon < 2 && s.player.cash > 600) s = act(s, { t: 'gear', id: 'chameleon' });
  }
  if (s.note.cleared && s.player.cash > 3000 && s.player.porters < 2) s = act(s, { t: 'hire', who: 'porter', delta: 1 });
  // careful bots bank their surplus, except while saving up for the next charter tier
  const saving = s.world.flags.relief && s.charter.tier < 3;
  if ((st === 'prudent' || st === 'oracle') && !saving && s.note.cleared && s.player.cash > 25000 && (loc === 'imperial-city' || loc === 'solitude')) s = act(s, { t: 'deposit', amount: s.player.cash - 15000 });
  // saving for a tier: empty the strongbox here
  if (saving && (s.deposits[loc] ?? 0) > 0 && s.world.branches[loc] === 'open') s = act(s, { t: 'withdraw', amount: s.deposits[loc] });
  if (s.player.location === 'leyawiin' && !s.player.licence && s.player.cash > 2000) s = act(s, { t: 'licence' });
  // the Scathing Charter: renew when asked, buy the next tier when there is a cushion left over
  if (C.charter.offices.includes(loc)) {
    if (s.charter.renewDue !== null) s = act(s, { t: 'renew' });
    const next = C.charter.tiers[s.charter.tier];
    if (next && s.world.flags.relief && s.note.cleared && s.player.cash > tierPrice(s) + cushionOf(st)) s = act(s, { t: 'charter' });
  }
  return s;
}

/** Best quantity given bulk price impact on both ends. */
function bestQty(buy: number, sell: number, depth: number, maxQ: number): { q: number; gain: number } {
  let best = { q: 0, gain: 0 };
  for (let q = 1; q <= maxQ; q += q < 10 ? 1 : 3) {
    const g = q * (sell * Math.max(0.5, 1 - q / (2 * depth)) - buy * (1 + q / (2 * depth)));
    if (g > best.gain) best = { q, gain: g };
  }
  return best;
}

type Buy = { good: string; qty: number };
function plan(s: GameState, st: Strat): { travel: RouteOption; buys: Buy[] } | null {
  const loc = s.player.location;
  const here = quotes(s, loc);
  const oracleFlee = st === 'oracle' && s.day >= ERUPT - 20 && s.day < ERUPT + 2;
  let best: { travel: RouteOption; buys: Buy[]; score: number } | null = null;
  for (const o of routeOptions(s)) {
    if (o.fare > s.player.cash) continue;
    if (oracleFlee && ['vvardenfell', 'solstheim'].includes(C.locs[o.dest].region)) continue;
    const there = quotes(s, o.dest);
    let carry = 0;
    for (const [g, lot] of Object.entries(s.player.cargo)) { const q = there.find(x => x.good === g); if (q?.sell != null) carry += Math.max(0, q.sell - lot.cost) * lot.qty * 0.5; }
    // greedily fill the hold with up to three goods for this destination
    let cash = s.player.cash - o.fare - 30, free = capacity(s) - cargoWeight(s), gainSum = 0; const buys: Buy[] = []; const used = new Set<string>();
    for (let pass = 0; pass < 3; pass++) {
      let pick: { good: string; q: number; gain: number; perStone: number } | null = null;
      for (const q of here) {
        if (q.buy === null || used.has(q.good)) continue;
        const lowProfile = st === 'smuggler' && s.player.heat >= 45; // a wanted smuggler stops buying contraband
        if (q.legality !== 'legal' && (st !== 'smuggler' || lowProfile)) continue;
        const d = there.find(x => x.good === q.good); if (!d || d.sell === null) continue;
        if (d.legality !== 'legal' && (st !== 'smuggler' || lowProfile)) continue;
        const g = C.goods[q.good];
        const sell = st === 'oracle' && FAMINE.has(q.good) && s.day > ERUPT - 70 && s.day < ERUPT ? q.buy * 2.2 : d.sell;
        const maxQ = Math.max(0, Math.min(Math.floor(cash / q.buy), Math.floor(free / g.weight), 120));
        if (maxQ <= 0) continue;
        const bq = bestQty(q.buy, sell, DEPTH[g.category], maxQ);
        if (bq.q > 0 && (!pick || bq.gain > pick.gain)) pick = { good: q.good, q: bq.q, gain: bq.gain, perStone: bq.gain / (bq.q * g.weight) };
      }
      if (!pick) break;
      used.add(pick.good); buys.push({ good: pick.good, qty: pick.q }); gainSum += pick.gain;
      cash -= pick.q * (here.find(x => x.good === pick!.good)!.buy ?? 0) * 1.05; free -= pick.q * C.goods[pick.good].weight;
    }
    let score = (carry + gainSum - o.fare - o.risk * 12) / o.days;
    if (oracleFlee && !['vvardenfell', 'solstheim'].includes(C.locs[o.dest].region)) score += 500;
    if (!best || score > best.score) best = { travel: o, buys, score };
  }
  return best && (best.score > 0 || oracleFlee) ? best : null;
}

export function play(seed: string, st: Strat, difficulty: Difficulty): { s: GameState; mem: Mem } {
  let s = newGame({ seed, backgroundId: st === 'smuggler' ? 'caravaner' : 'hlaalu-bastard', name: 'Bot', difficulty });
  const mem: Mem = { heatPeak: 0, profit: {}, legs: {}, bought: {}, clearedDay: null, peakDebt: s.note.balance, cards: {}, brokeDay: null, recovered: false,
    track: { trips: [], paid: 0, loans: [], spikeProfit: 0, saleProfit: 0, tierDay: {}, cashOn: {}, worthOn: {} } };
  tracking = mem.track;
  for (let turn = 0; turn < 3000 && !s.over; turn++) {
    while (s.inbox.length) s = act(s, { t: 'ack' });
    if (s.pending) { const c = choose(s, st); const key = `${s.pending.kind}:${c}`; mem.cards[key] = (mem.cards[key] ?? 0) + 1; const n = act(s, { t: 'choose', choice: c }); s = n === s ? act(s, { t: 'choose', choice: 'flee' }) : n; if (s.pending && n === s) s = act(s, { t: 'choose', choice: s.pending.choices[0] }); continue; }
    if (s.over) break;
    if (mem.brokeDay === null && s.player.cash < 20 && !Object.keys(s.player.cargo).length) mem.brokeDay = s.day;
    else if (mem.brokeDay !== null && s.player.cash > 200) mem.recovered = true;
    // The safety net: a broke bot with nothing to sell takes the gentlest day labour going.
    if (st !== 'idle' && s.player.cash < 40 && !Object.keys(s.player.cargo).length) {
      const job = [...jobsAt(s, s.player.location)].sort((a, b) => a.hurt - b.hurt)[0];
      if (job) { s = act(s, { t: 'labour', job: job.id, days: 7 }); continue; }
    }
    mem.peakDebt = Math.max(mem.peakDebt, s.note.cleared ? 0 : s.note.balance);
    mem.heatPeak = Math.max(mem.heatPeak, s.player.heat);
    if (st === 'idle') { s = upkeep(s, st); s = act(s, { t: 'wait', days: 7 }); continue; }
    s = sellOff(s, st, mem);
    s = upkeep(s, st);
    if (s.note.cleared && mem.clearedDay === null) mem.clearedDay = s.day;
    // contracts
    if (st === 'contractor' || st === 'oracle') {
      for (const c of s.contracts.filter(c => c.destination === s.player.location)) s = act(s, { t: 'deliver', id: c.id });
      for (const o of s.offers.filter(o => o.origin === s.player.location)) {
        const q = quotes(s, s.player.location).find(x => x.good === o.good);
        if (q?.buy && q.buy * o.qty < s.player.cash * 0.8 && o.qty * C.goods[o.good].weight <= capacity(s) - cargoWeight(s) && o.reward > q.buy * o.qty * 1.05) {
          const n = act(s, { t: 'accept', id: o.id }); if (n !== s) { s = act(n, { t: 'buy', good: o.good, qty: o.qty }); }
        }
      }
      const c = s.contracts[0];
      if (c && (s.player.cargo[c.good]?.qty ?? 0) >= c.qty) {
        const hop = nextHop(s, c.destination);
        const opt = hop && routeOptions(s).find(o => o.dest === hop && o.fare <= s.player.cash);
        if (opt) { s = act(s, { t: 'travel', route: opt.route.id, mode: opt.modeIndex }); continue; }
      }
    }
    const goal = charterGoal(s, st);
    const hop = goal && nextHop(s, goal);
    const toGoal = hop && routeOptions(s).filter(o => o.dest === hop && o.fare <= s.player.cash).sort((a, b) => a.days - b.days)[0];
    if (toGoal) { s = act(s, { t: 'travel', route: toGoal.route.id, mode: toGoal.modeIndex }); continue; }
    const p = plan(s, st);
    if (p) {
      for (const b of p.buys) { const n = act(s, { t: 'buy', good: b.good, qty: b.qty }); if (n !== s) mem.bought[b.good] = s.player.location; s = n; }
      const n = act(s, { t: 'travel', route: p.travel.route.id, mode: p.travel.modeIndex });
      s = n === s ? act(s, { t: 'wait', days: 1 }) : n;
    } else {
      const affordable = routeOptions(s).filter(o => o.fare <= s.player.cash);
      const opts = affordable.length ? affordable : routeOptions(s);
      s = opts.length && (turn % 3 === 0 || !affordable.length) ? act(s, { t: 'travel', route: opts[turn % opts.length].route.id, mode: opts[turn % opts.length].modeIndex }) : act(s, { t: 'wait', days: 3 });
    }
  }
  tracking = null;
  return { s, mem };
}

