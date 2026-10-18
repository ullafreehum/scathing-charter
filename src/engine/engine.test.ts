import { describe, expect, it } from 'vitest';
import { C } from '../data';
import { BORROW_RATE_RISE, borrowRate, daysUntil, depositRate, DEPTH, bulkBuyTotal, capacity, cargoWeight, maxBuyQty, DIFFICULTY, D, dateOf, formatDate, moons, Rng, hashSeed, newGame, step, replay, quotes, routeOptions, routeOptionsFrom, netWorth, migrate, serialize, deserialize, SCHEMA_VERSION, RED_YEAR_END, type Action, type GameState, type NewGameConfig } from './index';

const CFG: NewGameConfig = { seed: 'test-seed', backgroundId: 'hlaalu-bastard', name: 'Tester', difficulty: 'tong' };
function act(s: GameState, a: Action): GameState { const r = step(s, a); if (r.error) throw new Error(r.error); return r.state; }
function drain(s: GameState): GameState { while (s.inbox.length) s = act(s, { t: 'ack' }); return s; }

describe('rng', () => {
  it('is deterministic per seed and differs across seeds', () => {
    const a = new Rng(hashSeed('x')), b = new Rng(hashSeed('x')), c = new Rng(hashSeed('y'));
    const sa = Array.from({ length: 5 }, () => a.u32()), sb = Array.from({ length: 5 }, () => b.u32()), sc = Array.from({ length: 5 }, () => c.u32());
    expect(sa).toEqual(sb); expect(sa).not.toEqual(sc);
  });
  it('gauss is roughly standard', () => {
    const r = new Rng(hashSeed('g')); let s = 0, s2 = 0; const n = 20000;
    for (let i = 0; i < n; i++) { const x = r.gauss(); s += x; s2 += x * x; }
    expect(Math.abs(s / n)).toBeLessThan(0.05); expect(Math.abs(s2 / n - 1)).toBeLessThan(0.08);
  });
});

describe('calendar', () => {
  it('starts on Tirdas, 1 Morning Star 4E 4', () => {
    expect(formatDate(0)).toBe('Tirdas, 1st of Morning Star, 4E 4');
    expect(dateOf(D(5, 1, 1)).weekday).toBe('Middas');
    expect(dateOf(D(6, 1, 1)).weekday).toBe('Turdas');
  });
  it('anchors to Sundas, 17 Last Seed 4E 201', () => { expect(dateOf(D(201, 8, 17)).weekday).toBe('Sundas'); });
  it('has 365-day years and the eruption on 3 Sun’s Dawn', () => {
    expect(D(5, 1, 1)).toBe(365);
    expect(dateOf(D(5, 2, 3))).toMatchObject({ year: 5, monthName: "Sun's Dawn", dom: 3 });
    expect(dateOf(RED_YEAR_END)).toMatchObject({ year: 6, monthName: 'Evening Star', dom: 31 });
  });
  it('the Pride of Tel Vos journal day is a Middas', () => { expect(dateOf(D(6, 5, 6)).weekday).toBe('Middas'); });
  it('moon phases stay in range', () => { for (let d = 0; d < 100; d++) { const m = moons(d); expect(m.masser).toBeGreaterThanOrEqual(0); expect(m.secunda).toBeLessThan(8); } });
});

