import { useEffect, useRef, useState } from 'react';
import { nextSteps, type Hint } from './hints';
import { planRoute } from './route';
import { AnimatePresence, motion } from 'framer-motion';
import { C } from '../data';
import { capacity, cargoWeight, formatDate, netWorth, depositsTotal, pressure, heatLevel, type GameState } from '../engine';
import { useGame, type Tab } from '../store/game';
import { exportFile, savedWhen, slotInfo, type Slot } from '../save/storage';
import { CodexLink, DateWidget, Delta, Meter, RollingMoney, StatusPill } from './widgets';
import { TimeRibbon } from './TimeRibbon';
import { Market } from './Market';
import { Bank } from './Bank';
import { Tavern } from './Tavern';
import { Outfitter } from './Outfitter';
import { MapView } from './MapView';
import { Ledger } from './Ledger';

const SLIDE = {
  enter: (d: number) => ({ opacity: 0, x: 16 * d }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: -12 * d }),
};

const TABS: { id: Tab; label: string; key: string }[] = [
  { id: 'market', label: 'Market', key: 'm' }, { id: 'map', label: 'Travel', key: 't' }, { id: 'bank', label: 'Bank', key: 'b' },
  { id: 'tavern', label: 'Tavern', key: 'v' }, { id: 'outfitter', label: 'Shop & Temple', key: 's' }, { id: 'ledger', label: 'Journal', key: 'j' },
];

/** The save slots: what each holds and when it was saved; a slot holding another game asks before it is overwritten. */
function SaveSlots({ g }: { g: GameState }) {
  const saveTo = useGame(s => s.saveTo);
  const [saved, setSaved] = useState<Slot | null>(null);
  const [ask, setAsk] = useState<Slot | null>(null);
  return <>
    {(['1', '2', '3'] as Slot[]).map(sl => {
      const i = slotInfo(sl); const other = !!i && (i.seed !== g.seed || i.name !== g.player.name);
      const done = saved === sl, asking = ask === sl;
      return (
        <button key={sl} className={`btn btn-ghost flex-col items-start gap-0 text-left ${done ? 'border-moss' : asking ? 'border-danger' : ''}`}
          onClick={() => { if (other && !asking) { setAsk(sl); return; } if (saveTo(sl)) { setSaved(sl); setAsk(null); } }}>
          <span className={done ? 'text-moss' : asking ? 'text-danger' : ''}>{done ? `✓ Saved in slot ${sl}` : asking ? `Overwrite ${i!.name}'s save? Click again` : `Save to slot ${sl}`}</span>
          <span className="text-xs text-ash-400 font-body normal-case tracking-normal">{i ? <>{i.name} · {C.locs[i.location]?.name ?? 'on the road'} · {formatDate(i.day, false)}<br />saved {savedWhen(i.savedAt)} · {other ? <span className="text-gold">another game</span> : 'this game'}</> : 'Empty'}</span>
        </button>
      );
    })}
  </>;
}

