// Core types shared by the engine and the content data. No React, no DOM.
import type { RngState } from './rng';

/** Lore status of any piece of content. Anything but 'canon' gets a badge in the UI. */
export type Canon = 'canon' | 'unverified' | 'disputed' | 'extrapolation' | 'invented';
export interface Sourced { canon: Canon; sources: readonly string[] }

export type Region = 'vvardenfell' | 'mainland' | 'solstheim' | 'skyrim' | 'cyrodiil' | 'blackmarsh' | 'elsweyr';
export type Jurisdiction = 'vvardenfell' | 'morrowind' | 'solstheim' | 'skyrim' | 'cyrodiil' | 'argonia' | 'elsweyr';
export type Legality = 'legal' | 'restricted' | 'contraband';
export type GoodCategory = 'food' | 'drink' | 'material' | 'luxury' | 'narcotic' | 'magic' | 'medicine';
export type LocStatus = 'thriving' | 'uneasy' | 'ruined' | 'rebuilding' | 'besieged' | 'sacked' | 'occupied' | 'refugee-swollen' | 'closed';
export type TravelMode = 'strider' | 'boat' | 'inner-sea' | 'sea-of-ghosts' | 'coastal' | 'caravan' | 'road' | 'barge' | 'guide';
export type House = 'hlaalu' | 'eec';
export type FactionId = 'tong' | 'hlaalu' | 'redoran' | 'telvanni' | 'temple' | 'eec' | 'legion' | 'anxileel' | 'skaal';
export type Race = 'Dunmer' | 'Argonian' | 'Imperial' | 'Khajiit' | 'Nord' | 'Breton' | 'Altmer' | 'Bosmer' | 'Redguard' | 'Orc';
export type Difficulty = 'fair' | 'tong' | 'blood';
export type Mode = 'red-year' | 'long-chronicle';

export interface Good extends Sourced {
  id: string; name: string; category: GoodCategory; weight: number; base: number;
  /** daily log-volatility, 0.02–0.12 */
  volatility: number;
  /** fraction of the stack lost per day carried */
  perishable?: number;
  legality: Record<Jurisdiction, Legality>;
  short: string; codex: string;
  /** lore lines used when this good's price spikes (up) or crashes (down) */
  spikes: readonly string[]; crashes: readonly string[];
}

export interface Merchant {
  name: string; race: Race; trade: string; line: string;
  categories: readonly GoodCategory[] | 'all';
  /** <1 = cheaper to buy from, better seller */
  lean: number;
  fence?: boolean; eec?: boolean;
}

export interface Location extends Sourced {
  id: string; name: string; region: Region; jurisdiction: Jurisdiction;
  x: number; y: number; faction: string; blurb: string; laws: string;
  /** codex entries unlocked on arriving here */
  codex?: readonly string[];
  /** 0–5: customs vigilance */
  enforcement: number;
  /** duty on sales (0–0.15) */
  duty: number;
  temple?: 'tribunal' | 'imperial' | 'other';
  shrine?: boolean; outfitter?: boolean; books?: boolean; tavern: string;
  merchants: readonly Merchant[];
  /** goods traded here → regional price multiplier */
  tendencies: Readonly<Record<string, number>>;
  /** where you end up if this place is closed under you */
  refuge: string;
  status: LocStatus;
}

export interface RouteMode { mode: TravelMode; days: number; fare: number; risk: number; maxWeight?: number }
export interface Route { id: string; a: string; b: string; modes: readonly RouteMode[]; closed?: boolean; note?: string }

export type Effect =
  | { type: 'status'; loc: string; status: LocStatus }
  | { type: 'route'; route: string; closed?: boolean; riskAdd?: number; daysAdd?: number }
  | { type: 'price'; goods: readonly string[] | 'all'; locs: readonly string[] | 'all'; mult: number; days: number }
  | { type: 'legal'; jurisdiction: Jurisdiction; good: string; legality: Legality }
  | { type: 'jurisdiction'; loc: string; jurisdiction: Jurisdiction }
  | { type: 'faction'; loc: string; faction: string }
  | { type: 'branch'; house: House; loc: string; action: 'wipe' | 'freeze' | 'close'; ratio?: number; settleDays?: number; settleAt?: string }
  | { type: 'lender'; seat: string; agents: readonly string[] }
  | { type: 'flag'; key: string; value: number }
  | { type: 'disaster'; locs: readonly string[]; cargoLoss: number; injury: number; relocate: boolean; achievement?: string }
  | { type: 'rep'; faction: FactionId; delta: number };

