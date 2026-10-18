// Balance check for the 0.10 spine (win = tier 3 Charter debt-free, mark = debt past 6x, death, retire).
// Usage: npm run balance:focus -- [seedsPerStrategy=24] [--strict] [--csv runs.csv] [--scan]
// Prints outcome shares per bot and difficulty, a crossing-card value scan, and PASS/MISS against the targets in
// docs/QA.md §4 (agreed with the economy designer). With --strict it exits 1 on any MISS (for release checks);
// --csv writes one row per bot run for the economy designer. Held: run only when Sinan says so.
import { writeFileSync } from 'node:fs';
import { C } from '../src/data';
import {
  FAVOUR_DISCOUNT, FAVOUR_MAX, buildPending, cardOptions, hashSeed, maxBuyQty, netWorth, newGame, quotes, routeOptions, cargoWeight, capacity, shortDate, step,
  D, DEPTH, type Difficulty, type GameState,
} from '../src/engine';
import { ERUPT, WORTH_DAYS, act, play, type Mem, type Strat, type Track } from './bots';

const args = process.argv.slice(2);
const N = Number(args.find(a => /^\d+$/.test(a)) ?? 24);
const STRICT = args.includes('--strict');
/** --scan: only the card value scan (B10, B11), in seconds instead of minutes */
const SCAN_ONLY = args.includes('--scan');
const CSV = args.includes('--csv') ? args[args.indexOf('--csv') + 1] : null;
const csvRows: string[] = ['bot,difficulty,seed,outcome,end_day,journeys,card_rate,cleared_day,interest_paid,cash_d30,cash_d398,cash_d427,worth_d600,worth_d800,worth_d1000,tier1_day,tier2_day,tier3_day,loans,spike_share,profit_per_trip_first60,profit_per_trip_4E5'];
const t0 = Date.now();

type Outcome = 'won' | 'marked' | 'death' | 'retired';
function outcome(s: GameState): Outcome {
  const r = s.over?.reason;
  return r === 'won' ? 'won' : r === 'marked' ? 'marked' : r === 'death' ? 'death' : 'retired';
}
const p10 = (a: number[]) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length * 0.1)]; };
const med = (a: number[]) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const share = (n: number, d: number) => (d ? n / d : 0);
const p = (x: number) => `${(x * 100).toFixed(0)}%`;
const k = (n: number | null) => (n === null ? '—' : Math.abs(n) >= 1e4 ? `${(n / 1e3).toFixed(0)}k` : `${Math.round(n)}`);
const date = (d: number | null) => (d === null ? '—' : shortDate(d));

