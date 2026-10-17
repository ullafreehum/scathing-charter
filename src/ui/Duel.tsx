import { useState } from 'react';
import { DUEL, DUEL_CARD, canPlay, type DuelSide, type DuelState, type Res } from '../engine';
import { useGame } from '../store/game';

const RES_LABEL: Record<Res, { name: string; gen: string; cls: string }> = {
  stone: { name: 'Stone', gen: 'Masons', cls: 'text-ember' },
  steel: { name: 'Steel', gen: 'Soldiers', cls: 'text-moss' },
  magicka: { name: 'Magicka', gen: 'Mages', cls: 'text-ice' },
};
const GEN = { stone: 'masons', steel: 'soldiers', magicka: 'mages' } as const;

function Side({ s, title }: { s: DuelSide; title: string }) {
  const pct = (n: number) => `${Math.min(100, n)}%`;
  return (
    <div className="panel p-3 text-sm flex-1 min-w-[150px]">
      <div className="h-display text-xs uppercase text-ash-400">{title}</div>
      <div className="flex items-end gap-3 h-28 mt-2" aria-label={`Tower ${s.tower}, wall ${s.wall}`}>
        <div className="w-8 bg-ash-700 relative h-full"><div className="absolute bottom-0 w-full bg-gold" style={{ height: pct(s.tower) }} /></div>
        <div className="w-4 bg-ash-700 relative h-full"><div className="absolute bottom-0 w-full bg-parchment" style={{ height: pct(s.wall) }} /></div>
        <div><div>Tower <b className="num">{s.tower}</b>/{DUEL.win}</div><div>Wall <b className="num">{s.wall}</b></div></div>
      </div>
      <div className="mt-2 space-y-0.5">{(Object.keys(RES_LABEL) as Res[]).map(r => (
        <div key={r} className={RES_LABEL[r].cls}>{RES_LABEL[r].gen} <span className="num">{s[GEN[r]]}</span> · {RES_LABEL[r].name} <b className="num">{s[r]}</b></div>
      ))}</div>
    </div>
  );
}

/** The magistrate's hearing: a tower duel. Play a card, or discard one; first to a 100-high tower (or to topple the other) wins. */
export function DuelScreen({ d }: { d: DuelState }) {
  const act = useGame(s => s.act);
  const [discard, setDiscard] = useState(false);
  return (
    <div>
      <div className="text-xs h-display uppercase text-ember">Before the magistrate</div>
      <h2 className="h-display text-2xl text-bone">The hearing{d.winner ? (d.winner === 'you' ? ': you win' : ': you lose') : ''}</h2>
      <p className="text-xs text-ash-400">Build your tower to {DUEL.win} or bring the advocate’s down. Attacks hit the wall first. Each turn your masons, soldiers and mages add stone, steel and magicka.</p>
      <div className="flex flex-wrap gap-3 mt-3"><Side s={d.you} title="Your case" /><Side s={d.foe} title="The advocate" /></div>
      <div className="text-sm text-parchment mt-2 min-h-[2.5rem]">{d.last.map((l, i) => <div key={i}>{l}</div>)}</div>
      {d.winner ? (
        <button className="btn btn-ember mt-3" autoFocus onClick={() => act({ t: 'duel', card: 0 })}>Leave the court</button>
      ) : (
        <>
          <div className="flex items-center gap-2 mt-3 text-sm">
            <label className="flex items-center gap-1"><input type="checkbox" checked={discard} onChange={e => setDiscard(e.target.checked)} /> Discard instead of play</label>
            <span className="text-ash-400 text-xs">Turn {d.turn}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
            {d.you.hand.map((id, i) => {
              const c = DUEL_CARD[id]; const ok = discard || canPlay(d.you, id);
              return (
                <button key={i} className={`panel p-2 text-left text-xs ${ok ? 'hover:bg-ash-800' : 'opacity-50'}`} disabled={!ok}
                  onClick={() => act({ t: 'duel', card: i, discard })}>
                  <div className="text-bone text-sm">{c.name}</div>
                  <div className={RES_LABEL[c.res].cls}>{c.cost} {RES_LABEL[c.res].name.toLowerCase()}</div>
                  <div className="text-parchment">{c.text}</div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
