import { useEffect, useRef, useState } from 'react';
import { DUEL, DUEL_CARD, GEN_FIELD, RES_NAME, Rng, canPlay, duelTurn, hashSeed, newDuel, type DuelSide, type DuelState, type Res } from '../engine';
import { useGame } from '../store/game';
import { motion } from 'framer-motion';
import { useAnimationsOn, useMotion } from './motion';
import { PHONE, useBack } from './phone';
import { Sheet } from './Game';
import type { DuelBoard } from './duelBoard';
import frame from '../assets/duel/card-frame.svg';
import spire from '../assets/duel/spire.png';
import ward from '../assets/duel/ward.png';
import bg from '../assets/duel/background.svg';
import ebony from '../assets/duel/cost-ebony.svg';
import bindings from '../assets/duel/cost-bindings.svg';
import magicka from '../assets/duel/cost-magicka.svg';

// Card art sits under the frame's window (24,52 192×132 of 240×340): the card's painting, else its icon, else the art it shares.
const ART = {
  ...import.meta.glob<string>('../assets/duel/cards/*.svg', { eager: true, query: '?url', import: 'default' }),
  ...import.meta.glob<string>('../assets/duel/cards-painted/*.jpg', { eager: true, query: '?url', import: 'default' }),
};
const artUrl = (id: string) => ART[`../assets/duel/cards-painted/${id}.jpg`] ?? ART[`../assets/duel/cards/${id}.svg`] ?? ART[`../assets/duel/cards/${DUEL_CARD[id].art}.svg`];
const RES_STYLE: Record<Res, { cls: string; icon: string }> = {
  stone: { cls: 'text-ember', icon: ebony }, steel: { cls: 'text-moss', icon: bindings }, magicka: { cls: 'text-ice', icon: magicka },
};

const SPEEDS = { Normal: 1, Fast: 0.5, Skip: 0 } as const; // Normal is the board's real pace (0.11)
type Speed = keyof typeof SPEEDS;
const SPEED_KEY = 'ashfall-ledger/ui/duel-speed';
function readSpeed(): Speed { try { const v = localStorage.getItem(SPEED_KEY); if (v && v in SPEEDS) return v as Speed; } catch { /* storage blocked */ } return 'Normal'; }

/** Plays a card (or discards it): the duel after the turn, or null if it was refused. */
type Play = (card: number, discard: boolean) => DuelState | null;
const gamePlay: Play = (card, discard) => (useGame.getState().act({ t: 'duel', card, discard }) ? useGame.getState().game?.duel ?? null : null);
const gameLeave = () => { useGame.getState().act({ t: 'duel', card: 0 }); };

/** The magistrate's hearing: a tower duel. Play a card, or discard one; first to a 100-high tower (or to topple the other) wins.
 *  In a game it plays through the engine; on its own (from the title screen) `play` and `leave` drive a practice duel. */
