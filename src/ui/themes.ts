// Visual themes (Vvardenfell regions) and font options. Applied as CSS variables on <html>.
// Every text/background pair is checked for WCAG contrast in themes.test.ts.

export type ThemeId = 'ashlands' | 'bitter-coast' | 'azuras-coast' | 'ascadian-isles' | 'west-gash';
export type FontId = 'classic' | 'book' | 'clear' | 'system';

export interface Palette {
  bg: string; bg2: string; panelTop: string; panelBottom: string; panelBorder: string;
  input: string; hover: string; line: string;
  text: string; text2: string; muted: string;
  accent: string; accentStrong: string; onAccent: string;
  gold: string; good: string; bad: string; info: string; dispute: string;
  btnTop: string; btnBottom: string; btnBorder: string; btnText: string;
  mapSea: string; mapLand: string; mapIsland: string; mapCoast: string; mapLabel: string; mapHalo: string;
}
export interface Theme { id: ThemeId; name: string; region: string; kind: 'dark' | 'light'; ash: string; vignette: number; p: Palette }

export const THEMES: Theme[] = [
  { id: 'ashlands', name: 'Ashlands', kind: 'dark', ash: '200,190,180', vignette: 0.55,
    region: 'Charcoal and ember, from the grey wastes around Red Mountain.',
    p: { bg: '#0f0c0b', bg2: '#251a14', panelTop: '#261e19', panelBottom: '#1b1512', panelBorder: '#6b5636',
      input: '#120e0c', hover: '#342920', line: '#5c4b3f',
      text: '#f3ebdb', text2: '#e0d0b3', muted: '#b9a895',
      accent: '#ff9a57', accentStrong: '#a8471a', onAccent: '#ffffff',
      gold: '#efc86f', good: '#a6d884', bad: '#ff8576', info: '#a5d4ee', dispute: '#cdb6f4',
      btnTop: '#40312a', btnBottom: '#2c221c', btnBorder: '#8f704a', btnText: '#f3ebdb',
      mapSea: '#16222b', mapLand: '#3b3028', mapIsland: '#4a3a30', mapCoast: '#a08458', mapLabel: '#f3ebdb', mapHalo: '#0f0c0b' } },
  { id: 'bitter-coast', name: 'Bitter Coast', kind: 'dark', ash: '190,205,190', vignette: 0.5,
    region: 'Mangrove green and lantern amber, from the misty smugglers’ shore.',
    p: { bg: '#0b1210', bg2: '#16261f', panelTop: '#18241f', panelBottom: '#111a16', panelBorder: '#4a6a55',
      input: '#0a100e', hover: '#22332b', line: '#3f584b',
      text: '#ebf3e8', text2: '#cfe0cb', muted: '#a6bdaa',
      accent: '#f0bd5a', accentStrong: '#7d5c12', onAccent: '#ffffff',
      gold: '#ecd384', good: '#98e39a', bad: '#ff9284', info: '#94d8d4', dispute: '#cdbcf2',
      btnTop: '#2b3c33', btnBottom: '#1d2a23', btnBorder: '#668a72', btnText: '#ebf3e8',
      mapSea: '#0f1e1b', mapLand: '#26372d', mapIsland: '#2f4336', mapCoast: '#76987c', mapLabel: '#ebf3e8', mapHalo: '#0b1210' } },
  { id: 'azuras-coast', name: 'Azura’s Coast', kind: 'dark', ash: '200,205,230', vignette: 0.5,
    region: 'Twilight blue and dawn pink, after the Daedric Prince of dusk and dawn.',
    p: { bg: '#0c1220', bg2: '#1c2340', panelTop: '#19233b', panelBottom: '#121a2e', panelBorder: '#55669a',
      input: '#0a0f1b', hover: '#243252', line: '#3f4f75',
      text: '#f0f3fb', text2: '#d2daee', muted: '#a9b5d2',
      accent: '#f6abc9', accentStrong: '#8a3a64', onAccent: '#ffffff',
      gold: '#f3d38f', good: '#93e4b3', bad: '#ff9696', info: '#95ccff', dispute: '#cbbdff',
      btnTop: '#283660', btnBottom: '#1b2645', btnBorder: '#6878ad', btnText: '#f0f3fb',
      mapSea: '#0f1b31', mapLand: '#2b3252', mapIsland: '#363d63', mapCoast: '#8293c6', mapLabel: '#f0f3fb', mapHalo: '#0c1220' } },
  { id: 'ascadian-isles', name: 'Ascadian Isles', kind: 'light', ash: '90,95,85', vignette: 0.12,
    region: 'Cream, rice-paddy green and lake blue, from Vvardenfell’s gentle south.',
    p: { bg: '#e7eee0', bg2: '#f7f9f1', panelTop: '#fcfdf8', panelBottom: '#f2f6ec', panelBorder: '#a9b99c',
      input: '#ffffff', hover: '#e3ebdb', line: '#b9c6ae',
      text: '#18241a', text2: '#2e402c', muted: '#4b5d4b',
      accent: '#9a4510', accentStrong: '#2d6a38', onAccent: '#ffffff',
      gold: '#765600', good: '#1d6a2a', bad: '#b0241c', info: '#1b5a8a', dispute: '#5a3898',
      btnTop: '#ffffff', btnBottom: '#edf2e6', btnBorder: '#93a686', btnText: '#18241a',
      mapSea: '#b4d3e1', mapLand: '#dcd5b4', mapIsland: '#d0c49c', mapCoast: '#7b8867', mapLabel: '#18241a', mapHalo: '#f7f9f1' } },
  { id: 'west-gash', name: 'West Gash', kind: 'light', ash: '95,80,65', vignette: 0.12,
    region: 'Sandstone and timber, from the Hlaalu streets of Balmora.',
    p: { bg: '#e4d5bc', bg2: '#f4ebdb', panelTop: '#f8efe0', panelBottom: '#efe2cc', panelBorder: '#b09670',
      input: '#fffaf1', hover: '#e8dac2', line: '#c6b190',
      text: '#2a1c11', text2: '#463221', muted: '#634c39',
      accent: '#9e330e', accentStrong: '#6b4423', onAccent: '#ffffff',
      gold: '#765200', good: '#2a661d', bad: '#a61f19', info: '#1d5878', dispute: '#5b3888',
      btnTop: '#fffaf0', btnBottom: '#f0e3cc', btnBorder: '#ac9370', btnText: '#2a1c11',
      mapSea: '#a8c2cb', mapLand: '#d9c59e', mapIsland: '#ceb78b', mapCoast: '#86704c', mapLabel: '#2a1c11', mapHalo: '#f8efe0' } },
];

