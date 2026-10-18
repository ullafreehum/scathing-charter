import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/game';
import { importFile, slotInfo, loadGame, savedWhen, type Slot } from '../save/storage';
import { formatDate } from '../engine';
import { C } from '../data';
import logo from '../assets/scathing-charter-logo.jpg';
import { Credits } from './Credits';

export function Title() {
  const { setScreen, continueAuto, load, meta, openSettings } = useGame();
  const [msg, setMsg] = useState<string | null>(null);
  const [credits, setCredits] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const auto = slotInfo('auto');
  return (
    <div className="relative z-10 min-h-full flex flex-col items-center justify-center p-6 text-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2 }}>
        <div className="fell italic text-ash-400 mb-2">Morrowind · 4E 4 · an Elder Scrolls trading game</div>
        <h1 className="m-0"><img src={logo} alt="The Scathing Charter" width={1400} height={781} className="logo-art mx-auto w-[min(92vw,760px)] h-auto" /></h1>
        <p className="fell text-lg text-parchment mt-4 max-w-xl mx-auto">Buy low, sell high, clear your debt to the Camonna Tong and buy a seat in the Scathing Charter, through the last calm year, the Red Year, and the Argonian invasion.</p>
      </motion.div>
      <motion.div className="flex flex-col gap-2 mt-8 w-72" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
        {auto && <button className="btn btn-ember py-2" onClick={() => continueAuto()}>Continue: {auto.name}, {formatDate(auto.day, false)}</button>}
        <button className="btn py-2" onClick={() => setScreen('new')}>New game</button>
        <button className="btn btn-ghost" onClick={() => setScreen('duel')} title="The magistrate's card hearing on its own, with nothing at stake">Card duel (practice)</button>
        {(['1', '2', '3'] as Slot[]).map(sl => { const i = slotInfo(sl); return i && <button key={sl} className="btn btn-ghost flex-col gap-0" onClick={() => { const g = loadGame(sl); if (g) load(g); }}><span>Slot {sl}: {i.name}, {formatDate(i.day, false)}</span><span className="text-xs text-ash-400 font-body normal-case tracking-normal">{C.locs[i.location]?.name ?? 'on the road'} · saved {savedWhen(i.savedAt)}</span></button>; })}
        <button className="btn btn-ghost" onClick={() => file.current?.click()}>Import save file…</button>
        <input ref={file} type="file" accept=".json,application/json" className="hidden" onChange={async e => {
          const f = e.target.files?.[0]; if (!f) return;
          try { load(await importFile(f)); } catch (err) { setMsg((err as Error).message); }
        }} />
        <button className="btn btn-ghost" onClick={() => setCredits(true)}>Credits &amp; sources</button>
        <button className="btn btn-ghost" onClick={openSettings}><span aria-hidden="true">⚙</span>Settings</button>
        {msg && <div className="text-danger text-sm">{msg}</div>}
        {meta.achievements.length > 0 && <div className="text-xs text-ash-400 mt-1">Achievements earned in all games: {meta.achievements.length}/{C.achievements.length}{meta.chronicleUnlocked && ' · Long Chronicle unlocked'}</div>}
      </motion.div>
      <p className="text-xs text-ash-400 mt-8 num">Version {__APP_VERSION__} (beta)</p>
      <p className="text-[.7rem] text-ash-400 mt-2 max-w-lg">An unofficial, non-commercial fan game. The Elder Scrolls and all related names are trademarks of ZeniMax Media / Bethesda Softworks; this project is not affiliated with or endorsed by them.</p>
      {credits && <Credits onClose={() => setCredits(false)} />}
    </div>
  );
}
