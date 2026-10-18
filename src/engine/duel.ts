// The magistrate's tower duel: the rules of the classic card game "Ants" (each side builds a tower behind a
// wall, fed by masons, soldiers and mages), re-skinned for Morrowind. Pure and deterministic like the engine.
import type { Rng } from './rng';

export type Res = 'stone' | 'steel' | 'magicka';
export interface DuelSide { tower: number; wall: number; masons: number; soldiers: number; mages: number; stone: number; steel: number; magicka: number; hand: string[] }
export interface DuelState { you: DuelSide; foe: DuelSide; turn: number; last: string[]; winner: null | 'you' | 'foe'; events?: DuelEvent[] }

/** How the board animates a card: build (your walls and tower), summon (strikes the rival), res (resources), gen (income). */
export type DuelKind = 'build' | 'summon' | 'res' | 'gen';
export interface DuelCard { id: string; name: string; res: Res; cost: number; text: string; flavour: string; art: string; kind: DuelKind; play: (me: DuelSide, foe: DuelSide) => void }
type SideField = 'tower' | 'wall' | 'masons' | 'soldiers' | 'mages' | 'stone' | 'steel' | 'magicka';
/** What one turn did, step by step, for the board to play back (it never decides anything itself). */
export type DuelEvent =
  | { type: 'move'; who: 'you' | 'foe'; id: string; slot: number; discard: boolean; changes: Record<'you' | 'foe', Partial<Record<SideField, number>>>; after: { you: DuelSide; foe: DuelSide }; winner: DuelState['winner'] }
  | { type: 'income'; who: 'you' | 'foe'; changes: Record<'you' | 'foe', Partial<Record<SideField, number>>>; after: { you: DuelSide; foe: DuelSide }; winner: DuelState['winner'] };

export const DUEL = { win: 100, tower: 30, wall: 10, gen: 2, stock: 5, hand: 8, maxTurns: 200 } as const;

const GEN: Record<Res, 'masons' | 'soldiers' | 'mages'> = { stone: 'masons', steel: 'soldiers', magicka: 'mages' };
const RES: readonly Res[] = ['stone', 'steel', 'magicka'];
/** Plain names for the three resources and their income (the engine keeps the Ants slot names). */
export const RES_NAME: Record<Res, string> = { stone: 'Stone', steel: 'Troops', magicka: 'Magic' };
export const GEN_FIELD = GEN;

/** Damage hits the wall first, then the tower. */
function attack(foe: DuelSide, n: number) { const w = Math.min(foe.wall, n); foe.wall -= w; foe.tower = Math.max(0, foe.tower - (n - w)); }
// Names, flavour and art: the "Daedric duel" art thread (cards.json); ids, costs and effects follow Ants.
const c = (id: string, name: string, res: Res, cost: number, text: string, flavour: string, art: string, play: DuelCard['play'], kind: DuelKind): DuelCard => ({ id, name, res, cost, text, flavour, art, kind, play });

