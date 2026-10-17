# Changelog

The Scathing Charter (formerly *Ashfall Ledger*). Versions follow `major.minor.patch`: the middle number
goes up for new features, the last one for fixes. 1.0 comes after full human playthroughs of the Red Year
and the Long Chronicle.

## 0.9.3 (beta): fix

- **Buy / Max no longer offers more than you can afford.** The button guessed the maximum with a flat 2% margin,
  but buying several at once raises the price a little with each unit. The Market now uses the exact rule the game
  charges by (`bulkBuyTotal` / `maxBuyQty` in market.ts), and the tooltip shows the real total.

## 0.9.2 (beta): time passing, responsive controls

- **Campaign timeline** under the top bar: fills as days pass, gold diamonds for events lived through, hollow ones
  for events the rumours hint at; hover for details. "N days left" beside the date.
- **The date counts through each day** that passes (glowing while it ticks); the moons turn with it.
- **A brief dusk** dims the screen whenever days pass, deeper for longer rests.
- **Money moves visibly**: coins fly between your purse and the Buy/Sell/Deposit/Withdraw button you clicked, and
  from your purse into the debt when you pay the Tong. Top-bar counters roll to their new value with a small bump.
- **Market**: the traded row glows and its owned count pops; rows settle in one after another when you arrive and
  glide into place when re-sorted. The town's name comes into focus on arrival.
- **Tabs and buttons**: the tab underline glides to the new tab and content slides in from that side; buttons lift
  on hover, press in on click and spring back; primary buttons get a soft light sweep.
- All of it follows the Animations setting and the system's reduced-motion preference.

## 0.9.1 (beta): look and feel

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
