import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, animate, motion } from 'framer-motion';
import { useAnimationsOn } from './motion';
import { C } from '../data';
import { dateOf, moons, PHASES, holidayAt, type Canon, type GameState, type LocStatus } from '../engine';
import { useGame } from '../store/game';

export function Money({ v, className = '' }: { v: number; className?: string }) {
  const n = Math.round(v);
  return <span className={`num ${n < 0 ? 'text-danger' : ''} ${className}`}>{n.toLocaleString('en-US')}<span className="coin" aria-hidden="true" /></span>;
}

// Lore-status badges are shown in the Codex only.
/** A value that glides to its target instead of jumping (0.5 s, eased). */
function useRolling(value: number, on: boolean): number {
  const [shown, setShown] = useState(value);
  const cur = useRef(value);
  useEffect(() => {
    if (!on || Math.abs(value - cur.current) < 1) { cur.current = value; setShown(value); return; }
    const ctl = animate(cur.current, value, { duration: 0.5, ease: [0.22, 1, 0.36, 1], onUpdate: v => { cur.current = v; setShown(v); } });
    return () => ctl.stop();
  }, [value, on]);
  return shown;
}
/** Money that rolls to its new value with a small springy bump (top-bar counters). */
export function RollingMoney({ v, className = '' }: { v: number; className?: string }) {
  const on = useAnimationsOn();
  const shown = useRolling(v, on);
  const [bump, setBump] = useState(0); const last = useRef(Math.round(v));
  useEffect(() => { if (Math.round(v) !== last.current) { last.current = Math.round(v); setBump(b => b + 1); } }, [v]);
  return (
    <motion.span key={bump} className="inline-block origin-center" initial={bump && on ? { scale: 1.12 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 16 }}>
      <Money v={shown} className={className} />
    </motion.span>
  );
}

const BADGE: Record<Exclude<Canon, 'canon'>, { label: string; cls: string; tip: string }> = {
  unverified: { label: 'Unverified', cls: 'text-gold', tip: 'Not confirmed by a sourced page.' },
  disputed: { label: 'Historians disagree', cls: 'text-lilac', tip: 'Sources conflict. See the Historians Disagree section of the codex.' },
  extrapolation: { label: 'Extrapolation', cls: 'text-ice', tip: 'A reasoned guess from canon (e.g. a day for an event only dated by year).' },
  invented: { label: 'Invented for this game', cls: 'text-danger', tip: 'Made up for gameplay; not lore.' },
};
export function Badge({ canon, className = '' }: { canon: Canon; className?: string }) {
  if (canon === 'canon') return null;
  const b = BADGE[canon];
  return <span title={b.tip} className={`inline-block rounded-full border border-current px-2 py-[1px] text-[.72rem] align-middle ${b.cls} ${className}`}>{b.label}</span>;
}

const STATUS: Record<LocStatus, { label: string; cls: string; glyph: string }> = {
  thriving: { label: 'Thriving', cls: 'text-moss', glyph: '◆' }, uneasy: { label: 'Uneasy', cls: 'text-gold', glyph: '◇' },
  ruined: { label: 'Ruined', cls: 'text-ember', glyph: '▲' }, rebuilding: { label: 'Rebuilding', cls: 'text-gold', glyph: '△' },
  besieged: { label: 'Besieged', cls: 'text-danger', glyph: '✕' }, sacked: { label: 'Sacked', cls: 'text-danger', glyph: '✖' },
  occupied: { label: 'Occupied', cls: 'text-lilac', glyph: '■' }, 'refugee-swollen': { label: 'Full of refugees', cls: 'text-ice', glyph: '●' },
  camp: { label: 'Survivors’ camp', cls: 'text-ember', glyph: '▴' },
  closed: { label: 'Destroyed', cls: 'text-ash-400', glyph: '○' },
};
export function StatusPill({ status }: { status: LocStatus }) {
  const s = STATUS[status];
  return <span className={`text-xs font-display uppercase tracking-wider ${s.cls}`} aria-label={`Status: ${s.label}`}>{s.glyph} {s.label}</span>;
}

export function CodexLink({ id, children, className = '' }: { id: string; children: ReactNode; className?: string }) {
  const open = useGame(s => s.openCodex);
  if (!C.codex[id]) return <span className={className}>{children}</span>;
  return <span role="button" tabIndex={0} className={`linkish ${className}`} onClick={() => open(id)} onKeyDown={e => e.key === 'Enter' && open(id)}>{children}</span>;
}

