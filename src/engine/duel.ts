// The magistrate's tower duel: the rules of the classic card game "Ants" (each side builds a tower behind a
// wall, fed by masons, soldiers and mages), re-skinned for Morrowind. Pure and deterministic like the engine.
import type { Rng } from './rng';

export type Res = 'stone' | 'steel' | 'magicka';
export interface DuelSide { tower: number; wall: number; masons: number; soldiers: number; mages: number; stone: number; steel: number; magicka: number; hand: string[] }
export interface DuelState { you: DuelSide; foe: DuelSide; turn: number; last: string[]; winner: null | 'you' | 'foe' }

export interface DuelCard { id: string; name: string; res: Res; cost: number; text: string; flavour: string; art: string; play: (me: DuelSide, foe: DuelSide) => void }

export const DUEL = { win: 100, tower: 30, wall: 10, gen: 2, stock: 5, hand: 8, maxTurns: 200 } as const;

const GEN: Record<Res, 'masons' | 'soldiers' | 'mages'> = { stone: 'masons', steel: 'soldiers', magicka: 'mages' };
const RES: readonly Res[] = ['stone', 'steel', 'magicka'];

/** Damage hits the wall first, then the tower. */
function attack(foe: DuelSide, n: number) { const w = Math.min(foe.wall, n); foe.wall -= w; foe.tower = Math.max(0, foe.tower - (n - w)); }
// Names, flavour and art: the "Daedric duel" art thread (cards.json); ids, costs and effects follow Ants.
const c = (id: string, name: string, res: Res, cost: number, text: string, flavour: string, art: string, play: DuelCard['play']): DuelCard => ({ id, name, res, cost, text, flavour, art, play });