export function DuelScreen({ d, play = gamePlay, leave = gameLeave, kicker = 'Before the magistrate', leaveLabel = 'Leave the court', extra }: { d: DuelState; play?: Play; leave?: () => void; kicker?: string; leaveLabel?: string; extra?: React.ReactNode }) {
  const playRef = useRef(play); playRef.current = play;
  const anim = useAnimationsOn();
  const m = useMotion(), endPop = { initial: m.pop.initial, animate: { ...m.pop.animate, transition: m.t('slow') } }; // Leave pops in after the verdict
  const [discard, setDiscard] = useState(false);
  const [speed, setSpeed] = useState<Speed>(readSpeed);
  const [mode, setMode] = useState<'loading' | 'board' | 'plain'>('loading');
  const [shown, setShown] = useState(d); // what the animated board has finished showing
  const host = useRef<HTMLDivElement>(null);
  const board = useRef<DuelBoard | null>(null);
  const motionAtStart = useRef(anim);
  const [sel, setSel] = useState<number | null>(null); // the phone: the selected card, and whether a turn is playing
  const [busy, setBusy] = useState(false);
  const [rules, setRules] = useState(false);

  // The animated board loads on demand; without WebGL (or if it fails) the plain board below stays.
  useEffect(() => {
    let gone = false;
    const el = host.current; if (!el) return;
    import('./duelBoard').then(m => m.DuelBoard.create(el, d, {
      motion: motionAtStart.current, touch: PHONE,
      pick: (i, discard) => playRef.current(i, discard),
      settled: s => { if (!gone) setShown(s); },
      discardOff: () => { if (!gone) setDiscard(false); },
      state: (i, b) => { if (!gone) { setSel(i); setBusy(b); } },
    })).then(b => {
      if (gone) { b.destroy(); return; }
      board.current = b; b.setSpeed(SPEEDS[readSpeed()]); setMode('board');
    }).catch(() => { if (!gone) setMode('plain'); });
    return () => { gone = true; board.current?.destroy(); board.current = null; };
  }, []); // built once: the board then plays each turn itself
  useEffect(() => { board.current?.setDiscard(discard); }, [discard, mode]);
  useEffect(() => { board.current?.setSpeed(SPEEDS[speed]); try { localStorage.setItem(SPEED_KEY, speed); } catch { /* storage blocked */ } }, [speed, mode]);

  const now = mode === 'board' ? shown : d;
  // Android Back: the Rules sheet, then the selected card; a hearing runs to its end, then Back leaves the court.
  useBack(rules, () => setRules(false));
  useBack(sel !== null, () => board.current?.highlight(null));
  useBack(!!now.winner && play === gamePlay, leave);
  const hand = mode === 'board' && !now.winner && (
    // The canvas cannot take keyboard focus: these buttons play the same cards and lift the one in focus.
    <div className="sr-only" role="group" aria-label="Your hand">
      {now.you.hand.map((id, i) => {
        const c = DUEL_CARD[id], ok = discard || canPlay(now.you, id);
        return <button key={i} disabled={!ok} onFocus={() => board.current?.highlight(i)} onBlur={() => board.current?.highlight(null)} onClick={() => board.current?.play(i)}>
          {discard ? 'Discard' : 'Play'} {c.name} ({c.cost} {RES_NAME[c.res]}): {c.text}</button>;
      })}
    </div>
  );
  const live = mode === 'board' && <div className="sr-only" aria-live="polite">{shown.last.join(' ')}</div>;

  if (PHONE) {
    // Full screen: the board as big as fits, its buttons over the two empty columns of the scene (Sorcerer's DUEL-PHONE-SPEC).
    const k = sel !== null && !now.winner ? DUEL_CARD[now.you.hand[sel]] : null, need = k ? k.cost - now.you[k.res] : 0;
    const zone = (x: number) => ({ left: `${x / 12.8}%`, top: `${236 / 7.2}%`, width: `${254 / 12.8}%` }); // stage units (1280×720)
    return (
      <div className="duel-phone">
        <div className="duel-gutter" style={{ backgroundImage: `url(${bg})` }} />
        {mode !== 'plain' && (
          <div ref={host} data-turn={shown.turn} data-winner={shown.winner ?? ''} className="duel-board relative overflow-hidden bg-black" style={{ width: 'min(calc(100vw - 48px), calc(100dvh * 16 / 9))', aspectRatio: '16 / 9' }}>
            {mode === 'loading' && <div className="absolute inset-0 grid place-items-center text-ash-400 text-sm">Setting up the court…</div>}
            {mode === 'board' && !now.winner && <div className="duel-zone" style={zone(16)}>
              <button className="btn duel-big" onClick={() => setSpeed(x => { const ks = Object.keys(SPEEDS) as Speed[]; return ks[(ks.indexOf(x) + 1) % ks.length]; })}>Speed: {speed}</button>
              <button className="btn" onClick={() => setRules(true)}>Rules</button>
            </div>}
            {mode === 'board' && !now.winner && !busy && <div className="duel-zone" style={zone(1010)}>
              <button className="btn btn-ember duel-big flex-col" disabled={!k || need > 0} onClick={() => { if (sel !== null) board.current?.play(sel); }}>
                {!k ? 'Tap a card' : need > 0 ? `Need ${need} more ${RES_NAME[k.res]}` : <>Play<small>Costs {k.cost} {RES_NAME[k.res]}</small></>}
              </button>
              <button className="btn" disabled={!k} onClick={() => { if (sel !== null) board.current?.discardAt(sel); }}>Discard</button>
            </div>}
            {now.winner && <div className="duel-end">
              <motion.div className="flex flex-col items-center gap-2" {...endPop}>
                <button className="btn btn-ember" autoFocus onClick={leave}>{leaveLabel}</button>
                {extra}
              </motion.div>
            </div>}
          </div>
        )}
        {mode === 'plain' && <div className="duel-plain">
          <PlainBoard d={d} discard={discard} play={play} played={() => setDiscard(false)} />
          <div className="flex flex-wrap gap-2 mt-2">
            {now.winner ? <button className="btn btn-ember" onClick={leave}>{leaveLabel}</button>
              : <button className={`btn ${discard ? 'btn-ember' : ''}`} aria-pressed={discard} onClick={() => setDiscard(x => !x)}>{discard ? 'Discarding: tap a card' : 'Discard a card'}</button>}
            {extra}
          </div>
        </div>}
        {rules && <Sheet title="Rules" onClose={() => setRules(false)}>
          <div className="space-y-2 text-sm text-parchment">
            <p>Build your tower to {DUEL.win}, or knock your rival’s down to 0. Damage hits the wall first. Each turn your income adds stone, troops and magic.</p>
            <p>Tap a card to see it. Tap Play, or tap the card again. Discard throws a card away and still ends your turn.</p>
            <p>Tap the board during your rival’s turn to hurry it.</p>
          </div>
        </Sheet>}
        {hand}{live}
      </div>
    );
  }

  return (
    <div>
      <h2 className="flex flex-wrap items-baseline gap-x-3"><span className="text-xs h-display uppercase text-ember">{kicker}</span><span className="h-display text-lg text-bone">The hearing{now.winner ? (now.winner === 'you' ? ': you win' : ': you lose') : ''}</span></h2>
      {mode !== 'plain' && (
        <div ref={host} data-turn={shown.turn} data-winner={shown.winner ?? ''} className="duel-board relative mx-auto mt-1 rounded overflow-hidden bg-black" style={{ width: 'min(100%, calc((100dvh - 6.25rem) * 16 / 9))', aspectRatio: '16 / 9' }}>
          {mode === 'loading' && <div className="absolute inset-0 grid place-items-center text-ash-400 text-sm">Setting up the court…</div>}
        </div>
      )}
      {mode === 'plain' && <PlainBoard d={d} discard={discard} play={play} played={() => setDiscard(false)} />}
      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
        {now.winner ? (
          <motion.button className="btn btn-ember" autoFocus onClick={leave} {...endPop}>{leaveLabel}</motion.button>
        ) : (
          <button className={`btn ${discard ? 'btn-ember' : ''}`} aria-pressed={discard} onClick={() => setDiscard(x => !x)}
            title="Throw a card away instead of playing it (you still lose the turn)">{discard ? 'Discarding: pick a card' : 'Discard a card'}</button>
        )}
        {extra}
        {mode === 'board' && (
          <div role="group" aria-label="Speed" className="flex items-center gap-1 ml-auto">
            <span className="text-ash-400 text-xs mr-1">Speed</span>
            {(Object.keys(SPEEDS) as Speed[]).map(k => <button key={k} className={`btn ${speed === k ? 'btn-ember' : ''}`} aria-pressed={speed === k} onClick={() => setSpeed(k)}>{k}</button>)}
          </div>
        )}
        {mode === 'board' && !now.winner && <span className="text-ash-400 text-xs">Click the board to hurry a turn.</span>}
      </div>
      {hand}{live}
    </div>
  );
}

