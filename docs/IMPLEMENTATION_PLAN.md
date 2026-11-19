# New section: AA-PersonalityBench (indexes, traits, trait details)

Adds a Personality section to Model Atlas: one table of every model AA scores on PersonalityBench, where you can open
any of the 8 indexes to see the traits under it, and open any trait for its details. Earlier plans:
[IMPLEMENTATION_PLAN-done.md](IMPLEMENTATION_PLAN-done.md) (SWE-Atlas-QnA, live since 2026-11-18).

Working branch: `personality-bench`. Every task commits and pushes there. `main` deploys to production and moves only
on O1.

## What the owner asked (2026-11-19)

"Put all the personality benches and its sub and the sub below that too in a table just like in the current
leaderboard but a section just for personality bench, and be able to see which are the sub-indexes under Imagination,
Warmth, Conviction etc., and also see details of each of the sub-sub indexes (say Sincere, Emotionally Intelligent)."

Simplest design that meets it: one new page, `/personality`, with one table that has three levels, picked with a row of
chips above it and kept in the URL:

1. **All indexes** (the default): Model, Provider, then the 8 index percentiles.
2. **One index** (for example Warmth): Model, Provider, the Warmth percentile, then one column per trait under it
   (Friendly, Humorous, Sincere, Emotionally Intelligent). The index's description and each trait's definition show
   above the table.
3. **One trait** (for example Sincere): Model, Provider, Percentile, Elo, and Elo 95% interval. The trait's definition,
   the index it belongs to (a link back to it) and a link to AA's trait page show above the table. Slop has one trait,
   so opening the Slop index opens this view directly.

The table works like the master leaderboard: search, provider filter, favorites filter, sortable headers, pagination,
the model column pinned while the rest scrolls on a phone. Data is captured from AA once, trimmed into one bundled JSON
file and read at build time, the way the speed data is. Nothing else on the site changes.

## What AA publishes (read on the live page, 2026-11-19)

- **Page:** `https://artificialanalysis.ai/evaluations/aa-personalitybench`. AA also has a page per index
  (`/evaluations/aa-personalitybench/indexes/warmth`) and per trait (`/evaluations/aa-personalitybench/traits/sincere`).
- **What it measures:** how a model writes, not whether it is right. 30 traits, 30 prompts each (900 in all), judged
  pairwise by a panel of LLM judges and turned into a Bradley-Terry Elo per trait. Each index is the mean of its traits'
  Elo z-scores (inverted traits flipped), percentile ranked 1 to 100 across every model tested. Each trait also has its
  own percentile. Higher means "more of it"; for **Slop** and **Sycophantic**, lower is better.