describe('game', () => {
  it('starts in Balmora with the note', () => {
    const s = newGame(CFG);
    expect(s.player.location).toBe('balmora');
    expect(s.note.balance).toBe(DIFFICULTY.tong.debt);
    expect(quotes(s, 'balmora').length).toBeGreaterThan(8);
  });
  it('buys and sells within cash and capacity, never mutating input', () => {
    let s = drain(newGame(CFG));
    const before = JSON.stringify(s);
    const q = quotes(s, 'balmora').find(x => x.good === 'kwama-eggs' && x.buy !== null)!;
    s = act(s, { t: 'buy', good: 'kwama-eggs', qty: 5 });
    expect(JSON.stringify(newGame(CFG))).not.toBe(''); // sanity
    expect(s.player.cargo['kwama-eggs'].qty).toBe(5);
    expect(s.player.cash).toBeLessThan(550);
    expect(q.buy).toBeGreaterThan(0);
    expect(step(s, { t: 'buy', good: 'kwama-eggs', qty: 999 }).error).toBeTruthy();
    s = act(s, { t: 'sell', good: 'kwama-eggs', qty: 5 });
    expect(s.player.cargo['kwama-eggs']).toBeUndefined();
    expect(before).not.toContain('"kwama-eggs":{"qty":5');
  });
  it('accrues compound interest daily', () => {
    let s = drain(newGame(CFG));
    s = act(s, { t: 'wait', days: 7 });
    expect(s.note.balance).toBeCloseTo(DIFFICULTY.tong.debt * Math.pow(1.003, 7), 3);
  });
  it('lets a broke trader hire on for wages', () => {
    let s = drain(newGame(CFG));
    const cash = s.player.cash, day = s.day;
    s = drain(act(s, { t: 'labour', job: C.jobs[s.player.location][0].id, days: 3 }));
    expect(s.day).toBe(day + 3);
    expect(s.player.cash).toBeGreaterThan(cash);
  });
  it('replays identically from seed and action log', () => {
    let s = drain(newGame(CFG));
    for (let i = 0; i < 25 && !s.over; i++) {
      s = drain(s);
      if (s.pending) { s = act(s, { t: 'choose', choice: s.pending.choices[0] === 'bribe' ? 'flee' : s.pending.choices[0] }); continue; }
      const q = quotes(s, s.player.location).filter(x => x.buy !== null && x.buy < s.player.cash / 4);
      if (q.length) { const r = step(s, { t: 'buy', good: q[0].good, qty: 1 }); if (!r.error) s = r.state; }
      const opts = routeOptions(s).filter(o => o.fare <= s.player.cash);
      if (opts.length) s = act(s, { t: 'travel', route: opts[i % opts.length].route.id, mode: opts[i % opts.length].modeIndex });
      else s = act(s, { t: 'wait', days: 3 });
    }
    const r = replay(CFG, s.actions);
    expect(serialize(r)).toBe(serialize(s));
  });
  it('the Red Year wipes the Vivec vault and freezes Balmora’s', () => {
    let s = drain(newGame(CFG));
    s = act(s, { t: 'deposit', amount: 100 });
    s.player.location = 'balmora';
    s.note.cleared = true; // no collectors while fast-forwarding
    // fast-forward to the eruption
    while (s.day < D(5, 2, 3) && !s.over) s = act(drain(s), { t: 'wait', days: 7 });
    s = drain(s);
    expect(s.world.status.vivec).toBe('camp');
    expect(s.world.status.balmora === 'ruined' || s.world.status.balmora === 'rebuilding').toBe(true);
    expect(s.world.branches['balmora']).toBe('closed');
    expect(s.frozen.length + (s.deposits['narsis'] ?? 0) > 0 || s.over !== null).toBe(true);
    expect(s.note.seat).toBe('narsis');
  });
  it('a broke trader works their passage instead of being stranded', () => {
    let s = drain(newGame(CFG));
    s.player.cash = 0;
    const o = routeOptions(s)[0];
    const r = step(s, { t: 'travel', route: o.route.id, mode: o.modeIndex });
    expect(r.error).toBeUndefined();
    s = r.state;
    expect(s.day).toBeGreaterThanOrEqual(Math.min(3, o.days + 1));
    expect(s.log.some(l => l.text.includes('work your passage'))).toBe(true);
  });
  it('caps every leg at three days', () => {
    const s = drain(newGame(CFG));
    for (const L of C.locList) expect(routeOptionsFrom(s, L.id).every(o => o.days <= 3)).toBe(true);
  });
  it('the Tong always lends, at a rising rate', () => {
    let s = drain(newGame(CFG));
    const rate = s.note.rate, debt = s.note.balance;
    s = act(s, { t: 'borrow', amount: s.note.original * 3 });
    expect(s.note.balance).toBe(debt + s.note.original * 3);
    expect(s.note.rate).toBeGreaterThan(rate);
  });
  it('retires you automatically at the end date, ranked by net worth', () => {
    let s = drain(newGame(CFG));
    s = { ...s, day: s.endDay - 1 };
    s = drain(act(s, { t: 'wait', days: 1 }));
    expect(s.over?.reason).toBe('calendar');
    expect(s.ending?.kind).toBe('retire');
    expect(s.ending?.worth).toBe(netWorth(s));
    s = act(s, { t: 'chronicle' });
    expect(s.over).toBeNull();
    expect(s.mode).toBe('long-chronicle');
  });
  it('early retirement needs a milestone', () => {
    let s = drain(newGame(CFG));
    expect(step(s, { t: 'retire' }).error).toBeTruthy();
    s.note.cleared = true; s.note.balance = 0;
    s = drain(act(s, { t: 'wait', days: 1 }));
    s = act(s, { t: 'retire' });
    expect(s.over?.reason).toBe('retired');
    expect(s.ending?.kind).toBe('retire');
  });
  it('warns at 4x and 5x the note and marks you past 6x', () => {
    let s = drain(newGame(CFG));
    expect(step(s, { t: 'borrow', amount: s.note.original * 6 }).error).toBeTruthy();
    s.note.balance = s.note.original * 4.2;
    s = act(s, { t: 'wait', days: 1 });
    expect(s.inbox.some(m => 'title' in m && m.title.includes('4 times'))).toBe(true);
    s = drain(s); s.note.balance = s.note.original * 5.2;
    s = act(s, { t: 'wait', days: 1 });
    expect(s.inbox.some(m => 'title' in m && m.title.includes('5 times'))).toBe(true);
    s = drain(s); s.note.balance = s.note.original * 6.2;
    s = act(s, { t: 'wait', days: 1 });
    expect(s.over?.reason).toBe('marked');
    expect(s.ending?.kind).toBe('mark');
  });
  it('finds books in bookshop towns and puts them in the Codex', () => {
    const s = newGame(CFG);
    expect(C.locs[s.player.location].books).toBe(true);
    for (const b of C.books.filter(b => b.from === undefined)) { expect(s.player.books).toContain(b.id); expect(s.codex).toContain(`book:${b.id}`); }
  });
  it('a tavern round quietly adds a tale or a quarrel to the Codex', () => {
    let s = drain(newGame(CFG)); s.player.cash = 1000;
    const before = s.codex.length;
    for (let i = 0; i < 5; i++) s = drain(act(s, { t: 'rumor' }));
    expect(s.codex.filter(id => id.startsWith('rumor:') || id.startsWith('dispute:')).length).toBeGreaterThan(0);
    expect(s.codex.length).toBeGreaterThan(before);
  });
  it('wins the moment the Scathing Charter is bought with the debt cleared', () => {
    let s = drain(newGame(CFG));
    s.player.location = C.charter.offices[0]; s.world.flags.relief = 1;
    s.player.cash = 200000; s.charter.tier = 2;
    expect(step(s, { t: 'charter' }).error).toMatch(/Tong/);
    s.note.cleared = true; s.note.balance = 0;
    s = act(s, { t: 'charter' });
    expect(s.charter.tier).toBe(3);
    expect(s.over?.reason).toBe('won');
    expect(s.ending?.kind).toBe('win');
    s = act(s, { t: 'chronicle' });
    expect(s.over).toBeNull();
  });
  it('reports net worth including debt', () => { expect(netWorth(newGame(CFG))).toBe(DIFFICULTY.tong.cash - DIFFICULTY.tong.debt); });
});