export interface FontOption { id: FontId; name: string; note: string; display: string; body: string; flavor: string; caps: boolean }
export const FONTS: FontOption[] = [
  { id: 'classic', name: 'Classic', note: 'Engraved capitals and a book serif (the original look).', display: '"Cinzel", Georgia, serif', body: '"EB Garamond", Georgia, serif', flavor: '"IM Fell English", Georgia, serif', caps: true },
  { id: 'book', name: 'Book', note: 'One calm serif everywhere, no capitals.', display: '"EB Garamond", Georgia, serif', body: '"EB Garamond", Georgia, serif', flavor: '"EB Garamond", Georgia, serif', caps: false },
  { id: 'clear', name: 'Atkinson Hyperlegible', note: 'Designed for maximum legibility.', display: '"Atkinson Hyperlegible", system-ui, sans-serif', body: '"Atkinson Hyperlegible", system-ui, sans-serif', flavor: '"Atkinson Hyperlegible", system-ui, sans-serif', caps: false },
  { id: 'system', name: 'Plain', note: 'Your computer’s own interface font.', display: 'system-ui, "Segoe UI", Roboto, sans-serif', body: 'system-ui, "Segoe UI", Roboto, sans-serif', flavor: 'system-ui, "Segoe UI", Roboto, sans-serif', caps: false },
];
export const TEXT_SCALES = [0.9, 1, 1.12, 1.25, 1.4];

const VAR: Record<keyof Palette, string> = {
  bg: '--c-bg', bg2: '--c-bg2', panelTop: '--c-panel-top', panelBottom: '--c-panel-bottom', panelBorder: '--c-panel-border',
  input: '--c-input', hover: '--c-hover', line: '--c-line', text: '--c-text', text2: '--c-text2', muted: '--c-muted',
  accent: '--c-accent', accentStrong: '--c-accent-strong', onAccent: '--c-on-accent', gold: '--c-gold', good: '--c-good',
  bad: '--c-bad', info: '--c-info', dispute: '--c-dispute', btnTop: '--c-btn-top', btnBottom: '--c-btn-bottom',
  btnBorder: '--c-btn-border', btnText: '--c-btn-text', mapSea: '--c-map-sea', mapLand: '--c-map-land',
  mapIsland: '--c-map-island', mapCoast: '--c-map-coast', mapLabel: '--c-map-label', mapHalo: '--c-map-halo',
};

export function themeById(id: string): Theme { return THEMES.find(t => t.id === id) ?? THEMES[0]; }
export function fontById(id: string): FontOption { return FONTS.find(f => f.id === id) ?? FONTS[0]; }

/** Apply a theme, font and text scale to the document root. */
export function applyAppearance(themeId: string, fontId: string, scale: number) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement; const t = themeById(themeId); const f = fontById(fontId);
  for (const [k, v] of Object.entries(t.p)) root.style.setProperty(VAR[k as keyof Palette], v);
  root.style.setProperty('--vignette', String(t.vignette));
  root.style.setProperty('--f-display', f.display); root.style.setProperty('--f-body', f.body); root.style.setProperty('--f-flavor', f.flavor);
  root.style.fontSize = `${Math.round(scale * 100)}%`;
  root.dataset.theme = t.id; root.dataset.kind = t.kind; root.dataset.caps = f.caps ? 'on' : 'off';
}

// ---- WCAG helpers (also used by the contrast test)
function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
export function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
