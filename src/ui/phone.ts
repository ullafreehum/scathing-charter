// The Android app (Galaxy A26, landscape): a phone layout, no card duel, the hardware Back button, and audio that
// pauses in the background. Everything here is off on desktop and the web; `?phone` turns it on in a browser for testing.
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { create } from 'zustand';

export const NATIVE = Capacitor.isNativePlatform();
export const PHONE = NATIVE || new URLSearchParams(location.search).has('phone');

if (PHONE) {
  document.documentElement.classList.add('phone');
  document.querySelector('meta[name=viewport]')?.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
}

/** Back closes the newest open sheet first: components register a closer while they are open. */
const closers: (() => void)[] = [];
export function useBack(open: boolean, close: () => void) {
  const ref = useRef(close);
  useLayoutEffect(() => { ref.current = close; });
  useEffect(() => {
    if (!PHONE || !open) return;
    const f = () => ref.current();
    closers.push(f);
    return () => { const i = closers.lastIndexOf(f); if (i >= 0) closers.splice(i, 1); };
  }, [open]);
}

/** Runs the Back button: the newest sheet, else `rest` (tabs, then Quit to title, then leave the app). */
export function back(rest: () => void) {
  const c = closers.pop();
  if (c) c(); else rest();
}

export function onBackButton(fn: () => void): () => void {
  if (!NATIVE) return () => {};
  const h = CapApp.addListener('backButton', fn);
  return () => { void h.then(x => x.remove()); };
}

export function onPause(fn: (hidden: boolean) => void): () => void {
  if (!PHONE) return () => {};
  const h = () => fn(document.hidden);
  document.addEventListener('visibilitychange', h);
  return () => document.removeEventListener('visibilitychange', h);
}

export const exitApp = () => { if (NATIVE) void CapApp.exitApp(); };

/** Short buzz for a long-press, where the phone allows it. */
export const buzz = (pattern: number | number[] = 10) => { try { navigator.vibrate?.(pattern); } catch { /* not allowed */ } };

/** No hearings on the phone: drop the engine's "you can contest it" lines. */
export const noContest = (t: string) => PHONE ? t.replace(/ ?You can contest[^]*?\(Market tab\)\./g, '').replace(/ \(you can contest it\)/g, '') : t;

/** Which right-hand sheet is open on the phone (one at a time). */
export type PhoneSheet = 'menu' | 'wallet' | 'town' | 'time' | null;
export const usePhone = create<{
  sheet: PhoneSheet; setSheet(s: PhoneSheet): void; tabs: string[];
  /** town notices already read (UI only, not saved): they fold to one line the next time */
  seen: Record<string, true>; see(id: string): void;
  /** where the player was when the app went to the background: tab, open sheet and the Market's scroll */
  resume: { tab: string; sheet: PhoneSheet; scroll: number } | null; keep(r: { tab: string; sheet: PhoneSheet; scroll: number } | null): void;
}>()(set => ({ sheet: null, setSheet: sheet => set({ sheet }), tabs: [], seen: {}, see: id => set(s => s.seen[id] ? s : { seen: { ...s.seen, [id]: true } }), resume: null, keep: resume => set({ resume }) }));
