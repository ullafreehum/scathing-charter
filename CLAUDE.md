# CLAUDE.md — The Scathing Charter

A lore-dense, Dope Wars–style trading game set in the Elder Scrolls universe at the dawn of the
Fourth Era (1 Morning Star 4E 4 → 31 Evening Star 4E 6). Unofficial, non-commercial fan project.

> Version **0.10.0** (beta): the number lives in `package.json` only and is shown in-game via `__APP_VERSION__`;
> bump it there and add a `CHANGELOG.md` entry for each release. To publish: write `docs/releases/v<version>.md`,
> and push it (or push the tag `v<version>`); `.github/workflows/release.yml` creates the
> tag, publishes the release and a Windows runner attaches the Electron Setup and Portable .exe (pre-release while the version is 0.x).
> Status: **playable** (M1–M7 done). Red Year campaign + Long Chronicle; see README.md to play.
> Design: `docs/GAME_DESIGN.md` · Lore + sources + dispute register: `docs/LORE_BIBLE.md` · raw notes: `docs/research/`.
> Renamed from "Ashfall Ledger": internal ids (package name, `ashfall-ledger/` localStorage keys) keep the
> old name on purpose so existing saves still load. Title art: `src/assets/scathing-charter-logo.jpg`.

## Commands
| What | Command |
|---|---|
| Install | `npm install` |
| Dev server | `npm run dev` (`npm start` also opens the browser) |
| Desktop app (Electron) | `npm run desktop` (build + open); `npm run package:win` → `release/electron/` Setup + Portable .exe (Windows/CI). `electron/main.cjs` + `preload.cjs`, `electron-builder.yml`. Never change `appId`/`productName`: they fix the save folder. Game-side hooks in `src/ui/desktop.ts` (no-ops in a browser). |
| Type-check + production build (static, offline, relative paths) | `npm run build` → `dist/` |
| Preview the build | `npm run preview` |
| Unit tests (engine, data validation) | `npm test` (watch: `npm run test:watch`) |
| UI smoke tests + screenshots | `npm run test:e2e` (uses Playwright's Chromium; in the cloud container launch with `executablePath: '/opt/pw-browsers/chromium'` if versions differ — never `playwright install` there) |
| Lint | `npm run lint` |
| Checks (see `docs/QA.md`) | `npm run check` before every push (typecheck, lint, unit); `npm run check:release` before saying ready (adds build, browser e2e, desktop e2e) |
| Desktop e2e | `npm run test:desktop` (Electron via Playwright; headless Linux: `xvfb-run -a`) |
| 0.10 balance targets | `npm run balance:focus -- 24` (`-- 100 --strict` before a release); bots live in `scripts/bots.ts`. Held: run only when Sinan says so |
| Balance simulation | `npm run sim` (headless bot runs over many seeds) |
| Balance diagnostics | `npm run balance -- 24` (6 archetype bots, difficulty sweep, economy scan, design targets); `npm run balance -- blood 40`; `npm run balance -- debt 10 4500,5000:700` (Normal debt[:cash] sweep for careful bots) |
| Engine diagnostics | `npm run diagnose -- 4` (random-play fuzzing, invariants, replay checks; exits 1 on violations) |

All npm scripts must work unchanged in **Windows PowerShell**: no `rm -rf`, no `VAR=x cmd`, no bash-only
syntax. Use Node scripts (`scripts/*.mjs`) for anything beyond a single tool call.

## Architecture
```
src/
  engine/   Pure TypeScript game engine. NO React, NO DOM, NO Date.now(), NO Math.random().
            Deterministic: (seed, action log) → identical state. All randomness via engine/rng.ts.
  data/     All content as typed TS data: goods, locations, routes, factions, backgrounds,
            history (dated world events), events/encounters, rumors, contracts, codex, books, NPCs,
            holidays. Content never lives in components.
  store/    Zustand store: holds the engine state, dispatches actions to engine.step(),
            autosaves via save/ adapters. The only bridge between UI and engine.
  save/     localStorage adapter, schema versioning + migrations, file export/import.
  ui/       React components (screens/, panels/, widgets/), Tailwind + Framer Motion.
            themes.ts = the 5 colour themes + fonts as data, applied as CSS variables (contrast-tested
            in themes.test.ts). Tailwind colour names in index.css map onto those variables, so never
            hardcode hex colours in components. Settings.tsx = the in-game settings dialog.
            hints.ts (next-step strip, travel warnings), prices.ts (reads the price book) and route.ts
            (route planner) are pure helpers over GameState. Decorative motion goes through motion.ts
            (Animations setting + reduced motion); fx.tsx holds coin flights and the night dip.
            duelBoard.ts = the hearing's Pixi.js board (lazy chunk), playing back DuelState.events from the engine.
  audio/    Procedural Web Audio (no audio files needed).
tests/e2e/  Playwright specs; screenshots go to tests/e2e/__screenshots__/.
docs/       GAME_DESIGN.md, LORE_BIBLE.md, research/ (raw researcher notes).
```

### Engine contract
- `newGame(config: { seed, backgroundId, playerName, mode }) → GameState`
- `step(state, action) → { state, log: LogEntry[] }` — the only way state changes. Pure; never mutates input.
- `GameState` is plain JSON (serializable): includes `rng` state, `actionLog`, `schemaVersion`.
- Replay: `replay(config, actions) → GameState` must equal the live state (tested).
- Determinism across JS engines: the engine avoids `Math.exp/log/pow/sin` (implementation-defined);
  normals use Irwin–Hall sums; `Math.sqrt` (IEEE-exact) is fine. ESLint bans `Math.random`/`Date.now` in `src/engine`.
- Key files: `engine/game.ts` (newGame, step, tickDay), `market.ts` (prices/quotes), `travel.ts`,
  `encounters.ts`, `history.ts` (world events), `score.ts`, `save.ts` (schema + migrations).
- Balance knobs: `DIFFICULTY` (game.ts), `SELL_FACTOR`/`DEPTH`/`SAT_RECOVERY` (market.ts), encounter odds and
  `HEAT` (encounters.ts), the charter's prices and dividends (`src/data/charter.ts`),
  goods/tendencies in `src/data`. Re-run `npm run sim` after changing them.
- Time advances only through actions (travel, wait). Each elapsed day runs `tickDay()`:
  interest, price drift, history timeline, contracts expiry, spoilage.

### Lore & content rules (non-negotiable)
- Every codex entry, good, location, faction, event and rumor carries `sources: string[]` and a
  `canon` status: `'canon' | 'unverified' | 'disputed' | 'extrapolation' | 'invented'`.
  The UI shows a badge for anything not plain `canon`.
- Invented things (merchants, the lender, the counting-houses, exact day-of-month for events
  where lore gives only a year) must be marked `invented`/`extrapolation` in data **and** in LORE_BIBLE.md.
- Fan projects (Tamriel Rebuilt, Beyond Skyrim, Project Tamriel…) are not canon: never use them in core content.
- When sources disagree, keep both: model as a `dispute` (competing rumors / historians' entries), not a silent pick.
  Default reading = current UESP.
- Don't paste full in-game book texts (copyrighted): write summaries + at most a short quote, with a source link.
- Slavery is historical context only — never a tradeable good.
- UI wording stays plain (Cash, Debt, Bank, Journal…); lore flavour belongs in codex, rumours, events.
  Canon-status badges are rendered only in the Codex.

### Conventions
- TypeScript `strict`, no `any` in engine/data. Prefer `readonly` data types and string-literal ID unions.
- IDs are kebab-case strings (`balmora`, `kwama-eggs`, `red-year-eruption`).
- Money is integer septims. Weights are integer "stone" units. Dates are absolute day indices
  (day 0 = 1 Morning Star 4E 4) converted by `engine/calendar.ts`.
- Tests sit next to engine code as `*.test.ts`; data integrity tests in `src/data/__tests__/`.
- Commit at the end of each milestone with a descriptive message. Never leave the build or tests red.
- Keep this file and `docs/GAME_DESIGN.md` updated when architecture or design changes.

## Network note (cloud sessions)
Direct fetches to uesp.net / imperial-library.info are blocked by the environment's network policy;
WebSearch works and returns UESP URLs. Facts not confirmed by a search result are tagged `[unverified]`.
