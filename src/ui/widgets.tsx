import type { ReactNode } from 'react';
import { C } from '../data';
import { dateOf, moons, PHASES, holidayAt, type Canon, type GameState, type LocStatus } from '../engine';
import { useGame } from '../store/game';

export function Money({ v, className = '' }: { v: number; className?: string }) {
  const n = Math.round(v);
  return <span className={`num ${n < 0 ? 'text-[#e2584a]' : ''} ${className}`}>{n.toLocaleString('en-US')}<span className="text-gold/80 text-[.8em] ml-0.5">dr</span></span>;
}

const BADGE: Record<Exclude<Canon, 'canon'>, { label: string; cls: string; tip: string }> = {
  unverified: { label: 'Unverified', cls: 'bg-[#5a4320] text-[#f2c879]', tip: 'From memory; not confirmed by a sourced page.' },
  disputed: { label: 'Historians disagree', cls: 'bg-[#3b2b52] text-lilac', tip: 'Sources conflict. See the Historians Disagree section of the codex.' },
  extrapolation: { label: 'Extrapolation', cls: 'bg-[#1f3a48] text-ice', tip: 'Our reasoned inference from canon (e.g. a day for a year-only event).' },
  invented: { label: 'Invented for this game', cls: 'bg-[#4b1f1a] text-[#f0a49a]', tip: 'Made up for gameplay; not lore.' },
};
export function Badge({ canon, className = '' }: { canon: Canon; className?: string }) {
  if (canon === 'canon') return null;
  const b = BADGE[canon];
  return <span title={b.tip} className={`inline-block rounded px-1.5 py-[1px] text-[.68rem] font-display uppercase tracking-wider align-middle ${b.cls} ${className}`}>{b.label}</span>;
}

const STATUS: Record<LocStatus, { label: string; cls: string; glyph: string }> = {
  thriving: { label: 'Thriving', cls: 'text-moss', glyph: '◆' }, uneasy: { label: 'Uneasy', cls: 'text-gold', glyph: '◇' },
  ruined: { label: 'Ruined', cls: 'text-ember', glyph: '▲' }, rebuilding: { label: 'Rebuilding', cls: 'text-gold', glyph: '△' },
  besieged: { label: 'Besieged', cls: 'text-[#e2584a]', glyph: '✕' }, sacked: { label: 'Sacked', cls: 'text-[#e2584a]', glyph: '✖' },
  occupied: { label: 'Occupied', cls: 'text-lilac', glyph: '■' }, 'refugee-swollen': { label: 'Refugee-swollen', cls: 'text-ice', glyph: '●' },
  closed: { label: 'Gone', cls: 'text-ash-400', glyph: '○' },
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
  const d = dateOf(g.day); const m = moons(g.day);
  const hol = g.player.location !== 'road' ? holidayAt(g, g.player.location) : undefined;
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1" title={`Masser: ${PHASES[m.masser]} · Secunda: ${PHASES[m.secunda]} (cycles disputed, D-22)`}>
        <MoonIcon phase={m.masser} color="#e8b98a" size={22} /><MoonIcon phase={m.secunda} color="#c9d4dc" size={15} />
      </div>
      <div className="leading-tight">
        <div className="h-display text-[.95rem] text-bone">{d.dom} {d.monthName}, 4E {d.year}</div>
        <div className="text-xs text-ash-400"><span className="italic">{d.weekday}</span>
          {hol && <> · <CodexLink id={`holiday:${hol.id}`} className="text-gold">{hol.name}</CodexLink></>}
          {g.mode === 'long-chronicle' && <span className="text-lilac"> · Long Chronicle</span>}
        </div>
      </div>
    </div>
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
