# New section: Workflows (model picks per step, from the data)

Adds a Workflows section to Model Atlas. A workflow is a list of steps you usually run with several models (the first
one is your sales proposal flow). Each step names the traits it should be high, moderate or low on, and the page
works out the best models for every step from the AA-PersonalityBench data, instead of you picking them by hand.
Earlier plans: [IMPLEMENTATION_PLAN-done.md](IMPLEMENTATION_PLAN-done.md) (AA-PersonalityBench, live since 2026-11-19).

Working branch: `workflows`. Every task commits and pushes there. `main` deploys to production and moves only on O1.

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
    Model Atlas)" line when `other_checks` is set, and the note. An unknown slug is the site's not-found page.
- **Look:** the `/personality` table, chips, buttons and spacing (`src/components/ui/primitives.tsx`, `TableScroll`, the
  pinned first column). No new colours or components. On a phone, the overview pins the Step column and the detail
  tables pin Model; both scroll sideways inside their frame, never the page, and the pinned column wraps long names
  to stay within about 40% of the frame. An anchor jump lands with the step heading visible, not under a sticky bar.
- **Where it's linked:** a "Workflows" item in the sidebar (`src/components/app-shell.tsx`) after Personality, with its
  own line icon in the style of the others. No home card.
- **Shipping:** workflow files ship with the deploy. `npm run publish:data` has nothing to send, and `CLAUDE.md`'s
  publish rule (which covers `data/`) doesn't apply to `workflows/`.
- **Not built (follow-ups for the owner to pick):** an in-app editor, "use a different model from step N" (fresh eyes
  for steps 5 and 6), two-model pairs, evaluations counted in Fit, a favorites-only filter, a weight per target, a home
  card, a note when a data refresh changes a pick.

## Before the run

- [x] Branch `workflows` pushed with upstream.

## Phase 1: build and release

