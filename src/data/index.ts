// The content bundle the engine reads. All content is data; see docs/LORE_BIBLE.md.
import type { Background, Book, CodexEntry, ContractTemplate, EncounterDef, Faction, Gear, Good, HistoryEvent, Holiday, House, Location, Route, RumorDef } from '../engine/types';
import { GOODS } from './goods';
import { LOCATIONS } from './locations';
import { ROUTES } from './routes';
import { HISTORY } from './history';
import { ENCOUNTERS } from './encounters';
import { RUMORS } from './rumors';
import { CONTRACTS } from './contracts';
import { HOLIDAYS } from './holidays';
import { BOOKS } from './books';
import { FACTIONS, GEAR, BACKGROUNDS, ACHIEVEMENTS } from './misc';
import { EXTRA_CODEX } from './codex';

const byId = <T extends { id: string }>(xs: readonly T[]) => Object.fromEntries(xs.map(x => [x.id, x])) as Record<string, T>;

function buildCodex(): Record<string, CodexEntry> {
  const out: CodexEntry[] = [
    ...LOCATIONS.map(l => ({ id: `loc:${l.id}`, category: 'place' as const, title: l.name, body: `${l.blurb}\n\nLaw: ${l.laws}`, canon: l.canon, sources: l.sources })),
    ...GOODS.map(g => ({ id: `good:${g.id}`, category: 'good' as const, title: g.name, body: g.codex, canon: g.canon, sources: g.sources })),
    ...FACTIONS.map(f => ({ id: `faction:${f.id}`, category: 'faction' as const, title: f.name, body: f.text, canon: f.canon, sources: f.sources })),
    ...HISTORY.map(h => ({ id: `event:${h.id}`, category: 'event' as const, title: h.title, body: h.text + (h.dateNote ? `\n\nDating: ${h.dateNote}` : ''), canon: h.canon, sources: h.sources })),
    ...HOLIDAYS.map(h => ({ id: `holiday:${h.id}`, category: 'calendar' as const, title: h.name, body: h.text, canon: h.canon, sources: h.sources })),
    ...BOOKS.map(b => ({ id: `book:${b.id}`, category: 'book' as const, title: b.title, body: `By ${b.author}. ${b.summary}${b.quote ? `\n\n${b.quote}` : ''}`, canon: b.canon, sources: b.sources })),
    ...GEAR.filter(g => g.sources.length).map(g => ({ id: `gear:${g.id}`, category: 'travel' as const, title: g.name, body: g.text, canon: g.canon, sources: g.sources })),
    ...ENCOUNTERS.map(e => ({ id: `encounter:${e.id}`, category: 'travel' as const, title: e.title, body: e.text, canon: e.canon, sources: e.sources })),
    ...BACKGROUNDS.map(b => ({ id: `background:${b.id}`, category: 'invented' as const, title: b.name, body: `${b.text}\n\n${b.perk} ${b.burden}`, canon: 'invented' as const, sources: [] })),
    ...EXTRA_CODEX,
  ];
  return byId(out);
}

export const C = {
  goodList: GOODS, goods: byId<Good>(GOODS),
  locList: LOCATIONS, locs: byId<Location>(LOCATIONS),
  routeList: ROUTES, routes: byId<Route>(ROUTES),
  history: HISTORY as readonly HistoryEvent[],
  encounters: ENCOUNTERS as readonly EncounterDef[],
  rumors: RUMORS as readonly RumorDef[],
  contracts: CONTRACTS as readonly ContractTemplate[],
  holidays: HOLIDAYS as readonly Holiday[],
  books: BOOKS as readonly Book[],
  factions: byId<Faction>(FACTIONS),
  gear: byId<Gear>(GEAR), gearList: GEAR,
  backgrounds: byId<Background>(BACKGROUNDS), backgroundList: BACKGROUNDS,
  achievements: ACHIEVEMENTS,
  codex: buildCodex(),
  branches: { hlaalu: ['balmora', 'vivec', 'narsis', 'mournhold'], eec: ['ebonheart', 'raven-rock', 'solitude', 'imperial-city'] } as Record<House, string[]>,
};
export { suggestName } from './names';
