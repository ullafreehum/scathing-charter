import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { animate, motion } from 'framer-motion';
import { C } from '../data';
import { branchKey, routeOptions, MODE_LABEL, type GameState, type RouteOption, type TravelMode } from '../engine';
import { useGame } from '../store/game';
import { CodexLink, Money, Section, StatusPill } from './widgets';
import { themeById } from './themes';
import { travelWarnings } from './hints';
import { ago, outlook } from './prices';
import { planRoute, type RoutePlan } from './route';
import { BORDERS, ISLES, LAKES, MAINLAND, MARSH, MORROWIND_REGION, MOUNTAINS, RED_MOUNTAIN, RIVERS, SOLSTHEIM, VVARDENFELL } from './mapShapes';

type Stroke = { stroke: string; dash?: string };
const DASH: Record<TravelMode, string | undefined> = { strider: '2 4', boat: '6 4', 'inner-sea': '6 4', 'sea-of-ghosts': '8 5', coastal: '6 4', caravan: undefined, road: undefined, barge: '3 3', guide: '1 5' };
const ROUTE_DARK: Record<TravelMode, string> = { strider: '#f0b06a', boat: '#8cc0da', 'inner-sea': '#8cc0da', 'sea-of-ghosts': '#c4e0ee', coastal: '#7fb2cc', caravan: '#c99e6c', road: '#dccaa2', barge: '#97bbb2', guide: '#c4aae6' };
const ROUTE_LIGHT: Record<TravelMode, string> = { strider: '#94520f', boat: '#23628a', 'inner-sea': '#23628a', 'sea-of-ghosts': '#36678a', coastal: '#2a6684', caravan: '#7a5430', road: '#5f4f33', barge: '#335f56', guide: '#5e3e94' };
const modeStyle = (m: TravelMode, light: boolean): Stroke => ({ stroke: (light ? ROUTE_LIGHT : ROUTE_DARK)[m], dash: DASH[m] });
const STATUS_FILL: Record<string, string> = { thriving: 'var(--c-good)', uneasy: 'var(--c-gold)', ruined: 'var(--c-accent)', rebuilding: 'var(--c-gold)', besieged: 'var(--c-bad)', sacked: 'var(--c-bad)', occupied: 'var(--c-dispute)', 'refugee-swollen': 'var(--c-info)', closed: 'var(--c-line)' };

// Labels sit to the right of the dot unless that would collide with a neighbour.
const LEFT = new Set(['ebonheart', 'fort-frostmoth', 'blacklight', 'cheydinhal', 'stormhold']);

// ---- camera: centre + width in map units; height follows the box's aspect ratio
const MAP_W = 1000, MAP_H = 760;
type Cam = { cx: number; cy: number; w: number };
type Box = { x0: number; y0: number; x1: number; y1: number };
const VIEWS = { vvardenfell: { label: 'Vvardenfell', box: { x0: 470, y0: 150, x1: 720, y1: 345 } }, morrowind: { label: 'Morrowind', box: { x0: 395, y0: 15, x1: 850, y1: 510 } }, all: { label: 'All Tamriel', box: { x0: 0, y0: 0, x1: MAP_W, y1: MAP_H } } } as const;
type ViewId = keyof typeof VIEWS | 'routes';
const clampCam = (c: Cam, aspect: number): Cam => {
  const w = Math.max(170, Math.min(1400, c.w)), h = w * aspect;
  const cx = w >= MAP_W ? MAP_W / 2 : Math.max(w / 2, Math.min(MAP_W - w / 2, c.cx));
  const cy = h >= MAP_H ? MAP_H / 2 : Math.max(h / 2, Math.min(MAP_H - h / 2, c.cy));
  return { cx, cy, w };
};
const fit = (b: Box, aspect: number): Cam => clampCam({ cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2, w: Math.max(b.x1 - b.x0, (b.y1 - b.y0) / aspect) }, aspect);

