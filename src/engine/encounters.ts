// Road encounters: rolling, building the pending card, and resolving choices.
import { C } from '../data';
import type { EncounterDef, GameState, PendingEncounter, Region, ScrollId } from './types';
import type { Rng } from './rng';
import type { RouteOption } from './travel';
import { distance } from './travel';
import { cargoValue, cargoWeight, capacity, fairValue, legalityAt } from './market';
import { clampRep } from './history';

export const DIFF = { fair: { enc: 0.75 }, tong: { enc: 1 }, blood: { enc: 1.3 } } as const;

export function pressure(s: GameState): number {
  if (s.note.cleared) return 0;
  const ratio = s.note.balance / s.note.original;
  const late = s.day - s.note.lastPaymentDay;
  let p = 0;
  if (ratio > 1.5) p++;
  if (ratio > 2.5) p++;
  if (ratio > 4) p++;
  if (late > 60) p++;
  return Math.min(3, p);
}

export function power(s: GameState): number {
  const bg = C.backgrounds[s.player.backgroundId];
  return (C.gear[s.player.weapon]?.power ?? 0) + (C.gear[s.player.armor]?.power ?? 0) + s.player.sellswords * 3 + bg.combat + s.player.health / 25;
}

function regionsOf(opt: RouteOption): Region[] {
  return [C.locs[opt.route.a].region, C.locs[opt.route.b].region];
}

export function rollEncounter(s: GameState, rng: Rng, opt: RouteOption): EncounterDef | null {
  const pDay = Math.min(0.2, opt.risk * 0.022) * DIFF[s.difficulty].enc * Math.max(0.4, 1 - 0.12 * s.player.sellswords);
  let pNone = 1;
  for (let i = 0; i < opt.days; i++) pNone *= 1 - pDay;
  const pr = pressure(s);
  const regs = regionsOf(opt);
  const morrowind = regs.some(r => r === 'vvardenfell' || r === 'mainland');
  const tongReach = regs.some(r => r === 'blackmarsh' || r === 'elsweyr') ? 0 : morrowind ? 1 : 0.4;
  const pEnf = pr * 0.06 * tongReach;
  if (!rng.chance(1 - pNone + pEnf)) return null;
  const cands = C.encounters.filter(e =>
    (e.regions === 'any' || e.regions.some(r => regs.includes(r))) &&
    (!e.modes || e.modes.includes(opt.mode)) &&
    (e.from === undefined || s.day >= e.from) && (e.to === undefined || s.day < e.to) &&
    (!e.flag || s.world.flags[e.flag]) &&
    !(e.kind === 'enforcer' && (pr === 0 || tongReach === 0)) &&
    !(e.kind === 'mercy' && !e.goods));
  return rng.weighted(cands, e => e.kind === 'enforcer' ? e.weight * pr * 2 * tongReach : e.weight) ?? null;
}

export function buildPending(s: GameState, def: EncounterDef, routeId: string, dest: string, remainingDays: number, customs = false): PendingEncounter {
  const choices: string[] = [];
  switch (def.kind) {
    case 'hostile': case 'enforcer': choices.push('fight', 'flee', 'bribe', 'surrender'); break;
    case 'customs': choices.push('submit', 'bribe', 'flee'); break;
    case 'mercy': choices.push('give', 'sell-dear', 'pass'); break;
    case 'hazard': choices.push('press-on', 'wait-out'); break;
    case 'opportunity': choices.push('deal', 'decline'); break;
  }
  if (def.kind !== 'mercy' && def.kind !== 'opportunity' && def.kind !== 'hazard') {
    for (const sc of ['chameleon', 'almsivi', 'divine'] as ScrollId[]) if (s.player.scrolls[sc] > 0) choices.push(sc);
  }
  const bribe = def.kind === 'enforcer' ? Math.max(60, Math.round(s.note.balance * 0.1))
    : def.kind === 'customs' ? Math.max(40, Math.round(contrabandValue(s, dest) * 0.35))
    : Math.round(def.threat * 14 + cargoValue(s) * 0.03);
  return { defId: def.id, kind: def.kind, title: def.title, text: def.text, threat: def.threat, bribe, choices, routeId, dest, remainingDays, customs };
}

