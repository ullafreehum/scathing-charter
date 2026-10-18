// Road encounters: rolling, building the pending card, and resolving choices.
import { C } from '../data';
import type { CardOption, EncounterDef, EncounterKind, GameState, Lot, PendingEncounter, Region, ScrollId } from './types';
import type { Rng } from './rng';
import type { RouteOption } from './travel';
import { distance } from './travel';
import { cargoValue, cargoWeight, capacity, fairValue, legalityAt } from './market';
import { clampRep } from './history';
import { payNote } from './bank';

/** Crossing-card knobs: every card prints its stakes from these before the player chooses. */
export const CARD = {
  /** customs: duty on declared contraband; the bribe as a share of the contraband (at least 40); Chameleon odds at a gate */
  duty: 0.4, bribeShare: 0.12, chameleonAtGate: 0.85,
  /** hazards: the guide's fee (guideFee, or guideShare of your cargo's value if more); the share of each perishable lot that
   *  spoils when you push through; and the chance pushing through also costs the card's loss share of everything else */
  guideFee: 40, guideShare: 0.06, spoil: 0.3, stormChance: 0.35,
  /** Tong collectors: payment asked, the share of it they keep as a fee, rate rise for more time (per day of game time),
   *  chance they catch a runner, days the route stays watched */
  tongPay: 300, tongFee: 0.2, tongRate: 0.0005, tongCatch: 0.35, watchDays: 30,
  /** relief: units per good handed over (sold dear or at cost) */
  reliefUnits: 10,
} as const;
const RELIEF_GOODS = ['saltrice', 'kwama-eggs', 'healing-draughts'] as const;

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

/** Smuggling heat: quiet below 30, watched from 30, wanted from 60. */
export const HEAT = { watched: 30, wanted: 60, decayPerDay: 1, patrolChance: 0.3 } as const;
export function heatLevel(heat: number): 'quiet' | 'watched' | 'wanted' { return heat >= HEAT.wanted ? 'wanted' : heat >= HEAT.watched ? 'watched' : 'quiet'; }
/** Multiplier on customs searches and informers. */
export function heatMult(heat: number): number { return heat >= HEAT.wanted ? 2 : heat >= HEAT.watched ? 1.5 : 1; }
export function addHeat(s: GameState, n: number) { s.player.heat = Math.max(0, Math.min(100, Math.round(s.player.heat + n))); }

export function power(s: GameState): number {
  const bg = C.backgrounds[s.player.backgroundId];
  return (C.gear[s.player.weapon]?.power ?? 0) + (C.gear[s.player.armor]?.power ?? 0) + s.player.sellswords * 3 + bg.combat + s.player.health / 25;
}

function regionsOf(opt: RouteOption): Region[] {
  return [C.locs[opt.route.a].region, C.locs[opt.route.b].region];
}

/** Chance of a crossing card on a journey (at most one per journey): it grows with the route's risk and the root of its days. */
export function cardChance(s: GameState, opt: Pick<RouteOption, 'risk' | 'days'>): number {
  if (opt.risk <= 0) return 0;
  return Math.min(0.6, 0.06 + 0.05 * opt.risk * Math.sqrt(opt.days)) * DIFF[s.difficulty].enc * Math.max(0.4, 1 - 0.12 * s.player.sellswords);
}

const reachOf = (regs: readonly Region[], morrowind: boolean) => regs.some(r => r === 'blackmarsh' || r === 'elsweyr') ? 0 : morrowind ? 1 : 0.4;

