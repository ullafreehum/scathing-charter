// The game reducer: newGame() and step(). Pure: never mutates its input.
import { C } from '../data';
import type { Action, CharterState, Contract, GameState, Job, LogEntry, MarketCell, NewGameConfig, ScrollId } from './types';
import { Rng, hashSeed } from './rng';
import { D, shortDate } from './calendar';
import { DEPTH, SAT_RECOVERY, bulkBuyTotal, capacity, cargoWeight, fairValue, holidayAt, marketOpen, quotes } from './market';
import { MAX_LEG_DAYS, routeOptions, type RouteOption } from './travel';
import { applyHistory, branchKey, catchUpHistory, clampRep, houseName } from './history';
import { HEAT, addHeat, buildPending, contrabandValue, heatMult, rollEncounter, resolve } from './encounters';
import { checkAchievements, netWorth } from './score';
import { SCHEMA_VERSION } from './save';

export const RED_YEAR_END = D(6, 12, 31);
/** Titus Mede I takes the Imperial City: c. 4E 22 (D-10); day chosen as Emperor's Day (extrapolation). */
export const CORONATION_DAY = D(22, 10, 30);
export const DIFFICULTY = {
  fair: { cash: 700, debt: 2000, rate: 0.002 },
  tong: { cash: 550, debt: 3000, rate: 0.003 },
  blood: { cash: 250, debt: 4500, rate: 0.006 },
} as const;
export const WAGES = { porter: { hire: 100, day: 4, max: 4 }, sellsword: { hire: 150, day: 10, max: 3 } } as const;
export const LICENCE_PRICE = 300;
export const RUMOR_PRICE = 5;
export const BOARD_PER_DAY = 3;
/** Daily interest on deposits: Hlaalu pays more, the Imperial (EEC) house is steadier. */
export const DEPOSIT_RATE = { hlaalu: 0.0008, eec: 0.0004 } as const;

export interface StepResult { state: GameState; error?: string }

function initMarkets(rng: Rng): Record<string, Record<string, MarketCell>> {
  const m: Record<string, Record<string, MarketCell>> = {};
  for (const L of C.locList) {
    m[L.id] = {};
    for (const g of C.goodList) m[L.id][g.id] = { drift: rng.range(0.85, 1.15), shock: 1, sat: 1, stock: true };
  }
  return m;
}

export function newGame(cfg: NewGameConfig): GameState {
  const rng = new Rng(hashSeed(cfg.seed));
  const bg = C.backgrounds[cfg.backgroundId];
  const diff = DIFFICULTY[cfg.difficulty];
  const rep = { tong: 0, hlaalu: 0, redoran: 0, telvanni: 0, temple: 0, eec: 0, legion: 0, anxileel: -10, skaal: -10, ...bg.rep };
  const branches: Record<string, 'open' | 'closed'> = {};
  for (const [house, locs] of Object.entries(C.branches)) for (const l of locs) branches[branchKey(house, l)] = 'open';
  const s: GameState = {
    schemaVersion: SCHEMA_VERSION, seed: cfg.seed, mode: 'red-year', difficulty: cfg.difficulty, timeScale: 1,
    day: 0, endDay: RED_YEAR_END, rng: rng.state(),
    player: {
      name: cfg.name, backgroundId: bg.id, race: bg.race, cash: diff.cash, health: 100, location: 'balmora',
      conveyance: 'pack-guar', porters: 0, sellswords: 0, unpaidDays: 0,
      weapon: bg.startItems?.weapon ?? 'chitin-dagger', armor: 'netch-jerkin',
      scrolls: { chameleon: 0, almsivi: 1, divine: 0, ...bg.startItems?.scrolls },
      cargo: {}, licence: bg.licence, mercy: 0, profiteering: 0, heat: 0, rep, books: [],
    },
    note: { original: diff.debt, balance: diff.debt, rate: diff.rate, lastPaymentDay: 0, seat: 'balmora', agents: ['vivec', 'narsis'], extended: 0, cleared: false },
    deposits: {}, frozen: [], markets: initMarkets(rng),
    world: {
      status: Object.fromEntries(C.locList.map(l => [l.id, l.status])),
      jurisdiction: Object.fromEntries(C.locList.map(l => [l.id, l.jurisdiction])),
      faction: Object.fromEntries(C.locList.map(l => [l.id, l.faction])),
      routes: {}, priceMods: [], legal: {}, branches, flags: { guides: 1, almsivi: 95 }, fired: [], news: [],
    },
    offers: [], contracts: [], heard: [], seen: {}, charter: { tier: 0, paid: 0, renewDue: null, renewed: false, nextDividend: null, dividends: 0 }, warehouse: {}, pending: null, inbox: [], log: [], codex: [], achievements: [],
    stats: { trades: 0, profit: 0, maxNetWorth: 0, journeys: 0, encounters: 0, fightsWon: 0, smuggled: 0, visited: ['balmora'], reliefDelivered: 0, contractsDone: 0 },
    actions: [], over: null,
  };
  if (cfg.mode === 'long-chronicle') { startChronicle(s, true); catchUpHistory(s, rng); s.stats.visited = ['narsis']; }
  for (const id of ['loc:balmora', 'faction:tong', 'topic:the-note', 'topic:calendar', 'holiday:new-life', 'topic:writ-of-coin', `background:${bg.id}`]) unlock(s, id);
  applyHistory(s, rng);
  makeOffers(s, rng, s.player.location);
  recordPrices(s);
  s.log.push({ day: 0, text: `${shortDate(0)}. New Life Festival in Balmora. You owe Gavas Drelloth ${diff.debt} septims.`, tone: 'neutral' });
  s.inbox.push({ kind: 'result', title: 'Your debt', text: `It is the New Life Festival, 4E 4, in Balmora. You owe Gavas Drelloth of the Camonna Tong ${diff.debt} septims, at ${(diff.rate * 100).toFixed(1)}% interest a day. You have ${diff.cash} septims and a pack guar. Pay him back at the Bank tab in Balmora. The Tong will wait about two months before sending collectors.` });
  s.rng = rng.state();
  return s;
}

