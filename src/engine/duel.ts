// The magistrate's tower duel: the rules of the classic card game "Ants" (each side builds a tower behind a
// wall, fed by masons, soldiers and mages), re-skinned for Morrowind. Pure and deterministic like the engine.
import type { Rng } from './rng';

export type Res = 'stone' | 'steel' | 'magicka';
export interface DuelSide { tower: number; wall: number; masons: number; soldiers: number; mages: number; stone: number; steel: number; magicka: number; hand: string[] }
export interface DuelState { you: DuelSide; foe: DuelSide; turn: number; last: string[]; winner: null | 'you' | 'foe' }

export interface DuelCard { id: string; name: string; res: Res; cost: number; text: string; play: (me: DuelSide, foe: DuelSide) => void }

export const DUEL = { win: 100, tower: 30, wall: 10, gen: 2, stock: 5, hand: 8, maxTurns: 200 } as const;

const GEN: Record<Res, 'masons' | 'soldiers' | 'mages'> = { stone: 'masons', steel: 'soldiers', magicka: 'mages' };
const RES: readonly Res[] = ['stone', 'steel', 'magicka'];

/** Damage hits the wall first, then the tower. */
function attack(foe: DuelSide, n: number) { const w = Math.min(foe.wall, n); foe.wall -= w; foe.tower = Math.max(0, foe.tower - (n - w)); }
const c = (id: string, name: string, res: Res, cost: number, text: string, play: DuelCard['play']): DuelCard => ({ id, name, res, cost, text, play });

export const DUEL_CARDS: readonly DuelCard[] = [
  // Stone (masons)
  c('ash-wall', 'Ash Wall', 'stone', 1, 'Wall +3', m => { m.wall += 3; }),
  c('foundation', 'Foundation Stone', 'stone', 1, 'Tower +2', m => { m.tower += 2; }),
  c('stockade', 'Stockade', 'stone', 3, 'Wall +6', m => { m.wall += 6; }),
  c('redoran-keep', 'Redoran Keep', 'stone', 3, 'Tower +8, your wall −4', m => { m.tower += 8; m.wall = Math.max(0, m.wall - 4); }),
  c('watchtower', 'Watchtower', 'stone', 5, 'Tower +5', m => { m.tower += 5; }),
  c('masons-guild', 'Masons’ Lodge', 'stone', 8, 'Masons +1', m => { m.masons += 1; }),
  c('dwemer-crane', 'Dwemer Crane', 'stone', 10, 'Tower +8, enemy tower −4', (m, f) => { m.tower += 8; f.tower = Math.max(0, f.tower - 4); }),
  c('ghostfence', 'Ghostfence', 'stone', 12, 'Wall +22', m => { m.wall += 22; }),
  c('imperial-fort', 'Imperial Fort', 'stone', 18, 'Tower +20', m => { m.tower += 20; }),
  c('ministry-of-truth', 'Ministry of Truth', 'stone', 39, 'Tower +32', m => { m.tower += 32; }),
  // Steel (soldiers)
  c('archer', 'Archer', 'steel', 1, 'Attack 2', (_, f) => attack(f, 2)),
  c('ordinator', 'Ordinator', 'steel', 2, 'Attack 3', (_, f) => attack(f, 3)),
  c('guar-rider', 'Guar Rider', 'steel', 2, 'Attack 4', (_, f) => attack(f, 4)),
  c('legion-cohort', 'Legion Cohort', 'steel', 4, 'Attack 6', (_, f) => attack(f, 6)),
  c('fighters-guild', 'Fighters Guild', 'steel', 8, 'Soldiers +1', m => { m.soldiers += 1; }),
  c('redoran-charge', 'Redoran Charge', 'steel', 10, 'Attack 12', (_, f) => attack(f, 12)),
  c('morag-tong', 'Morag Tong Writ', 'steel', 12, 'Enemy stone, steel and magicka −4', (_, f) => { for (const r of RES) f[r] = Math.max(0, f[r] - 4); }),
  c('thieves-guild', 'Thieves Guild', 'steel', 15, 'Steal 5 of each resource', (m, f) => { for (const r of RES) { const n = Math.min(5, f[r]); f[r] -= n; m[r] += n; } }),
  c('dark-brotherhood', 'Dark Brotherhood', 'steel', 18, 'Enemy tower −10, past the wall', (_, f) => { f.tower = Math.max(0, f.tower - 10); }),
  c('dwemer-centurion', 'Dwemer Centurion', 'steel', 28, 'Attack 32', (_, f) => attack(f, 32)),
  // Magicka (mages)
  c('conjure-stone', 'Transmute Stone', 'magicka', 4, 'Stone +8', m => { m.stone += 8; }),
  c('conjure-steel', 'Bound Arms', 'magicka', 4, 'Steel +8', m => { m.steel += 8; }),
  c('conjure-magicka', 'Restore Magicka', 'magicka', 4, 'Magicka +8', m => { m.magicka += 8; }),
  c('crush-stone', 'Earthquake', 'magicka', 4, 'Enemy stone −8', (_, f) => { f.stone = Math.max(0, f.stone - 8); }),
  c('crush-steel', 'Rust Curse', 'magicka', 4, 'Enemy steel −8', (_, f) => { f.steel = Math.max(0, f.steel - 8); }),
  c('crush-magicka', 'Drain Magicka', 'magicka', 4, 'Enemy magicka −8', (_, f) => { f.magicka = Math.max(0, f.magicka - 8); }),
  c('mages-guild', 'Mages Guild', 'magicka', 8, 'Mages +1', m => { m.mages += 1; }),
  c('dremora-lord', 'Summon Dremora Lord', 'magicka', 21, 'Attack 25', (_, f) => attack(f, 25)),
  c('almsivi-grace', 'Grace of Almsivi', 'magicka', 22, 'Tower +22', m => { m.tower += 22; }),
  c('daedric-curse', 'Sheogorath’s Whim', 'magicka', 25, 'Your masons, soldiers, mages +1; the enemy’s −1', (m, f) => { m.masons++; m.soldiers++; m.mages++; f.masons = Math.max(1, f.masons - 1); f.soldiers = Math.max(1, f.soldiers - 1); f.mages = Math.max(1, f.mages - 1); }),
];
export const DUEL_CARD: Record<string, DuelCard> = Object.fromEntries(DUEL_CARDS.map(x => [x.id, x]));

