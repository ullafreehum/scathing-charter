# The Scathing Charter: testing and diagnostics procedure

Written by Agent on 2026-10-17 for 0.10, the focus release. The same file goes into the repo as `docs/QA.md`, part of the patch in this folder.
**Standing rule:** balance runs and bot or fuzz runs (`sim`, `balance`, `balance:focus`, `diagnose`) run **only when Sinan says so**.
Everything else on this page is safe to run at any time.

## 1. The four levels

| Level | When | Command | Time | Gate |
|---|---|---|---|---|
| **L0 Push** | before every commit you push | `npm run check` | ~10 s | typecheck, lint and unit tests all pass |
| **L1 Ready** | before saying a branch is ready, and before any merge | `npm run check:release` | ~3 min | L0 plus build, browser e2e and desktop e2e |
| **L2 Release** | before tagging a version | L1, plus §3 (manual .exe test on Windows) and §5 (playtest) | ~1 h | everything green, no open S1/S2 bugs |
| **L3 Balance** | when a balance knob changes, or before a release that changed the economy, **on Sinan's go** | `npm run balance:focus -- 24`, then `-- 100 --strict` | 5–30 min | targets in §4 all PASS, or a MISS Sinan accepts in writing |

Rules for every level:
- Never leave main red. A failing check is fixed before anything else gets pushed.
- Every bug fix ships with a test that fails without the fix: a unit test for the engine, an e2e test for the UI.
- Any change to `GameState`'s shape bumps `SCHEMA_VERSION` and adds a migration plus a migration test (§2, Saves).
- Re-baseline screenshots or seeded expectations only in a commit of their own, and say why in its message.

## 2. What each system needs (coverage map)

✓ = covered today · **+** = add when that system is next touched.

| System | Unit (`src/**/*.test.ts`) | Browser e2e (`tests/e2e`) | Gaps to close |
|---|---|---|---|
| Determinism | RNG, `replay` equals live state | – | **+** one replay test per new action type |
| Calendar | months, Tirdas, holidays, moons | New Life banner | – |
| Market | price bounds, depth, buy/sell checks, Max | amounts, filters, capped buys, loss warning | **+** saturation recovery over days |
| Travel | routes, closures, fares including cargo | map, planner, Go, keys | **+** closed-route refusal after the eruption |
| Crossing cards | `cards.test.ts`: printed odds = rolled odds on every card, each scene's choices, disabled choices refused, one card per trip, v5→v6 | an encounter resolves | **+** e2e: the stake text is visible on a customs card |
| Spine: win, mark, retire | `engine.test.ts` endings tests | end screen, Long Chronicle | **+** the 4x and 5x warnings fire once each |
| Debt and Tong | interest, pay, borrow limit (5x) | strongbox: deposit, withdraw, pay | **+** the Tong cards' "watched route" doubles collector odds |
| Strongboxes | one per city, wipe at the eruption | Red Year wipe | – |
| Charter | tiers, the debt gate, favour discount | buy the Charter | **+** renewal and tier loss with favour |
| Tavern, labour | labour pay | rumour, rest, porter | **+** the tip is true (price moves the way it says) |
| Red Year history | events apply on their day | chronicle card, ruined Balmora, map haze and ash | – |
| Codex and books | data integrity | codex links, disputes | **+** books are found on arrival only once |
| Duel (now) | `duel.test.ts` (2 tests) | – | **+** see §6 before PixiJS lands |
| Saves | v0, v1, real 0.9.5 (v4), v5→v6 | export and import, continue | **+** each release adds a real save from the previous version to `__fixtures__` |
| Settings | themes contrast | themes, fonts, size, motion, sound persist | – |
| Screen fit | – | `fit.spec.ts` from 1024×600 to 4K | – |
| Robustness | – | `monkey.spec.ts` random clicking | – |
| Desktop app | – | `tests/desktop`: full screen, keys, scale, links, relaunch | see §3 for the manual part |
| Data and lore | `integrity.test.ts`: sources, canon, routes, legality | – | – |

`npm run diagnose -- 4` is held. It plays random games across every background and difficulty and checks invariants (no negative cash, health 0–100, no same-town arbitrage, replay equals live). Run it before a release once Sinan allows bot runs. Pass = exit code 0.

