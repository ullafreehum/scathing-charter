# Ashfall Ledger

*A trading game set in the world of The Elder Scrolls, at the dawn of the Fourth Era.*

It is **1 Morning Star 4E 4** in Balmora. You owe the Camonna Tong 3,000 septims, you own one pack guar,
and you have three years. Buy low, sell high, and keep ahead of the debt through the last calm year, the
**Red Year**, and the war that follows. Every place, good and event is drawn from Elder Scrolls lore,
with sources you can click.

> Unofficial, non-commercial fan game. *The Elder Scrolls* is a trademark of ZeniMax Media / Bethesda
> Softworks. This project is not affiliated with or endorsed by them.

---

## 🕯️ First launch on Windows: step by step

You only do Steps 1–2 once. Allow about 10 minutes, mostly waiting for downloads.

### Step 1: Install Node.js (the engine the game runs on)

1. Go to **https://nodejs.org**.
2. Click the big button that says **LTS** (the recommended version). Any version 20 or newer works.
3. Open the downloaded file (`node-v…-x64.msi`) and click **Next** through the installer, keeping all
   the defaults. If it offers *"Automatically install the necessary tools"*, you can leave that
   **unticked**.
4. When it says *Finished*, you're done. You never need to open Node.js yourself.

> Already have Node.js? Check the version: open **PowerShell** (press the Windows key, type
> `powershell`, press Enter), type `node -v` and press Enter. You need `v20` or higher.

### Step 2: Download the game files

