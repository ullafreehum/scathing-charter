import { useState } from 'react';
import { nextSteps, type Hint } from './hints';
import { planRoute } from './route';
import { AnimatePresence, motion } from 'framer-motion';
import { C } from '../data';
import { capacity, cargoWeight, netWorth, depositsTotal, pressure, type GameState } from '../engine';
import { useGame, type Tab } from '../store/game';
import { exportFile, type Slot } from '../save/storage';
import { CodexLink, DateWidget, Meter, Money, StatusPill } from './widgets';
import { Market } from './Market';
import { Bank } from './Bank';
import { Tavern } from './Tavern';
import { Outfitter } from './Outfitter';
import { MapView } from './MapView';
import { Ledger } from './Ledger';

const TABS: { id: Tab; label: string; key: string }[] = [
  { id: 'market', label: 'Market', key: 'm' }, { id: 'map', label: 'Travel', key: 't' }, { id: 'bank', label: 'Bank', key: 'b' },
  { id: 'tavern', label: 'Tavern', key: 'v' }, { id: 'outfitter', label: 'Shop & Temple', key: 's' }, { id: 'ledger', label: 'Journal', key: 'j' },
];

function TopBar({ g }: { g: GameState }) {
  const { openCodex, openSettings, saveTo, setScreen } = useGame();
  const [menu, setMenu] = useState(false);
  const pr = pressure(g);
  return (
    <header className="panel relative z-20 flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2">
      <div className="h-display text-ember text-lg mr-2 hidden md:block">ASHFALL LEDGER</div>
      <DateWidget g={g} />
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm ml-auto items-center">
        <span title="Cash on hand">Cash <Money v={g.player.cash} className="text-bone" /></span>
        <span title={`Your debt to the Camonna Tong${g.note.cleared ? '' : ` (interest about ${Math.round(g.note.balance * g.note.rate)} a day)`}`}><CodexLink id="topic:the-note">Debt</CodexLink> {g.note.cleared ? <span className="text-moss">cleared</span> : <Money v={g.note.balance} className={pr >= 2 ? 'text-danger' : 'text-ember'} />}{pr > 0 && !g.note.cleared && <span className="text-danger ml-1" title="The Camonna Tong is losing patience">{'⚠'.repeat(pr)}</span>}</span>
        <span title="All deposits in banks (frozen ones at their expected payout)">Bank <Money v={depositsTotal(g)} /></span>
        <span title="Cargo weight / capacity">Cargo <span className="num">{cargoWeight(g)}/{capacity(g)}</span></span>
        <span className="flex items-center gap-1" title="Health">♥ <Meter v={g.player.health} color={g.player.health < 35 ? 'var(--c-bad)' : 'var(--c-good)'} /></span>
        <span title="Cash + bank deposits + cargo value − debt">Net worth <Money v={netWorth(g)} className="text-gold" /></span>
        <button className="btn" onClick={() => openCodex(null)} title="Codex (c)">Codex</button>
        <button className="btn btn-ghost" onClick={openSettings} aria-label="Settings" title="Settings: sound, theme, font, text size"><span aria-hidden="true">⚙</span><span className="hidden xl:inline">Settings</span></button>
        <div className="relative">
          <button className="btn btn-ghost" onClick={() => setMenu(m => !m)} aria-expanded={menu}>☰</button>
          {menu && (
            <div className="absolute right-0 top-9 panel p-2 flex flex-col gap-1 w-48 z-50" onMouseLeave={() => setMenu(false)}>
              {(['1', '2', '3'] as Slot[]).map(sl => <button key={sl} className="btn btn-ghost" onClick={() => { saveTo(sl); setMenu(false); }}>Save to slot {sl}</button>)}
              <button className="btn btn-ghost" onClick={() => exportFile(g)}>Export save file</button>
              <button className="btn btn-ghost" onClick={() => setScreen('title')}>Quit to title</button>
            </div>
          )}
        </div>
      </div>
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
          <h2 className="h-display text-2xl text-bone"><CodexLink id={`loc:${L.id}`}>{L.name}</CodexLink></h2>
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
  const hints = useGame(s => s.meta.settings.hints);
  return (
    <div className="relative z-10 p-2 sm:p-3 flex flex-col gap-3 max-w-[1500px] mx-auto"
      onKeyDown={e => { if ((e.target as HTMLElement).tagName === 'INPUT') return; const t = TABS.find(x => x.key === e.key); if (t) setTab(t.id); if (e.key === 'c') useGame.getState().openCodex(null); }} tabIndex={-1}>
      <TopBar g={g} />
      {hints && <NextSteps g={g} />}
      <div className={`grid gap-3 items-start ${tab === 'map' ? '' : 'lg:grid-cols-[minmax(300px,380px)_1fr]'}`}>
        {tab !== 'map' && <LocationPanel g={g} />}
        <main className="flex flex-col gap-3 min-w-0">
          <nav className="panel flex flex-wrap px-2" role="tablist">
            {TABS.map(t => <button key={t.id} role="tab" aria-selected={tab === t.id} className="tab" onClick={() => setTab(t.id)} title={`Shortcut: ${t.key}`}>{t.label}</button>)}
          </nav>
          {g.player.location === 'road' ? (
            <div className="panel p-6 fell text-lg text-parchment">On the road{g.pending ? ` to ${C.locs[g.pending.dest]?.name ?? '…'}` : ''}. Something blocks the way: make your choice to continue.</div>
          ) : <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
              {tab === 'market' && <Market g={g} />}
              {tab === 'map' && <MapView g={g} />}
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
