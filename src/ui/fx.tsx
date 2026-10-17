// Decorative, non-blocking effects: coins flying between the thing you clicked and your purse,
// and a brief dusk whenever days pass. Both are skipped when animations are off.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/game';
import { animationsOn, useAnimationsOn } from './motion';

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

/** A soft dusk over the screen while days pass: longer rests, deeper and longer nights. */
export function NightDip() {
  const tick = useGame(s => s.tick); const clearTick = useGame(s => s.clearTick);
  const on = useAnimationsOn();
  if (!on || !tick) return null;
  const depth = Math.min(0.5, 0.22 + tick.days * 0.03), dur = Math.min(1.5, 0.75 + tick.days * 0.07);
  return (
    <motion.div key={tick.id} className="fixed inset-0 z-[33] pointer-events-none" aria-hidden="true"
      style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(18,24,52,.55), rgba(4,6,16,.9))' }}
      initial={{ opacity: 0 }} animate={{ opacity: [0, depth, depth, 0] }} transition={{ duration: dur, times: [0, 0.35, 0.55, 1], ease: 'easeInOut' }}
      onAnimationComplete={clearTick} />
  );
}