function Side({ s, title }: { s: DuelSide; title: string }) {
  const clip = (n: number) => ({ clipPath: `inset(${100 - Math.min(100, n)}% 0 0 0)` });
  return (
    <div className="panel p-3 text-sm flex-1 min-w-[10rem]">
      <div className="h-display text-xs uppercase text-ash-400">{title}</div>
      <div className="flex items-end gap-2 h-32 mt-2" aria-label={`Tower ${s.tower}, wall ${s.wall}`}>
        <img src={spire} alt="" className="h-full w-auto" style={clip(s.tower)} />
        <img src={ward} alt="" className="h-3/4 w-auto" style={clip(s.wall * 2)} />
        <div><div>Tower <b className="num">{s.tower}</b>/{DUEL.win}</div><div>Wall <b className="num">{s.wall}</b></div></div>
      </div>
      <div className="mt-2 space-y-0.5">{(Object.keys(RES_STYLE) as Res[]).map(r => (
        <div key={r} className={`flex items-center gap-1 ${RES_STYLE[r].cls}`}><img src={RES_STYLE[r].icon} alt="" className="w-4 h-4" />{RES_NAME[r]} <b className="num">{s[r]}</b> · +{s[GEN_FIELD[r]]} a turn</div>
      ))}</div>
    </div>
  );
}

