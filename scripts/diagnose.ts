// Engine diagnostics: random-play fuzzing with invariant checks across seeds, backgrounds and difficulties.
// Usage: npx tsx scripts/diagnose.ts [gamesPerCombo=4]
import { C } from '../src/data';
import {
  newGame, step, replay, serialize, quotes, routeOptions, capacity, cargoWeight, netWorth, Rng, hashSeed,
  type Action, type GameState, type NewGameConfig, type Difficulty,
} from '../src/engine';

const problems: string[] = [];
const warn: Record<string, number> = {};
const kinds: Record<string, number> = {};
const bad = (msg: string) => { const k = msg.replace(/^[^:]*: /, '').replace(/[0-9.]+/g, '#'); kinds[k] = (kinds[k] ?? 0) + 1; if (kinds[k] <= 2 && problems.length < 40) problems.push(msg); };
const note = (k: string) => { warn[k] = (warn[k] ?? 0) + 1; };

function check(s: GameState, prevDay: number, ctx: string) {
  const fin = (v: number, n: string) => { if (!Number.isFinite(v)) bad(`${ctx}: ${n} is ${v}`); };
  fin(s.player.cash, 'cash'); fin(s.note.balance, 'note'); fin(s.player.health, 'health'); fin(s.day, 'day');
  if (s.player.cash < 0) bad(`${ctx}: negative cash ${s.player.cash}`);
  if (s.player.health < 0 || s.player.health > 100) bad(`${ctx}: health ${s.player.health}`);
  if (s.day < prevDay) bad(`${ctx}: day went backwards ${prevDay}→${s.day}`);
  if (s.day > s.endDay) bad(`${ctx}: day ${s.day} past end ${s.endDay}`);
  for (const [k, v] of Object.entries(s.deposits)) { fin(v, `deposit ${k}`); if (v < -0.001) bad(`${ctx}: negative deposit ${k}`); if (!(k in s.world.branches)) bad(`${ctx}: deposit at unknown branch ${k}`); }
  for (const [g, lot] of Object.entries(s.player.cargo)) {
    if (!C.goods[g]) bad(`${ctx}: unknown good ${g}`);
    if (!(lot.qty > 0) || !Number.isInteger(lot.qty)) bad(`${ctx}: bad qty ${g}=${lot.qty}`);
    fin(lot.cost, `cost ${g}`);
  }
  if (cargoWeight(s) > capacity(s)) note('overloaded after hirelings deserted (allowed)');
  const loc = s.player.location;
  if (loc === 'road') { if (!s.pending && !s.over) bad(`${ctx}: on the road with nothing pending`); }
  else if (!C.locs[loc]) bad(`${ctx}: unknown location ${loc}`);
  else if (s.world.status[loc] === 'closed' && !s.over) bad(`${ctx}: standing in a closed location ${loc}`);
  if (loc !== 'road' && C.locs[loc]) for (const q of quotes(s, loc)) {
    if (!Number.isFinite(q.mid) || q.mid <= 0) bad(`${ctx}: bad price ${q.good}@${loc}=${q.mid}`);
    if (q.buy !== null && q.sell !== null && q.sell > q.buy) bad(`${ctx}: same-town arbitrage ${q.good}@${loc} buy ${q.buy} < sell ${q.sell}`);
  }
  for (const i of s.inbox) if (i.kind === 'chronicle' && !C.history.find(h => h.id === i.eventId)) bad(`${ctx}: unknown chronicle ${i.eventId}`);
  for (const c of s.codex) if (!C.codex[c]) bad(`${ctx}: unknown codex id ${c}`);
}

function randomAction(s: GameState, r: Rng): Action {
  if (s.inbox.length) return { t: 'ack' };
  if (s.pending) {
    const ok = s.pending.choices.filter(c => c !== 'bribe' || s.player.cash >= s.pending!.bribe);
    return { t: 'choose', choice: r.pick(ok) };
  }
  if (s.over) return { t: 'chronicle' };
  const loc = s.player.location;
  const roll = r.next();
  const qs = quotes(s, loc);
  if (roll < 0.25) {
    const buyable = qs.filter(q => q.buy !== null && q.buy <= s.player.cash);
    if (buyable.length) { const q = r.pick(buyable); return { t: 'buy', good: q.good, qty: r.int(1, 10) }; }
  }
  if (roll < 0.45) {
    const held = qs.filter(q => q.sell !== null && s.player.cargo[q.good]);
    if (held.length) { const q = r.pick(held); return { t: 'sell', good: q.good, qty: s.player.cargo[q.good].qty }; }
  }
  if (roll < 0.52) return r.pick<Action>([{ t: 'rumor' }, { t: 'heal' }, { t: 'pay', amount: r.int(50, 2000) }, { t: 'deposit', amount: r.int(20, 500) }, { t: 'withdraw', amount: r.int(20, 500) }]);
  if (roll < 0.56) {
    const o = s.offers.filter(x => x.origin === loc); if (o.length) return { t: 'accept', id: r.pick(o).id };
    const c = s.contracts.filter(x => x.destination === loc); if (c.length) return { t: 'deliver', id: r.pick(c).id };
  }
  if (roll < 0.6) return r.pick<Action>([{ t: 'gear', id: r.pick(C.gearList).id }, { t: 'hire', who: r.pick(['porter', 'sellsword'] as const), delta: r.pick([1, -1] as const) }, { t: 'book', id: r.pick(C.books).id }, { t: 'licence' }, { t: 'borrow', amount: r.int(100, 1000) }]);
  const opts = routeOptions(s).filter(o => o.fare <= s.player.cash);
  if (opts.length && roll < 0.93) { const o = r.pick(opts); return { t: 'travel', route: o.route.id, mode: o.modeIndex }; }
  return { t: 'wait', days: r.pick([1, 3, 7] as const) };
}