## 3. The Windows .exe (manual, every release, on a real Windows 10 or 11 PC)

The desktop e2e covers the window logic on Linux. These checks need real Windows:
1. Download `ScathingCharter-Setup-<v>.exe` from the release page. SmartScreen warns once; **More info → Run anyway** works.
2. The installer runs per user without admin rights and creates Start menu and desktop shortcuts with the logo icon.
3. The first launch opens full screen with no white flash. F11, Alt+Enter and Esc behave as in the README.
4. Play 10 minutes: buy, travel, a card, save, quit. Relaunch and **Continue** shows the same day and cash.
5. **Upgrade:** install the new version over the previous one. The old save is still there and loads (`%APPDATA%\The Scathing Charter`).
6. **Uninstall, then reinstall:** decide whether saves should survive this, and check it does what the README says.
7. **Portable .exe:** runs from a USB stick or Downloads with no install, and keeps its saves in the same AppData folder.
8. **Offline:** Wi-Fi off, launch and play. Nothing breaks and fonts still load.
9. **Display:** 150% Windows scaling, a second monitor, unplug that monitor and relaunch (it falls back to the primary display).
10. **Second launch:** double-clicking again focuses the running game instead of opening a second copy.
11. Antivirus: upload the .exe to VirusTotal once per release and note the detections in the release notes if any.

## 4. Balance (L3, held until Sinan says go)

**Targets agreed with the economy designer on 2026-10-17** (its proposals: `/mnt/project-files/economy/proposals-0.10.md`). `scripts/focus-balance.ts` measures these with six bots (idle, greedy, smuggler, prudent, contractor, oracle) on fixed seeds, so every run is repeatable.

