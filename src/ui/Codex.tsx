import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { C } from '../data';
import type { CodexEntry } from '../engine';
import { useGame } from '../store/game';
import { Badge, Sources } from './widgets';
import redMountain from '../assets/places/red-mountain.jpg';

/** Pictures shown as a 2:1 banner at the top of a codex entry. */
const BANNER: Record<string, string> = { 'topic:red-mountain': redMountain };

const CATS: { id: CodexEntry['category']; label: string }[] = [
  { id: 'place', label: 'Places' }, { id: 'good', label: 'Goods' }, { id: 'faction', label: 'Factions' }, { id: 'person', label: 'People' },
  { id: 'event', label: 'Events' }, { id: 'calendar', label: 'Calendar & holidays' }, { id: 'travel', label: 'Travel, magic & perils' },
  { id: 'dispute', label: 'Historians disagree' }, { id: 'book', label: 'Books' }, { id: 'lore', label: 'Tavern tales' }, { id: 'invented', label: 'Invented for this game' },
];
const EASE = [0.22, 1, 0.36, 1] as const;

/** Rendered inside <AnimatePresence> by App, so it can slide in and out. */
export function Codex() {
  const { codex, closeCodex, openCodex, game } = useGame();
  // Keep showing the last entry while the closing animation plays.
  const last = useRef(codex);
  if (codex !== undefined) last.current = codex;
  const id = last.current;
  const unlocked = useMemo(() => new Set(game?.codex ?? []), [game?.codex]);
  const sel = id ? C.codex[id] : undefined;
  const [cat, setCat] = useState<CodexEntry['category']>(sel?.category ?? 'place');
  const [q, setQ] = useState('');
  const article = useRef<HTMLElement>(null);
  // Follow the entry that was opened (e.g. clicking a good's name jumps to Goods), and start it at the top.
  useEffect(() => { if (sel) setCat(sel.category); article.current?.scrollTo?.({ top: 0 }); }, [sel]);
  const all = Object.values(C.codex);
  // Always-open entries: everything about the calendar, disputes you've heard of, and the "invented" registry.
  const isOpen = (e: CodexEntry) => unlocked.has(e.id) || e.category === 'invented' || e.category === 'calendar' || (e.id.startsWith('loc:') && !game);
  const list = all.filter(e => e.category === cat && (!q || e.title.toLowerCase().includes(q.toLowerCase())));
  const known = list.filter(isOpen);
  const entry = sel && (isOpen(sel) || id === sel.id) ? sel : undefined;
  return (
    <motion.div className="fixed inset-0 z-50 scrim flex items-center justify-center p-2 sm:p-6" onClick={closeCodex}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
      <motion.div role="dialog" aria-label="Codex" onClick={e => e.stopPropagation()}
        className="panel-solid w-full max-w-6xl h-[88dvh] grid grid-cols-1 md:grid-cols-[13.75rem_16.25rem_1fr] overflow-hidden"
        initial={{ opacity: 0, y: 18, scale: 0.975 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={{ duration: 0.26, ease: EASE }}>
        <nav className="border-r border-ash-700 p-3 overflow-auto scroll-thin">
          <div className="h-display text-ember mb-2">Codex</div>
          <div className="text-xs text-ash-400 mb-2">{all.filter(isOpen).length}/{all.length} entries known</div>
          {CATS.map(c => <button key={c.id} className={`block w-full text-left px-2 py-1 rounded text-sm transition-colors ${cat === c.id ? 'bg-ash-700 text-bone' : 'text-parchment hover:bg-ash-800'}`} onClick={() => setCat(c.id)}>{c.label}</button>)}
          <button className="btn mt-4 w-full" onClick={closeCodex}>Back to game (Esc)</button>
        </nav>
        <div className="border-r border-ash-700 p-3 overflow-auto scroll-thin">
          <input className="input mb-2" placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search codex" />
          {known.map(e => <button key={e.id} className={`block w-full text-left px-2 py-1 rounded text-sm transition-colors ${id === e.id ? 'bg-ash-700 text-bone border-l-2 border-ember' : 'hover:bg-ash-800 text-parchment'}`} onClick={() => openCodex(e.id)}>{e.title}</button>)}
          {list.length - known.length > 0 && <div className="text-xs text-ash-400 mt-2 italic">{list.length - known.length} more to discover…</div>}
        </div>
        <article ref={article} className="p-5 overflow-auto scroll-thin">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={entry?.id ?? 'none'} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.16, ease: EASE }}>
              {entry ? (
                <>
                  {BANNER[entry.id] && <img src={BANNER[entry.id]} alt="" className="w-full aspect-[2/1] object-cover rounded mb-3" />}
                  <h2 className="h-display text-2xl text-bone">{entry.title}</h2>
                  <div className="my-2"><Badge canon={entry.canon} /></div>
                  {entry.body.split('\n\n').map((p, i) => <p key={i} className="mb-3 text-[1.02rem] text-parchment">{p}</p>)}
                  {entry.claims && <div className="space-y-2 my-3">{entry.claims.map((c, i) => (
                    <blockquote key={i} className="border-l-2 border-lilac pl-3"><div className="text-xs h-display uppercase text-lilac">{c.voice}</div><div className="fell italic text-bone">“{c.text}”</div><a className="text-xs linkish text-ash-400" href={c.source} target="_blank" rel="noreferrer">{c.source.replace('https://', '')}</a></blockquote>
                  ))}</div>}
                  {entry.defaultReading && <p className="text-sm text-gold">This game follows: {entry.defaultReading}</p>}
                  <Sources list={entry.sources} />
                </>
              ) : <div className="fell italic text-ash-400 text-lg">Choose an entry. Underlined words across the game open their codex page.</div>}
            </motion.div>
          </AnimatePresence>
        </article>
      </motion.div>
    </motion.div>
  );
}