/** Courts where any open seizure or fine can be contested, and how long a seizure stays open. */
export const COURT_TOWNS = ['vivec', 'ebonheart', 'narsis', 'mournhold'] as const;
export const APPEAL_DAYS = 30;
const CONTEST_HINT = `You can contest the seizure before a magistrate, here or in a court town (Vivec, Ebonheart, Narsis, Mournhold), within ${APPEAL_DAYS} days (Market tab).`;
/** Whether the open seizure or fine can be contested here (the duel stays optional: the player chooses to). */
export function canContest(s: GameState): boolean {
  const ap = s.appeal; if (!ap) return false;
  if (ap.until !== undefined && s.day > ap.until) return false;
  return ap.loc === s.player.location || (COURT_TOWNS as readonly string[]).includes(s.player.location);
}
/** What losing a hearing costs: the fine again, or court costs when nothing was fined. */
export function courtCost(ap: NonNullable<GameState['appeal']>): number {
  if (ap.fine > 0) return ap.fine;
  let v = 0; for (const lot of Object.values(ap.goods)) v += lot.qty * lot.cost;
  return Math.max(25, Math.round(v * 0.1));
}

/** Resting 3 or 7 days with the note unpaid: the Tong may find you in town. Same odds as on the road, for every 3 days. */
export function restCollectorChance(s: GameState, days: number): number {
  if (days < 3) return 0;
  const reg = C.locs[s.player.location]?.region; if (!reg) return 0;
  const reach = reachOf([reg], reg === 'vvardenfell' || reg === 'mainland');
  return Math.min(1, pressure(s) * 0.06 * reach * days / 3);
}

export function rollEncounter(s: GameState, rng: Rng, opt: RouteOption): EncounterDef | null {
  const pr = pressure(s);
  const regs = regionsOf(opt);
  const morrowind = regs.some(r => r === 'vvardenfell' || r === 'mainland');
  const tongReach = reachOf(regs, morrowind);
  const pEnf = pr * 0.06 * tongReach;
  if (!rng.chance(cardChance(s, opt) + pEnf)) return null;
  const cands = C.encounters.filter(e =>
    (e.regions === 'any' || e.regions.some(r => regs.includes(r))) &&
    (!e.modes || e.modes.includes(opt.mode)) && (!e.routes || e.routes.includes(opt.route.id)) &&
    (e.from === undefined || s.day >= e.from) && (e.to === undefined || s.day < e.to) &&
    (!e.flag || s.world.flags[e.flag]) &&
    !(e.kind === 'enforcer' && (pr === 0 || tongReach === 0)) &&
    !(e.kind === 'mercy' && !e.goods));
  const watched = (s.world.flags[`watched:${opt.route.id}`] ?? 0) > s.day ? 2 : 1;
  return rng.weighted(cands, e => e.kind === 'enforcer' ? e.weight * pr * 2 * tongReach * watched : e.weight) ?? null;
}

/** The choices a card offers, safe option first. Also used by the save migration, so it reads only these inputs. */
export function choicesFor(kind: EncounterKind, scrolls: Partial<Record<ScrollId, number>>): string[] {
  const choices: string[] = [];
  switch (kind) {
    case 'hostile': choices.push('surrender', 'bribe', 'fight', 'flee'); break;
    case 'enforcer': choices.push('pay-note', 'ask-time', 'flee'); break;
    case 'customs': choices.push('declare', 'bribe', 'flee'); break;
    case 'mercy': choices.push('at-cost', 'sell-dear', 'pass'); break;
    case 'hazard': choices.push('wait-out', 'guide', 'press-on'); break;
    case 'opportunity': choices.push('decline', 'deal'); break;
  }
  if (kind === 'hostile' || kind === 'customs') {
    for (const sc of ['chameleon', 'almsivi', 'divine'] as ScrollId[]) if ((scrolls[sc] ?? 0) > 0) choices.push(sc);
  }
  return choices;
}

export function buildPending(s: GameState, def: EncounterDef, routeId: string, dest: string, remainingDays: number, customs = false): PendingEncounter {
  const choices = choicesFor(def.kind, s.player.scrolls).filter(c => !(def.creature && c === 'bribe')); // beasts take no bribes
  const bribe = def.kind === 'enforcer' ? Math.max(60, Math.round(s.note.balance * 0.1))
    : def.kind === 'customs' ? Math.max(40, Math.round(contrabandValue(s, dest) * CARD.bribeShare * heatMult(s.player.heat)))
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
  return Math.max(0.1, Math.min(0.85, 0.7 - loadRatio * 0.4 - (s.pending!.customs ? 0.1 : 0)));
}
function customsBribeChance(s: GameState): number { return 0.85 - C.locs[s.pending!.dest].enforcement * 0.08; }
function chameleonChance(s: GameState): number { return s.pending!.customs ? CARD.chameleonAtGate : 0.9; }
function interventionChance(s: GameState, kind: 'almsivi' | 'divine'): number { return kind === 'almsivi' ? (s.world.flags.almsivi ?? 95) / 100 : 0.97; }