interface Row {
  st: Strat; diff: Difficulty; n: number;
  won: number; marked: number; death: number; retired: number;
  winDay: number | null; clear: number; clearDay: number | null; worth: number | null;
  broke: number; recovered: number; favour: number; cards: Record<string, number>;
  /** median journeys in a won run; profit per journey, 4E 5 over the first 60 days (median ratio); spike share of sale profit */
  winTrips: number | null; growth: number | null; spike: number;
  /** debt cleared within B8's window, and median interest paid as a share of the note */
  interestShare: number | null; tracks: Track[];
  /** net worth at the end of every run, and median net worth on WORTH_DAYS */
  endWorth: number[]; worthOn: Record<number, number | null>;
}
/** Trading profit per journey between two days, from the trip log. */
function perTrip(t: Track, from: number, to: number): number | null {
  const trips = t.trips.filter(x => x.day >= from && x.day < to);
  if (trips.length < 3) return null;
  const before = t.trips.filter(x => x.day < from).at(-1)?.profit ?? 0;
  return (trips.at(-1)!.profit - before) / trips.length;
}
function interestPaid(r: { s: GameState; mem: Mem }): number | null {
  if (r.mem.clearedDay === null) return null;
  return r.mem.track.paid - r.s.note.original - r.mem.track.loans.reduce((a, l) => a + l.amount, 0);
}
function batch(st: Strat, diff: Difficulty, n: number): Row {
  const runs: { s: GameState; mem: Mem }[] = [];
  for (let i = 0; i < n; i++) { runs.push(play(`focus-${st}-${diff}-${i}`, st, diff)); process.stderr.write(`  ${st} ${diff} ${i + 1}/${n}, ${((Date.now() - t0) / 1000).toFixed(0)} s\r`); }
  const cnt = (o: Outcome) => runs.filter(r => outcome(r.s) === o).length;
  const cards: Record<string, number> = {};
  for (const r of runs) for (const [c, v] of Object.entries(r.mem.cards)) cards[c] = (cards[c] ?? 0) + v;
  const broke = runs.filter(r => r.mem.brokeDay !== null);
  runs.forEach((r, i) => {
    const t = r.mem.track, cell = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(Math.round(v * 100) / 100));
    const early = perTrip(t, 0, 60), late = perTrip(t, D(5, 1, 1), D(6, 1, 1));
    csvRows.push([st, diff, i, outcome(r.s), r.s.day, t.trips.length, cell(t.trips.length ? t.trips.filter(x => x.card).length / t.trips.length : null),
      cell(r.mem.clearedDay), cell(interestPaid(r)), cell(t.cashOn[30]), cell(t.cashOn[398]), cell(t.cashOn[427]), ...WORTH_DAYS.map(d => cell(t.worthOn[d])),
      cell(t.tierDay[1]), cell(t.tierDay[2]), cell(t.tierDay[3]), t.loans.map(l => `${l.day}:${l.amount}`).join(' '),
      cell(t.saleProfit > 0 ? t.spikeProfit / t.saleProfit : null), cell(early), cell(late)].join(','));
  });
  const ratios = runs.flatMap(r => { const e = perTrip(r.mem.track, 0, 60), l = perTrip(r.mem.track, D(5, 1, 1), D(6, 1, 1)); return e && e > 0 && l !== null ? [l / e] : []; });
  const sale = runs.reduce((a, r) => a + r.mem.track.saleProfit, 0);
  const shares = runs.flatMap(r => { const i = interestPaid(r); return i === null ? [] : [i / r.s.note.original]; });
  return {
    st, diff, n, won: cnt('won') / n, marked: cnt('marked') / n, death: cnt('death') / n, retired: cnt('retired') / n,
    winDay: med(runs.filter(r => outcome(r.s) === 'won').map(r => r.s.over!.day)),
    clear: share(runs.filter(r => r.mem.clearedDay !== null).length, n),
    clearDay: med(runs.flatMap(r => (r.mem.clearedDay === null ? [] : [r.mem.clearedDay]))),
    worth: med(runs.filter(r => outcome(r.s) === 'retired').map(r => netWorth(r.s))),
    broke: broke.length / n, recovered: share(broke.filter(r => r.mem.recovered).length, broke.length),
    favour: runs.reduce((a, r) => a + (r.s.charter.favour ?? 0), 0) / n, cards,
    winTrips: med(runs.filter(r => outcome(r.s) === 'won').map(r => r.mem.track.trips.length)),
    growth: med(ratios), spike: sale > 0 ? runs.reduce((a, r) => a + r.mem.track.spikeProfit, 0) / sale : 0,
    interestShare: med(shares), tracks: runs.map(r => r.mem.track),
    endWorth: runs.map(r => netWorth(r.s)),
    worthOn: Object.fromEntries(WORTH_DAYS.map(d => [d, med(runs.flatMap(r => r.mem.track.worthOn[d] ?? []))])),
  };
}

