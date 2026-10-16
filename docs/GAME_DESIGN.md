# ASHFALL LEDGER — Game Design Document

_Version 1.0 (as built). Unofficial, non-commercial Elder Scrolls fan game.
Lore and sources: [`LORE_BIBLE.md`](LORE_BIBLE.md) (dispute IDs `D-xx` refer to its §2).
Conventions: [`../CLAUDE.md`](../CLAUDE.md)._

---

## 1. Vision

You are a small trader in Balmora on **1 Morning Star 4E 4**, owing a ruinous sum to a Camonna Tong
usurer. You have a pack guar, a few hundred septims and three years. You don't know what the player knows:
that on **3 Sun's Dawn 4E 5** the soul-engine holding Baar Dau aloft will fail, the moonlet will fall on Vivec
City, Red Mountain will erupt minutes later, and the Argonians will march north into a broken Morrowind.

The tension of Dope Wars (buy low, sell high, the clock, the debt, the random disaster) is built around a
real catastrophe. **Lore density is the #1 goal.** Every good, place, faction, event, rumour and item
teaches something true about the setting, cites its source, and flags what is invented, extrapolated or
disputed.

### Pillars
1. **History is the market.** Dated, sourced events drive prices, routes, laws and banks. The Red Year
   deletes markets, branches and roads; it is a mechanic, not set dressing.
2. **Foreshadowing rewards attention.** Rumours, ashfall, Temple decay and travellers' tales warn of what's
   coming. A lore-literate player hedges; a careless one loses everything in a Vivec vault.
3. **Every screen teaches.** Hover any good, place, faction or holiday for a codex card with sources and a
   status badge (Canon / Unverified / Historians Disagree / Extrapolation / Invented).
4. **The ledger shows the politics.** Profiteering from famine pays, and the game says so. Relief
   contracts, reputation and conduct titles record *how* you got rich, not just how much.
5. **Feels like a game.** Tactile buy/sell, coins that clink, ash that thickens as 4E 5 nears, a map that
   burns.

---

## 2. Modes & time

| Mode | Span | Time step | Unlock |
|---|---|---|---|
| **The Red Year** (main) | 1 Morning Star 4E 4 (Tirdas) → 31 Evening Star 4E 6 — 1,095 days | Days | Always |
| **The Long Chronicle** | Continues a finished Red Year game (or starts fresh on 1 Morning Star 4E 7) until Titus Mede I takes the Imperial City (c. 4E 22, **D-10**) | **Weeks**: each travel/wait day = 7 calendar days; interest, drift and history run per week | Finish a Red Year campaign alive with net worth > 0 (stored in meta-save) |

- **Calendar:** 12 months, 365 days (LORE_BIBLE §6). The date widget shows weekday, day, month, year, the
  holiday banner, and Masser/Secunda phase glyphs (Masser 24-day and Secunda 28-day cycles, flagged as
  extrapolation, **D-22**).
