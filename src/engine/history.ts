// Applies dated world events (src/data/history.ts) to the state.
import { C } from '../data';
import type { Effect, GameState, HistoryEvent } from './types';
import type { Rng } from './rng';
import { shortDate } from './calendar';

export function branchKey(house: string, loc: string) { return `${house}:${loc}`; }

function resolveLocs(locs: readonly string[] | 'all'): string[] {
  if (locs === 'all') return C.locList.map(l => l.id);
  const out: string[] = [];
  for (const l of locs) {
    if (l.startsWith('region:')) out.push(...C.locList.filter(L => L.region === l.slice(7)).map(L => L.id));
    else out.push(l);
  }
  return out;
}

export function applyEffect(s: GameState, e: Effect, rng: Rng, ev: HistoryEvent): void {
  switch (e.type) {
    case 'status': s.world.status[e.loc] = e.status; if (e.status === 'closed') s.offers = s.offers.filter(o => o.origin !== e.loc); break;
    case 'route': s.world.routes[e.route] = { ...s.world.routes[e.route], ...(e.closed !== undefined ? { closed: e.closed } : {}), riskAdd: (s.world.routes[e.route]?.riskAdd ?? 0) + (e.riskAdd ?? 0), daysAdd: (s.world.routes[e.route]?.daysAdd ?? 0) + (e.daysAdd ?? 0) }; break;
    case 'price': s.world.priceMods.push({ goods: e.goods, locs: resolveLocs(e.locs), mult: e.mult, start: s.day, end: s.day + e.days }); break;
    case 'legal': (s.world.legal[e.jurisdiction] ??= {})[e.good] = e.legality; break;
    case 'jurisdiction': s.world.jurisdiction[e.loc] = e.jurisdiction; break;
    case 'faction': s.world.faction[e.loc] = e.faction; break;
    case 'flag': s.world.flags[e.key] = e.value; break;
    case 'rep': s.player.rep[e.faction] = clampRep(s.player.rep[e.faction] + e.delta); break;
    case 'lender':
      if (!s.note.cleared) s.log.push({ day: s.day, text: `Your note now answers to the Tong at ${C.locs[e.seat].name}.`, tone: 'bad' });
      s.note.seat = e.seat; s.note.agents = [...e.agents]; break;
    case 'branch': {
      const key = branchKey(e.house, e.loc);
      const amt = s.deposits[key] ?? 0;
      s.world.branches[key] = 'closed';
      if (amt > 0) {
        if (e.action === 'wipe') {
          s.world.flags.lostDeposits = (s.world.flags.lostDeposits ?? 0) + amt;
          s.log.push({ day: s.day, text: `The ${houseName(e.house)} vault at ${C.locs[e.loc].name} is gone, and ${amt} septims with it.`, tone: 'bad' });
        } else if (e.action === 'freeze') {
          s.frozen.push({ amount: amt, ratio: e.ratio ?? 0.1, settleDay: s.day + (e.settleDays ?? 120), settleAt: e.settleAt ?? 'narsis', house: e.house });
          s.world.flags.lostDeposits = (s.world.flags.lostDeposits ?? 0) + amt * (1 - (e.ratio ?? 0.1));
          s.log.push({ day: s.day, text: `Your ${amt} septims at ${C.locs[e.loc].name} are frozen; the House promises a settlement.`, tone: 'bad' });
        } else {
          const to = branchKey(e.house, e.settleAt ?? e.loc);
          s.deposits[to] = (s.deposits[to] ?? 0) + amt;
          s.log.push({ day: s.day, text: `Your deposit at ${C.locs[e.loc].name} was carried by writ to ${C.locs[e.settleAt ?? e.loc].name}.`, tone: 'neutral' });
        }
        s.deposits[key] = 0;
      }
      break;
    }
    case 'disaster': {
      if (!e.locs.includes(s.player.location)) break;
      for (const [g, lot] of Object.entries(s.player.cargo)) {
        lot.qty -= Math.floor(lot.qty * e.cargoLoss + rng.next());
        if (lot.qty <= 0) delete s.player.cargo[g];
      }
      s.player.health = Math.max(1, s.player.health - Math.round(e.injury * rng.range(0.6, 1.2)));
      if (e.achievement && !s.achievements.includes(e.achievement)) { s.achievements.push(e.achievement); s.inbox.push({ kind: 'achievement', id: e.achievement }); }
      const from = s.player.location;
      if (e.relocate) s.player.location = C.locs[from].refuge;
      s.inbox.push({ kind: 'result', title: `You were at ${C.locs[from].name}`, text: `${ev.title}. You lived, but the ash took ${Math.round(e.cargoLoss * 100)}% of what you carried${e.relocate ? `, and you came to your senses on the road to ${C.locs[s.player.location].name}` : ''}.` });
      break;
    }
  }
}

export function houseName(h: string) { return h === 'hlaalu' ? 'Hlaalu Council Counting-House' : 'East Empire Company strongroom'; }
export function clampRep(v: number) { return Math.max(-100, Math.min(100, v)); }

export function applyHistory(s: GameState, rng: Rng): void {
  for (const ev of C.history) {
    if (ev.day !== s.day || s.world.fired.includes(ev.id)) continue;
    if (ev.mode !== 'both' && ev.mode !== s.mode && !(ev.mode === 'red-year' && s.mode === 'long-chronicle')) continue;
    s.world.fired.push(ev.id);
    const lostBefore = s.world.flags.lostDeposits ?? 0;
    for (const e of ev.effects) applyEffect(s, e, rng, ev);
    if (ev.id === 'red-year-eruption') {
      const total = Object.values(s.deposits).reduce((a, b) => a + b, 0);
      if ((s.world.flags.lostDeposits ?? 0) === lostBefore && total >= 1000 && !s.achievements.includes('hedged')) {
        s.achievements.push('hedged'); s.inbox.push({ kind: 'achievement', id: 'hedged' });
      }
    }
    if (!s.codex.includes(`event:${ev.id}`)) s.codex.push(`event:${ev.id}`);
    for (const d of ev.disputes ?? []) if (!s.codex.includes(`dispute:${d}`)) s.codex.push(`dispute:${d}`);
    s.log.push({ day: s.day, text: `${shortDate(s.day)} — ${ev.title}`, tone: 'history' });
    if (ev.major) s.inbox.push({ kind: 'chronicle', eventId: ev.id });
  }
}

/** Fresh Long Chronicle starts: silently apply every earlier world event (no cards, no disasters, no fresh price shocks). */
export function catchUpHistory(s: GameState, rng: Rng): void {
  for (const ev of C.history) {
    if (ev.day >= s.day || s.world.fired.includes(ev.id) || ev.mode === 'long-chronicle') continue;
    s.world.fired.push(ev.id);
    for (const e of ev.effects) if (e.type !== 'disaster' && e.type !== 'price') applyEffect(s, e, rng, ev);
    if (!s.codex.includes(`event:${ev.id}`)) s.codex.push(`event:${ev.id}`);
  }
}
