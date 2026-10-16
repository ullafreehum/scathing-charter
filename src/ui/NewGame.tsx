import { useState } from 'react';
import { motion } from 'framer-motion';
import { C, suggestName } from '../data';
import { useGame } from '../store/game';
import { DIFFICULTY, type Difficulty, type Mode } from '../engine';
import { Money } from './widgets';

const randSeed = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export function NewGame() {
  const { start, setScreen, meta } = useGame();
  const [bg, setBg] = useState(C.backgroundList[0].id);
  const [name, setName] = useState(() => suggestName('Dunmer', Math.random));
  const [diff, setDiff] = useState<Difficulty>('tong');
  const [seed, setSeed] = useState(randSeed);
  const [mode, setMode] = useState<Mode>('red-year');
  const pick = (id: string) => { setBg(id); setName(suggestName(C.backgrounds[id].race, Math.random)); };
  return (
    <div className="relative z-10 max-w-5xl mx-auto p-4 sm:p-8">
      <h2 className="h-display text-3xl text-bone mb-1">New game</h2>
      <p className="text-parchment mb-5">Pick a character. You start in Balmora on 1 Morning Star 4E 4, owing money to the Camonna Tong.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {C.backgroundList.map(b => (
          <motion.button key={b.id} whileHover={{ y: -2 }} onClick={() => pick(b.id)} aria-pressed={bg === b.id}
            className={`panel p-3 text-left transition ${bg === b.id ? 'ring-2 ring-ember' : 'hover:ring-1 hover:ring-ash-400'}`}>
            <div className="h-display text-bone">{b.name}</div>
            <div className="text-xs text-gold mb-1">{b.race}</div>
            <p className="text-sm text-parchment mb-2">{b.text}</p>
            <div className="text-sm text-moss"><span className="font-semibold">+</span> {b.perk}</div>
            <div className="text-sm text-danger"><span className="font-semibold">−</span> {b.burden}</div>
          </motion.button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-4 mt-5">
        <div className="panel p-3">
          <label className="block text-xs uppercase h-display text-ash-400 mb-1" htmlFor="pname">Name</label>
          <div className="flex gap-2"><input id="pname" className="input" value={name} onChange={e => setName(e.target.value)} maxLength={40} />
            <button className="btn" onClick={() => setName(suggestName(C.backgrounds[bg].race, Math.random))} title="Suggest a name by race convention">↻</button></div>
          <label className="block text-xs uppercase h-display text-ash-400 mt-3 mb-1" htmlFor="pseed">World seed (optional)</label>
          <div className="flex gap-2"><input id="pseed" className="input num" value={seed} onChange={e => setSeed(e.target.value)} maxLength={24} /><button className="btn" onClick={() => setSeed(randSeed())} title="New random seed">↻</button></div>
          <p className="text-xs text-ash-400 mt-1">The same seed gives the same world. Share it to race a friend.</p>
        </div>
        <div className="panel p-3">
          <div className="text-xs uppercase h-display text-ash-400 mb-1">Difficulty</div>
          {(Object.keys(DIFFICULTY) as Difficulty[]).map(d => (
            <label key={d} className="flex items-center gap-2 text-sm py-0.5">
              <input type="radio" name="diff" checked={diff === d} onChange={() => setDiff(d)} />
              <span className="w-40">{d === 'fair' ? 'Easy (Fair Terms)' : d === 'tong' ? 'Normal (Tong Terms)' : 'Hard (Blood Terms)'}</span>
              <span className="text-ash-400">start with <Money v={DIFFICULTY[d].cash} />, owe <Money v={DIFFICULTY[d].debt} /> at {(DIFFICULTY[d].rate * 100).toFixed(1)}% a day</span>
            </label>
          ))}
          <div className="text-xs uppercase h-display text-ash-400 mt-3 mb-1">Campaign</div>
          <label className="flex items-center gap-2 text-sm"><input type="radio" checked={mode === 'red-year'} onChange={() => setMode('red-year')} />The Red Year (4E 4 – 4E 6)</label>
          <label className={`flex items-center gap-2 text-sm ${meta.chronicleUnlocked ? '' : 'opacity-40'}`} title={meta.chronicleUnlocked ? '' : 'Finish the Red Year alive and with a positive net worth to unlock'}>
            <input type="radio" disabled={!meta.chronicleUnlocked} checked={mode === 'long-chronicle'} onChange={() => setMode('long-chronicle')} />The Long Chronicle (4E 7 → Titus Mede I’s coronation){!meta.chronicleUnlocked && ' 🔒'}</label>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button className="btn btn-ghost" onClick={() => setScreen('title')}>Back</button>
        <button className="btn btn-ember px-6 py-2" disabled={!name.trim()} onClick={() => start({ seed: seed || randSeed(), backgroundId: bg, name: name.trim(), difficulty: diff, mode })}>Start game</button>
      </div>
    </div>
  );
}