export function MoonIcon({ phase, size = 18, color }: { phase: number; size?: number; color: string }) {
  // phase 0=new … 4=full … 7=waning crescent
  const r = size / 2 - 1; const f = phase / 8; const lit = Math.cos(2 * Math.PI * f);
  const rx = Math.abs(lit) * r; const waxing = f < 0.5;
  const d = `M ${size / 2} 1 A ${r} ${r} 0 0 ${waxing ? 1 : 0} ${size / 2} ${size - 1} A ${rx} ${r} 0 0 ${(lit > 0) === waxing ? 0 : 1} ${size / 2} 1`;
  return (
    <svg width={size} height={size} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="#1b1512" stroke={color} strokeOpacity={0.4} />
      {phase !== 0 && <path d={phase === 4 ? `M ${size / 2} 1 A ${r} ${r} 0 1 1 ${size / 2 - 0.01} 1` : d} fill={color} />}
    </svg>
  );
}

export function DateWidget({ g }: { g: GameState }) {
  // The date counts through each day that passes; the moons turn with it.
  const on = useAnimationsOn();
  const [shown, setShown] = useState(g.day); const prev = useRef(g.day);
  useEffect(() => {
    const a = prev.current, b = g.day; prev.current = b;
    if (!on || b <= a || b - a > 800) { setShown(b); return; }
    const ctl = animate(a, b, { duration: Math.min(1.1, 0.35 + (b - a) * 0.07), ease: 'easeInOut', onUpdate: v => setShown(Math.round(v)) });
    return () => ctl.stop();
  }, [g.day, on]);
  const ticking = shown !== g.day;
  const d = dateOf(shown); const m = moons(shown); const left = Math.max(0, g.endDay - g.day);
  const hol = g.player.location !== 'road' ? holidayAt(g, g.player.location) : undefined;
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1" title={`Moons: Masser ${PHASES[m.masser]}, Secunda ${PHASES[m.secunda]}`}>
        <MoonIcon phase={m.masser} color="#e8b98a" size={22} /><MoonIcon phase={m.secunda} color="#c9d4dc" size={15} />
      </div>
      <div className="leading-tight">
        <div className={`h-display text-[.95rem] transition-colors duration-500 ${ticking ? 'text-ember' : 'text-bone'}`}>{d.dom} {d.monthName}, 4E {d.year}</div>
        <div className="text-xs text-ash-400"><span className="italic">{d.weekday}</span>
          {hol && <> · <CodexLink id={`holiday:${hol.id}`} className="text-gold">{hol.name}</CodexLink></>}
          {g.mode === 'long-chronicle' && <span className="text-lilac"> · Long Chronicle</span>}
          <span title="Days until the campaign ends"> · {left.toLocaleString('en-US')} days left</span>
        </div>
      </div>
    </div>
  );
}

let popSeq = 0;
/** A small number that floats up when a value changes (+340 / −120). */
export function Delta({ value, upIsGood = true }: { value: number; upIsGood?: boolean }) {
  const prev = useRef(value);
  const [pops, setPops] = useState<{ id: number; d: number }[]>([]);
  useEffect(() => {
    const d = Math.round(value - prev.current); prev.current = value;
    if (Math.abs(d) < 1) return;
    const id = ++popSeq;
    setPops(p => [...p.slice(-2), { id, d }]);
    setTimeout(() => setPops(p => p.filter(x => x.id !== id)), 1500);
  }, [value]);
  return (
    <span className="relative inline-block w-0 h-0 align-top" aria-hidden="true">
      <AnimatePresence>{pops.map(p => (
        <motion.span key={p.id} className={`absolute left-1 -top-1 text-xs num font-semibold whitespace-nowrap pointer-events-none ${(p.d > 0) === upIsGood ? 'text-moss' : 'text-danger'}`}
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: -14 }} exit={{ opacity: 0 }} transition={{ duration: 0.9 }}>
          {p.d > 0 ? '+' : '−'}{Math.abs(p.d).toLocaleString('en-US')}
        </motion.span>
      ))}</AnimatePresence>
    </span>
  );
}

export function Meter({ v, max = 100, color }: { v: number; max?: number; color: string }) {
  return <div className="h-1.5 w-20 rounded bg-ash-700 overflow-hidden" role="meter" aria-valuenow={v} aria-valuemax={max}><div className="h-full rounded" style={{ width: `${Math.max(0, Math.min(100, (v / max) * 100))}%`, background: color }} /></div>;
}

export function Section({ title, children, right, className = '' }: { title: string; children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <section className={`panel p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2"><h3 className="h-display text-sm uppercase text-parchment">{title}</h3>{right}</div>
      {children}
    </section>
  );
}

export function Sources({ list }: { list: readonly string[] }) {
  if (!list.length) return null;
  return (
    <div className="text-xs text-ash-400 mt-2">Sources: {list.map((u, i) => (
      <a key={u} href={u} target="_blank" rel="noreferrer" className="linkish mr-2">{decodeURIComponent(u.replace(/^https:\/\/(en\.uesp\.net\/wiki\/|www\.imperial-library\.info\/content\/)/, i >= 0 ? '' : '')).replace(/_/g, ' ')}</a>
    ))}</div>
  );
}
