// The game's one motion language (0.11, game feel): one fast-out curve and four durations, read by Framer Motion
// (the presets below) and by CSS (the --ease and --dur-* variables, set here). An exit is always shorter than its
// entry, and nothing but the two set pieces (a day passing, the eruption) runs longer than `slow`.
// Reduce motion (Settings, or the system's preference) shortens every transition to `tap` and stops counting,
// veils and shakes.
import { useMemo } from 'react';
import { useGame } from '../store/game';

export const EASE: [number, number, number, number] = [0.2, 0, 0, 1];
export const DUR = { tap: 0.08, fast: 0.14, base: 0.22, slow: 0.32 } as const; // Sorcerer's values (handoff/0.11-motion.md)

const prefersReduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
/** For event handlers. */
export function animationsOn(): boolean { return useGame.getState().meta.settings.animations && !prefersReduced(); }
/** For components. */
export function useAnimationsOn(): boolean { return useGame(s => s.meta.settings.animations) && !prefersReduced(); }

/** CSS reads the same numbers: called at start and whenever Reduce motion changes. */
export function applyMotionVars(reduced: boolean) {
  if (typeof document === 'undefined') return;
  const st = document.documentElement.style;
  st.setProperty('--ease', `cubic-bezier(${EASE.join(',')})`);
  for (const [k, v] of Object.entries(DUR)) st.setProperty(`--dur-${k}`, `${Math.round((reduced ? DUR.tap : v) * 1000)}ms`);
  document.documentElement.classList.toggle('reduce-motion', reduced);
}
applyMotionVars(false);

const tr = (d: number, reduced: boolean) => ({ duration: reduced ? DUR.tap : d, ease: EASE });
/** Enter/exit presets: spread one onto a motion element (`<motion.div {...m.pop}>`). */
export function motionPresets(reduced: boolean) {
  return {
    /** Dialogs and cards: a small rise and grow. */
    pop: {
      initial: reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 },
      animate: { opacity: 1, scale: 1, y: 0, transition: tr(DUR.base, reduced) },
      exit: { opacity: 0, scale: reduced ? 1 : 0.98, transition: tr(DUR.fast, reduced) },
    },
    /** Screens and scrims: opacity only. */
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: tr(DUR.fast, reduced) },
      exit: { opacity: 0, transition: tr(DUR.fast, reduced) },
    },
    /** Tab changes under mode="wait": out and in at tap length each (0.16 s in all); instant under Reduce motion. */
    swap: {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: reduced ? 0 : DUR.tap, ease: EASE } },
      exit: { opacity: 0, transition: { duration: reduced ? 0 : DUR.tap, ease: EASE } },
    },
    /** Into and out of the duel: a slower fade through the dark background, both ways. */
    dark: {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: tr(DUR.slow, reduced) },
      exit: { opacity: 0, transition: tr(DUR.slow, reduced) },
    },
    /** Sheets: in from their edge. */
    slide: (from: 'left' | 'right' | 'top' | 'bottom') => {
      const off = reduced ? {} : from === 'left' ? { x: -40 } : from === 'right' ? { x: 40 } : from === 'top' ? { y: -24 } : { y: 24 };
      return {
        initial: { opacity: 0, ...off },
        animate: { opacity: 1, x: 0, y: 0, transition: tr(DUR.slow, reduced) },
        exit: { opacity: 0, ...off, transition: tr(DUR.fast, reduced) },
      };
    },
    /** A plain transition of the given length, for anything else that moves. */
    t: (d: keyof typeof DUR = 'base') => tr(DUR[d], reduced),
  };
}
export type MotionPresets = ReturnType<typeof motionPresets>;
/** The presets for the current Reduce motion state. */
export function useMotion(): MotionPresets {
  const reduced = !useAnimationsOn();
  return useMemo(() => motionPresets(reduced), [reduced]);
}