function unlock(s: GameState, id: string) { if (C.codex[id] && !s.codex.includes(id)) s.codex.push(id); }
function log(s: GameState, text: string, tone: LogEntry['tone'] = 'neutral') { s.log.push({ day: s.day, text, tone }); if (s.log.length > 400) s.log.splice(0, s.log.length - 400); }

function startChronicle(s: GameState, fresh: boolean) {
  s.mode = 'long-chronicle'; s.timeScale = 7; s.endDay = CORONATION_DAY; s.over = null;
  s.note.rate = s.note.rate / 7;
  if (fresh) { s.day = D(7, 1, 1); s.player.location = 'narsis'; }
}

/** One day's wage for a job: twice the cheapest fare out of town (at least 30), times the job's multiplier;
 *  places the Red Year hit need hands and pay a quarter more. */
export function jobPay(s: GameState, loc: string, job: Job): number {
  const fares = C.routeList.filter(r => r.a === loc || r.b === loc).flatMap(r => r.modes.filter(m => m.mode !== 'guide').map(m => m.fare));
  const base = Math.max(30, 2 * Math.min(...fares, 60));
  const hard = ['ruined', 'rebuilding', 'sacked', 'refugee-swollen', 'camp'].includes(s.world.status[loc]);
  return Math.round(base * job.mult * (hard ? 1.25 : 1));
}

