import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { C } from '../data';
import { capacity, cargoWeight, netWorth, depositsTotal, pressure, type GameState } from '../engine';
import { useGame, type Tab } from '../store/game';
import { exportFile, type Slot } from '../save/storage';
import { Badge, CodexLink, DateWidget, Meter, Money, StatusPill } from './widgets';
import { Market } from './Market';
import { Bank } from './Bank';
import { Tavern } from './Tavern';
import { Outfitter } from './Outfitter';
import { MapView } from './MapView';
import { Ledger } from './Ledger';

const TABS: { id: Tab; label: string; key: string }[] = [
  { id: 'market', label: 'Market', key: 'm' }, { id: 'map', label: 'Travel', key: 't' }, { id: 'bank', label: 'Counting-house', key: 'b' },
  { id: 'tavern', label: 'Tavern', key: 'v' }, { id: 'outfitter', label: 'Outfitter & Temple', key: 'o' }, { id: 'ledger', label: 'Ledger', key: 'l' },
];

function TopBar({ g }: { g: GameState }) {
  const { openCodex, saveTo, setScreen } = useGame();
  const [menu, setMenu] = useState(false);
  const pr = pressure(g);
  return (
    <header className="panel relative z-20 flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2">
      <div className="h-display text-ember text-lg mr-2 hidden md:block">ASHFALL LEDGER</div>
      <DateWidget g={g} />
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm ml-auto items-center">
        <span title="Cash on hand">Purse <Money v={g.player.cash} className="text-bone" /></span>
        <span title="Your Camonna Tong note"><CodexLink id="topic:the-note">Note</CodexLink> {g.note.cleared ? <span className="text-moss">cleared</span> : <Money v={g.note.balance} className={pr >= 2 ? 'text-[#e2584a]' : 'text-ember'} />}{pr > 0 && !g.note.cleared && <span className="text-[#e2584a] ml-1" title="The Tong is losing patience">{'⚠'.repeat(pr)}</span>}</span>
        <span title="All deposits (frozen ones at expected settlement)">Vaults <Money v={depositsTotal(g)} /></span>
        <span title="Cargo weight / capacity (stone)">Load <span className="num">{cargoWeight(g)}/{capacity(g)}</span></span>
        <span className="flex items-center gap-1" title="Health">♥ <Meter v={g.player.health} color={g.player.health < 35 ? '#e2584a' : '#87a565'} /></span>
        <span title="Cash + deposits + cargo at fair value − note">Worth <Money v={netWorth(g)} className="text-gold" /></span>
        <button className="btn" onClick={() => openCodex(null)} title="Codex (c)">Codex</button>
        <div className="relative">
          <button className="btn btn-ghost" onClick={() => setMenu(m => !m)} aria-expanded={menu}>☰</button>
          {menu && (
            <div className="absolute right-0 top-9 panel p-2 flex flex-col gap-1 w-48 z-50" onMouseLeave={() => setMenu(false)}>
              {(['1', '2', '3'] as Slot[]).map(sl => <button key={sl} className="btn btn-ghost" onClick={() => { saveTo(sl); setMenu(false); }}>Save to slot {sl}</button>)}
              <button className="btn btn-ghost" onClick={() => exportFile(g)}>Export save file</button>
              <button className="btn btn-ghost" onClick={() => setScreen('title')}>Title screen</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function LocationPanel({ g }: { g: GameState }) {
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
        <div className="text-sm text-gold">{g.world.faction[L.id]} <Badge canon={L.canon} /></div>
      </div>
      <p className="text-[.95rem] text-parchment/95">{L.blurb}</p>
      <div className="text-sm"><span className="h-display text-xs uppercase text-ash-400">Law · </span>{L.laws}<span className="text-ash-400"> Duty on sales {Math.round(L.duty * 100)}%. Vigilance {'●'.repeat(L.enforcement)}{'○'.repeat(5 - L.enforcement)}.</span></div>
      <div>
        <div className="h-display text-xs uppercase text-ash-400 mb-1">Merchants <Badge canon="invented" /></div>
        <ul className="space-y-1.5">{L.merchants.map(m => (
          <li key={m.name} className="text-sm"><span className="text-bone">{m.name}</span> <span className="text-ash-400">({m.race}, {m.trade}{m.fence ? ', fence' : ''}{m.eec ? ', EEC licensed' : ''})</span><div className="fell italic text-parchment/80 text-[.9rem]">{m.line}</div></li>
        ))}</ul>
      </div>
      {(news.length > 0 || elsewhere.length > 0) && (
        <div>
          <div className="h-display text-xs uppercase text-ash-400 mb-1">Market talk</div>
          {[...news, ...elsewhere].map((n, i) => <div key={i} className={`text-sm ${n.up ? 'text-moss' : 'text-[#e2a49a]'}`}>{n.up ? '▲' : '▼'} {n.text}</div>)}
        </div>
      )}
      <div className="text-xs text-ash-400">Tavern: {L.tavern}.</div>
    </aside>
  );
}

export function GameScreen() {
  const g = useGame(s => s.game)!;
  const { tab, setTab } = useGame();
  return (
    <div className="relative z-10 p-2 sm:p-3 flex flex-col gap-3 max-w-[1500px] mx-auto"
      onKeyDown={e => { if ((e.target as HTMLElement).tagName === 'INPUT') return; const t = TABS.find(x => x.key === e.key); if (t) setTab(t.id); if (e.key === 'c') useGame.getState().openCodex(null); }} tabIndex={-1}>
      <TopBar g={g} />
      <div className="grid lg:grid-cols-[minmax(300px,380px)_1fr] gap-3 items-start">
        <LocationPanel g={g} />
        <main className="flex flex-col gap-3 min-w-0">
          <nav className="panel flex flex-wrap px-2" role="tablist">
            {TABS.map(t => <button key={t.id} role="tab" aria-selected={tab === t.id} className="tab" onClick={() => setTab(t.id)} title={`Shortcut: ${t.key}`}>{t.label}</button>)}
          </nav>
          {g.player.location === 'road' ? (
            <div className="panel p-6 fell text-lg text-parchment">On the road{g.pending ? ` to ${C.locs[g.pending.dest]?.name ?? '…'}` : ''}. Something blocks the way.</div>
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
