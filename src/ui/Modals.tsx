import { AnimatePresence, motion } from 'framer-motion';
import { C } from '../data';
import { conductTitles, depositsTotal, cargoValue, formatDate, netWorth, power, wealthTitle, type GameState } from '../engine';
import { useGame } from '../store/game';
import { exportFile } from '../save/storage';
import { Badge, CodexLink, Money, Sources } from './widgets';

const CHOICE: Record<string, { label: string; hint: (g: GameState) => string }> = {
  fight: { label: 'Fight', hint: g => `Your strength ${power(g).toFixed(1)} against their ${g.pending!.threat}.` },
  flee: { label: 'Flee', hint: () => 'Easier with a light load.' },
  bribe: { label: 'Pay', hint: g => `${g.pending!.bribe} septims.` },
  surrender: { label: 'Hand over cargo', hint: () => 'Lose goods, keep your skin.' },
  submit: { label: 'Submit to the search', hint: () => 'Contraband is confiscated and fined.' },
  chameleon: { label: 'Read Chameleon', hint: g => `Slip by unseen (${g.pending?.customs ? '3 in 4' : '9 in 10'}). You have ${g.player.scrolls.chameleon}.` },
  almsivi: { label: 'Almsivi Intervention', hint: g => `To the nearest Tribunal temple, if the spell still answers (${g.world.flags.almsivi ?? 95}%, extrapolation). Keep only 20 stone.` },
  divine: { label: 'Divine Intervention', hint: () => 'To the nearest Imperial shrine. Keep only 20 stone.' },
  give: { label: 'Give food and draughts', hint: () => 'Mercy, and the Temple’s and Redoran’s regard.' },
  'sell-dear': { label: 'Sell to them, dear', hint: () => 'Three times the going rate. They will pay. Nobody will thank you.' },
  pass: { label: 'Pass by', hint: () => '' },
  'press-on': { label: 'Press on', hint: () => 'Risk the cargo, save the days.' },
  'wait-out': { label: 'Wait it out', hint: () => 'Lose days, keep the cargo.' },
  deal: { label: 'Deal', hint: () => 'Take what is offered.' },
  decline: { label: 'Decline', hint: () => '' },
};

