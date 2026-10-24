import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { C } from '../data';
import { useGame } from '../store/game';
import { EASE, useAnimationsOn, useMotion } from './motion';
import { beat } from './fx';

/** A short, non-blocking "A → B, n days" banner after each journey, its dot crossing in time with the night veil. Off under Reduce motion. */
export function TravelBanner() {
  const trip = useGame(s => s.trip); const clearTrip = useGame(s => s.clearTrip);
  const on = useAnimationsOn(), m = useMotion(), b = beat(trip?.days ?? 1);
  useEffect(() => { if (!trip) return; const t = setTimeout(clearTrip, (beat(trip.days).total + 0.4) * 1000); return () => clearTimeout(t); }, [trip, clearTrip]);
  const from = trip ? C.locs[trip.from]?.name : undefined, to = trip ? C.locs[trip.to]?.name : undefined;
  return (
    <AnimatePresence>
      {on && trip && from && to && (
        <motion.div key={trip.id} className="fixed top-24 left-1/2 -translate-x-1/2 z-[35] panel-solid px-5 py-3 pointer-events-none w-[min(460px,calc(100vw-2rem))]"
          {...m.pop} aria-hidden="true">
          <div className="flex items-center gap-3 text-sm">
            <span className="h-display text-parchment truncate">{from}</span>
            <div className="relative flex-1 h-4">
              <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-ash-600" />
              <motion.div className="absolute top-1/2 -mt-1.5 h-3 w-3 rounded-full bg-ember" initial={{ left: '0%' }} animate={{ left: 'calc(100% - 0.75rem)' }} transition={{ duration: b.total, ease: EASE }} />
            </div>
            <span className="h-display text-bone truncate">{to}</span>
          </div>
          <div className="text-xs text-ash-400 text-center mt-1">{trip.days} day{trip.days === 1 ? '' : 's'} on the road</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
