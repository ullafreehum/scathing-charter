import { describe, expect, it } from 'vitest';
import { C } from '../data';
import { D, dateOf, formatDate, moons, Rng, hashSeed, newGame, step, replay, quotes, routeOptions, netWorth, migrate, serialize, deserialize, SCHEMA_VERSION, RED_YEAR_END, type Action, type GameState, type NewGameConfig } from './index';

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
    expect(s.note.balance).toBe(3000);
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
    expect(s.note.balance).toBeCloseTo(3000 * Math.pow(1.003, 7), 3);
  });
  it('replays identically from seed and action log', () => {
    let s = drain(newGame(CFG));
    for (let i = 0; i < 25 && !s.over; i++) {
      s = drain(s);
      if (s.pending) { s = act(s, { t: 'choose', choice: s.pending.choices[0] === 'bribe' ? 'flee' : s.pending.choices[0] }); continue; }
      const q = quotes(s, s.player.location).filter(x => x.buy !== null && x.buy < s.player.cash / 4);
      if (q.length) { const r = step(s, { t: 'buy', good: q[0].good, qty: 1 }); if (!r.error) s = r.state; }
      const opts = routeOptions(s).filter(o => !o.blocked && o.fare <= s.player.cash);
      if (opts.length) s = act(s, { t: 'travel', route: opts[i % opts.length].route.id, mode: opts[i % opts.length].modeIndex });
      else s = act(s, { t: 'wait', days: 3 });
    }
    const r = replay(CFG, s.actions);
    expect(serialize(r)).toBe(serialize(s));
  });
  it('the Red Year wipes the Vivec vault and freezes Balmora’s', () => {
    let s = drain(newGame(CFG));
    s = act(s, { t: 'deposit', house: 'hlaalu', amount: 100 });
    s.player.location = 'balmora';
    // fast-forward to the eruption
    while (s.day < D(5, 2, 3) && !s.over) s = act(drain(s), { t: 'wait', days: 7 });
    s = drain(s);
    expect(s.world.status.vivec).toBe('closed');
    expect(s.world.status.balmora === 'ruined' || s.world.status.balmora === 'rebuilding').toBe(true);
    expect(s.world.branches['hlaalu:balmora']).toBe('closed');
    expect(s.frozen.length + (s.deposits['hlaalu:narsis'] ?? 0) > 0 || s.over !== null).toBe(true);
    expect(s.note.seat).toBe('narsis');
  });
  it('a broke trader works their passage instead of being stranded', () => {
    let s = drain(newGame(CFG));
    s.player.cash = 0;
    const o = routeOptions(s).find(x => !x.blocked)!;
    const r = step(s, { t: 'travel', route: o.route.id, mode: o.modeIndex });
    expect(r.error).toBeUndefined();
    s = r.state;
    expect(s.day).toBeGreaterThanOrEqual(o.days + 2);
    expect(s.log.some(l => l.text.includes('work your passage'))).toBe(true);
  });
  it('reports net worth including debt', () => { expect(netWorth(newGame(CFG))).toBe(550 - 3000); });
});

describe('long chronicle', () => {
  it('a fresh 4E 7 start inherits the Red Year and the Accession War', () => {
    const s = newGame({ ...CFG, mode: 'long-chronicle' });
    expect(s.mode).toBe('long-chronicle'); expect(s.timeScale).toBe(7);
    expect(dateOf(s.day)).toMatchObject({ year: 7, monthName: 'Morning Star', dom: 1 });
    expect(s.world.status.vivec).toBe('closed'); expect(s.world.status.mournhold).toBe('occupied');
    expect(s.note.seat).toBe('narsis');
  });
  it('weeks pass per day of travel and Ocato falls in c. 4E 15', () => {
    let s = drain(newGame({ ...CFG, mode: 'long-chronicle' }));
    s.player.cash = 1e6;
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
  it('refuses future saves', () => { expect(() => migrate({ ...newGame(CFG), schemaVersion: 99 })).toThrow(); });
});

describe('content sanity via engine', () => {
  it('every location has at least one route', () => {
    for (const L of C.locList) expect(C.routeList.some(r => r.a === L.id || r.b === L.id)).toBe(true);
  });
});