// ---------------------------------------------------------------- daily tick
export function tickDay(s: GameState, rng: Rng): void {
  s.day++;
  if (s.day % 7 === 0) (s.stats.worth ??= []).push([s.day, netWorth(s)]);
  if (!s.note.cleared) s.note.balance = s.note.balance * (1 + s.note.rate);
  for (const k of Object.keys(s.deposits)) if (s.world.branches[k] === 'open') s.deposits[k] *= 1 + DEPOSIT_RATE[k.startsWith('hlaalu:') ? 'hlaalu' : 'eec'];
  // wages
  const hold = s.player.conveyance === 'chartered-hold' ? 10 : 0;
  const wages = s.player.porters * WAGES.porter.day + s.player.sellswords * WAGES.sellsword.day + hold;
  if (wages > 0) {
    if (s.player.cash >= wages) { s.player.cash -= wages; s.player.unpaidDays = 0; }
    else if (++s.player.unpaidDays >= 3 && (s.player.porters || s.player.sellswords)) {
      s.player.porters = 0; s.player.sellswords = 0; log(s, 'Unpaid, your porters and sellswords walk off in the night.', 'bad');
    }
  }
  if (s.player.heat > 0) s.player.heat = Math.max(0, s.player.heat - HEAT.decayPerDay);
  // spoilage
  for (const [g, lot] of Object.entries(s.player.cargo)) {
    const rate = C.goods[g].perishable; if (!rate) continue;
    const loss = lot.qty * rate; const n = Math.floor(loss) + (rng.chance(loss - Math.floor(loss)) ? 1 : 0);
    lot.qty -= n; if (lot.qty <= 0) delete s.player.cargo[g];
  }
  // markets: mean-reverting drift, shocks, saturation recovery, stock flicker
  for (const L of C.locList) {
    if (s.world.status[L.id] === 'closed') continue;
    for (const [good, tend] of Object.entries(L.tendencies)) {
      const g = C.goods[good]; const c = s.markets[L.id][good];
      c.drift = Math.min(2.4, Math.max(0.45, c.drift + 0.07 * (1 - c.drift) + g.volatility * rng.gauss() * c.drift));
      c.shock = 1 + (c.shock - 1) * 0.86;
      c.sat = 1 + (c.sat - 1) * SAT_RECOVERY;
      // Survivors' camps on the ruins still trade, but fewer goods are in stock on a given day.
      const camp = s.world.status[L.id] === 'camp' ? 0.65 : 1;
      c.stock = tend <= 0.9 ? camp === 1 || rng.chance(camp) : rng.chance((tend >= 1.25 ? 0.4 : 0.75) * camp);
      if (rng.chance(0.011)) {
        const up = rng.chance(0.55);
        c.shock = up ? rng.range(2, 3.4) : rng.range(0.3, 0.5);
        if (up) c.stock = true;
        const line = rng.pick(up ? g.spikes : g.crashes);
        s.world.news.push({ day: s.day, loc: L.id, text: `${L.name}: ${line}`, up });
        if (s.world.news.length > 80) s.world.news.splice(0, s.world.news.length - 80);
      }
    }
  }
  // frozen deposits settle
  for (const f of s.frozen) if (f.settleDay === s.day) {
    const key = branchKey(f.house, f.settleAt); const amt = Math.round(f.amount * f.ratio);
    s.deposits[key] = (s.deposits[key] ?? 0) + amt;
    log(s, `The ${houseName(f.house)} settles your frozen account: ${amt} septims, payable at ${C.locs[f.settleAt].name}.`, 'neutral');
    s.inbox.push({ kind: 'result', notice: true, title: 'Frozen account settled', text: `The bank pays out part of your frozen money: ${amt} septims, credited at ${C.locs[f.settleAt].name}.` });
  }
  s.frozen = s.frozen.filter(f => f.settleDay > s.day);
  // the Scathing Charter: renewal under the new council, missed deadlines, dividends
  const ch = s.charter;
  if (ch.tier > 0) {
    const offices = C.charter.offices.map(o => C.locs[o].name).join(', ');
    if (s.world.flags.charterRenewal && !ch.renewed && ch.renewDue === null) {
      ch.renewDue = s.day + C.charter.renewalDays;
      s.inbox.push({ kind: 'result', title: 'Your charter must be renewed', text: `The new council honours old charters only if they are renewed: pay ${Math.round(ch.paid * C.charter.renewalFee)} septims in ${offices} by ${shortDate(ch.renewDue)}, or lose your highest tier.` });
    }
    if (ch.renewDue !== null && s.day > ch.renewDue) {
      const lost = C.charter.tiers[ch.tier - 1];
      ch.tier = (ch.tier - 1) as CharterState['tier']; ch.renewDue = null; ch.renewed = true; ch.paid -= lost.price;
      log(s, `You missed the charter renewal and lost the ${lost.name}.`, 'bad');
      s.inbox.push({ kind: 'result', title: 'Charter tier lost', text: `The council revokes your ${lost.name}.` });
    }
    if (ch.tier === 3 && ch.nextDividend !== null && s.day >= ch.nextDividend) {
      const amt = ch.renewDue !== null ? 0 : Math.round(C.charter.dividend * (s.world.flags.war ? 0.5 : 1));
      ch.nextDividend += C.charter.dividendEvery;
      if (amt > 0) {
        s.player.cash += amt; ch.dividends += amt;
        log(s, `Charter dividend: ${amt} septims.`, 'good');
        s.inbox.push({ kind: 'result', notice: true, title: 'Charter dividend', text: `Your share of the rebuilding: ${amt} septims${s.world.flags.war ? ' (halved while the war lasts)' : ''}.` });
      }
    }
  }
  // contracts
  for (const c of s.contracts.filter(c => c.deadline < s.day)) {
    const t = C.contracts.find(x => x.id === c.templateId)!;
    s.player.rep[t.faction] = clampRep(s.player.rep[t.faction] - 6);
    log(s, `Contract failed: ${c.qty} ${C.goods[c.good].name} never reached ${C.locs[c.destination].name}.`, 'bad');
  }
  s.contracts = s.contracts.filter(c => c.deadline >= s.day);
  s.offers = s.offers.filter(o => o.deadline > s.day);
  if (s.player.health < 100 && s.player.health > 0) s.player.health++;
  applyHistory(s, rng);
  if (s.player.health <= 0) { s.over = { reason: 'death', day: s.day }; return; }
  if (s.day >= s.endDay) s.over = { reason: 'calendar', day: s.day };
}

function tickDays(s: GameState, rng: Rng, n: number) { for (let i = 0; i < n && !s.over; i++) tickDay(s, rng); }