describe('long chronicle', () => {
  it('a fresh 4E 7 start inherits the Red Year and the Accession War', () => {
    const s = newGame({ ...CFG, mode: 'long-chronicle' });
    expect(s.mode).toBe('long-chronicle'); expect(s.timeScale).toBe(7);
    expect(dateOf(s.day)).toMatchObject({ year: 7, monthName: 'Morning Star', dom: 1 });
    expect(s.world.status.vivec).toBe('camp'); expect(s.world.status.mournhold).toBe('occupied');
    expect(s.note.seat).toBe('narsis');
  });
  it('weeks pass per day of travel and Ocato falls in c. 4E 15', () => {
    let s = drain(newGame({ ...CFG, mode: 'long-chronicle' }));
    s.player.cash = 1e6;
    s.note.cleared = true; // no collectors while fast-forwarding
    while (s.day < D(15, 9, 1) && !s.over) s = drain(act(s, { t: 'wait', days: 7 }));
    expect(s.world.fired).toContain('ocato-assassinated');
    expect(s.world.flags.interregnum).toBe(1);
  });
});

describe('saves', () => {
  it('round-trips and migrates v0', () => {
    const s = newGame(CFG);
    expect(deserialize(serialize(s))).toEqual(s);
    const old = JSON.parse(serialize(s)); delete old.schemaVersion; delete old.heard; delete old.world.news;
    const m = migrate(old);
    expect(m.schemaVersion).toBe(SCHEMA_VERSION); expect(m.heard).toEqual([]); expect(m.world.news).toEqual([]);
  });
  it('migrates v1 → v2 with an empty price book', () => {
    const old = JSON.parse(serialize(newGame(CFG))); delete old.seen; old.schemaVersion = 1;
    const m = migrate(old);
    expect(m.schemaVersion).toBe(SCHEMA_VERSION); expect(m.seen).toEqual({});
    expect(m.player.heat).toBe(0); expect(m.charter.tier).toBe(0); expect(m.warehouse).toEqual({});
  });
  it('refuses future saves', () => { expect(() => migrate({ ...newGame(CFG), schemaVersion: 99 })).toThrow(); });
});

