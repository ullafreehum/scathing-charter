// Contracts: offers made in each town, accepting and delivering them.
import { C } from '../data';
import type { Action, GameState } from './types';
import type { Rng } from './rng';
import { fairValue } from './market';
import { clampRep } from './history';
import { logV, unlock } from './util';

export function makeOffers(s: GameState, rng: Rng, loc: string) {
  s.offers = s.offers.filter(o => o.origin !== loc);
  const cands = C.contracts.filter(t => t.origins.includes(loc) && (t.from === undefined || s.day >= t.from) && (t.to === undefined || s.day < t.to) && (!t.flag || s.world.flags[t.flag]));
  const licensed = s.charter.tier >= 1;
  for (let i = 0; i < (licensed ? 3 : 2) && cands.length; i++) {
    const t = licensed ? rng.weighted(cands, x => (x.mercy > 0 ? 3 : 1))! : rng.pick(cands);
    const dests = t.destinations.filter(d => d !== loc && s.world.status[d] !== 'closed');
    if (!dests.length) continue;
    const good = rng.pick(t.goods); const destination = rng.pick(dests);
    const qty = rng.int(t.qty[0], t.qty[1]);
    const reward = Math.round(qty * fairValue(s, good) * t.payMult * (licensed && t.mercy > 0 ? C.charter.reliefPayBonus : 1));
    s.offers.push({ id: `${t.id}-${s.day}-${i}-${rng.int(0, 9999)}`, templateId: t.id, good, qty, destination, deadline: s.day + t.deadline * (s.timeScale > 1 ? 4 : 1), reward, origin: loc });
  }
}

export function contractAction(s: GameState, a: Action, loc: string): string | void {
  switch (a.t) {
    case 'accept': {
      const o = s.offers.find(x => x.id === a.id); if (!o) return 'That offer is gone.';
      if (s.contracts.length >= 4) return 'You already carry four contracts.';
      s.offers = s.offers.filter(x => x.id !== a.id); s.contracts.push(o); unlock(s, `faction:${C.contracts.find(t => t.id === o.templateId)!.faction}`);
      return;
    }
    case 'deliver': {
      const c = s.contracts.find(x => x.id === a.id); if (!c) return 'No such contract.';
      if (c.destination !== loc) return `Deliver to ${C.locs[c.destination].name}.`;
      const lot = s.player.cargo[c.good]; if (!lot || lot.qty < c.qty) return `You need ${c.qty} ${C.goods[c.good].name}.`;
      lot.qty -= c.qty; if (lot.qty <= 0) delete s.player.cargo[c.good];
      const t = C.contracts.find(x => x.id === c.templateId)!;
      s.player.cash += c.reward; s.player.rep[t.faction] = clampRep(s.player.rep[t.faction] + t.rep); s.player.mercy += t.mercy;
      if (t.mercy > 0) s.stats.reliefDelivered++;
      s.stats.contractsDone++;
      s.contracts = s.contracts.filter(x => x.id !== c.id);
      logV(s, 'delivered', 'good', c.qty, C.goods[c.good].name, t.issuer, c.reward);
      return;
    }
  }
}
