import { C } from '../data';
import type { GameState, Route, TravelMode } from './types';
import { cargoWeight } from './market';
import { dateOf } from './calendar';

export const FREIGHT: Record<TravelMode, number> = { strider: 0.6, boat: 0.3, 'inner-sea': 0.3, 'sea-of-ghosts': 0.4, coastal: 0.3, caravan: 0.25, road: 0.1, barge: 0.2, guide: 3 };
export const MODE_LABEL: Record<TravelMode, string> = {
  strider: 'Silt strider', boat: 'Coastal boat', 'inner-sea': 'Inner Sea ship', 'sea-of-ghosts': 'Sea of Ghosts ship',
  coastal: 'Coastal ship', caravan: 'Guar caravan', road: 'Road', barge: 'River barge', guide: 'Guild Guide',
};
const SEA: TravelMode[] = ['boat', 'inner-sea', 'sea-of-ghosts', 'coastal'];

export interface RouteOption {
  route: Route; dest: string; modeIndex: number; mode: TravelMode;
  days: number; fare: number; risk: number;
}

export function routeOptions(s: GameState): RouteOption[] { return routeOptionsFrom(s, s.player.location); }

/** Route options leaving any place, priced for the current cargo: used by the route planner. */
export function routeOptionsFrom(s: GameState, here: string): RouteOption[] {
  const w = cargoWeight(s);
  const month = dateOf(s.day).month;
  const winter = month === 11 || month === 0 || month === 1;
  const out: RouteOption[] = [];
  for (const r of C.routeList) {
    if (r.a !== here && r.b !== here) continue;
    const ov = s.world.routes[r.id] ?? {};
    if (ov.closed ?? r.closed) continue;
    const dest = r.a === here ? r.b : r.a;
    if (s.world.status[dest] === 'closed') continue;
    r.modes.forEach((m, i) => {
      if (m.mode === 'guide' && !s.world.flags.guides) return;
      let days = m.days + (ov.daysAdd ?? 0);
      let risk = m.risk + (ov.riskAdd ?? 0);
      if (m.mode === 'sea-of-ghosts' && winter) { days += 1; risk += 1; }
      if (s.player.conveyance === 'guar-cart' && (m.mode === 'caravan' || m.mode === 'road')) days += 1;
      if (s.player.conveyance === 'chartered-hold' && SEA.includes(m.mode)) days -= 1;
      days = Math.max(1, days);
      risk = Math.max(0, Math.min(6, risk));
      const fare = Math.round(m.fare + FREIGHT[m.mode] * w);
      out.push({ route: r, dest, modeIndex: i, mode: m.mode, days, fare, risk });
    });
  }
  return out.sort((a, b) => a.days - b.days);
}

export function distance(a: string, b: string): number {
  const A = C.locs[a], B = C.locs[b];
  const dx = A.x - B.x, dy = A.y - B.y;
  return Math.sqrt(dx * dx + dy * dy);
}