// ---------------------------------------------------------------- card value scan
// For each of the four plan scenes: replay every option many times from mid-game states and compare the change in
// net worth (mean and 10th percentile). Greedy should pay more on average but risk more. Each scene is scanned in
// three trader states; an option is dominated only if, in every state where it is offered, another option beats it
// on both mean and p10 (B10). B11 is judged in the typical state.
interface Scene { def: string; safe: string; greedy: readonly string[]; cargo: GameState['player']['cargo'] }
const SCENES: Scene[] = [
  { def: 'legion-customs', safe: 'declare', greedy: ['bribe', 'chameleon', 'flee'], cargo: { 'moon-sugar': { qty: 12, cost: 40 } } },
  { def: 'refugee-column', safe: 'at-cost', greedy: ['sell-dear'], cargo: { saltrice: { qty: 15, cost: 4 } } },
  { def: 'ash-storm', safe: 'guide', greedy: ['press-on', 'wait-out'], cargo: { timber: { qty: 40, cost: 25 }, saltrice: { qty: 20, cost: 4 } } },
  { def: 'tong-enforcers', safe: 'pay-note', greedy: ['ask-time', 'flee'], cargo: { saltrice: { qty: 20, cost: 4 } } },
];
interface Trader { id: string; label: string; setup: (s: GameState, sc: Scene) => void }
const TRADERS: Trader[] = [
  { id: 'typical', label: 'typical trader, 1,500 cash, non-perishable cargo', setup: (s, sc) => { s.player.cash = 1500; s.player.cargo = structuredClone(sc.cargo); s.player.scrolls.chameleon = 1; } },
  { id: 'broke', label: 'broke trader, 30 cash', setup: (s, sc) => { s.player.cash = 30; s.player.cargo = structuredClone(sc.cargo); s.player.scrolls.chameleon = 1; } },
  { id: 'rich', label: 'rich smuggler, 30,000 cash and about 5,000 of contraband', setup: (s, sc) => { s.player.cash = 30000; s.player.cargo = { ...structuredClone(sc.cargo), 'moon-sugar': { qty: 90, cost: 40 } }; s.player.scrolls.chameleon = 1; } },
];
const TRIALS = 200;
/** trading income a day, for valuing days lost on the road (the economy designer's mid-game figure) */
const OPP_DAY = 150;
/** what a favour point is worth: its discount on the tiers not yet bought, nothing past the cap */
function favourValue(before: GameState, after: GameState): number {
  const f = (s: GameState) => Math.min(FAVOUR_MAX, s.charter.favour ?? 0);
  return (f(after) - f(before)) * FAVOUR_DISCOUNT * C.charter.tiers.slice(before.charter.tier).reduce((x, t) => x + t.price, 0);
}
function scan(sc: Scene, tr: Trader, base: GameState) {
  const def = C.encounters.find(e => e.id === sc.def)!;
  const res: Record<string, { mean: number; p10: number }> = {};
  for (const o of [sc.safe, ...sc.greedy]) {
    const d: number[] = [];
    for (let i = 0; i < TRIALS; i++) {
      const s: GameState = JSON.parse(JSON.stringify(base));
      tr.setup(s, sc); s.rng = hashSeed(`${sc.def}-${tr.id}-${o}-${i}`);
      s.player.location = 'road';
      s.pending = buildPending(s, def, 'balmora~ebonheart', 'ebonheart', 0, def.kind === 'customs');
      if (!cardOptions(s).some(x => x.id === o && !x.disabled)) break;
      const w0 = netWorth(s);
      const r = step(s, { t: 'choose', choice: o });
      if (r.error) break;
      // What net worth misses: extra interest from a rate rise (60 days), Charter favour, and days lost (OPP_DAY a day).
      const later = Math.round(r.state.note.balance * (r.state.note.rate - s.note.rate) * 60);
      d.push(netWorth(r.state) - w0 - later + favourValue(s, r.state) - (r.state.day - s.day) * OPP_DAY);
    }
    d.sort((a, b) => a - b);
    if (d.length) res[o] = { mean: d.reduce((a, b) => a + b, 0) / d.length, p10: d[Math.floor(d.length * 0.1)] };
  }
  return res;
}
let mid = newGame({ seed: 'card-scan', backgroundId: 'hlaalu-bastard', name: 'Scan', difficulty: 'tong' });
mid.player.cash = 1e6;
// Keep the note paid up so no Tong collector stops the wait (since 0.10.0 they come while you rest), and settle any
// card that turns up anyway: a pending card makes every wait fail, and this loop then never ended.
while (mid.day < ERUPT + 30) {
  while (mid.inbox.length) mid = act(mid, { t: 'ack' });
  if (mid.pending) { const n = act(mid, { t: 'choose', choice: 'flee' }); mid = n !== mid ? n : act(mid, { t: 'choose', choice: mid.pending.choices[0] }); continue; }
  mid.note.lastPaymentDay = mid.day;
  const n = act(mid, { t: 'wait', days: 7 }); if (n === mid) throw new Error(`card scan setup stuck on ${shortDate(mid.day)}`); mid = n;
}
mid.note.balance = mid.note.original; mid.note.lastPaymentDay = mid.day; // a trader still paying the note, not an idle one
console.log(`\n=== Card value scan (${TRIALS} trials per option, from ${shortDate(mid.day)}; Δ net worth) ===`);
const dominated: string[] = []; const greedyPays: string[] = [];
for (const sc of SCENES) {
  console.log(`  ${sc.def}`);
  /** option → the states where it was offered, and whether something beat it on both mean and p10 there */
  const beaten: Record<string, { offered: number; lost: string[] }> = {};
  for (const tr of TRADERS) {
    const r = scan(sc, tr, mid);
    console.log(`    ${tr.label}`);
    for (const [o, v] of Object.entries(r)) console.log(`      ${(o === sc.safe ? `${o} (safe)` : o).padEnd(18)} mean ${v.mean.toFixed(0).padStart(6)}  p10 ${v.p10.toFixed(0).padStart(6)}`);
    for (const [a, va] of Object.entries(r)) {
      const b = beaten[a] ??= { offered: 0, lost: [] }; b.offered++;
      const by = Object.entries(r).find(([o, vb]) => o !== a && vb.mean > va.mean + 1 && vb.p10 > va.p10 + 1);
      if (by) b.lost.push(`${by[0]} (${tr.id})`);
    }
    const safe = r[sc.safe];
    if (tr.id === 'typical' && safe && sc.greedy.some(g => r[g] && r[g].mean > safe.mean)) greedyPays.push(sc.def);
  }
  for (const [o, b] of Object.entries(beaten)) if (b.lost.length === b.offered) dominated.push(`${sc.def}: ${o} is beaten in every state (by ${b.lost.join(', ')})`);
}

