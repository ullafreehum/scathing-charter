import { AnimatePresence, motion } from 'framer-motion';
import { C } from '../data';
import { choiceOdds, conductTitles, depositsTotal, cargoValue, formatDate, netWorth, power, wealthTitle, type GameState } from '../engine';
import { useGame } from '../store/game';
import { exportFile } from '../save/storage';
import { CodexLink, Money, Sources } from './widgets';
import { FortuneChart } from './FortuneChart';
import { DuelScreen } from './Duel';

const CHOICE: Record<string, { label: string; hint: (g: GameState) => string }> = {
  fight: { label: 'Fight', hint: g => `Your strength ${power(g).toFixed(1)} against their ${g.pending!.threat}.` },
  flee: { label: 'Flee', hint: () => 'Easier with a light load.' },
  bribe: { label: 'Pay', hint: g => `${g.pending!.bribe} septims.${g.pending!.customs ? ' Lowers your heat if it works.' : ''}` },
  surrender: { label: 'Hand over cargo', hint: () => 'Lose goods, keep your skin.' },
  submit: { label: 'Submit to the search', hint: g => `Contraband is confiscated and fined (${g.player.heat >= 60 ? '40%, you are wanted' : '20%'}). Your heat drops.` },
  chameleon: { label: 'Use a Chameleon scroll', hint: g => `Slip by unseen (${g.pending?.customs ? '3 in 4' : '9 in 10'}). You have ${g.player.scrolls.chameleon}.` },
  almsivi: { label: 'Almsivi Intervention', hint: g => `Teleport to the nearest Tribunal temple, if the spell still works (${g.world.flags.almsivi ?? 95}% chance). You keep only 20 stone of cargo.` },
  divine: { label: 'Divine Intervention', hint: () => 'Teleport to the nearest Imperial shrine. You keep only 20 stone of cargo.' },
  give: { label: 'Give food and potions', hint: () => 'A good deed. The Temple and House Redoran will think better of you.' },
  'sell-dear': { label: 'Sell to them at a high price', hint: () => 'Three times the usual price. They will pay, but people will remember.' },
  pass: { label: 'Pass by', hint: () => '' },
  'press-on': { label: 'Press on', hint: () => 'Risk the cargo, save time.' },
  'wait-out': { label: 'Wait it out', hint: () => 'Lose days, keep the cargo.' },
  deal: { label: 'Deal', hint: () => 'Take what is offered.' },
  decline: { label: 'Decline', hint: () => '' },
};

