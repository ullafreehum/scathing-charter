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
});
