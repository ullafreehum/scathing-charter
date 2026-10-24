// Decorative, non-blocking effects: coins flying between the thing you clicked and your purse,
// and the night veil whenever days pass (the beat that the date, debt and cash wait for). Both are skipped under Reduce motion.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/game';
import { DUR, EASE, animationsOn, useAnimationsOn } from './motion';
import { sfx } from '../audio/sfx';

type Target = Element | 'cash' | 'debt' | null;
type Pt = { x: number; y: number };
interface Burst { id: number; from: Pt; to: Pt; n: number }
const listeners = new Set<(b: Burst) => void>();
let seq = 0;

function centre(t: Target): Pt | null {
  const el = t === 'cash' ? document.getElementById('cash-counter') : t === 'debt' ? document.getElementById('debt-counter') : t;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width || r.height ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
}
/** More coins for bigger sums: 3 for pocket change, up to 9 for a fortune. */
export const coinsFor = (value: number) => Math.max(3, Math.min(9, Math.round(Math.log10(Math.max(10, value)) * 2.2)));
/** Send a few coins flying from one place to another (e.g. 'cash' → the Buy button). */
export function coinBurst(from: Target, to: Target, n = 5) {
  if (!animationsOn()) return;
  const a = centre(from), b = centre(to);
  if (a && b) listeners.forEach(f => f({ id: ++seq, from: a, to: b, n }));
}

export function FxLayer() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  useEffect(() => {
    const f = (b: Burst) => { setBursts(x => [...x.slice(-6), b]); setTimeout(() => setBursts(x => x.filter(y => y.id !== b.id)), 1300); };
    listeners.add(f); return () => { listeners.delete(f); };
  }, []);
  return (
    <div className="fixed inset-0 z-[70] pointer-events-none" aria-hidden="true">
      {bursts.flatMap(b => Array.from({ length: b.n }, (_, i) => {
        const dx = b.to.x - b.from.x, dy = b.to.y - b.from.y;
        const spread = (i - (b.n - 1) / 2) * 9, lift = -50 - (i % 3) * 16; // a little fan, arcing upward
        return (
          <motion.span key={`${b.id}-${i}`} className="coin" style={{ position: 'absolute', left: b.from.x - 5, top: b.from.y - 5, width: 10, height: 10, margin: 0 }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
            animate={{ x: [0, dx * 0.45 + spread, dx], y: [0, dy * 0.45 + lift, dy], opacity: [0, 1, 1, 0], scale: [0.5, 1.15, 0.75] }}
            transition={{ duration: 0.72, delay: i * 0.045, ease: [0.45, 0, 0.25, 1] }} />
        );
      }))}
    </div>
  );
}

/** One beat for days passing (Sorcerer's set piece 1): the veil comes in over `slow`, the date flips at its darkest
 *  point, debt and cash count from just after, the veil lifts over `slow`. One day takes 1.04 s; each further day holds
 *  the dark 50 ms longer, up to 1.6 s in all. */
export function beat(days: number) {
  const inS = DUR.slow, outS = DUR.slow, hold = Math.min(1.6 - inS - outS, 0.4 + 0.05 * (Math.max(1, days) - 1));
  return { inS, hold, outS, total: inS + hold + outS, flipS: inS, countS: inS + 0.08, countMs: days > 1 ? 600 : DUR.slow * 1000, depth: Math.min(0.45, 0.3 + 0.02 * (Math.max(1, days) - 1)) };
}
/** A value that changes when days pass (the date, debt, cash) holds its old value until the beat reaches it. */
export function useHeld<T>(v: T, at: 'flip' | 'count' = 'flip'): T {
  const tick = useGame(s => s.tick); const on = useAnimationsOn();
  const [shown, setShown] = useState(v);
  const id = tick?.id, days = tick?.days ?? 1;
  useEffect(() => {
    if (!on || id === undefined) { setShown(v); return; }
    const b = beat(days), t = setTimeout(() => setShown(v), (at === 'flip' ? b.flipS : b.countS) * 1000);
    return () => clearTimeout(t);
  }, [v, id, days, on, at]);
  return on && id !== undefined ? shown : v;
}

/** The veil while days pass: the spine of the beat. Under Reduce motion there is no veil, only the page sound. */
export function NightDip() {
  const tick = useGame(s => s.tick); const clearTick = useGame(s => s.clearTick);
  const on = useAnimationsOn();
  // the fall of Baar Dau has its own set piece (black cut, boom): no veil under it
  const erupt = useGame(s => { const i = s.game?.inbox[0]; return i?.kind === 'chronicle' && i.eventId === 'red-year-eruption'; });
  useEffect(() => {
    if (!tick) return;
    if (!on || erupt) { if (!erupt) sfx.page(); clearTick(); return; }
    const t = setTimeout(() => sfx.page(), beat(tick.days).flipS * 1000);
    return () => clearTimeout(t);
  }, [tick, on, erupt, clearTick]);
  if (!on || erupt || !tick) return null;
  const b = beat(tick.days);
  return (
    <motion.div key={tick.id} className="fixed inset-0 z-[33] pointer-events-none" aria-hidden="true"
      style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(18,24,52,.55), rgba(4,6,16,.9))' }}
      initial={{ opacity: 0 }} animate={{ opacity: [0, b.depth, b.depth, 0] }}
      transition={{ duration: b.total, times: [0, b.inS / b.total, (b.inS + b.hold) / b.total, 1], ease: EASE }}
      onAnimationComplete={clearTick} />
  );
}