export const DUEL_CARDS: readonly DuelCard[] = [
  // Stone (masons)
  c('ash-wall', 'Ash Mortar', 'stone', 1, 'Wall +3', 'Red Mountain gives freely now. Too freely.', 'ward', m => { m.wall += 3; }, 'build'),
  c('foundation', 'Shrine Stone', 'stone', 1, 'Tower +2', 'Cut from a ruin older than the Temple.', 'spire', m => { m.tower += 2; }, 'build'),
  c('stockade', 'Daedric Brick', 'stone', 3, 'Wall +6', 'Black stone, warm to the touch.', 'ward', m => { m.wall += 6; }, 'build'),
  c('redoran-keep', 'Mazken Masons', 'stone', 3, 'Tower +8, your wall −4', 'They build beautifully, mostly from your wall.', 'spire', m => { m.tower += 8; m.wall = Math.max(0, m.wall - 4); }, 'build'),
  c('watchtower', 'Dusk Spire', 'stone', 5, 'Tower +5', 'Built to catch Azura’s first light.', 'spire', m => { m.tower += 5; }, 'build'),
  c('masons-guild', 'Ebony Vein', 'stone', 8, 'Stone income +1', 'The Red Year cracked the earth open.', 'ward', m => { m.masons += 1; }, 'gen'),
  c('dwemer-crane', 'Dagon’s Gate', 'stone', 10, 'Tower +8, rival tower −4', 'A gate opened for you is a gate opened.', 'spire', (m, f) => { m.tower += 8; f.tower = Math.max(0, f.tower - 4); }, 'build'),
  c('ghostfence', 'Ghostfence Stones', 'stone', 12, 'Wall +22', 'The dead stood guard once. Some still do.', 'ward', m => { m.wall += 22; }, 'build'),
  c('imperial-fort', 'Spire of Ebonheart', 'stone', 18, 'Tower +20', 'Built to outlast a god.', 'spire', m => { m.tower += 20; }, 'build'),
  c('ministry-of-truth', 'Baar Dau', 'stone', 39, 'Tower +32', 'The rock that hangs over Vivec, if you can lift it.', 'spire', m => { m.tower += 32; }, 'build'),
  // Steel (soldiers)
  c('archer', 'Archer', 'steel', 1, 'Deal 2 damage', 'One arrow, placed well.', 'scamp', (_, f) => attack(f, 2), 'summon'),
  c('ordinator', 'Ordinator', 'steel', 2, 'Deal 3 damage', 'Masks of gold, and no mercy under them.', 'clannfear', (_, f) => attack(f, 3), 'summon'),
  c('guar-rider', 'Guar Rider', 'steel', 2, 'Deal 4 damage', 'Slow to start. Slower to stop.', 'spider-daedra', (_, f) => attack(f, 4), 'summon'),
  c('legion-cohort', 'Legion Cohort', 'steel', 4, 'Deal 6 damage', 'Ebonheart’s garrison, marching on the Emperor’s coin.', 'daedroth', (_, f) => attack(f, 6), 'summon'),
  c('fighters-guild', 'Lesser Summoning', 'steel', 8, 'Troop income +1', 'Chalk, blood, a name.', 'circle', m => { m.soldiers += 1; }, 'gen'),
  c('redoran-charge', 'Redoran Charge', 'steel', 10, 'Deal 12 damage', 'House Redoran pays its debts in blood.', 'ogrim', (_, f) => attack(f, 12), 'summon'),
  c('morag-tong', 'Morag Tong', 'steel', 12, 'Rival loses 4 of each resource', 'A writ, a blade, a lawful death.', 'hunger', (_, f) => { for (const r of RES) f[r] = Math.max(0, f[r] - 4); }, 'summon'),
  c('thieves-guild', 'Mephala’s Web', 'steel', 15, 'Steal 5 of each resource', 'Every thread leads to her.', 'spider-daedra', (m, f) => { for (const r of RES) { const n = Math.min(5, f[r]); f[r] -= n; m[r] += n; } }, 'summon'),
  c('dark-brotherhood', 'Dark Brotherhood', 'steel', 18, 'Rival tower −10, ignores the wall', 'No wall stops what the Night Mother sends.', 'winged-twilight', (_, f) => { f.tower = Math.max(0, f.tower - 10); }, 'summon'),
  c('dwemer-centurion', 'Dwemer Centurion', 'steel', 28, 'Deal 32 damage', 'The Dwemer vanished. Their machines did not.', 'golden-saint', (_, f) => attack(f, 32), 'summon'),
  // Magicka (mages)
  c('conjure-stone', 'Frost Atronach', 'magicka', 4, 'Stone +8', 'Slow, cold, and it carries anything.', 'frost-atronach', m => { m.stone += 8; }, 'res'),
  c('conjure-steel', 'Flame Atronach', 'magicka', 4, 'Troops +8', 'Laughs as it burns, works as it laughs.', 'flame-atronach', m => { m.steel += 8; }, 'res'),
  c('conjure-magicka', 'Azura’s Star', 'magicka', 4, 'Magic +8', 'Every soul has a price.', 'shrine', m => { m.magicka += 8; }, 'res'),
  c('crush-stone', 'Storm Atronach', 'magicka', 4, 'Rival stone −8', 'Stone is only something to throw.', 'storm-atronach', (_, f) => { f.stone = Math.max(0, f.stone - 8); }, 'summon'),
  c('crush-steel', 'Banishing', 'magicka', 4, 'Rival troops −8', 'Back to Oblivion, and stay there.', 'circle', (_, f) => { f.steel = Math.max(0, f.steel - 8); }, 'res'),
  c('crush-magicka', 'Vaermina’s Nightmare', 'magicka', 4, 'Rival magic −8', 'Your mages dream of the Ghostfence failing.', 'shrine', (_, f) => { f.magicka = Math.max(0, f.magicka - 8); }, 'res'),
  c('mages-guild', 'Mora’s Codex', 'magicka', 8, 'Magic income +1', 'Knowledge is a debt that compounds.', 'shrine', m => { m.mages += 1; }, 'gen'),
  c('dremora-lord', 'Dremora Valkynaz', 'magicka', 21, 'Deal 25 damage', 'A lord of the Kyn. Bargain carefully.', 'dremora', (_, f) => attack(f, 25), 'summon'),
  c('almsivi-grace', 'Azura’s Dawn', 'magicka', 22, 'Tower +22', 'The Tribunal is gone. She was here first.', 'shrine', m => { m.tower += 22; }, 'build'),
  c('daedric-curse', 'Molag Bal’s Bargain', 'magicka', 25, 'Your income +1, rival’s −1', 'You gain. They lose. He keeps the rest.', 'circle', (m, f) => { m.masons++; m.soldiers++; m.mages++; f.masons = Math.max(1, f.masons - 1); f.soldiers = Math.max(1, f.soldiers - 1); f.mages = Math.max(1, f.mages - 1); }, 'gen'),
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
const FIELDS: readonly SideField[] = ['tower', 'wall', 'masons', 'soldiers', 'mages', 'stone', 'steel', 'magicka'];
const diff = (a: DuelSide, b: DuelSide) => Object.fromEntries(FIELDS.filter(k => a[k] !== b[k]).map(k => [k, b[k] - a[k]])) as Partial<Record<SideField, number>>;
const snap = (d: DuelState) => ({ you: structuredCloneSide(d.you), foe: structuredCloneSide(d.foe) });

function move(d: DuelState, rng: Rng, who: 'you' | 'foe', i: number, discard: boolean): string {
  const me = d[who], foe = d[who === 'you' ? 'foe' : 'you'];
  const before = snap(d);
  const card = DUEL_CARD[me.hand[i]];
  const name = who === 'you' ? 'You' : 'Your rival';
  me.hand[i] = draw(rng);
  if (!discard) { me[card.res] -= card.cost; card.play(me, foe); }
  judge(d);
  (d.events ??= []).push({ type: 'move', who, id: card.id, slot: i, discard, changes: { you: diff(before.you, d.you), foe: diff(before.foe, d.foe) }, after: snap(d), winner: d.winner });
  return discard ? `${name} discarded ${card.name}.` : `${name} played ${card.name} (${card.text}).`;
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

function income(d: DuelState, who: 'you' | 'foe') {
  const before = snap(d), me = d[who];
  for (const r of RES) me[r] += me[GEN[r]];
  (d.events ??= []).push({ type: 'income', who, changes: { you: diff(before.you, d.you), foe: diff(before.foe, d.foe) }, after: snap(d), winner: d.winner });
}

/** Your move, then the advocate's, each followed by the next side's income. Returns an error or nothing. */
export function duelTurn(d: DuelState, rng: Rng, i: number, discard: boolean): string | void {
  if (d.winner) return 'The duel is over.';
  const id = d.you.hand[i];
  if (id === undefined) return 'No such card.';
  if (!discard && !canPlay(d.you, id)) return `${DUEL_CARD[id].name} costs ${DUEL_CARD[id].cost} ${RES_NAME[DUEL_CARD[id].res]}.`;
  d.events = [];
  d.last = [move(d, rng, 'you', i, discard)];
  if (d.winner) return;
  income(d, 'foe');
  const f = foeChoice(d);
  d.last.push(move(d, rng, 'foe', f.i, f.discard));
  d.turn++;
  judge(d); if (d.winner) return;
  income(d, 'you');
}