if (SCAN_ONLY) process.exit(0);

// ---------------------------------------------------------------- outcomes
const STRATS: Strat[] = ['idle', 'greedy', 'smuggler', 'prudent', 'contractor', 'oracle'];
const rows = STRATS.map(st => batch(st, 'tong', N));
const sweep = (['fair', 'blood'] as Difficulty[]).map(d => batch('prudent', d, N));
const prT = rows.find(r => r.st === 'prudent')!;

console.log(`=== Outcomes, Tong Terms, ${N} seeds per bot ===`);
console.log('bot         |  won  mark death retire | median win      | debt cleared  median date     | retire worth | broke→back | favour');
const line = (r: Row) => console.log(`${`${r.st}${r.diff === 'tong' ? '' : `/${r.diff}`}`.padEnd(11)} | ${p(r.won).padStart(4)} ${p(r.marked).padStart(5)} ${p(r.death).padStart(5)} ${p(r.retired).padStart(6)} | ${date(r.winDay).padEnd(15)} | ${p(r.clear).padStart(5)}  ${date(r.clearDay).padEnd(20)} | ${k(r.worth).padStart(12)} | ${p(r.broke).padStart(4)}→${p(r.recovered).padStart(4)} | ${r.favour.toFixed(1)}`);
rows.forEach(line);
console.log(`\n=== Median net worth on day ${WORTH_DAYS.join(' / ')} (runs still going) and p10 at the end ===`);
for (const r of [...rows, ...sweep]) console.log(`${`${r.st}${r.diff === 'tong' ? '' : `/${r.diff}`}`.padEnd(13)} ${WORTH_DAYS.map(d => k(r.worthOn[d]).padStart(7)).join(' ')}   end p10 ${k(p10(r.endWorth)).padStart(7)}`);
console.log('\n=== Difficulty sweep (prudent) ===');
[sweep[0], prT, sweep[1]].forEach(line);

console.log('\n=== Crossing cards taken (all Tong Terms bots) ===');
const all: Record<string, number> = {};
for (const r of rows) for (const [c, v] of Object.entries(r.cards)) all[c] = (all[c] ?? 0) + v;
for (const [c, v] of Object.entries(all).sort((a, b) => b[1] - a[1])) console.log(`  ${c.padEnd(24)} ${v}`);