/** Chance that a choice works out, exactly as resolve() rolls it; undefined when nothing is rolled. */
export function choiceOdds(s: GameState, choice: string): number | undefined {
  if (!s.pending) return undefined;
  switch (choice) {
    case 'fight': return fightChance(s);
    case 'flee': return s.pending.kind === 'enforcer' ? 1 - CARD.tongCatch : fleeChance(s);
    case 'bribe': return s.pending.customs ? customsBribeChance(s) : 1;
    case 'press-on': return storm(s, false).value > 0 ? 1 - CARD.stormChance : undefined;
    case 'chameleon': return chameleonChance(s);
    case 'almsivi': case 'divine': return interventionChance(s, choice);
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
        const loot = def.creature ? 0 : rng.int(p.threat * 4, p.threat * 12);
        s.player.cash += loot; s.stats.fightsWon++;
        const d = hurt(s, rng, 0, 12);
        if (fac) s.player.rep[fac] = clampRep(s.player.rep[fac] - 6);
        if (def.kind === 'enforcer') s.note.lastPaymentDay = s.day; // they report back… later
        return { text: `You win the fight${d ? `, taking ${d} wounds` : ''}${loot ? `, and find ${loot} septims on them` : ' and drive them off'}.`, good: true };
      }
      const d = hurt(s, rng, 8, 22); const lost = loseCargo(s, rng, def.loss); const cash = Math.round(s.player.cash * 0.15); s.player.cash -= cash;
      return { text: `You are beaten (${d} wounds). They take ${lost} and ${cash} septims.`, good: false };
    }
    case 'flee': {
      if (def.kind === 'enforcer') {
        s.world.flags[`watched:${p.routeId}`] = s.day + CARD.watchDays;
        if (rng.chance(1 - CARD.tongCatch)) return { text: `You bolt down a side path and lose them. The Tong will watch this road for the next ${CARD.watchDays} days.`, good: true };
        const d = hurt(s, rng, 6, 16); const lost = loseCargo(s, rng, 0.25);
        return { text: `They run you down. ${d} wounds; they take ${lost} "for the trouble". The road stays watched.`, good: false };
      }
      if (rng.chance(fleeChance(s))) { if (p.customs) addHeat(s, 8); return { text: 'You get away clean, heart pounding.', good: true }; }
      if (p.customs) return confiscate(s, rng, true);
      const d = hurt(s, rng, 4, 12); const lost = loseCargo(s, rng, def.loss * 0.6);
      return { text: `They catch you. ${d} wounds; you lose ${lost}.`, good: false };
    }
    case 'bribe': {
      if (s.player.cash < p.bribe) return { text: '', good: false, fail: 'You cannot afford the bribe.' };
      s.player.cash -= p.bribe;
      if (p.customs && !rng.chance(customsBribeChance(s))) {
        // The officer keeps the bribe and charges the duty anyway; only if you can't pay is the contraband seized.
        const duty = dutyOf(s);
        if (s.player.cash >= duty) { s.player.cash -= duty; addHeat(s, -10); return { text: `The officer pockets your ${p.bribe} septims, then books you anyway: you pay the ${duty} septims duty as well.`, good: false }; }
        const { taken } = seizeContraband(s);
        return { text: `The officer pockets your ${p.bribe} septims, then books you anyway. You cannot pay the ${duty} duty, so they seize ${taken}. ${CONTEST_HINT}`, good: false };
      }
      if (def.kind === 'enforcer') s.note.lastPaymentDay = s.day;
      if (p.customs) addHeat(s, -10);
      return { text: `${p.bribe} septims change hands. ${def.kind === 'enforcer' ? 'The Tong calls it a "visit fee". It does not touch the note.' : 'You are waved on.'}`, good: true };
    }
    case 'surrender': return { text: `You hand over ${loseCargo(s, rng, Math.min(0.9, def.loss * 1.5))}. They let you live.`, good: false };
    case 'declare': {
      const duty = dutyOf(s);
      if (s.player.cash >= duty) {
        s.player.cash -= duty; addHeat(s, -10);
        return { text: `You declare everything and pay ${duty} septims in duty. The officer stamps your papers.`, good: true };
      }
      const { taken } = seizeContraband(s);
      return { text: `You declare it, but cannot pay the duty. They seize ${taken} and let you go without a fine. ${CONTEST_HINT}`, good: false };
    }
    case 'pay-note': {
      const { ask, fee, off } = tongPayment(s);
      if (s.player.cash < ask) return { text: '', good: false, fail: `You do not have ${ask} septims.` };
      s.player.cash -= fee; payNote(s, off); s.note.lastPaymentDay = s.day;
      return { text: `You count out ${fee + off} septims. They mark ${off} against your note, keep ${fee} "for the walk", and leave you be.`, good: true };
    }
    case 'ask-time': {
      const from = s.note.rate; s.note.rate += CARD.tongRate / s.timeScale; s.note.lastPaymentDay = s.day;
      return { text: `"Drelloth is a patient man. Patience costs." Your rate rises from ${pct(from)} to ${pct(s.note.rate)} a day.`, good: false };
    }
    case 'guide': {
      const fee = guideFee(s);
      if (s.player.cash < fee) return { text: '', good: false, fail: `A guide costs ${fee} septims.` };
      s.player.cash -= fee;
      return { text: `For ${fee} septims a local guide leads you through by ways only locals know.`, good: true };
    }
    case 'chameleon': {
      s.player.scrolls.chameleon--;
      // Customs officers are trained to look for shimmering air; bandits are not.
      if (rng.chance(chameleonChance(s))) { if (p.customs) addHeat(s, 5); return { text: 'The scroll crackles; light bends round you. You walk past them.', good: true }; }
      if (p.customs) { const { taken } = seizeContraband(s); return { text: `The Chameleon spell flickers out at the worst moment. They seize ${taken}. ${CONTEST_HINT}`, good: false }; }
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
    case 'at-cost': {
      const r = relief(s, true);
      if (!r.units) { const c = Math.min(s.player.cash, 25); s.player.cash -= c; s.player.mercy += 2; return { text: `You have no food to spare, so you press ${c} septims into their hands.`, good: true }; }
      s.player.cash += r.total; s.player.mercy += 2; s.charter.favour = (s.charter.favour ?? 0) + 1;
      s.player.rep.temple = clampRep(s.player.rep.temple + 2); s.player.rep.redoran = clampRep(s.player.rep.redoran + 2);
      return { text: `You hand over ${r.units} measures at what you paid (${r.total} septims). Someone blesses you in the name of Saint Veloth, and ${s.world.flags.erupted ? 'the relief council' : 'the Council’s clerks'} take${s.world.flags.erupted ? 's' : ''} note.`, good: true };
    }
    case 'sell-dear': {
      const r = relief(s, false);
      if (!r.units) return { text: 'You have nothing they need. They watch you go.', good: false };
      s.player.cash += r.total; s.player.profiteering += r.total; s.player.mercy -= 3;
      return { text: `They pay ${r.total} septims: everything they have left. Nobody thanks you.`, good: true };
    }
    case 'pass': return { text: 'You keep your eyes on the road.', good: true };
    case 'press-on': {
      const r = spoil(s, true);
      const hit = storm(s, false).value > 0 && rng.chance(CARD.stormChance);
      const lost = hit ? storm(s, true).list : '';
      const parts = [r.value ? `${r.list} spoiled` : '', lost ? `${lost} lost on the way` : ''].filter(Boolean);
      return parts.length ? { text: `You push through. ${parts.join('; ')}.`, good: false } : { text: 'You push through and lose nothing.', good: true };
    }
    case 'wait-out': return { text: `You make camp and wait it out (${def.delay ?? 2} days).`, good: true, delay: def.delay ?? 2 };
    case 'deal': {
      const g = def.goods?.length ? rng.pick(def.goods) : 'moon-sugar';
      const good = C.goods[g];
      const salvage = def.id.includes('salvage') || def.id.includes('buried');
      const unit = salvage ? 0 : Math.max(1, Math.round(fairValue(s, g) * 0.7));
      const room = Math.floor((capacity(s) - cargoWeight(s)) / good.weight);
      let qty = Math.min(rng.int(2, 6), room, unit ? Math.floor(s.player.cash / unit) : 99);
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

const pct = (r: number) => `${(r * 100).toFixed(2)}%`;
function dutyOf(s: GameState): number { return Math.round(contrabandValue(s, s.pending!.dest) * CARD.duty); }
/** What the collectors ask (CARD.tongPay, or just enough to clear the note), the fee they keep, and what comes off the note. */
function tongPayment(s: GameState): { ask: number; fee: number; off: number } {
  const ask = Math.max(1, Math.min(CARD.tongPay, Math.ceil(s.note.balance / (1 - CARD.tongFee))));
  const fee = Math.floor(ask * CARD.tongFee);
  return { ask, fee, off: Math.min(ask - fee, Math.ceil(s.note.balance)) };
}
function guideFee(s: GameState): number { return Math.max(CARD.guideFee, Math.round(cargoValue(s) * CARD.guideShare)); }

/** Takes every contraband lot, with no fine; the seizure can be contested at the hearing. */
function seizeContraband(s: GameState): { taken: string; value: number } {
  const dest = s.pending!.dest; let value = 0; const taken: string[] = []; const seized: Record<string, Lot> = {};
  for (const [g, lot] of Object.entries(s.player.cargo)) {
    if (legalityAt(s, dest, g) !== 'contraband') continue;
    value += lot.qty * fairValue(s, g); taken.push(`${lot.qty} ${C.goods[g].name}`); seized[g] = { ...lot }; delete s.player.cargo[g];
  }
  if (taken.length) s.appeal = { loc: dest, goods: seized, fine: 0, until: s.day + APPEAL_DAYS };
  return { taken: taken.join(', ') || 'nothing', value: Math.round(value) };
}

/** Food and draughts handed to refugees: up to CARD.reliefUnits of each, at cost or at three times fair value. Applies it when `apply`. */
function relief(s: GameState, atCost: boolean, apply = true): { units: number; total: number } {
  let units = 0, total = 0;
  for (const g of RELIEF_GOODS) {
    const lot = s.player.cargo[g]; if (!lot) continue;
    const n = Math.min(lot.qty, CARD.reliefUnits);
    units += n; total += n * (atCost ? lot.cost : Math.round(fairValue(s, g) * 3));
    if (apply) { lot.qty -= n; if (lot.qty <= 0) delete s.player.cargo[g]; }
  }
  return { units, total };
}

/** Pushing through a hazard: CARD.spoil of each perishable lot is ruined (certain, no roll). */
function spoil(s: GameState, apply: boolean): { value: number; list: string } {
  let value = 0; const list: string[] = [];
  for (const [g, lot] of Object.entries(s.player.cargo)) {
    if (!C.goods[g].perishable) continue;
    const n = Math.ceil(lot.qty * CARD.spoil);
    value += n * fairValue(s, g); list.push(`${n} ${C.goods[g].name}`);
    if (apply) { lot.qty -= n; if (lot.qty <= 0) delete s.player.cargo[g]; }
  }
  return { value: Math.round(value), list: list.join(', ') };
}

/** Pushing through a hazard, if the dice go against you: the card's loss share of every lot that cannot spoil. */
function storm(s: GameState, apply: boolean): { value: number; list: string } {
  const loss = C.encounters.find(e => e.id === s.pending!.defId)?.loss ?? 0;
  let value = 0; const list: string[] = [];
  if (s.pending!.kind !== 'hazard') return { value, list: '' };
  for (const [g, lot] of Object.entries(s.player.cargo)) {
    if (C.goods[g].perishable) continue;
    const n = Math.ceil(lot.qty * loss); if (n <= 0) continue;
    value += n * fairValue(s, g); list.push(`${n} ${C.goods[g].name}`);
    if (apply) { lot.qty -= n; if (lot.qty <= 0) delete s.player.cargo[g]; }
  }
  return { value: Math.round(value), list: list.join(', ') };
}

/** Debt interest that accrues over `days` of game time. */
function interestOver(s: GameState, days: number): number {
  if (s.note.cleared) return 0;
  let b = s.note.balance;
  for (let i = 0; i < days * s.timeScale; i++) b *= 1 + s.note.rate;
  return Math.round(b - s.note.balance);
}

/** Septims of cargo at stake when a share `frac` of every lot is lost. */
function cargoAt(s: GameState, frac: number): string { const v = Math.round(cargoValue(s) * frac); return v ? `about ${v} septims of cargo` : 'nothing from your empty pack'; }

/** The current card's choices with their stakes, for the card UI. Text only: resolve() applies them. */
export function cardOptions(s: GameState): CardOption[] {
  const p = s.pending; if (!p) return [];
  const def = C.encounters.find(e => e.id === p.defId);
  const loss = def?.loss ?? 0;
  const odds = (id: string) => choiceOdds(s, id);
  const opt = (id: string): CardOption => {
    switch (id) {
      case 'fight': return { id, label: 'Fight', odds: odds(id), stake: `Your strength ${power(s).toFixed(1)} against their ${p.threat}. Lose: wounds, ${cargoAt(s, loss)} and ${Math.round(s.player.cash * 0.15)} cash.` };
      case 'flee':
        if (p.kind === 'enforcer') return { id, label: 'Run', odds: odds(id), stake: `${Math.round(CARD.tongCatch * 100)}% they catch you: wounds and a quarter of your cargo. This road is watched for ${CARD.watchDays} days either way.` };
        return { id, label: p.customs ? 'Run for it' : 'Flee', odds: odds(id), stake: p.customs ? 'Caught: everything banned is seized (you can contest it) and you are hurt.' : `Caught: wounds and ${cargoAt(s, loss * 0.6)}. Easier with a light load.` };
      case 'bribe': return p.customs
        ? { id, label: 'Bribe the officer', odds: odds(id), stake: `${p.bribe} septims. If it fails they keep it and you pay the ${dutyOf(s)} duty as well.`, disabled: s.player.cash < p.bribe ? `You need ${p.bribe} septims.` : undefined }
        : { id, label: 'Pay them off', stake: `${p.bribe} septims, and you go on unharmed.`, disabled: s.player.cash < p.bribe ? `You need ${p.bribe} septims.` : undefined };
      case 'surrender': return { id, label: 'Hand over cargo', stake: `Lose ${cargoAt(s, Math.min(0.9, loss * 1.5))}. Keep your skin.` };
      case 'declare': {
        const duty = dutyOf(s);
        return { id, label: 'Declare it', stake: s.player.cash >= duty ? `Pay ${Math.round(CARD.duty * 100)}% duty: ${duty} septims. Keep everything.` : `You cannot pay the ${duty} duty: they seize the contraband (${Math.round(contrabandValue(s, p.dest))} septims), no fine.` };
      }
      case 'chameleon': return { id, label: 'Cast Chameleon', odds: odds(id), stake: p.customs ? `Fail: lose all the contraband (${Math.round(contrabandValue(s, p.dest))} septims). You have ${s.player.scrolls.chameleon} scroll${s.player.scrolls.chameleon === 1 ? '' : 's'}.` : `Fail: lose ${cargoAt(s, loss * 0.5)}. You have ${s.player.scrolls.chameleon}.` };
      case 'almsivi': case 'divine': return { id, label: id === 'almsivi' ? 'Almsivi Intervention' : 'Divine Intervention', odds: odds(id), stake: `Teleport to the nearest ${id === 'almsivi' ? 'Tribunal temple' : 'Imperial shrine'}. You keep only 20 stone of cargo.` };
      case 'at-cost': {
        const r = relief(s, true, false);
        return { id, label: 'Sell at cost', stake: r.units ? `+${r.total} septims (what you paid for ${r.units} measures). Mercy up, Charter favour +1.` : `You have no food: give ${Math.min(25, s.player.cash)} septims instead. Mercy up.` };
      }
      case 'sell-dear': {
        const r = relief(s, false, false);
        return { id, label: 'Sell at crisis price', stake: r.units ? `+${r.total} septims for ${r.units} measures. Mercy down; people will remember.` : 'You have nothing they need.', disabled: r.units ? undefined : 'You carry no food or draughts.' };
      }
      case 'pass': return { id, label: 'Pass by', stake: 'Nothing changes.' };
      case 'wait-out': { const d = def?.delay ?? 2; return { id, label: `Wait ${d} day${d === 1 ? '' : 's'}`, stake: s.note.cleared ? `+${d} days on the road. Cargo safe.` : `+${d} days on the road; your debt grows by ${interestOver(s, d)}. Cargo safe.` }; }
      case 'guide': { const fee = guideFee(s); return { id, label: 'Hire a guide', stake: `${fee} septims. Through safely, no delay.`, disabled: s.player.cash < fee ? `You need ${fee} septims.` : undefined }; }
      case 'press-on': {
        const r = spoil(s, false), st = storm(s, false);
        const parts = [r.value ? `${Math.round(CARD.spoil * 100)}% of your perishables spoil: about ${r.value} septims.` : '', st.value ? `${Math.round(CARD.stormChance * 100)}% chance you also lose ${Math.round(loss * 100)}% of everything else: about ${st.value} septims.` : ''].filter(Boolean);
        return { id, label: 'Push through', odds: odds(id), stake: parts.length ? `${parts.join(' ')} No delay.` : 'Nothing you carry is at risk. No delay.' };
      }
      case 'pay-note': { const t = tongPayment(s); return { id, label: `Pay ${t.ask}`, stake: `${t.off} septims off your debt; they keep ${t.fee} as a fee. They leave satisfied.`, disabled: s.player.cash < t.ask ? `You need ${t.ask} septims.` : undefined }; }
      case 'ask-time': return { id, label: 'Ask for time', stake: `Your rate rises from ${pct(s.note.rate)} to ${pct(s.note.rate + CARD.tongRate / s.timeScale)} a day.` };
      case 'deal': return { id, label: 'Deal', stake: 'Take what is offered, at a cove price.' };
      case 'decline': return { id, label: 'Decline', stake: 'Nothing changes.' };
    }
    return { id, label: id, stake: '' };
  };
  return p.choices.map(opt);
}

function confiscate(s: GameState, rng: Rng, injured: boolean): { text: string; good: boolean } {
  const p = s.pending!;
  const taken: string[] = []; const seized: Record<string, Lot> = {};
  for (const [g, lot] of Object.entries(s.player.cargo)) {
    if (legalityAt(s, p.dest, g) !== 'contraband') continue;
    taken.push(`${lot.qty} ${C.goods[g].name}`); seized[g] = { ...lot }; delete s.player.cargo[g];
  }
  // Caught running: only the contraband is seized, with no fine, and it can be contested.
  if (taken.length) s.appeal = { loc: p.dest, goods: seized, fine: 0, until: s.day + APPEAL_DAYS };
  s.player.rep.legion = clampRep(s.player.rep.legion - 4);
  addHeat(s, -40);
  const d = injured ? hurt(s, rng, 5, 15) : 0;
  return { text: `Confiscated: ${taken.join(', ') || 'nothing'}.${d ? ` You took ${d} wounds in the scuffle.` : ''}${taken.length ? ` ${CONTEST_HINT}` : ''}`, good: false };
}
