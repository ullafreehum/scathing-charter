// Gameplay balance diagnostics: archetype bots × seeds, compared against design targets.
// Usage: npm run balance -- [seedsPerStrategy=30]
import { C } from '../src/data';
import { CARD,
  newGame, step, quotes, routeOptions, netWorth, capacity, cargoWeight, power, shortDate, D, DEPTH,
  DIFFICULTY, type Action, type Difficulty, type GameState, type RouteOption,
} from '../src/engine';

type Strat = 'idle' | 'greedy' | 'smuggler' | 'prudent' | 'contractor' | 'oracle';
const ERUPT = D(5, 2, 3);
const FAMINE = new Set(['saltrice', 'healing-draughts', 'timber', 'kwama-eggs']);
interface Mem { heatPeak: number; profit: Record<string, number>; legs: Record<string, number>; bought: Record<string, string>; clearedDay: number | null; peakDebt: number }

function act(s: GameState, a: Action): GameState { const r = step(s, a); return r.error ? s : r.state; }

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
  if (s.player.location === 'leyawiin' && !s.player.licence && s.player.cash > 2000) s = act(s, { t: 'licence' });
  // the Scathing Charter: renew when asked, buy the next tier when there is a cushion left over
  if (C.charter.offices.includes(loc)) {
    if (s.charter.renewDue !== null) s = act(s, { t: 'renew' });
    const next = C.charter.tiers[s.charter.tier];
    const cushion = st === 'greedy' ? 3000 : st === 'smuggler' ? 5000 : 10000;
    if (next && s.world.flags.relief && s.note.cleared && s.player.cash > next.price + cushion) s = act(s, { t: 'charter' });
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

function play(seed: string, st: Strat, difficulty: Difficulty): { s: GameState; mem: Mem } {
  let s = newGame({ seed, backgroundId: st === 'smuggler' ? 'caravaner' : 'hlaalu-bastard', name: 'Bot', difficulty });
  const mem: Mem = { heatPeak: 0, profit: {}, legs: {}, bought: {}, clearedDay: null, peakDebt: s.note.balance };
  for (let turn = 0; turn < 3000 && !s.over; turn++) {
    while (s.inbox.length) s = act(s, { t: 'ack' });
    if (s.pending) { const n = act(s, { t: 'choose', choice: choose(s, st) }); s = n === s ? act(s, { t: 'choose', choice: 'flee' }) : n; if (s.pending && n === s) s = act(s, { t: 'choose', choice: s.pending.choices[0] }); continue; }
    if (s.over) break;
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
  return { s, mem };
}

const pct = (a: number[], p: number) => a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : NaN;
const k = (n: number) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e4 ? `${(n / 1e3).toFixed(0)}k` : `${Math.round(n)}`);

function runBatch(st: Strat, difficulty: Difficulty, n: number) {
  const nw: number[] = [], cleared: number[] = []; let ruined = 0, deaths = 0, enc = 0, mercy = 0, profiteer = 0, smuggled = 0, tier1 = 0, tier3 = 0, heatMax = 0;
  const profit: Record<string, number> = {}; const legs: Record<string, number> = {}; const ach: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const { s, mem } = play(`bal-${st}-${difficulty}-${i}`, st, difficulty);
    const w = netWorth(s); nw.push(w);
    if (mem.clearedDay !== null) cleared.push(mem.clearedDay);
    if (w < 0) ruined++; if (s.over?.reason === 'death') deaths++;
    if (s.charter.tier >= 1) tier1++; if (s.charter.tier === 3) tier3++; heatMax += mem.heatPeak;
    enc += s.stats.encounters; mercy += s.player.mercy; profiteer += s.player.profiteering; smuggled += s.stats.smuggled;
    for (const [g, v] of Object.entries(mem.profit)) profit[g] = (profit[g] ?? 0) + v;
    for (const [l, v] of Object.entries(mem.legs)) legs[l] = (legs[l] ?? 0) + v;
    for (const a of s.achievements) ach[a] = (ach[a] ?? 0) + 1;
  }
  nw.sort((a, b) => a - b); cleared.sort((a, b) => a - b);
  const top = Object.entries(profit).sort((a, b) => b[1] - a[1]);
  const totalP = top.reduce((a, [, v]) => a + Math.max(0, v), 0) || 1;
  const legTop = Object.entries(legs).sort((a, b) => b[1] - a[1])[0];
  const legTotal = Object.values(legs).reduce((a, v) => a + Math.max(0, v), 0) || 1;
  return { st, difficulty, n, p10: pct(nw, 0.1), med: pct(nw, 0.5), p90: pct(nw, 0.9), max: nw[nw.length - 1], clearPct: cleared.length / n, clearMed: cleared.length ? pct(cleared, 0.5) : null,
    ruined: ruined / n, deaths: deaths / n, tier1: tier1 / n, tier3: tier3 / n, heatPeak: heatMax / n, enc: enc / n, mercy: mercy / n, profiteer: profiteer / n, smuggled: smuggled / n,
    top: top.slice(0, 3).map(([g, v]) => `${C.goods[g].name} ${Math.round((v / totalP) * 100)}%`).join(', '), ach,
    legShare: legTop ? Math.max(0, legTop[1]) / legTotal : 0, legName: legTop?.[0] ?? '—' };
}

