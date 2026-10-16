import { useState } from 'react';
import { motion } from 'framer-motion';
import { C } from '../data';
import { routeOptions, MODE_LABEL, type GameState, type TravelMode } from '../engine';
import { useGame } from '../store/game';
import { themeById } from './themes';
import { CodexLink, Money, Section, StatusPill } from './widgets';

type Stroke = { stroke: string; dash?: string };
const DASH: Record<TravelMode, string | undefined> = { strider: '2 4', boat: '6 4', 'inner-sea': '6 4', 'sea-of-ghosts': '8 5', coastal: '6 4', caravan: undefined, road: undefined, barge: '3 3', guide: '1 5' };
const ROUTE_DARK: Record<TravelMode, string> = { strider: '#f0b06a', boat: '#8cc0da', 'inner-sea': '#8cc0da', 'sea-of-ghosts': '#c4e0ee', coastal: '#7fb2cc', caravan: '#c99e6c', road: '#dccaa2', barge: '#97bbb2', guide: '#c4aae6' };
const ROUTE_LIGHT: Record<TravelMode, string> = { strider: '#94520f', boat: '#23628a', 'inner-sea': '#23628a', 'sea-of-ghosts': '#36678a', coastal: '#2a6684', caravan: '#7a5430', road: '#5f4f33', barge: '#335f56', guide: '#5e3e94' };
const modeStyle = (m: TravelMode, light: boolean): Stroke => ({ stroke: (light ? ROUTE_LIGHT : ROUTE_DARK)[m], dash: DASH[m] });
const STATUS_FILL: Record<string, string> = { thriving: 'var(--c-good)', uneasy: 'var(--c-gold)', ruined: 'var(--c-accent)', rebuilding: 'var(--c-gold)', besieged: 'var(--c-bad)', sacked: 'var(--c-bad)', occupied: 'var(--c-dispute)', 'refugee-swollen': 'var(--c-info)', closed: 'var(--c-line)' };

const LEFT = new Set(['ebonheart', 'fort-frostmoth', 'aldruhn', 'narsis', 'stormhold']);
const MAINLAND = 'M0,120 L55,102 L115,108 L160,128 L230,132 L290,124 L350,128 L400,150 L440,175 L462,205 L455,250 L458,300 L478,350 L540,368 L610,368 L670,350 L715,300 L725,245 L715,195 L740,170 L800,180 L815,260 L790,330 L800,400 L770,470 L740,540 L712,620 L700,690 L705,722 L640,716 L580,726 L520,708 L470,692 L445,652 L420,632 L395,642 L370,682 L345,722 L290,742 L200,748 L100,738 L0,742 Z';
const VVARDENFELL = 'M498,195 C520,170 580,160 625,178 C660,190 690,205 678,240 C668,270 640,300 610,318 C590,330 555,335 535,325 C510,312 492,285 490,250 C488,225 490,205 498,195 Z';
const SOLSTHEIM = 'M455,70 C470,40 520,28 555,40 C580,52 578,85 556,100 C530,115 485,112 465,98 C452,90 450,80 455,70 Z';