const draw = (rng: Rng) => DUEL_CARDS[rng.int(0, DUEL_CARDS.length - 1)].id;
function side(rng: Rng, first: boolean): DuelSide {
  // The side that moves first starts one turn's income behind, as in the original.
  const s0 = first ? DUEL.stock : DUEL.stock + DUEL.gen;
  return { tower: DUEL.tower, wall: DUEL.wall, masons: DUEL.gen, soldiers: DUEL.gen, mages: DUEL.gen, stone: s0, steel: s0, magicka: s0, hand: Array.from({ length: DUEL.hand }, () => draw(rng)) };
}

export function newDuel(rng: Rng): DuelState { return { you: side(rng, true), foe: side(rng, false), turn: 1, last: [], winner: null }; }

export const canPlay = (me: DuelSide, id: string) => me[DUEL_CARD[id].res] >= DUEL_CARD[id].cost;

function judge(d: DuelState) {
  const done = (me: DuelSide, foe: DuelSide) => me.tower >= DUEL.win || foe.tower <= 0;
  if (done(d.you, d.foe)) d.winner = 'you';
  else if (done(d.foe, d.you)) d.winner = 'foe';
  else if (d.turn >= DUEL.maxTurns) d.winner = d.you.tower >= d.foe.tower ? 'you' : 'foe';
}

/** One move by `who`: play or discard hand[i], draw a replacement. Returns a line for the duel log. */
function move(d: DuelState, rng: Rng, who: 'you' | 'foe', i: number, discard: boolean): string {
  const me = d[who], foe = d[who === 'you' ? 'foe' : 'you'];
  const card = DUEL_CARD[me.hand[i]];
  const name = who === 'you' ? 'You' : 'The magistrate’s advocate';
  me.hand[i] = draw(rng);
  if (discard) return `${name} discarded ${card.name}.`;
  me[card.res] -= card.cost; card.play(me, foe);
  return `${name} played ${card.name} (${card.text}).`;
}

/** Simple advocate: wins if it can, else prefers the strongest affordable card for the situation. */
function foeChoice(d: DuelState): { i: number; discard: boolean } {
  const me = d.foe, you = d.you;
  let best = -1, bestScore = -Infinity;
  me.hand.forEach((id, i) => {
    if (!canPlay(me, id)) return;
    const a = structuredCloneSide(me), b = structuredCloneSide(you); DUEL_CARD[id].play(a, b);
    let sc = (a.tower - me.tower) * 1.2 + (a.wall - me.wall) * 0.6 + (you.tower - b.tower) * 1.5 + (you.wall - b.wall) * 0.7
      + (a.masons + a.soldiers + a.mages - me.masons - me.soldiers - me.mages) * 9 + DUEL_CARD[id].cost * 0.1;
    if (a.tower >= DUEL.win || b.tower <= 0) sc += 1000;
    if (me.wall < 8 && a.wall > me.wall) sc += 6;
    if (sc > bestScore) { bestScore = sc; best = i; }
  });
  if (best >= 0) return { i: best, discard: false };
  // Discard the card furthest out of reach.
  let far = 0, gap = -Infinity;
  me.hand.forEach((id, i) => { const g = DUEL_CARD[id].cost - me[DUEL_CARD[id].res]; if (g > gap) { gap = g; far = i; } });
  return { i: far, discard: true };
}
function structuredCloneSide(x: DuelSide): DuelSide { return { ...x, hand: [...x.hand] }; }

function income(me: DuelSide) { for (const r of RES) me[r] += me[GEN[r]]; }

/** Your move, then the advocate's, each followed by the next side's income. Returns an error or nothing. */
export function duelTurn(d: DuelState, rng: Rng, i: number, discard: boolean): string | void {
  if (d.winner) return 'The duel is over.';
  const id = d.you.hand[i];
  if (id === undefined) return 'No such card.';
  if (!discard && !canPlay(d.you, id)) return `You need ${DUEL_CARD[id].cost} ${DUEL_CARD[id].res}.`;
  d.last = [move(d, rng, 'you', i, discard)];
  judge(d); if (d.winner) return;
  income(d.foe);
  const f = foeChoice(d);
  d.last.push(move(d, rng, 'foe', f.i, f.discard));
  d.turn++;
  judge(d); if (d.winner) return;
  income(d.you);
}