// ---- map markers (toggled under the map; remembered in this browser)
type Marker = 'contracts' | 'debt' | 'banks' | 'heal' | 'profit';
const MARKERS: { id: Marker; label: string; glyph: string; color: string }[] = [
  { id: 'contracts', label: 'Contracts', glyph: 'C', color: 'var(--c-gold)' },
  { id: 'debt', label: 'Pay debt', glyph: 'D', color: 'var(--c-bad)' },
  { id: 'banks', label: 'Banks', glyph: 'B', color: 'var(--c-info)' },
  { id: 'heal', label: 'Healing', glyph: '+', color: 'var(--c-good)' },
  { id: 'profit', label: 'Cargo sells higher', glyph: '↑', color: 'var(--c-good)' },
];
const MARKER_KEY = 'ashfall-ledger/ui/map-markers';
function readMarkers(): Set<Marker> {
  try { const t = localStorage.getItem(MARKER_KEY); if (t) return new Set(JSON.parse(t) as Marker[]); } catch { /* storage blocked */ }
  return new Set<Marker>(['contracts', 'debt', 'profit']);
}

interface Dest { id: string; options: RouteOption[] }
const bars = (risk: number) => `${'▮'.repeat(risk)}${'▯'.repeat(Math.max(0, 6 - risk))}`;

function Outlook({ g, dest }: { g: GameState; dest: string }) {
  const o = outlook(g, dest);
  const carrying = Object.keys(g.player.cargo).length > 0;
  if (!o) return <div className="text-xs text-ash-400">Prices there: unknown (you have not been there yet).</div>;
  const diff = o.cargoThere - o.cargoHere;
  return (
    <div className="text-xs text-parchment">
      <span className="text-ash-400">Prices seen {ago(o.age)}:</span>
      {carrying && <> your cargo would fetch about <Money v={o.cargoThere} /> there <span className={diff >= 0 ? 'text-moss' : 'text-danger'}>({diff >= 0 ? '+' : ''}{diff.toLocaleString('en-US')} vs here)</span>{o.unsellable > 0 && <span className="text-ash-400"> · {o.unsellable} unsold</span>}.</>}
      {o.runs.length > 0 && <div>Buy here, sell there: {o.runs.map(r => `${C.goods[r.good].name} +${r.gain}`).join(', ')} (each).</div>}
      {!carrying && !o.runs.length && <> nothing here sells for more there.</>}
    </div>
  );
}

