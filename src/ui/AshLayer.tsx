import { useEffect, useRef } from 'react';

/** Falling ash (and embers after the eruption). intensity 0–1.5. */
export function AshLayer({ intensity, ember, enabled }: { intensity: number; ember: boolean; enabled: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const params = useRef({ intensity, ember });
  params.current = { intensity, ember };
  useEffect(() => {
    if (!enabled) return;
    const c = ref.current!; const ctx = c.getContext('2d'); if (!ctx) return;
    let w = 0, h = 0, raf = 0;
    const resize = () => { w = c.width = window.innerWidth; h = c.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; e: boolean };
    const ps: P[] = [];
    const spawn = (top: boolean): P => ({ x: Math.random() * w, y: top ? -10 : Math.random() * h, vx: (Math.random() - 0.3) * 0.4, vy: 0.25 + Math.random() * 0.6, r: 0.6 + Math.random() * 1.8, a: 0.15 + Math.random() * 0.45, e: params.current.ember && Math.random() < 0.18 });
    const loop = () => {
      const target = Math.floor(30 + params.current.intensity * 160);
      while (ps.length < target) ps.push(spawn(ps.length > 10));
      if (ps.length > target) ps.length = target;
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.x += p.vx + Math.sin(p.y * 0.01) * 0.2; p.y += p.vy * (p.e ? -0.6 : 1);
        if (p.y > h + 10 || p.y < -20 || p.x > w + 10) Object.assign(p, spawn(true), p.e ? { y: h + 5 } : {});
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.e ? `rgba(255,${120 + Math.floor(Math.random() * 60)},40,${p.a + 0.2})` : `rgba(200,190,180,${p.a})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [enabled]);
  if (!enabled) return null;
  return <canvas ref={ref} className="fixed inset-0 pointer-events-none z-0" aria-hidden="true" />;
}
