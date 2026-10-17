import { describe, expect, it } from 'vitest';
import { C } from '../data';
import { CARD, FAVOUR_DISCOUNT, FAVOUR_MAX, buildPending, cardChance, cardOptions, charterPrice, choiceOdds, contrabandValue, fairValue, migrate, newGame, serialize, step, type Action, type GameState, type NewGameConfig } from './index';

const CFG: NewGameConfig = { seed: 'cards', backgroundId: 'hlaalu-bastard', name: 'Tester', difficulty: 'tong' };
function act(s: GameState, a: Action): GameState { const r = step(s, a); if (r.error) throw new Error(r.error); return r.state; }
function start(seed = CFG.seed): GameState { let s = newGame({ ...CFG, seed }); while (s.inbox.length) s = act(s, { t: 'ack' }); return s; }
/** A game with the given card open (no days left on the road, so choosing resolves it on the spot). */
function card(defId: string, setup: (s: GameState) => void = () => {}, seed?: string): GameState {
  const s = start(seed); setup(s);
  const def = C.encounters.find(e => e.id === defId)!;
  s.pending = buildPending(s, def, 'balmora~ebonheart', 'ebonheart', 0, def.kind === 'customs');
  return s;
}
const opt = (s: GameState, id: string) => cardOptions(s).find(o => o.id === id)!;
const sugar = (s: GameState) => { s.player.cargo = { 'moon-sugar': { qty: 10, cost: 40 } }; };