export function MapView({ g }: { g: GameState }) {
  const act = useGame(s => s.act);
  const light = themeById(useGame(s => s.meta.settings.theme)).kind === 'light';
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
            <radialGradient id="sea" cx="50%" cy="40%"><stop offset="0" style={{ stopColor: 'color-mix(in oklab, var(--c-map-sea) 85%, white)' }} /><stop offset="1" style={{ stopColor: 'var(--c-map-sea)' }} /></radialGradient>
            <radialGradient id="plume"><stop offset="0" stopColor="#ff6a1a" stopOpacity=".55" /><stop offset=".4" stopColor="#7a2a10" stopOpacity=".35" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
            <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" style={{ stroke: 'var(--c-bad)' }} strokeWidth="3" strokeOpacity=".35" /></pattern>
            <filter id="rough"><feTurbulence baseFrequency=".02" numOctaves="3" result="t" /><feDisplacementMap in="SourceGraphic" in2="t" scale="6" /></filter>
          </defs>
          <rect width="1000" height="760" fill="url(#sea)" />
          <g filter="url(#rough)">
            <path d={MAINLAND} style={{ fill: 'var(--c-map-land)', stroke: 'var(--c-map-coast)' }} strokeWidth="1.5" />
            <path d={VVARDENFELL} style={{ fill: erupted ? 'color-mix(in oklab, var(--c-map-island) 70%, #9a2a10)' : 'var(--c-map-island)', stroke: 'var(--c-map-coast)' }} strokeWidth="1.5" />
            <path d={SOLSTHEIM} style={{ fill: 'color-mix(in oklab, var(--c-map-land) 80%, #c8d4dc)', stroke: 'var(--c-map-coast)' }} strokeWidth="1.5" />
            <ellipse cx="300" cy="470" rx="30" ry="19" style={{ fill: 'var(--c-map-sea)', stroke: 'var(--c-map-coast)' }} />
          </g>
          <g style={{ stroke: 'var(--c-map-label)' }} strokeOpacity=".25" strokeDasharray="4 6" fill="none">
            <path d="M440,175 C445,240 440,300 452,340 C455,400 452,440 455,470" /><path d="M0,330 C150,345 300,335 452,340" />
            <path d="M455,470 C560,455 660,445 770,465" /><path d="M455,470 C475,540 470,600 450,650" /><path d="M0,560 C150,575 280,600 395,642" />
          </g>
          <g className="h-display" style={{ fill: 'var(--c-map-label)' }} fillOpacity=".4" fontSize="22" letterSpacing="6">
            <text x="150" y="250">SKYRIM</text><text x="120" y="420">CYRODIIL</text><text x="650" y="430">MORROWIND</text><text x="560" y="610">BLACK MARSH</text><text x="140" y="660">ELSWEYR</text>
          </g>
          <g className="fell" style={{ fill: 'var(--c-info)' }} fillOpacity=".8" fontSize="17" fontStyle="italic">
            <text x="240" y="60">Sea of Ghosts</text><text x="555" y="356">Inner Sea</text><text x="390" y="705">Topal Bay</text><text x="548" y="194" style={{ fill: 'var(--c-map-label)' }}>Vvardenfell</text><text x="490" y="22" style={{ fill: 'var(--c-map-label)' }}>Solstheim</text>
          </g>
          {erupted && <circle cx="568" cy="238" r="140" fill="url(#plume)"><animate attributeName="r" values="130;150;130" dur="6s" repeatCount="indefinite" /></circle>}
          {war && <ellipse cx="610" cy="470" rx="150" ry="70" fill="url(#hatch)" />}
          {C.routeList.map(r => {
            const ov = g.world.routes[r.id] ?? {}; const closed = ov.closed ?? r.closed;
            if (closed) return null;
            const A = C.locs[r.a], B = C.locs[r.b]; const st = modeStyle(r.modes[0].mode, light);
            const active = r.a === here || r.b === here;
            const dead = g.world.status[r.a] === 'closed' || g.world.status[r.b] === 'closed';
            if (dead) return null;
            return <line key={r.id} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={st.stroke} strokeDasharray={st.dash} strokeWidth={active ? 2.8 : 1.4} strokeOpacity={active ? 1 : 0.5} />;
          })}
          {C.locList.map(L => {
            const st = g.world.status[L.id]; const isHere = L.id === here; const reachable = opts.some(o => o.dest === L.id);
            return (
              <g key={L.id} transform={`translate(${L.x},${L.y})`} style={{ cursor: reachable ? 'pointer' : 'default' }} onClick={() => reachable && setSel(L.id === sel ? null : L.id)}
                role={reachable ? 'button' : undefined} aria-label={`${L.name}${reachable ? ', reachable' : ''}`}>
                {isHere && <motion.circle r={14} fill="none" style={{ stroke: 'var(--c-accent)' }} strokeWidth={2} animate={{ r: [10, 17, 10], opacity: [1, 0.3, 1] }} transition={{ duration: 2.2, repeat: Infinity }} />}
                <circle r={st === 'closed' ? 5 : 7.5} style={{ fill: STATUS_FILL[st], stroke: sel === L.id ? 'var(--c-text)' : reachable ? 'var(--c-accent)' : 'var(--c-map-halo)' }} strokeWidth={reachable ? 2.2 : 1} />
                {st === 'closed' && <text x={-4} y={4} fontSize="10" style={{ fill: 'var(--c-muted)' }}>✕</text>}
                <text x={LEFT.has(L.id) ? -10 : 10} y={5} textAnchor={LEFT.has(L.id) ? 'end' : 'start'} fontSize="17" style={{ fill: st === 'closed' ? 'var(--c-muted)' : 'var(--c-map-label)', stroke: 'var(--c-map-halo)' }} strokeWidth="3.5" paintOrder="stroke" className="h-display">{L.name}</text>
              </g>
            );
          })}
        </svg>
        <div className="flex flex-wrap gap-3 text-xs text-ash-400 px-2 pb-1">
          {(['strider', 'inner-sea', 'sea-of-ghosts', 'caravan', 'road', 'barge', 'guide'] as TravelMode[]).map(m => <span key={m} className="flex items-center gap-1"><svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke={modeStyle(m, light).stroke} strokeDasharray={modeStyle(m, light).dash} strokeWidth="2.5" /></svg>{MODE_LABEL[m]}</span>)}
        </div>
      </div>
      <Section title={sel ? `To ${C.locs[sel].name}` : 'Destinations'} right={sel && <button className="btn btn-ghost" onClick={() => setSel(null)}>All</button>}>
        {sel && <div className="mb-2 text-sm"><StatusPill status={g.world.status[sel]} /> · <CodexLink id={`loc:${sel}`}>about {C.locs[sel].name}</CodexLink></div>}
        <div className="space-y-2 max-h-[560px] overflow-auto scroll-thin pr-1">
          {shown.map(o => (
            <div key={o.route.id + o.modeIndex} className="border-t border-ash-700/60 pt-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-bone">{C.locs[o.dest].name}</span>
                <span className="text-ash-400 text-xs">by <CodexLink id={`travel:${o.mode}`}>{MODE_LABEL[o.mode]}</CodexLink></span>
                <button className={`btn ml-auto ${g.player.cash < o.fare ? '' : 'btn-ember'}`} disabled={!!o.blocked} title={g.player.cash < o.fare ? 'You can’t pay the fare: work for your passage instead (+2 days, costs a little health)' : ''} onClick={() => act({ t: 'travel', route: o.route.id, mode: o.modeIndex })}>{g.player.cash < o.fare ? 'Work for passage' : 'Go'}</button>
              </div>
              <div className="text-xs text-ash-400">{o.days} day{o.days > 1 ? 's' : ''}{g.timeScale > 1 ? ` (${o.days * g.timeScale} calendar days)` : ''} · fare <Money v={o.fare} /> · danger {'▮'.repeat(o.risk)}{'▯'.repeat(Math.max(0, 6 - o.risk))}{o.blocked && <span className="text-danger"> · {o.blocked}</span>}</div>
              {o.route.note && <div className="text-xs fell italic text-parchment">{o.route.note}</div>}
            </div>
          ))}
          {!shown.length && <p className="text-sm text-ash-400">No road leaves this place.</p>}
        </div>
        <p className="text-xs text-ash-400 mt-3">Fares include a charge for heavy cargo. Higher danger means more trouble on the road; hired sellswords help.</p>
      </Section>
    </div>
  );
}