- **Waiting:** rest 1, 3 or 7 days at an inn (board costs septims; free on Heart's Day).
- **End:** on the last day the game ends wherever you stand. Death, or ruin with no cash, no cargo and no
  credit, ends it early.

### Difficulty: "Terms of the Note"
| | Fair Terms | **Tong Terms** (default) | Blood Terms |
|---|---|---|---|
| Starting cash / debt | 700 / 2,000 | 550 / 3,000 | 250 / 4,500 |
| Daily interest | 0.2% | 0.3% | 0.6% |
| Encounter rate | ×0.75 | ×1 | ×1.3 |

At 0.3% a day the note roughly triples in a year and grows ~27× over the campaign if ignored.
(Rebalanced from 0.6% after `npm run sim`: at 0.6% a greedy bot never cleared it.)

---

## 3. Core loop

At each location the player may, in any order:
1. **Market**: buy and sell with 2–3 merchants, each with their own leanings, refusals and patter.
2. **Counting-house / Lender**: deposit, withdraw, buy a *writ of coin* (transfer), pay or extend the note.
3. **Tavern**: buy a drink to hear rumours, take contracts, hire porters and sellswords.
4. **Outfitter / Temple**: conveyance upgrades, arms and armour, scrolls, healing.
5. **Travel**: pick a route and mode on the map. Days pass and encounters may fire on the road.

Each elapsed day runs `tickDay()`: note interest → deposit interest → price drift → history timeline →
spoilage → contract deadlines → wages → enforcement check → holiday flags.

---

## 4. Economy

### 4.1 Price model (per location × good)
```
price = base(g) × regional(l,g) × drift(l,g,t) × shock(l,g,t) × history(l,g,t)
        × holiday(l,g,t) × saturation(l,g,t) × merchantLean(m,g) × reputation(f,l)
```
- **regional**: static producer/consumer tendency (0.45–2.0).
- **drift**: mean-reverting log random walk (Ornstein–Uhlenbeck), σ = volatility(g).
- **shock**: Dope Wars spikes and crashes (×2–4 or ×0.3–0.5, decaying over ~10 days), 1–3% per
  market-day, each with a lore line ("Cliff racers gut the Ashlands netch herds…").
- **history**: timeline modifiers (Red Year famine, rebuilding timber boom, war demand…).
- **holiday**: e.g. Merchants' Festival halves buy prices; Tales and Tallows halves soul gems.
- **saturation**: your own trades move the price (elastic), recovering ~8% a day.
- **Spread**: merchants buy at 90% × their lean of the market price (leans 0.95–1.05). Duties and tariffs apply on sale.
- **Availability**: a merchant may not stock or not buy a good. Ruined markets sell salvage only.
- **Spoilage**: kwama eggs lose 2% of the stack per day carried.
- **Fair value** (for score): median current price across open markets (contraband at 60%).

### 4.2 Goods (16)
Weights are in "stone" units. Base prices are in septims and are **invented** game values guided by TES III/IV relative worth.

| ID | Good | Cat. | Wt | Base | Vol. | Origin (cheap) | Hungry markets | Legality |
|---|---|---|---|---|---|---|---|---|
| kwama-eggs | Kwama Eggs | food | 2 | 9 | med | Vvardenfell mines | Windhelm, Raven Rock, IC | legal; **perishable** |
| saltrice | Saltrice | food | 3 | 7 | low→**high after 4E 5** | Mournhold, Narsis, Senchal | Vvardenfell, Windhelm, refugees | legal |
| sujamma | Sujamma | drink | 2 | 28 | low | Balmora, Narsis | Windhelm Gray Quarter, Cheydinhal | legal |
| skingrad-wine | Skingrad Wine | drink | 2 | 45 | low | Imperial City | Mournhold, Sadrith Mora, Solitude | legal |
| nord-mead | Nord Mead | drink | 2 | 22 | low | Windhelm, Solitude | Raven Rock, Fort Frostmoth, IC | legal |
| timber | Timber | material | 8 | 30 | low→**boom** | Leyawiin, Cheydinhal, Solitude | Raven Rock (Bulwark), Balmora (rebuild), Senchal | legal |
| raw-glass | Raw Glass | luxury | 5 | 210 | med | Sadrith Mora, Ald'ruhn | IC, Solitude, Senchal | **EEC-restricted** in Morrowind/Solstheim |
| raw-ebony | Raw Ebony | luxury | 10 | 380 | high | Raven Rock, Ald'ruhn | IC, Windhelm smiths, Blacklight (war) | **EEC-restricted** |
| stalhrim | Stalhrim | luxury | 6 | 520 | high | Raven Rock (Skaal trade, rare) | IC, Solitude, Sadrith Mora | **EEC-restricted**; Skaal anger risk |
| dwemer-artifacts | Dwemer Artefacts | luxury | 4 | 260 | high | Balmora, Ald'ruhn (ruins) | IC, Senchal, Solitude | **Contraband** in Imperial lands outside EEC |
| moon-sugar | Moon Sugar | narcotic | 1 | 55 | high | Senchal | Balmora (Khajiit fences), Vivec, Leyawiin | **Contraband** in Empire & Morrowind; legal in Elsweyr |
| skooma | Skooma | narcotic | 1 | 140 | v.high | Senchal (Black Kiergo) | everywhere, illicitly | **Contraband** everywhere |
| bug-musk | Telvanni Bug Musk | luxury | 1 | 75 | med | Sadrith Mora | Mournhold, IC, Solitude | legal |
| soul-gems | Soul Gems | magic | 1 | 110 | med | IC, Sadrith Mora | Raven Rock, Blacklight, Mournhold | legal; ½ price on Tales and Tallows |
| healing-draughts | Restorative Draughts | medicine | 1 | 35 | med→**high in crises** | IC, Mournhold, Necrom | ruined towns, war zones | legal |
| washtongue | Washtongue Powder | material | 2 | 18 | low | Lilmoth, Stormhold | Mournhold & Narsis potters, IC | legal (requires Lilmoth licence to buy) |

**Legality states:** `legal` · `restricted` (only an EEC factor buys it legally, at ~70%; anyone else is
smuggling) · `contraband` (customs search risk, confiscation and fine, or a bribe). Laws change with history:
when Morrowind slips the Imperial leash after 4E 5, EEC restrictions lapse in Great House lands but persist
in Raven Rock until 4E 16.

### 4.3 Conveyance & cargo
| Conveyance | Capacity | Cost | Notes |
|---|---|---|---|
| Pack guar | 60 | start | — |
| Guar cart | 140 | 2,400 | Road legs +1 day; strider/ship freight charged per stone |
| Chartered hold | 320 | 14,000 + 10/day | Sea legs −1 day; carts and guar travel as freight |
| Porters (0–4) | +12 each | 100 hire + 4/day | Desert if unpaid for 3 days |

**Fares** = base fare + freight × cargo weight per mode, so heavy cargo is expensive to move by strider.

### 4.4 The Note (debt)
- **Lender:** *Gavas Drelloth*, a Camonna Tong usurer at the Council Club, Balmora **[invented]**. The Tong
  controlled Hlaalu councilors under Orvas Dren (canon); the Council Club as the Tong's tavern is
  [unverified].
- Interest compounds daily. Pay at the Council Club or to Tong agents in Vivec and Narsis.
- **After 3 Sun's Dawn 4E 5** Balmora is ash, and the note follows Drelloth to **Narsis**, Hlaalu's capital
  **[invented]**. The debt survives the end of the world.
- **Extension:** borrow up to 2× the original at +0.2% a day.
- **Enforcement:** pressure rises with debt ratio (1.5×, 2.5×, 4×) and with days since the last payment
  (> 60). It raises the chance of Tong enforcer encounters, first in Morrowind, then via hired blades in
  Skyrim and Cyrodiil. There are none in Black Marsh, where the Tong has no reach. Outcomes: pay a "visit
  fee", lose cargo, get hurt, or fight. Clearing the note ends enforcement and earns *Unbowed by the Tong*.

### 4.5 Counting-houses (bank) — invented institutions on a canon idea
"Banks can offer loans or letters of credit… a *writ of coin*" (canon, LORE_BIBLE §5.2). Deposits are held
**per branch**:

| House | Branches | Interest | Fees | Historical risk |
|---|---|---|---|---|
| **Hlaalu Council Counting-House** | Balmora, Vivec City, Narsis, Mournhold | 0.03%/day | 1% withdrawal; writ 3% | Vivec branch **wiped** 3 SD 4E 5; Balmora branch **frozen**, settled at "ten drakes on the hundred" months later; fees spike after Hlaalu loses its seat; Mournhold branch lost when Mournhold is sacked |
| **East Empire Company strongroom** | Ebonheart, Raven Rock, Solitude, Imperial City | none | 2% withdrawal; writ 4% | Ebonheart **wiped** 3 SD 4E 5 (extrapolation); Raven Rock moves to Solitude in 4E 16 (Long Chronicle) |

The hedge: foreshadowing gives months of warning, and moving deposits by writ to Narsis, Solitude or the
Imperial City is the lore-literate play.

---

## 5. World

### 5.1 Locations (20)
The starting list was corrected from research: **Narsis** was added as the Hlaalu capital, where the
counting-house is seated and where the Tong flees. Every other location in the brief is kept.

| Region | Location | Controlling faction (4E 4) | Key history | Signature market |
|---|---|---|---|---|
| Vvardenfell | **Balmora** (start) | House Hlaalu / Camonna Tong | Devastated 4E 5, rebuilt | Dwemer goods, sujamma, eggs |
| | **Vivec City** | Tribunal Temple | Destroyed 3 SD 4E 5 → Scathing Bay | Pilgrim goods, eggs |
| | **Ald'ruhn** | House Redoran | Ruined twice (3E 433, 4E 5) | Ebony, glass |
| | **Sadrith Mora** | House Telvanni | Damaged 4E 5; overrun 4E 6 (D-07) | Glass, bug musk, soul gems |
| | **Ebonheart** | Imperial District / EEC | Destroyed with Vivec (extrapolation) | EEC licensed buyer |
| Mainland | **Mournhold** | Royal capital (Helseth) | Relief hub 4E 5; sacked 4E 6 (D-02) | Saltrice, wine buyers |
| | **Blacklight** | House Redoran | Becomes capital (D-03) | War demand |
| | **Necrom** | House Indoril / Temple (D-21) | Pilgrim city; threatened 4E 6 | Draughts, pilgrims |
| | **Tear** | House Dres | Sinks 4E 5; overrun (extrapolation) | Saltrice, cheap goods |
| | **Narsis** | House Hlaalu (capital) | Hlaalu's fall; fate unknown | Counting-house seat; the Tong |
| Solstheim | **Raven Rock** | East Empire Company | Riekling raid 4E 4; Bulwark; Redoran 4E 16 | Ebony, stalhrim |
| | **Fort Frostmoth** | Imperial Legion (Gen. Carius) | Destroyed 4E 5 | Quartermaster: buys mead, draughts |
| Skyrim | **Windhelm** | Jarl of Eastmarch (unnamed) | Snow Quarter → Gray Quarter | Ebony buyers, mead |
| | **Solitude** | High King (unnamed) | Imperial-aligned port | Luxuries, EEC strongroom |
| Cyrodiil | **Imperial City** | Elder Council / Potentate Ocato | Regency; Interregnum later | Everything; high prices |
| | **Cheydinhal** | Count Andel Indarys (Dunmer) | Refugee destination | Timber, Dunmer goods |
| | **Leyawiin** | Count Marius Caro | Black Marsh border hardens | Timber, contraband port |
| Black Marsh | **Lilmoth** | An-Xileel ("the Organism") | Licensed foreigners only | Washtongue, Argonian goods |
| | **Stormhold** | An-Xileel | War staging (unverified) | Washtongue, river trade |
| Elsweyr | **Senchal** | Elsweyr Confederacy | Black Kiergo dens | Moon sugar, skooma, saltrice |

Each location has a lore blurb, laws (contraband list, enforcement 0–5, bribe culture), duties, services
(branch, lender, temple or shrine, guild, outfitter, tavern), 2–3 **invented** merchants named by
LORE_BIBLE §8 conventions, price tendencies, and a status timeline: `thriving · uneasy · ruined ·
rebuilding · besieged · sacked · occupied · refugee-swollen · closed`.

### 5.2 Route graph (initial state, 4E 4)
Days are in-game days. Fares are base septims, with freight added per stone.

| Route | Mode | Days | Fare | Risk (0–5) |
|---|---|---|---|---|
| Balmora – Vivec | silt strider | 1 | 18 | 1 |
| Balmora – Ald'ruhn | silt strider | 1 | 18 | 1 |
| Vivec – Ebonheart | road | 1 | 2 | 0 |
| Vivec – Sadrith Mora | coastal boat | 2 | 30 | 1 |
| Ebonheart – Sadrith Mora | coastal boat | 2 | 30 | 1 |
| Guild halls (Balmora, Ald'ruhn, Sadrith Mora, Vivec) | Guild Guide | 1 | 120 | 0 (≤25 stone; ends Frostfall 4E 4) |
| Ald'ruhn – Fort Frostmoth | Khuul ferry + strider | 2 | 40 | 2 |
| Fort Frostmoth – Raven Rock | road | 1 | 5 | 1 |
| Ebonheart – Mournhold | Inner Sea ship + road | 3 | 45 | 1 |
| Ebonheart – Necrom | Inner Sea ship | 3 | 45 | 2 |
| Sadrith Mora – Necrom | coastal ship | 2 | 35 | 2 |
| Sadrith Mora – Raven Rock | Sea of Ghosts ship | 4 | 70 | 3 |
| Vivec – Narsis | south road (guar caravan) | 4 | 35 | 2 |
| Mournhold – Necrom | caravan | 4 | 30 | 2 |
| Mournhold – Narsis | caravan | 4 | 30 | 1 |
| Mournhold – Tear | caravan | 5 | 35 | 2 |
| Mournhold – Blacklight | caravan | 6 | 45 | 2 |
| Narsis – Tear | caravan | 4 | 30 | 2 |
| Narsis – Cheydinhal | caravan (Valus passes) | 6 | 50 | 3 |
| Blacklight – Windhelm | caravan (Dunmeth Pass) | 6 | 50 | 3 |
| Tear – Stormhold | caravan (border) | 5 | 40 | 3 |
| Stormhold – Lilmoth | river barge | 5 | 40 | 2 |
| Stormhold – Leyawiin | caravan | 6 | 45 | 3 |
| Necrom – Lilmoth | coastal ship | 8 | 90 | 3 |
| Lilmoth – Senchal | coastal ship (Topal Bay) | 5 | 60 | 3 |
| Lilmoth – Leyawiin | coastal ship | 4 | 50 | 2 |
| Leyawiin – Senchal | coastal ship | 3 | 40 | 2 |
| Leyawiin – Imperial City | Niben barge / Green Road | 3 / 4 | 30 / 20 | 1 / 2 |
| Imperial City – Cheydinhal | Blue Road | 2 | 15 | 1 |
| Imperial City – Solitude | road via Bruma and the Pale Pass | 9 | 80 | 3 |
| Solitude – Windhelm | road / Sea of Ghosts | 6 / 5 | 50 / 60 | 2 / 2 |
| Windhelm – Raven Rock | Sea of Ghosts ship | 3 | 50 | 2 |
| Solitude – Raven Rock | Sea of Ghosts ship | 5 | 70 | 2 |

Seasonal rule: Sea of Ghosts legs gain +1 day and +1 risk in Evening Star through Sun's Dawn (pack ice).
History opens new routes. After the eruption the **relief routes** Mournhold – Balmora (6 d, risk 4)
and Narsis – Balmora (5 d, risk 4) open in First Seed 4E 5, while every strider route dies.

### 5.3 Factions & reputation (−100…+100)
Camonna Tong · House Hlaalu · House Redoran · House Telvanni · Temple (Tribunal → New Temple) · East Empire
Company · Imperial Legion · An-Xileel · Skaal. Reputation shifts merchant prices (±8%), duties, customs
leniency, contract access and some event outcomes.

---

## 6. The history engine

`src/data/history.ts` holds dated **world events**. Each has a `date`, `canon` status, `sources`,
`disputes`, `foreshadow` (rumours that start N days early with rising frequency), and `effects`:
location status, market closure, route open, close or edit, price modifiers by good × region with ramp
and decay, legality and duty changes, bank branch wipes or freezes, lender relocation, salvage stock,
encounter-table changes, codex unlocks, and a full-screen **Chronicle card** (illustrated, with sources).

Red Year timeline (dates per LORE_BIBLE §1.2):

| When | Event | Main effects |
|---|---|---|
| 4E 4 all year | Omens: ash storms worsen, the Ministry of Truth "hums", Ordinators distrusted | Rising ash particles; Vvardenfell risk +; foreshadow rumours |
| 9 Rain's Hand 4E 4 | Riekling raid on Raven Rock; Brara Morvayn made Factor | Ebony ×1.6 at Windhelm for 20 days; Raven Rock market closed 5 days |
| Frostfall 4E 4 | Guild Guides cease (D-08) | Guide routes removed |
| **3 Sun's Dawn 4E 5** | **Baar Dau falls; Red Mountain erupts** | Vivec, Ebonheart: closed (anyone there loses cargo and must survive an escape event). Balmora, Ald'ruhn, Sadrith Mora: ruined. Fort Frostmoth: closed. Strider network gone. Inner Sea closed 30 days, then risk 4. Tear: ruined (flooding). Raven Rock: mine shut. Hlaalu Vivec and EEC Ebonheart branches wiped. Lender → Narsis. Saltrice ×2.5, draughts ×2, timber ×2 across Morrowind; refugee demand in Windhelm, Cheydinhal, Raven Rock |
| early First Seed 4E 5 | Redoran relief from Mournhold | Relief contracts; relief routes open |
| Midyear 4E 5 | Balmora rebuilding | Balmora reopens (`rebuilding`) |
| c. 4E 5–6 | Bulwark completed (≈1 year) | Raven Rock reopens; ebony flows |
| 20 Sun's Height 4E 5 | Hlaalu stripped of rank; Sadras seated | Hlaalu fees ×2; Narsis volatility up; Hlaalu reputation effects |
| 12 Frostfall 4E 5 | Argonian invasion begins (D-05, D-12) | Tear and Stormhold legs: war (risk 5); southern Morrowind risk +2; weapons and draughts demand |
| Evening Star 4E 5 | Tear overrun (extrapolation) | Tear: occupied |
| 18 First Seed 4E 6 | Mournhold sacked (D-02) | Mournhold: sacked → occupied; Hlaalu Mournhold branch lost |
| after that | Capital to Blacklight (D-03) | Blacklight: capital; war contracts |
| Second Seed 4E 6 | Telvanni flee by sea (*Pride of Tel Vos*) | Refugee rumours; Sadrith Mora risk + |
| 10 Midyear 4E 6 | Telvanni lands overrun (D-07) | Sadrith Mora: sacked; Necrom: besieged |
| 1 Hearthfire 4E 6 | Redoran halts the advance | Risks fall to 3; stalemate |

**Long Chronicle beats:** Bloodskal "cave-in" rumour (4E 10) · Orsinium sacked (4E 11–15) · Ocato
assassinated (c. 4E 15; both dates shown, D-09/D-14) · Interregnum: Cyrodiil road risk +2, Emperor's Day
mocked · Solstheim ceded and Raven Rock goes Redoran (4E 16) · Refugees' Rest monument (4E 20) · Thalmor
take Summerset (4E 22) · Titus Mede I takes the Imperial City (c. 4E 22; 4E 17 shown as dispute) → end.

### Disputes in play
Each LORE_BIBLE dispute becomes (a) a codex "Historians Disagree" card naming each source and its in-world
voice, (b) competing tavern rumours, and (c) a note on the Chronicle card saying which reading the ledger
follows ("This ledger follows UESP's c. 4E 22; the Imperial Library timeline says 4E 17").

---

## 7. Events, encounters, rumours, contracts

### 7.1 Road encounters
Chance per travel day = `routeRisk × modeFactor × eraFactor × difficulty − protection`. Weighted tables
depend on region and era:
- **Vvardenfell, 4E 4**: cliff racers, ash storm (delay), Tong toll, smugglers, Ashlander tithe, Legion
  customs, Ordinators, a Dissident Priest asking for passage.
- **Vvardenfell, after the eruption**: looters, ash storm (severe), survivor (a mercy choice), buried
  caravan (salvage).
- **Mainland, 4E 5–6**: refugee column (mercy or profit), Argonian war-band, Redoran patrol (requisition),
  Tong enforcers.
- **Sea of Ghosts**: pack ice, fog, horker pack, dreugh, Blood Horker–style pirates.
- **Topal Bay and the Niben**: pirates, Caro customs, Imperial Regulators.

Encounter cards show an illustrated header, lore text and 2–4 choices: **Fight · Flee · Bribe · Hand
over cargo · Talk · Use a scroll** (Chameleon to slip by; Almsivi or Divine Intervention to vanish).
Resolution compares `weapon + armour + sellswords×k + rng` against the threat. Flight chance falls with
cargo weight. An Intervention escape keeps only what you can carry on your back (≤20 stone).

**Almsivi Intervention reliability** falls as faith in the vanished Tribunal collapses: 95% in 4E 4,
75% after the eruption, 55% after the Temple's fall. This is **flagged as an extrapolation**; UESP says the
spell's fate is "unknown". Divine Intervention stays reliable but lands you at an Imperial shrine (Ebonheart
before the eruption, then Cheydinhal, Imperial City, Solitude or Windhelm).

### 7.2 Market & town events
Spikes and crashes, festivals, Temple processions and New Temple purges, customs crackdowns, refugee
arrivals, Legion requisitions, Khajiit fences, the "price of moon sugar fixed by the Potentate" rumour.

### 7.3 Rumours
Bought at taverns (a drink, 2–10 septims; free on New Life):
- **price tips**: true with a stated reliability;
- **foreshadowing**: frequency rises as an event nears;
- **lore**: teaching only;
- **disputes**: competing claims with their sources.

### 7.4 Contracts
Factions issue "Deliver X to Y by date" contracts:
- Redoran relief saltrice and draughts to Balmora;
- EEC licensed ebony runs;
- Tong smuggling;
- Bulwark timber for Raven Rock;
- Blacklight war supplies;
- Count Indarys's refugee bread.

Rewards are septims, reputation and codex entries; failing costs reputation. **Relief contracts pay below
market and earn Mercy**, which feeds conduct titles.

---

## 8. Player

### 8.1 Backgrounds
Each background sets race, the name generator, starting tweaks and reputation offsets.

| Background | Race | Perk | Burden |
|---|---|---|---|
| Hlaalu Factor's By-Blow | Dunmer | Counting-house fees halved; Hlaalu +20 | Redoran −10; Hlaalu's fall hurts more |
| Freed under Helseth's Decree | Argonian (lukiul) | Lilmoth licence free; Black Marsh prices −10% | Tong enforcers harsher; Dunmer customs suspicious |
| Ebonheart Deserter | Imperial | Combat +2; black-market sales of restricted goods +10% | Legion −30; customs searches more likely |
| Senchal Caravaner | Khajiit | Moon sugar −15% at source; Khajiit fences pay +10% | Morrowind customs searches more likely |
| Eastmarch Sellsword | Nord | Combat +3; starts with a steel axe | Dunmer markets −5% |
| Telvanni Hireling | Breton | Starts with 2 Chameleon scrolls; soul gems −15% | Temple −10 |

### 8.2 Player state
Cash, note (debt), deposits per branch, cargo, conveyance, porters, sellswords, health (0–100), weapon,
armour, scrolls, reputations, Mercy, Lilmoth licence, codex unlocks, achievements, and a dated chronicle log.

### 8.3 Protection
- **Weapons**: chitin → iron → steel → ebony-edged.
- **Armour**: netch leather → chitin → bonemold → Imperial steel.
- **Sellswords**: daily wage.
- **Scrolls**: Chameleon, Almsivi Intervention, Divine Intervention.
- **Restorative draughts**: heal; they are also a trade good.

---

## 9. Scoring, titles, achievements
- **Score** = cash + all deposits + cargo at fair value − note.
- **Wealth titles** (examples): *Ash-Eater* (net negative) · *Scrib-Peddler* · *Guar-Cart Trader* ·
  *Factor of the Inner Sea* · *Writ-Holder of Narsis* · *Merchant-Prince of the Red Year*.
- **Conduct titles**:
  - *Saint's Ledger* — high Mercy;
  - *Famine-Fattened* — big profit on saltrice and draughts in ruined towns;
  - *Unbowed by the Tong* — note cleared before 4E 5;
  - *Witness at Scathing Bay* — in Vvardenfell on 3 Sun's Dawn 4E 5 and lived;
  - *Smuggler of the Bitter Coast*.
- **Achievements** (~25): first profit, clear the note, hedge every deposit before the eruption, visit
  all six provinces, buy the Lilmoth licence, read 10 books, codex completion tiers, survive an Argonian
  war-band, reach Fort Frostmoth before it falls, and more.
- **Chronicle**: the end screen narrates your journey with dated entries, sources and the seed for replay.

---

## 10. Codex & books
- **Categories**: Places · Goods · Factions · People · Events · Calendar & Holidays · Travel & Magic ·
  Historians Disagree · Books · Invented for this game.
- **Entries**: unlock on contact; a locked entry shows a teaser. Every entry has a body, a status badge,
  clickable sources and related links.
- **Books**: bought from booksellers. Reading one unlocks codex entries and sometimes a perk; for
  example *Pocket Guide to the Empire* reveals regional price tendencies, and *The Red Year* heightens
  foreshadowing. Books are written as **summaries with at most a short quote**, never full in-game texts.

---

## 11. UI / UX & art direction
- **Look**: five colour themes, each drawn from a Vvardenfell region (`src/ui/themes.ts`):
  *Ashlands* (charcoal and ember, the default), *Bitter Coast* (mangrove green and amber), *Azura's Coast*
  (twilight blue and dawn pink), *Ascadian Isles* (light: cream, paddy green, lake blue) and *West Gash*
  (light: Balmora sandstone). Themes are CSS variables; the Tailwind colour names (`bone`, `ember`,
  `ash-400`…) point at them. A unit test (`themes.test.ts`) holds every theme to WCAG contrast: main text
  ≥ 7:1 (AAA), muted and coloured text ≥ 4.5:1 (AA) on every surface, plus buttons, inputs and map labels.
- **Fonts**: Classic (Cinzel / EB Garamond / IM Fell English), Book (EB Garamond only), Atkinson
  Hyperlegible, or the system font, all bundled via `@fontsource` so the game works offline. Non-classic
  fonts drop the forced capitals.
- **Wording**: interface labels use plain words a casual Elder Scrolls fan knows (Cash, Debt, Bank,
  Cargo, Net worth, Shop & Temple, Journal). Lore flavour lives in the codex, rumours, encounters and
  chronicle cards. Lore-status badges (unverified, disputed, extrapolation, invented) appear only in the
  Codex.
- **Atmosphere**: a canvas layer of ash particles whose density follows the calendar, heavier as
  3 Sun's Dawn 4E 5 nears, with an ember glow and red sky afterwards. Vignette and subtle grain.
  It can be switched off in Settings.
- **Screens**: Title · New Game (character, name, seed, difficulty) · Town (Market / Bank / Tavern /
  Shop & Temple / Journal tabs) · Map & Travel · Encounter modal · Chronicle card · Codex · Ledger (log and price
  sparklines) · End of Game · Settings · Credits & Sources.
- **Map**: original, hand-drawn-style SVG of eastern Tamriel (not traced from game maps). It shows nodes,
  route lines styled by mode, and status overlays (ash plume, war banners, closed routes).
- **Feedback**: coin animation on trades, price flash and trend arrows, shake on losses, rumour toasts,
  keyboard shortcuts. Layout works from 1280×720 down to tablet.
- **Settings** (⚙ in the top bar and on the title screen; saved per browser in `meta.settings`, old
  `motion`/`largeText` switches are migrated): sound on/off and volume, theme, font, text size (90–140%,
  scales the root font size so the whole layout grows), falling ash, animations, reset to defaults.
- **Flow aids**: minor news (rumours, tips, achievements, bank settlements) are toasts, not blocking
  cards; several results from one action share a card. Arriving somewhere opens the Market. One trade
  amount (1/5/10/25/Max/custom) drives every Buy/Sell, capped by cash, space and stock. A next-step strip
  (`ui/hints.ts`) covers the collectors countdown, contract deadlines, closed markets, licence and low
  health; travel rows warn about contraband, holidays on arrival, sieges and deadlines. Encounter choices
  show their success chance from `choiceOdds()`, the same functions `resolve()` rolls with.
- **Price book**: `GameState.seen` (schema v2) stores the last prices the player saw in each town,
  recorded after every action. The Market shows the best price seen elsewhere; Travel estimates cargo
  value and buy-here-sell-there runs per destination. Balance bots already read live prices everywhere,
  so the price book gives the player less than the bots had and the difficulty targets still hold.
- **Transitions**: the Codex and Settings slide and fade in over a blurred scrim while the dashboard eases
  back slightly; codex entries crossfade. All of it respects the Animations setting.
- **Audio**: procedural Web Audio (coins, wind drone, strider bell, encounter sting) with mute and volume;
  it starts only after the first interaction.
- **Accessibility**: status shown by shape and colour, all actions keyboard-reachable, contrast-tested
  themes, adjustable text size and font.

---

## 12. Saves
- Saves live in `localStorage` under `ashfall-ledger/save/{slot}` (3 slots + autosave) as JSON with a
  `schemaVersion`. Ordered migrations upgrade old saves; saves from newer versions are refused politely.
- The game autosaves after every action. Export downloads `.ashfall.json`; import opens a file picker and
  validates the file.
- Each save holds the seed + action log, so `replay()` can reproduce and verify the state.
- Meta data (Long Chronicle unlock, achievements, codex seen) lives in `ashfall-ledger/meta`.

---

## 13. Technical architecture
See `CLAUDE.md`:
- a pure, deterministic engine (`src/engine`, seeded sfc32 RNG with serialisable state);
- content as typed data (`src/data`);
- a Zustand bridge (`src/store`) and React UI (`src/ui`).

Vite `base: './'` so `dist/` runs from any folder or on itch.io. No CDN assets.

## 14. Testing
- **Vitest**, covering:
  - RNG determinism and replay equality;
  - calendar (month lengths, Tirdas anchor, holidays, moons);
  - pricing bounds; buy/sell validation (cash, capacity, legality, licence);
  - interest; branch wipe and settlement; travel and route mutations; history application;
  - save migrations;
  - **data integrity**: every route endpoint exists, every good has legality for every jurisdiction,
    every entry has sources or a non-canon status, and no `[fan]` source appears in content.
- **Simulation** (`npm run sim`): bot strategies over 500 seeds tune the economy. Targets: a median
  careful player clears the note by about 4E 5; about 20% are ruined; a top run reaches roughly
  100k–250k septims.
- **Playwright**: smoke flows (new game → buy → travel → encounter → sell → save/reload → fast-forward to
  the end) plus screenshots of every screen.

### 14.1 Balance diagnostics (`npm run balance`, 24 seeds per archetype, Tong Terms)
Six bots stand in for player types: idle, greedy (legal arbitrage), smuggler, prudent (pays the note early and banks
outside Morrowind), contractor, and oracle (knows the Red Year is coming). Final pass:

| Archetype | Median net worth | Best | Note cleared | Ruined |
|---|---|---|---|---|
| Idle | −79k | — | 0% | 100% |
| Greedy | 114k | 189k | 92% | 8% |
| Smuggler | 283k | 528k | 92% | 8% |
| Prudent | 112k | 235k | 96% | 4% |
| Contractor | 98k | 229k | 79% | 21% |
| Oracle | 106k | 160k | 79% | 21% |

Difficulty (prudent bot): Fair 0% ruined, median 136k · Tong 4%, 112k · Blood 45% ruined, median 64k (40-seed sweep).
Profit is spread across timber, restorative draughts, raw ebony, soul gems and stalhrim. No single legal leg holds
more than about 8% of the economy's margin, and the eruption reshuffles the best routes.

Changes the diagnostics drove:
- **Work your passage.** A broke player can always travel (no fare, +2 days, −3 health). Before this, about a third
  of careful runs ended stranded in a far port, unable to afford any fare. That was the main cause of ruin.
- Starting cash raised (Fair 700, Tong 550) and Blood Terms interest set to 0.6%.
- Smuggling made riskier: Chameleon beats customs 3 in 4 (was 9 in 10) and costs 150; black-market stings are
  about 1.5× likelier and fine 40%.
- Stalhrim is scarcer at Raven Rock and less dear in the south (it was earning 82 dr/stone, over twice any other good).

Known and accepted: smuggling remains the high-risk, high-reward path, at about 2.5× the legal median. Its risk shows up
as confiscations and stings rather than ruin. This is deliberate (Dope Wars; "smuggling is big business on Vvardenfell").

## 15. Milestones
| # | Milestone | Done when |
|---|---|---|
| M0 | Plan: research, LORE_BIBLE, design, CLAUDE.md | **You approve** |
| M1 | Scaffold (Vite, React, strict TS, Tailwind, Framer, Zustand, Vitest, Playwright) | dev, build and test green on a blank shell |
| M2 | Engine core: rng, calendar and moons, market, finance, cargo, travel, scoring | Unit tests and replay test green |
| M3 | Content data from LORE_BIBLE (goods, places, routes, factions, merchants, codex, books, names) | Data-integrity tests green |
| M4 | History timeline, encounters, rumours, disputes, contracts, enforcers | Sim plays full campaigns headless |
| M5 | UI: all screens, map, animation, ash atmosphere, audio | Playable end to end |
| M6 | Saves, migrations, export/import, achievements, titles, Long Chronicle | Save round-trip tests |
| M7 | Balance pass, Playwright smoke and screenshots, docs, final offline build | `npm run build` gives a working `dist/` |

## 16. Open questions for you
1. Your brief was cut off mid-sentence in the Goods section ("…and a codex"). Anything after that is
   filled in by this document; paste the rest if there was more.
2. I added **Narsis** as a 20th location (Hlaalu capital, counting-house seat, where the Tong flees).
   I can drop it, or drop another location, if you want exactly 18–19.
3. Black Marsh's only canon trade good is **washtongue powder**, a humble pottery mineral. I kept it as
   a teaching moment rather than inventing a flashier "Hist amber". Tell me if you'd prefer otherwise.
