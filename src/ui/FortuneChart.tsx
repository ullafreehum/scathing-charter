import { useState } from 'react';
import { C } from '../data';
import { netWorth, shortDate, type GameState } from '../engine';

const W = 640, PAD = { l: 46, r: 10, t: 10, b: 22 };
const k = (n: number) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e3 ? `${(n / 1e3).toFixed(Math.abs(n) >= 1e4 ? 0 : 1)}k` : `${Math.round(n)}`);

/** Net worth over time (sampled weekly by the engine), with the big history events marked. */
export function FortuneChart({ g, height = 170 }: { g: GameState; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const pts: [number, number][] = [...(g.stats.worth ?? []), [g.day, netWorth(g)]];
  if (pts.length < 3) return <p className="text-sm text-ash-400">Your fortune is charted week by week. Travel or rest a little and it will appear here.</p>;
  const H = height, x0 = pts[0][0], x1 = Math.max(pts[pts.length - 1][0], x0 + 1);
  const lo = Math.min(0, ...pts.map(p => p[1]));
  let hi = Math.max(0, ...pts.map(p => p[1]));
  if (hi - lo < 1000) hi = lo + 1000;
  const X = (d: number) => PAD.l + ((d - x0) / (x1 - x0)) * (W - PAD.l - PAD.r);
  const Y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
  const events = C.history.filter(e => e.major && g.world.fired.includes(e.id) && e.day >= x0 && e.day <= x1).map(e => ({ day: e.day, title: e.title }));
  const paid = g.log.find(l => l.text.startsWith('You paid off the Camonna Tong'));
  if (paid) events.push({ day: paid.day, title: 'Debt paid off' });
  for (const l of g.log) if (l.text.startsWith('You buy the ')) events.push({ day: l.day, title: l.text.replace(/^You buy the (.*) for .*/, '$1') });
  const h = hover !== null ? pts[hover] : null;
  const near = h ? events.filter(e => Math.abs(e.day - h[0]) <= 7 * g.timeScale) : [];
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect(); const day = x0 + (((e.clientX - r.left) / r.width) * W - PAD.l) / (W - PAD.l - PAD.r) * (x1 - x0);
    let best = 0; for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i][0] - day) < Math.abs(pts[best][0] - day)) best = i;
    setHover(best);
  };
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Net worth from ${k(pts[0][1])} on ${shortDate(x0)} to ${k(pts[pts.length - 1][1])} now`}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {[lo, (lo + hi) / 2, hi].map((v, i) => <g key={i}><line x1={PAD.l} x2={W - PAD.r} y1={Y(v)} y2={Y(v)} style={{ stroke: 'var(--c-line)' }} strokeOpacity={0.5} strokeWidth={1} />
          <text x={PAD.l - 6} y={Y(v) + 4} textAnchor="end" fontSize="11" style={{ fill: 'var(--c-muted)' }} className="num">{k(v)}</text></g>)}
        {lo < 0 && <line x1={PAD.l} x2={W - PAD.r} y1={Y(0)} y2={Y(0)} style={{ stroke: 'var(--c-muted)' }} strokeDasharray="4 4" strokeWidth={1} />}
        {events.map((e, i) => <line key={i} x1={X(e.day)} x2={X(e.day)} y1={PAD.t} y2={H - PAD.b} style={{ stroke: 'var(--c-gold)' }} strokeOpacity={0.45} strokeDasharray="2 3" strokeWidth={1}><title>{`${shortDate(e.day)}: ${e.title}`}</title></line>)}
        <path d={`${line}L${X(pts[pts.length - 1][0])},${Y(lo)}L${X(pts[0][0])},${Y(lo)}Z`} style={{ fill: 'var(--c-accent)' }} fillOpacity={0.1} />
        <path d={line} fill="none" style={{ stroke: 'var(--c-accent)' }} strokeWidth={2} strokeLinejoin="round" />
        <text x={PAD.l} y={H - 6} fontSize="11" style={{ fill: 'var(--c-muted)' }}>{shortDate(x0)}</text>
        <text x={W - PAD.r} y={H - 6} textAnchor="end" fontSize="11" style={{ fill: 'var(--c-muted)' }}>{shortDate(x1)}</text>
        {h && <><line x1={X(h[0])} x2={X(h[0])} y1={PAD.t} y2={H - PAD.b} style={{ stroke: 'var(--c-text)' }} strokeOpacity={0.4} />
          <circle cx={X(h[0])} cy={Y(h[1])} r={4} style={{ fill: 'var(--c-accent)', stroke: 'var(--c-panel-top)' }} strokeWidth={2} /></>}
      </svg>
      {h && (
        <div className="absolute top-1 panel-solid px-2 py-1 text-xs pointer-events-none" style={{ left: `${Math.min(70, (X(h[0]) / W) * 100)}%` }}>
          <div className="text-ash-400">{shortDate(h[0])}</div><div className="num text-bone">Net worth {Math.round(h[1]).toLocaleString('en-US')}</div>
          {near.map((e, i) => <div key={i} className="text-gold">{e.title}</div>)}
        </div>
      )}
      <p className="text-xs text-ash-400 mt-1">Dotted lines mark big events, paying off the debt and charter purchases; hover for details.</p>
    </div>
  );
}