/** The plain board: used while WebGL is missing or the animated board failed to load. */
function PlainBoard({ d, discard, play, played }: { d: DuelState; discard: boolean; play: Play; played: () => void }) {
  return (
    <div className="p-1 rounded" style={{ backgroundImage: `url(${bg})`, backgroundSize: 'cover' }}>
      <p className="text-xs text-ash-400">Build your tower to {DUEL.win}, or knock your rival’s down to 0. Damage hits the wall first. Each turn your income adds stone, troops and magic.</p>
      <div className="flex flex-wrap gap-3 mt-3"><Side s={d.you} title="You" /><Side s={d.foe} title="Your rival" /></div>
      <div className="text-sm text-parchment mt-2 min-h-[2.5rem]">{d.last.map((l, i) => <div key={i}>{l}</div>)}</div>
      {!d.winner && (
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 mt-2">
          {d.you.hand.map((id, i) => {
            const c = DUEL_CARD[id]; const ok = discard || canPlay(d.you, id); const art = artUrl(id);
            return (
              <button key={i} className={`relative aspect-[240/340] text-left ${ok ? 'hover:-translate-y-1 transition-transform' : 'opacity-50'}`} disabled={!ok} title={c.flavour}
                onClick={() => { if (play(i, discard)) played(); }}>
                {art && <img src={art} alt="" className="absolute" style={{ left: '5%', top: '12.94%', width: '90%', height: '51.76%' }} />}
                <img src={frame} alt="" className="absolute inset-0 w-full h-full" />
                <span className="absolute left-[16%] right-[6%] top-[4.5%] text-[0.69rem] text-bone leading-tight truncate text-center">{c.name}</span>
                <span className={`absolute right-[8%] top-[4%] flex items-center gap-0.5 text-[0.69rem] ${RES_STYLE[c.res].cls}`}><img src={RES_STYLE[c.res].icon} alt={RES_NAME[c.res]} className="w-3.5 h-3.5" />{c.cost}</span>
                <span className="absolute left-[9%] right-[9%] top-[67%] text-[0.69rem] ink leading-tight text-center">{c.text}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** The duel on its own, from the title screen: no stakes, a fresh deal each time. */
export function PracticeDuel() {
  const setScreen = useGame(s => s.setScreen);
  const [round, setRound] = useState(0);
  const rng = useRef<Rng | null>(null);
  const [d, setD] = useState<DuelState>(() => { rng.current = new Rng(hashSeed(`practice-${Math.random()}`)); return newDuel(rng.current); });
  const play: Play = (card, discard) => {
    const next = structuredClone(d); // like the engine: never change the shown state in place
    if (duelTurn(next, rng.current!, card, discard)) return null;
    setD(next); return next;
  };
  const again = () => { rng.current = new Rng(hashSeed(`practice-${Math.random()}`)); setD(newDuel(rng.current)); setRound(r => r + 1); };
  return (
    <div className="max-w-none px-4 py-2">
      <DuelScreen key={round} d={d} play={play} leave={again} kicker="A practice hearing" leaveLabel="Play again"
        extra={<button className="btn btn-ghost" onClick={() => setScreen('title')}>Back to the title</button>} />
    </div>
  );
}