if (process.argv[2] === 'debt') {
  // Focused sweep: when do careful players clear Normal (Tong Terms) debt, and how many are ruined?
  const n = Number(process.argv[3] ?? 8);
  // each entry is debt or debt:cash, e.g. 5000:700
  const debts = (process.argv[4] ?? '3000,4500,6000').split(',').map(x => x.split(':').map(Number));
  for (const [debt, cash] of debts) {
    Object.assign(DIFFICULTY.tong, cash ? { debt, cash } : { debt });
    const rs = (['prudent', 'contractor', 'oracle'] as Strat[]).map(st => runBatch(st, 'tong', n));
    const clears = rs.map(r => r.clearMed).filter((d): d is number => d !== null).sort((a, b) => a - b);
    const avg = (f: (r: typeof rs[number]) => number) => rs.reduce((a, r) => a + f(r), 0) / rs.length;
    console.log(`tong debt ${debt} cash ${DIFFICULTY.tong.cash}: careful clear ${(avg(r => r.clearPct) * 100).toFixed(0)}% · median clear ${clears.length ? shortDate(clears[Math.floor(clears.length / 2)]) : 'never'} · ruined ${(avg(r => r.ruined) * 100).toFixed(0)}% · licence ${(avg(r => r.tier1) * 100).toFixed(0)}% · full charter ${(avg(r => r.tier3) * 100).toFixed(0)}% · median worth ${k(rs[0].med)}/${k(rs[1].med)}/${k(rs[2].med)}`);
  }
  process.exit(0);
}
if (process.argv[2] === 'blood') {
  // Focused sweep: how hard is Blood Terms at different interest rates? (prudent bot, many seeds)
  const n = Number(process.argv[3] ?? 40);
  for (const rate of [0.0055, 0.006, 0.0065]) {
    Object.assign(DIFFICULTY.blood, { rate });
    const r = runBatch('prudent', 'blood', n);
    console.log(`blood @ ${(rate * 100).toFixed(2)}%/day · median ${k(r.med)} · p90 ${k(r.p90)} · cleared ${(r.clearPct * 100).toFixed(0)}% · ruined ${(r.ruined * 100).toFixed(0)}%`);
  }
  process.exit(0);
}
const N = Number(process.argv[2] ?? 30);
const t0 = Date.now();
const strats: Strat[] = ['idle', 'greedy', 'smuggler', 'prudent', 'contractor', 'oracle'];
const rows = strats.map(s => runBatch(s, 'tong', N));
console.log(`\n=== Balance by archetype · Tong Terms (${DIFFICULTY.tong.debt.toLocaleString('en-US')} dr at ${(DIFFICULTY.tong.rate * 100).toFixed(1)}%/day) · ${N} seeds each ===`);
console.log('strategy    | p10      median   p90      max     | note cleared  median date        | ruined deaths | enc/run mercy profiteer smuggled | profit leaders');
for (const r of rows) console.log(`${r.st.padEnd(11)} | ${k(r.p10).padStart(7)} ${k(r.med).padStart(7)} ${k(r.p90).padStart(7)} ${k(r.max).padStart(7)} | ${(r.clearPct * 100).toFixed(0).padStart(4)}%  ${(r.clearMed !== null ? shortDate(r.clearMed) : '—').padEnd(20)} | ${(r.ruined * 100).toFixed(0).padStart(4)}% ${(r.deaths * 100).toFixed(0).padStart(4)}% | ${r.enc.toFixed(1).padStart(5)} ${r.mercy.toFixed(0).padStart(5)} ${k(r.profiteer).padStart(6)} ${r.smuggled.toFixed(0).padStart(6)} | ${r.top}`);

