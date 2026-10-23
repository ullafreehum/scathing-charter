import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/game';
import { FONTS, TEXT_SCALES, THEMES } from './themes';
import { desktop } from './desktop';
import { Credits } from './Credits';

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="border-t border-ash-600 pt-3 mt-3 first:border-0 first:mt-0 first:pt-0">
      <h3 className="h-display text-sm uppercase text-parchment">{title}</h3>
      {note && <p className="text-xs text-ash-400 mb-2">{note}</p>}
      <div className="mt-1">{children}</div>
    </section>
  );
}

export function Settings() {
  const { meta, setSettings, resetSettings, closeSettings } = useGame();
  // Desktop app only: the full-screen switch follows F11, Alt+Enter and Esc too.
  const [full, setFull] = useState(false);
  const [credits, setCredits] = useState(false);
  useEffect(() => { const d = desktop(); if (!d) return; d.isFullScreen().then(setFull); return d.onFullScreenChange(setFull); }, []);
  const s = meta.settings;
  const pick = (on: boolean) => `rounded-lg border-2 text-left transition-colors ${on ? 'border-ember' : 'border-ash-600 hover:border-ash-400'}`;
  return (
    <motion.div className="fixed inset-0 z-[55] scrim flex items-center justify-center p-3" onClick={closeSettings}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <motion.div role="dialog" aria-modal="true" aria-label="Settings" onClick={e => e.stopPropagation()}
        className="panel-solid w-full max-w-3xl max-h-[90dvh] overflow-auto scroll-thin p-5"
        initial={{ y: 16, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 10, scale: 0.98 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="h-display text-2xl text-bone">Settings</h2>
          <button className="btn btn-ember" onClick={closeSettings} autoFocus>Done</button>
        </div>

        <Group title="Sound">
          <label className="flex items-center gap-2"><input type="checkbox" checked={s.sound} onChange={e => setSettings({ sound: e.target.checked })} />Sound effects</label>
          <label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={s.music} onChange={e => setSettings({ music: e.target.checked })} />Music</label>
          <label className={`flex items-center gap-3 mt-2 ${s.sound || s.music ? '' : 'opacity-50'}`}>
            <span className="w-16 text-parchment">Volume</span>
            <input type="range" min={0} max={100} step={5} className="flex-1" aria-label="Volume" disabled={!s.sound && !s.music}
              value={Math.round(s.volume * 100)} onChange={e => setSettings({ volume: Number(e.target.value) / 100 })} />
            <span className="num w-12 text-right">{Math.round(s.volume * 100)}%</span>
          </label>
        </Group>

        <Group title="Colour theme" note="Each theme takes its colours from a region of Vvardenfell. All of them are tested for comfortable reading contrast.">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2" role="radiogroup" aria-label="Colour theme">
            {THEMES.map(t => (
              <button key={t.id} role="radio" aria-checked={s.theme === t.id} className={`${pick(s.theme === t.id)} p-2.5`}
                style={{ background: `linear-gradient(180deg, ${t.p.panelTop}, ${t.p.panelBottom})`, color: t.p.text }} onClick={() => setSettings({ theme: t.id })}>
                <span className="flex gap-1 mb-1.5" aria-hidden="true">{[t.p.bg, t.p.accent, t.p.gold, t.p.good, t.p.bad, t.p.info].map((c, i) =>
                  <span key={i} className="h-4 w-4 rounded-full" style={{ background: c, boxShadow: `0 0 0 1px ${t.p.line}` }} />)}</span>
                <span className="block font-semibold">{t.name} <span className="text-xs font-normal" style={{ color: t.p.muted }}>({t.kind})</span></span>
                <span className="block text-xs" style={{ color: t.p.muted }}>{t.region}</span>
              </button>
            ))}
          </div>
        </Group>

        <Group title="Font">
          <div className="grid sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Font">
            {FONTS.map(f => (
              <button key={f.id} role="radio" aria-checked={s.font === f.id} className={`${pick(s.font === f.id)} p-2.5 bg-ash-900`} onClick={() => setSettings({ font: f.id })}>
                <span className="block text-bone text-lg" style={{ fontFamily: f.display }}>{f.caps ? f.name.toUpperCase() : f.name}</span>
                <span className="block text-parchment" style={{ fontFamily: f.body }}>Balmora, 1 Morning Star: kwama eggs 14 septims.</span>
                <span className="block text-xs text-ash-400">{f.note}</span>
              </button>
            ))}
          </div>
        </Group>

        <Group title="Text and UI size" note="The game already grows with your screen; this scales it further.">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Text and UI size">
            {TEXT_SCALES.map(x => (
              <button key={x} role="radio" aria-checked={Math.abs(s.textScale - x) < 0.001} aria-label={`Text size ${Math.round(x * 100)}%`}
                className={`${pick(Math.abs(s.textScale - x) < 0.001)} px-3 py-1 bg-ash-900 text-bone`} onClick={() => setSettings({ textScale: x })}>
                <span style={{ fontSize: `${x}em` }}>Aa</span> <span className="num text-xs text-ash-400">{Math.round(x * 100)}%</span>
              </button>
            ))}
          </div>
        </Group>

        {desktop() && <Group title="Window">
          <label className="flex items-center gap-2"><input type="checkbox" checked={full} onChange={e => desktop()?.setFullScreen(e.target.checked)} />Full screen (F11 or Alt+Enter)</label>
        </Group>}

        <Group title="Motion">
          <label className="flex items-center gap-2"><input type="checkbox" checked={s.ash} onChange={e => setSettings({ ash: e.target.checked })} />Falling ash</label>
          <label className="flex items-center gap-2 mt-1"><input type="checkbox" checked={s.animations} onChange={e => setSettings({ animations: e.target.checked })} />Animations (sliding panels and cards)</label>
        </Group>

        <Group title="Help">
          <label className="flex items-center gap-2"><input type="checkbox" checked={s.hints} onChange={e => setSettings({ hints: e.target.checked })} />Show next-step hints under the top bar</label>
        </Group>

        <div className="flex items-center justify-between mt-5 pt-3 border-t border-ash-600">
          <span className="text-xs text-ash-400">Settings are saved on this computer and apply to every game. · The Scathing Charter v{__APP_VERSION__}</span>
          <span className="flex gap-2">
            <button className="btn btn-ghost" onClick={() => setCredits(true)}>Credits &amp; sources</button>
            <button className="btn btn-ghost" onClick={resetSettings}>Reset to defaults</button>
          </span>
        </div>
        {credits && <Credits onClose={() => setCredits(false)} />}
      </motion.div>
    </motion.div>
  );
}