// ---------------------------------------------------------------- contracts
function makeOffers(s: GameState, rng: Rng, loc: string) {
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

// ---------------------------------------------------------------- arrival
function arrive(s: GameState, rng: Rng, dest: string) {
  let to = dest; let guard = 0;
  while (s.world.status[to] === 'closed' && guard++ < 5) to = C.locs[to].refuge;
  if (to !== dest) s.inbox.push({ kind: 'result', title: `${C.locs[dest].name} is gone`, text: `Where ${C.locs[dest].name} stood there is only ash and steam. The boatmen put you ashore at ${C.locs[to].name}.` });
  s.player.location = to;
  if (!s.stats.visited.includes(to)) s.stats.visited.push(to);
  unlock(s, `loc:${to}`);
  for (const u of C.locs[to].codex ?? []) unlock(s, u);
  unlock(s, `faction:${C.locs[to].faction.toLowerCase().includes('hlaalu') ? 'hlaalu' : 'none'}`);
  makeOffers(s, rng, to);
  // customs
  const cv = contrabandValue(s, to);
  if (cv > 0) {
    const bg = C.backgrounds[s.player.backgroundId];
    const p = Math.min(0.9, C.locs[to].enforcement * 0.07 * bg.customsMod * (s.player.books.includes('moon-sugar-report') ? 0.7 : 1) * heatMult(s.player.heat));
    if (rng.chance(p)) {
      const def = C.encounters.find(e => e.kind === 'customs' && (e.regions === 'any' || e.regions.includes(C.locs[to].region))) ?? C.encounters.find(e => e.kind === 'customs')!;
      s.pending = buildPending(s, def, '', to, 0, true);
      s.stats.encounters++;
      return;
    }
  }
}

// ---------------------------------------------------------------- step
export function step(state: GameState, action: Action): StepResult {
  if (state.over && action.t !== 'ack' && action.t !== 'chronicle') return { state, error: 'The game is over.' };
  if (state.pending && action.t !== 'choose' && action.t !== 'ack') return { state, error: 'Deal with what is happening on the road first.' };
  const s = structuredClone(state);
  const rng = new Rng(s.rng);
  const err = apply(s, rng, action);
  if (err) return { state, error: err };
  s.rng = rng.state();
  s.actions.push(action);
  recordPrices(s);
  checkAchievements(s);
  s.stats.maxNetWorth = Math.max(s.stats.maxNetWorth, netWorth(s));
  return { state: s };
}

function here(s: GameState) { return C.locs[s.player.location]; }

/** Note today's prices where the player stands (their price book). Closed markets leave the old entry. */
function recordPrices(s: GameState) {
  const loc = s.player.location;
  if (!C.locs[loc] || !marketOpen(s, loc)) return;
  const buy: Record<string, number> = {}, sell: Record<string, number> = {};
  for (const q of quotes(s, loc)) { if (q.buy !== null) buy[q.good] = q.buy; if (q.sell !== null) sell[q.good] = q.sell; }
  s.seen[loc] = { day: s.day, buy, sell };
}

function apply(s: GameState, rng: Rng, a: Action): string | void {
  const loc = s.player.location;
  switch (a.t) {
    case 'ack': s.inbox.splice(0, Math.max(1, Math.min(20, Math.floor(a.n ?? 1)))); return;
    case 'buy': case 'sell': return trade(s, rng, a.t, a.good, a.qty);
    case 'charter': case 'renew': return charter(s, a.t);
    case 'stash': case 'unstash': return warehouse(s, a.t, a.good, a.qty);
    case 'travel': {
      const opt = routeOptions(s).find(o => o.route.id === a.route && o.modeIndex === a.mode);
      if (!opt) return 'That route is not open.';
      s.stats.journeys++;
      unlock(s, `travel:${opt.mode}`);
      if (s.player.cash < opt.fare) {
        // Never strand the player: the broke work their passage (no fare, an extra day within the cap, sore hands).
        s.player.health = Math.max(1, s.player.health - 3);
        log(s, `Unable to pay the ${opt.fare}-septim fare, you work your passage as a ${opt.mode === 'caravan' || opt.mode === 'road' ? 'caravan hand' : 'deckhand'}.`, 'bad');
        return journey(s, rng, { ...opt, fare: 0, days: Math.min(MAX_LEG_DAYS, opt.days + 1) });
      }
      s.player.cash -= opt.fare;
      return journey(s, rng, opt);
    }
    case 'wait': {
      if (![1, 3, 7].includes(a.days)) return 'Wait 1, 3 or 7 days.';
      const free = holidayAt(s, loc)?.freeRest;
      const cost = free ? 0 : BOARD_PER_DAY * a.days * s.timeScale;
      if (s.player.cash >= cost) s.player.cash -= cost;
      else { s.player.health = Math.max(1, s.player.health - 2 * a.days); log(s, 'You cannot pay for a bed, so you sleep rough in the ash.', 'bad'); }
      tickDays(s, rng, a.days * s.timeScale);
      if (!s.over) makeOffers(s, rng, s.player.location);
      return;
    }
    case 'labour': {
      // The broke can always hire on. A day's wage covers about two trips to the nearest town.
      if (![1, 3, 7].includes(a.days)) return 'Work 1, 3 or 7 days.';
      const job = (C.jobs[loc] ?? []).find(j => j.id === a.job);
      if (!job) return 'No such work here.';
      const pay = jobPay(s, loc, job) * a.days * s.timeScale;
      s.player.health = Math.max(1, s.player.health - job.hurt * a.days);
      s.player.cash += pay;
      log(s, `You work as a ${job.name.toLowerCase()} for ${a.days * s.timeScale} day${a.days * s.timeScale > 1 ? 's' : ''} and earn ${pay} septims.`, 'good');
      tickDays(s, rng, a.days * s.timeScale);
      if (!s.over) makeOffers(s, rng, s.player.location);
      return;
    }
    case 'deposit': case 'withdraw': {
      const key = branchKey(a.house, loc);
      if (s.world.branches[key] !== 'open') return 'There is no open branch here.';
      const amt = Math.floor(a.amount); if (amt <= 0) return 'Enter an amount.';
      if (a.t === 'deposit') {
        if (s.player.cash < amt) return 'Not enough cash.';
        s.player.cash -= amt; s.deposits[key] = (s.deposits[key] ?? 0) + amt; unlock(s, `topic:house-${a.house}`);
      } else {
        const fee = Math.ceil(amt * (a.house === 'hlaalu' ? 0.01 : 0.02) * C.backgrounds[s.player.backgroundId].feeMult * (s.world.flags.hlaaluFees && a.house === 'hlaalu' ? 2 : 1));
        if ((s.deposits[key] ?? 0) < amt) return 'Not that much on deposit here.';
        s.deposits[key] -= amt; s.player.cash += amt - fee;
      }
      return;
    }
    case 'writ': {
      const to = branchKey(a.house, loc), from = branchKey(a.house, a.from);
      if (s.world.branches[to] !== 'open') return 'No open branch of that house here.';
      if (s.world.branches[from] !== 'open') return 'That branch no longer honours writs.';
      const amt = Math.floor(a.amount);
      if (amt <= 0 || (s.deposits[from] ?? 0) < amt) return 'Not that much on deposit there.';
      const fee = Math.ceil(amt * (a.house === 'hlaalu' ? 0.03 : 0.04) * C.backgrounds[s.player.backgroundId].feeMult * (s.world.flags.hlaaluFees && a.house === 'hlaalu' ? 2 : 1));
      s.deposits[from] -= amt; s.deposits[to] = (s.deposits[to] ?? 0) + amt - fee;
      log(s, `A writ of coin moves ${amt} septims from ${C.locs[a.from].name} (fee ${fee}).`);
      return;
    }
    case 'pay': {
      if (s.note.cleared) return 'Your note is cleared.';
      if (loc !== s.note.seat && !s.note.agents.includes(loc)) return 'No Tong collector here.';
      const amt = Math.min(Math.floor(a.amount), Math.ceil(s.note.balance), s.player.cash);
      if (amt <= 0) return 'Enter an amount.';
      s.player.cash -= amt; s.note.balance -= amt; s.note.lastPaymentDay = s.day;
      if (s.note.balance < 1) { s.note.balance = 0; s.note.cleared = true; log(s, 'You paid off the Camonna Tong. You owe no one.', 'good'); s.inbox.push({ kind: 'result', title: 'Debt paid off', text: 'Gavas Drelloth counts the coin twice, then tears up your note. "Pleasure, outlander." You are free of the Tong.' }); }
      return;
    }
    case 'borrow': {
      // The Tong always lends; every advance raises the rate, and a bigger debt brings harder collectors (pressure()).
      if (loc !== s.note.seat && !s.note.agents.includes(loc)) return 'No Tong agent here.';
      const amt = Math.floor(a.amount);
      if (amt <= 0) return 'Enter an amount.';
      if (s.note.cleared) { s.note.cleared = false; s.note.balance = 0; s.note.lastPaymentDay = s.day; }
      s.note.rate = Math.min(0.02 / s.timeScale, s.note.rate + 0.0015 * amt / s.note.original / s.timeScale);
      s.note.extended += amt; s.note.balance += amt; s.player.cash += amt;
      log(s, `You borrow ${amt} more from the Tong.`, 'bad');
      return;
    }
    case 'rumor': return rumor(s, rng);
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
      log(s, `Delivered ${c.qty} ${C.goods[c.good].name} for ${t.issuer}: ${c.reward} septims.`, 'good');
      return;
    }
    case 'gear': {
      const g = C.gear[a.id]; if (!g) return 'Unknown item.';
      if (!here(s).outfitter || s.world.status[loc] === 'closed') return 'No outfitter here.';
      if (s.player.cash < g.price) return `It costs ${g.price} septims.`;
      if (g.kind === 'conveyance' && (g.capacity ?? 0) <= (C.gear[s.player.conveyance].capacity ?? 0)) return 'You already have better.';
      s.player.cash -= g.price;
      if (g.kind === 'weapon') s.player.weapon = g.id;
      else if (g.kind === 'armor') s.player.armor = g.id;
      else if (g.kind === 'conveyance') s.player.conveyance = g.id;
      else s.player.scrolls[g.id as ScrollId]++;
      unlock(s, `gear:${g.id}`);
      return;
    }
    case 'hire': {
      const w = WAGES[a.who]; const cur = a.who === 'porter' ? s.player.porters : s.player.sellswords;
      if (a.delta === 1) {
        if (cur >= w.max) return `At most ${w.max}.`;
        if (s.player.cash < w.hire) return `Hiring costs ${w.hire}.`;
        s.player.cash -= w.hire;
      } else if (cur <= 0) return 'Nobody to dismiss.';
      else if (a.who === 'porter' && cargoWeight(s) > capacity(s) - 12) return 'Unload first: they are carrying your goods.';
      if (a.who === 'porter') s.player.porters += a.delta; else s.player.sellswords += a.delta;
      return;
    }
    case 'licence': {
      if (s.player.licence) return 'You already hold a licence.';
      if (loc !== 'lilmoth' && loc !== 'leyawiin') return 'Licences are sold at the Lilmoth gate or by the Argonian factor in Leyawiin.';
      if (s.player.cash < LICENCE_PRICE) return `The licence costs ${LICENCE_PRICE}.`;
      s.player.cash -= LICENCE_PRICE; s.player.licence = true; unlock(s, 'topic:lilmoth-licence');
      return;
    }
    case 'heal': {
      const L = here(s);
      if (!L.temple && !L.shrine) return 'No healer here.';
      const hol = holidayAt(s, loc);
      const cost = hol?.freeHeal ? 0 : Math.round((100 - s.player.health) * 2 * (hol?.templeHalf ? 0.5 : 1));
      if (s.player.cash < cost) return `Healing costs ${cost}.`;
      s.player.cash -= cost; s.player.health = 100; return;
    }
    case 'book': {
      const b = C.books.find(x => x.id === a.id); if (!b) return 'No such book.';
      if (!here(s).books) return 'No bookseller here.';
      if (s.player.books.includes(b.id)) return 'You own it.';
      if (b.from !== undefined && s.day < b.from) return 'Not yet written.';
      if (s.player.cash < b.price) return `It costs ${b.price}.`;
      s.player.cash -= b.price; s.player.books.push(b.id);
      unlock(s, `book:${b.id}`); for (const u of b.unlocks) unlock(s, u);
      return;
    }
    case 'choose': {
      if (!s.pending) return 'Nothing to choose.';
      if (!s.pending.choices.includes(a.choice)) return 'Not an option.';
      const res = resolve(s, rng, a.choice);
      if (res.fail) return res.fail;
      const p = s.pending; s.pending = null;
      s.inbox.push({ kind: 'result', title: p.title, text: res.text });
      log(s, `${p.title}: ${res.text}`, res.good ? 'good' : 'bad');
      if (s.player.health <= 0) { s.over = { reason: 'death', day: s.day }; return; }
      if (res.teleport) { arrive(s, rng, res.teleport); return; }
      tickDays(s, rng, ((res.delay ?? 0) + p.remainingDays) * s.timeScale);
      if (s.over) { s.player.location = p.dest; return; }
      if (p.customs) return;
      arrive(s, rng, p.dest);
      return;
    }
    case 'chronicle': {
      if (s.over?.reason !== 'calendar' || s.mode !== 'red-year') return 'The Long Chronicle opens only after the Red Year ends.';
      startChronicle(s, false);
      log(s, 'The Long Chronicle begins. Each day on the road is now a week of history.', 'history');
      return;
    }
  }
}