function TopBar({ g }: { g: GameState }) {
  const { openCodex, openSettings, setScreen } = useGame();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // The ☰ menu closes on Escape, on a click or tap outside it, and when focus leaves it.
  useEffect(() => {
    if (!menu) return;
    const out = (e: Event) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenu(false); menuRef.current?.querySelector('button')?.focus(); } };
    document.addEventListener('pointerdown', out); document.addEventListener('focusin', out); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', out); document.removeEventListener('focusin', out); document.removeEventListener('keydown', key); };
  }, [menu]);
  const pr = pressure(g);
  return (
    <header className="panel sticky top-0 z-30 flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2">
      <div className="h-display text-ember text-lg mr-2 hidden md:block">THE SCATHING CHARTER</div>
      <DateWidget g={g} />
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm ml-auto items-center">
        <span title="Cash on hand" id="cash-counter">Cash <RollingMoney v={g.player.cash} className="text-bone" /><Delta value={g.player.cash} /></span>
        <span title={`Your debt to the Camonna Tong${g.note.cleared ? '' : ` (interest about ${Math.round(g.note.balance * g.note.rate)} a day)`}`}><CodexLink id="topic:the-note">Debt</CodexLink> {g.note.cleared ? <span className="text-moss">cleared</span> : <><span id="debt-counter"><RollingMoney v={g.note.balance} className={pr >= 2 ? 'text-danger' : 'text-ember'} /></span><Delta value={g.note.balance} upIsGood={false} /></>}{pr > 0 && !g.note.cleared && <span className="text-danger ml-1" title="The Camonna Tong is losing patience">{'⚠'.repeat(pr)}</span>}</span>
        <span title="All deposits in banks (frozen ones at their expected payout)">Bank <RollingMoney v={depositsTotal(g)} /></span>
        <span title="Cargo weight / capacity">Cargo <span className="num">{cargoWeight(g)}/{capacity(g)}</span></span>
        <span className="flex items-center gap-1" title="Health">♥ <Meter v={g.player.health} color={g.player.health < 35 ? 'var(--c-bad)' : 'var(--c-good)'} /></span>
        {g.player.heat > 0 && <span title={`Legion attention from smuggling: ${g.player.heat}/100. Watched (30+): searched more often. Wanted (60+): patrols on the roads and double fines. Falls by 1 a day; bribing customs lowers it.`}>Heat <span className={`num ${heatLevel(g.player.heat) === 'wanted' ? 'text-danger' : heatLevel(g.player.heat) === 'watched' ? 'text-gold' : ''}`}>{g.player.heat}</span><Delta value={g.player.heat} upIsGood={false} />{heatLevel(g.player.heat) !== 'quiet' && <span className={heatLevel(g.player.heat) === 'wanted' ? 'text-danger' : 'text-gold'}> ({heatLevel(g.player.heat) === 'wanted' ? 'wanted' : 'watched'})</span>}</span>}
        <span title="Cash + bank deposits + cargo value − debt">Net worth <RollingMoney v={netWorth(g)} className="text-gold" /></span>
        <button className="btn" onClick={() => openCodex(null)} title="Codex (c)">Codex</button>
        <button className="btn btn-ghost" onClick={openSettings} aria-label="Settings" title="Settings: sound, theme, font, text size"><span aria-hidden="true">⚙</span><span className="hidden xl:inline">Settings</span></button>
        <div className="relative" ref={menuRef}>
          <button className="btn btn-ghost" onClick={() => setMenu(m => !m)} aria-expanded={menu} aria-haspopup="menu" title="Save, export, quit">☰</button>
          {menu && (
            <div className="absolute right-0 top-9 panel-solid p-2 flex flex-col gap-1 w-72 z-50">
              <SaveSlots g={g} />
              <button className="btn btn-ghost" onClick={() => exportFile(g)}>Export save file</button>
              <button className="btn btn-ghost" onClick={() => setScreen('title')}>Quit to title</button>
            </div>
          )}
        </div>
      </div>
      <TimeRibbon g={g} />
    </header>
  );
}

const ABOUT_KEY = 'ashfall-ledger/ui/about-open';
function readAbout(): boolean { try { return localStorage.getItem(ABOUT_KEY) !== '0'; } catch { return true; } }

function NextSteps({ g }: { g: GameState }) {
  const setTab = useGame(s => s.setTab);
  const plan = useGame(s => s.plan);
  const loc = g.player.location;
  let planHint: Hint | null = null;
  if (plan && plan !== loc && loc !== 'road' && !g.pending) {
    const p = planRoute(g, plan);
    planHint = p ? { text: `Route plan to ${C.locs[plan].name}: next stop ${C.locs[p.path[1]].name} (${p.days * g.timeScale} days in all).`, tab: 'map' } : { warn: true, text: `Your route plan to ${C.locs[plan].name} is blocked right now.`, tab: 'map' };
  }
  const hints = [...(planHint ? [planHint] : []), ...nextSteps(g)].slice(0, 2);
  if (!hints.length) return null;
  return (
    <div className="panel px-4 py-2 flex flex-col gap-1 text-sm" aria-label="Next steps">
      {hints.map((h, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className={h.warn ? 'text-danger' : 'text-gold'} aria-hidden="true">{h.warn ? '⚠' : '→'}</span>
          <span className={h.warn ? 'text-bone' : 'text-parchment'}>{h.text}</span>
          {h.tab && <button className="btn btn-ghost ml-auto py-0.5" onClick={() => setTab(h.tab!)}>{TABS.find(t => t.id === h.tab)?.label}</button>}
        </div>
      ))}
    </div>
  );
}