function Card({ children, wide = false, parchment = false, label }: { children: React.ReactNode; wide?: boolean; parchment?: boolean; label?: string }) {
  return (
    <motion.div className="fixed inset-0 z-40 scrim flex items-center justify-center p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <motion.div role="dialog" aria-modal="true" aria-label={label} className={`${parchment ? 'parchment' : 'panel-solid'} ${wide ? 'max-w-3xl' : 'max-w-xl'} w-full p-5 max-h-[90vh] overflow-auto scroll-thin`} initial={{ y: 24, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 14, opacity: 0 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
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
  if (g.duel) node = <Card key="duel" wide label="Magistrate’s hearing"><DuelScreen d={g.duel} /></Card>;
  else if (g.pending) {
    const p = g.pending;
    node = (
      <Card key="enc" label={p.title}>
        <div className="text-xs h-display uppercase text-ember">{p.customs ? 'At the gate' : p.kind === 'mercy' ? 'On the road: a choice' : p.kind === 'hazard' ? 'On the road: the elements' : p.kind === 'opportunity' ? 'On the road: an offer' : 'On the road: trouble'}</div>
        <h2 className="h-display text-2xl text-bone mb-2">{p.title}</h2>
        <p className="fell text-lg text-parchment mb-4">{p.text}</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {p.choices.map(c => (
            <button key={c} className={`btn justify-start text-left py-2 ${c === 'fight' || c === 'give' ? 'btn-ember' : ''}`} disabled={c === 'bribe' && g.player.cash < p.bribe} onClick={() => act({ t: 'choose', choice: c })}>
              <span className="flex flex-col items-start normal-case tracking-normal font-body"><span className="h-display uppercase tracking-wider text-[.8rem]">{CHOICE[c]?.label ?? c}</span><span className="hint text-xs font-body">{choiceOdds(g, c) !== undefined && c !== 'bribe' || (c === 'bribe' && p.customs) ? <b>{Math.round(choiceOdds(g, c)! * 100)}% chance. </b> : null}{CHOICE[c]?.hint(g)}</span></span>
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
        <div className="fell italic text-[#6b4a2b]">{formatDate(ev.day)}</div>
        <h2 className="h-display text-3xl text-[#3a1a0c] mb-1">{ev.title}</h2>
        <div className="mb-3" />
        <p className="text-lg leading-relaxed text-[#2a1d14] first-letter:text-5xl first-letter:font-display first-letter:float-left first-letter:mr-2 first-letter:text-[#7a2a10]">{ev.text}</p>
        {ev.dateNote && <p className="text-sm italic text-[#6b4a2b] mt-3">About the date: {ev.dateNote}</p>}
        {ev.disputes && <p className="text-sm mt-2">Historians disagree: {ev.disputes.map(d => <CodexLink key={d} id={`dispute:${d}`} className="mr-2 text-[#5a2d7a]">{d}</CodexLink>)}</p>}
        <div className="[&_*]:!text-[#6b4a2b]"><Sources list={ev.sources} /></div>
        <button className="btn btn-ember mt-4" autoFocus onClick={() => act({ t: 'ack' })}>Continue</button>
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
        <button className="btn btn-ember mt-4" autoFocus onClick={() => act({ t: 'ack', n: items.length })}>Continue</button>
      </Card>
    );
  } else if (item) {
    // A stray achievement (old save): acknowledge it from a small card.
    const a = C.achievements.find(x => x.id === item.id);
    node = (
      <Card key={`ach-${item.id}`}>
        <div className="text-center"><div className="text-4xl text-gold">★</div><h2 className="h-display text-xl text-gold">{a?.name}</h2><p className="text-parchment">{a?.text}</p>
          <button className="btn mt-4" autoFocus onClick={() => act({ t: 'ack' })}>Continue</button></div>
      </Card>
    );
  } else if (g.over) node = <EndScreen key="end" g={g} />;
  return <AnimatePresence mode="wait">{node}</AnimatePresence>;
}

/** A short epilogue from how the game was played. */
function verdict(g: GameState): string {
  const nw = g.ending?.worth ?? netWorth(g);
  const lines: string[] = [];
  if (g.indentured) lines.push('You die in the Tong’s service, still paying.');
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
  const canChronicle = g.over?.reason === 'calendar' && g.mode === 'red-year' && (meta.chronicleUnlocked || nw > 0);
  const history = g.log.filter(l => l.tone === 'history');
  const crossroads = g.over?.reason === 'calendar' && !g.ending;
  return (
    <Card wide>
      <div className="text-xs h-display uppercase text-ember">{g.over?.reason === 'death' ? 'You died' : g.over?.reason === 'retired' ? 'You retired' : g.mode === 'long-chronicle' ? 'Long Chronicle complete' : 'Campaign complete: the Red Year is over'}</div>
      <h2 className="h-display text-3xl text-bone">{g.player.name}, {wealthTitle(nw)}</h2>
      <p className="text-parchment">{formatDate(g.day)}{g.over?.reason === 'death' ? '. Your journey ended on the road.' : '.'}</p>
      {g.ending && <p className="text-parchment mt-1">{verdict(g)}</p>}
      {crossroads && <div className="panel p-3 mt-3 text-sm">
        <div className="h-display text-xs uppercase text-gold mb-1">The crossroads: what now?</div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ember" onClick={() => act({ t: 'crossroads', choice: 'retire' })} title="End here and read your epilogue">Retire</button>
          <button className="btn" onClick={() => act({ t: 'crossroads', choice: 'trade' })} title="Keep playing with no end date; your score is recorded now">Keep trading</button>
          <button className="btn" disabled={g.charter.tier < 2} onClick={() => act({ t: 'crossroads', choice: 'charter' })} title="Needs charter tier 2 or more: play on as a Charter-Holder">Take a Charter seat</button>
          <button className="btn" onClick={() => act({ t: 'crossroads', choice: 'tong' })} title="Your debt is wiped; you play on as a Tong smuggler, watched by the Legion">Take the Tong’s mark</button>
        </div>
      </div>}
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