export const DUEL_CARDS: readonly DuelCard[] = [
  // Stone (masons)
  c('ash-wall', 'Ash Mortar', 'stone', 1, 'Ward +3', 'Red Mountain gives freely now. Too freely.', 'ward', m => { m.wall += 3; }),
  c('foundation', 'Shrine Stone', 'stone', 1, 'Spire +2', 'Cut from a ruin older than the Temple.', 'spire', m => { m.tower += 2; }),
  c('stockade', 'Daedric Brick', 'stone', 3, 'Ward +6', 'Black stone, warm to the touch.', 'ward', m => { m.wall += 6; }),
  c('redoran-keep', 'Mazken Masons', 'stone', 3, 'Spire +8, your ward −4', 'They build beautifully, mostly from your wall.', 'spire', m => { m.tower += 8; m.wall = Math.max(0, m.wall - 4); }),
  c('watchtower', 'Dusk Spire', 'stone', 5, 'Spire +5', 'Built to catch Azura’s first light.', 'spire', m => { m.tower += 5; }),
  c('masons-guild', 'Ebony Vein', 'stone', 8, 'Mines +1', 'The Red Year cracked the earth open.', 'ward', m => { m.masons += 1; }),
  c('dwemer-crane', 'Dagon’s Gate', 'stone', 10, 'Spire +8, enemy spire −4', 'A gate opened for you is a gate opened.', 'spire', (m, f) => { m.tower += 8; f.tower = Math.max(0, f.tower - 4); }),
  c('ghostfence', 'Ghostfence Stones', 'stone', 12, 'Ward +22', 'The dead stood guard once. Some still do.', 'ward', m => { m.wall += 22; }),
  c('imperial-fort', 'Spire of Ebonheart', 'stone', 18, 'Spire +20', 'Built to outlast a god.', 'spire', m => { m.tower += 20; }),
  c('ministry-of-truth', 'Baar Dau', 'stone', 39, 'Spire +32', 'The rock that hangs over Vivec, if you can lift it.', 'spire', m => { m.tower += 32; }),
  // Steel (soldiers)
  c('archer', 'Scamp', 'steel', 1, 'Attack 2', 'Will work for coin. Will also steal it.', 'scamp', (_, f) => attack(f, 2)),
  c('ordinator', 'Clannfear', 'steel', 2, 'Attack 3', 'All teeth, no patience.', 'clannfear', (_, f) => attack(f, 3)),
  c('guar-rider', 'Spider Daedra', 'steel', 2, 'Attack 4', 'Mephala’s children bite and whisper.', 'spider-daedra', (_, f) => attack(f, 4)),
  c('legion-cohort', 'Daedroth', 'steel', 4, 'Attack 6', 'Crocodile, philosopher, cook. Mostly crocodile.', 'daedroth', (_, f) => attack(f, 6)),
  c('fighters-guild', 'Lesser Summoning', 'steel', 8, 'Circles +1', 'Chalk, blood, a name.', 'circle', m => { m.soldiers += 1; }),
  c('redoran-charge', 'Ogrim', 'steel', 10, 'Attack 12', 'Malacath’s own: strong, slow, unloved.', 'ogrim', (_, f) => attack(f, 12)),
  c('morag-tong', 'Hunger', 'steel', 12, 'Enemy ebony, bindings and magicka −4', 'It eats what it touches.', 'hunger', (_, f) => { for (const r of RES) f[r] = Math.max(0, f[r] - 4); }),
  c('thieves-guild', 'Mephala’s Web', 'steel', 15, 'Steal 5 of each resource', 'Every thread leads to her.', 'spider-daedra', (m, f) => { for (const r of RES) { const n = Math.min(5, f[r]); f[r] -= n; m[r] += n; } }),
  c('dark-brotherhood', 'Winged Twilight', 'steel', 18, 'Enemy spire −10, past the ward', 'Azura’s messengers fly over walls.', 'winged-twilight', (_, f) => { f.tower = Math.max(0, f.tower - 10); }),
  c('dwemer-centurion', 'Golden Saint', 'steel', 28, 'Attack 32', 'The Aureal keep their word, and yours.', 'golden-saint', (_, f) => attack(f, 32)),
  // Magicka (mages)
  c('conjure-stone', 'Frost Atronach', 'magicka', 4, 'Ebony +8', 'Slow, cold, and it carries anything.', 'frost-atronach', m => { m.stone += 8; }),
  c('conjure-steel', 'Flame Atronach', 'magicka', 4, 'Bindings +8', 'Laughs as it burns, works as it laughs.', 'flame-atronach', m => { m.steel += 8; }),
  c('conjure-magicka', 'Azura’s Star', 'magicka', 4, 'Magicka +8', 'Every soul has a price.', 'shrine', m => { m.magicka += 8; }),
  c('crush-stone', 'Storm Atronach', 'magicka', 4, 'Enemy ebony −8', 'Stone is only something to throw.', 'storm-atronach', (_, f) => { f.stone = Math.max(0, f.stone - 8); }),
  c('crush-steel', 'Banishing', 'magicka', 4, 'Enemy bindings −8', 'Back to Oblivion, and stay there.', 'circle', (_, f) => { f.steel = Math.max(0, f.steel - 8); }),
  c('crush-magicka', 'Vaermina’s Nightmare', 'magicka', 4, 'Enemy magicka −8', 'Your mages dream of the Ghostfence failing.', 'shrine', (_, f) => { f.magicka = Math.max(0, f.magicka - 8); }),
  c('mages-guild', 'Mora’s Codex', 'magicka', 8, 'Shrines +1', 'Knowledge is a debt that compounds.', 'shrine', m => { m.mages += 1; }),
  c('dremora-lord', 'Dremora Valkynaz', 'magicka', 21, 'Attack 25', 'A lord of the Kyn. Bargain carefully.', 'dremora', (_, f) => attack(f, 25)),
  c('almsivi-grace', 'Azura’s Dawn', 'magicka', 22, 'Spire +22', 'The Tribunal is gone. She was here first.', 'shrine', m => { m.tower += 22; }),
  c('daedric-curse', 'Molag Bal’s Bargain', 'magicka', 25, 'Your mines, circles, shrines +1; the enemy’s −1', 'You gain. They lose. He keeps the rest.', 'circle', (m, f) => { m.masons++; m.soldiers++; m.mages++; f.masons = Math.max(1, f.masons - 1); f.soldiers = Math.max(1, f.soldiers - 1); f.mages = Math.max(1, f.mages - 1); }),
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
