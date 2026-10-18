// Gameplay balance diagnostics: archetype bots × seeds, compared against design targets.
// Usage: npm run balance -- [seedsPerStrategy=30]
import { C } from '../src/data';
import {
  newGame, quotes, netWorth, shortDate, D, DIFFICULTY, type Difficulty, type GameState,
} from '../src/engine';
import { ERUPT, act, play, type Strat } from './bots';

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
s0.player.cash = 1e7;
// The note stays paid up and any card is settled: a pending card (Tong collectors come while you rest since 0.10.0) made this loop endless.
while (s0.day < ERUPT + 40) {
  while (s0.inbox.length) s0 = act(s0, { t: 'ack' });
  if (s0.pending) { const n = act(s0, { t: 'choose', choice: 'flee' }); s0 = n !== s0 ? n : act(s0, { t: 'choose', choice: s0.pending.choices[0] }); continue; }
  s0.note.lastPaymentDay = s0.day;
  const n = act(s0, { t: 'wait', days: 7 }); if (n === s0) throw new Error('economy scan setup stuck'); s0 = n;
}
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