console.log('\nCharter and heat per strategy:');
for (const r of rows.filter(r => r.st !== 'idle')) console.log(`  ${r.st.padEnd(11)} charter licence+ ${(r.tier1 * 100).toFixed(0).padStart(3)}% · full charter ${(r.tier3 * 100).toFixed(0).padStart(3)}% · average peak heat ${r.heatPeak.toFixed(0)}`);
console.log('\nBest single route per strategy (share of that strategy\'s trading profit):');
for (const r of rows.filter(r => r.st !== 'idle')) console.log(`  ${r.st.padEnd(11)} ${(r.legShare * 100).toFixed(0).padStart(3)}%  ${r.legName}`);

const sweep = (['fair', 'blood'] as Difficulty[]).map(d => runBatch('prudent', d, Math.max(10, Math.floor(N / 2))));
console.log(`\n=== Difficulty sweep (prudent bot) ===`);
for (const r of [rows.find(r => r.st === 'prudent')!, ...sweep]) console.log(`${r.difficulty.padEnd(6)} median ${k(r.med).padStart(7)} · cleared ${(r.clearPct * 100).toFixed(0)}% (median ${r.clearMed !== null ? shortDate(r.clearMed) : '—'}) · ruined ${(r.ruined * 100).toFixed(0)}% · deaths ${(r.deaths * 100).toFixed(0)}%`);

// economy scan: best single-leg margins (per stone per day) at the start and after the eruption
function scan(s: GameState, label: string) {
  const out: { txt: string; v: number }[] = [];
  for (const a of C.locList) for (const r of C.routeList) {
    if (r.a !== a.id && r.b !== a.id) continue; if ((s.world.routes[r.id]?.closed) ?? r.closed) continue;
    const b = r.a === a.id ? r.b : r.a; if (s.world.status[a.id] === 'closed' || s.world.status[b] === 'closed') continue;
    const qa = quotes(s, a.id), qb = quotes(s, b);
    for (const x of qa) { if (x.buy === null || x.legality !== 'legal') continue; const y = qb.find(z => z.good === x.good); if (!y || y.sell === null || y.legality !== 'legal') continue;
      const v = (y.sell - x.buy) / C.goods[x.good].weight / r.modes[0].days; if (v > 0) out.push({ txt: `${C.goods[x.good].name}: ${a.name} → ${C.locs[b].name} (${r.modes[0].days}d)`, v }); }
  }
  out.sort((a, b) => b.v - a.v);
  const all = out.reduce((a, b) => a + b.v, 0) || 1;
  console.log(`\n${label}: ${out.length} profitable legal legs; top-5 share of total margin ${(out.slice(0, 5).reduce((a, b) => a + b.v, 0) / all * 100).toFixed(0)}%`);
  for (const o of out.slice(0, 5)) console.log(`  ${o.v.toFixed(1).padStart(6)} dr/stone/day  ${o.txt}`);
}
let s0 = newGame({ seed: 'scan', backgroundId: 'deserter', name: 'Scan', difficulty: 'tong' });
scan(s0, 'Economy at 1 Morning Star 4E 4');
s0.player.cash = 1e7; while (s0.day < ERUPT + 40) { while (s0.inbox.length) s0 = act(s0, { t: 'ack' }); s0 = act(s0, { t: 'wait', days: 7 }); }
scan(s0, `Economy at ${shortDate(s0.day)} (after the eruption)`);