export function contrabandValue(s: GameState, loc: string): number {
  let v = 0;
  for (const [g, lot] of Object.entries(s.player.cargo)) if (legalityAt(s, loc, g) === 'contraband') v += lot.qty * fairValue(s, g);
  return v;
}

function loseCargo(s: GameState, rng: Rng, frac: number): string {
  const lost: string[] = [];
  for (const [g, lot] of Object.entries(s.player.cargo)) {
    const n = Math.floor(lot.qty * frac + rng.next());
    if (n <= 0) continue;
    lot.qty -= n; lost.push(`${n} ${C.goods[g].name}`);
    if (lot.qty <= 0) delete s.player.cargo[g];
  }
  return lost.length ? lost.join(', ') : 'nothing of note';
}

function hurt(s: GameState, rng: Rng, lo: number, hi: number): number {
  const armor = C.gear[s.player.armor]?.power ?? 0;
  const dmg = Math.max(0, rng.int(lo, hi) - armor);
  s.player.health = Math.max(0, s.player.health - dmg);
  return dmg;
}

function keepLightest(s: GameState, limit: number): void {
  // keep the most valuable goods per stone, up to `limit` stone
  const lots = Object.entries(s.player.cargo).map(([g, lot]) => ({ g, lot, vps: fairValue(s, g) / C.goods[g].weight }));
  lots.sort((a, b) => b.vps - a.vps);
  let room = limit;
  for (const { g, lot } of lots) {
    const w = C.goods[g].weight;
    const keep = Math.min(lot.qty, Math.floor(room / w));
    room -= keep * w;
    if (keep <= 0) delete s.player.cargo[g]; else lot.qty = keep;
  }
}

// Success chances, shared by resolve() and the encounter card so the shown odds are the rolled odds.
export function fightChance(s: GameState): number { return Math.max(0.08, Math.min(0.92, 0.5 + (power(s) - s.pending!.threat) * 0.07)); }
export function fleeChance(s: GameState): number {
  const loadRatio = cargoWeight(s) / Math.max(1, capacity(s));
  return Math.max(0.1, Math.min(0.85, 0.7 - loadRatio * 0.4 - (s.pending!.customs ? 0.25 : 0)));
}
function customsBribeChance(s: GameState): number { return 0.85 - C.locs[s.pending!.dest].enforcement * 0.08; }
function chameleonChance(s: GameState): number { return s.pending!.customs ? 0.75 : 0.9; }
function interventionChance(s: GameState, kind: 'almsivi' | 'divine'): number { return kind === 'almsivi' ? (s.world.flags.almsivi ?? 95) / 100 : 0.97; }

/** Chance that a choice works out, exactly as resolve() rolls it; undefined when nothing is rolled. */
export function choiceOdds(s: GameState, choice: string): number | undefined {
  if (!s.pending) return undefined;
  switch (choice) {
    case 'fight': return fightChance(s);
    case 'flee': return fleeChance(s);
    case 'bribe': return s.pending.customs ? customsBribeChance(s) : 1;
    case 'chameleon': return chameleonChance(s);
    case 'almsivi': case 'divine': return interventionChance(s, choice);
    case 'press-on': return 0.5;
    default: return undefined;
  }
}