function journey(s: GameState, rng: Rng, opt: RouteOption): string | void {
  const origin = s.player.location;
  s.player.location = 'road';
  const enc = rollEncounter(s, rng, opt);
  if (enc) {
    const at = rng.int(0, opt.days - 1);
    tickDays(s, rng, at * s.timeScale);
    if (s.over) { s.player.location = origin; return; }
    s.pending = buildPending(s, enc, opt.route.id, opt.dest, opt.days - at);
    s.stats.encounters++;
    unlock(s, `encounter:${enc.id}`);
    return;
  }
  // Wanted smugglers carrying contraband meet Legion patrols on the road.
  if (s.player.heat >= HEAT.wanted && contrabandValue(s, opt.dest) > 0 && rng.chance(HEAT.patrolChance)) {
    const at = rng.int(0, opt.days - 1);
    tickDays(s, rng, at * s.timeScale);
    if (s.over) { s.player.location = origin; return; }
    s.pending = buildPending(s, C.encounters.find(e => e.id === 'legion-patrol')!, opt.route.id, opt.dest, opt.days - at, true);
    s.stats.encounters++;
    return;
  }
  tickDays(s, rng, opt.days * s.timeScale);
  if (s.over) { s.player.location = opt.dest; return; }
  arrive(s, rng, opt.dest);
}

