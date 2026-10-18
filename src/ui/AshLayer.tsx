import { useEffect, useRef } from 'react';

/** Longest side of the drawing buffer: the flakes are soft, so a large screen draws at a lower resolution and is stretched. */
const MAX_SIDE = 1600;
/** Frames drawn per second: ash drifts slowly, so 30 looks the same as 60 at half the cost. */
const FPS = 30;

/** Falling ash (and embers after the eruption). intensity 0–1.5. */
export function AshLayer({ intensity, ember, enabled, color = '200,190,180' }: { intensity: number; ember: boolean; enabled: boolean; color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const params = useRef({ intensity, ember, color });
  params.current = { intensity, ember, color };
  useEffect(() => {
    if (!enabled) return;
    const c = ref.current!; const ctx = c.getContext('2d'); if (!ctx) return;
    let w = 0, h = 0, k = 1, raf = 0, last = 0;
    const resize = () => {
      k = Math.min(1, MAX_SIDE / Math.max(window.innerWidth, window.innerHeight));
      w = window.innerWidth; h = window.innerHeight;
      c.width = Math.round(w * k); c.height = Math.round(h * k);
    };
    resize(); window.addEventListener('resize', resize);
    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; e: boolean; fill: string };
    const ps: P[] = [];
    const spawn = (top: boolean): P => {
      const e = params.current.ember && Math.random() < 0.18, a = 0.15 + Math.random() * 0.45;
      return { x: Math.random() * w, y: top ? -10 : Math.random() * h, vx: (Math.random() - 0.3) * 0.4, vy: 0.25 + Math.random() * 0.6, r: 0.6 + Math.random() * 1.8, a, e,
        fill: e ? `rgba(255,${120 + Math.floor(Math.random() * 60)},40,${a + 0.2})` : `rgba(${params.current.color},${a})` };
    };
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || now - last < 1000 / FPS - 2) return;
      const step = last ? Math.min(3, (now - last) / (1000 / 60)) : 1; last = now; // keep the 60 fps drift speed
      const target = Math.floor(30 + params.current.intensity * 160);
      while (ps.length < target) ps.push(spawn(ps.length > 10));
      if (ps.length > target) ps.length = target;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.x += (p.vx + Math.sin(p.y * 0.01) * 0.2) * step; p.y += p.vy * (p.e ? -0.6 : 1) * step;
        if (p.y > h + 10 || p.y < -20 || p.x > w + 10) Object.assign(p, spawn(true), p.e ? { y: h + 5 } : {});
        ctx.fillStyle = p.fill; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [enabled]);
  if (!enabled) return null;
  return <canvas ref={ref} className="fixed inset-0 w-full h-full pointer-events-none z-0" aria-hidden="true" />;
}