describe('crossing cards', () => {
  it('prints odds that are exactly the rolled odds, on every card', () => {
    for (const def of C.encounters) {
      const s = card(def.id, x => { sugar(x); x.player.scrolls.chameleon = 1; });
      for (const o of cardOptions(s)) {
        const rolled = choiceOdds(s, o.id);
        // a sure thing (odds 1) is printed without a percentage
        expect(o.odds, `${def.id}/${o.id}`).toBe(rolled === 1 ? undefined : rolled);
        expect(o.stake.length, `${def.id}/${o.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('a Legion patrol on the road never leaves you stuck on the road', () => {
    const def = C.encounters.find(e => e.id === 'legion-patrol')!;
    const base = start();
    base.player.cargo = { 'moon-sugar': { qty: 5, cost: 40 } }; base.player.location = 'road';
    base.pending = buildPending(base, def, 'balmora~ebonheart', 'ebonheart', 1, true);
    for (const o of cardOptions(base).filter(x => !x.disabled)) {
      const r = step(base, { t: 'choose', choice: o.id });
      if (r.error || r.state.over) continue;
      if (!r.state.pending) expect(C.locs[r.state.player.location], o.id).toBeDefined();
    }
  });

  it('customs: declaring pays the printed duty and keeps the goods', () => {
    const s = card('legion-customs', sugar);
    const duty = Math.round(contrabandValue(s, 'ebonheart') * CARD.duty);
    expect(duty).toBeGreaterThan(0);
    expect(opt(s, 'declare').stake).toContain(String(duty));
    const n = act(s, { t: 'choose', choice: 'declare' });
    expect(n.player.cash).toBe(s.player.cash - duty);
    expect(n.player.cargo['moon-sugar'].qty).toBe(10);
  });

  it('customs: declaring without the duty money seizes the contraband, no fine', () => {
    const s = card('legion-customs', x => { sugar(x); x.player.cash = 0; });
    const n = act(s, { t: 'choose', choice: 'declare' });
    expect(n.player.cargo['moon-sugar']).toBeUndefined();
    expect(n.player.cash).toBe(0);
  });

  it('customs: a failed Chameleon loses the whole lot but costs no fine', () => {
    expect(choiceOdds(card('legion-customs', x => { sugar(x); x.player.scrolls.chameleon = 1; }), 'chameleon')).toBe(CARD.chameleonAtGate);
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const s = card('legion-customs', x => { sugar(x); x.player.scrolls.chameleon = 1; }, `cham-${i}`);
      const n = act(s, { t: 'choose', choice: 'chameleon' });
      expect(n.player.cash).toBe(s.player.cash);
      seen.add(n.player.cargo['moon-sugar'] ? 'kept' : 'lost');
    }
    expect([...seen].sort()).toEqual(['kept', 'lost']);
  });

  it('refugees: selling at cost returns what you paid and wins Charter favour', () => {
    const s = card('refugee-column', x => { x.player.cargo = { saltrice: { qty: 15, cost: 4 } }; });
    expect(opt(s, 'at-cost').stake).toContain('+40');
    const n = act(s, { t: 'choose', choice: 'at-cost' });
    expect(n.player.cash).toBe(s.player.cash + 40);
    expect(n.player.cargo.saltrice.qty).toBe(5);
    expect(n.charter.favour).toBe(1);
    expect(n.player.mercy).toBe(s.player.mercy + 2);
  });

  it('refugees: the crisis price is printed and paid, and Mercy falls', () => {
    const s = card('refugee-column', x => { x.player.cargo = { saltrice: { qty: 15, cost: 4 } }; });
    const total = 10 * Math.round(fairValue(s, 'saltrice') * 3);
    expect(opt(s, 'sell-dear').stake).toContain(`+${total}`);
    const n = act(s, { t: 'choose', choice: 'sell-dear' });
    expect(n.player.cash).toBe(s.player.cash + total);
    expect(n.player.mercy).toBe(s.player.mercy - 3);
  });

  it('refugees: with no food, the crisis-price option is disabled and refused', () => {
    const s = card('refugee-column', x => { x.player.cargo = {}; });
    expect(opt(s, 'sell-dear').disabled).toBeTruthy();
    expect(step(s, { t: 'choose', choice: 'sell-dear' }).error).toBeTruthy();
  });

  it('ash storm: waiting costs the printed interest; pushing through spoils 30% of perishables', () => {
    const s = card('ash-storm', x => { x.player.cargo = { 'kwama-eggs': { qty: 20, cost: 5 } }; });
    const stake = opt(s, 'wait-out').stake;
    const w = act(s, { t: 'choose', choice: 'wait-out' });
    expect(w.day).toBe(s.day + 2);
    expect(stake).toContain(`grows by ${Math.round(w.note.balance - s.note.balance)}`);
    const p = act(s, { t: 'choose', choice: 'press-on' });
    expect(p.player.cargo['kwama-eggs'].qty).toBe(20 - Math.ceil(20 * CARD.spoil));
    expect(p.day).toBe(s.day);
  });

  it('ash storm: a guide costs the fee and is refused when you cannot pay', () => {
    const s = card('ash-storm');
    expect(act(s, { t: 'choose', choice: 'guide' }).player.cash).toBe(s.player.cash - CARD.guideFee);
    const broke = card('ash-storm', x => { x.player.cash = CARD.guideFee - 1; });
    expect(opt(broke, 'guide').disabled).toBeTruthy();
    expect(step(broke, { t: 'choose', choice: 'guide' }).error).toBeTruthy();
  });

  it('Tong collectors: paying counts against the note; asking for time raises the rate', () => {
    const s = card('tong-enforcers', x => { x.player.cash = 1000; });
    const paid = act(s, { t: 'choose', choice: 'pay-note' });
    const fee = CARD.tongPay * CARD.tongFee;
    expect(opt(s, 'pay-note').stake).toContain(`${CARD.tongPay - fee} septims off your debt; they keep ${fee}`);
    expect(paid.player.cash).toBe(700);
    expect(paid.note.balance).toBeCloseTo(s.note.balance - (CARD.tongPay - fee), 6);
    expect(paid.note.lastPaymentDay).toBe(s.day);
    const time = act(s, { t: 'choose', choice: 'ask-time' });
    expect(time.note.rate).toBeCloseTo(s.note.rate + CARD.tongRate, 9);
  });

  it('Tong collectors: a small note is cleared exactly; in the Long Chronicle asking for time costs the same per real day', () => {
    const s = card('tong-enforcers', x => { x.player.cash = 1000; x.note.balance = 100; });
    const paid = act(s, { t: 'choose', choice: 'pay-note' });
    expect(paid.note.cleared).toBe(true);
    expect(paid.player.cash).toBe(1000 - Math.ceil(100 / (1 - CARD.tongFee)));
    const lc = card('tong-enforcers', x => { x.timeScale = 7; });
    expect(act(lc, { t: 'choose', choice: 'ask-time' }).note.rate).toBeCloseTo(lc.note.rate + CARD.tongRate / 7, 12);
  });

  it('customs: the bribe is 12% of the contraband; a failed bribe is kept and the duty charged too', () => {
    const s = card('legion-customs', x => { x.player.cargo = { 'moon-sugar': { qty: 40, cost: 40 } }; });
    expect(s.pending!.bribe).toBe(Math.max(40, Math.round(contrabandValue(s, 'ebonheart') * CARD.bribeShare)));
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const t = card('legion-customs', x => { x.player.cargo = { 'moon-sugar': { qty: 40, cost: 40 } }; x.player.cash = 5000; }, `bribe-${i}`);
      const duty = Math.round(contrabandValue(t, 'ebonheart') * CARD.duty);
      const n = act(t, { t: 'choose', choice: 'bribe' });
      expect(n.player.cargo['moon-sugar'].qty).toBe(40);
      expect([5000 - t.pending!.bribe, 5000 - t.pending!.bribe - duty]).toContain(n.player.cash);
      seen.add(n.player.cash === 5000 - t.pending!.bribe ? 'waved on' : 'duty');
    }
    expect([...seen].sort()).toEqual(['duty', 'waved on']);
  });

  it('ash storm: pushing through risks the printed share of other cargo, at the printed odds; the guide charges 6% of a rich load', () => {
    const load = (x: GameState) => { x.player.cargo = { timber: { qty: 40, cost: 30 } }; };
    const s = card('ash-storm', load);
    expect(opt(s, 'press-on').odds).toBeCloseTo(1 - CARD.stormChance, 9);
    expect(opt(s, 'guide').stake).toContain(`${Math.max(CARD.guideFee, Math.round(40 * fairValue(s, 'timber') * CARD.guideShare))} septims`);
    const left = new Set<number>();
    for (let i = 0; i < 40; i++) left.add(act(card('ash-storm', load, `storm-${i}`), { t: 'choose', choice: 'press-on' }).player.cargo.timber.qty);
    expect([...left].sort((a, b) => a - b)).toEqual([40 - Math.ceil(40 * 0.15), 40]);
    expect(choiceOdds(card('ash-storm', x => { x.player.cargo = {}; }), 'press-on')).toBeUndefined();
  });

  it('cards come once per journey, more often on riskier and longer routes', () => {
    const s = start();
    expect(cardChance(s, { risk: 0, days: 3 })).toBe(0);
    expect(cardChance(s, { risk: 1, days: 1 })).toBeCloseTo(0.11, 9);
    expect(cardChance(s, { risk: 3, days: 9 })).toBeCloseTo(0.51, 9);
    expect(cardChance(s, { risk: 6, days: 9 })).toBe(0.6);
  });

  it('Tong collectors: running has the printed odds and watches the route for a month', () => {
    const s = card('tong-enforcers');
    expect(opt(s, 'flee').odds).toBeCloseTo(1 - CARD.tongCatch, 9);
    const n = act(s, { t: 'choose', choice: 'flee' });
    expect(n.world.flags['watched:balmora~ebonheart']).toBe(s.day + CARD.watchDays);
  });

  it('one card per journey: no customs search on arrival after a road card', () => {
    for (let i = 0; i < 30; i++) {
      const s = card('tong-toll', x => { x.player.cargo = { 'moon-sugar': { qty: 60, cost: 40 } }; }, `chain-${i}`);
      s.pending = { ...s.pending!, remainingDays: 1 };
      const n = act(s, { t: 'choose', choice: 'surrender' });
      expect(n.pending).toBeNull();
    }
  });

  it('Charter favour takes FAVOUR_DISCOUNT off each point, at most FAVOUR_MAX points', () => {
    const s = start();
    const base = C.charter.tiers[2].price;
    expect(charterPrice(s, 3)).toBe(base);
    s.charter.favour = 2; expect(charterPrice(s, 3)).toBe(Math.round(base * (1 - 2 * FAVOUR_DISCOUNT)));
    s.charter.favour = 9; expect(charterPrice(s, 3)).toBe(Math.round(base * (1 - FAVOUR_MAX * FAVOUR_DISCOUNT)));
  });

  it('migrates a v5 save with an open card to the new choices', () => {
    const s = card('refugee-column');
    const old = JSON.parse(serialize(s));
    old.schemaVersion = 5; old.pending.choices = ['give', 'sell-dear', 'pass'];
    expect(migrate(old).pending!.choices).toEqual(['at-cost', 'sell-dear', 'pass']);
  });
});