const officeNames = () => C.charter.offices.map(o => C.locs[o].name).join(', ');

function charter(s: GameState, kind: 'charter' | 'renew'): string | void {
  const ch = s.charter; const loc = s.player.location;
  if (!C.charter.offices.includes(loc)) return `Charters are handled in ${officeNames()}.`;
  if (kind === 'renew') {
    if (ch.renewDue === null) return 'There is nothing to renew.';
    const fee = Math.round(ch.paid * C.charter.renewalFee);
    if (s.player.cash < fee) return `The renewal costs ${fee} septims.`;
    s.player.cash -= fee; ch.renewDue = null; ch.renewed = true;
    log(s, `You renew your charter with the new council (${fee} septims).`, 'neutral');
    return;
  }
  if (!s.world.flags.relief) return 'No charters are on offer yet.';
  if (!s.note.cleared) return 'The council will not charter a trader who still owes the Camonna Tong.';
  if (ch.renewDue !== null) return 'Renew your charter first.';
  const next = C.charter.tiers[ch.tier];
  if (!next) return 'You already hold the full charter.';
  if (s.player.cash < next.price) return `The ${next.name} costs ${next.price} septims.`;
  s.player.cash -= next.price; ch.paid += next.price; ch.tier = next.tier;
  if (s.world.flags.charterRenewal) ch.renewed = true; // granted by the new council itself
  if (next.tier === 3) ch.nextDividend = s.day + C.charter.dividendEvery;
  unlock(s, 'topic:scathing-charter');
  log(s, `You buy the ${next.name} for ${next.price} septims.`, 'good');
  s.inbox.push({ kind: 'result', title: next.name, text: next.text });
}