const perCombo = Number(process.argv[2] ?? 4);
const diffs: Difficulty[] = ['fair', 'tong', 'blood'];
let games = 0, steps = 0, errors = 0, deaths = 0, finished = 0, chronicles = 0, chronicleDone = 0, replays = 0;
const firedCount: Record<string, number> = {}, encSeen = new Set<string>(), achieved: Record<string, number> = {};
const worths: number[] = [];
const t0 = Date.now();
for (const bg of C.backgroundList) for (const difficulty of diffs) for (let i = 0; i < perCombo; i++) {
  const cfg: NewGameConfig = { seed: `diag-${bg.id}-${difficulty}-${i}`, backgroundId: bg.id, name: 'Diag', difficulty };
  const r = new Rng(hashSeed(cfg.seed + '/policy'));
  let s = newGame(cfg); games++;
  check(s, 0, cfg.seed);
  let enteredChronicle = false;
  for (let n = 0; n < 6000; n++) {
    if (s.over && (s.mode === 'long-chronicle' || s.over.reason !== 'calendar') && !s.inbox.length) break;
    const a = randomAction(s, r);
    const prev = s.day;
    let res;
    try { res = step(s, a); } catch (e) { bad(`${cfg.seed}: step threw on ${JSON.stringify(a)}: ${(e as Error).message}`); break; }
    steps++;
    if (res.error) { errors++; if (a.t === 'ack' || a.t === 'choose') bad(`${cfg.seed}: ${a.t} rejected: ${res.error}`); continue; }
    if (a.t === 'chronicle') { enteredChronicle = true; chronicles++; }
    if (s.pending) encSeen.add(s.pending.defId);
    s = res.state;
    check(s, a.t === 'chronicle' ? 0 : prev, `${cfg.seed}#${n}`);
  }
  if (s.over?.reason === 'death') deaths++;
  if (s.over?.reason === 'calendar') { finished++; if (enteredChronicle) chronicleDone++; }
  for (const f of s.world.fired) firedCount[f] = (firedCount[f] ?? 0) + 1;
  for (const a of s.achievements) achieved[a] = (achieved[a] ?? 0) + 1;
  worths.push(netWorth(s));
  if (i === 0) {
    try { const rp = replay(cfg, s.actions); if (serialize(rp) !== serialize(s)) bad(`${cfg.seed}: replay diverged`); else replays++; }
    catch (e) { bad(`${cfg.seed}: replay threw: ${(e as Error).message}`); }
  }
}
// static checks
const reach = new Set(['balmora']); let grew = true;
while (grew) { grew = false; for (const r of C.routeList) { if (r.closed) continue; if (reach.has(r.a) && !reach.has(r.b)) { reach.add(r.b); grew = true; } if (reach.has(r.b) && !reach.has(r.a)) { reach.add(r.a); grew = true; } } }
const unreachable = C.locList.filter(l => !reach.has(l.id)).map(l => l.id);
if (unreachable.length) bad(`unreachable from Balmora at start: ${unreachable.join(', ')}`);
const neverFired = C.history.filter(h => !firedCount[h.id]).map(h => h.id);

worths.sort((a, b) => a - b);
console.log(`\n=== Engine diagnostics (${((Date.now() - t0) / 1000).toFixed(1)}s) ===`);
console.log(`games ${games} (6 backgrounds × 3 difficulties × ${perCombo}) · actions ${steps} · rejected-but-handled ${errors}`);
console.log(`finished ${finished} · deaths ${deaths} · entered Long Chronicle ${chronicles} · finished it ${chronicleDone} · replays verified ${replays}`);
console.log(`history events fired at least once: ${C.history.length - neverFired.length}/${C.history.length}${neverFired.length ? ` (never: ${neverFired.join(', ')})` : ''}`);
console.log(`distinct encounters seen: ${encSeen.size}/${C.encounters.filter(e => e.weight > 0).length + 5} (incl. customs)`);
console.log(`achievements earned by random play: ${Object.keys(achieved).length}/${C.achievements.length}`);
console.log(`net worth (random play) p10 ${worths[Math.floor(worths.length * 0.1)]} · median ${worths[Math.floor(worths.length / 2)]} · max ${worths[worths.length - 1]}`);
console.log(`map connectivity: all ${C.locList.length} locations reachable from Balmora: ${unreachable.length === 0 ? 'yes' : 'NO'}`);
for (const [k, v] of Object.entries(warn)) console.log(`note: ${k} ×${v}`);
console.log(problems.length ? `\nPROBLEMS (${Object.values(kinds).reduce((a, b) => a + b, 0)} total, ${Object.keys(kinds).length} kinds; first examples):\n- ${problems.join('\n- ')}` : '\nNo invariant violations.');
process.exit(problems.length ? 1 : 0);