/** Returns [outcome text, tone, teleport destination or null, extra delay days]. */
export function resolve(s: GameState, rng: Rng, choice: string): { text: string; good: boolean; teleport?: string; delay?: number; fail?: string } {
  const p = s.pending!;
  const def = C.encounters.find(e => e.id === p.defId)!;
  const fac = def.faction;
  switch (choice) {
    case 'fight': {
      if (rng.chance(fightChance(s))) {
        const loot = rng.int(p.threat * 4, p.threat * 12);
        s.player.cash += loot; s.stats.fightsWon++;
        const d = hurt(s, rng, 0, 12);
        if (fac) s.player.rep[fac] = clampRep(s.player.rep[fac] - 6);
        if (def.kind === 'enforcer') s.note.lastPaymentDay = s.day; // they report back… later
        return { text: `You win the fight${d ? `, taking ${d} wounds` : ''}, and find ${loot} septims on them.`, good: true };
      }
      const d = hurt(s, rng, 8, 22); const lost = loseCargo(s, rng, def.loss); const cash = Math.round(s.player.cash * 0.15); s.player.cash -= cash;
      return { text: `You are beaten (${d} wounds). They take ${lost} and ${cash} septims.`, good: false };
    }
    case 'flee': {
      if (rng.chance(fleeChance(s))) return { text: 'You get away clean, heart pounding.', good: true };
      if (p.customs) return confiscate(s, rng, true);
      const d = hurt(s, rng, 4, 12); const lost = loseCargo(s, rng, def.loss * 0.6);
      return { text: `They catch you. ${d} wounds; you lose ${lost}.`, good: false };
    }
    case 'bribe': {
      if (s.player.cash < p.bribe) return { text: '', good: false, fail: 'You cannot afford the bribe.' };
      s.player.cash -= p.bribe;
      if (p.customs && !rng.chance(customsBribeChance(s))) {
        const r = confiscate(s, rng, false); return { text: `The officer takes your ${p.bribe} septims, then books you anyway. ${r.text}`, good: false };
      }
      if (def.kind === 'enforcer') s.note.lastPaymentDay = s.day;
      return { text: `${p.bribe} septims change hands. ${def.kind === 'enforcer' ? 'The Tong calls it a "visit fee". It does not touch the note.' : 'You are waved on.'}`, good: true };
    }
    case 'surrender': return { text: `You hand over ${loseCargo(s, rng, Math.min(0.9, def.loss * 1.5))}. They let you live.`, good: false };
    case 'submit': return confiscate(s, rng, false);
    case 'chameleon': {
      s.player.scrolls.chameleon--;
      // Customs officers are trained to look for shimmering air; bandits are not.
      if (rng.chance(chameleonChance(s))) return { text: 'The scroll crackles; light bends round you. You walk past them.', good: true };
      if (p.customs) { const c = confiscate(s, rng, false); return { text: `The Chameleon spell flickers out at the worst moment. ${c.text}`, good: false }; }
      return { text: `The Chameleon spell flickers out at the worst moment. Spotted! You lose ${loseCargo(s, rng, def.loss * 0.5)}.`, good: false };
    }
    case 'almsivi': case 'divine': {
      s.player.scrolls[choice]--;
      const targets = C.locList.filter(L => s.world.status[L.id] !== 'closed' && (choice === 'almsivi' ? L.temple === 'tribunal' : L.shrine));
      if (!targets.length || !rng.chance(interventionChance(s, choice))) {
        const lost = loseCargo(s, rng, def.loss * 0.7);
        return { text: choice === 'almsivi' ? `You speak the Almsivi words. Nothing answers: the Tribunal is gone, and so is the spell. They take ${lost}.` : `The Divine Intervention fizzles. They take ${lost}.`, good: false };
      }
      const here = C.locs[p.dest];
      const to = targets.reduce((a, b) => (distance(here.id, a.id) <= distance(here.id, b.id) ? a : b));
      keepLightest(s, 20);
      return { text: `Light swallows you. You stand in ${to.name}, holding only what fits on your back.`, good: true, teleport: to.id };
    }
    case 'give': {
      let given = 0;
      for (const g of ['saltrice', 'kwama-eggs', 'healing-draughts']) {
        const lot = s.player.cargo[g]; if (!lot) continue;
        const n = Math.min(lot.qty, 8 - given); lot.qty -= n; given += n;
        if (lot.qty <= 0) delete s.player.cargo[g];
        if (given >= 8) break;
      }
      if (!given) { const c = Math.min(s.player.cash, 25); s.player.cash -= c; s.player.mercy += 2; return { text: `You have no food to spare, so you press ${c} septims into their hands.`, good: true }; }
      s.player.mercy += given; s.player.rep.temple = clampRep(s.player.rep.temple + 2); s.player.rep.redoran = clampRep(s.player.rep.redoran + 2);
      return { text: `You hand out ${given} measures of food and draughts. Someone blesses you in the name of Saint Veloth.`, good: true };
    }
    case 'sell-dear': {
      let earned = 0;
      for (const g of ['saltrice', 'kwama-eggs', 'healing-draughts']) {
        const lot = s.player.cargo[g]; if (!lot) continue;
        const n = Math.min(lot.qty, 10); const price = Math.round(fairValue(s, g) * 3);
        earned += n * price; lot.qty -= n; if (lot.qty <= 0) delete s.player.cargo[g];
      }
      if (!earned) return { text: 'You have nothing they need. They watch you go.', good: false };
      s.player.cash += earned; s.player.profiteering += earned; s.player.mercy -= 3;
      return { text: `They pay ${earned} septims: everything they have left. Nobody thanks you.`, good: true };
    }
    case 'pass': return { text: 'You keep your eyes on the road.', good: true };
    case 'press-on': {
      if (rng.chance(0.5)) return { text: 'You push through. It costs you nothing but nerve.', good: true };
      return { text: `You push through and pay for it: ${loseCargo(s, rng, def.loss)} ruined.`, good: false };
    }
    case 'wait-out': return { text: `You make camp and wait it out (${def.delay ?? 2} days).`, good: true, delay: def.delay ?? 2 };
    case 'deal': {
      const g = def.goods?.length ? rng.pick(def.goods) : 'moon-sugar';
      const good = C.goods[g];
      const salvage = def.id.includes('salvage') || def.id.includes('buried');
      const unit = salvage ? 0 : Math.max(1, Math.round(fairValue(s, g) * 0.55));
      const room = Math.floor((capacity(s) - cargoWeight(s)) / good.weight);
      let qty = Math.min(rng.int(3, 12), room, unit ? Math.floor(s.player.cash / unit) : 99);
      if (qty <= 0) return { text: 'You have no room (or coin) for it.', good: false };
      qty = Math.max(1, qty);
      s.player.cash -= qty * unit;
      const lot = (s.player.cargo[g] ??= { qty: 0, cost: 0 });
      lot.cost = Math.round((lot.cost * lot.qty + unit * qty) / (lot.qty + qty)); lot.qty += qty;
      return { text: salvage ? `You dig out ${qty} ${good.name} from the ash.` : `You take ${qty} ${good.name} at ${unit} each, no questions asked.`, good: true };
    }
    case 'decline': return { text: 'You decline and move on.', good: true };
  }
  return { text: '', good: false, fail: 'Unknown choice.' };
}

function confiscate(s: GameState, rng: Rng, injured: boolean): { text: string; good: boolean } {
  const p = s.pending!;
  let value = 0; const taken: string[] = [];
  for (const [g, lot] of Object.entries(s.player.cargo)) {
    if (legalityAt(s, p.dest, g) !== 'contraband') continue;
    value += lot.qty * fairValue(s, g); taken.push(`${lot.qty} ${C.goods[g].name}`); delete s.player.cargo[g];
  }
  const fine = Math.min(s.player.cash, Math.round(value * 0.2));
  s.player.cash -= fine; s.player.rep.legion = clampRep(s.player.rep.legion - 4);
  const d = injured ? hurt(s, rng, 5, 15) : 0;
  return { text: `Confiscated: ${taken.join(', ') || 'nothing'}. Fine: ${fine} septims.${d ? ` You took ${d} wounds in the scuffle.` : ''}`, good: false };
}
