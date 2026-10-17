import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { C } from '../data';
import { cardOptions, conductTitles, depositsTotal, cargoValue, formatDate, netWorth, wealthTitle, type GameState } from '../engine';
import { useGame } from '../store/game';
import { exportFile } from '../save/storage';
import { CodexLink, Money, Sources } from './widgets';
import { FortuneChart } from './FortuneChart';
import { DuelScreen } from './Duel';

/** Continue, focused without scrolling, so a tall card opens at its top (its picture) rather than at the button. */
function ContinueButton({ className, onClick }: { className: string; onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  return <button ref={ref} className={className} onClick={onClick}>Continue</button>;
}

/** Event pictures: src/assets/events/<event-id>.jpg, shown 16:9 at the top of that event's chronicle card. */
const EVENT_ART = import.meta.glob<string>('../assets/events/*.jpg', { eager: true, query: '?url', import: 'default' });

function Card({ children, wide = false, board = false, parchment = false, label }: { children: React.ReactNode; wide?: boolean; board?: boolean; parchment?: boolean; label?: string }) {
  return (
    <motion.div className="fixed inset-0 z-40 scrim flex items-center justify-center p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <motion.div role="dialog" aria-modal="true" aria-label={label} className={`${parchment ? 'parchment' : 'panel-solid'} ${board ? 'max-w-6xl' : wide ? 'max-w-3xl' : 'max-w-xl'} w-full p-5 max-h-[90dvh] overflow-auto scroll-thin`} initial={{ y: 24, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 14, opacity: 0 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </motion.div>
    </motion.div>
  );
}

export function Overlays() {
  const g = useGame(s => s.game);
  const act = useGame(s => s.act);
  if (!g) return null;
  const item = g.inbox[0];
  let node: React.ReactNode = null;
  if (g.duel) node = <Card key="duel" board label="Magistrate’s hearing"><DuelScreen d={g.duel} /></Card>;
  else if (g.pending) {
    const p = g.pending;
    node = (
      <Card key="enc" label={p.title}>
        <div className="text-xs h-display uppercase text-ember">{p.customs ? 'At the gate' : p.kind === 'mercy' ? 'On the road: a choice' : p.kind === 'hazard' ? 'On the road: the elements' : p.kind === 'opportunity' ? 'On the road: an offer' : 'On the road: trouble'}</div>
        <h2 className="h-display text-2xl text-bone mb-2">{p.title}</h2>
        <p className="fell text-lg text-parchment mb-4">{p.text}</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {cardOptions(g).map(o => (
            <button key={o.id} className="btn justify-start text-left py-2" disabled={!!o.disabled} title={o.disabled} aria-label={`${o.label}${o.odds !== undefined ? `, ${Math.round(o.odds * 100)}% chance` : ''}. ${o.disabled ?? o.stake}`} onClick={() => act({ t: 'choose', choice: o.id })}>
              <span className="flex w-full items-start gap-2 normal-case tracking-normal font-body">
                <span className="flex flex-col items-start flex-1"><span className="h-display uppercase tracking-wider text-[.8rem]">{o.label}</span><span className="hint text-xs font-body">{o.disabled ?? o.stake}</span></span>
                {o.odds !== undefined && <b className="text-sm text-bone tabular-nums">{Math.round(o.odds * 100)}%</b>}
              </span>
            </button>
          ))}
        </div>
        <div className="text-xs text-ash-400 mt-3"><CodexLink id={`encounter:${p.defId}`}>Read more in the codex</CodexLink></div>
      </Card>
    );
  } else if (item?.kind === 'chronicle') {
    const ev = C.history.find(h => h.id === item.eventId)!;
    node = (
      <Card key={`chr-${ev.id}`} wide parchment>
        {EVENT_ART[`../assets/events/${ev.id}.jpg`] && <img src={EVENT_ART[`../assets/events/${ev.id}.jpg`]} alt="" className="w-full aspect-video max-h-[40dvh] object-cover object-[50%_40%] rounded mb-3" />}
        <div className="fell italic text-[#6b4a2b]">{formatDate(ev.day)}</div>
        <h2 className="h-display text-3xl text-[#3a1a0c] mb-1">{ev.title}</h2>
        <div className="mb-3" />
        <p className="text-lg leading-relaxed text-[#2a1d14] first-letter:text-5xl first-letter:font-display first-letter:float-left first-letter:mr-2 first-letter:text-[#7a2a10]">{ev.text}</p>
        {ev.dateNote && <p className="text-sm italic text-[#6b4a2b] mt-3">About the date: {ev.dateNote}</p>}
        {ev.disputes && <p className="text-sm mt-2">Historians disagree: {ev.disputes.map(d => <CodexLink key={d} id={`dispute:${d}`} className="mr-2 text-[#5a2d7a]">{d}</CodexLink>)}</p>}
        <div className="[&_*]:!text-[#6b4a2b]"><Sources list={ev.sources} /></div>
        <ContinueButton className="btn btn-ember mt-4" onClick={() => act({ t: 'ack' })} />
      </Card>
    );
  } else if (item && item.kind !== 'achievement') {
    // Consecutive results (e.g. everything that happened on one journey) share one card.
    let n = 0;
    while (n < g.inbox.length && (g.inbox[n].kind === 'result' || g.inbox[n].kind === 'news')) n++;
    const items = g.inbox.slice(0, Math.max(1, n)) as { title: string; text: string }[];
    node = (
      <Card key={`res-${g.inbox.length}-${g.actions.length}`}>
        {items.length > 1 && <div className="text-xs h-display uppercase text-ember mb-2">Meanwhile</div>}
        {items.map((it, i) => (
          <div key={i} className={i ? 'border-t border-ash-600 pt-3 mt-3' : ''}>
            <h2 className="h-display text-xl text-bone mb-2">{it.title}</h2>
            <p className="fell text-lg text-parchment whitespace-pre-line">{it.text}</p>
          </div>
        ))}
        <ContinueButton className="btn btn-ember mt-4" onClick={() => act({ t: 'ack', n: items.length })} />
      </Card>
    );
  } else if (item) {
    // A stray achievement (old save): acknowledge it from a small card.
    const a = C.achievements.find(x => x.id === item.id);
    node = (
      <Card key={`ach-${item.id}`}>
        <div className="text-center"><div className="text-4xl text-gold">★</div><h2 className="h-display text-xl text-gold">{a?.name}</h2><p className="text-parchment">{a?.text}</p>
          <ContinueButton className="btn mt-4" onClick={() => act({ t: 'ack' })} /></div>
      </Card>
    );
  } else if (g.over) node = <EndScreen key="end" g={g} />;
  return <AnimatePresence mode="wait">{node}</AnimatePresence>;
}

/** A short epilogue from how the game was played. */
function verdict(g: GameState): string {
  const nw = g.ending?.worth ?? netWorth(g);
  const lines: string[] = [];
  if (g.ending?.kind === 'mark') lines.push('You spend the rest of your life carrying the Tong’s skooma, one step ahead of the Legion.');
  else if (g.ending?.kind === 'win') lines.push('You sit on the Charter board as Vivec rises from the ash, owing no one.');
  else if (!g.note.cleared) lines.push('Drelloth’s men never stop looking for you.');
  else lines.push(nw > 50000 ? 'You buy a manor in Ebonheart’s new quarter and never carry a crate again.' : nw > 10000 ? 'You open a counting-room in Narsis and lend to younger traders.' : 'You settle in a quiet house by the sea, owing no one.');
  if (g.player.mercy >= 60) lines.push('Refugees name their children after you.');
  else if (g.player.profiteering > 20000) lines.push('In the camps they still spit at your name.');
  if (g.charter.tier >= 3) lines.push('Your share of the Charter pays out for decades.');
  return lines.join(' ');
}

function EndScreen({ g }: { g: GameState }) {
  const { act, setScreen, meta } = useGame();
  const nw = netWorth(g);
  const canChronicle = (g.over?.reason === 'calendar' || g.over?.reason === 'won') && g.mode === 'red-year' && (meta.chronicleUnlocked || nw > 0);
  const history = g.log.filter(l => l.tone === 'history');
  return (
    <Card wide>
      <div className="text-xs h-display uppercase text-ember">{g.over?.reason === 'death' ? 'You died' : g.over?.reason === 'won' ? 'You won: a seat on the Scathing Charter' : g.over?.reason === 'marked' ? 'The Tong’s mark: the game is over' : g.over?.reason === 'retired' ? 'You retired' : g.mode === 'long-chronicle' ? 'Long Chronicle complete' : 'Campaign complete: the Red Year is over'}</div>
      <h2 className="h-display text-3xl text-bone">{g.player.name}, {wealthTitle(nw)}</h2>
      <p className="text-parchment">{formatDate(g.day)}{g.over?.reason === 'death' ? '. Your journey ended on the road.' : '.'}</p>
      {g.ending && <p className="text-parchment mt-1">{verdict(g)}</p>}
      {conductTitles(g).length > 0 && <p className="text-gold mt-1">{conductTitles(g).join(' · ')}</p>}
      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        <div className="panel p-3 text-sm space-y-0.5">
          <div>Cash <Money v={g.player.cash} /></div><div>Bank <Money v={depositsTotal(g)} /></div><div>Cargo value <Money v={cargoValue(g)} /></div>
          <div>Debt <Money v={g.note.cleared ? 0 : -g.note.balance} /></div><div className="text-lg mt-1">Net worth <Money v={nw} className="text-gold" /></div>
          <div className="text-xs text-ash-400 mt-1">Seed <span className="num">{g.seed}</span> · {g.difficulty === 'fair' ? 'Easy' : g.difficulty === 'tong' ? 'Normal' : 'Hard'} · Mercy {g.player.mercy}</div>
        </div>
        <div className="panel p-3 text-sm max-h-48 overflow-auto scroll-thin">
          <div className="h-display text-xs uppercase text-ash-400 mb-1">History you lived through</div>
          {history.map((h, i) => <div key={i} className="text-parchment">{h.text}</div>)}
        </div>
      </div>
      <div className="panel p-3 mt-3"><div className="h-display text-xs uppercase text-ash-400 mb-1">Your fortune</div><FortuneChart g={g} height={140} /></div>
      <div className="text-sm mt-3">Achievements: {g.achievements.map(a => C.achievements.find(x => x.id === a)?.name).join(', ') || 'none'}</div>
      <div className="flex flex-wrap gap-2 mt-4">
        {canChronicle && <button className="btn btn-ember" onClick={() => act({ t: 'chronicle' })}>Continue into the Long Chronicle →</button>}
        <button className="btn" onClick={() => setScreen('new')}>New game</button>
        <button className="btn btn-ghost" onClick={() => exportFile(g)}>Export save</button>
        <button className="btn btn-ghost" onClick={() => setScreen('title')}>Title screen</button>
      </div>
    </Card>
  );
}
