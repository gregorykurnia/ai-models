# New section: Workflows (model picks per step, from the data)

Adds a Workflows section to Model Atlas. A workflow is a list of steps you usually run with several models (the first
one is your sales proposal flow). Each step names the traits it should be high, moderate or low on, and the page
works out the best models for every step from the AA-PersonalityBench data, instead of you picking them by hand.
Earlier plans: [IMPLEMENTATION_PLAN-done.md](IMPLEMENTATION_PLAN-done.md) (AA-PersonalityBench, live since 2026-11-19).

Working branch: `workflows`. Every task commits and pushes there. `main` deploys to production and moves only on O1 or O2.

## What the owner asked (2026-11-19)

"There's a flow for stuff I usually do [section 1 of the Multi-Model Sales Proposal Collab doc] and I've manually put
the models. We should do these kinds of things, and similar ones in the future, in a new sidebar section." Then: "Maybe
add new workflows from the VS Code chat. Go make the plan; if we want GPT to do it, we can."

Simplest design that meets it:

1. **A workflow is a JSON file** in `workflows/` (for example `workflows/sales-proposal.json`), listed in one registry
   file. New workflows are added by asking a chat (Claude or Codex in VS Code) to write one, following
   `docs/WORKFLOWS.md`. There's no editor in the app and nothing is saved to Firestore.
2. **The app ranks the models for each step** from `data/aa-personalitybench.json` (all 53 models, all 30 traits and 8
   indexes) and shows the top picks with their scores. Your hand picks came from AA's top-5 lists, so the app can rank
   models your doc had to mark "Not in top 5".
3. **One sidebar item, "Workflows"**: a list page and one page per workflow.

The source flow is copied into the repo at `docs/workflows/proposal-source.md` (autorun sessions can't open Claude
Docs), with your hand picks so the app's picks can be checked against them.

## Decisions (defaults, so no task stops to ask)

- **File format** (`workflows/<slug>.json`, checked with zod in `src/lib/workflows.ts`):
  `{ slug, title, summary, updated, steps: [{ id, title, goal, targets, evaluations?, other_checks?, note? }] }`.
  - A **target** is `{ "trait": "<trait key>", "aim": "high" | "moderate" | "low" }` or the same with `"index"` for a
    whole index (the doc uses the Organization and Warmth indexes). Keys are the ones in `data/aa-personalitybench.json`.
  - **`evaluations`** is a list of evaluation slugs from `data/leaderboards.json` (such as `briefcase-v1-1`, `gdp-pdf`).
  - **`other_checks`** is free text for checks Model Atlas doesn't hold (AA-Omniscience hallucination rate, GDPval-AA
    v2, Briefcase's Word and PDF breakdown).
  - Step ids are short strings of `a-z`, `0-9` and `-` (`"0"`, `"3a"`), unique within the file; they become anchors.
  - Validation throws, naming the file and the key, on an unknown trait, index or evaluation slug, an aim that isn't
    one of the three, a step with no targets, a duplicate step id, or a slug that doesn't match the file name.
- **Score per target**, from the raw percentile p (1–100, "more of the trait"; for Slop and Sycophantic, more is worse;
  an index target uses the model's `index_percentiles` value, also 1–100):
  aim high = p, aim low = 100 − p, aim moderate = 100 − 2 × |p − 50|. So "aim low" on Slop rewards little slop.
  **Fit** = the plain average of the step's target scores. Every model has every trait (0 missing values on
  2026-11-19); if a later capture has a gap, that target is left out of the average and the cell shows "—".
- **Evaluations are shown, not scored.** They match the doc's "Evals to check" column: each pick shows its rank there
  ("#4 of 41", or "Not ranked"), taken from the master dataset (`getMasterDataset`) by `identity_key`. Mixing ranks into
  Fit would let a missing Briefcase rank decide a pick. (Follow-up: let evaluations count in Fit.)