function LocationPanel({ g }: { g: GameState }) {
  const [about, setAbout] = useState(readAbout);
  const L = C.locs[g.player.location];
  if (!L) return null;
  const news = g.world.news.filter(n => n.loc === L.id && g.day - n.day < 12).slice(-3).reverse();
  const elsewhere = g.world.news.filter(n => n.loc !== L.id && g.day - n.day < 4).slice(-2).reverse();
  return (
    <aside className="panel p-4 flex flex-col gap-3">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          {/* arriving somewhere: the name comes into focus */}
          <motion.h2 key={L.id} className="h-display text-2xl text-bone" initial={{ opacity: 0, y: 6, filter: 'blur(5px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}><CodexLink id={`loc:${L.id}`}>{L.name}</CodexLink></motion.h2>
          <StatusPill status={g.world.status[L.id]} />
        </div>
        <div className="text-sm text-gold">{g.world.faction[L.id]}</div>
      </div>
      <div className="text-sm"><span className="h-display text-xs uppercase text-ash-400">Laws: </span>{L.laws}<div className="text-ash-400">Sales tax {Math.round(L.duty * 100)}% · Guards <span aria-label={`${L.enforcement} of 5`}>{'●'.repeat(L.enforcement)}{'○'.repeat(5 - L.enforcement)}</span></div></div>
      <details open={about} onToggle={e => { const o = (e.currentTarget as HTMLDetailsElement).open; setAbout(o); try { localStorage.setItem(ABOUT_KEY, o ? '1' : '0'); } catch { /* storage blocked */ } }}>
        <summary className="cursor-pointer h-display text-xs uppercase text-ash-400 hover:text-parchment">About {L.name} and its merchants</summary>
        <p className="text-[.95rem] text-parchment mt-2">{L.blurb}</p>
        <div className="h-display text-xs uppercase text-ash-400 mt-2 mb-1">Merchants</div>
        <ul className="space-y-1.5">{L.merchants.map(m => (
          <li key={m.name} className="text-sm"><span className="text-bone">{m.name}</span> <span className="text-ash-400">({m.race}, {m.trade}{m.fence && !m.trade.includes('fence') ? ', fence' : ''}{m.eec ? ', East Empire Company' : ''})</span><div className="fell italic text-parchment text-[.9rem]">{m.line}</div></li>
        ))}</ul>
        <div className="text-xs text-ash-400 mt-2">Tavern: {L.tavern}.</div>
      </details>
      {(news.length > 0 || elsewhere.length > 0) && (
        <div>
          <div className="h-display text-xs uppercase text-ash-400 mb-1">Market news</div>
          {[...news, ...elsewhere].map((n, i) => <div key={i} className={`text-sm ${n.up ? 'text-moss' : 'text-danger'}`}>{n.up ? '▲' : '▼'} {n.text}</div>)}
        </div>
      )}
    </aside>
  );
}

export function GameScreen() {
  const g = useGame(s => s.game)!;
  const { tab, setTab } = useGame();
  // content slides in from the side of the tab you moved toward
  const order = TABS.findIndex(t => t.id === tab); const prevOrder = useRef(order);
  const dir = order >= prevOrder.current ? 1 : -1;
  useEffect(() => { prevOrder.current = order; }, [order]);
  const hints = useGame(s => s.meta.settings.hints);
  // the Travel tab puts its destination list where the town panel sits, so the map lines up with the price list
  const [side, setSide] = useState<HTMLDivElement | null>(null);
  return (
    <div className="relative z-10 p-2 sm:p-3 flex flex-col gap-3 max-w-[1500px] mx-auto"
      onKeyDown={e => { if ((e.target as HTMLElement).tagName === 'INPUT') return; const t = TABS.find(x => x.key === e.key); if (t) setTab(t.id); if (e.key === 'c') useGame.getState().openCodex(null); }} tabIndex={-1}>
      <TopBar g={g} />
      {hints && <NextSteps g={g} />}
      <div className="grid gap-3 items-start lg:grid-cols-[minmax(300px,380px)_1fr]">
        {tab === 'map' && g.player.location !== 'road' ? <div ref={setSide} className="order-2 lg:order-none min-w-0" /> : <LocationPanel g={g} />}
        <main className="flex flex-col gap-3 min-w-0">
          <nav className="panel flex flex-wrap px-2" role="tablist">
            {TABS.map(t => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} className="tab relative" onClick={() => setTab(t.id)} title={`Shortcut: ${t.key}`}>
                {t.label}
                {tab === t.id && <motion.span layoutId="tab-underline" className="absolute left-2 right-2 -bottom-px h-[2px] rounded-full bg-ember" transition={{ type: 'spring', stiffness: 520, damping: 40 }} />}
              </button>
            ))}
          </nav>
          {g.player.location === 'road' ? (
            <div className="panel p-6 fell text-lg text-parchment">On the road{g.pending ? ` to ${C.locs[g.pending.dest]?.name ?? '…'}` : ''}. Something blocks the way: make your choice to continue.</div>
          ) : <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={tab} custom={dir} variants={SLIDE} initial="enter" animate="center" exit="exit" transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}>
              {tab === 'market' && <Market g={g} />}
              {tab === 'map' && <MapView g={g} side={side} />}
              {tab === 'bank' && <Bank g={g} />}
              {tab === 'tavern' && <Tavern g={g} />}
              {tab === 'outfitter' && <Outfitter g={g} />}
              {tab === 'ledger' && <Ledger g={g} />}
            </motion.div>
          </AnimatePresence>}
        </main>
      </div>
    </div>
  );
}
