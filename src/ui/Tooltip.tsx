// Fast, themed hover tips for the whole game. Components keep writing plain `title="…"`; this layer moves
// each title into `data-tip` (so the slow system tooltip never shows) and draws the tip itself.
// Line breaks in a tip ("\n") are kept.
// Touch (phones): a tap on something that isn't a button shows its tip, and a long-press (400 ms) on anything shows
// its tip, or does the element's long-press shortcut (`onLongPress`) instead. The click after a long-press is dropped,
// so a long-press never buys, travels or plays.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PHONE, buzz } from './phone';

const DELAY = 350; // ms before the first tip shows
const WARM = 500;  // ms after a tip closes during which the next one shows at once
const HOLD = 400;  // ms for a long-press
const SLOP = 10;   // px a finger may drift and still count as a tap or a long-press
const ACTIVE = 'button:not(:disabled), a[href], input, select, textarea, label, [role="button"], [role="tab"], [role="radio"], [role="link"]';

/** Ref callback for a long-press shortcut on touch screens, e.g. `ref={onLongPress(() => buyMax())}`. */
export const onLongPress = <E extends Element>(fn: (el: E) => void) => (el: E | null) => {
  if (!el) return;
  const h = (e: Event) => { if (e.defaultPrevented) return; e.preventDefault(); if (PHONE) buzz(); fn(el); }; // the innermost shortcut wins
  el.addEventListener('longpress', h);
  return () => el.removeEventListener('longpress', h);
};

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
    const move = (e: PointerEvent) => { if (e.pointerType === 'touch') { drift(e); return; } px = e.clientX; py = e.clientY; frame ||= requestAnimationFrame(hoverAt); };
    const focus = (e: FocusEvent) => { const el = target(e.target as Element); if (!el || !(e.target as Element).matches(':focus-visible')) return; close(); current = el; timer = window.setTimeout(() => show(el), DELAY); };
    const unfocus = (e: FocusEvent) => { if (current?.contains(e.target as Node)) close(); }; // only the tip's own element losing focus closes it
    const key = (e: KeyboardEvent) => { if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) close(); };
    const out = (e: PointerEvent) => { if (!e.relatedTarget && e.pointerType !== 'touch') close(); }; // the mouse left the window (a lifted finger also 'leaves')
    // Touch: tap or hold. The element is found by hit-testing, as for hover, so disabled buttons can explain themselves.
    let press: { x: number; y: number; el: Element | null; shown: Element | null; timer: number } | null = null, eatClick = false;
    const down = (e: PointerEvent) => {
      const shown = current; close(); eatClick = false;
      if (e.pointerType !== 'touch') return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      press = { x: e.clientX, y: e.clientY, el, shown, timer: window.setTimeout(() => {
        if (!press || !el) return;
        press = null; eatClick = true;
        const ev = new Event('longpress', { bubbles: true, cancelable: true });
        if (el.dispatchEvent(ev)) { const t = target(el); if (t) { current = t; show(t); } } // nobody took it: show the tip
      }, HOLD) };
    };
    const lift = (e: PointerEvent) => {
      if (!press || e.pointerType !== 'touch') return;
      clearTimeout(press.timer);
      const t = target(press.el), again = t === press.shown; press = null;
      if (t && !again && !t.closest(ACTIVE)) { current = t; show(t); } // a tap on plain text shows its tip; a second tap hides it
    };
    const drift = (e: PointerEvent) => { if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > SLOP) { clearTimeout(press.timer); press = null; } };
    const cancel = () => { if (press) clearTimeout(press.timer); press = null; };
    const click = (e: MouseEvent) => { if (eatClick) { eatClick = false; e.preventDefault(); e.stopPropagation(); } };
    const menu = (e: Event) => { if (eatClick || press) e.preventDefault(); }; // no browser menu on a long-press
    const watch = new MutationObserver(ms => {
      for (const m of ms) {
        if (m.type === 'attributes') { adopt(m.target as Element); if (m.target === current) show(current); }
        else m.addedNodes.forEach(n => { if (n instanceof Element) { adopt(n); n.querySelectorAll('[title]').forEach(adopt); } });
      }
    });
    watch.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['title'] });
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('pointerup', lift, true);
    document.addEventListener('pointercancel', cancel, true);
    document.addEventListener('click', click, true);
    document.addEventListener('contextmenu', menu, true);
    document.addEventListener('keydown', key, true);
    document.addEventListener('wheel', close, { capture: true, passive: true });
    document.addEventListener('scroll', close, true);
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', unfocus);
    document.addEventListener('pointerout', out);
    window.addEventListener('blur', close);
    return () => {
      watch.disconnect(); clearTimeout(timer); cancelAnimationFrame(frame);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('pointerup', lift, true);
      document.removeEventListener('pointercancel', cancel, true);
      document.removeEventListener('click', click, true);
      document.removeEventListener('contextmenu', menu, true);
      document.removeEventListener('keydown', key, true);
      document.removeEventListener('wheel', close, true);
      document.removeEventListener('scroll', close, true);
      document.removeEventListener('focusin', focus);
      document.removeEventListener('focusout', unfocus);
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
