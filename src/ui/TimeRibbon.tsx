import { motion } from 'framer-motion';
import { C } from '../data';
import { RED_YEAR_END, shortDate, type GameState } from '../engine';
import { useMotion } from './motion';


/** The whole campaign as a thin bar: how far you are, what has happened, and what the rumours say is coming. */
export function TimeRibbon({ g }: { g: GameState }) {
  const start = g.mode === 'red-year' ? 0 : RED_YEAR_END, end = g.endDay, span = Math.max(1, end - start);
  const pct = (d: number) => Math.max(0, Math.min(100, ((d - start) / span) * 100));
  const inMode = (m: string) => m === 'both' || m === g.mode;
  const fired = C.history.filter(e => e.major && inMode(e.mode) && g.world.fired.includes(e.id) && e.day >= start && e.day <= end);
  const rumoured = C.history.filter(e => e.major && inMode(e.mode) && !g.world.fired.includes(e.id) && e.day > g.day && e.day <= end && e.foreshadow?.rumors.some(r => g.heard.includes(r)));
  const left = Math.max(0, end - g.day);
  const t = useMotion().t('slow');
  return (
    <div className="relative h-3 w-full basis-full mt-0.5" role="img" aria-label={`Campaign: day ${g.day - start + 1} of ${span + 1}, ${left} days left`} title={`Day ${g.day - start + 1} of ${span + 1}: ${left} days left`}>
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-ash-700" />
      <motion.div className="absolute left-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full" style={{ background: 'linear-gradient(90deg, var(--c-gold), var(--c-accent))' }}
        initial={false} animate={{ width: `${pct(g.day)}%` }} transition={t} />
      {fired.map(e => (
        <span key={e.id} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 p-1.5 cursor-help" style={{ left: `${pct(e.day)}%` }} title={`${shortDate(e.day)}: ${e.title}`}>
          <span className="block h-2 w-2 rotate-45 bg-gold ring-1 ring-ash-950" />
        </span>
      ))}
      {rumoured.map(e => (
        <span key={e.id} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 p-1.5 cursor-help" style={{ left: `${pct(e.day)}%` }} title="Rumours say something is coming around then">
          <span className="block h-2 w-2 rotate-45 border border-gold" />
        </span>
      ))}
      <motion.span className="absolute top-1/2 h-3 w-[3px] -ml-px -translate-y-1/2 rounded-full bg-bone" style={{ boxShadow: '0 0 6px var(--c-accent)' }}
        initial={false} animate={{ left: `${pct(g.day)}%` }} transition={t} />
    </div>
  );
}