| # | What we measure | Pass band | Why |
|---|---|---|---|
| B1 | idle bot outcome | never wins; always marked or retired | doing nothing must not work |
| B2 | careful bots' win rate (Tong Terms) | 60–90% | bots of one kind finish close together, so the difficulty lives in the date (B7), Blood (B6) and greed's spread (B5) |
| B3 | careful bots marked | ≤ 15% | a careful player rarely loses to the Tong |
| B4 | deaths, active bots | ≤ 5% | death is a rare drama, not a tax |
| B5 | risky bots vs careful | win rate at most 10 points higher, and a lower p10 end net worth (marked and dead still reported) | greed must cost something |
| B6 | prudent win rate by difficulty | fair ≥ tong ≥ blood; fair ≤ 97%, blood 10–40% | difficulty means something |
| B7 | prudent median win date | day 820 (1 Rain's Hand 4E 6) – day 1003 (1 Frostfall 4E 6) | the seat comes after the war starts, so the whole Red Year is lived (tier hold times give an earliest win of day 517) |
| B8 | prudent debt cleared, median date, interest paid | ≥ 70%; day 60–240 (First Seed – Last Seed 4E 4, before the eruption); interest ≥ 10% of the note | the debt is the first act; a note left a year would hit the 4× warning |
| B9 | broke runs that recover through day labour | ≥ 50% | going broke doesn't end a run |
| B10 | crossing cards: any dominated option? | none, scanned in 3 states (typical trader with non-perishable cargo; broke, 30 cash; rich smuggler, 30,000 cash and about 5,000 of contraband); an option fails only if beaten on both mean and p10 in every state where it is offered. Favour = `FAVOUR_DISCOUNT ×` prices of tiers not yet bought, nothing past the cap | every option on a card is a real choice |
| B11 | scenes where some greedy option beats the safe one on average (typical trader) | 4 of 4 | greed pays on average and risks more (p10) |
| B12 | crossing cards per journey | 15–30% of all journeys; ≥ 8% of 1-day Vvardenfell hops | the road is where choices happen (today about 2–4% on short hops) |
| B13 | strider-only bot (Balmora, Vivec, Ald'ruhn), first 30 days | ends with more cash than it started in ≥ 50% of seeds | the opening trade loop must work |
| B14 | prudent profit per journey, 4E 5 ÷ first 60 days | ≥ 1.3× | income should grow, not stay capped by `DEPTH` |
| B15 | journeys in a won run | 150–300 | a win is a campaign, not a sprint or a grind |
| B16 | oracle's sale profit from price spikes (cell shock > 1.3) | ≤ 40% | knowing the future helps but doesn't carry the game |
| (old) | best route's share of profit, from `npm run balance` | ≤ 35% | no single route solves the game |

How to run it (on Sinan's go):
1. `npm run balance:focus -- 24` for a quick read (about 5 minutes).
2. Change knobs only in `CARD` and the encounter odds (encounters.ts), `DIFFICULTY` (game.ts), `LEND_RATIO` and `MARK_RATIO` (endings.ts), `DEPTH`, `SELL_FACTOR` and `SAT_RECOVERY` (market.ts), the price tendencies in `src/data/locations.ts`, `DEPOSIT_RATE` (bank.ts), `FAVOUR_DISCOUNT` and `FAVOUR_MAX` (score.ts), and the charter prices (`src/data/charter.ts`). The economy designer owns these numbers.
3. Before a release: `npm run balance:focus -- 100 --strict`. Exit code 0 means every target passed.
4. Save the output to `docs/balance/v<version>.md` so the next version has something to compare against.
5. For the economy designer: `npm run balance:focus -- 24 --csv runs.csv` writes one row per bot run: outcome, journeys, cards per journey, the debt-clear day, interest paid, cash on days 30, 398 and 427, the day each Charter tier was bought, every loan as `day:amount`, the spike share of profit, and profit per journey in the first 60 days and in 4E 5. The console output also shows cards per journey by route risk.

The bots are a floor, not a ceiling: they play worse than a person. Ra'virr's playtest (§5) is the check that matters on "does it feel fair".

## 5. Playtest (Ra'virr, every version)

Three full Red Year runs on Tong Terms: one careful, one greedy, one smuggler. For each run, report:
- the outcome and date, net worth, the debt-clear date, and the Charter tier;
- the three best and three worst moments, and anything confusing (a screenshot plus the exported save);
- for every bug: steps, the expected result, the actual result, and the save file. The save plus its action log replays the bug exactly.

Severity: **S1** crash, lost save or the game can't continue · **S2** wrong numbers, or a rule not doing what the card says · **S3** layout or wording · **S4** idea.
A release ships with zero S1 and S2 bugs.

## 6. Duel checklist (before the PixiJS board lands)

1. The engine resolves each move and returns an event list. The board only plays it back. Unit test: playing back the events gives the same final state as the engine.
2. Replay: a seeded duel replays identically, as in the existing determinism test.
3. An e2e test using the hidden text log or ARIA labels next to the canvas (the canvas itself can't be read) wins and loses a hearing.
4. Skip and calm mode: with reduced motion on, every effect is instant and the duel still finishes. Test both settings.
5. No WebGL: the plain board loads (start Chromium with `--disable-gpu --disable-webgl`).
6. Performance on a mid laptop: steady 60 fps, and near-zero CPU while the window is hidden or minimised.
7. Size: PixiJS loads only when a duel opens, and the main bundle grows less than 50 KB.

## 7. Files delivered with this procedure (`/mnt/project-files/qa/`)

`0001-*.patch` (apply with `git am` on 26ab67d) adds:
- `scripts/check.mjs` plus `npm run check` and `npm run check:release` (PowerShell-safe).
- `tests/desktop/desktop.spec.ts` and `playwright.desktop.config.ts`, run with `npm run test:desktop`: 5 tests on the Electron app.
- `scripts/bots.ts`: the archetype bots moved out of `balance.ts`, unchanged except that a broke bot now takes day labour, and bots record their card choices.
- `scripts/focus-balance.ts`, run with `npm run balance:focus`: the §4 targets and the card value scan. Written but not run.
- `docs/QA.md`: this procedure, plus three new rows in the CLAUDE.md commands table.
- `tests/e2e/ui.spec.ts`: the strongbox test now polls after its clicks. It was a race that failed about 1 run in 4.

Verified in the container on 26ab67d plus this patch, in separate runs rather than one clean `check:release` end to end: typecheck, lint, 90 unit tests and the build pass. The browser e2e passed 37 of 38; the one failure was the strongbox race, which then passed 6 runs out of 6 once fixed. The 5 desktop e2e tests pass under xvfb.
