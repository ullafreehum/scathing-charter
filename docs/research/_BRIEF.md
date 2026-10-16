# Research brief for lore subagents (ASHFALL LEDGER)

We are building **Ashfall Ledger**, a Dope Wars–style trading game set in the Elder Scrolls
universe at the dawn of the Fourth Era. Main campaign: **1 Morning Star 4E 4 → 31 Evening Star 4E 6**
(the last calm year, the Red Year 4E 5, and the first year of the Argonian invasion of Morrowind).
An optional "Long Chronicle" mode continues to the end of the Stormcrown Interregnum (Titus Mede I's
coronation). Lore density is the #1 goal: every good, place, faction, event, rumor and item
description must teach real lore.

## Tooling constraints (important)
- `curl`, `WebFetch` and direct page loads are **blocked** in this environment (DNS/proxy denial for
  uesp.net, imperial-library.info, fandom, wikipedia). Do not waste time retrying them more than once.
- **`WebSearch` works.** It returns a synthesized summary plus a list of result URLs (often UESP mirrors
  such as `content1.uesp.net`, `content2.uesp.net`, `en.m.uesp.net`). Use it heavily — run several
  searches per topic, in parallel when you can. Prefer `allowed_domains: ["uesp.net", "imperial-library.info"]`.
- When citing, normalise UESP mirror URLs to the canonical form `https://en.uesp.net/wiki/Lore:Page_Name`
  (keep the page name exactly as the search result gave it).

## Source rules
- Primary sources: UESP **Lore namespace** (`Lore:…`) and The Imperial Library. In-game books count as
  primary but note the in-universe author's bias.
- A fact is **verified** only if a WebSearch result from UESP/Imperial Library supports it; cite that URL.
- A fact from your own knowledge that you could not confirm via search: tag **`[unverified]`** (still give
  the UESP page where it *should* live, if you know it).
- Fan projects (Beyond Skyrim, Tamriel Rebuilt, Project Tamriel, Skyblivion, etc.) are **not canon**:
  leave them out, or tag **`[fan]`** if mentioning is unavoidable.
- When sources disagree, **record both sides** under a `CONFLICT:` bullet with each source; prefer current
  UESP as the default reading. The game will present disagreements as competing rumors.
- Anything invented by us for gameplay must never appear as a fact; you may list *suggestions* in the
  "Game hooks" section, clearly labelled as suggestions.

## Output
Write ONE markdown file at the path given in your task (under `docs/research/`). Do **not** edit any
other file and do **not** run git. Structure:

```
# <Area title>
_Researcher notes for Ashfall Ledger. Status tags: (no tag) = verified via cited source; [unverified]; [fan]; CONFLICT._

## 1. Timeline (dated facts, oldest → newest; focus 3E 427 – 4E 40)
- **4E 5, 3 Sun's Dawn** — Red Mountain erupts … — Source: <url>

## 2. Places (status in 4E 4, 4E 5, 4E 6, and later if known)
### <Place>
- Controlling faction / ruler:
- Economy & signature goods:
- What happens to it 4E 4–6 (and later):
- Atmosphere details (architecture, smells, local customs) usable in blurbs:
- Sources:

## 3. Factions & people (who, stance, fate)
## 4. Goods, trade & laws relevant to this area (what is produced, what is contraband, tariffs, currency)
## 5. Culture & daily life (food, drink, religion, naming conventions with examples, festivals, slang)
## 6. Conflicts & uncertainties (each with both sources)
## 7. Game hooks (SUGGESTIONS ONLY — events, rumors, price effects, route changes, encounters, codex ideas)
```

Aim for density: 80–200 bullet facts. Every bullet ends with a source URL or a tag. Be precise about
dates (era, year, month, day where known). Be explicit when a date is approximate ("c.") or disputed.
