// Whether decorative motion should play: the Animations setting and the system's reduced-motion preference.
import { useGame } from '../store/game';

const prefersReduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
/** For event handlers. */
export function animationsOn(): boolean { return useGame.getState().meta.settings.animations && !prefersReduced(); }
/** For components. */
export function useAnimationsOn(): boolean { return useGame(s => s.meta.settings.animations) && !prefersReduced(); }
