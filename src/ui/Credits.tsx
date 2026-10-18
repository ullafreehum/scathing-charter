import { useEffect } from 'react';

// The one place in the game that carries credits (Sinan's rule): opened from the title screen and from Settings.
export function Credits({ onClose }: { onClose: () => void }) {
  // Escape closes only this, not the Settings dialog underneath.
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose(); } };
    window.addEventListener('keydown', key, true); return () => window.removeEventListener('keydown', key, true);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] scrim flex items-center justify-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Credits and sources" className="parchment max-w-2xl p-6 text-left max-h-[85dvh] overflow-auto" onClick={e => e.stopPropagation()}>
        <h2 className="h-display text-2xl mb-2">Credits &amp; Sources</h2>
        <p className="mb-2 text-sm">The Scathing Charter, version {__APP_VERSION__} (beta).</p>
        <p className="mb-2">Design, code and writing for this fan game. Lore was researched from <a className="underline" href="https://en.uesp.net/wiki/Lore:Main_Page" target="_blank" rel="noreferrer">UESP’s Lore namespace</a> and <a className="underline" href="https://www.imperial-library.info/" target="_blank" rel="noreferrer">The Imperial Library</a>. Every codex entry links its sources and, in the codex, marks what is <b>unverified</b>, <b>disputed</b>, <b>extrapolated</b> or <b>invented</b>.</p>
        <p className="mb-2">Fan projects (Tamriel Rebuilt, Beyond Skyrim, Project Tamriel) are not canon and are not used. In-game books appear only as summaries with short quotes.</p>
        <p className="mb-2">Invented for play: the lender Gavas Drelloth, both counting-houses, every merchant, all prices, tariffs and route times, the day-of-month of year-only events, and Almsivi Intervention’s failing reliability.</p>
        <p className="mb-2">Card duel art: stone textures from Golgotha by Crack dot Com (CC0). Card icons by Lorc, Delapouite, Skoll and Faithtoken from <a className="underline" href="https://game-icons.net" target="_blank" rel="noreferrer">game-icons.net</a> (CC BY 3.0). Every file’s source and artists are listed in CREDITS.md, which comes with the game’s source code.</p>
        <p>Fonts: Cinzel, EB Garamond, IM Fell English, Atkinson Hyperlegible (SIL OFL). Sound is synthesised by the game.</p>
        <button className="btn mt-4" onClick={onClose} autoFocus>Close</button>
      </div>
    </div>
  );
}
