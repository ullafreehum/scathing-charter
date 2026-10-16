import { useEffect } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useGame } from '../store/game';
import { ERUPTION_DAY } from '../data/history';
import { C } from '../data';
import { AshLayer } from './AshLayer';
import { Title } from './Title';
import { NewGame } from './NewGame';
import { GameScreen } from './Game';
import { Overlays } from './Modals';
import { Codex } from './Codex';
import { startWind, stopWind } from '../audio/sfx';

function ashIntensity(day: number, region: string | undefined): number {
  let i = day < ERUPTION_DAY ? 0.12 + 0.75 * (day / ERUPTION_DAY) ** 2 : Math.max(0.55, 1.4 - (day - ERUPTION_DAY) / 400);
  if (region && !['vvardenfell', 'mainland', 'solstheim'].includes(region)) i *= 0.35;
  return i;
}

export function App() {
  const { screen, game, error, errorTick, clearError, meta, codex, closeCodex } = useGame();
  const region = game ? C.locs[game.player.location]?.region : undefined;
  const intensity = game ? ashIntensity(game.day, region) : 0.35;
  const ember = !!game?.world.flags.erupted;
  useEffect(() => { document.body.classList.toggle('large-text', meta.settings.largeText); }, [meta.settings.largeText]);
  useEffect(() => {
    if (screen === 'game' && meta.settings.sound) startWind(intensity); else stopWind();
  }, [screen, intensity, meta.settings.sound]);
  useEffect(() => { if (!error) return; const t = setTimeout(clearError, 3500); return () => clearTimeout(t); }, [error, errorTick, clearError]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && codex !== undefined) closeCodex(); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [codex, closeCodex]);
  return (
    <MotionConfig reducedMotion={meta.settings.motion ? 'user' : 'always'}>
    <div className="relative min-h-full" style={{ background: ember ? 'radial-gradient(ellipse at 60% -10%, #3a140a 0%, #0d0a09 60%)' : 'radial-gradient(ellipse at 50% -10%, #241a15 0%, #0d0a09 60%)' }}>
      <AshLayer intensity={intensity} ember={ember} enabled={meta.settings.motion} />
      <div className="vignette" /><div className="grain" />
      {screen === 'title' && <Title />}
      {screen === 'new' && <NewGame />}
      {screen === 'game' && game && <><GameScreen /><Overlays /></>}
      <Codex />
      <AnimatePresence>
        {error && <motion.div key={errorTick} role="alert" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] panel px-4 py-2 text-[#f0a49a] shake" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>{error}</motion.div>}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}
