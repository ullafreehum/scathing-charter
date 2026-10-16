import { useState } from 'react';
import { motion } from 'framer-motion';
import { C } from '../data';
import { routeOptions, MODE_LABEL, type GameState, type TravelMode } from '../engine';
import { useGame } from '../store/game';
import { CodexLink, Money, Section, StatusPill } from './widgets';

const MODE_STYLE: Record<TravelMode, { stroke: string; dash?: string }> = {
  strider: { stroke: '#e3a35e', dash: '2 4' }, boat: { stroke: '#7fb0c9', dash: '6 4' }, 'inner-sea': { stroke: '#7fb0c9', dash: '6 4' },
  'sea-of-ghosts': { stroke: '#b8d6e6', dash: '8 5' }, coastal: { stroke: '#6f9fb8', dash: '6 4' }, caravan: { stroke: '#b08a5e' },
  road: { stroke: '#cbb894' }, barge: { stroke: '#88a7a0', dash: '3 3' }, guide: { stroke: '#b49ad6', dash: '1 5' },
};
const STATUS_FILL: Record<string, string> = { thriving: '#87a565', uneasy: '#d8ad52', ruined: '#ec7a32', rebuilding: '#d8ad52', besieged: '#e2584a', sacked: '#9a2f22', occupied: '#b49ad6', 'refugee-swollen': '#93b8cc', closed: '#46382f' };

const LEFT = new Set(['ebonheart', 'fort-frostmoth', 'aldruhn', 'narsis', 'stormhold']);
const MAINLAND = 'M0,120 L55,102 L115,108 L160,128 L230,132 L290,124 L350,128 L400,150 L440,175 L462,205 L455,250 L458,300 L478,350 L540,368 L610,368 L670,350 L715,300 L725,245 L715,195 L740,170 L800,180 L815,260 L790,330 L800,400 L770,470 L740,540 L712,620 L700,690 L705,722 L640,716 L580,726 L520,708 L470,692 L445,652 L420,632 L395,642 L370,682 L345,722 L290,742 L200,748 L100,738 L0,742 Z';
const VVARDENFELL = 'M498,195 C520,170 580,160 625,178 C660,190 690,205 678,240 C668,270 640,300 610,318 C590,330 555,335 535,325 C510,312 492,285 490,250 C488,225 490,205 498,195 Z';
const SOLSTHEIM = 'M455,70 C470,40 520,28 555,40 C580,52 578,85 556,100 C530,115 485,112 465,98 C452,90 450,80 455,70 Z';

