import { describe, expect, it } from 'vitest';
import { THEMES, contrast } from './themes';

// WCAG 2.1: 4.5:1 for normal text (AA), 7:1 for body text we want comfortable (AAA).
describe('theme readability', () => {
  for (const t of THEMES) {
    const p = t.p; const surfaces = { panelTop: p.panelTop, panelBottom: p.panelBottom, bg: p.bg, hover: p.hover };
    it(`${t.name}: main text is AAA (≥7:1) on every surface`, () => {
      for (const [n, s] of Object.entries(surfaces)) { expect(contrast(p.text, s), `text on ${n}`).toBeGreaterThanOrEqual(7); expect(contrast(p.text2, s), `text2 on ${n}`).toBeGreaterThanOrEqual(7); }
    });
    it(`${t.name}: muted and coloured text is at least AA (≥4.5:1)`, () => {
      for (const c of ['muted', 'accent', 'gold', 'good', 'bad', 'info', 'dispute'] as const)
        for (const [n, s] of Object.entries(surfaces)) expect(contrast(p[c], s), `${c} on ${n}`).toBeGreaterThanOrEqual(4.5);
    });
    it(`${t.name}: buttons, inputs and map labels are readable`, () => {
      expect(contrast(p.onAccent, p.accentStrong)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.btnText, p.btnTop)).toBeGreaterThanOrEqual(7);
      expect(contrast(p.btnText, p.btnBottom)).toBeGreaterThanOrEqual(7);
      expect(contrast(p.text, p.input)).toBeGreaterThanOrEqual(7);
      expect(contrast(p.muted, p.btnTop)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.muted, p.btnBottom)).toBeGreaterThanOrEqual(4.5);
      for (const land of [p.mapLand, p.mapIsland, p.mapSea]) expect(contrast(p.mapLabel, land)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
