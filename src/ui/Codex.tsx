import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { C } from '../data';
import type { CodexEntry } from '../engine';
import { useGame } from '../store/game';
import { Badge, Sources } from './widgets';

const CATS: { id: CodexEntry['category']; label: string }[] = [
  { id: 'place', label: 'Places' }, { id: 'good', label: 'Goods' }, { id: 'faction', label: 'Factions' }, { id: 'person', label: 'People' },
  { id: 'event', label: 'Events' }, { id: 'calendar', label: 'Calendar & holidays' }, { id: 'travel', label: 'Travel, magic & perils' },
  { id: 'dispute', label: 'Historians disagree' }, { id: 'book', label: 'Books' }, { id: 'invented', label: 'Invented for this game' },
];

export function Codex() {
  const { codex, closeCodex, openCodex, game } = useGame();
  const unlocked = useMemo(() => new Set(game?.codex ?? []), [game?.codex]);
  const sel = codex ? C.codex[codex] : undefined;
  const [cat, setCat] = useState<CodexEntry['category']>(sel?.category ?? 'place');
  const [q, setQ] = useState('');
  if (codex === undefined) return null;
  const all = Object.values(C.codex);
  // Always-open entries: everything about the calendar, disputes you've heard of, and the "invented" registry.
  const isOpen = (e: CodexEntry) => unlocked.has(e.id) || e.category === 'invented' || e.category === 'calendar' || (e.id.startsWith('loc:') && !game);
  const list = all.filter(e => e.category === cat && (!q || e.title.toLowerCase().includes(q.toLowerCase())));
  const known = list.filter(isOpen);
  const entry = sel && (isOpen(sel) || codex === sel.id) ? sel : undefined;
  return (
    <motion.div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-2 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={closeCodex}>
      <div role="dialog" aria-label="Codex" className="panel w-full max-w-6xl h-[88vh] grid grid-cols-1 md:grid-cols-[220px_260px_1fr] overflow-hidden" onClick={e => e.stopPropagation()}>
        <nav className="border-r border-ash-700 p-3 overflow-auto scroll-thin">
          <div className="h-display text-ember mb-2">Codex</div>
          <div className="text-xs text-ash-400 mb-2">{all.filter(isOpen).length}/{all.length} entries known</div>
          {CATS.map(c => <button key={c.id} className={`block w-full text-left px-2 py-1 rounded text-sm ${cat === c.id ? 'bg-ash-700 text-bone' : 'text-parchment/80 hover:bg-ash-800'}`} onClick={() => setCat(c.id)}>{c.label}</button>)}
          <button className="btn mt-4 w-full" onClick={closeCodex}>Close (Esc)</button>
        </nav>
        <div className="border-r border-ash-700 p-3 overflow-auto scroll-thin">
          <input className="input mb-2" placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search codex" />
          {known.map(e => <button key={e.id} className={`block w-full text-left px-2 py-1 rounded text-sm ${codex === e.id ? 'bg-ember-deep/40 text-bone' : 'hover:bg-ash-800 text-parchment'}`} onClick={() => openCodex(e.id)}>{e.title}</button>)}
          {list.length - known.length > 0 && <div className="text-xs text-ash-400 mt-2 italic">{list.length - known.length} more to discover…</div>}
        </div>
        <article className="p-5 overflow-auto scroll-thin">
          {entry ? (
            <>
              <h2 className="h-display text-2xl text-bone">{entry.title}</h2>
              <div className="my-2"><Badge canon={entry.canon} /></div>
              {entry.body.split('\n\n').map((p, i) => <p key={i} className="mb-3 text-[1.02rem] text-parchment">{p}</p>)}
              {entry.claims && <div className="space-y-2 my-3">{entry.claims.map((c, i) => (
                <blockquote key={i} className="border-l-2 border-lilac pl-3"><div className="text-xs h-display uppercase text-lilac">{c.voice}</div><div className="fell italic text-bone">“{c.text}”</div><a className="text-xs linkish text-ash-400" href={c.source} target="_blank" rel="noreferrer">{c.source.replace('https://', '')}</a></blockquote>
              ))}</div>}
              {entry.defaultReading && <p className="text-sm text-gold">This ledger follows: {entry.defaultReading}</p>}
              <Sources list={entry.sources} />
            </>
          ) : <div className="fell italic text-ash-400 text-lg">Choose an entry. Underlined words across the game open their codex page.</div>}
        </article>
      </div>
    </motion.div>
  );
}