function Card({ children, wide = false, parchment = false }: { children: React.ReactNode; wide?: boolean; parchment?: boolean }) {
  return (
    <motion.div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
      <motion.div role="dialog" aria-modal="true" className={`${parchment ? 'parchment' : 'panel-solid'} ${wide ? 'max-w-3xl' : 'max-w-xl'} w-full p-5 max-h-[90vh] overflow-auto scroll-thin`} initial={{ y: 30, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, opacity: 0 }}>
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
  if (g.pending) {
    const p = g.pending;
    node = (
      <Card key="enc">
        <div className="text-xs h-display uppercase text-ember">{p.customs ? 'At the gate' : p.kind === 'mercy' ? 'On the road: a choice' : p.kind === 'hazard' ? 'On the road: the elements' : p.kind === 'opportunity' ? 'On the road: an offer' : 'On the road: trouble'}</div>
        <h2 className="h-display text-2xl text-bone mb-2">{p.title} <Badge canon={C.encounters.find(e => e.id === p.defId)?.canon ?? 'canon'} /></h2>
        <p className="fell text-lg text-parchment mb-4">{p.text}</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {p.choices.map(c => (
            <button key={c} className={`btn justify-start text-left py-2 ${c === 'fight' || c === 'give' ? 'btn-ember' : ''}`} disabled={c === 'bribe' && g.player.cash < p.bribe} onClick={() => act({ t: 'choose', choice: c })}>
              <span className="flex flex-col items-start normal-case tracking-normal font-body"><span className="h-display uppercase tracking-wider text-[.8rem]">{CHOICE[c]?.label ?? c}</span><span className="text-xs text-ash-400 font-body">{CHOICE[c]?.hint(g)}</span></span>
            </button>
          ))}
        </div>
        <div className="text-xs text-ash-400 mt-3"><CodexLink id={`encounter:${p.defId}`}>Codex entry</CodexLink></div>
      </Card>
    );
  } else if (item?.kind === 'chronicle') {
    const ev = C.history.find(h => h.id === item.eventId)!;
    node = (
      <Card key={`chr-${ev.id}`} wide parchment>
        <div className="fell italic text-[#6b4a2b]">{formatDate(ev.day)}</div>
        <h2 className="h-display text-3xl text-[#3a1a0c] mb-1">{ev.title}</h2>
        <div className="mb-3"><Badge canon={ev.canon} /></div>
        <p className="text-lg leading-relaxed text-[#2a1d14] first-letter:text-5xl first-letter:font-display first-letter:float-left first-letter:mr-2 first-letter:text-[#7a2a10]">{ev.text}</p>
        {ev.dateNote && <p className="text-sm italic text-[#6b4a2b] mt-3">Dating: {ev.dateNote}</p>}
        {ev.disputes && <p className="text-sm mt-2">Historians disagree: {ev.disputes.map(d => <CodexLink key={d} id={`dispute:${d}`} className="mr-2 text-[#5a2d7a]">{d}</CodexLink>)}</p>}
        <div className="[&_*]:!text-[#6b4a2b]"><Sources list={ev.sources} /></div>
        <button className="btn btn-ember mt-4" autoFocus onClick={() => act({ t: 'ack' })}>Continue</button>
      </Card>
    );
  } else if (item?.kind === 'achievement') {
    const a = C.achievements.find(x => x.id === item.id);
    node = (
      <Card key={`ach-${item.id}`}>
        <div className="text-center"><div className="text-4xl text-gold">★</div><h2 className="h-display text-xl text-gold">{a?.name}</h2><p className="text-parchment">{a?.text}</p>
          <button className="btn mt-4" autoFocus onClick={() => act({ t: 'ack' })}>Onward</button></div>
      </Card>
    );
  } else if (item) {
    node = (
      <Card key={`res-${g.inbox.length}-${g.actions.length}`}>
        <h2 className="h-display text-xl text-bone mb-2">{item.kind === 'result' || item.kind === 'news' ? item.title : ''}</h2>
        <p className="fell text-lg text-parchment whitespace-pre-line">{item.kind === 'result' || item.kind === 'news' ? item.text : ''}</p>
        <button className="btn btn-ember mt-4" autoFocus onClick={() => act({ t: 'ack' })}>Continue</button>
      </Card>
    );
  } else if (g.over) node = <EndScreen key="end" g={g} />;
  return <AnimatePresence mode="wait">{node}</AnimatePresence>;
}

function EndScreen({ g }: { g: GameState }) {
  const { act, setScreen, meta } = useGame();
  const nw = netWorth(g);
  const canChronicle = g.over?.reason === 'calendar' && g.mode === 'red-year' && (meta.chronicleUnlocked || nw > 0);
  const history = g.log.filter(l => l.tone === 'history');
  return (
    <Card wide>
      <div className="text-xs h-display uppercase text-ember">{g.over?.reason === 'death' ? 'The ledger ends in blood' : g.mode === 'long-chronicle' ? 'The Stormcrown Interregnum is over' : 'The Red Year is past'}</div>
      <h2 className="h-display text-3xl text-bone">{g.player.name}, {wealthTitle(nw)}</h2>
      <p className="text-parchment">{formatDate(g.day)}{g.over?.reason === 'death' ? '. Your journey ended on the road.' : '.'}</p>
      {conductTitles(g).length > 0 && <p className="text-gold mt-1">{conductTitles(g).join(' · ')}</p>}
      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        <div className="panel p-3 text-sm space-y-0.5">
          <div>Purse <Money v={g.player.cash} /></div><div>Vaults <Money v={depositsTotal(g)} /></div><div>Cargo at fair value <Money v={cargoValue(g)} /></div>
          <div>Note <Money v={g.note.cleared ? 0 : -g.note.balance} /></div><div className="text-lg mt-1">Net worth <Money v={nw} className="text-gold" /></div>
          <div className="text-xs text-ash-400 mt-1">Seed <span className="num">{g.seed}</span> · {g.difficulty} terms · Mercy {g.player.mercy}</div>
        </div>
        <div className="panel p-3 text-sm max-h-48 overflow-auto scroll-thin">
          <div className="h-display text-xs uppercase text-ash-400 mb-1">You lived through</div>
          {history.map((h, i) => <div key={i} className="text-parchment/90">{h.text}</div>)}
        </div>
      </div>
      <div className="text-sm mt-3">Achievements: {g.achievements.map(a => C.achievements.find(x => x.id === a)?.name).join(', ') || 'none'}</div>
      <div className="flex flex-wrap gap-2 mt-4">
        {canChronicle && <button className="btn btn-ember" onClick={() => act({ t: 'chronicle' })}>Continue into the Long Chronicle →</button>}
        <button className="btn" onClick={() => setScreen('new')}>New ledger</button>
        <button className="btn btn-ghost" onClick={() => exportFile(g)}>Export save</button>
        <button className="btn btn-ghost" onClick={() => setScreen('title')}>Title</button>
      </div>
    </Card>
  );
}