// targets
const pr = rows.find(r => r.st === 'prudent')!, best = rows.reduce((a, b) => (b.max > a.max ? b : a)), idle = rows.find(r => r.st === 'idle')!;
const careful = rows.filter(r => ['prudent', 'contractor', 'oracle'].includes(r.st));
const carefulClear = careful.reduce((a, r) => a + r.clearPct, 0) / careful.length;
const carefulRuin = careful.reduce((a, r) => a + r.ruined, 0) / careful.length;
const verdict = (ok: boolean) => (ok ? 'OK  ' : 'MISS');
console.log(`\n=== Against design targets (GAME_DESIGN §14) ===`);
console.log(`${verdict(idle.ruined === 1)} doing nothing ruins you (idle ruined ${(idle.ruined * 100).toFixed(0)}%, median ${k(idle.med)})`);
console.log(`${verdict(carefulClear >= 0.5 && (pr.clearMed ?? 1e9) <= D(5, 12, 31))} careful play clears the note by ~4E 5 (careful bots clear ${(carefulClear * 100).toFixed(0)}%; prudent median ${pr.clearMed !== null ? shortDate(pr.clearMed) : 'never'})`);
console.log(`${verdict(carefulRuin >= 0.1 && carefulRuin <= 0.35)} ~20% of careful players are ruined (careful bots ${(carefulRuin * 100).toFixed(0)}%)`);
console.log(`${verdict(best.max >= 100000 && best.max <= 400000)} a top run reaches ~100k–250k (best ${k(best.max)} by ${best.st})`);
const sm = rows.find(r => r.st === 'smuggler')!;
const cT1 = careful.reduce((a, r) => a + r.tier1, 0) / careful.length, cT3 = careful.reduce((a, r) => a + r.tier3, 0) / careful.length;
console.log(`${verdict(cT1 >= 0.5)} most careful players get a charter licence (careful bots ${(cT1 * 100).toFixed(0)}%; target ≥ 50%)`);
console.log(`${verdict(cT3 >= 0.1 && cT3 <= 0.3)} the full charter is a stretch goal (careful bots ${(cT3 * 100).toFixed(0)}%; target 10–30%)`);
console.log(`${verdict(sm.med <= pr.med * 1.6 && sm.ruined >= pr.ruined + 0.05)} smuggling pays more but is riskier (smuggler median ${(sm.med / Math.max(1, pr.med)).toFixed(1)}× prudent, ruined ${(sm.ruined * 100).toFixed(0)}% vs ${(pr.ruined * 100).toFixed(0)}%)`);
console.log(`${verdict(pr.legShare <= 0.35)} no single route dominates (prudent's best route earns ${(pr.legShare * 100).toFixed(0)}% of its trading profit; target ≤ 35%)`);
console.log(`${verdict(pr.clearMed !== null && pr.clearMed >= D(5, 1, 1) && pr.clearMed <= D(5, 6, 1))} the debt lasts into 4E 5 (prudent clears ${pr.clearMed !== null ? shortDate(pr.clearMed) : 'never'}; target 1 Morning Star – 1 Mid Year 4E 5)`);
console.log(`(${((Date.now() - t0) / 1000).toFixed(0)}s)`);