export function MapView({ g }: { g: GameState }) {
  const act = useGame(s => s.act);
  const [sel, setSel] = useState<string | null>(null);
  const opts = routeOptions(g);
  const here = g.player.location;
  const shown = sel ? opts.filter(o => o.dest === sel) : opts;
  const erupted = !!g.world.flags.erupted; const war = (g.world.flags.war ?? 0) > 0;
  return (
    <div className="grid xl:grid-cols-[1fr_360px] gap-3">
      <div className="panel p-2 overflow-hidden">
        <svg viewBox="0 0 1000 760" className="w-full h-auto" role="img" aria-label="Map of eastern Tamriel">
          <defs>
            <radialGradient id="sea" cx="50%" cy="40%"><stop offset="0" stopColor="#1d2a33" /><stop offset="1" stopColor="#0e1418" /></radialGradient>
            <radialGradient id="plume"><stop offset="0" stopColor="#ff6a1a" stopOpacity=".55" /><stop offset=".4" stopColor="#7a2a10" stopOpacity=".35" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
            <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#9a2f22" strokeWidth="3" strokeOpacity=".35" /></pattern>
            <filter id="rough"><feTurbulence baseFrequency=".02" numOctaves="3" result="t" /><feDisplacementMap in="SourceGraphic" in2="t" scale="6" /></filter>
          </defs>
          <rect width="1000" height="760" fill="url(#sea)" />
          <g filter="url(#rough)">
            <path d={MAINLAND} fill="#3a2f26" stroke="#8f744a" strokeWidth="1.5" />
            <path d={VVARDENFELL} fill={erupted ? '#3b2420' : '#40332a'} stroke="#8f744a" strokeWidth="1.5" />
            <path d={SOLSTHEIM} fill="#3c3631" stroke="#8f744a" strokeWidth="1.5" />
            <ellipse cx="300" cy="470" rx="30" ry="19" fill="#1d2a33" stroke="#8f744a" />
          </g>
          <g stroke="#d8c7a3" strokeOpacity=".25" strokeDasharray="4 6" fill="none">
            <path d="M440,175 C445,240 440,300 452,340 C455,400 452,440 455,470" /><path d="M0,330 C150,345 300,335 452,340" />
            <path d="M455,470 C560,455 660,445 770,465" /><path d="M455,470 C475,540 470,600 450,650" /><path d="M0,560 C150,575 280,600 395,642" />
          </g>
          <g className="h-display" fill="#d8c7a3" fillOpacity=".35" fontSize="22" letterSpacing="6">
            <text x="150" y="250">SKYRIM</text><text x="120" y="420">CYRODIIL</text><text x="650" y="430">MORROWIND</text><text x="560" y="610">BLACK MARSH</text><text x="140" y="660">ELSWEYR</text>
          </g>
          <g className="fell" fill="#93b8cc" fillOpacity=".5" fontSize="17" fontStyle="italic">
            <text x="240" y="60">Sea of Ghosts</text><text x="555" y="356">Inner Sea</text><text x="390" y="705">Topal Bay</text><text x="548" y="194" fill="#d8c7a3">Vvardenfell</text><text x="490" y="22" fill="#d8c7a3">Solstheim</text>
          </g>
          {erupted && <circle cx="568" cy="238" r="140" fill="url(#plume)"><animate attributeName="r" values="130;150;130" dur="6s" repeatCount="indefinite" /></circle>}
          {war && <ellipse cx="610" cy="470" rx="150" ry="70" fill="url(#hatch)" />}
          {C.routeList.map(r => {
            const ov = g.world.routes[r.id] ?? {}; const closed = ov.closed ?? r.closed;
            if (closed) return null;
            const A = C.locs[r.a], B = C.locs[r.b]; const st = MODE_STYLE[r.modes[0].mode];
            const active = r.a === here || r.b === here;
            const dead = g.world.status[r.a] === 'closed' || g.world.status[r.b] === 'closed';
            if (dead) return null;
            return <line key={r.id} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={st.stroke} strokeDasharray={st.dash} strokeWidth={active ? 2.6 : 1.2} strokeOpacity={active ? 0.95 : 0.35} />;
          })}
          {C.locList.map(L => {
            const st = g.world.status[L.id]; const isHere = L.id === here; const reachable = opts.some(o => o.dest === L.id);
            return (
              <g key={L.id} transform={`translate(${L.x},${L.y})`} style={{ cursor: reachable ? 'pointer' : 'default' }} onClick={() => reachable && setSel(L.id === sel ? null : L.id)}
                role={reachable ? 'button' : undefined} aria-label={`${L.name}${reachable ? ', reachable' : ''}`}>
                {isHere && <motion.circle r={14} fill="none" stroke="#ec7a32" strokeWidth={2} animate={{ r: [10, 17, 10], opacity: [1, 0.3, 1] }} transition={{ duration: 2.2, repeat: Infinity }} />}
                <circle r={st === 'closed' ? 5 : 7.5} fill={STATUS_FILL[st]} stroke={sel === L.id ? '#fff' : reachable ? '#ec7a32' : '#0d0a09'} strokeWidth={reachable ? 2 : 1} />
                {st === 'closed' && <text x={-4} y={4} fontSize="10" fill="#8a7a6c">✕</text>}
                <text x={LEFT.has(L.id) ? -10 : 10} y={5} textAnchor={LEFT.has(L.id) ? 'end' : 'start'} fontSize="17" fill={st === 'closed' ? '#6d5f53' : '#eadfc8'} stroke="#0d0a09" strokeWidth="3" paintOrder="stroke" className="h-display">{L.name}</text>
              </g>
            );
          })}
        </svg>
        <div className="flex flex-wrap gap-3 text-xs text-ash-400 px-2 pb-1">
          {(['strider', 'inner-sea', 'sea-of-ghosts', 'caravan', 'road', 'barge', 'guide'] as TravelMode[]).map(m => <span key={m} className="flex items-center gap-1"><svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke={MODE_STYLE[m].stroke} strokeDasharray={MODE_STYLE[m].dash} strokeWidth="2" /></svg>{MODE_LABEL[m]}</span>)}
        </div>
      </div>
      <Section title={sel ? `To ${C.locs[sel].name}` : 'Departures'} right={sel && <button className="btn btn-ghost" onClick={() => setSel(null)}>All</button>}>
        {sel && <div className="mb-2 text-sm"><StatusPill status={g.world.status[sel]} /> · <CodexLink id={`loc:${sel}`}>about {C.locs[sel].name}</CodexLink></div>}
        <div className="space-y-2 max-h-[560px] overflow-auto scroll-thin pr-1">
          {shown.map(o => (
            <div key={o.route.id + o.modeIndex} className="border-t border-ash-700/60 pt-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-bone">{C.locs[o.dest].name}</span>
                <span className="text-ash-400 text-xs">by <CodexLink id={`travel:${o.mode}`}>{MODE_LABEL[o.mode]}</CodexLink></span>
                <button className="btn btn-ember ml-auto" disabled={!!o.blocked || g.player.cash < o.fare} onClick={() => act({ t: 'travel', route: o.route.id, mode: o.modeIndex })}>Go</button>
              </div>
              <div className="text-xs text-ash-400">{o.days} day{o.days > 1 ? 's' : ''}{g.timeScale > 1 ? ` (${o.days * g.timeScale} calendar days)` : ''} · fare <Money v={o.fare} /> · danger {'▮'.repeat(o.risk)}{'▯'.repeat(Math.max(0, 6 - o.risk))}{o.blocked && <span className="text-[#e2584a]"> · {o.blocked}</span>}</div>
              {o.route.note && <div className="text-xs fell italic text-parchment/70">{o.route.note}</div>}
            </div>
          ))}
          {!shown.length && <p className="text-sm text-ash-400">No road leaves this place.</p>}
        </div>
        <p className="text-xs text-ash-400 mt-3">Fares include freight for your load. Danger raises the chance of trouble on the road; sellswords lower it.</p>
      </Section>
    </div>
  );
}