describe('content sanity via engine', () => {
  it('every location has at least one route', () => {
    for (const L of C.locList) expect(C.routeList.some(r => r.a === L.id || r.b === L.id)).toBe(true);
  });
});

describe('price book', () => {
  it('records the starting market and every market you stand in', () => {
    let s = drain(newGame(CFG));
    expect(s.seen.balmora.day).toBe(0);
    expect(Object.keys(s.seen.balmora.buy).length).toBeGreaterThan(5);
    const opt = routeOptions(s)[0];
    s = act(s, { t: 'travel', route: opt.route.id, mode: opt.modeIndex });
    while (s.pending) s = act(s, { t: 'choose', choice: s.pending.choices.includes('pass') ? 'pass' : s.pending.choices[s.pending.choices.length - 1] });
    s = drain(s);
    if (s.player.location !== 'road') expect(s.seen[s.player.location]?.day).toBe(s.day);
    expect(s.seen.balmora.day).toBe(0);
  });
  it('acknowledges several inbox items at once', () => {
    const s = newGame(CFG); s.inbox.push({ kind: 'result', title: 'a', text: 'b' });
    expect(act(s, { t: 'ack', n: 2 }).inbox).toHaveLength(0);
  });
});

describe('market memory', () => {
  it('a flooded market stays low for weeks, not days', () => {
    let s = drain(newGame(CFG)); s.player.cargo.saltrice = { qty: 40, cost: 5 };
    s = act(s, { t: 'sell', good: 'saltrice', qty: 40 });
    const after = s.markets.balmora.saltrice.sat;
    expect(after).toBeLessThan(1);
    s = drain(act(s, { t: 'wait', days: 7 }));
    expect(s.markets.balmora.saltrice.sat).toBeLessThan(1 - (1 - after) * 0.75); // still more than 3/4 of the dip after a week
  });
});

