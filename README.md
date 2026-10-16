# Ashfall Ledger

*A lore-dense trading game set at the dawn of the Elder Scrolls' Fourth Era.*

It is **1 Morning Star 4E 4** in Balmora. You owe the Camonna Tong 3,000 septims, you have a pack guar and
three years. Buy low, sell high, and outrun the note through the last calm year, the **Red Year** (4E 5,
when Baar Dau falls on Vivec City and Red Mountain erupts), and the year the Argonians march north.

Every good, place, faction, event and rumour cites its UESP / Imperial Library sources. Anything
**unverified**, **disputed**, **extrapolated** or **invented** for gameplay carries a badge.

> Unofficial, non-commercial fan game. The Elder Scrolls is a trademark of ZeniMax Media / Bethesda
> Softworks; this project is not affiliated with or endorsed by them.

## Play it

Requires [Node.js](https://nodejs.org/) 20+. Works the same in Windows PowerShell, macOS and Linux:

```powershell
npm install
npm run dev        # open the printed http://localhost:5173 link
```

Build the static, offline game:

```powershell
npm run build      # outputs dist/
npm run preview    # serves dist/ at http://localhost:4173
```

`dist/` uses relative paths and bundles its fonts, so it needs no network.

To publish it on **itch.io**:
1. Zip the *contents* of `dist/` (so `index.html` sits at the top of the zip).
2. Upload the zip as an HTML game and tick "This file will be played in the browser".

Browsers block module scripts on `file://`, so run `index.html` through any static server rather than double-clicking it.

## How to play
- **Market**: buy where a good is cheap (▼) and sell where it is dear (▲). Bulk trades move prices.
  - **Contraband** sells only to fences, and customs may search you on arrival.
  - **EEC** goods (ebony, glass, stalhrim) sell openly only to East Empire Company factors.
- **Travel**: every route costs days, a fare plus freight, and risk. Encounters offer fight, flee, bribe, hand over cargo, or read a scroll.
- **Counting-house**: deposits sit in a specific branch, and history can destroy a branch. A *writ of coin* moves money between branches of the same house. Hedge before the ash falls.
- **Tavern**: rumours give price tips, omens of what is coming, and arguments between historians. You can also take contracts, hire porters and sellswords, and buy books.
- **The note** compounds daily. Pay Gavas Drelloth's collectors, or his enforcers will find you on the road.
- **Keyboard**:
  - `m` market, `t` travel, `b` counting-house, `v` tavern, `o` outfitter, `l` ledger;
  - `c` codex, `Esc` to close it.
- **Score** is your net worth (cash + deposits + cargo at fair value − note), plus wealth and conduct titles and achievements.
- **Long Chronicle**: finish the Red Year alive and in the black to unlock it. It continues, a week per travel day, to Titus Mede I's seizure of the Imperial City.

## Develop
| Command | What |
|---|---|
| `npm test` | Vitest: engine, determinism/replay, calendar, saves, data integrity |
| `npm run test:e2e` | Playwright smoke test and screenshots (`tests/e2e/__screenshots__/`); run `npx playwright install chromium` once |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc` |
| `npm run sim -- 100` | Headless greedy bot over 100 seeds (balance check) |

Project conventions and architecture: [`CLAUDE.md`](CLAUDE.md). Design: [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md).
Lore, the sources behind it, the 24-entry dispute register and the invented-content registry:
[`docs/LORE_BIBLE.md`](docs/LORE_BIBLE.md).