function warehouse(s: GameState, kind: 'stash' | 'unstash', good: string, qtyIn: number): string | void {
  const qty = Math.floor(qtyIn);
  if (s.player.location !== C.charter.warehouse) return `Your warehouse is in ${C.locs[C.charter.warehouse].name}.`;
  if (qty <= 0 || !C.goods[good]) return 'Choose what to move.';
  const [from, to] = kind === 'stash' ? [s.player.cargo, s.warehouse] : [s.warehouse, s.player.cargo];
  if (kind === 'stash' && s.charter.tier < 2) return 'You need the warehouse tier of the charter.';
  const lot = from[good]; if (!lot || lot.qty < qty) return 'There is not that much to move.';
  if (kind === 'unstash' && cargoWeight(s) + qty * C.goods[good].weight > capacity(s)) return 'You cannot carry that much.';
  const dest = (to[good] ??= { qty: 0, cost: 0 });
  dest.cost = (dest.cost * dest.qty + lot.cost * qty) / (dest.qty + qty); dest.qty += qty;
  lot.qty -= qty; if (lot.qty <= 0) delete from[good];
}

function trade(s: GameState, rng: Rng, kind: 'buy' | 'sell', good: string, qtyIn: number): string | void {
  const loc = s.player.location;
  if (!marketOpen(s, loc)) return holidayAt(s, loc)?.marketClosed ? 'Sun\'s Rest: the stalls are shuttered.' : 'The market is closed.';
  if ((loc === 'lilmoth' || loc === 'stormhold') && !s.player.licence) return 'Only licensed foreigners may trade here (the An-Xileel see to it).';
  const q = quotes(s, loc).find(x => x.good === good);
  const g = C.goods[good];
  const qty = Math.floor(qtyIn);
  if (!q || qty <= 0) return 'Nobody here deals in that.';
  const depth = DEPTH[g.category];
  const cell = s.markets[loc][good];
  unlock(s, `good:${good}`);
  if (kind === 'buy') {
    if (q.buy === null) return q.stock ? 'No merchant here will sell you that.' : 'Out of stock today.';
    const total = bulkBuyTotal(q.buy, qty, depth);
    if (s.player.cash < total) return `That costs ${total} septims.`;
    if (cargoWeight(s) + qty * g.weight > capacity(s)) return 'Your guar cannot carry that much.';
    s.player.cash -= total;
    const lot = (s.player.cargo[good] ??= { qty: 0, cost: 0 });
    lot.cost = (lot.cost * lot.qty + total) / (lot.qty + qty); lot.qty += qty;
    cell.sat = Math.min(2.2, cell.sat * (1 + qty / depth));
  } else {
    if (q.sell === null) return q.legality === 'contraband' ? 'Only a fence would touch that, and there is none here.' : 'Nobody here is buying that.';
    const lot = s.player.cargo[good];
    if (!lot || lot.qty < qty) return 'You do not have that many.';
    let total = Math.round(q.sell * qty * Math.max(0.5, 1 - qty / (2 * depth)));
    const profit = total - Math.round(lot.cost * qty);
    if (q.legality === 'restricted' && q.sellNote?.startsWith('black')) {
      if (rng.chance(here(s).enforcement * 0.06 * C.backgrounds[s.player.backgroundId].customsMod * heatMult(s.player.heat))) {
        const fine = Math.round(total * 0.4); total -= fine;
        log(s, `An EEC informer was watching. Fine: ${fine} septims.`, 'bad');
        s.inbox.push({ kind: 'result', title: 'An informer', text: `The East Empire Company does not forgive unlicensed ${g.name}. You are fined ${fine} septims.` });
      }
    }
    if (q.legality === 'contraband') { s.stats.smuggled += qty; addHeat(s, Math.min(15, 2 + total / 250)); }
    else if (q.legality === 'restricted' && q.sellNote?.startsWith('black')) addHeat(s, Math.min(8, 1 + total / 600));
    if (['food', 'medicine'].includes(g.category) && ['ruined', 'sacked', 'besieged', 'refugee-swollen'].includes(s.world.status[loc]) && profit > 0) s.player.profiteering += profit;
    s.player.cash += total;
    lot.qty -= qty; if (lot.qty <= 0) delete s.player.cargo[good];
    cell.sat = Math.max(0.45, cell.sat * (1 - qty / depth));
    s.stats.profit += profit;
  }
  s.stats.trades++;
}

