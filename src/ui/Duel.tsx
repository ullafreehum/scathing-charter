import { useState } from 'react';
import { DUEL, DUEL_CARD, canPlay, type DuelSide, type DuelState, type Res } from '../engine';
import { useGame } from '../store/game';
import frame from '../assets/duel/card-frame.svg';
import spire from '../assets/duel/spire.svg';
import ward from '../assets/duel/ward.svg';
import bg from '../assets/duel/background.svg';
import ebony from '../assets/duel/cost-ebony.svg';
import bindings from '../assets/duel/cost-bindings.svg';
import magicka from '../assets/duel/cost-magicka.svg';

// Card art by the "Daedric duel" thread: art/cards/<id>.svg sits under the frame's transparent window (24,52 192×132 of 240×340).
const ART = import.meta.glob<string>('../assets/duel/cards/*.svg', { eager: true, query: '?url', import: 'default' });
const artUrl = (id: string) => ART[`../assets/duel/cards/${id}.svg`];

const RES_LABEL: Record<Res, { name: string; gen: string; cls: string; icon: string }> = {
  stone: { name: 'Ebony', gen: 'Mines', cls: 'text-ember', icon: ebony },
  steel: { name: 'Bindings', gen: 'Circles', cls: 'text-moss', icon: bindings },
  magicka: { name: 'Magicka', gen: 'Shrines', cls: 'text-ice', icon: magicka },
};
const GEN = { stone: 'masons', steel: 'soldiers', magicka: 'mages' } as const;

function Side({ s, title }: { s: DuelSide; title: string }) {
  const clip = (n: number) => ({ clipPath: `inset(${100 - Math.min(100, n)}% 0 0 0)` });
  return (
    <div className="panel p-3 text-sm flex-1 min-w-[10rem]">
      <div className="h-display text-xs uppercase text-ash-400">{title}</div>
      <div className="flex items-end gap-2 h-32 mt-2" aria-label={`Spire ${s.tower}, ward ${s.wall}`}>
        <img src={spire} alt="" className="h-full w-auto" style={clip(s.tower)} />
        <img src={ward} alt="" className="h-3/4 w-auto" style={clip(s.wall * 2)} />
        <div><div>Spire <b className="num">{s.tower}</b>/{DUEL.win}</div><div>Ward <b className="num">{s.wall}</b></div></div>
      </div>
      <div className="mt-2 space-y-0.5">{(Object.keys(RES_LABEL) as Res[]).map(r => (
        <div key={r} className={`flex items-center gap-1 ${RES_LABEL[r].cls}`}><img src={RES_LABEL[r].icon} alt="" className="w-4 h-4" />{RES_LABEL[r].gen} <span className="num">{s[GEN[r]]}</span> · {RES_LABEL[r].name} <b className="num">{s[r]}</b></div>
      ))}</div>
    </div>
  );
}

/** The magistrate's hearing: a tower duel. Play a card, or discard one; first to a 100-high tower (or to topple the other) wins. */
export function DuelScreen({ d }: { d: DuelState }) {
  const act = useGame(s => s.act);
  const [discard, setDiscard] = useState(false);
  return (
    <div className="p-1 rounded" style={{ backgroundImage: `url(${bg})`, backgroundSize: 'cover' }}>
      <div className="text-xs h-display uppercase text-ember">Before the magistrate</div>
      <h2 className="h-display text-2xl text-bone">The hearing{d.winner ? (d.winner === 'you' ? ': you win' : ': you lose') : ''}</h2>
      <p className="text-xs text-ash-400">Raise your spire to {DUEL.win} or bring the advocate’s down. Attacks hit the ward first. Each turn your mines, circles and shrines add ebony, bindings and magicka.</p>
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
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 mt-2">
            {d.you.hand.map((id, i) => {
              const c = DUEL_CARD[id]; const ok = discard || canPlay(d.you, id);
              return (
                <button key={i} className={`relative aspect-[240/340] text-left ${ok ? 'hover:-translate-y-1 transition-transform' : 'opacity-50'}`} disabled={!ok} title={c.flavour}
                  onClick={() => act({ t: 'duel', card: i, discard })}>
                  {artUrl(c.art) && <img src={artUrl(c.art)} alt="" className="absolute" style={{ left: '10%', top: '15.3%', width: '80%', height: '38.8%' }} />}
                  <img src={frame} alt="" className="absolute inset-0 w-full h-full" />
                  <span className="absolute left-[10%] right-[10%] top-[4%] text-[0.69rem] text-bone leading-tight">{c.name}</span>
                  <span className={`absolute right-[8%] top-[4%] flex items-center gap-0.5 text-[0.69rem] ${RES_LABEL[c.res].cls}`}><img src={RES_LABEL[c.res].icon} alt={RES_LABEL[c.res].name} className="w-3.5 h-3.5" />{c.cost}</span>
                  <span className="absolute left-[10%] right-[10%] top-[57%] text-[0.69rem] text-parchment leading-tight">{c.text}<span className="block italic text-ash-400 mt-1">{c.flavour}</span></span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
