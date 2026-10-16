# ASHFALL LEDGER — Game Design Document

_Version 0.1 (planning). Unofficial, non-commercial Elder Scrolls fan game. Lore references:
[`LORE_BIBLE.md`](LORE_BIBLE.md). Project conventions: [`../CLAUDE.md`](../CLAUDE.md)._

---

## 1. Vision

You are a small-time trader in Balmora on **1 Morning Star 4E 4**, owing a ruinous sum to a
Camonna Tong usurer. You have a pack guar, a few septims, and three years. You don't know what the
player knows: that in **4E 5** Baar Dau will fall on Vivec City and Red Mountain will bury Vvardenfell
in ash, and that the Argonians will pour north into a broken Morrowind soon after.

Dope Wars' tension (buy low, sell high, the clock, the debt, the random disaster) wrapped around a real
historical catastrophe. **Lore density is the #1 goal**: every good, place, faction, event, rumor and
item description teaches something true about the setting, cites its source, and flags what is
invented, extrapolated or disputed.

### Pillars
1. **History is the market.** Prices, routes, laws and banks are driven by dated, sourced events. The
   Red Year isn't flavour text; it deletes markets, banks and roads.
2. **Foreshadowing rewards attention.** Rumors, ashfall, Temple unrest and travellers' tales warn of
   what's coming. A lore-literate player can hedge; a careless one loses everything in Vivec's vault.
3. **Every screen teaches.** Hover any good, place, faction or holiday for a codex card with sources.
4. **The ledger shows politics.** Profiteering from famine pays, and the game says so. Relief contracts,
   reputation and titles record *how* you got rich, not only how much.
5. **Feels like a game.** Tactile buy/sell, coins that clink, ash that falls harder as 4E 5 nears, a
   map that burns.

---

## 2. Modes & time

| Mode | Span | Time step | Unlock |
|---|---|---|---|
| **The Red Year** (main campaign) | 1 Morning Star 4E 4 → 31 Evening Star 4E 6 (1,096 days) | Days. Each route costs N days. | Always |
| **The Long Chronicle** | Continues an ended Red Year game (or new start at 1 Morning Star 4E 7) to the coronation of Titus Mede I | **Weeks**: every travel day = 7 calendar days; interest, drift and history run per week | Finish a Red Year campaign alive with net worth > 0 (persisted unlock flag) |

- **Calendar:** real Tamrielic calendar (month lengths and weekdays per LORE_BIBLE §Calendar).
  Date widget: weekday, day, month, year, holiday banner, and phase icons for **Masser** and **Secunda**.
- **Waiting:** players may wait 1/3/7 days in a town (rest at the inn; costs board) to let prices move or a
  festival arrive.
- **Ending:** on the final day the game ends wherever you stand; cargo is valued at fair value; debt is
  subtracted. Death or ruin can end it early.

### Difficulty ("Terms of the Note")
| | Fair Terms | Tong Terms (default) | Blood Terms |
|---|---|---|---|
| Starting debt | 2,500 | 4,000 | 6,000 |
| Daily interest | 0.4% | 0.6% | 0.8% |
| Encounter rate | ×0.75 | ×1 | ×1.3 |

---

## 3. Core loop

At each location the player may, in any order:
1. **Market** — buy/sell goods with each merchant (2–3 per town, distinct price leanings).
2. **Counting-house / Lender** — deposit, withdraw, transfer, pay or extend debt (where present).
3. **Tavern** — buy a drink to hear rumors; take contracts; hire porters and sellswords.
4. **Outfitter / Temple** — conveyance upgrades, arms and armour, scrolls, healing.
5. **Travel** — pick a route and mode on the map; days pass; encounters may fire on the road.

Each day that passes (in town or on the road) runs `tickDay()`:
interest → bank interest → price drift → history timeline → spoilage → contract deadlines →
wages for porters/sellswords → debt-enforcement check.

---

## 4. Economy

### 4.1 Price model (per location × good)
```
price(l,g,t) = base(g)
             × regional(l,g)        // static tendency: producer 0.45–0.8, consumer 1.2–2.0
             × drift(l,g,t)         // mean-reverting log random walk (OU), σ = volatility(g)
             × shock(l,g,t)         // event multipliers, decaying back to 1
             × history(l,g,t)       // timeline modifiers (Red Year famine, war demand…)
             × holiday(l,g,t)       // festival effects (Merchants' Festival, Saturalia…)
             × saturation(l,g,t)    // player's own recent sales/purchases (elastic, recovers ~8%/day)
```
- **Buy/sell spread:** merchants buy at ~88–94% of their sell price; each merchant has a ±10% lean per
  good category and some refuse contraband.
