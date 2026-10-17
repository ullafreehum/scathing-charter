// Headless balance simulation: a greedy arbitrage bot plays full Red Year campaigns.
// Usage: npm run sim -- [games=100]
import { C } from '../src/data';
import { newGame, step, quotes, routeOptions, midPrice, netWorth, capacity, cargoWeight, type GameState, type Action } from '../src/engine';

function act(s: GameState, a: Action): GameState { const r = step(s, a); return r.error ? s : r.state; }

function play(seed: string): GameState {
  let s = newGame({ seed, backgroundId: 'hlaalu-bastard', name: 'Bot', difficulty: 'tong' });
  for (let turn = 0; turn < 2000 && !s.over; turn++) {
    while (s.inbox.length) s = act(s, { t: 'ack' });
    if (s.pending) {
      const ch = s.pending.choices;
      const pick = ch.includes('bribe') && s.player.cash > s.pending.bribe * 3 ? 'bribe' : ch.includes('wait-out') ? 'wait-out' : ch.includes('pass') ? 'pass' : ch.includes('decline') ? 'decline' : ch.includes('declare') ? 'declare' : 'flee';
      s = act(s, { t: 'choose', choice: pick }); continue;
    }
    const loc = s.player.location;
    if (s.player.health < 60) s = act(s, { t: 'heal' });
    // sell anything profitable
    for (const q of quotes(s, loc)) {
      const lot = s.player.cargo[q.good];
      if (lot && q.sell !== null && q.legality === 'legal' && q.sell >= lot.cost * 1.02) s = act(s, { t: 'sell', good: q.good, qty: lot.qty });
    }
    // pay the note when flush
    if (!s.note.cleared && (loc === s.note.seat || s.note.agents.includes(loc)) && s.player.cash > 600) s = act(s, { t: 'pay', amount: s.player.cash - 400 });
    if (s.player.conveyance === 'pack-guar' && s.note.cleared && s.player.cash > 5000 && C.locs[loc].outfitter) s = act(s, { t: 'gear', id: 'guar-cart' });
    // choose best (route, good)
    let best: { a: Action; buy?: Action; score: number } | null = null;
    for (const o of routeOptions(s)) {
      if (o.fare > s.player.cash) continue;
      for (const q of quotes(s, loc)) {
        if (q.buy === null || q.legality !== 'legal') continue;
        const dm = midPrice(s, o.dest, q.good); if (dm === null) continue;
        const g = C.goods[q.good];
        const qty = Math.max(0, Math.min(Math.floor((s.player.cash - o.fare - 20) / q.buy), Math.floor((capacity(s) - cargoWeight(s)) / g.weight), 60));
        const score = ((dm * 0.82 - q.buy) * qty - o.fare - o.risk * 15) / o.days;
        if (qty > 0 && (!best || score > best.score)) best = { a: { t: 'travel', route: o.route.id, mode: o.modeIndex }, buy: { t: 'buy', good: q.good, qty }, score };
      }
    }
    if (best && best.score > 0) { if (best.buy) s = act(s, best.buy); const n = act(s, best.a); s = n === s ? act(s, { t: 'wait', days: 1 }) : n; }
    else {
      const o = routeOptions(s);
      s = o.length ? act(s, { t: 'travel', route: o[turn % o.length].route.id, mode: o[turn % o.length].modeIndex }) : act(s, { t: 'wait', days: 3 });
    }
  }
  return s;
}

const n = Number(process.argv[2] ?? 100);
const res: { nw: number; cleared: boolean; reason: string; day: number }[] = [];
for (let i = 0; i < n; i++) { const s = play(`sim-${i}`); res.push({ nw: netWorth(s), cleared: s.note.cleared, reason: s.over?.reason ?? 'turns', day: s.day }); }
res.sort((a, b) => a.nw - b.nw);
const pct = (p: number) => res[Math.floor(p * (res.length - 1))].nw;
console.log(`games ${n} | p10 ${pct(0.1)} | median ${pct(0.5)} | p90 ${pct(0.9)} | max ${pct(1)}`);
console.log(`note cleared ${res.filter(r => r.cleared).length}/${n} | ruined (nw<0) ${res.filter(r => r.nw < 0).length} | deaths ${res.filter(r => r.reason === 'death').length} | unfinished ${res.filter(r => r.reason === 'turns').length}`);