/** `side`: where the destination list goes (the left column of the game screen); beside the map if not given. */
export function MapView({ g, side }: { g: GameState; side?: HTMLElement | null }) {
  const act = useGame(s => s.act);
  const plan = useGame(s => s.plan); const setPlan = useGame(s => s.setPlan);
  const light = themeById(useGame(s => s.meta.settings.theme)).kind === 'light';
  const animOn = useGame(s => s.meta.settings.animations);
  const [sel, setSel] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [markers, setMarkers] = useState<Set<Marker>>(readMarkers);
  const here = g.player.location;
  const opts = routeOptions(g);
  const byDest = new Map<string, RouteOption[]>();
  for (const o of opts) byDest.set(o.dest, [...(byDest.get(o.dest) ?? []), o]);
  const dests: Dest[] = [...byDest].map(([id, options]) => ({ id, options }))
    .sort((a, b) => a.options[0].days - b.options[0].days || C.locs[a.id].name.localeCompare(C.locs[b.id].name));
  const reach = new Set(byDest.keys());
  const erupted = !!g.world.flags.erupted; const war = (g.world.flags.war ?? 0) > 0;
  const travel = (o: RouteOption) => act({ t: 'travel', route: o.route.id, mode: o.modeIndex });

  // ---- size of the map box and the camera
  const box = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ cw: 0, ch: 0 });
  useLayoutEffect(() => {
    const el = box.current; if (!el) return;
    const measure = () => setSize({ cw: el.clientWidth, ch: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const aspect = size.cw ? size.ch / size.cw : 0.62;
  const routesBox = (): Box => {
    const pts = [here, ...reach].map(id => C.locs[id]).filter(Boolean);
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    return { x0: Math.min(...xs) - 60, y0: Math.min(...ys) - 45, x1: Math.max(...xs) + 110, y1: Math.max(...ys) + 45 };
  };
  const [cam, setCam] = useState<Cam | null>(null);
  const [view, setView] = useState<ViewId | null>('routes');
  const camRef = useRef<Cam | null>(null); camRef.current = cam;
  const anim = useRef<{ stop(): void } | null>(null);
  useEffect(() => { if (size.cw && !camRef.current) setCam(fit(routesBox(), size.ch / size.cw)); }); // first measurement only
  const c = clampCam(cam ?? fit(VIEWS.all.box, aspect), aspect);
  const vb = { x: c.cx - c.w / 2, y: c.cy - (c.w * aspect) / 2, w: c.w, h: c.w * aspect };
  const u = size.cw ? vb.w / size.cw : 1; // map units per screen pixel: keeps dots and labels a constant size
  const toPx = (x: number, y: number) => ({ x: ((x - vb.x) / vb.w) * size.cw, y: ((y - vb.y) / vb.h) * size.ch });

  const goTo = useCallback((target: Cam, id: ViewId | null) => {
    setView(id); anim.current?.stop();
    const from = camRef.current;
    if (!from || !animOn) { setCam(target); return; }
    anim.current = animate(0, 1, { duration: 0.45, ease: [0.22, 1, 0.36, 1], onUpdate: t => setCam({ cx: from.cx + (target.cx - from.cx) * t, cy: from.cy + (target.cy - from.cy) * t, w: from.w + (target.w - from.w) * t }) });
  }, [animOn]);
  const zoomAt = useCallback((f: number, fx = 0.5, fy = 0.5) => {
    const cur = camRef.current; if (!cur || !box.current) return;
    const a = box.current.clientHeight / box.current.clientWidth;
    const w2 = Math.max(170, Math.min(1400, cur.w * f));
    const x0 = cur.cx - cur.w / 2 + fx * cur.w, y0 = cur.cy - (cur.w * a) / 2 + fy * cur.w * a;
    anim.current?.stop(); setView(null);
    setCam(clampCam({ cx: x0 - fx * w2 + w2 / 2, cy: y0 - fy * w2 * a + (w2 * a) / 2, w: w2 }, a));
  }, []);

  // wheel zoom (non-passive, so the page does not scroll) and drag to pan
  useEffect(() => {
    const el = box.current; if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('[data-card]')) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.deltaY > 0 ? 1.15 : 1 / 1.15, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);
  const drag = useRef<{ x: number; y: number; cam: Cam; moved: boolean; id: number } | null>(null);
  const dragged = useRef(false);
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-card]') || !camRef.current) return;
    dragged.current = false;
    drag.current = { x: e.clientX, y: e.clientY, cam: camRef.current, moved: false, id: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d || !box.current) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
    if (!d.moved) { d.moved = true; dragged.current = true; box.current.setPointerCapture(d.id); anim.current?.stop(); setView(null); }
    const k = d.cam.w / box.current.clientWidth;
    setCam(clampCam({ cx: d.cam.cx - dx * k, cy: d.cam.cy - dy * k, w: d.cam.w }, box.current.clientHeight / box.current.clientWidth));
  };
  const endDrag = () => { drag.current = null; };
  const pick = (id: string) => { if (dragged.current) return; setSel(s => (s === id ? null : id)); };

  // keys: 1–9 pick a destination (then Enter goes), Esc closes the card
  const focusGo = useRef(false);
  const codexOpen = useGame(s => s.codex !== undefined || s.settingsOpen);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (codexOpen || g.pending || g.inbox.length || e.ctrlKey || e.metaKey || e.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName)) return;
      if (e.key === 'Escape' && sel) { setSel(null); return; }
      const n = Number(e.key);
      if (n >= 1 && n <= 9 && dests[n - 1]) { focusGo.current = true; setSel(dests[n - 1].id); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  });
  useEffect(() => { if (focusGo.current) { focusGo.current = false; card.current?.querySelector<HTMLButtonElement>('button[data-go]:not(:disabled)')?.focus(); } }, [sel]);

  const toggleMarker = (m: Marker) => setMarkers(prev => {
    const next = new Set(prev); if (next.has(m)) next.delete(m); else next.add(m);
    try { localStorage.setItem(MARKER_KEY, JSON.stringify([...next])); } catch { /* storage blocked */ }
    return next;
  });
  const badges = (id: string) => {
    const L = C.locs[id]; const out: typeof MARKERS = [];
    if (markers.has('contracts') && g.contracts.some(k => k.destination === id)) out.push(MARKERS[0]);
    if (markers.has('debt') && !g.note.cleared && (g.note.seat === id || g.note.agents.includes(id))) out.push(MARKERS[1]);
    if (markers.has('banks') && (['hlaalu', 'eec'] as const).some(h => g.world.branches[branchKey(h, id)] === 'open')) out.push(MARKERS[2]);
    if (markers.has('heal') && (L.temple || L.shrine) && g.world.status[id] !== 'closed') out.push(MARKERS[3]);
    return out;
  };
  const cargoGain = (id: string) => {
    if (!markers.has('profit') || id === here || !Object.keys(g.player.cargo).length) return 0;
    const o = outlook(g, id); return o ? o.cargoThere - o.cargoHere : 0;
  };

  const planned = plan && plan !== here ? planRoute(g, plan) : null;
  const preview = sel && !reach.has(sel) && sel !== here ? planRoute(g, sel) : null;
  const hot = new Set<string>();
  for (const o of opts) if (o.dest === hover || o.dest === sel) hot.add(o.route.id);
  const pathLine = (p: RoutePlan | null) => (p ? p.path.map(id => `${C.locs[id].x},${C.locs[id].y}`).join(' ') : '');

  // ---- the travel card for the selected town
  const S = sel ? C.locs[sel] : undefined;
  let cardStyle: CSSProperties = {};
  if (S && size.cw) {
    const p = toPx(S.x, S.y);
    if (size.cw < 640) cardStyle = { left: 8, right: 8, bottom: 8, maxHeight: '62%' };
    else {
      const top = Math.max(8, Math.min(p.y - 40, size.ch - 280));
      cardStyle = p.x > size.cw * 0.55 ? { right: Math.max(8, size.cw - p.x + 22), top, width: 310, maxHeight: size.ch - 16 } : { left: Math.max(8, p.x + 22), top, width: 310, maxHeight: size.ch - 16 };
    }
  }
  const selOpts = sel ? byDest.get(sel) ?? [] : [];

  const destinations = (
    <Section title="Destinations" right={<span className="text-xs text-ash-400">keys 1–9</span>}>
      {plan && plan !== here && (
        <div className="mb-2 p-2 rounded border border-ember text-sm">
          <div className="text-gold">Route plan to {C.locs[plan].name}</div>
          {planned ? <>
            <div className="text-xs text-ash-400">{planned.path.map(id => C.locs[id].name).join(' → ')} · {planned.days * g.timeScale} days</div>
            <div className="flex gap-2 mt-1.5"><button className="btn btn-ember" onClick={() => travel(planned.legs[0])}>Next stop: {C.locs[planned.path[1]].name}</button><button className="btn btn-ghost" onClick={() => setPlan(null)}>Cancel</button></div>
          </> : <div className="text-xs text-danger">No way through right now. <button className="linkish" onClick={() => setPlan(null)}>Cancel plan</button></div>}
        </div>
      )}
      <div className="max-h-[560px] overflow-auto scroll-thin pr-1">
        {dests.map((d, i) => {
          const best = d.options[0];
          const warn = travelWarnings(g, d.id, best.days).length;
          return (
            <div key={d.id} className={`flex items-center gap-2 py-1.5 px-1 border-t border-ash-700 rounded transition-colors ${hover === d.id || sel === d.id ? 'bg-ash-800' : ''}`}
              onMouseEnter={() => setHover(d.id)} onMouseLeave={() => setHover(h => (h === d.id ? null : h))}>
              {i < 9 && <kbd className="num text-xs text-ash-400 w-3 text-center" aria-hidden="true">{i + 1}</kbd>}
              <button className="flex-1 min-w-0 text-left" onClick={() => setSel(d.id)} title="Show on the map">
                <span className="text-bone">{C.locs[d.id].name}</span>{warn > 0 && <span className="text-danger text-xs" title="See warnings on the map card"> ⚠</span>}
                <span className="block text-xs text-ash-400">{MODE_LABEL[best.mode]}{d.options.length > 1 ? ` (+${d.options.length - 1} more)` : ''} · {best.days * g.timeScale}d · <Money v={best.fare} /> · {bars(best.risk)}</span>
              </button>
              <button className={`btn ${g.player.cash < best.fare ? '' : 'btn-ember'}`} onClick={() => travel(best)}>{g.player.cash < best.fare ? 'Work for passage' : 'Go'}</button>
            </div>
          );
        })}
        {!dests.length && <p className="text-sm text-ash-400">No road leaves this place.</p>}
      </div>
      <p className="text-xs text-ash-400 mt-3">Go takes the fastest way; click a name for every way there, prices and warnings. Fares include a charge for heavy cargo; sellswords make the road safer.</p>
    </Section>
  );

  return (
    <>
      <div className="panel p-2 flex flex-col gap-2 min-w-0">

        <div className="flex flex-wrap items-center gap-1 px-1 text-sm">
          <span className="text-ash-400 mr-2">You are in <span className="text-bone">{C.locs[here]?.name ?? 'the wilds'}</span></span>
          <div className="flex flex-wrap gap-1 ml-auto" role="group" aria-label="Map view">
            <button className={`btn px-2 py-0.5 ${view === 'routes' ? 'btn-ember' : 'btn-ghost'}`} aria-pressed={view === 'routes'} onClick={() => goTo(fit(routesBox(), aspect), 'routes')}>My routes</button>
            {(Object.keys(VIEWS) as (keyof typeof VIEWS)[]).map(v => <button key={v} className={`btn px-2 py-0.5 ${view === v ? 'btn-ember' : 'btn-ghost'}`} aria-pressed={view === v} onClick={() => goTo(fit(VIEWS[v].box, aspect), v)}>{VIEWS[v].label}</button>)}
            <button className="btn btn-ghost px-2 py-0.5" aria-label="Zoom out" onClick={() => zoomAt(1.35)}>−</button>
            <button className="btn btn-ghost px-2 py-0.5" aria-label="Zoom in" onClick={() => zoomAt(1 / 1.35)}>+</button>
          </div>
        </div>
        <div ref={box} className="relative w-full h-[min(66vh,680px)] min-h-[340px] overflow-hidden rounded-md touch-none select-none cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
          <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className="absolute inset-0 w-full h-full" role="img" aria-label="Map of eastern Tamriel">
            <defs>
              <radialGradient id="sea" gradientUnits="userSpaceOnUse" cx="500" cy="300" r="760"><stop offset="0" style={{ stopColor: 'color-mix(in oklab, var(--c-map-sea) 85%, white)' }} /><stop offset="1" style={{ stopColor: 'var(--c-map-sea)' }} /></radialGradient>
              <radialGradient id="plume"><stop offset="0" stopColor="#ff6a1a" stopOpacity=".55" /><stop offset=".4" stopColor="#7a2a10" stopOpacity=".35" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
              <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" style={{ stroke: 'var(--c-bad)' }} strokeWidth="3" strokeOpacity=".35" /></pattern>
              <filter id="rough"><feTurbulence baseFrequency=".02" numOctaves="3" result="t" /><feDisplacementMap in="SourceGraphic" in2="t" scale="6" /></filter>
            </defs>
            <rect x={-1000} y={-1000} width={3000} height={2760} fill="url(#sea)" />
            <clipPath id="land-clip"><path d={MAINLAND} /></clipPath>
            <g filter="url(#rough)">
              <g fill="none" style={{ stroke: 'color-mix(in oklab, var(--c-map-sea) 70%, white)' }} strokeOpacity=".55" strokeWidth={6 * Math.min(1, u * 1.5)}>
                <path d={MAINLAND} /><path d={VVARDENFELL} /><path d={SOLSTHEIM} />{ISLES.map((d, i) => <path key={i} d={d} />)}
              </g>
              <path d={MAINLAND} style={{ fill: 'var(--c-map-land)', stroke: 'var(--c-map-coast)' }} strokeWidth={1.5 * Math.min(1, u)} />
              <path d={MORROWIND_REGION} clipPath="url(#land-clip)" style={{ fill: 'var(--c-map-island)' }} fillOpacity=".55" />
              <path d={VVARDENFELL} style={{ fill: erupted ? 'color-mix(in oklab, var(--c-map-island) 70%, #9a2a10)' : 'var(--c-map-island)', stroke: 'var(--c-map-coast)' }} strokeWidth={1.5 * Math.min(1, u)} />
              <path d={SOLSTHEIM} style={{ fill: 'color-mix(in oklab, var(--c-map-land) 80%, #c8d4dc)', stroke: 'var(--c-map-coast)' }} strokeWidth={1.5 * Math.min(1, u)} />
              {ISLES.map((d, i) => <path key={i} d={d} style={{ fill: 'var(--c-map-island)', stroke: 'var(--c-map-coast)' }} strokeWidth={Math.min(1, u)} />)}
              {LAKES.map((d, i) => <path key={i} d={d} style={{ fill: 'var(--c-map-sea)', stroke: 'var(--c-map-coast)' }} strokeWidth={Math.min(1, u)} />)}
            </g>
            {RIVERS.map((d, i) => <path key={i} d={d} fill="none" style={{ stroke: 'var(--c-map-sea)' }} strokeWidth={2.5 * Math.min(1, u * 1.5)} strokeLinecap="round" />)}
            <g fill="none" style={{ stroke: 'var(--c-map-label)' }} strokeOpacity=".32" strokeWidth={Math.min(1.1, u * 1.2)} strokeLinecap="round" strokeLinejoin="round">
              <path d={MOUNTAINS} /><path d={MARSH} strokeOpacity=".8" />
              <path d={RED_MOUNTAIN.d} strokeOpacity=".7" strokeWidth={Math.min(2, u * 2)} />
            </g>
            <g style={{ stroke: 'var(--c-map-label)' }} strokeOpacity=".25" strokeDasharray={`${4 * u} ${6 * u}`} strokeWidth={u} fill="none">
              {BORDERS.map((d, i) => <path key={i} d={d} />)}
            </g>
            <g className="h-display" style={{ fill: 'var(--c-map-label)' }} fillOpacity=".4" fontSize={Math.min(22, Math.max(12 * u, Math.min(30 * u, 22)))} letterSpacing={6 * Math.min(1, u)}>
              <text x="150" y="250">SKYRIM</text><text x="110" y="440">CYRODIIL</text><text x="580" y="452" textAnchor="middle">MORROWIND</text><text x="590" y="642" textAnchor="middle">BLACK MARSH</text><text x="140" y="660">ELSWEYR</text>
            </g>
            <g className="fell" style={{ fill: 'var(--c-info)' }} fillOpacity=".8" fontSize={Math.min(17, Math.max(11 * u, 17 * Math.min(1, u)))} fontStyle="italic">
              <text x="240" y="60">Sea of Ghosts</text><text x="548" y="347">Inner Sea</text><text x="362" y="712">Topal Bay</text><text x="830" y="420">Padomaic Ocean</text><text x="524" y="178" style={{ fill: 'var(--c-map-label)' }}>Vvardenfell</text><text x="562" y="30" style={{ fill: 'var(--c-map-label)' }}>Solstheim</text>
            </g>
            {erupted && <circle cx={RED_MOUNTAIN.x} cy={RED_MOUNTAIN.y} r="140" fill="url(#plume)"><animate attributeName="r" values="130;150;130" dur="6s" repeatCount="indefinite" /></circle>}
            {war && <ellipse cx="610" cy="470" rx="150" ry="70" fill="url(#hatch)" />}
            {C.routeList.map(r => {
              const ov = g.world.routes[r.id] ?? {};
              if ((ov.closed ?? r.closed) || g.world.status[r.a] === 'closed' || g.world.status[r.b] === 'closed') return null;
              const A = C.locs[r.a], B = C.locs[r.b]; const st = modeStyle(r.modes[0].mode, light);
              const mine = r.a === here || r.b === here;
              const w = hot.has(r.id) ? 4.2 : mine ? 2.6 : 1.3;
              return <line key={r.id} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={st.stroke} strokeDasharray={st.dash?.split(' ').map(n => Number(n) * u).join(' ')} strokeWidth={w * u} strokeOpacity={mine ? 1 : 0.38} strokeLinecap="round" />;
            })}
            {planned && <polyline points={pathLine(planned)} fill="none" style={{ stroke: 'var(--c-accent)' }} strokeWidth={4 * u} strokeOpacity={0.9} strokeDasharray={`${9 * u} ${6 * u}`} strokeLinecap="round" />}
            {preview && preview !== planned && <polyline points={pathLine(preview)} fill="none" style={{ stroke: 'var(--c-text)' }} strokeWidth={3 * u} strokeOpacity={0.75} strokeDasharray={`${6 * u} ${6 * u}`} strokeLinecap="round" />}
            {C.locs[here] && dests.map(d => {
              const A = C.locs[here], B = C.locs[d.id]; const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
              return <text key={`d-${d.id}`} x={mx} y={my} textAnchor="middle" dominantBaseline="middle" fontSize={11.5 * u} fontWeight={700} style={{ fill: 'var(--c-text)', stroke: 'var(--c-map-halo)' }} strokeWidth={3 * u} paintOrder="stroke" className="num pointer-events-none">{d.options[0].days * g.timeScale}d</text>;
            })}
            {C.locList.map(L => {
              const st = g.world.status[L.id]; const isHere = L.id === here; const can = reach.has(L.id); const closed = st === 'closed';
              const focus = sel === L.id || hover === L.id || plan === L.id;
              const r = (isHere || can ? 8 : 5.5) * u;
              const left = LEFT.has(L.id); const gain = cargoGain(L.id); const bs = badges(L.id);
              return (
                <g key={L.id} transform={`translate(${L.x},${L.y})`} opacity={isHere || can || focus ? 1 : 0.62} style={{ cursor: 'pointer' }}
                  role="button" tabIndex={0} aria-label={`${L.name}${isHere ? ', you are here' : can ? ', reachable' : ''}`} aria-pressed={sel === L.id}
                  onClick={() => pick(L.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(s => (s === L.id ? null : L.id)); } }}
                  onMouseEnter={() => setHover(L.id)} onMouseLeave={() => setHover(h => (h === L.id ? null : h))}>
                  <circle r={16 * u} fill="transparent" />
                  {isHere && <motion.circle fill="none" style={{ stroke: 'var(--c-accent)' }} strokeWidth={2 * u} initial={{ r: r * 1.3 }} animate={{ r: [r * 1.3, r * 2.3, r * 1.3], opacity: [1, 0.25, 1] }} transition={{ duration: 2.2, repeat: Infinity }} />}
                  {focus && !isHere && <circle r={r + 5 * u} fill="none" style={{ stroke: 'var(--c-text)' }} strokeWidth={2 * u} />}
                  <circle r={closed ? 4.5 * u : r} style={{ fill: STATUS_FILL[st], stroke: can ? 'var(--c-accent)' : 'var(--c-map-halo)' }} strokeWidth={(can ? 2.4 : 1.2) * u} />
                  {closed && <text x={-4 * u} y={4 * u} fontSize={10 * u} style={{ fill: 'var(--c-muted)' }}>✕</text>}
                  <text x={(left ? -1 : 1) * (r + 6 * u)} y={5 * u} textAnchor={left ? 'end' : 'start'} fontSize={(isHere || can ? 15.5 : 13.5) * u} fontWeight={isHere ? 700 : 400}
                    style={{ fill: closed ? 'var(--c-muted)' : 'var(--c-map-label)', stroke: 'var(--c-map-halo)' }} strokeWidth={3.5 * u} paintOrder="stroke" className="h-display">{L.name}</text>
                  {bs.map((b, i) => (
                    <g key={b.id} transform={`translate(${(i - (bs.length - 1) / 2) * 14 * u},${-(r + 10 * u)})`} aria-hidden="true">
                      <circle r={6.5 * u} style={{ fill: b.color, stroke: 'var(--c-map-halo)' }} strokeWidth={1.2 * u} />
                      <text textAnchor="middle" dominantBaseline="central" fontSize={9 * u} fontWeight={700} style={{ fill: 'var(--c-map-halo)' }} className="font-body">{b.glyph}</text>
                    </g>
                  ))}
                  {gain > 0 && <text x={(left ? -1 : 1) * (r + 6 * u)} y={19 * u} textAnchor={left ? 'end' : 'start'} fontSize={11.5 * u} fontWeight={700} style={{ fill: 'var(--c-good)', stroke: 'var(--c-map-halo)' }} strokeWidth={3 * u} paintOrder="stroke" className="num font-body">↑ +{gain.toLocaleString('en-US')}</text>}
                </g>
              );
            })}
          </svg>

          {S && sel && (
            <div ref={card} data-card role="group" aria-label={`Travel to ${S.name}`} className="absolute z-10 panel-solid p-3 text-sm overflow-auto scroll-thin cursor-auto" style={cardStyle}>
              <div className="flex items-start gap-2">
                <div className="min-w-0"><CodexLink id={`loc:${S.id}`} className="h-display text-lg text-bone">{S.name}</CodexLink>
                  <div className="flex flex-wrap gap-x-2 items-center"><StatusPill status={g.world.status[S.id]} /><span className="text-xs text-ash-400">{g.world.faction[S.id]}</span></div></div>
                <button className="btn btn-ghost ml-auto px-2 py-0" aria-label="Close" onClick={() => setSel(null)}>✕</button>
              </div>
              {sel === here ? <p className="mt-2 text-parchment">You are here.</p> : selOpts.length ? (
                <div className="mt-2">
                  {selOpts.map(o => (
                    <div key={o.route.id + o.modeIndex} className="flex items-center gap-2 py-1.5 border-t border-ash-700">
                      <div className="flex-1 min-w-0"><CodexLink id={`travel:${o.mode}`} className="text-bone">{MODE_LABEL[o.mode]}</CodexLink>
                        <div className="text-xs text-ash-400">{o.days * g.timeScale} day{o.days * g.timeScale > 1 ? 's' : ''} · fare <Money v={o.fare} /> · danger <span aria-label={`${o.risk} of 6`}>{bars(o.risk)}</span></div></div>
                      <button data-go className={`btn ${g.player.cash < o.fare ? '' : 'btn-ember'}`} onClick={() => travel(o)} title={g.player.cash < o.fare ? 'You can’t pay the fare: work for your passage instead (+2 days, costs a little health)' : ''}>{g.player.cash < o.fare ? 'Work for passage' : 'Go'}</button>
                    </div>
                  ))}
                  <div className="mt-1 space-y-1"><Outlook g={g} dest={S.id} />{travelWarnings(g, S.id, selOpts[0].days).map((w, i) => <div key={i} className="text-xs text-danger">⚠ {w}</div>)}</div>
                </div>
              ) : preview ? (
                <div className="mt-2 space-y-1.5">
                  <p className="text-xs text-ash-400">No direct route from here. Fastest way:</p>
                  <p className="text-parchment">{preview.path.map(id => C.locs[id].name).join(' → ')}</p>
                  <p className="text-xs text-ash-400">{preview.days * g.timeScale} days in all · about <Money v={preview.fare} /> in fares</p>
                  <Outlook g={g} dest={S.id} />
                  {travelWarnings(g, S.id, preview.days).map((w, i) => <div key={i} className="text-xs text-danger">⚠ {w}</div>)}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button data-go className="btn btn-ember" onClick={() => { setPlan(S.id); travel(preview.legs[0]); }}>Go to {C.locs[preview.path[1]].name}</button>
                    {plan === S.id ? <button className="btn btn-ghost" onClick={() => setPlan(null)}>Cancel plan</button> : <button className="btn" onClick={() => setPlan(S.id)}>Plan this route</button>}
                  </div>
                </div>
              ) : <p className="mt-2 text-ash-400">No way to get there from here right now.</p>}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 px-1 text-xs" role="group" aria-label="Map markers">
          <span className="text-ash-400 mr-1">Show on map:</span>
          {MARKERS.map(m => (
            <button key={m.id} className={`btn px-2 py-0.5 ${markers.has(m.id) ? '' : 'btn-ghost opacity-70'}`} aria-pressed={markers.has(m.id)} onClick={() => toggleMarker(m.id)}>
              <span className="inline-flex h-4 min-w-4 px-0.5 items-center justify-center rounded-full font-body text-[.7rem] font-bold" style={{ background: m.color, color: 'var(--c-map-halo)' }} aria-hidden="true">{m.glyph}</span>{m.label}
            </button>
          ))}
          <span className="text-ash-400 ml-auto">Scroll or +/− to zoom · drag to move · click a town</span>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-ash-400 px-1 pb-1">
          {(['strider', 'inner-sea', 'sea-of-ghosts', 'caravan', 'road', 'barge', 'guide'] as TravelMode[]).map(m => <span key={m} className="flex items-center gap-1"><svg width="22" height="6" aria-hidden="true"><line x1="0" y1="3" x2="22" y2="3" stroke={modeStyle(m, light).stroke} strokeDasharray={modeStyle(m, light).dash} strokeWidth="2.5" /></svg>{MODE_LABEL[m]}</span>)}
        </div>
      </div>
      {side ? createPortal(<motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>{destinations}</motion.div>, side) : <div className="mt-3">{destinations}</div>}
    </>
  );
}
