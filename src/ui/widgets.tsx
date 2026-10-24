import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DUR, useAnimationsOn, useMotion } from './motion';
import { useHeld } from './fx';
import { C } from '../data';
import { dateOf, moons, PHASES, holidayAt, type Canon, type GameState, type LocStatus } from '../engine';
import { useGame } from '../store/game';

export function Money({ v, className = '' }: { v: number; className?: string }) {
  const n = Math.round(v);
  return <span className={`num ${n < 0 ? 'text-danger' : ''} ${className}`}>{n.toLocaleString('en-US')}<span className="coin" aria-hidden="true" /></span>;
}

// Lore-status badges are shown in the Codex only.
/** A number that counts to its new value without moving anything around it: tabular figures in a box as wide as the
 *  longer of the old and new value, written straight to the DOM (no re-render a frame). Changes under 1% of the old
 *  value and under `snap` snap; so does everything under Reduce motion. */
export function CountUp({ v, ms = DUR.slow * 1000, snap = 50, className = '' }: { v: number; ms?: number; snap?: number; className?: string }) {
  const n = Math.round(v), on = useAnimationsOn();
  const ref = useRef<HTMLSpanElement>(null), shown = useRef(n);
  const [width, setWidth] = useState(() => fmt(n).length);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const from = shown.current, d = Math.abs(n - from);
    setWidth(Math.max(fmt(from).length, fmt(n).length));
    if (!on || d === 0 || (d < snap && d < Math.abs(from) * 0.01)) { shown.current = n; el.textContent = fmt(n); return; }
    let raf = 0; const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms), k = 1 - (1 - p) * (1 - p) * (1 - p);
      shown.current = Math.round(from + (n - from) * k); el.textContent = fmt(shown.current);
      if (p < 1) raf = requestAnimationFrame(step); else setWidth(fmt(n).length);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf); // a new value mid-count carries on from where the count is
  }, [n, on, ms, snap]);
  return <span ref={ref} className={`num count ${className}`} style={{ minWidth: `${width}ch` }} />;
}
const fmt = (n: number) => n.toLocaleString('en-US');

/** Money that counts to its new value (the top-bar counters); debt counts a little slower after a day passes. */
export function RollingMoney({ v, className = '', ms }: { v: number; className?: string; ms?: number }) {
  return <span className={`num ${Math.round(v) < 0 ? 'text-danger' : ''} ${className}`}><CountUp v={v} ms={ms} /><span className="coin" aria-hidden="true" /></span>;
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
  // The date flips once, at the darkest point of the night veil (the beat in fx.tsx); the moons turn with it.
  const shown = useHeld(g.day); const t = useMotion().t;
  const d = dateOf(shown); const m = moons(shown); const left = Math.max(0, g.endDay - g.day);
  const hol = g.player.location !== 'road' ? holidayAt(g, g.player.location) : undefined;
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1" title={`Moons: Masser ${PHASES[m.masser]}, Secunda ${PHASES[m.secunda]}`}>
        <MoonIcon phase={m.masser} color="#e8b98a" size={22} /><MoonIcon phase={m.secunda} color="#c9d4dc" size={15} />
      </div>
      <div className="leading-tight">
        <motion.div key={shown} className="h-display text-[.95rem] text-bone" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: t('fast') }}>{d.dom} {d.monthName}, 4E {d.year}</motion.div>
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
  const t = useMotion().t;
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
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: -14, transition: t('slow') }} exit={{ opacity: 0, transition: t('fast') }}>
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
