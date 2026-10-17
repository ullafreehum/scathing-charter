# Changelog

The Scathing Charter (formerly *Ashfall Ledger*). Versions follow `major.minor.patch`: the middle number
goes up for new features, the last one for fixes. 1.0 comes after full human playthroughs of the Red Year
and the Long Chronicle.

## 0.10.0 (beta): the focus release
One goal, one choice per trip, and a Red Year you can see on the map. Now a Windows app.

- One strongbox per bank city instead of two houses: 0.05% a day, 1% to take money out, no transfers between cities. Old saves add up each city's balances.
- A clear goal: pay off the Tong, then buy the Scathing Charter before the end of 4E 6. Buying it with no debt wins the game at once; only this last tier needs the debt cleared. The Bank tab shows the goal as three steps.
- If your debt passes six times the note, the Tong puts its mark on you and the game ends (with warnings at four and five times). The Tong lends up to five times the note. Indenture is gone.
- At the end date you retire automatically, ranked by net worth; the end-of-game crossroads is gone. Winning or retiring at the end still opens the Long Chronicle.
- Heat is no longer shown: it still decides how often customs search you, and the customs card shows the odds.
- Books are no longer bought: you find them in towns with bookshops, they go into the Codex, and their perks are always on.
- A round at the tavern gives a trade tip, any new warning, and one old tale or historians' quarrel, which goes into the Codex (new Tavern tales section).
- The Red Year shows on the map: an ash haze over Vvardenfell that thickens toward the eruption, a red glow on Red Mountain once the omens start, ash-grey towns with a cracked ring afterwards, closed lines drawn as dotted red crosses, tents at the camps, refugee columns on the roads to Narsis and Mournhold, war fronts hatched around besieged and occupied towns, and a banner over occupied ones.
- The game fits any screen from 1024×600 to 4K and ultrawide: the whole interface grows with the window (designed at 1280×720), stays centred on very wide screens, the map fills the free height, and the hearing shows all eight cards in one row. The Text size setting is now "Text and UI size" and scales on top of that.
- Road events are now crossing cards, at most one per journey: every choice prints its stakes in septims and percentages before you pick. Customs lets you declare and pay 25% duty; a refugee column lets you sell at cost for Mercy and Charter favour (which lowers charter prices); an ash storm lets you wait, hire a guide or push through; Tong collectors can be paid, put off or outrun, and the road stays watched for a month.
- Tavern contracts work as before; they become road scenes in a later version.
- The magistrate's hearing is now an animated card duel (Sorcerer's "Oblivion Wager" design): towers rise and crack, Daedra rise from a summoning circle, every change floats up as a label, and cards you can't afford say what you still need. Plain words throughout: Tower, Wall, Stone, Troops, Magic, and "Deal 6 damage". Speed Normal, Fast or Skip (click the board to hurry a turn); with Animations off or reduced motion it plays instantly. Keyboard and screen readers play the same cards through buttons. Painted card art (from The Battle for Wesnoth), new frames, towers and a lava backdrop. If WebGL is missing, the old plain board is used.
- All credits are in one Credits section, which now also opens from Settings. Every art file's source and licence is in CREDITS.md.
- The game is now a Windows app: download `ScathingCharter-Setup-<version>.exe` (or the Portable .exe) from Releases. It is fully self-contained (no Node.js, Chrome or internet), opens full screen (F11 or Alt+Enter to switch, Ctrl+Plus/Minus for size), and remembers its window. It isn't signed, so Windows asks once: More info, then Run anyway. PLAY.cmd and the offline ZIP are gone; browser saves move over with Export and Import.
- Saves from 0.9.x load and carry on (save format v6).

## 0.9.6 (beta): fixes from a playtest
- Crater salvage in Vivec, ruin clearing in Ebonheart and the rubble crew at Fort Frostmoth only appear after the eruption.
- Borrowing from the Tong has its own amount box and asks before lending.
- Selling at a loss asks first.
- The market shows the cheapest trip now and with a full hold, since fares grow with cargo.
- Encounter and hearing pop-ups are named for screen readers.

## 0.9.5 (beta)
- No more weight limits on travel: Guild Guides take any load, so a full pack never strands you.
- Running out of money no longer ends a run: every place has three day-labour jobs at the tavern (1, 3 or 7 days). A day's wage pays for about two trips to the nearest town, more in towns the Red Year hit; heavier jobs cost health.
- No leg between neighbouring places takes more than 3 days, and the guar cart no longer slows road and caravan legs.
- The Camonna Tong always lends, at Balmora or its agents, with no cap: each advance raises the rate, and a bigger debt brings harder collectors. You can borrow again after paying off.
- Bank deposits earn interest (Hlaalu 0.08% a day, East Empire Company 0.04%) and are safe from robbers.
- The top bar (date, cash, debt) stays on screen while you scroll. The market shows your cash and the cheapest trip out, and **Keep fare** (on by default) stops a purchase from leaving you unable to pay for the next trip.
- Every round at the tavern now brings one true trade tip with real numbers (buy here, sell within two legs, or where your cargo sells best), as well as the usual talk.
- Endings: on the last day a crossroads lets you retire (with an epilogue), keep trading with no end date, take a Charter seat (tier 2+), or take the Tong's mark (debt wiped, play on as their smuggler). Paying off the debt, reaching the top charter tier or high Mercy lets you retire early from the Bank tab. A debt over six times the note makes you indentured: no interest or killers, but the Tong takes 30% of every sale until it is paid.
- Magistrate's hearing: when customs seizes your goods you can contest it in town with a Daedric tower duel (the rules of the classic card game Ants: raise your spire to 100 or topple the advocate's, with ebony, bindings and magicka). Win and you get your goods and fine back; lose and the fine doubles.
- After the eruption Vivec City, Ebonheart and Fort Frostmoth become survivors' camps where merchants still trade, with scarcer stock and crisis prices, instead of vanishing from the map.
- New games use Atkinson Hyperlegible, the most readable font (Classic and the others stay in Settings).
- Softer sounds: healing plays a gentle bell, and the error and event cues are soft chimes instead of buzzes.
- The ☰ menu closes on Escape or a click outside it, not only when the mouse leaves it.
- Market: each row has a ▸ Details toggle that writes out what the hover tips say (who buys and sells, bulk prices, what you paid, best price seen), and the total cost and space left show under Buy, the proceeds under Sell.
- **Undo last trade** takes back buys and sells until you travel, wait or do anything else.

## 0.9.4 (beta)
- Travel tab: the destination list now sits in the left column, so the map lines up with the price list and the tabs stay put.
- Save slots show who, where, the game date and when they were saved; saving shows a check mark, and a slot holding another game asks before it is overwritten.
- The map is redrawn to follow Tamriel's real shape: Vvardenfell ringed by the Inner Sea with Zafirbel Bay, the mainland from Blacklight to Necrom, Solstheim, Topal Bay, mountains, marshes, Lake Rumare and the Niben.

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
