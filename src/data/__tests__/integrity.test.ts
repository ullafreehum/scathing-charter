import { describe, expect, it } from 'vitest';
import { C } from '../index';
import type { Jurisdiction } from '../../engine/types';

const J: Jurisdiction[] = ['vvardenfell', 'morrowind', 'solstheim', 'skyrim', 'cyrodiil', 'argonia', 'elsweyr'];
const FAN = /tamriel[_ -]?rebuilt|tamriel[_ -]?data|beyond[_ -]?skyrim|project[_ -]?tamriel|uutak|skyblivion/i;

describe('content integrity', () => {
  it('has 16 goods and 20 locations', () => { expect(C.goodList).toHaveLength(16); expect(C.locList).toHaveLength(20); });
  it('every good has legality for every jurisdiction', () => { for (const g of C.goodList) for (const j of J) expect(g.legality[j], `${g.id}/${j}`).toBeDefined(); });
  it('routes reference real locations and have positive days', () => {
    for (const r of C.routeList) { expect(C.locs[r.a], r.id).toBeDefined(); expect(C.locs[r.b], r.id).toBeDefined(); for (const m of r.modes) expect(m.days).toBeGreaterThan(0); }
  });
  it('tendencies reference real goods; refuges are real; merchants exist', () => {
    for (const L of C.locList) {
      for (const g of Object.keys(L.tendencies)) expect(C.goods[g], `${L.id}:${g}`).toBeDefined();
      expect(C.locs[L.refuge], `${L.id} refuge`).toBeDefined();
      expect(L.merchants.length).toBeGreaterThan(0);
    }
  });
  it('history effects reference real things', () => {
    for (const h of C.history) for (const e of h.effects) {
      if ('loc' in e && e.loc) expect(C.locs[e.loc], `${h.id}`).toBeDefined();
      if (e.type === 'route') expect(C.routes[e.route], `${h.id}: ${e.route}`).toBeDefined();
      if (e.type === 'price' && e.goods !== 'all') for (const g of e.goods) expect(C.goods[g], `${h.id}: ${g}`).toBeDefined();
      if (e.type === 'legal') expect(C.goods[e.good]).toBeDefined();
    }
  });
  it('foreshadow rumours exist', () => { for (const h of C.history) for (const id of h.foreshadow?.rumors ?? []) expect(C.rumors.find(r => r.id === id), id).toBeDefined(); });
  it('contracts reference real goods and places', () => {
    for (const t of C.contracts) { for (const g of t.goods) expect(C.goods[g], t.id).toBeDefined(); for (const l of [...t.origins, ...t.destinations]) expect(C.locs[l], `${t.id}:${l}`).toBeDefined(); }
  });
  it('canon content has sources; non-canon is tagged', () => {
    const items = [...C.goodList, ...C.locList, ...C.history, ...C.encounters, ...C.rumors, ...C.holidays, ...C.books, ...Object.values(C.factions)];
    for (const x of items) if (x.canon === 'canon') expect(x.sources.length, (x as { id: string }).id).toBeGreaterThan(0);
    for (const e of Object.values(C.codex)) if (e.canon === 'canon') expect(e.sources.length, e.id).toBeGreaterThan(0);
  });
  it('no fan-project sources anywhere', () => {
    const all = JSON.stringify(C);
    const urls = all.match(/https?:\/\/[^"\s]+/g) ?? [];
    for (const u of urls) expect(FAN.test(u), u).toBe(false);
  });
  it('every dispute D-01..D-24 has a codex card with two or more claims', () => {
    for (let i = 1; i <= 24; i++) {
      const id = `dispute:D-${String(i).padStart(2, '0')}`;
      expect(C.codex[id], id).toBeDefined(); expect(C.codex[id].claims!.length).toBeGreaterThanOrEqual(2);
    }
  });
  it('book unlocks point at real codex entries', () => { for (const b of C.books) for (const u of b.unlocks) expect(C.codex[u], `${b.id}→${u}`).toBeDefined(); });
});
