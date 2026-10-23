import { useEffect, useLayoutEffect } from 'react';
import { useDesktopBridge } from './desktop';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useGame } from '../store/game';
import { ERUPTION_DAY } from '../data/history';
import { C } from '../data';
import { AshLayer } from './AshLayer';
import { TooltipLayer } from './Tooltip';
import { Title } from './Title';
import { NewGame } from './NewGame';
import { GameScreen } from './Game';
import { ConfirmDialog, Overlays } from './Modals';
import { PracticeDuel } from './Duel';
import { Codex } from './Codex';
import { Settings } from './Settings';
import { Toasts } from './Toasts';
import { TravelBanner } from './TravelBanner';
import { FxLayer, NightDip } from './fx';
import { applyAppearance, themeById } from './themes';
import { pauseAudio, setMusicMood, startWind, stopWind } from '../audio/sfx';
import { PHONE, back, exitApp, onBackButton, onPause, usePhone } from './phone';

function ashIntensity(day: number, region: string | undefined): number {
  let i = day < ERUPTION_DAY ? 0.12 + 0.75 * (day / ERUPTION_DAY) ** 2 : Math.max(0.55, 1.4 - (day - ERUPTION_DAY) / 400);
  if (region && !['vvardenfell', 'mainland', 'solstheim'].includes(region)) i *= 0.35;
  return i;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function App() {
  const { screen, game, error, errorTick, clearError, meta, codex, closeCodex, settingsOpen, closeSettings } = useGame();
  const st = meta.settings;
  const region = game ? C.locs[game.player.location]?.region : undefined;
  const intensity = game ? ashIntensity(game.day, region) : 0.35;
  const ember = !!game?.world.flags.erupted;
  const codexOpen = codex !== undefined;
  useDesktopBridge();
  useLayoutEffect(() => { applyAppearance(st.theme, st.font, st.textScale); }, [st.theme, st.font, st.textScale]);
  useLayoutEffect(() => { document.documentElement.dataset.anim = st.animations ? 'on' : 'off'; }, [st.animations]);
  useEffect(() => {
    if (screen === 'game' && st.sound) startWind(intensity); else stopWind();
  }, [screen, intensity, st.sound]);
  const mood = screen === 'duel' || (screen === 'game' && game?.duel) ? 2 : ember ? 1 : 0;
  useEffect(() => { setMusicMood(mood); }, [mood]);
  // Android: Back closes the dialog or sheet on top, then steps back through the tabs, then asks to quit to the title.
  useEffect(() => onBackButton(() => {
    const s = useGame.getState();
    if (s.ask) { s.answer(false); return; }
    if (s.settingsOpen) { s.closeSettings(); return; }
    if (s.codex !== undefined) { s.closeCodex(); return; }
    back(() => {
      if (s.screen === 'title') { exitApp(); return; }
      if (s.screen !== 'game') { s.setScreen('title'); return; }
      if (s.game?.duel) return; // a hearing runs to its end
      const tabs = usePhone.getState().tabs;
      if (tabs.length > 1) { tabs.pop(); s.setTab(tabs.pop() as typeof s.tab); return; }
      void s.confirm({ title: 'Quit to title?', text: 'Your game is saved as you play.', yes: 'Quit to title', no: 'Keep playing' }).then(y => { if (y) { tabs.length = 0; useGame.getState().setScreen('title'); } });
    });
  }), []);
  useEffect(() => onPause(pauseAudio), []);
  useEffect(() => { if (!error) return; const t = setTimeout(clearError, PHONE ? 2500 : 3500); return () => clearTimeout(t); }, [error, errorTick, clearError]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (settingsOpen) closeSettings(); else if (codexOpen) closeCodex();
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [codexOpen, closeCodex, settingsOpen, closeSettings]);
  return (
    <MotionConfig reducedMotion={st.animations ? 'user' : 'always'}>
    <div className="relative min-h-full" style={{ background: ember ? 'radial-gradient(ellipse at 60% -10%, color-mix(in oklab, var(--c-bg2) 70%, #b2401a) 0%, var(--c-bg) 60%)' : 'radial-gradient(ellipse at 50% -10%, var(--c-bg2) 0%, var(--c-bg) 60%)' }}>
      <AshLayer intensity={intensity} ember={ember} enabled={st.ash} color={themeById(st.theme).ash} />
      <div className="vignette" /><div className="grain" />
      {/* The dashboard eases back while the codex or settings sit on top of it. */}
      <motion.div className="relative min-h-full" style={{ transformOrigin: '50% 20%' }} initial={false}
        animate={codexOpen || settingsOpen ? { scale: 0.985 } : { scale: 1 }} transition={{ duration: 0.28, ease: EASE }}>
        {screen === 'title' && <Title />}
        {screen === 'new' && <NewGame />}
        {screen === 'duel' && <PracticeDuel />}
        {screen === 'game' && game && <GameScreen />}
      </motion.div>
      {screen === 'game' && game && <Overlays />}
      <AnimatePresence>{codexOpen && <Codex key="codex" />}</AnimatePresence>
      <AnimatePresence>{settingsOpen && <Settings key="settings" />}</AnimatePresence>
      {screen === 'game' && <Toasts />}
      {screen === 'game' && <TravelBanner />}
      {screen === 'game' && <NightDip />}
      <FxLayer />
      <ConfirmDialog />
      <TooltipLayer />
      <AnimatePresence>
        {error && <motion.div key={errorTick} role="alert" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] panel px-4 py-2 text-danger shake" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>{error}</motion.div>}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}