- **Pick and runners-up are different models.** In the overview, the pick and two runners-up are the best row of
  three different model families. A family is the identity key with its trailing bracket removed (`openai gpt-6.2 sol
  (high)` → `openai gpt-6.2 sol`), so five GPT-6.2 Sol efforts don't fill the top three. The step detail shows the top
  5 rows as they are, variants included.
- **Ties** sort by Fit (unrounded), then model name. Percentiles are stored unrounded (such as 80.96), so exact ties
  are rare. Fit shows as a whole number.
- **What a cell shows:** a target cell shows the raw percentile, rounded, as `/personality` does, so the two pages agree;
  the "aim" line under the header says how it was scored, and Fit is the score. An index target's label ends in
  "index" ("Warmth index") so it can't be read as a trait. A missing value shows "—"; an empty aim column in the
  overview shows "—"; a step without evaluations, `other_checks` or a note simply leaves those parts out. A model with
  no target value at all gets no Fit ("—") and sorts last.
- **Data sources:** personality scores come from the bundled `data/aa-personalitybench.json` (a refresh is a deploy, so
  it can't break the pages between releases). Evaluation slugs are validated in the tests against
  `data/leaderboards.json`; on the page, an evaluation the live data doesn't hold shows "Not ranked" for every row
  rather than failing.
- **Notes stay the owner's.** A step's optional `note` is shown under it. The app writes no advice; it shows the scores
  and the other checks.
- **Pages** (force-dynamic like `/`, since evaluation ranks come from the data loader):
  - `/workflows`: page header, then one card per workflow (title, summary, number of steps, "Open →").
  - `/workflows/[slug]`: page header (title, summary, "Updated <updated> · picks from AA-PersonalityBench, captured
    <date>" with a link to `/personality`). Then an **overview table**: Step, Goal, Aim high, Aim moderate, Aim low, Pick, Runners-up. The trait
    names are the labels from the data, and each step title links to its detail below (`#step-3a`). Then a **detail
    section per step**: its goal, a table of the top 5 (Rank, Model, Provider, one column per target with "aim high",
    "aim moderate" or "aim low" under the trait name, Fit, then one column per evaluation), the "Also check (not in
    Model Atlas)" line when `other_checks` is set, and the note. A short explanation above tables with evaluations
    distinguishes Fit from benchmark ranks. An unknown slug is the site's not-found page.
- **Look:** the `/personality` table, chips, buttons and spacing (`src/components/ui/primitives.tsx`, `TableScroll`, the
  pinned first column). No new colours or components. Overview chips stack within their columns. On a phone,
  Pick follows Step in the overview so both are visible on entry. The overview pins Step and the detail
  tables pin Model. Horizontal scrolling stays inside the table frames, and pinned columns wrap long names
  to stay within about 40% of the frame. An anchor jump lands with the step heading clear of the sticky bar.
- **Where it's linked:** a "Workflows" item in the sidebar (`src/components/app-shell.tsx`) after Personality, with its
  own line icon in the style of the others. No home card.
- **Shipping:** workflow files ship with the deploy. `npm run publish:data` has nothing to send, and `CLAUDE.md`'s
  publish rule (which covers `data/`) doesn't apply to `workflows/`.
- **Not built (follow-ups for the owner to pick):** an in-app editor, "use a different model from step N" (fresh eyes
  for steps 5 and 6), two-model pairs, a weight per target, a home card, a note when a data refresh changes a pick.
  Phase 2 builds the model list and the benchmark bar, in place of the follow-ups "favorites-only filter" and
  "evaluations counted in Fit".

## Phase 2 brief: your models, a benchmark bar and the meeting follow-up workflow

Phase 2 limits the picks to the models you actually use and drops any model that ranks low on the step's benchmarks.
It also adds a second workflow: client meeting → analysis, report and follow-ups.

**What the owner asked (2026-11-19).** "The only ones that were including are: any of the ChatGPT models, any Claude
models, Muse Spark 1.3, Grok 4.5, GLM 5.3 Max, GLM 5.3 Flash, Qwen4 Max, Gemini 3.8 Flash, Gemini 3.1 Pro, DeepSeek
V4.1 Flash 1017", "I want a way to note this also in the new feature". On weightings, they chose a minimum benchmark
bar over weights: "rerun it with the top 25% bar". Also: put the meeting follow-up flow on the site.

**Simplest design that meets it:**

1. **One shared model list**, `workflows/models.json`, used by every workflow:
   `{ "updated": "YYYY-MM-DD", "providers": ["OpenAI", "Anthropic"], "models": [{ "label": "Grok 4.5", "family": "spacexai grok 4.5" }, …] }`.
   - A model is on the list when its `provider` is in `providers`, or its family is in `models`.
   - The family is `familyKey(identity_key)` with the NUL between provider and model replaced by a space:
     `spacexai\u0000grok 4.5 (high)` becomes `spacexai grok 4.5`.
   - The owner's families: `meta muse spark 1.3`, `spacexai grok 4.5`, `z ai glm-5.3`, `z ai glm-5.3-flash`,
     `alibaba qwen4 max`, `google gemini 3.8 flash`, `google gemini 3.1 pro preview`, `deepseek deepseek v4.1 flash 1017`.
   - At load, zod checks only the file's shape (like the workflow files), throwing and naming the file and the bad key.
     The tests check that every provider and family matches a row in `data/aa-personalitybench.json` or
     `data/leaderboards.json`. At runtime a family that matches nothing simply picks nothing. A data refresh must never
     take the pages down.
   - A family with no AA-PersonalityBench row is allowed but is never picked. The list page names it as having
     no personality scores yet, worked out from the data rather than written in. On 2026-11-19 that is Qwen4 Max.
   - The labels show as the owner wrote them. GLM-5.3 and Gemini 3.1 Pro each have one row in the data (Max and
     Preview), so a family covers exactly what the owner named.
2. **The benchmark bar.** A model can be picked for a step only if it ranks in the top 25% of every evaluation the
   step lists: rank ≤ the bar rank, max(1, floor(cohort size × 0.25)). These are the same rank and cohort size the page
   shows ("#9 of 157", from `evaluationRanks`), held in one constant, `BENCHMARK_BAR = 0.25`. On 157 the bar rank is 39,
   on 158 it's 39, and on 3 it's 1.
   - "Not ranked" misses the bar.
   - A step with no evaluations has no bar.
   - An evaluation that no master row holds at all (missing from live data) is left out of the bar. Its column still
     shows "Not ranked", and the step says the bar skipped it. Otherwise a gap in the live data would blank every pick.
   - **Data:** ranks come from `getMasterDataset()`. Tests, the dev server and the browser checks read the bundled
     `data/` files (`DATA_SOURCE` unset), and production reads Firestore, which holds the same snapshots after
     `npm run publish:data`. Every check and hand calculation in Phase 2 uses the bundled files.
3. **What ranks and what's shown.**
   - Fit is unchanged: an equal average of the step's targets, with no weights.
   - The pick, the runners-up and the step's top-5 table use only models on the list that clear the bar, ordered by
     Fit, with the same family rule as now.
   - Under each step's table, at most two short lines:
     - **"Higher Fit, below the bar":** list models with a higher Fit than the pick that miss the bar, one per family,
       at most 3. Each names every benchmark it missed, with its rank and the bar, for example
       "Sonnet 5.5 Max (Fit 94): AA-Omniscience #47 of 157, bar #39". When there is no pick, the line lists the 3 listed
       families with the best Fit instead.
     - **"Higher Fit, not on your list":** models off the list that clear the bar with a higher Fit than the pick, one per
       family, at most 3. This line is left out when there is no pick.
   - A step with no evaluations says "No benchmarks for this step, so no bar" where the bar help would be.
   - When no model clears the bar, the step's pick shows "—" with the line "No model on your list clears the bar".
   - The page header adds: "Picks use your model list (on the Workflows page) and must rank in the top 25% of each of
     the step's benchmarks."
   - `/workflows` gets a "Your models" card: "Any OpenAI model", "Any Anthropic model", then each label, with the
     no-personality-scores note.
4. **The meeting follow-up workflow**, `workflows/client-meeting-followup.json`, with six steps. Keys are the data
   file's trait and index keys; benchmarks are evaluation slugs.

   | Id | Title | Goal | Aim high | Aim moderate | Aim low | Evaluations |
   |---|---|---|---|---|---|---|
   | 1 | Extract | Decisions, commitments (who, what), open questions, the client's pains in their own words, numbers | truthful, disclaimsWithAssumptions, informationDense, flagsNuances | — | — | briefcase-v1-1, aa-omniscience-index |
   | 2 | Analyse | What the client really cares about, risks, buying signals, where we stand | evidenceBased, pragmatic, constructivelyPushesBack, flagsNuances | — | sycophantic | strategy-ops-index, aa-briefcase-analytical-quality-elo |
   | 3 | Follow-ups with dates | Each action with an owner, a recommended date and the reason for that date | providesActionableGuidance, pragmatic, direct, disclaimsWithAssumptions | — | openEnded | strategy-ops-index, briefcase-v1-1 |
   | 4 | Write the report | Summary first, easy to skim | organization (index) | — | slop | aa-briefcase-presentation-elo, aa-briefcase-rubric-score |
   | 5 | Client recap email | Short, human, confirms the agreed next steps | naturalSounding, sincere, direct | warmth (index) | slop, sycophantic | — |
   | 6 | Check against the transcript | Every claim, action and date traces back to something said; list what doesn't | transparency (index), constructivelyPushesBack | — | sycophantic | aa-omniscience-index |

   Notes (the owner's words, kept in `note`):
   - Step 3: "No benchmark tests date suggestions. Give the model the meeting date and today's date, and check every
     date by hand."
   - Step 6: "Use a fresh chat and a different model from step 4."

   **The picks worked out in chat on 2026-11-19**, for comparison. These used the latest `data/leaderboards.json`
   snapshot's row counts as cohorts, so the page's cohort sizes may differ:
   - Step 1: Opus 5.5 Max, Fable 5.1 Max, GPT-6 Astra Max.
   - Step 2: Fable 5.1 Max, Opus 5.5 Max, Sonnet 5.5 Max.
   - Step 3: Fable 5.1 Max, Opus 5.5 Max, GPT-6.2 Sol Max.
   - Step 4: GPT-6.1 Sol Max, Sonnet 5.5 Max, Opus 5.5 Max.
   - Step 5: GPT-6.2 Astra Medium, GPT-6.2 Sol High, GPT-6 Sol Max.
   - Step 6: Fable 5.1 Max, Opus 5.5 Max, Fable 5.2 Max.

**Phase 2 decisions (defaults, so no task stops to ask):**
- The model list and the bar apply to every workflow, the sales proposal included. Its picks will change, and its
  check doc and pinned picks are redone (2.2, 2.4).
- No toggle to show all models, and no bar setting per workflow or per step. Both are follow-ups. The two note
  lines show what the list and the bar left out.
- No warning when step 6's pick is the same model as step 4's. The owner's note on step 6 covers it, and the Phase 1
  follow-up "use a different model from step N" stays on the list.
- "Any ChatGPT model" means every OpenAI row (GPT-3.5 Turbo and GPT-4o included, as the owner said "any"). "Any Claude
  model" means every Anthropic row.
- Phase 1's O1 can ship before Phase 2 or together with O2. Both are the same push from `workflows`.

## Before the run

- [x] Branch `workflows` pushed with upstream.

## Phase 1: build and release

| # | Task | Pick | Why | Done |
|---|---|---|---|---|
| 1.1 | **Format, scorer and registry** [no look]. Write `src/lib/workflows.ts`: the zod schema and validation in Decisions, the score per target, Fit, the family key, `rankStep(step, dataset)` (top N rows) and `stepPicks(step, dataset)` (pick plus two runners-up from different families), and `evaluationRanks(identityKey, evaluationSlugs, masterRows)` returning rank and cohort size (the number of master rows ranked in that evaluation). Add the registry `src/lib/workflow-registry.ts`, which imports each `workflows/*.json` and validates it at load. The registry starts empty (the list page shows an empty state); tests use fixtures in `tests/fixtures/workflows/`. Add `tests/workflows.test.ts`. Read: Decisions above; `src/lib/personality.ts`; `getMasterDataset` in `src/lib/data.ts` and `masterIdentityKey` in `src/lib/master.ts`. **Done when** tests show: p = 80 scores 80 high, 20 low and 40 moderate; p = 50 scores 100 moderate; an index target scores from `index_percentiles`; Fit averages the targets and leaves out a `null`, and a model with no values gets no Fit and sorts last; a fixture with five Sol efforts at the top gives a pick and runners-up from three families; run over every identity key in `data/aa-personalitybench.json`, the family key groups the five GPT-6.2 Sol rows into one family, the five GPT-6.2 Astra rows into one, the two Sonnet 5.5 rows into one, and keeps Fable 5.1 and 5.2 apart (the test prints any other family with more than one row, and each is a real variant group); `evaluationRanks` on the real data finds a master row for at least 45 of the 53 personality rows (51 on 2026-11-19) and a `briefcase-v1-1` rank with its cohort size for at least 45 (49); a step id with a space or capital throws; equal Fit sorts by model name; each invalid case in Decisions throws naming the file and the bad key; a test fails when a file in `workflows/` is missing from the registry; `tsc` and the tests pass. | Sol Max | Scores: FrontierCode 9, Terminal Bench 9 | 2026-11-19 · 23 workflow tests passed |
| 1.2 | **The sales proposal workflow, its check and the how-to** [no look]. Turn `docs/workflows/proposal-source.md` into `workflows/sales-proposal.json` (15 steps: 0, 1, 2, 3a–3f, 4–8, with the targets as listed), and add it to the registry. Mapping: AA-Briefcase → `briefcase-v1-1`; "AA-Briefcase presentation quality" → `aa-briefcase-presentation-elo`; GDP.pdf → `gdp-pdf`; Briefcase's Word and PDF breakdown, the AA-Omniscience hallucination rate and GDPval-AA v2 → `other_checks`. Write `docs/workflows/sales-proposal-check.md`. First, a table of every step's targets as the JSON has them, beside the source's targets, marked same or different. Then one row per step 1–7 (with 3a–3f) with the hand pick, the app's pick and runners-up, both picks' Fit, and the reason for any difference (a model the doc couldn't see past the top 5, a variant, the doc's own judgement such as fresh eyes in step 5, or a bug). Fix any bug in `src/lib/workflows.ts` with a test. Write `docs/WORKFLOWS.md` for a chat adding a workflow: the format, every trait and index key with its label, the evaluation slugs, the registry line, the checks to run, and that it reaches the live site on the next release. Add one line to `AGENTS.md`: "To add or change a workflow (the Workflows section), follow docs/WORKFLOWS.md." **Done when**: the file validates and has 15 steps; the targets table shows every target the same as the source; every step 1–7 row in the check doc is filled and every difference has a reason that names the score behind it (for "past the top 5": the doc's model's percentile and the app pick's); if more than half the picks differ, the check doc says so in its first line and shows one such step worked by hand; a test pins the app's pick for steps 1, 3a, 6 and 7 to the names in the check doc; no difference is put down to a bug that is still unfixed; `WORKFLOWS.md` lists all 30 traits and 8 indexes from the data file; `tsc` and the tests pass. | Sol Max | Facts checked against a source (Omniscience 29) | 2026-11-19 · 15 steps checked, 9 of 12 picks differ |
| 1.3 | **The Workflows pages** [look]. Build `/workflows` and `/workflows/[slug]` (`src/app/workflows/page.tsx`, `src/app/workflows/[slug]/page.tsx`, `src/components/workflow-view.tsx`) and the sidebar item with its icon, as Decisions describe. Read first: `src/app/personality/page.tsx`, `src/components/personality-leaderboard.tsx`, `src/components/app-shell.tsx`, the personality and master rules in `src/app/globals.css`, and the UI rule in `AGENTS.md`. Run the app (dev server, stopped by its PID) and take shots to `docs/screenshots/workflows/build/`. **Done when** the shots show: at 1440px, the sidebar with Workflows after Personality and marked current; `/workflows` with one "Sales proposal" card saying 15 steps; the overview with all 15 steps, each with a pick and two runners-up from different families, and no sideways scroll; step 3a's detail with Sincere, Emotionally Intelligent, Evidence-Based, Metaphorical (aim moderate), Humorous (aim low), Fit and the Briefcase rank, 5 rows; step 0's detail with the "Also check (not in Model Atlas)" line; step 7's detail (the most targets: 4 high, 3 moderate, 2 low, plus an evaluation) with every header on at most two lines; step 6's detail with "Warmth index" and the cells showing raw percentiles; at 1024px, the overview with no page sideways scroll; `/personality` and the sales proposal page shot one after the other with the same table header, chip and spacing style; at 390px, the overview with Step pinned and step 3a's detail with Model pinned (the longest model name wrapping, the pinned column within about 40% of the frame), each scrolling sideways inside its frame with no page scroll, and the nav drawer open showing Workflows. Also: clicking step 3a's title in the overview jumps to its detail with the heading visible at 1440px and 390px; `/workflows/nope` shows the not-found page; `tsc` and the tests pass. | Sol Max | App screens from a written spec: Presentation 4 | 2026-11-19 · pages, build shots and checks passed |
| 1.4 | **Browser check** [look]. Production build, `next start` through the node `next` bin, stopped by its PID (memory `next-start-pid`). Add `scripts/check-workflows-browser.mjs`, modelled on `scripts/check-personality-browser.mjs`, and run it with `scripts/check-master-browser.mjs` and `scripts/check-personality-browser.mjs` (their expectations unedited). Shots go to `docs/screenshots/workflows/` (1440px and 390px of the overview only; 1.3 has the rest). **Done when**: all three scripts pass; the overview shows 15 step rows; the picks for steps 1, 3a, 6 and 7 match the names in `docs/workflows/sales-proposal-check.md` (hard-coded in the script, not taken from `stepPicks`); step 3a's detail shows a Briefcase rank (not "Not ranked") on at least one row; step 3a's title link scrolls to its detail with the heading visible; the sidebar item is current on both workflow pages; `/workflows/nope` returns 404; shots at 1440px and 390px of the list, the overview and step 3a. | Sol High | Build, server, browser and shots: Terminal Bench 17 | 2026-11-19 · three browser checks passed, six shots reviewed |
| R1 | **Phase 1 review**: the diff from `main`, `docs/workflows/sales-proposal-check.md` against `docs/workflows/proposal-source.md`, and the 1.3 and 1.4 shots. Quick fixes only; the rest become fix rows under this one. **Done when**: three steps' picks and runners-up are worked out by hand from `data/aa-personalitybench.json` and match the page, between them covering an aim moderate, an aim low and an index target (for example 3a, 6 and 7); a test workflow added by following only `docs/WORKFLOWS.md` validates and shows, and is then removed; every FINDING is fixed or has a fix row; if a fix touched the scorer or a page, 1.4's checks run again and pass. | Opus 5.5 High | Other family from the build (all Sol) | 2026-11-19 · 3a, 6, 7 hand-checked; test workflow shown, removed; 3 findings fixed (source has 14 steps, not 15); 1.4 checks passed |
| O1 | *owner*: release with `git push origin workflows:main` (no `publish:data`: workflows ship with the deploy). On the live site, open Workflows → Sales proposal and compare a few picks with your doc. | — | — | |

## Phase 2: your models, the benchmark bar and the meeting workflow

| # | Task | Pick | Why | Done |
|---|---|---|---|---|
| 2.1 | **Model list and benchmark bar in the scorer** [no look]. Read "Phase 2 brief" items 1–3 and its decisions, and the code in `src/lib/workflows.ts`. Add `workflows/models.json` with the owner's list. Add its zod schema (shape only), plus `onList(model, list)`, `BENCHMARK_BAR` and `barRank(cohortSize)`. Change `rankStep` and `stepPicks` so both take the list and the master rows and keep only listed models that clear the bar. Add `stepNotes(step, dataset, list, masterRows)`, returning the "below the bar" entries (each with every missed evaluation's rank and bar rank), the "not on your list" entries and the evaluations the bar skipped. Load the list once in `src/lib/workflow-registry.ts`. Update the callers in `src/components/workflow-view.tsx` only as far as `tsc` needs; the new text is 2.3. Phase 1's pinned picks will change: update those test pins to the new output and mark them "re-checked in 2.2". Extend `tests/workflows.test.ts` with fixtures in `tests/fixtures/workflows/`. **Done when** tests show:<br>• `barRank` gives 39 for 157, 39 for 158 and 1 for 3; rank 39 of 157 clears and 40 misses; "Not ranked" misses; a step with no evaluations has no bar.<br>• An evaluation no master row holds is skipped and returned in the skipped list.<br>• An OpenAI model is on the list through `providers`. `z ai glm-5.3 (max)` is on it through its family. `deepseek deepseek v4.1 flash (max)` (not 1017) is not.<br>• Every provider and family in `workflows/models.json` matches a row in `data/aa-personalitybench.json` or `data/leaderboards.json`. A bad shape (missing `label`, a family that isn't a string) throws, naming the file and the key.<br>• On a fixture: the below-the-bar line keeps only higher-Fit models, one per family, at most 3, and names both benchmarks when a model misses two. The not-on-your-list line does the same for off-list models that clear the bar. With no pick, the below-the-bar line lists the 3 best listed families and the other line is empty.<br>• A step where nobody clears the bar returns no pick and no runners-up.<br>• `tsc` and all the tests pass. | Sol Max | Scoring code: FrontierCode 9, Terminal Bench 9 | 2026-11-19 · 138 tests passed |
| 2.2 | **The meeting workflow, redone checks and the how-to** [no look]. Read "Phase 2 brief" item 4 and its decisions. Write `workflows/client-meeting-followup.json` from the table in item 4 (slug `client-meeting-followup`, title "Client meeting follow-up", notes as given) and add it to the registry. To check the scorer, first write a short script inside the check doc (a code block run with `node`) that reads only `data/aa-personalitybench.json`, `workflows/models.json` and the master rows from `getMasterDataset()`, and does not import `src/lib/workflows.ts`. It works out each step's pick and runners-up with the list and the bar. Write `docs/workflows/client-meeting-followup-check.md`: one row per step with the script's picks and the app's, each with its Fit and its ranks against the bar, beside the chat picks in item 4. The script and the app must agree on every step. Every difference from the chat picks gets a reason naming the rank, cohort or Fit behind it, specific to that row. Redo the picks rows of `docs/workflows/sales-proposal-check.md` the same way (script and app agree), keeping its targets table. Confirm or correct the pins 2.1 marked "re-checked in 2.2", and pin the meeting workflow's picks for all six steps. Add a "Your models and the benchmark bar" section to `docs/WORKFLOWS.md`: how to add or remove a model from `workflows/models.json` (finding the family from the data files, with the NUL rule), with one worked example, what the bar does, and where `BENCHMARK_BAR` lives. Fix any bug found in `src/lib/workflows.ts` with a test. **Done when**:<br>• Both workflow files validate, and a test checks that the meeting file's 6 steps have the targets, evaluations and notes of item 4.<br>• In both check docs, the script's picks equal the app's on every step.<br>• Every difference from the chat picks has a row-specific reason, and none is put down to a bug that is still unfixed.<br>• No test pin is still marked "re-checked in 2.2".<br>• `tsc` and the tests pass. | Sol Max | Facts checked against a source: Omniscience 29 | |
| 2.3 | **Show the list and the bar on the pages** [look]. Read "Phase 2 brief" item 3; `src/components/workflow-view.tsx`, `src/app/workflows/page.tsx`, `src/app/workflows/[slug]/page.tsx`, the workflow rules in `src/app/globals.css`, and the UI rule in `AGENTS.md`. Add the header line, the "Your models" card on `/workflows` (the no-personality-scores note worked out from the data), and under each step's table the two note lines, the skipped-evaluation line and step 5's "no bar" line. Update the help text above a step's table to say only listed models that clear the bar are ranked. Show "—" plus "No model on your list clears the bar" when there is no pick. Use the existing primitives and styles, with no new colours. Add `renderToStaticMarkup` tests, as Phase 1 did, for these states on fixtures: no pick, one runner-up only, a table with fewer than 5 rows, a skipped evaluation, and a card where every family has personality rows (no note). Run the dev server, stop it by its PID, and take shots to `docs/screenshots/workflows/phase2/`. **Done when** the shots show:<br>• At 1440px and 390px: `/workflows` with two workflow cards and the Your models card, all eight labels wrapping inside the card and Qwen4 Max named as having no personality scores yet.<br>• At 1440px: the meeting follow-up overview with 6 steps and no sideways scroll.<br>• At 1440px: the meeting workflow's step 1 detail with a "Higher Fit, below the bar" line naming a model, its rank and the bar rank.<br>• At 1440px: step 5's detail with "No benchmarks for this step, so no bar".<br>• At 1440px: the sales proposal's step 6 detail with its notes.<br>• At 390px: the meeting overview with Step pinned, scrolling sideways inside its frame with no page scroll.<br>• At 390px: the detail of the step with the most note entries across both workflows (named in the commit), every entry wrapping inside the card and no word cut off.<br>• The page header line reads in full at 390px.<br>• The new render tests, `tsc` and all the tests pass. | Sol xHigh | Changes to built pages from a written spec: Presentation 9 | |
| 2.4 | **Browser check** [look]. Production build, then `next start` through the node `next` bin, stopped by its PID (memory `next-start-pid`), on the bundled data. Update `scripts/check-workflows-browser.mjs`: hard-code the sales proposal's new picks from its check doc, and add the meeting workflow (6 rows; picks for steps 1, 4 and 6 hard-coded from its check doc, not taken from `stepPicks`). Then run it with `scripts/check-master-browser.mjs` and `scripts/check-personality-browser.mjs`, their expectations unedited. **Done when**:<br>• All three scripts pass.<br>• Both workflow pages show their hard-coded picks.<br>• The Your models card lists all eight labels.<br>• Step 1 of the meeting workflow shows a below-the-bar line.<br>• No new shots; 2.3 has them. | Sol High | Build, server, browser and shots: Terminal Bench 17 | |
| R2 | **Phase 2 review**: the diff from 2c3f3e4, both check docs (including their scripts), and the 2.3 shots. Quick fixes only; the rest become fix rows under this one. **Done when**:<br>• Two steps are worked out by hand from the bundled data files, and the page matches: meeting step 1 (the bar drops a model) and meeting step 4 (an index target), with the bar computed from the page's rank and cohort.<br>• A model is added to `workflows/models.json` by following only `docs/WORKFLOWS.md`, changes a pick as expected, and is then removed.<br>• Every FINDING is fixed or has a fix row.<br>• If a fix touched the scorer or a page, 2.4's checks run again and pass. | Opus 5.5 High | Other family from the build (all GPT) | |
| O2 | *owner*: release with `git push origin workflows:main` (no `publish:data`). On the live site, open Workflows → Client meeting follow-up and check the picks against your list. | — | — | |