describe('smuggling heat', () => {
  it('rises when selling contraband to a fence and falls by one a day', () => {
    let s = drain(newGame(CFG)); s.player.cargo['moon-sugar'] = { qty: 20, cost: 40 };
    s = act(s, { t: 'sell', good: 'moon-sugar', qty: 20 });
    const h = s.player.heat;
    expect(h).toBeGreaterThan(2);
    s = drain(act(s, { t: 'wait', days: 3 }));
    expect(s.player.heat).toBe(Math.max(0, h - 3));
  });
});

describe('the Scathing Charter', () => {
  const ready = () => { const s = drain(newGame(CFG)); s.world.flags.relief = 1; s.note.cleared = true; s.note.balance = 0; s.player.cash = 200000; return s; };
  /** Buys the next tier as if the current one had been held long enough. */
  const buy = (s: GameState) => { const x = structuredClone(s); if (x.charter.boughtDay !== undefined) x.charter.boughtDay -= 1000; return drain(act(x, { t: 'charter' })); };
  it('sells the next tier only after the current one is held 30, then 60 days', () => {
    let s = buy(ready());
    expect(s.charter.boughtDay).toBe(s.day);
    expect(step(s, { t: 'charter' }).error).toMatch(/hold your Relief supplier licence until/);
    for (let i = 0; i < 4; i++) s = drain(act(s, { t: 'wait', days: 7 }));
    expect(step(s, { t: 'charter' }).error).toBeTruthy(); // 28 days
    s = drain(act(drain(act(s, { t: 'wait', days: 1 })), { t: 'wait', days: 1 }));
    s = drain(act(s, { t: 'charter' }));
    expect(s.charter.tier).toBe(2);
    expect(step(s, { t: 'charter' }).error).toMatch(/until/);
  });
  it('is not on sale before the relief, or while you owe the Tong', () => {
    const s = drain(newGame(CFG)); s.player.cash = 200000;
    expect(step(s, { t: 'charter' }).error).toMatch(/No charters/);
    const t = ready(); t.note.cleared = false; t.note.balance = 100;
    expect(step(t, { t: 'charter' }).error).toBeUndefined(); // tiers 1 and 2 don't need the debt cleared
    t.charter.tier = 2;
    expect(step(t, { t: 'charter' }).error).toMatch(/Camonna Tong/);
  });
  it('sells tiers in order and counts them toward net worth', () => {
    let s = ready(); const nw0 = netWorth(s);
    s = drain(act(s, { t: 'charter' }));
    expect(s.charter.tier).toBe(1); expect(s.player.cash).toBe(200000 - C.charter.tiers[0].price);
    expect(netWorth(s)).toBe(Math.round(nw0 - C.charter.tiers[0].price * (1 - C.charter.bookValue)));
  });
  it('pays dividends at the full tier, halved in war', () => {
    let s = ready(); s.player.cash = 1e6; s.mode = 'long-chronicle'; // in the Red Year the third tier wins the game
    for (let i = 0; i < 3; i++) s = buy(s);
    expect(s.charter.tier).toBe(3);
    const c0 = s.player.cash; s.world.flags.war = 1;
    for (let i = 0; i < 5; i++) s = drain(act(s, { t: 'wait', days: 7 }));
    expect(s.charter.dividends).toBe(C.charter.dividend / 2);
    expect(s.player.cash).toBeGreaterThan(c0 - 200);
  });
  it('must be renewed under the new council, or loses a tier', () => {
    let s = drain(act(ready(), { t: 'charter' }));
    s.world.flags.charterRenewal = 1;
    s = drain(act(s, { t: 'wait', days: 1 }));
    expect(s.charter.renewDue).not.toBeNull();
    const renewed = drain(act(s, { t: 'renew' }));
    expect(renewed.charter.renewDue).toBeNull(); expect(renewed.charter.tier).toBe(1);
    for (let i = 0; i < 10; i++) s = drain(act(s, { t: 'wait', days: 7 }));
    expect(s.charter.tier).toBe(0); expect(s.charter.renewDue).toBeNull();
  });
  it('stores goods in the Narsis warehouse at tier 2', () => {
    let s = ready(); s.player.cash = 1e6; s.player.location = 'narsis';
    s = buy(buy(s));
    s.player.cargo.timber = { qty: 10, cost: 30 };
    s = act(s, { t: 'stash', good: 'timber', qty: 10 });
    expect(s.player.cargo.timber).toBeUndefined(); expect(s.warehouse.timber.qty).toBe(10);
    s = act(s, { t: 'unstash', good: 'timber', qty: 4 });
    expect(s.player.cargo.timber.qty).toBe(4); expect(s.warehouse.timber.qty).toBe(6);
  });
});

