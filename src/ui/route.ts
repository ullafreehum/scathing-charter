// Route planner: the fastest chain of journeys to any town (fewest days, then cheapest fares).
import { C } from '../data';
import { routeOptionsFrom, type GameState, type RouteOption } from '../engine';

export interface RoutePlan { path: string[]; legs: RouteOption[]; days: number; fare: number }
type Node = { days: number; fare: number; prev?: string; leg?: RouteOption };
const better = (a: Node, b: Node) => a.days < b.days || (a.days === b.days && a.fare < b.fare);

/** Dijkstra over today's open routes. Fares use your current load, so later legs are estimates. */
export function planRoute(g: GameState, dest: string, from = g.player.location): RoutePlan | null {
  if (!C.locs[from] || !C.locs[dest] || from === dest) return null;
  const dist = new Map<string, Node>([[from, { days: 0, fare: 0 }]]);
  const done = new Set<string>();
  for (;;) {
    let cur: string | null = null;
    for (const [id, v] of dist) if (!done.has(id) && (cur === null || better(v, dist.get(cur)!))) cur = id;
    if (cur === null || cur === dest) break;
    done.add(cur);
    const base = dist.get(cur)!;
    const fastest = new Map<string, RouteOption>();
    for (const o of routeOptionsFrom(g, cur)) {
      const b = fastest.get(o.dest);
      if (!b || o.days < b.days || (o.days === b.days && o.fare < b.fare)) fastest.set(o.dest, o);
    }
    for (const [n, o] of fastest) {
      if (done.has(n)) continue;
      const cand: Node = { days: base.days + o.days, fare: base.fare + o.fare, prev: cur, leg: o };
      const old = dist.get(n);
      if (!old || better(cand, old)) dist.set(n, cand);
    }
  }
  const end = dist.get(dest);
  if (!end) return null;
  const path = [dest]; const legs: RouteOption[] = [];
  for (let id = dest; id !== from;) { const v = dist.get(id)!; legs.unshift(v.leg!); id = v.prev!; path.unshift(id); }
  return { path, legs, days: end.days, fare: end.fare };
}