export interface HistoryEvent extends Sourced {
  id: string; day: number; title: string; text: string;
  dateNote?: string; disputes?: readonly string[];
  major: boolean; mode: Mode | 'both';
  effects: readonly Effect[];
  /** rumour ids that start circulating `lead` days early */
  foreshadow?: { lead: number; rumors: readonly string[] };
  /** codex entries unlocked when this event happens */
  unlocks?: readonly string[];
}

export type EncounterKind = 'hostile' | 'enforcer' | 'customs' | 'mercy' | 'hazard' | 'opportunity';
export interface EncounterDef extends Sourced {
  id: string; kind: EncounterKind; title: string; text: string;
  regions: readonly Region[] | 'any'; modes?: readonly TravelMode[];
  from?: number; to?: number; flag?: string;
  weight: number; threat: number; faction?: FactionId;
  /** fraction of cargo lost on a bad outcome */
  loss: number; delay?: number;
  /** goods offered/involved for opportunity/mercy encounters */
  goods?: readonly string[];
}

export type RumorKind = 'lore' | 'foreshadow' | 'dispute' | 'tip';
export interface RumorDef extends Sourced {
  id: string; kind: RumorKind; text: string; voice?: string;
  regions?: readonly Region[] | 'any'; from?: number; to?: number; dispute?: string; flag?: string;
}

export interface ContractTemplate extends Sourced {
  id: string; faction: FactionId; issuer: string; title: string; text: string;
  goods: readonly string[]; origins: readonly string[]; destinations: readonly string[];
  qty: [number, number]; deadline: number; payMult: number; mercy: number; rep: number;
  from?: number; to?: number; flag?: string;
}

export interface Contract {
  id: string; templateId: string; good: string; qty: number; destination: string;
  deadline: number; reward: number; origin: string;
}

export interface CodexEntry extends Sourced {
  id: string; category: 'place' | 'good' | 'faction' | 'person' | 'event' | 'calendar' | 'travel' | 'dispute' | 'book' | 'invented';
  title: string; body: string; related?: readonly string[];
  claims?: readonly { voice: string; text: string; source: string }[];
  defaultReading?: string;
}

export interface Book extends Sourced {
  id: string; title: string; author: string; price: number; summary: string; quote?: string;
  unlocks: readonly string[]; perk?: 'tendencies' | 'foreshadow' | 'customs' | 'none';
  from?: number;
}

export interface Holiday extends Sourced {
  id: string; name: string; month: number; day: number; text: string;
  scope: 'all' | readonly Region[];
  buyMult?: number; categories?: readonly GoodCategory[]; goods?: readonly string[];
  marketClosed?: boolean; freeRumor?: boolean; freeRest?: boolean; templeHalf?: boolean; freeHeal?: boolean;
}

export interface Background {
  id: string; name: string; race: Race; text: string; perk: string; burden: string;
  rep: Partial<Record<FactionId, number>>; combat: number; customsMod: number;
  feeMult: number; licence: boolean; startItems?: { scrolls?: Partial<Record<ScrollId, number>>; weapon?: string };
  buyMods?: Readonly<Record<string, number>>; fenceBonus?: number;
}

export type ScrollId = 'chameleon' | 'almsivi' | 'divine';
export interface Gear { id: string; kind: 'weapon' | 'armor' | 'conveyance' | 'scroll'; name: string; price: number; power: number; capacity?: number; text: string; canon: Canon; sources: readonly string[] }

export interface Faction extends Sourced { id: FactionId; name: string; text: string }