describe('buying the maximum', () => {
  it('the maximum is exactly what you can pay for, and one more is refused', () => {
    const s = drain(newGame(CFG));
    for (const cash of [320, 777, 2500]) {
      s.player.cash = cash;
      for (const q of quotes(s, 'balmora').filter(x => x.buy !== null)) {
        const G = C.goods[q.good]; const free = capacity(s) - cargoWeight(s);
        const max = maxBuyQty(q.buy, DEPTH[G.category], cash, free, G.weight);
        if (max > 0) { expect(step(s, { t: 'buy', good: q.good, qty: max }).error).toBeUndefined(); expect(bulkBuyTotal(q.buy!, max, DEPTH[G.category])).toBeLessThanOrEqual(cash); }
        if ((max + 1) * G.weight <= free) expect(step(s, { t: 'buy', good: q.good, qty: max + 1 }).error).toMatch(/costs/);
      }
    }
  });
});


describe('economy fixes (0.10)', () => {
  it('strongboxes pay by city: most in the cities the Red Year threatens', () => {
    expect(depositRate('vivec')).toBe(0.0012); expect(depositRate('mournhold')).toBe(0.0008); expect(depositRate('narsis')).toBe(0.0003);
    let s = drain(newGame(CFG)); s.deposits = { balmora: 10000, narsis: 10000 };
    s = drain(act(s, { t: 'wait', days: 1 }));
    expect(s.deposits.balmora).toBeCloseTo(10012, 6); expect(s.deposits.narsis).toBeCloseTo(10003, 6);
  });
  it('only a payment of 30 days of interest resets the collectors’ clock', () => {
    const s = drain(newGame(CFG)); s.note.lastPaymentDay = -50;
    const month = s.note.balance * s.note.rate * 30;
    expect(act(s, { t: 'pay', amount: 1 }).note.lastPaymentDay).toBe(-50);
    expect(act(s, { t: 'pay', amount: Math.ceil(month) }).note.lastPaymentDay).toBe(s.day);
  });
  it('borrowing raises the rate by 0.08% per note borrowed, and the clock to the mark is printed from it', () => {
    const s = drain(newGame(CFG));
    expect(borrowRate(s, s.note.original)).toBeCloseTo(s.note.rate + BORROW_RATE_RISE, 12);
    expect(daysUntil(100, 0.01, 99)).toBe(0); expect(daysUntil(100, 0.01, 100)).toBe(1);
    expect(daysUntil(100, 0.01, 110)).toBe(10); // 1.01^10 = 1.1046
    expect(daysUntil(100, 0, 110)).toBeNull();
  });
  it('the Tong note is 4,000 on Tong Terms', () => { expect(DIFFICULTY.tong.debt).toBe(4000); });
  it('a v6 save loads as v7 and its charter tier counts as held long enough', () => {
    const s = drain(newGame(CFG)); s.charter.tier = 1; s.world.flags.relief = 1; s.note.cleared = true; s.note.balance = 0; s.player.cash = 1e6;
    const raw = JSON.parse(serialize(s)); raw.schemaVersion = 6; delete raw.charter.boughtDay;
    const m = migrate(raw);
    expect(m.schemaVersion).toBe(SCHEMA_VERSION); expect(SCHEMA_VERSION).toBe(7);
    expect(drain(act(m, { t: 'charter' })).charter.tier).toBe(2);
  });
});
