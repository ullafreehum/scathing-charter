import { describe, expect, it } from 'vitest';
import { DUEL, DUEL_CARDS, duelTurn, newDuel, canPlay } from './duel';
import { Rng, hashSeed } from './rng';

describe('tower duel', () => {
  it('has 30 cards, ten per resource', () => {
    expect(DUEL_CARDS.length).toBe(30);
    for (const r of ['stone', 'steel', 'magicka']) expect(DUEL_CARDS.filter(c => c.res === r).length).toBe(10);
  });
  it('always ends, with a winner, when you play greedily', () => {
    for (let seed = 0; seed < 20; seed++) {
      const rng = new Rng(hashSeed(`duel${seed}`));
      const d = newDuel(rng);
      let guard = 0;
      while (!d.winner && guard++ < DUEL.maxTurns + 5) {
        const i = d.you.hand.findIndex(id => canPlay(d.you, id));
        expect(duelTurn(d, rng, i < 0 ? 0 : i, i < 0)).toBeUndefined();
      }
      expect(d.winner).not.toBeNull();
    }
  });
  it('records each turn as events the board can play back', () => {
    const rng = new Rng(hashSeed('duel-events'));
    const d = newDuel(rng);
    for (let t = 0; t < 30 && !d.winner; t++) {
      const i = d.you.hand.findIndex(id => canPlay(d.you, id));
      duelTurn(d, rng, i < 0 ? 0 : i, i < 0);
      const ev = d.events!;
      expect(ev[0]).toMatchObject({ type: 'move', who: 'you' });
      const last = ev[ev.length - 1];
      // Replaying the recorded changes ends exactly where the engine did.
      expect({ ...last.after.you, hand: d.you.hand }).toEqual(d.you);
      expect({ ...last.after.foe, hand: d.foe.hand }).toEqual(d.foe);
      if (!d.winner) expect(ev.map(e => `${e.type}:${e.who}`)).toEqual(['move:you', 'income:foe', 'move:foe', 'income:you']);
    }
  });
});
