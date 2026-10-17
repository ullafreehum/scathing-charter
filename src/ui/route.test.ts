import { describe, expect, it } from 'vitest';
import { newGame, routeOptions } from '../engine';
import { planRoute } from './route';

const g = newGame({ seed: 'PLAN', backgroundId: 'hlaalu-bastard', name: 'T', difficulty: 'tong' });

describe('route planner', () => {
  it('finds a chained route to a far town', () => {
    const p = planRoute(g, 'imperial-city')!;
    expect(p.path[0]).toBe('balmora'); expect(p.path.at(-1)).toBe('imperial-city');
    expect(p.legs).toHaveLength(p.path.length - 1);
    p.legs.forEach((l, i) => expect(l.dest).toBe(p.path[i + 1]));
    expect(p.days).toBe(p.legs.reduce((a, l) => a + l.days, 0));
  });
  it('uses the fastest direct option for a neighbour', () => {
    const direct = routeOptions(g)[0];
    const p = planRoute(g, direct.dest)!;
    expect(p.days).toBeLessThanOrEqual(direct.days);
  });
  it('returns null for here', () => { expect(planRoute(g, 'balmora')).toBeNull(); });
});