// ---------------------------------------------------------------- cards per journey (B12)
const trips = rows.flatMap(r => r.tracks.flatMap(t => t.trips));
const rate = (xs: typeof trips) => (xs.length ? xs.filter(x => x.card).length / xs.length : 0);
console.log(`\n=== Crossing cards per journey (all Tong Terms bots, ${trips.length} journeys) ===`);
console.log(`  all journeys ${p(rate(trips))} · 1-day Vvardenfell hops ${p(rate(trips.filter(x => x.shortHop)))}`);
for (const risk of [...new Set(trips.map(x => x.risk))].sort((a, b) => a - b)) console.log(`  route risk ${risk}: ${p(rate(trips.filter(x => x.risk === risk)))} of ${trips.filter(x => x.risk === risk).length}`);

// ---------------------------------------------------------------- strider bot (B13)
// Only striders between Balmora, Vivec and Ald'ruhn, buying the legal good with the best margin at the next stop.
const HEART = ['balmora', 'vivec', 'aldruhn'];
function strider(seed: string): { start: number; end: number } {
  let s = newGame({ seed, backgroundId: 'hlaalu-bastard', name: 'Strider', difficulty: 'tong' });
  while (s.inbox.length) s = act(s, { t: 'ack' });
  const start = s.player.cash;
  for (let turn = 0; turn < 200 && s.day < 30 && !s.over; turn++) {
    while (s.inbox.length) s = act(s, { t: 'ack' });
    if (s.pending) { s = act(s, { t: 'choose', choice: s.pending.choices[0] }); continue; }
    for (const g of Object.keys(s.player.cargo)) s = act(s, { t: 'sell', good: g, qty: s.player.cargo[g].qty });
    const opts = routeOptions(s).filter(o => o.mode === 'strider' && HEART.includes(o.dest));
    let best: { o: (typeof opts)[number]; good: string; qty: number; gain: number } | null = null;
    for (const o of opts) for (const q of quotes(s, s.player.location)) {
      if (q.buy === null || q.legality !== 'legal') continue;
      const there = quotes(s, o.dest).find(x => x.good === q.good); if (!there?.sell) continue;
      const g = C.goods[q.good];
      const qty = maxBuyQty(q.buy, DEPTH[g.category], s.player.cash - o.fare, capacity(s) - cargoWeight(s), g.weight);
      const gain = qty * (there.sell - q.buy) - o.fare;
      if (qty > 0 && (!best || gain > best.gain)) best = { o, good: q.good, qty, gain };
    }
    const o = best?.o ?? opts[0]; if (!o) break;
    if (best && best.gain > 0) s = act(s, { t: 'buy', good: best.good, qty: best.qty });
    const n = act(s, { t: 'travel', route: o.route.id, mode: o.modeIndex });
    s = n === s ? act(s, { t: 'wait', days: 1 }) : n;
  }
  return { start, end: s.player.cash };
}
const striders = Array.from({ length: N }, (_, i) => strider(`strider-${i}`));
const striderWin = striders.filter(x => x.end > x.start).length / N;
console.log(`\n=== Strider bot, first 30 days (${N} seeds) ===\n  ends with more cash than it started: ${p(striderWin)} · median end cash ${k(med(striders.map(x => x.end)))} (start ${striders[0]?.start})`);