| # | Task | Pick | Why | Done |
|---|---|---|---|---|
| 1.1 | **Format, scorer and registry** [no look]. Write `src/lib/workflows.ts`: the zod schema and validation in Decisions, the score per target, Fit, the family key, `rankStep(step, dataset)` (top N rows) and `stepPicks(step, dataset)` (pick plus two runners-up from different families), and `evaluationRanks(identityKey, evaluationSlugs, masterRows)` returning rank and cohort size (the number of master rows ranked in that evaluation). Add the registry `src/lib/workflow-registry.ts`, which imports each `workflows/*.json` and validates it at load. The registry starts empty (the list page shows an empty state); tests use fixtures in `tests/fixtures/workflows/`. Add `tests/workflows.test.ts`. Read: Decisions above; `src/lib/personality.ts`; `getMasterDataset` in `src/lib/data.ts` and `masterIdentityKey` in `src/lib/master.ts`. **Done when** tests show: p = 80 scores 80 high, 20 low and 40 moderate; p = 50 scores 100 moderate; an index target scores from `index_percentiles`; Fit averages the targets and leaves out a `null`, and a model with no values gets no Fit and sorts last; a fixture with five Sol efforts at the top gives a pick and runners-up from three families; run over every identity key in `data/aa-personalitybench.json`, the family key groups the five GPT-6.2 Sol rows into one family, the five GPT-6.2 Astra rows into one, the two Sonnet 5.5 rows into one, and keeps Fable 5.1 and 5.2 apart (the test prints any other family with more than one row, and each is a real variant group); `evaluationRanks` on the real data finds a master row for at least 45 of the 53 personality rows (51 on 2026-11-19) and a `briefcase-v1-1` rank with its cohort size for at least 45 (49); a step id with a space or capital throws; equal Fit sorts by model name; each invalid case in Decisions throws naming the file and the bad key; a test fails when a file in `workflows/` is missing from the registry; `tsc` and the tests pass. | Sol Max | Scores: FrontierCode 9, Terminal Bench 9 | |
| 1.2 | **The sales proposal workflow, its check and the how-to** [no look]. Turn `docs/workflows/proposal-source.md` into `workflows/sales-proposal.json` (15 steps: 0, 1, 2, 3a–3f, 4–8, with the targets as listed), and add it to the registry. Mapping: AA-Briefcase → `briefcase-v1-1`; "AA-Briefcase presentation quality" → `aa-briefcase-presentation-elo`; GDP.pdf → `gdp-pdf`; Briefcase's Word and PDF breakdown, the AA-Omniscience hallucination rate and GDPval-AA v2 → `other_checks`. Write `docs/workflows/sales-proposal-check.md`. First, a table of every step's targets as the JSON has them, beside the source's targets, marked same or different. Then one row per step 1–7 (with 3a–3f) with the hand pick, the app's pick and runners-up, both picks' Fit, and the reason for any difference (a model the doc couldn't see past the top 5, a variant, the doc's own judgement such as fresh eyes in step 5, or a bug). Fix any bug in `src/lib/workflows.ts` with a test. Write `docs/WORKFLOWS.md` for a chat adding a workflow: the format, every trait and index key with its label, the evaluation slugs, the registry line, the checks to run, and that it reaches the live site on the next release. Add one line to `AGENTS.md`: "To add or change a workflow (the Workflows section), follow docs/WORKFLOWS.md." **Done when**: the file validates and has 15 steps; the targets table shows every target the same as the source; every step 1–7 row in the check doc is filled and every difference has a reason that names the score behind it (for "past the top 5": the doc's model's percentile and the app pick's); if more than half the picks differ, the check doc says so in its first line and shows one such step worked by hand; a test pins the app's pick for steps 1, 3a, 6 and 7 to the names in the check doc; no difference is put down to a bug that is still unfixed; `WORKFLOWS.md` lists all 30 traits and 8 indexes from the data file; `tsc` and the tests pass. | Sol Max | Facts checked against a source (Omniscience 29) | |
| 1.3 | **The Workflows pages** [look]. Build `/workflows` and `/workflows/[slug]` (`src/app/workflows/page.tsx`, `src/app/workflows/[slug]/page.tsx`, `src/components/workflow-view.tsx`) and the sidebar item with its icon, as Decisions describe. Read first: `src/app/personality/page.tsx`, `src/components/personality-leaderboard.tsx`, `src/components/app-shell.tsx`, the personality and master rules in `src/app/globals.css`, and the UI rule in `AGENTS.md`. Run the app (dev server, stopped by its PID) and take shots to `docs/screenshots/workflows/build/`. **Done when** the shots show: at 1440px, the sidebar with Workflows after Personality and marked current; `/workflows` with one "Sales proposal" card saying 15 steps; the overview with all 15 steps, each with a pick and two runners-up from different families, and no sideways scroll; step 3a's detail with Sincere, Emotionally Intelligent, Evidence-Based, Metaphorical (aim moderate), Humorous (aim low), Fit and the Briefcase rank, 5 rows; step 0's detail with the "Also check (not in Model Atlas)" line; step 7's detail (the most targets: 4 high, 3 moderate, 2 low, plus an evaluation) with every header on at most two lines; step 6's detail with "Warmth index" and the cells showing raw percentiles; at 1024px, the overview with no page sideways scroll; `/personality` and the sales proposal page shot one after the other with the same table header, chip and spacing style; at 390px, the overview with Step pinned and step 3a's detail with Model pinned (the longest model name wrapping, the pinned column within about 40% of the frame), each scrolling sideways inside its frame with no page scroll, and the nav drawer open showing Workflows. Also: clicking step 3a's title in the overview jumps to its detail with the heading visible at 1440px and 390px; `/workflows/nope` shows the not-found page; `tsc` and the tests pass. | Sol Max | App screens from a written spec: Presentation 4 | |
| 1.4 | **Browser check** [look]. Production build, `next start` through the node `next` bin, stopped by its PID (memory `next-start-pid`). Add `scripts/check-workflows-browser.mjs`, modelled on `scripts/check-personality-browser.mjs`, and run it with `scripts/check-master-browser.mjs` and `scripts/check-personality-browser.mjs` (their expectations unedited). Shots go to `docs/screenshots/workflows/` (1440px and 390px of the overview only; 1.3 has the rest). **Done when**: all three scripts pass; the overview shows 15 step rows; the picks for steps 1, 3a, 6 and 7 match the names in `docs/workflows/sales-proposal-check.md` (hard-coded in the script, not taken from `stepPicks`); step 3a's detail shows a Briefcase rank (not "Not ranked") on at least one row; step 3a's title link scrolls to its detail with the heading visible; the sidebar item is current on both workflow pages; `/workflows/nope` returns 404; shots at 1440px and 390px of the list, the overview and step 3a. | Sol High | Build, server, browser and shots: Terminal Bench 17 | |
| R1 | **Phase 1 review**: the diff from `main`, `docs/workflows/sales-proposal-check.md` against `docs/workflows/proposal-source.md`, and the 1.3 and 1.4 shots. Quick fixes only; the rest become fix rows under this one. **Done when**: three steps' picks and runners-up are worked out by hand from `data/aa-personalitybench.json` and match the page, between them covering an aim moderate, an aim low and an index target (for example 3a, 6 and 7); a test workflow added by following only `docs/WORKFLOWS.md` validates and shows, and is then removed; every FINDING is fixed or has a fix row; if a fix touched the scorer or a page, 1.4's checks run again and pass. | Opus 5.5 High | Other family from the build (all Sol) | |
| O1 | *owner*: release with `git push origin workflows:main` (no `publish:data`: workflows ship with the deploy). On the live site, open Workflows → Sales proposal and compare a few picks with your doc. | — | — | |
