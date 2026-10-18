// Fast, themed hover tips for the whole game. Components keep writing plain `title="…"`; this layer moves
// each title into `data-tip` (so the slow system tooltip never shows) and draws the tip itself.
// Line breaks in a tip ("\n") are kept. Touch input is ignored: the same text is written out elsewhere.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const DELAY = 350; // ms before the first tip shows
const WARM = 500;  // ms after a tip closes during which the next one shows at once

function adopt(el: Element) {
  if (el instanceof SVGElement) return;
  const t = el.getAttribute('title'); if (t === null) return;
  el.removeAttribute('title');
  if (t) { el.setAttribute('data-tip', t); el.setAttribute('aria-description', t); }
  else { el.removeAttribute('data-tip'); el.removeAttribute('aria-description'); }
}

export function TooltipLayer() {
  const [tip, setTip] = useState<{ el: Element; text: string } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.querySelectorAll('[title]').forEach(adopt);
    let current: Element | null = null, timer = 0, closedAt = 0, frame = 0, px = 0, py = 0;
    const close = () => { clearTimeout(timer); if (current) closedAt = performance.now(); current = null; setTip(null); };
    const show = (el: Element) => { if (el.isConnected && el === current) setTip({ el, text: el.getAttribute('data-tip') ?? '' }); };
    const target = (el: Element | null) => el?.closest('[data-tip]') ?? null;
    const hoverAt = () => {
      frame = 0;
      // Hit-testing (not the event target) so disabled buttons, which get no pointer events, still show their tip.
      const el = target(document.elementFromPoint(px, py));
      if (el === current) return;
      close(); if (!el) return;
      current = el;
      timer = window.setTimeout(() => show(el), performance.now() - closedAt < WARM ? 0 : DELAY);
    };
    const move = (e: PointerEvent) => { if (e.pointerType === 'touch') return; px = e.clientX; py = e.clientY; frame ||= requestAnimationFrame(hoverAt); };
    const focus = (e: FocusEvent) => { const el = target(e.target as Element); if (!el || !(e.target as Element).matches(':focus-visible')) return; close(); current = el; timer = window.setTimeout(() => show(el), DELAY); };
    const key = (e: KeyboardEvent) => { if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) close(); };
    const out = (e: PointerEvent) => { if (!e.relatedTarget) close(); }; // left the window
    const watch = new MutationObserver(ms => {
      for (const m of ms) {
        if (m.type === 'attributes') { adopt(m.target as Element); if (m.target === current) show(current); }
        else m.addedNodes.forEach(n => { if (n instanceof Element) { adopt(n); n.querySelectorAll('[title]').forEach(adopt); } });
      }
    });
    watch.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['title'] });
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerdown', close, true);
    document.addEventListener('keydown', key, true);
    document.addEventListener('wheel', close, { capture: true, passive: true });
    document.addEventListener('scroll', close, true);
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', close);
    document.addEventListener('pointerout', out);
    window.addEventListener('blur', close);
    return () => {
      watch.disconnect(); clearTimeout(timer); cancelAnimationFrame(frame);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerdown', close, true);
      document.removeEventListener('keydown', key, true);
      document.removeEventListener('wheel', close, true);
      document.removeEventListener('scroll', close, true);
      document.removeEventListener('focusin', focus);
      document.removeEventListener('focusout', close);
      document.removeEventListener('pointerout', out);
      window.removeEventListener('blur', close);
    };
  }, []);
  // Below the element, or above it near the bottom of the screen; kept inside the window.
  useLayoutEffect(() => {
    const b = box.current; if (!tip || !b) return;
    const r = tip.el.getBoundingClientRect(), w = b.offsetWidth, h = b.offsetHeight, m = 8;
    const x = Math.max(m, Math.min(window.innerWidth - w - m, r.left + r.width / 2 - w / 2));
    const y = r.bottom + 6 + h > window.innerHeight - m ? r.top - 6 - h : r.bottom + 6;
    b.style.transform = `translate(${Math.round(x)}px, ${Math.round(Math.max(m, y))}px)`;
    b.style.visibility = 'visible';
  }, [tip]);
  if (!tip?.text) return null;
  return (
    <div ref={box} role="tooltip" aria-hidden="true" className="tip panel-solid fixed left-0 top-0 z-[90] pointer-events-none max-w-xs px-2.5 py-1.5 text-xs text-parchment whitespace-pre-line text-left"
      style={{ visibility: 'hidden' }}>{tip.text}</div>
  );
}