function rumor(s: GameState, rng: Rng): string | void {
  const loc = s.player.location;
  const free = holidayAt(s, loc)?.freeRumor;
  if (!free) { if (s.player.cash < RUMOR_PRICE) return 'You cannot stand a round.'; s.player.cash -= RUMOR_PRICE; }
  const region = here(s).region;
  // foreshadowing from upcoming history
  const fore: string[] = [];
  for (const ev of C.history) {
    if (!ev.foreshadow || s.world.fired.includes(ev.id)) continue;
    if (s.day >= ev.day - ev.foreshadow.lead * s.timeScale && s.day < ev.day) fore.push(...ev.foreshadow.rumors);
  }
  const pool = C.rumors.filter(r => (r.kind !== 'foreshadow' || fore.includes(r.id)) &&
    (!r.regions || r.regions === 'any' || r.regions.includes(region)) &&
    (r.from === undefined || s.day >= r.from) && (r.to === undefined || s.day < r.to) && (!r.flag || s.world.flags[r.flag]));
  const roll = rng.next();
  if (roll < 0.28) {
    // a price tip: true 75% of the time
    const goods = C.goodList.filter(g => g.legality[s.world.jurisdiction[loc]] !== 'contraband');
    const g = rng.pick(goods);
    const markets = C.locList.filter(L => L.tendencies[g.id] !== undefined && s.world.status[L.id] !== 'closed' && L.id !== loc);
    if (markets.length) {
      const truthful = rng.chance(0.75);
      const best = truthful ? markets.reduce((a, b) => ((s.markets[a.id][g.id].drift * s.markets[a.id][g.id].shock * (a.tendencies[g.id] ?? 1)) > (s.markets[b.id][g.id].drift * s.markets[b.id][g.id].shock * (b.tendencies[g.id] ?? 1)) ? a : b)) : rng.pick(markets);
      const text = `They say ${g.name.toLowerCase()} fetches a fine price in ${best.name} these days.`;
      s.inbox.push({ kind: 'result', notice: true, title: 'Rumour (price tip)', text: `${text} (Tips like this are right about three times in four.)` });
      log(s, `Price tip: ${text}`);
      return;
    }
  }
  const unheard = pool.filter(r => !s.heard.includes(r.id));
  const fresh = unheard.filter(r => r.kind === 'foreshadow');
  const r = (fresh.length && rng.chance(s.player.books.includes('progress-of-truth') ? 0.9 : 0.7) ? rng.pick(fresh) : unheard.length ? rng.pick(unheard) : pool.length ? rng.pick(pool) : undefined);
  if (!r) { s.inbox.push({ kind: 'result', notice: true, title: 'Rumour', text: 'Nobody has anything new tonight.' }); return; }
  if (!s.heard.includes(r.id)) s.heard.push(r.id);
  if (r.dispute) unlock(s, `dispute:${r.dispute}`);
  unlock(s, `rumor:${r.id}`);
  s.inbox.push({ kind: 'result', notice: true, title: r.kind === 'dispute' ? 'Rumour (historians disagree)' : r.kind === 'foreshadow' ? 'Rumour (a warning)' : 'Rumour', text: `${r.voice ? r.voice + ': ' : ''}“${r.text}”` });
}

/** Rebuild a game from its seed, config and action log; must equal the live state. */
export function replay(cfg: NewGameConfig, actions: readonly Action[]): GameState {
  let s = newGame(cfg);
  for (const a of actions) {
    const r = step(s, a);
    if (r.error) throw new Error(`Replay diverged at ${JSON.stringify(a)}: ${r.error}`);
    s = r.state;
  }
  return s;
}

export type { Contract };
