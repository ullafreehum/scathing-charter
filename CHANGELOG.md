# Changelog

The Scathing Charter (formerly *Ashfall Ledger*). Versions follow `major.minor.patch`: the middle number
goes up for new features, the last one for fixes. 1.0 comes after full human playthroughs of the Red Year
and the Long Chronicle.

## 0.10.0 (beta): look and feel

- An icon for each of the 16 goods, in the Market and cargo lists.
- Floating +/− numbers when cash, debt or heat change.
- A short "A → B, n days" banner after each journey (off with Animations).
- "Your fortune": a weekly net-worth chart in the Journal and on the end screen, with big events, paying off the
  debt and charter purchases marked; hover for the date and value.

## 0.9.0 (beta): gameplay balance

Driven by the balance bots (`npm run balance -- 24`); before/after numbers are in GAME_DESIGN §14.2.

- **Markets remember you.** Prices you push by trading recover over about three weeks instead of one. The Market
  shows *Flooded* / *Bought out* with the days left. The best run is back in range and no route dominates.
- **Smuggling heat.** Selling contraband and slipping past customs raise the Legion's attention (top bar). Watched
  (30+): more searches. Wanted (60+): road patrols and double fines. Falls by 1 a day; bribes and arrests lower it.
- **The Scathing Charter**, a goal for the second half: after the Red Year relief, traders who owe the Tong nothing
  can buy a relief supplier licence (12,000), a warehouse at Narsis (30,000) and the full charter (55,000, pays a
  share every 30 days). The new council makes holders renew after House Hlaalu falls. Bank tab; invented for the game.
- **Balance report**: best-route share, charter and heat per play style, new targets, and a debt sweep mode.
- Tried and reverted: raising Normal debt to 4,500. It delayed the best players by about a month but cut careful
  players' median fortune by about a third.
- Saves: schema 4. Older saves load with no heat and no charter.

## 0.8.8 (beta), first numbered version

Everything built so far:

- **Campaigns**: The Red Year (1 Morning Star 4E 4 → 31 Evening Star 4E 6) and the unlockable Long
  Chronicle to the coronation of Titus Mede I.
- **World**: 20 towns, 37 routes in 9 travel modes, 16 goods, 25 dated history events, about 100 rumours,
  holidays and the two moons, a sourced Codex with 24 historians' disputes.
- **Trade and money**: Camonna Tong debt with collectors, two banks with branch-bound deposits and
  transfers, contracts, smuggling and customs, a price memory of every market you have seen.
- **Road**: encounters with real success odds, scrolls (Chameleon, Almsivi, Divine Intervention), porters,
  sellswords, gear and three books with perks.
- **Map**: zoomable views, a travel card per town, a fastest-route planner and toggleable markers.
- **Interface**: plain-language wording, next-step hints, toasts for minor news, five readable
  Vvardenfell themes, four fonts, text size, sound and motion settings.
- **Saves**: autosave, three slots, export/import, schema migrations (old saves keep loading).
- **Offline edition**: runs from `C:\Games\AshGame` in its own Chrome window, no internet needed.