- **The 8 indexes and their traits** (AA's camelCase keys in brackets where they differ from the label):
  Expressiveness: Lexically Varied, Eloquent, Literate, Natural Sounding, Metaphorical ·
  Organization: Structured, Scannable, Bottom-Line Summary (`summarizesBottomLine`), Answer First ·
  Informativeness: Information Dense, Evidence-Based, Resource-Specific, Actionable Guidance
  (`providesActionableGuidance`), Pragmatic ·
  Transparency: Truthful, Admits Uncertainty, Disclaims Assumptions (`disclaimsWithAssumptions`), Flags Nuances,
  Sycophantic (inverted) ·
  Warmth: Friendly, Humorous, Sincere, Emotionally Intelligent ·
  Conviction: Direct, Confident, Opinionated, Constructive Pushback (`constructivelyPushesBack`) ·
  Imagination: Creative, Open-Ended · Slop: Slop.
- **What the page carries, per model** (in the Next.js payload, `self.__next_f.push` chunks, under `judged`):
  `scores` (trait Elo), `cis` (Elo 95% lower/upper), `zScores`, `ranks` (trait percentiles, unrounded, such as
  80.96), `rankIntervals`, `indexScores` (index percentiles) and `indexIntervals`. The labels, index descriptions,
  question counts and every trait's one-line `definition` are in the same payload (for example Sincere: "Does the tone
  feel genuinely engaged rather than templated or performative?").
- **Only 9 models are in the first HTML** (the default selection); the model selector says 53
  (`placeholderTotalCount: 53`). The full set needs the selector's "Select all", as in
  `scripts/capture-aa-evaluations.mjs`. 2026-11-19 includes Fable 5.2, GPT-6.2 Astra and Sol (each at several efforts),
  Opus 5.5, Kimi K3.1 Pro, Grok 4.7 and GLM-5.3.
- The page also has 21 measured style characteristics (length, lists, emoji…) and judge examples. Not asked; left out.

## Decisions (defaults, so no task stops to ask)

- **Its own section, outside the evaluations.** Not a master column, not in the aggregate rank, not in the suitability
  planner, not in Firestore. PersonalityBench describes style, and AA doesn't rank models on it overall, so mixing it
  into ranks would mislead. `aggregateMaster`, `data/leaderboards.json` and every saved task stay as they are.
- **Slop is not flipped.** Its index is its one trait's percentile, so higher means more slop; only Sycophantic is
  flipped inside Transparency. Both carry "↓ lower is better".
- **The trait list lives in the importer** (the 8 indexes and 30 traits above, in that order). The import throws when
  the payload's own index cards list different traits, or a trait key is missing or new.
- **Bundled data, no publish.** The trimmed file is `data/aa-personalitybench.json`, imported by the page like
  `data/aa-model-speed.json`. `npm run publish:data` has nothing to send for it; it reaches production with the deploy
  (O1). A refresh is a capture, an import and a deploy, written in `docs/DATA_DICTIONARY.md`.
- **Names match the master's.** Each AA model name goes through the importer's `canonicalModelName` and the same
  provider names, so `masterIdentityKey` matches the master row and favorites carry over. A model with no master row
  still shows under its AA name and AA's creator name (`creator.name` in its record); the inventory doc lists it. The
  import throws if two AA models end up with the same identity key.
- **Missing values stay.** A model missing an index or trait value keeps its row with `null` there; the doc counts them.
- **Capture date:** the capture stores when it ran (`captured_at`); the import copies it, so a repeat import changes
  nothing. `/personality` shows "Artificial Analysis · captured 19 Nov 2026" under its title with AA's link, as the
  evaluation pages do.
- **What a cell shows:** the percentile rounded to a whole number (sorting uses the unrounded value). The trait view
  also shows Elo (one decimal) and its 95% interval as "1,268–1,317". A missing value shows "—" and sorts last both
  ways, as in the master.
- **Default sort:** the first score column of the view, highest first; for Slop and Sycophantic, lowest first. Those two
  carry "↓ lower is better" in their header and definition.
- **URL:** `/personality?index=warmth&trait=sincere` plus the master's filter keys (`q`, `p`, `f`, `s`, `d`, `i`, `z`).
  An unknown index falls back to All indexes, never an error. A trait with no index (`?trait=sincere`) opens it under
  its own index; a trait from another index (`?index=conviction&trait=sincere`) opens Conviction and drops the trait; an
  `s` naming a column the level lacks uses that level's default sort. The interval column doesn't sort. Changing level resets the page to 1 and the sort
  to that level's default, and keeps search, provider and favorites.
- **Where it's linked:** a "Personality" item in the main navigation (`src/components/app-shell.tsx`) and one card on the
  home page next to the task suitability card. `/about/data` gets one paragraph on what it measures and its capture date.
- **Look:** the master leaderboard's table, chips, buttons and spacing (`src/components/ui/primitives.tsx`,
  `TableScroll`, `ProviderMultiSelect`, `Pagination`). No new colours or components. Level chips: All indexes plus the 8
  indexes in one row; inside an index, its traits in a second row. On a desktop the rows wrap; on a phone each row is one
  line that scrolls sideways on its own. Trait headers wrap to at most two lines. On a phone it stays a table with the
  model column pinned (no cards), at least two score columns visible beside it, and the definitions sit in a closed
  "What these mean" disclosure so the table starts on the first screen. No matches shows the master's "No models match
  these filters."

- **Not built (follow-ups for the owner to pick):** CSV export, a master column per index, the 21 measured
  characteristics, comparing two models side by side, AA's judge examples, the for-fun MBTI and Enneagram guesses.

## Before the run

- [x] Branch `personality-bench` pushed with upstream.

## Phase 1: build and release