// ---------------- Game state ----------------
export interface Lot { qty: number; cost: number }
export interface MarketCell { drift: number; shock: number; sat: number; stock: boolean }
export interface PriceMod { goods: readonly string[] | 'all'; locs: readonly string[]; mult: number; start: number; end: number }
export interface Frozen { amount: number; ratio: number; settleDay: number; settleAt: string; house: House }

export interface PendingEncounter {
  defId: string; kind: EncounterKind; title: string; text: string;
  threat: number; bribe: number; choices: readonly string[];
  routeId: string; dest: string; remainingDays: number; customs?: boolean;
}

export type InboxItem =
  | { kind: 'chronicle'; eventId: string }
  | { kind: 'news'; title: string; text: string }
  | { kind: 'result'; title: string; text: string; notice?: boolean } // notice = minor, shown as a toast
  | { kind: 'achievement'; id: string };

/** The last prices the player saw at a place (their own price book, not live data). */
export interface SeenPrices { day: number; buy: Record<string, number>; sell: Record<string, number> }

export interface LogEntry { day: number; text: string; tone?: 'good' | 'bad' | 'neutral' | 'history' }

export interface PlayerState {
  name: string; backgroundId: string; race: Race;
  cash: number; health: number; location: string;
  conveyance: string; porters: number; sellswords: number; unpaidDays: number;
  weapon: string; armor: string; scrolls: Record<ScrollId, number>;
  cargo: Record<string, Lot>;
  licence: boolean; mercy: number; profiteering: number;
  rep: Record<FactionId, number>;
  books: string[];
}

export interface NoteState { original: number; balance: number; rate: number; lastPaymentDay: number; seat: string; agents: string[]; extended: number; cleared: boolean }

export interface WorldState {
  status: Record<string, LocStatus>;
  jurisdiction: Record<string, Jurisdiction>;
  faction: Record<string, string>;
  routes: Record<string, { closed?: boolean; riskAdd?: number; daysAdd?: number }>;
  priceMods: PriceMod[];
  legal: Partial<Record<Jurisdiction, Record<string, Legality>>>;
  branches: Record<string, 'open' | 'closed'>;
  flags: Record<string, number>;
  fired: string[];
  news: { day: number; loc: string; text: string; up: boolean }[];
}

export interface Stats {
  trades: number; profit: number; maxNetWorth: number; journeys: number; encounters: number;
  fightsWon: number; smuggled: number; visited: string[]; reliefDelivered: number; contractsDone: number;
}

export interface GameState {
  schemaVersion: number;
  seed: string; mode: Mode; difficulty: Difficulty; timeScale: number;
  day: number; endDay: number; rng: RngState;
  player: PlayerState; note: NoteState;
  deposits: Record<string, number>; frozen: Frozen[];
  markets: Record<string, Record<string, MarketCell>>;
  world: WorldState;
  offers: Contract[]; contracts: Contract[];
  heard: string[];
  seen: Record<string, SeenPrices>;
  pending: PendingEncounter | null;
  inbox: InboxItem[];
  log: LogEntry[];
  codex: string[];
  achievements: string[];
  stats: Stats;
  actions: Action[];
  over: null | { reason: 'calendar' | 'death' | 'ruin'; day: number };
}

export type Action =
  | { t: 'buy'; good: string; qty: number }
  | { t: 'sell'; good: string; qty: number }
  | { t: 'travel'; route: string; mode: number }
  | { t: 'wait'; days: number }
  | { t: 'deposit'; house: House; amount: number }
  | { t: 'withdraw'; house: House; amount: number }
  | { t: 'writ'; house: House; from: string; amount: number }
  | { t: 'pay'; amount: number }
  | { t: 'borrow'; amount: number }
  | { t: 'rumor' }
  | { t: 'accept'; id: string }
  | { t: 'deliver'; id: string }
  | { t: 'gear'; id: string }
  | { t: 'hire'; who: 'porter' | 'sellsword'; delta: 1 | -1 }
  | { t: 'licence' }
  | { t: 'heal' }
  | { t: 'book'; id: string }
  | { t: 'choose'; choice: string }
  | { t: 'ack'; n?: number }
  | { t: 'chronicle' };

export interface NewGameConfig { seed: string; backgroundId: string; name: string; difficulty: Difficulty; mode?: Mode }