1. Open the project page on GitHub: **https://github.com/ullafreehum/bandcamp**
2. **If the game isn't on the main page yet**, open **Pull requests →
   [#1](https://github.com/ullafreehum/bandcamp/pull/1)** and click **Merge pull request →
   Confirm merge**. This copies the game into your main branch. You only need to do this once.
3. Back on the project page, click the green **`<> Code`** button, then **Download ZIP**.
4. Find the ZIP in your **Downloads** folder. Right-click it, choose **Extract All…**, then
   **Extract**.
5. Optional but tidy: move the extracted folder (`bandcamp-main`) somewhere easy, such as
   `Documents\Ashfall Ledger`.

> Prefer Git? `git clone https://github.com/ullafreehum/bandcamp.git` works too.

### Step 3: Start the game

1. Open the extracted folder. You should see files such as `README.md`, `package.json` and **`PLAY.cmd`**.
2. **Double-click `PLAY.cmd`.**
   - If Windows shows *"Windows protected your PC"*, click **More info**, then **Run anyway**. It's a
     plain text script; you can right-click → *Edit* to read it first.
3. A black window opens.
   - **The first time**, it downloads the game's parts. This takes 1–3 minutes, and yellow `warn`
     lines are normal.
   - Then it says **"Starting the game"** and your web browser opens on the title screen.
   - If the browser doesn't open by itself, open it and go to **http://localhost:5173**.
4. **Keep the black window open while you play.** It *is* the game's engine. Close it when you're done.

That's it. 🎉

<details>
<summary>Prefer typing commands instead of double-clicking?</summary>

1. Open the game folder in File Explorer.
2. Click the address bar, type `powershell`, and press Enter. A PowerShell window opens *in that folder*.
3. Type these two commands, pressing Enter after each:
   ```powershell
   npm install
   npm start
   ```
4. To stop the game, click in the PowerShell window and press **Ctrl + C**.
</details>

### Step 4: Your first five minutes

1. On the title screen, click **New Ledger**.
2. **Pick a background card.** Each has a perk (✦) and a burden (✧). *Hlaalu Factor's By-Blow* is a
   gentle start.
3. Keep or change your **Name**. The ↻ button suggests one that fits your race's naming customs.
4. Under **Terms of the note**, choose **Fair Terms** for your first game: a smaller debt and
   gentler interest.
5. Click **Sign the note**. Read the card that appears, then click **Continue**.

You're now in **Balmora**. The screen has three parts:
- **Top bar:** the date (with the two moons), your **Purse** (cash), your **Note** (the debt, which grows
  every day), **Vaults** (bank deposits), **Load** (cargo / capacity), health ♥ and **Worth** (your score).
- **Left panel:** where you are: its story, its laws, and the merchants here. Underlined words open the
  **Codex** (the in-game encyclopaedia).
- **Tabs:** **Market · Travel · Counting-house · Tavern · Outfitter & Temple · Ledger**.

A good first loop:
1. **Tavern → Stand a round.** It's the New Life Festival, so rumours are free tonight. Rumours give price
   tips and warnings.
2. **Market.** A green **▼** next to a price means it's cheap here; a red **▲** means it's dear. Buy
   something cheap (type a quantity, then **Buy**, or **Max**).
   - Avoid goods marked **CONTRABAND** at first: customs can seize them.
3. **Travel.** Click a glowing town on the map, or pick from **Departures**, then **Go**. Each trip costs
   days and a fare. On the road you may meet trouble; read the card and choose.
4. **Market** in the new town: **Sell** what you carried if it's worth more here.
5. When you have a few hundred spare septims, go back to Balmora's **Counting-house** tab and **Pay** some
   of the note. The longer you leave it, the more the Camonna Tong's collectors come looking for you.

> 💡 Read the rumours, and keep an eye on the ash falling on screen. History in this game happens on
> real dates, and it does not care where you keep your money.

---

## 📦 Offline edition (no install, opens in Chrome)

A ready-to-run copy needs only Node.js and Google Chrome, not `npm install` or the internet. It opens in
its own Chrome window even when another browser is your default.

To make it yourself: run `npm run package:offline`. It creates `release/AshGame-offline.zip`.
1. Extract the ZIP into `C:\Games`; you get `C:\Games\AshGame`.
2. Double-click **`Play Ashfall Ledger.cmd`**.

Saves are kept in `AshGame\chrome-profile`. More details are in `README-OFFLINE.txt` inside the ZIP.

## ▶️ Playing again later

Double-click **`PLAY.cmd`** again. It skips the install and opens the game straight away. On the title
screen, click **Continue** to pick up where you left off.

## 💾 Your saves

- The game **saves automatically** after every action, inside your web browser.
- **☰ menu → Save to slot 1/2/3** keeps extra copies; they appear on the title screen.
- **☰ menu → Export save file** downloads a `.ashfall.json` file. Keep it as a backup, or move your game to
  another computer with **Import save file…** on the title screen.
- ⚠️ Saves live in *this browser* on *this computer*. Clearing your browser's history or site data, or
  using a private window, removes them, so export a backup now and then.

## 🛠️ If something goes wrong

| What you see | What to do |
|---|---|
| `'node' is not recognized` or `npm is not recognized` | Node.js isn't installed, or the window was open before you installed it. Do **Step 1**, then **restart your computer** and try again. |
| `npm.ps1 cannot be loaded because running scripts is disabled` | This only happens in PowerShell. Use **`PLAY.cmd`** instead (it avoids the problem). Or type `npm.cmd install` and `npm.cmd start`. |
| The black window flashes and closes immediately | Right-click inside the folder → *Open in Terminal*, type `.\PLAY.cmd` and press Enter. Now you can read the message. |
| `npm install` fails with network errors | Check your internet connection (and any VPN or company firewall), then double-click `PLAY.cmd` again. |
| `Port 5173 is in use` | The game is probably already running in another window. Use that one, or close it and start again. |
| The browser shows *"This site can't be reached"* | The black window must stay open. Start `PLAY.cmd` again and wait for **"Local: http://localhost:5173"**. |
| A blank or dark page | Press **Ctrl + F5** to reload. If it stays blank, close the black window, delete the `node_modules` folder inside the game folder, and run `PLAY.cmd` again. |
| My **Continue** button disappeared | Browser data was cleared. Use **Import save file…** with an exported backup. |
| Text is too small, or the falling ash is distracting | The title screen has **Large text** and **Ash & motion** switches (sound too). |

Still stuck? Copy the last lines of the black window and ask for help. The message usually says exactly
what's wrong.

## 🍎 Mac or 🐧 Linux

1. Install Node.js 20+ from https://nodejs.org (or your package manager).
2. Download and unzip the game (Step 2 above).
3. Open **Terminal** in the game folder and run `./play.sh`.
   - If you get "permission denied", run `chmod +x play.sh` once first.
   - Or simply run `npm install`, then `npm start`.

---

## 📖 How to play (reference)

- **Market:** buy where a good is cheap (▼) and sell where it is dear (▲). Big trades move the price
  against you.
  - **Contraband** sells only to fences (merchants marked *fence*), and customs may search you on arrival.
  - **EEC** goods (ebony, glass, stalhrim) sell openly only to East Empire Company factors.
- **Travel:** every route costs days, a fare (plus freight for heavy loads) and some danger. If you're
  broke, you can **work your passage** instead: free, but slower.
- **Counting-house:** money is deposited in a *particular town's branch* and can only be touched there.
  A *writ of coin* moves it between branches of the same house. Branches can be destroyed by history.
- **Tavern:** rumours (tips, omens, and historians arguing), contracts, hired porters (+12 stone) and
  sellswords, books, and rest.
- **Outfitter & Temple:** bigger carts and holds, weapons and armour, scrolls (Chameleon, Almsivi and
  Divine Intervention), and healing.
- **Score:** your **Worth** = cash + deposits + cargo at fair value − the note. At the end you earn a
  title, plus conduct titles and achievements.
- **Long Chronicle:** finish the Red Year alive and in profit to unlock it. History carries on to the
  coronation of Titus Mede I, a week per day of travel.
- **Keyboard:**
  - Tabs: `m` Market, `t` Travel, `b` Counting-house, `v` Tavern, `o` Outfitter & Temple, `l` Ledger.
  - `c` opens the Codex; `Esc` closes it.
- **Lore badges:** *Unverified*, *Historians disagree*, *Extrapolation* and *Invented for this game*
  tell you how sure the lore is. Open the **Codex → Historians disagree** section for the arguments,
  with sources.

## 🌐 Sharing the game (itch.io or any website)

```powershell
npm run build
```
This creates a **`dist`** folder: the complete game as plain web files, with no internet needed.

To publish on **itch.io**:
1. Zip the *contents* of `dist` (select everything inside it → right-click → *Send to → Compressed folder*).
2. Upload the ZIP as an **HTML** project and tick *"This file will be played in the browser"*.

To try the built version locally, run `npm run preview` and open http://localhost:4173. Browsers refuse
to run it by double-clicking `index.html`.

---

## 🧑‍💻 For developers

| Command | What it does |
|---|---|
| `npm start` / `npm run dev` | Dev server (`start` also opens the browser) |
| `npm test` | Unit tests: engine, determinism/replay, calendar, saves, data integrity |
| `npm run test:e2e` | Browser tests: smoke, UI behaviour, critical-moment scenarios, random-click crash test. Run `npx playwright install chromium` once first. |
| `npm run diagnose -- 4` | Engine stress test: random play across all backgrounds and difficulties with invariant checks |
| `npm run balance -- 24` | Balance diagnostics: six player-type bots, difficulty sweep, economy scan |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

- [`CLAUDE.md`](CLAUDE.md): architecture and conventions.
- [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md): design and balance results.
- [`docs/LORE_BIBLE.md`](docs/LORE_BIBLE.md): every lore fact with its source, the 24 recorded
  disputes, and everything invented for this game.