// ---------------------------------------------------------------- targets (docs/QA.md §4)
const careful = rows.filter(r => ['prudent', 'contractor', 'oracle'].includes(r.st));
const avg = (f: (r: Row) => number, rs = careful) => rs.reduce((a, r) => a + f(r), 0) / rs.length;
const idle = rows.find(r => r.st === 'idle')!;
const risky = rows.filter(r => ['greedy', 'smuggler'].includes(r.st));
const [fair, blood] = sweep;
const brokeRows = rows.filter(r => r.st !== 'idle' && r.broke > 0);
const checks: [boolean, string][] = [
  [idle.won === 0 && idle.marked + idle.retired === 1, `B1 doing nothing never wins (idle: won ${p(idle.won)}, marked ${p(idle.marked)})`],
  [avg(r => r.won) >= 0.6 && avg(r => r.won) <= 0.9, `B2 careful play wins 60–90% on Tong Terms (careful ${p(avg(r => r.won))})`],
  [avg(r => r.marked) <= 0.15, `B3 careful players rarely take the mark, ≤ 15% (careful ${p(avg(r => r.marked))})`],
  [avg(r => r.death, rows.filter(r => r.st !== 'idle')) <= 0.05, `B4 death is rare, ≤ 5% of active bots (${p(avg(r => r.death, rows.filter(r => r.st !== 'idle')))})`],
  [avg(r => r.won, risky) <= avg(r => r.won) + 0.1 && (p10(risky.flatMap(r => r.endWorth)) ?? 0) < (p10(careful.flatMap(r => r.endWorth)) ?? 0),
    `B5 risky play wins at most 10 points more than careful play, with a lower p10 end net worth (won ${p(avg(r => r.won, risky))} vs ${p(avg(r => r.won))}; p10 ${k(p10(risky.flatMap(r => r.endWorth)))} vs ${k(p10(careful.flatMap(r => r.endWorth)))}; marked or dead ${p(avg(r => r.marked + r.death, risky))} vs ${p(avg(r => r.marked + r.death))})`],
  [fair.won >= prT.won && prT.won >= blood.won && blood.won >= 0.1 && blood.won <= 0.4 && fair.won <= 0.97, `B6 difficulty orders the win rate, fair ≤ 97% and blood 10–40% (fair ${p(fair.won)} · tong ${p(prT.won)} · blood ${p(blood.won)})`],
  [prT.winDay !== null && prT.winDay >= 820 && prT.winDay <= 1003, `B7 the win comes late: prudent median between day 820 (${date(820)}) and day 1003 (${date(1003)}) (${date(prT.winDay)}, day ${prT.winDay ?? '—'})`],
  [prT.clear >= 0.7 && prT.clearDay !== null && prT.clearDay >= 60 && prT.clearDay <= 240 && (prT.interestShare ?? 0) >= 0.1, `B8 the debt is the first act: prudent clears ≥ 70%, median day 60–240, interest ≥ 10% of the note (${p(prT.clear)}, ${date(prT.clearDay)}, interest ${prT.interestShare === null ? '—' : p(prT.interestShare)})`],
  [!brokeRows.length || avg(r => r.recovered, brokeRows) >= 0.5, `B9 day labour rescues most broke runs, ≥ 50% (${brokeRows.length ? p(avg(r => r.recovered, brokeRows)) : 'no bot went broke'})`],
  [!dominated.length, `B10 no card option is dominated${dominated.length ? `: ${dominated.join('; ')}` : ''}`],
  [greedyPays.length === SCENES.length, `B11 on every scene some greedy option beats the safe one on average, typical trader (${greedyPays.length}/${SCENES.length})`],
  [rate(trips) >= 0.15 && rate(trips) <= 0.3 && rate(trips.filter(x => x.shortHop)) >= 0.08, `B12 a card on 15–30% of journeys and ≥ 8% of 1-day Vvardenfell hops (${p(rate(trips))}, hops ${p(rate(trips.filter(x => x.shortHop)))})`],
  [striderWin >= 0.5, `B13 the strider-only bot gains cash over its first 30 days (${p(striderWin)} of seeds; pass ≥ 50%)`],
  [(prT.growth ?? 0) >= 1.3, `B14 careful income grows: prudent profit per journey in 4E 5 ≥ 1.3× its first 60 days (median ${prT.growth === null ? '—' : `${prT.growth.toFixed(2)}×`})`],
  [prT.winTrips !== null && prT.winTrips >= 150 && prT.winTrips <= 300, `B15 a won run takes 150–300 journeys (prudent median ${prT.winTrips ?? '—'})`],
  [(rows.find(r => r.st === 'oracle')!.spike) <= 0.4, `B16 price spikes give ≤ 40% of the oracle's sale profit (${p(rows.find(r => r.st === 'oracle')!.spike)})`],
];
console.log('\n=== Against the 0.10 targets ===');
for (const [ok, txt] of checks) console.log(`${ok ? 'PASS' : 'MISS'} ${txt}`);
console.log(`(${((Date.now() - t0) / 1000).toFixed(0)}s)`);
if (CSV) { writeFileSync(CSV, `${csvRows.join('\n')}\n`); console.log(`Per-run log: ${CSV} (${csvRows.length - 1} runs)`); }
if (STRICT && checks.some(([ok]) => !ok)) process.exit(1);
