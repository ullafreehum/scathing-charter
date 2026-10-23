import { describe, expect, it } from 'vitest';
import { C } from '../data';
import { drellothLine, knewParagraph, merchantLine, migrate, newGame, serialize, step, type GameState } from './index';
import { DRELLOTH } from '../data/voice';
import { logV } from './util';

const CFG = { seed: 'voice', backgroundId: 'deserter', name: 'Tester', difficulty: 'fair' as const };
const base = (): GameState => newGame(CFG);

describe('0.10.6 texture', () => {
  it('migrates a v7 save by adding an empty heardDay', () => {
    const raw = JSON.parse(serialize(base())); raw.schemaVersion = 7; delete raw.heardDay;
    const m = migrate(raw);
    expect(m.heardDay).toEqual({}); expect(m.schemaVersion).toBe(8);
  });
  it('writes the Ledger in the naive voice before the eruption and the sober one after', () => {
    const s = base();
    logV(s, 'borrow', 'bad', 100); s.world.flags.erupted = 1; logV(s, 'borrow', 'bad', 100);
    const [a, b] = s.log.slice(-2).map(l => l.text);
    expect(a).not.toBe(b);
    expect(a).not.toMatch(/eruption|Baar Dau|Sun’s Dawn/i);
  });
  it('says nothing about the eruption to a player who was not there', () => { expect(knewParagraph(base())).toBeNull(); });
  it('counts the warnings and the vault when the eruption falls', () => {
    let s = base(); const ev = C.history.find(h => h.id === 'red-year-eruption')!;
    s.heard = [ev.foreshadow!.rumors[0], ev.foreshadow!.rumors[1]]; s.heardDay = { [s.heard[0]]: ev.day - 40, [s.heard[1]]: ev.day - 10 };
    s.deposits.vivec = 800; s.world.branches.vivec = 'open';
    s = step({ ...s, day: ev.day - 1 }, { t: 'wait', days: 1 }).state;
    expect(s.world.fired).toContain('red-year-eruption');
    expect(s.stats.lostAtBaarDau?.deposits).toBeGreaterThan(799);
    const p = knewParagraph(s)!; expect(p).toContain('2 times'); expect(p).toContain('vaults');
  });
  it('picks merchant lines by what the town knows of you, and Drelloth by how you paid', () => {
    const s = base(); const bal = C.locs.balmora; const m = bal.merchants.find(x => x.lines)!;
    expect(merchantLine(s, m, 'balmora')).toBe(m.line);
    s.player.mercy = 70; expect(merchantLine(s, m, 'balmora')).toBe(m.lines!.saint);
    s.player.profiteering = 4000; expect(merchantLine(s, m, 'balmora')).toBe(m.lines!.famine);
    s.player.mercy = 0; s.player.profiteering = 0; s.stats.visits = { balmora: 4 }; expect(merchantLine(s, m, 'balmora')).toBe(m.lines!.regular);
    expect(drellothLine(s)).toBe(DRELLOTH.patient);
    s.note.lastPaymentDay = 5; expect(drellothLine(s)).toBe(DRELLOTH.paying);
    s.note.cleared = true; expect(drellothLine(s)).toBe(DRELLOTH.cleared);
  });
  it('counts repeat arrivals', () => {
    let s = base(); s.player.cash = 5000; const opt = (s0: GameState) => C.routeList.find(r => r.a === s0.player.location || r.b === s0.player.location)!;
    const r = opt(s); const r1 = step(s, { t: 'travel', route: r.id, mode: 0 }); s = r1.state;
    if (!s.pending) expect(Object.values(s.stats.visits ?? {}).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });
});