- **Tariffs & duties:** each jurisdiction levies duty on *sales* (e.g. Imperial customs on imports,
  EEC ebony duty, Redoran levies on outlander goods; Telvanni levy nothing — and protect nothing).
- **Fair value** (for score): median current price of the good across open, non-ruined markets
  (contraband at 60% of that).
- **Spikes & crashes (Dope Wars moments):** random market events ("Cliff racers savage the netch herds —
  leather triples in Ald'ruhn"), 1–3% chance per market-day, multiplier 0.3–0.5 or 2–4, decaying over
  ~10 days.
- **Availability:** a market may be out of a good (not sold) or not buy it (no demand); ruined markets
  sell only salvage.
- **Spoilage:** perishables (kwama eggs, fish…) lose a % of quantity per day carried.

### 4.2 Goods (≈16)
Each good: `id, name, category, weight (stone/unit), basePrice, volatility, perishable?, legality by
province (legal / restricted-licence / contraband), origins, codex (with sources)`.
Final list to be fixed from LORE_BIBLE; draft (signature origin in brackets):

| Good | Cat. | Wt | Base | Vol. | Notes |
|---|---|---|---|---|---|
| Kwama Eggs | food | 2 | 12 | med | Perishable. Kwama mines of Vvardenfell. |
| Saltrice | food | 3 | 10 | low→high | Dunmer staple; famine spike after the Red Year. |
| Ash Yams / Scuttle (TBD) | food | 2 | 8 | low | Staple of the ash wastes. |
| Sujamma | drink | 2 | 35 | low | Strong Dunmer liquor; holiday demand. |
| Cyrodilic Brandy | drink | 2 | 60 | low | Luxury in Morrowind/Skyrim. |
| Nord Mead | drink | 2 | 30 | low | Skyrim export. |
| Netch Leather | craft | 4 | 45 | med | Vvardenfell herds. |
| Raw Glass | luxury | 6 | 220 | med | Telvanni/Vvardenfell; armour material. |
| Raw Ebony | luxury | 10 | 450 | high | Red Mountain & Solstheim; EEC/Imperial licence. |
| Dwemer Artifacts | luxury | 5 | 300 | high | Export restricted (Imperial law — verify). |
| Telvanni Bug Musk | luxury | 1 | 90 | med | Perfume; Telvanni product. |
| Moon Sugar | contraband | 1 | 70 | high | Sacred in Elsweyr; contraband in Morrowind/Cyrodiil. |
| Skooma | contraband | 1 | 160 | v.high | Contraband almost everywhere. |
| Soul Gems | magic | 1 | 140 | med | Mages Guild / Telvanni demand. |
| Restorative Draughts | medicine | 1 | 40 | med→high | Disaster & war demand. |
| Northern Furs | craft | 5 | 70 | low | Skyrim/Solstheim pelts. |
| Black Marsh good (TBD: spices / herbs / amber) | ? | ? | ? | ? | Pending research. |

### 4.3 Conveyance & cargo
| Conveyance | Capacity (stone) | Cost | Restriction |
|---|---|---|---|
| Pack guar | 40 | start | — |
| Guar cart | 100 | 2,500 | Road/caravan routes cost +1 day; ferried on ships for freight |
| Chartered hold | 260 | 15,000 + upkeep | Best on sea routes; caravans charge freight |
| Porters (×0–4) | +12 each | 120 hire + 4/day | Wages each day; desert if unpaid |

Fares: `base fare + freight × cargo weight` per route mode — heavy cargo is expensive to move by strider.

### 4.4 Debt (the Note)
- **Lender:** an invented Camonna Tong–backed usurer operating from the Council Club in Balmora
  (the Council Club is the real Camonna Tong tavern; the NPC is **invented**).
- Interest compounds daily (see difficulty). Payable only where the lender or Tong agents sit
  (Balmora; Vivec agent; after the Red Year the note follows the Tong to the mainland — **invented**).
- **Enforcement escalation:** at debt ≥ 1.5×, 2.5×, 4× the original or after 60 days with no payment,
  enforcer encounters gain weight on Morrowind routes (and later reach Skyrim/Cyrodiil via hired blades).
  Outcomes: pay a "visit fee", lose cargo, get hurt, or fight. Clearing the note ends enforcement.
- **Extend credit:** the usurer will lend more (up to 2× original) at a worse rate.

### 4.5 Counting-houses (bank) — **invented institutions**
Two competing invented houses with branches in specific cities; deposits are held **per branch**:
- **Hlaalu Council Counting-House** (branches: Balmora, Vivec, Ebonheart, Narsis/Mournhold — TBD):
  cheap fees, 0.03%/day interest. History can wipe branches (Red Year). Partial settlement later
  (invented: "ten drakes on the hundred", months after).
- **Imperial-chartered house** (e.g. East Empire Company strongroom or an Imperial City bank — TBD;
  branches: Ebonheart, Raven Rock, Solitude, Imperial City): higher fees, no interest, survives the
  Red Year better but suffers during the Interregnum (Long Chronicle).
- **Letters of credit:** move money between branches of the same house for 3% (instant, at a branch).
- **Hedge:** foreshadowing gives the player time to move deposits out of doomed branches.

---

## 5. World

### 5.1 Locations (≈18–19)
Each location: `id, name, region, coords (map), blurb, controllingFaction, laws (contraband list,
enforcement 0–5, bribe culture), tariffs, merchants[2–3] (invented, race-appropriate names),
priceTendencies, services (bank branch, lender, temple, guild, outfitter, tavern), statusTimeline`.

Starting list (to be corrected from research): Vvardenfell — Vivec City, Balmora, Ald'ruhn,
Sadrith Mora, Ebonheart. Mainland Morrowind — Mournhold, Necrom, Blacklight, Tear. Solstheim —
Raven Rock, Fort Frostmoth. Skyrim — Windhelm, Solitude. Cyrodiil — Imperial City, Cheydinhal,
Leyawiin. Black Marsh — Lilmoth, Stormhold. Elsweyr — Senchal.

**Location status** (changes with history): `thriving · uneasy · evacuating · ruined · occupied ·
besieged · refugee-swollen · closed`. Ruined markets offer only scavenging (salvage goods, high risk).

### 5.2 Routes & travel modes
Routes form a graph; each edge lists one or more modes with `days, fare, freight/stone, risk 0–5`,
and history can alter any of them or close the route.

| Mode | Where | Typical days | Risk profile |
|---|---|---|---|
| Silt strider | Vvardenfell only | 1–2 | Cliff racers, ash storms |
| Inner Sea ship | Vvardenfell ↔ mainland coast | 2–4 | Pirates, Dreugh; after 4E 5 pumice & wreckage |
| Coastal ship | Topal Bay, Padomaic coast | 3–8 | Pirates, storms |
| Sea of Ghosts ship | Skyrim ↔ Solstheim ↔ Vvardenfell | 3–6 | Pack ice, storms, sea monsters; winter penalties |
| Guar caravan (road) | Mainland | 3–12 | Bandits, Tong enforcers, Legion customs, war |
| Niben barge | Cyrodiil | 2–4 | Low |
| Guild Guide (teleport) | Vvardenfell guild halls only, only while the guild operates | 0 days, expensive | No encounters, cargo weight limit — **extrapolation flag** pending research |

### 5.3 Factions & reputation
Tracked reputations (−100…+100) with ~9 factions: Camonna Tong, House Hlaalu, House Redoran,
House Telvanni, Tribunal / New Temple, East Empire Company, Imperial Legion, An-Xileel, Mages Guild
(+ Skaal/Ashlanders as local flavour). Reputation shifts merchant prices (±8%), tariffs, contract
access, customs leniency and some event outcomes.

---

## 6. History engine (the heart)

`src/data/history.ts` is a dated list of **world events**. Each has: `date` (absolute or year-only with a
game-chosen day flagged `extrapolation`), `canon` status, `sources`, `foreshadow` (rumors that begin
N days before with rising probability), and `effects`:
- location status changes, market closures, route open/close/risk/days changes;
- price modifiers (by good × region, with ramp & decay);
- legality/tariff changes;
- bank branch failure (deposits wiped / partially settled later);
- lender relocation; new goods availability (salvage, war goods);
- encounter-table changes (refugee columns, Argonian raiders, ash spawn…);
- codex unlocks and a full-screen "chronicle" card when the player is nearby or hears of it.

Draft Red Year timeline (dates pending research):
1. **4E 4 (the calm):** Temple uncertainty after Vivec's absence; ash storms worsen; Hlaalu decline;
   Imperial withdrawal / Ocato's regency; Mages Guild charter troubles; Thalmor whispers from Summerset.
2. **4E 5 — Baar Dau falls; Vivec City destroyed; Red Mountain erupts.** Vvardenfell markets ruined or
   evacuating; Vivec/Balmora bank branches lost; Inner Sea routes closed then reopened at high risk;
   ash over Solstheim; refugees flood Mournhold, Necrom, Windhelm, Raven Rock, Cheydinhal; saltrice
   famine; medicine and timber demand.
3. **4E 5/6 — Argonian invasion of southern Morrowind:** Tear and the south sacked/occupied (verify);
   Black Marsh routes become war zones; Redoran musters from Blacklight; weapon/armour/potion demand.

Long Chronicle continues with (pending research): Solstheim granted to the Dunmer; Mages Guild
dissolution; Ocato's assassination (**disputed: c. 4E 10 vs 4E 15**); the Stormcrown Interregnum;
Titus Mede I's seizure of the Imperial City and coronation (**disputed: 4E 17 vs 4E 22**).

### Disputes
Conflicting sources become **Disputes**: two or more `claims`, each with source and in-world voice
("a Colovian chronicler insists…", "a Temple archivist says…"). They appear as competing rumors and as a
"Historians Disagree" codex section. The world simulation uses the default reading (current UESP)
and says so on the dispute card.

---

## 7. Events, encounters, rumors, contracts

### 7.1 Road encounters
Chance per travel day = `routeRisk × modeFactor × eraFactor × difficulty`, minus Chameleon/sellsword
effects. Weighted tables per region and era (Vvardenfell 4E 4: cliff racers, Camonna Tong toll,
smugglers, Ashlanders, ash storm, Legion customs; post-eruption: ash spawn? [verify era],
looters, refugees; Black Marsh war: Argonian raiders, Redoran patrols; Sea of Ghosts: ice, storms).

Encounter card: illustrated header, lore text, 2–4 choices. Resolution uses
`strength = weapon + armour + sellswords×k + rng` vs. threat. Choices: **Fight · Flee · Bribe ·
Hand over cargo · Use a scroll (Chameleon to slip by; Almsivi/Divine Intervention to vanish)**.
Intervention escapes keep only what you can carry on your back (≤20 stone).

**Almsivi Intervention reliability** declines with collapsing faith in the vanished Tribunal (100% →
~60% after the Red Year). **Flagged in data and UI as an extrapolation, not canon.**

### 7.2 Market & town events
Spikes/crashes, festivals, Temple processions, customs crackdowns, fires, guild notices,
plague/blight scares, refugee arrivals, Legion requisitions.

### 7.3 Rumors
Bought at taverns (a drink, 2–10 septims). Types: **price tips** (true with stated-reliability
probability), **foreshadowing** (history), **lore** (pure teaching), **disputes** (competing claims).

### 7.4 Contracts
Faction-issued: deliver X of good to Y by date (relief saltrice after the eruption, Redoran war
supplies, EEC ebony runs, Tong smuggling, Temple pilgrim goods). Rewards: septims + reputation +
codex unlocks; failure costs reputation. Relief contracts pay less than the market — and earn
**Mercy**, which feeds titles.

---

## 8. Player

### 8.1 Backgrounds (choose one; each has race, starting tweaks, reputation offsets)
Draft: **Hlaalu Factor's By-Blow** (Dunmer; better counting-house fees), **Lukiul Freedwoman**
(Argonian freed slave; Black Marsh welcome, Dunmer suspicion), **Ebonheart Deserter** (Imperial;
+combat, Legion hostility), **Caravan Kit** (Khajiit; Elsweyr prices, customs suspicion), **Nord
Sellsword** (Nord; strong, Skyrim prices), **Telvanni Hireling** (Breton/Dunmer; scrolls cheaper).
Names generated by race naming conventions (LORE_BIBLE §Names).

### 8.2 Stats
Cash, debt, deposits per branch, cargo, conveyance, porters, sellswords, health (0–100), weapon,
armour, scroll inventory, reputations, mercy, codex unlocks, achievements, chronicle (journey log).

### 8.3 Protection items
Weapons (chitin → iron → steel → ebony-edged), armour (netch → chitin → bonemold → Imperial steel),
sellswords (daily wage), scrolls/spells: Chameleon, Almsivi Intervention, Divine Intervention,
restorative draughts (heal).

---

## 9. Scoring, titles, achievements
- **Score** = cash + all deposits + cargo at fair value − debt.
- **Titles** (lore-flavoured tiers by net worth, plus conduct titles): e.g. *Ash-Eater* (in debt),
  *Scrib-Peddler*, *Caravan Master*, *Factor of the Inner Sea*, *Merchant-Prince of Narsis*;
  conduct: *Saint's Ledger* (high Mercy), *Famine-Fattened* (profiteering), *Unbowed by the Tong*
  (debt cleared before 4E 5), *Survivor of the Red Year* (in Vvardenfell on the day and lived).
- **Achievements** (~25): first profit, clear the note, outrun the ash, visit every province,
  read N books, codex completion tiers, smuggle skooma past Imperial customs, etc.
- **Chronicle:** the end screen narrates your journey with dated entries and the seed for replay.

---

## 10. Codex & books
- Codex categories: Places, Goods, Factions, People, Events, Holidays & Calendar, Travel & Magic,
  Disputes, Books. Entries unlock on contact; locked entries show a teaser.
- Every entry: body text, `canon` badge, sources (clickable), related entries.
- **Books:** sold by booksellers; reading unlocks codex entries and sometimes a perk (e.g. a trade
  guide reveals regional price tendencies). Written as **summaries with short quotes only** (no full
  in-game texts).

---

## 11. UI / UX & art direction
- **Look:** obsidian & ember. Charcoal backgrounds, bone/parchment ledger panels, ember-orange
  accents, ash-grey type; Cinzel (display) + EB Garamond (body) + IM Fell (flavour), bundled locally
  via `@fontsource` (offline).
- **Atmosphere:** canvas ash-particle layer whose density follows the calendar (heavier as 4E 5
  nears; red glow after the eruption); vignette; subtle grain.
- **Screens:** Title · New Game (background, name, seed, terms) · Town (market / counting-house /
  tavern / outfitter tabs) · Map & Travel · Encounter modal · Chronicle card (history events) ·
  Codex · Ledger (log & charts) · End of Game · Settings (audio, motion, text size) · Credits & Sources.
- **Map:** hand-drawn-style SVG of eastern Tamriel (original artwork, not traced from game maps),
  nodes, route lines styled by mode, status overlays (ash plume, war banners, closed routes).
- **Feedback:** coin animations on trades, price-flash on change, trend arrows & sparklines,
  shake on losses, toasts for rumors; keyboard shortcuts; works at 1280×720 down to tablet.
- **Accessibility:** reduced-motion option, colour-blind-safe status icons (shape + colour), all
  actions keyboard-reachable.
- **Audio:** procedural Web Audio — coin clinks, wind/ash drone, strider bell, encounter sting;
  mute toggle; off by default until first interaction.

---

## 12. Saves
- `localStorage` key `ashfall-ledger/save` (+ 3 slots), JSON with `schemaVersion`; ordered migration
  functions upgrade old saves; unknown future versions are refused politely.
- Autosave after every action; manual export (`.ashfall.json` download) and import (file picker,
  validated).
- Saves include seed + action log → replay/verify (`replay()` must reproduce the state).
- Meta-progress (Long Chronicle unlock, achievements, codex seen) in `ashfall-ledger/meta`.

---

## 13. Technical architecture
See `CLAUDE.md`. Key points: pure deterministic engine (`src/engine`, seeded sfc32 RNG with
serialisable state), content-as-data (`src/data`), Zustand bridge (`src/store`), React UI. Vite
`base: './'` so `dist/` runs from any folder or itch.io; no CDN assets.

## 14. Testing
- **Vitest:** RNG determinism; calendar (lengths, weekdays, holidays, moons); pricing bounds;
  buy/sell validation (cash, capacity, legality); interest; bank branch wipe; travel & route
  changes; history application; replay equality; save migrations; **data integrity** (every route
  endpoint exists, every good has legality for every province, every codex/fact has a source or a
  non-canon tag, no fan sources in core content).
- **Simulation:** bot strategies over 500 seeds to tune balance (median outcome, bankruptcy rate).
- **Playwright:** smoke flows (new game → buy → travel → encounter → sell → save/reload → end),
  screenshots of every screen.

## 15. Milestones
| # | Milestone | Done when |
|---|---|---|
| M0 | Plan: research, LORE_BIBLE, design, CLAUDE.md | Approved by user |
| M1 | Scaffold (Vite/React/TS strict/Tailwind/Framer/Zustand/Vitest/Playwright) | dev/build/test green |
| M2 | Engine core (rng, calendar, market, finance, travel, scoring) | Unit tests + replay test green |
| M3 | Content data from LORE_BIBLE (goods, places, routes, factions, merchants, codex, books) | Data-integrity tests green |
| M4 | History timeline, encounters, rumors, disputes, contracts, enforcers | Sim runs full campaigns |
| M5 | UI: all screens, map, animation, ash atmosphere, audio | Playable end-to-end |
| M6 | Saves/migrations/export-import, achievements, titles, Long Chronicle | Save round-trip tests |
| M7 | Balance pass, Playwright smoke + screenshots, docs, final offline build | `npm run build` → working `dist/` |

## 16. Open questions
- The original brief was cut off mid-sentence in the Goods section ("…and a codex"). Sections after
  that point (if any) are filled in by this document; send the rest to override.
