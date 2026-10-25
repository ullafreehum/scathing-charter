import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../store/game';
import { useMotion } from './motion';

/** Minor news (rumours, achievements, settlements) that does not need a click to continue. */
export function Toasts() {
  const { toasts, dismissToast } = useGame();
  const m = useMotion();
  return (
    <div role="status" aria-live="polite" className="fixed bottom-4 left-4 z-[45] flex flex-col gap-2 w-[min(380px,calc(100vw-2rem))] pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map(t => (
          <motion.button key={t.id} layout type="button" title="Dismiss" onClick={() => dismissToast(t.id)}
            className="panel-solid pointer-events-auto text-left p-3 text-sm"
            {...m.slide('left')} transition={m.t('fast')}>
            <span className="block h-display text-xs uppercase text-gold">{t.star ? '★ ' : ''}{t.title}</span>
            <span className="block text-parchment">{t.text}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