| # | Task | Pick | Why | Done |
|---|---|---|---|---|
| 1.1 | **Capture, import and inventory** [no look]. Add `scripts/capture-aa-personalitybench.mjs` (run like the evaluation capture, `PLAYWRIGHT_MODULE=…`): open the page, select every model with the selector logic of `scripts/capture-aa-evaluations.mjs` (export and reuse its helpers, don't copy them), then read every model's `judged` record and `creator`, the labels, index descriptions and trait lists, question counts and trait definitions from the page's payload, and write `data/aa-captures/aa-personalitybench.json` with `captured_at`. It throws, naming the page, when the selector isn't "M of M" or the records found aren't M. Add `scripts/import-aa-personalitybench.ts` (`npm run import:aa-personalitybench`) that writes `data/aa-personalitybench.json`: `captured_at`, the source URL, the 8 indexes in AA's order, each with label, description, question count and its traits (key, label, definition, lower-is-better flag, AA trait URL); and per model its name, provider, identity key, 8 index percentiles, and per trait percentile, Elo and Elo interval (`null` where AA has none). Put the types and the loader in `src/lib/personality.ts`. Add `tests/aa-personalitybench-import.test.ts`. Write `docs/AA_PERSONALITYBENCH_CAPTURE.md`: each AA model, the name and provider it gets, whether a master row matches, and any missing values. Add the refresh steps to `docs/DATA_DICTIONARY.md`. Read: "What AA publishes" and Decisions above; "Ordering and ingestion" in `docs/DATA_DICTIONARY.md`. **Done when**: the capture holds as many models as the selector counts (53 on 2026-11-19); the file has 8 indexes and 30 traits, each under the index listed above; a test changing one trait in a fake payload's index card makes the import throw; all identity keys are unique and a test with two models sharing one makes the import throw; the Fable 5.2, GPT-6.2 Astra and GPT-6.2 Sol rows have the same identity keys as their master rows; every value is 1–100 (percentiles) or inside its interval (Elo), or `null`; a second import changes no file; a forced selector failure throws naming the page; `git status` shows no change to `data/leaderboards.json` or the other captures; `tsc` and the new test pass. | Sol Max | New scrape and import that feed a page: FrontierCode 9, Terminal Bench 9 | 2026-11-19 · 53 models, 8 indexes, 30 traits, repeat import verified |
| 1.2 | **The Personality page** [look]. Build `/personality` (`src/app/personality/page.tsx`, `src/components/personality-leaderboard.tsx`, the level, sort and URL logic in `src/lib/personality.ts`) as the design at the top and Decisions describe, with the master leaderboard's search, provider filter, favorites filter, sortable headers, pagination and pinned model column. Add the nav item, the home card and the `/about/data` paragraph. Add `tests/personality.test.ts`: every URL case in Decisions, the default sorts (Slop and Sycophantic lowest first), a fixture with a `null` value sorting last both ways, and level changes resetting page and sort. Then run the app (dev server, stopped by its PID) and take shots to `docs/screenshots/personality/build/`. Read first: `src/components/master-leaderboard.tsx`, `src/app/page.tsx`, `src/components/app-shell.tsx`, the master's rules in `src/app/globals.css`, and the UI rule in `AGENTS.md`. **Done when** the shots show: at 1440px, All indexes with Model, Provider and all 8 index columns without sideways scrolling and "↓ lower is better" on Slop; Warmth with the Warmth column then Friendly, Humorous, Sincere, Emotionally Intelligent and their definitions; Transparency (the widest: 5 traits) with Sycophantic marked lower is better and every header on at most two lines; Conviction with "Constructive Pushback" readable; Sincere with Percentile, Elo, the interval, its definition, "Part of Warmth" and AA's link; Slop opening its trait view; Imagination with only Creative and Open-Ended; the master leaderboard and Warmth at 1440px shot one after the other with the same table header, chip, button and spacing style; at 390px, All indexes, Transparency and Sincere with the model column pinned, at least two score columns beside it, the table starting on the first screen, the chips in one scrolling row, and no sideways page scroll; the home page at 1440px and 390px with the new card, and `/suitability` at 390px with the nav drawer open showing Personality. Also: reloading `/personality?index=warmth&trait=sincere&q=claude` restores that view; the tests and `tsc` pass. | Opus 5.5 High | First page of a new kind that sets its look (Presentation 28, Analytical Elo 10) | 2026-11-19 · 3 levels, 13 URL/sort tests, shots in `build/` |
| 1.3 | **Browser check** [look]. Production build, `next start` through the node `next` bin, stopped by its PID (memory `next-start-pid`). Add `scripts/check-personality-browser.mjs`, modelled on `scripts/check-evaluation-browser.mjs`, and run it with `scripts/check-master-browser.mjs` (its expectations unedited). Shots go to `docs/screenshots/personality/`. **Done when**: both scripts pass; the count line on All indexes, Warmth and Sincere says the number of models in 1.1's doc; clicking the Sincere header sorts highest first, then lowest first, and the Slop header lowest first by default; search "claude" with the Anthropic provider filter shows only Anthropic rows and survives a reload; a model starred on the master page shows when "Favorites only" is picked on `/personality`, and an unstarred one doesn't; "No models match these filters." shows for a search with no hits; the nav item is marked current on `/personality`; the home card's link opens it; shots at 1440px and 390px of All indexes, Transparency and Sincere. | Sol High | Build, server, browser and shots: Terminal Bench 17 for $0.56 | |
| R1 | **Phase 1 review**: the diff from `main`, 1.1's doc against the capture, and the 1.2 and 1.3 shots. Quick fixes only; the rest become fix rows under this one. **Done when**: five models' Sincere, Warmth and Slop values on live AA (two Claude, two GPT-6.2, one other) match the page; every FINDING is fixed or has a fix row; if a fix touched data or the page, 1.3's checks run again and pass. | Opus 5.5 High | Other family from most of the build (1.1 and 1.3 are Sol) | |
| O1 | *owner*: release with `git push origin personality-bench:main` (no `publish:data` needed: the data ships with the deploy). On the live site, open `/personality`, open Warmth, then Sincere. | — | — | |
