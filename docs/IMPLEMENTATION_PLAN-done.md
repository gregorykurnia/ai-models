# Gemini 4 Neon (four efforts) and a new evaluation: AA-Omniscience Net Score, Business

Adds Google's Gemini 4 Neon at Low, Medium, High and Xhigh to the master leaderboard and to every evaluation where
Artificial Analysis (AA) scores it. Also adds AA-Omniscience's Business Net Score as a new evaluation with its own
leaderboard and a master column. Earlier plans: below
(Workflows, live since 2026-11-19).

Working branch: `neon-omniscience-business`, from `workflows` (`db678a2`, which is `main` plus one docs commit). Every task
commits and pushes there. `main` deploys to production and moves only on O1.

## What the owner asked (2026-11-19)

"Gemini 4 Neon models is out now - low, medium, high, xhigh - make sure those are in. We can get the gpt models to do
it." And: "I'm thinking of adding AA Omniscience Net Score Business", with a link to the Omniscience page's "Net Score
by Domain" tab. "Can u make the quick plan for that maybe autorun plan and do model picks."

Simplest design that meets it:

1. **Business Net Score:** one more capture target, one more importer config and one more master column, the way
   SWE-Atlas-QnA was added. It needs no new page type and changes no scoring.
2. **Neon:** the same full AA refresh the Hydrogen plan ran, so Neon lands in every evaluation AA scores it on.
3. **Workflows:** the refresh moves some workflow picks, so their check docs and pinned picks are redone.
4. An audit and a browser check, then the review.

## What AA publishes (read on the live page, 2026-11-19)

- **The Business chart is on a tab that isn't shown by default.** In the Omniscience page's "Detailed Domain Score"
  section, the "AA-Omniscience Net Score by Domain" tab appears only with
  `?detailed-domain-results=omniscience-net-score-by-domain` in the URL. Without it, the section opens on "Across
  Domains (Normalized)", which is why our capture has never held it.
- With that tab open, the chart heading is **"AA-Omniscience Net Score by Domain: Business"**. It has a domain dropdown
  set to Business by default. The other five domains are Humanities & Social Sciences; Science, Engineering &
  Mathematics; Health; Law; and Software Engineering (SWE). The chart's model selector reads "28 of 169 models".
- **The chart items have the same shape as the other score charts** (`label`, `tooltipLabel`, `value`, `url`), so
  the existing chart reader and `canonicalModelName` apply. The first two are Claude Fable 5.2 (Max) at 57.1 and
  Gemini 4 Neon (Xhigh) at 46.
- **The metric** is the same Net Score as the overall AA-Omniscience v1.1 score (higher is better; it can be negative),
  restricted to the Business questions.
- **Neon:** AA's slugs are `gemini-4-neon` (Xhigh), `gemini-4-neon-high`, `gemini-4-neon-medium` and
  `gemini-4-neon-low`, from the owner's link. Our 18 Nov data has no Neon row. AA's Omniscience page now counts 169
  models, against 157 in our 18 Nov capture.

## Decisions (defaults, so no task stops to ask)

- **Business only.** The other five domains stay out because they weren't asked for. Adding them is a follow-up, one
  dropdown loop in the same capture.
- **Names:** the id and slug are `aa-omniscience-business`; the display name is "AA-Omniscience Net Score: Business";
  the master label is "Omniscience Business", in a column right after "Omniscience Index".
  - The metric is the same as `aa-omniscience-index`.
  - The source link is the Omniscience URL with the tab parameter.
  - It has no cost per task, because the page's cost chart covers all of Omniscience.
  - Its timing is `null` in `src/lib/model-speed.ts`.
  - The notes say: "Net Score on the Business questions of AA-Omniscience v1.1 only."
- **The new evaluation stays out of the average rank.** `aggregateDimensionIds` in `src/lib/master.ts` stays as it is,
  and saved tasks aren't touched. Like every evaluation, it can be weighted in `/suitability`.
- **The capture fails loudly.** It requires exactly one chart titled "AA-Omniscience Net Score by Domain: Business",
  with "M of M models" selected. If AA changes the default domain, the capture throws instead of saving another
  domain's scores under Business.
- **Neon: import everything AA shows and invent nothing.** A missing result stays a dash, and the audit names it.
  Names follow Hydrogen's convention: `Gemini 4 Neon (Xhigh)`, `(High)`, `(Medium)` and `(Low)`.
- **A full refresh, not a patch.** The refresh recaptures every AA page, the Briefcase tabs, costs and speed, and
  AA-PersonalityBench. Every model's scores, ranks and costs move to the new capture date. That's expected.
- **Workflow picks will move, which is expected.** They read the bundled ranks and personality percentiles. 1.3 reruns
  the script in each check doc and re-pins with a reason per changed pick. Neon isn't on `workflows/models.json`, so
  it can't become a pick. It may show in a "not on your list" line.
- **Local checks use the bundled data.** `.env.local` sets no `DATA_SOURCE`.
- **The playbook isn't changed** because it wasn't asked for. Redoing `~/.claude/playbooks/plans-and-models.md` ranks
  from the new capture, adding a Neon compare-only table and adding an Omniscience Business column are follow-ups.
- **Data is published in O1, after the release,** as on every refresh.

## Before the run

- [x] Branch `neon-omniscience-business` pushed with upstream (2026-11-19).

## Phase 1: build and release

| # | Task | Pick | Why | Done |
|---|---|---|---|---|
| 1.1 | **Business Net Score: capture, import, master column** [no look]. In `scripts/capture-aa-evaluations.mjs`, add an `omniscience-business` page modelled on the `critpt-v2-hard` entry, with the URL parameter and the score chart named in "What AA publishes". Capture only that page: `--only omniscience-business`, with `PLAYWRIGHT_MODULE=/home/ubuntu/projects-steps-documentation/node_modules/playwright/index.mjs`.<br>In `scripts/import-aa-evaluations.ts`, add the `aa-omniscience-business` config as Decisions describe. In `src/lib/master.ts`, add the column and its label, but not to `aggregateDimensionIds`. Add `null` timing in `src/lib/model-speed.ts`. Run `import:aa-evaluations`.<br>Raise every hard-coded evaluation count from 19 to 20: `tests/new-models-browser-fixture.test.ts` (twice), `src/app/about/data/page.tsx` and `docs/DATA_DICTIONARY.md`, then grep `src`, `scripts` and `tests` for others. Extend `tests/aa-evaluations-import.test.ts`.<br>Read: "What AA publishes" and Decisions above, and the `swe-atlas-qna-aa` entries in the three files as the pattern. **Done when**:<br>• The capture holds as many rows as the selector counts (169 of 169 on 2026-11-19).<br>• Tests show that the capture check throws, naming the chart, when the Business title is missing (for example, a Law chart in its place) and when the chart's selector reads "28 of 169". A test asserts that the default target list has the new page with its URL parameter.<br>• Five bars hovered on the live tab match the stored values to AA's displayed whole number: Claude Fable 5.2 (Max) 57, Gemini 4 Neon (Xhigh) 46, and three more named in the commit, one of them negative if the chart has one.<br>• The evaluation has one row per chart item. Any model that's new to the master gets its own row, named in the commit body.<br>• The "Omniscience Business" column comes right after "Omniscience Index". A test shows that every master row's average rank and order equal those built without the new column.<br>• `node --import tsx scripts/validate-master.ts`, the rubric, suitability, model-speed and import tests, and `npx tsc --noEmit -p tsconfig.json` pass.<br>• Under `data/aa-captures/`, `git status` shows only the new file. | Sol Max | New scrape that feeds a leaderboard: Terminal Bench 9, FrontierCode 9 | 2026-11-19 · 169 scores, five live matches |
| 1.2 | **Full AA refresh with Neon** [no look]. Use the same `PLAYWRIGHT_MODULE` as 1.1 and run these in order:<br>1. Recapture all 16 pages (the 15 already in the script plus 1.1's) with `scripts/capture-aa-evaluations.mjs`, without `--only`.<br>2. Capture the AA-Briefcase rubric and quality-Elo tabs. They have no committed script; follow `docs/AA_BRIEFCASE_RUBRIC_REFRESH_PROMPT.md`.<br>3. Run `capture:aa-speed`; `docs/AA_SPEED_REFRESH_2026-11-16.md` describes it.<br>4. Run `import:briefcase-components`, `import:aa-index-costs` (it reads the speed capture) and `import:aa-evaluations`, with `import:aa-evaluations` last.<br>Update the capture date in `docs/DATA_DICTIONARY.md` and `src/app/about/data/page.tsx`. Leave AA-PersonalityBench to 1.3. Read: "What AA publishes" and Decisions above. **Done when**:<br>• The commit body has a table of the 16 pages and both Briefcase tabs, marking which Neon efforts each one holds.<br>• Each Neon effort is exactly one master row named `Gemini 4 Neon (<Effort>)`. Hydrogen (four efforts), Argon (two) and Carbon (three) still have one row per effort.<br>• The commit body lists every master row added since 18 Nov (AA went from 157 to 169 models on Omniscience). None of them is a spelling or effort variant of an existing row; check the names side by side.<br>• Each Briefcase tab's row count equals its "M of M models" selector.<br>• `validate-master.ts`, the rubric, suitability, model-speed and import tests, and `tsc` pass. `tests/workflows.test.ts` may fail, but only on pinned picks. The commit body lists those for 1.3.<br>• A second `import:aa-evaluations` run changes no file.<br>• Every capture file, the hand-run Briefcase tabs included, carries the new capture date.<br>• No model in the 18 Nov data disappears, and no evaluation's row count shrinks, unless the commit body says why (AA dropped it, checked on the page).<br>• The commit body lists the row counts before → after for each evaluation, as `44fe61f` does. | Sol Max | Imports can corrupt every leaderboard; earlier refreshes ran cleanly on Sol Max | 2026-11-19 · 647 models, 20 evaluations, replay identical |
| 1.3 | **PersonalityBench and Workflows after the refresh** [no look]. Run `capture:aa-personalitybench` (same `PLAYWRIGHT_MODULE`), then `import:aa-personalitybench`, and rewrite `docs/AA_PERSONALITYBENCH_CAPTURE.md` from the new capture. Update the Personality capture date and model count in `src/app/about/data/page.tsx`.<br>Then run the script inside each check doc, `docs/workflows/sales-proposal-check.md` and `docs/workflows/client-meeting-followup-check.md`, on the new bundled data. Update each doc's picks rows and data date. Update the pinned picks in `tests/workflows.test.ts` and the hard-coded picks in `scripts/check-workflows-browser.mjs`. Change `src/lib/workflows.ts` only if a script and the app disagree, and then with a test.<br>Read: the two check docs, and "Phase 2 brief", item 2 (the bar), in `docs/IMPLEMENTATION_PLAN-done.md`. **Done when**:<br>• The commit body says whether AA-PersonalityBench lists each Neon effort, and gives the model count before → after.<br>• In both check docs, the script's picks equal the app's on every step (20 steps). Each script reads the data files without importing `src/lib/workflows.ts`, so the match comes from two separate implementations.<br>• Every pick or runner-up that moved has a reason specific to its row, in a "Moved in the <date> refresh" column of the check doc. Each reason names the rank, cohort, bar or percentile that changed, with the old and new figures.<br>• All the tests and `tsc` pass. | Sol Max | Picks the owner acts on, checked against the data; Sol Max built the scorer | 2026-11-19 · 53 models, 20 steps matched, 149 tests passed |
| 1.4 | **Neon coverage audit** [no look]. In `scripts/audit-new-models-coverage.ts`, add a `neon` set with the four efforts and their slugs ("What AA publishes"), the pattern `/neon/i` and the report `docs/GEMINI_4_NEON_COVERAGE.md`. Add the same set to `scripts/check-new-models-browser.mjs` (group "Neon", 4), with a fixture test like the existing sets. Leave the `hydrogen` and `gpt-6.2` sets and their docs as they are. Read: `docs/GEMINI_4_HYDROGEN_QWEN4_COVERAGE.md` for the layout. **Done when**:<br>• The report has one row per evaluation (all 20, Business included) and one column per Neon effort. Every cell holds a stored value or "not on AA (captured <date>)", plus the cost, Time per Task and First Answer table.<br>• The pattern check lists exactly the four Neon rows.<br>• Every Neon "not on AA" cell is checked against the live AA page, so an importer name mismatch can't hide as a gap. The commit lists each cell checked. If AA does list that effort, the importer gets a name rule and a test, and the cell is redone.<br>• Five spot-checks by hand match the capture JSON, covering every effort and the Business evaluation.<br>• Each effort's stored Intelligence Index matches AA's model page; each figure is named in the commit.<br>• The tests and `tsc` pass. | Sol xHigh | Adds a set to a built script whose own checks pass or fail: FrontierCode 11 | 2026-11-19 · 20 evaluations, 11 live gaps verified |
| 1.5 | **Browser check** [look]. Make a production build and run `next start` through the node `next` bin, stopping it by its PID (memory `next-start-pid`). Add `aa-omniscience-business` to the evaluations `scripts/check-evaluation-browser.mjs` covers. Run it, `scripts/check-master-browser.mjs` with the new-models pass on the `neon` set (confirm in its output that the pass ran), `scripts/check-workflows-browser.mjs` and `scripts/check-personality-browser.mjs`. Their expectations change only where 1.2–1.4 changed the data, each change named in the commit body. Shots go to `docs/screenshots/neon-omniscience-business/`. **Done when**:<br>• All four scripts pass.<br>• Shots at 1440px and 390px of `/leaderboards/aa-omniscience-business` show:<br>&nbsp;&nbsp;– as many rows as the capture;<br>&nbsp;&nbsp;– a negative score with its minus sign, if the data has one;<br>&nbsp;&nbsp;– the heading "AA-Omniscience Net Score: Business" wrapping inside the page at 390px;<br>&nbsp;&nbsp;– the longest model name readable at 390px;<br>&nbsp;&nbsp;– the notes.<br>• The page's source link opens AA on the "Net Score by Domain" tab.<br>• The master at 1440px, searched for "Neon", shows four rows with their names inside the frozen Model column. The "Omniscience Business" header sits right after "Omniscience Index" and fits.<br>• The same search at 390px shows four cards, each with its Omniscience Business score or a dash.<br>• Sorted by Omniscience Business in both directions, dashes come last and negative scores sit below positive ones.<br>• The leaderboards index lists the new evaluation, and its link opens it.<br>• In `/suitability`, a task that weights only Omniscience Business ranks the scored models, with a negative-score model below a positive one. Unscored models show as missing coverage, not 0, and the evaluation's name fits at 390px.<br>• Shots at 1440px of the meeting workflow overview and `/personality` show the picks and model count that 1.3 recorded.<br>• `/about/data` shows 20 evaluations and the new capture dates. | Sol High | Build, server, browser and shots: Terminal Bench 17 | 2026-11-19 · four browser scripts passed, 169 Business rows and four Neon cards checked |
| R1 | **Phase 1 review** of the diff from `db678a2`, the 1.4 report against the captures, both check docs and the 1.5 shots. Quick fixes only; the rest become fix rows under this one. **Done when**:<br>• Five Business rows not among 1.1's five are hovered on live AA and agree with the stored scores (one of them negative, if any are).<br>• Five Neon cells in the report match the captures.<br>• One workflow step whose pick moved is worked out by hand from the bundled data, and the page matches.<br>• Every FINDING is fixed or has a fix row.<br>• If a fix touched data or a page, 1.5's checks run again and pass. | Opus 5.5 High | The other family from the build (all GPT) | 2026-11-19 · five live Business hovers and six Neon cells match, meeting step 6 by hand, no findings |
| O1 | *owner*: release with `git push origin neon-omniscience-business:main`. Then say "publish the data" in a Claude session in this folder, which runs the checks, `npm run publish:data` and the Firestore read-back per `CLAUDE.md` (20 evaluations now). Publish straight after the release: in between, the live site shows the old Firestore data without the new evaluation, as it did between the SWE-Atlas-QnA release and its publish on 2026-11-18. On the live site, open `/leaderboards/aa-omniscience-business` and search the master for "Neon". | — | — | 2026-11-19 · `9a1a1c5` live, 20 snapshots, 169 Business rows and four Neon variants verified |

# New section: Workflows (model picks per step, from the data)

Adds a Workflows section to Model Atlas. A workflow is a list of steps you usually run with several models (the first
one is your sales proposal flow). Each step names the traits it should be high, moderate or low on, and the page
works out the best models for every step from the AA-PersonalityBench data, instead of you picking them by hand.
Earlier plans: below (AA-PersonalityBench, live since 2026-11-19).

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
| O1 | *owner*: release with `git push origin workflows:main` (no `publish:data`: workflows ship with the deploy). On the live site, open Workflows → Sales proposal and compare a few picks with your doc. | — | — | 2026-11-19 · `14606f5` live, 14 steps and 4 picks verified |

## Phase 2: your models, the benchmark bar and the meeting workflow

| # | Task | Pick | Why | Done |
|---|---|---|---|---|
| 2.1 | **Model list and benchmark bar in the scorer** [no look]. Read "Phase 2 brief" items 1–3 and its decisions, and the code in `src/lib/workflows.ts`. Add `workflows/models.json` with the owner's list. Add its zod schema (shape only), plus `onList(model, list)`, `BENCHMARK_BAR` and `barRank(cohortSize)`. Change `rankStep` and `stepPicks` so both take the list and the master rows and keep only listed models that clear the bar. Add `stepNotes(step, dataset, list, masterRows)`, returning the "below the bar" entries (each with every missed evaluation's rank and bar rank), the "not on your list" entries and the evaluations the bar skipped. Load the list once in `src/lib/workflow-registry.ts`. Update the callers in `src/components/workflow-view.tsx` only as far as `tsc` needs; the new text is 2.3. Phase 1's pinned picks will change: update those test pins to the new output and mark them "re-checked in 2.2". Extend `tests/workflows.test.ts` with fixtures in `tests/fixtures/workflows/`. **Done when** tests show:<br>• `barRank` gives 39 for 157, 39 for 158 and 1 for 3; rank 39 of 157 clears and 40 misses; "Not ranked" misses; a step with no evaluations has no bar.<br>• An evaluation no master row holds is skipped and returned in the skipped list.<br>• An OpenAI model is on the list through `providers`. `z ai glm-5.3 (max)` is on it through its family. `deepseek deepseek v4.1 flash (max)` (not 1017) is not.<br>• Every provider and family in `workflows/models.json` matches a row in `data/aa-personalitybench.json` or `data/leaderboards.json`. A bad shape (missing `label`, a family that isn't a string) throws, naming the file and the key.<br>• On a fixture: the below-the-bar line keeps only higher-Fit models, one per family, at most 3, and names both benchmarks when a model misses two. The not-on-your-list line does the same for off-list models that clear the bar. With no pick, the below-the-bar line lists the 3 best listed families and the other line is empty.<br>• A step where nobody clears the bar returns no pick and no runners-up.<br>• `tsc` and all the tests pass. | Sol Max | Scoring code: FrontierCode 9, Terminal Bench 9 | 2026-11-19 · 138 tests passed |
| 2.2 | **The meeting workflow, redone checks and the how-to** [no look]. Read "Phase 2 brief" item 4 and its decisions. Write `workflows/client-meeting-followup.json` from the table in item 4 (slug `client-meeting-followup`, title "Client meeting follow-up", notes as given) and add it to the registry. To check the scorer, first write a short script inside the check doc (a code block run with `node`) that reads only `data/aa-personalitybench.json`, `workflows/models.json` and the master rows from `getMasterDataset()`, and does not import `src/lib/workflows.ts`. It works out each step's pick and runners-up with the list and the bar. Write `docs/workflows/client-meeting-followup-check.md`: one row per step with the script's picks and the app's, each with its Fit and its ranks against the bar, beside the chat picks in item 4. The script and the app must agree on every step. Every difference from the chat picks gets a reason naming the rank, cohort or Fit behind it, specific to that row. Redo the picks rows of `docs/workflows/sales-proposal-check.md` the same way (script and app agree), keeping its targets table. Confirm or correct the pins 2.1 marked "re-checked in 2.2", and pin the meeting workflow's picks for all six steps. Add a "Your models and the benchmark bar" section to `docs/WORKFLOWS.md`: how to add or remove a model from `workflows/models.json` (finding the family from the data files, with the NUL rule), with one worked example, what the bar does, and where `BENCHMARK_BAR` lives. Fix any bug found in `src/lib/workflows.ts` with a test. **Done when**:<br>• Both workflow files validate, and a test checks that the meeting file's 6 steps have the targets, evaluations and notes of item 4.<br>• In both check docs, the script's picks equal the app's on every step.<br>• Every difference from the chat picks has a row-specific reason, and none is put down to a bug that is still unfixed.<br>• No test pin is still marked "re-checked in 2.2".<br>• `tsc` and the tests pass. | Sol Max | Facts checked against a source: Omniscience 29 | 2026-11-19 · 141 tests passed, 20 steps matched |
| 2.3 | **Show the list and the bar on the pages** [look]. Read "Phase 2 brief" item 3; `src/components/workflow-view.tsx`, `src/app/workflows/page.tsx`, `src/app/workflows/[slug]/page.tsx`, the workflow rules in `src/app/globals.css`, and the UI rule in `AGENTS.md`. Add the header line, the "Your models" card on `/workflows` (the no-personality-scores note worked out from the data), and under each step's table the two note lines, the skipped-evaluation line and step 5's "no bar" line. Update the help text above a step's table to say only listed models that clear the bar are ranked. Show "—" plus "No model on your list clears the bar" when there is no pick. Use the existing primitives and styles, with no new colours. Add `renderToStaticMarkup` tests, as Phase 1 did, for these states on fixtures: no pick, one runner-up only, a table with fewer than 5 rows, a skipped evaluation, and a card where every family has personality rows (no note). Run the dev server, stop it by its PID, and take shots to `docs/screenshots/workflows/phase2/`. **Done when** the shots show:<br>• At 1440px and 390px: `/workflows` with two workflow cards and the Your models card, all eight labels wrapping inside the card and Qwen4 Max named as having no personality scores yet.<br>• At 1440px: the meeting follow-up overview with 6 steps and no sideways scroll.<br>• At 1440px: the meeting workflow's step 1 detail with a "Higher Fit, below the bar" line naming a model, its rank and the bar rank.<br>• At 1440px: step 5's detail with "No benchmarks for this step, so no bar".<br>• At 1440px: the sales proposal's step 6 detail with its notes.<br>• At 390px: the meeting overview with Step pinned, scrolling sideways inside its frame with no page scroll.<br>• At 390px: the detail of the step with the most note entries across both workflows (named in the commit), every entry wrapping inside the card and no word cut off.<br>• The page header line reads in full at 390px.<br>• The new render tests, `tsc` and all the tests pass. | Sol xHigh | Changes to built pages from a written spec: Presentation 9 | 2026-11-19 · 146 tests passed, screenshots reviewed |
| 2.4 | **Browser check** [look]. Production build, then `next start` through the node `next` bin, stopped by its PID (memory `next-start-pid`), on the bundled data. Update `scripts/check-workflows-browser.mjs`: hard-code the sales proposal's new picks from its check doc, and add the meeting workflow (6 rows; picks for steps 1, 4 and 6 hard-coded from its check doc, not taken from `stepPicks`). Then run it with `scripts/check-master-browser.mjs` and `scripts/check-personality-browser.mjs`, their expectations unedited. **Done when**:<br>• All three scripts pass.<br>• Both workflow pages show their hard-coded picks.<br>• The Your models card lists all eight labels.<br>• Step 1 of the meeting workflow shows a below-the-bar line.<br>• No new shots; 2.3 has them. | Sol High | Build, server, browser and shots: Terminal Bench 17 | 2026-11-19 · three browser checks passed, seven picks verified |
| R2 | **Phase 2 review**: the diff from 2c3f3e4, both check docs (including their scripts), and the 2.3 shots. Quick fixes only; the rest become fix rows under this one. **Done when**:<br>• Two steps are worked out by hand from the bundled data files, and the page matches: meeting step 1 (the bar drops a model) and meeting step 4 (an index target), with the bar computed from the page's rank and cohort.<br>• A model is added to `workflows/models.json` by following only `docs/WORKFLOWS.md`, changes a pick as expected, and is then removed.<br>• Every FINDING is fixed or has a fix row.<br>• If a fix touched the scorer or a page, 2.4's checks run again and pass. | Opus 5.5 High | Other family from the build (all GPT) | 2026-11-19 · meeting 1, 4 hand-checked; Gemini 4 Argon added, removed; 2 findings fixed; 2.4 checks passed |
| O2 | *owner*: release with `git push origin workflows:main` (no `publish:data`). On the live site, open Workflows → Client meeting follow-up and check the picks against your list. | — | — | 2026-11-19 · `14606f5` live, 6 steps and 3 picks verified |

# New section: AA-PersonalityBench (indexes, traits, trait details)

Adds a Personality section to Model Atlas: one table of every model AA scores on PersonalityBench, where you can open
any of the 8 indexes to see the traits under it, and open any trait for its details. Earlier plans: below
(SWE-Atlas-QnA, live since 2026-11-18).

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
| 1.3 | **Browser check** [look]. Production build, `next start` through the node `next` bin, stopped by its PID (memory `next-start-pid`). Add `scripts/check-personality-browser.mjs`, modelled on `scripts/check-evaluation-browser.mjs`, and run it with `scripts/check-master-browser.mjs` (its expectations unedited). Shots go to `docs/screenshots/personality/`. **Done when**: both scripts pass; the count line on All indexes, Warmth and Sincere says the number of models in 1.1's doc; clicking the Sincere header sorts highest first, then lowest first, and the Slop header lowest first by default; search "claude" with the Anthropic provider filter shows only Anthropic rows and survives a reload; a model starred on the master page shows when "Favorites only" is picked on `/personality`, and an unstarred one doesn't; "No models match these filters." shows for a search with no hits; the nav item is marked current on `/personality`; the home card's link opens it; shots at 1440px and 390px of All indexes, Transparency and Sincere. | Sol High | Build, server, browser and shots: Terminal Bench 17 for $0.56 | 2026-11-19 · 53 models, both browser checks passed, 12 shots at 1440px and 390px after visual review |
| R1 | **Phase 1 review**: the diff from `main`, 1.1's doc against the capture, and the 1.2 and 1.3 shots. Quick fixes only; the rest become fix rows under this one. **Done when**: five models' Sincere, Warmth and Slop values on live AA (two Claude, two GPT-6.2, one other) match the page; every FINDING is fixed or has a fix row; if a fix touched data or the page, 1.3's checks run again and pass. | Opus 5.5 High | Other family from most of the build (1.1 and 1.3 are Sol) | 2026-11-19 · 5 models match live AA; Slop note fixed; 1.3 checks pass |
| O1 | *owner*: release with `git push origin personality-bench:main` (no `publish:data` needed: the data ships with the deploy). On the live site, open `/personality`, open Warmth, then Sincere. | — | — | 2026-11-19 · `2ae1a6a` live (Vercel success), `/personality` returns 200; owner to open Warmth and Sincere |

---

# New evaluation: SWE-Atlas-QnA (AA)

Adds Artificial Analysis's (AA) SWE-Atlas-QnA scores as a leaderboard of their own and a master column, and writes
into `~/.claude/playbooks/plans-and-models.md` what it measures and which picks it should inform. Earlier plans:
below (GPT-6.2 Astra and Sol, live since 2026-11-18).

Working branch: `swe-atlas-qna`. Every task commits and pushes there. `main` deploys to production and moves only on O1.

## What the owner asked (2026-11-18)

"Implement SWE Atlas QnA (AA) into this site as a new eval index and in the leaderboards, and add it to the global
playbook, describing its use and where it is influential."

Simplest design that meets it: one more capture target, one more importer config, one more master column, one rank
column, one playbook bullet. No new page type and no change to scoring or saved tasks.

## What AA publishes (read on the live page, 2026-11-18)

- **No evaluation page of its own.** `/evaluations/swe-atlas-qna` is a 404. It is the SWE-Atlas-QnA-AA tab under
  "Performance" on the Coding Agent Index page (`https://artificialanalysis.ai/agents/coding-agents`;
  `/models/capabilities/coding` redirects there). The index (v2.1) weights it equally with FrontierCode-AA 2.0 and
  Terminal-Bench 4.1.
- **What it measures:** 124 technical Q&A tasks built by Scale AI, with grading adjusted by AA: read a real
  codebase, trace its behaviour, give a correct technical answer. Each answer is pass or fail. Grading data:
  `huggingface.co/datasets/ArtificialAnalysis/SWE-Atlas-QnA-AA`.
- **39 rows, each "Agent - Model (effort)"**, for example `Codex - GPT-6.2 Sol (xhigh)` or `Claude Code - Claude Opus
  5.5 (max)`. Each model appears in only one agent. All ten GPT-6.2 Astra and Sol efforts are there, as are Fable 5.2 at
  five efforts and Opus, Sonnet and Haiku 5.5 at Max only. Claude Code also runs two outside models (`Step 5 Preview`,
  `Qwen3.8 Max`).
- **Reading it:** the chart is Recharts. With "39 of 39 models" selected and the tab open, the panel
  `[id$="-content-swe-atlas-qna"]` gives the names in order from `.recharts-cartesian-axis-tick-label svg title` and the
  scores from `.recharts-label-list text` (whole percents). Checked: 39 names, 39 values. A one-off read is in this
  session's scratchpad; 1.1 makes it a capture target.

## Decisions (defaults, so no task stops to ask)

- **Map each row to a master row by model and effort, whatever the agent.** `Codex - GPT-6.2 Sol (xhigh)` becomes the
  `GPT-6.2 Sol (Xhigh)` master row, using the importer's usual name matching (`canonicalModelName`). A row with no
  matching master row is left out and listed in 1.1's doc. If one model and effort ever appears under two agents, the
  import throws, and that refresh asks the owner. That includes the two outside models Claude Code runs:
  `Step 5 Preview` and `Qwen3.8 Max` both have master rows. The evaluation's notes say "Scored inside the coding agent
  AA ran each model in (Claude Code, Codex, …)". The agent shows in the 1.1 doc, not as a column.
- **The expected rows live in the importer**, as a list of AA names and the master row each maps to. The import throws
  when an AA row on that list is missing or a mapped name finds no master row. A new AA row with no entry is left out
  and printed. `docs/DATA_DICTIONARY.md` says to update the list when a refresh prints one.
- **Ranks are among the imported rows:** rank 1 is the highest pass rate, and equal scores share a rank with
  the next rank skipped (1, 2, 2, 4), as on Terminal-Bench 4.0. They are not
  AA's ranks among all 39. The notes say so.
- **Not in the master's average rank.** `aggregateDimensionIds` in `src/lib/master.ts` stays as it is, so every existing
  master cell, average and order is unchanged. Saved tasks weight evaluations by id, so they aren't touched.
- **Names:** id and slug `swe-atlas-qna-aa`; display name "SWE-Atlas-QnA"; master label "SWE-Atlas QnA"; metric:
  pass rate in percent (`percentageEvaluation`); master column right after FrontierCode 2.0. Source link:
  `https://artificialanalysis.ai/agents/coding-agents`. Timing: none (`null` in `src/lib/model-speed.ts`). No cost per
  task: the page's cost figures are for the whole index.
- **Coding Agent Index and Terminal-Bench 4.1 stay out** (not asked; our Terminal-Bench column is 4.0). They go in the
  final message as follow-ups.
- **No recapture of the other pages.** This plan captures only this tab and imports it alongside the 18 Nov captures.
  The next normal AA refresh picks the new target up.
- **Playbook:** no pick changes without the owner's word; 1.4 lists any pick the scores would suggest. Its scores are
  AA's, so they hold whether or not O1 has happened. They carry their capture date, and R1 rechecks them.

## Before the run

- [x] Branch `swe-atlas-qna` pushed with upstream.

## Phase 1: build and release

| # | Task | Pick | Why | Done |
|---|---|---|---|---|
| 1.1 | **Capture and inventory** [no look]. Add a `swe-atlas-qna-aa` target to `scripts/capture-aa-evaluations.mjs` for `https://artificialanalysis.ai/agents/coding-agents`: select every model, open the SWE-Atlas-QnA tab, and read names and scores as "Reading it" above describes, pairing each name with the score of the same bar (by its x position or its group), not by list order. It passes the same completeness check as the other pages ("M of M" selected, item count M) and throws otherwise. Add a `--only <key>` flag so this run captures just this page into `data/aa-captures/swe-atlas-qna-aa.json`; without it, the target list is the old one plus this page. Write `docs/SWE_ATLAS_QNA_CAPTURE.md`: each AA row with its agent, score and the master row it maps to by Decisions above (exact name), or "left out" with the reason. Read: "What AA publishes" and Decisions above; "Capture" in `docs/DATA_DICTIONARY.md`. **Done when**: the capture holds every row the selector counts; the doc has one row per AA row (39 on 2026-11-18); all ten GPT-6.2 Astra and Sol efforts, the five Fable 5.2 efforts and Opus, Sonnet and Haiku 5.5 Max map to their master rows; hovering five bars on the live tab shows the same name and score as the capture: Codex - GPT-6.2 Astra (low) 36, Claude Code - Claude Haiku 5.5 (max) 34, Codex - GPT-6.2 Sol (max) 46, Antigravity CLI - Gemini 4 Hydrogen (xhigh) 60, Muse Code - Muse Wonder Full (max) 69 (if AA has changed a score since 2026-11-18, the doc says so); each left-out row gives its reason, and no master row gets two AA rows; a forced "Select all" failure throws naming the page; a test asserts the target list without `--only`; `git status` shows no change under `data/aa-captures/` but the new file. | Sol Max | New scrape that feeds a leaderboard: Terminal Bench 9, FrontierCode 9 | 2026-11-18 · 39 setups mapped, seven live scores matched, 15 captures passed |
| 1.2 | **Import, master column, ranks** [no look]. In `scripts/import-aa-evaluations.ts`, add the config: the mapped rows only, under their master names, ranked per Decisions, with its notes. In `src/lib/master.ts`, add the column after `frontiercode-2-0` with label "SWE-Atlas QnA". Add `null` timing in `src/lib/model-speed.ts`. Add "SWE-Atlas QnA" to `scripts/model-table-ranks.ts` and write `docs/model-table-ranks-2026-11-18.md` again with it. Put the expected-rows list (Decisions) in the config, built from 1.1's doc. Add the refresh line to `docs/DATA_DICTIONARY.md`. Run `import:aa-evaluations`. Extend `tests/aa-evaluations-import.test.ts`: the evaluation exists and has only mapped names; rank 1 holds the highest pass rate, and equal scores share a rank with the next skipped; renaming one expected AA row while adding another makes the import throw; scores are percents (GPT-6.2 Sol Xhigh is 51%, not 0.51); no master row is named after an agent; every master row's other cells and average rank equal those built without it. Update the evaluation count and capture text in `src/app/about/data/page.tsx` and `docs/DATA_DICTIONARY.md`, and grep `src`, `scripts` and `tests` for other hardcoded evaluation counts (`tests/new-models-browser-fixture.test.ts` asserts 18 twice). **Done when**: `validate-master.ts`, the rubric, suitability, model-speed and import tests, and `tsc` pass; a second import changes no file; the master row count is unchanged (no agent-named rows); every other evaluation's row count is unchanged; the source link is `https://artificialanalysis.ai/agents/coding-agents`; no test or page still expects 18 evaluations. | Sol Max | Data import that can corrupt every leaderboard | 2026-11-18 · 39 mapped rows, 19 evaluations, 639 master rows, repeat import clean |
| 1.3 | **Browser check** [look]. Production build, `next start` through the node `next` bin, stopped by its PID (memory `next-start-pid`). Add `swe-atlas-qna-aa` to the evaluations `scripts/check-evaluation-browser.mjs` covers, and run it and `scripts/check-master-browser.mjs`. Shots go to `docs/screenshots/swe-atlas-qna/`. **Done when**: both scripts pass; shots at 1440px and 390px of `/leaderboards/swe-atlas-qna-aa` show as many rows as 1.1's doc maps, the longest model name and its rank and score readable at 390px, and both sentences of the notes readable; master shots at 1440px and 390px show the "SWE-Atlas QnA" header right after FrontierCode 2.0 (header fitting, the name column still pinned at 390px), ranks in the ten GPT-6.2 rows (searched "GPT-6.2") and a dash (not 0 or blank) in three rows AA doesn't score, and sorted by that column both ways the dashes come last; the leaderboards index lists SWE-Atlas-QnA and its link opens the page; in `/suitability`, a task weighting only SWE-Atlas-QnA shows the scored models ranked and the unscored ones as missing coverage, not 0; `/about/data` shows the new count. | Sol High | Build, server, browser and shots: Terminal Bench 17 for $0.56 | 2026-11-18 · 39 rows, both browser checks passed at 1440px and 390px |
| 1.4 | **Playbook** [no look]. In `~/.claude/playbooks/plans-and-models.md`, "Model choice for coding implementation", turn "What the two coding benchmarks measure" into three and add SWE-Atlas-QnA: what it measures ("What AA publishes" above), and that it's best for **reading and explaining an existing codebase without changing it** (tracing a flow, answering "how does X work", the code-reading part of a review or a plan). Add an "SWE-Atlas QnA" column to the GPT table (all ten rows) and to the Fable 5.2 table, with our rank and the score from `docs/model-table-ranks-<date>.md` (ranks among the imported rows; never AA's position among its 39). The Claude table gets no column, since only its Max rows are measured; a note under it gives Opus, Sonnet and Haiku 5.5 Max. In the Coding Agent Index bullet, replace "no GPT-6.2 row is on it yet" with "every GPT-6.2 effort is scored on SWE-Atlas-QnA (2026-11-18); its index figures aren't captured here", and add no index numbers. Then say where it should count: the `tracer` and `finder` rows under "Subagents inside a session" (Claude and Codex picks), the code-explorer mapping, and the read-the-code step before a plan or review. Commit and push in `~/.claude` (branch `main`, only that file). **Done when**: every cited score and rank matches `data/leaderboards.json` and carries "AA capture of 2026-11-18"; the bullet names the uses and the limit (agent-run, Claude under the cap unmeasured); the Coding Agent Index bullet has the replacement line and no new numbers; the final message lists each pick the scores would change, at least `tracer` (Haiku 5.5 Max scores 34, the lowest of the imported rows) and its Codex pick Sol Max (46, below Sol xHigh and High at 51), and changes none. | Opus 5.5 High | Judgment prose in a file every session reads; a Claude pick avoids Codex's sandbox refusing writes to `~/.claude` | 2026-11-18 · ~/.claude 9b23a14, 18 scores checked, no pick changed |
| R1 | **Phase 1 review**: the diff from `main`, the 1.1 doc against the capture, the 1.3 shots, and the 1.4 bullet against the data. Quick fixes only; the rest become fix rows under this one. **Done when**: five mapped rows not among 1.1's five (two GPT-6.2, one Fable 5.2, Step 5 Preview, one other) are hovered on live AA and agree with the stored score; every playbook score and rank matches the data; every FINDING is fixed or has a fix row; if a fix touched data or a page, 1.3's checks run again and pass. | Opus 5.5 High | Other family from most of the build | 2026-11-18 · 6 live hovers and all 39 labels match, 18 playbook cells match, ~/.claude bc21ff9, no fix rows |
| O1 | *owner*: release with `git push origin swe-atlas-qna:main`, then say "publish the data" in a Claude session here (checks, `npm run publish:data`, Firestore read-back per `CLAUDE.md`). On the live site, open `/leaderboards/swe-atlas-qna-aa` and check the master column. | — | — | 2026-11-18 · `ed60fee` live, 19 snapshots verified, 39 rows and master column checked |

# New models: GPT-6.2 Astra and GPT-6.2 Sol (five efforts each)

Makes sure every GPT-6.2 Astra and Sol configuration Artificial Analysis (AA) scores is on the master leaderboard and
on each evaluation where AA scores it, checks it in the browser, and brings the rest of
`~/.claude/playbooks/plans-and-models.md` onto the same capture. Earlier plans:
[IMPLEMENTATION_PLAN-done.md](IMPLEMENTATION_PLAN-done.md) (Gemini 4 Hydrogen, Argon Medium and Qwen4 Max: phase done,
release folded into O1 below).

Working branch: `gemini-4-hydrogen-qwen4` (the GPT-6.2 capture `217fd80` is already on it, above the unreleased
Hydrogen work). Every task commits and pushes there. `main` deploys to production and moves only on O1.

## What the owner asked (2026-11-18)

"Make sure that all the new GPT Astra and Sol models are in the app."

Simplest design that meets it: the data is already imported (`217fd80`, AA capture of 2026-11-17), so this plan
proves it rather than rebuilding it: one audit, one browser check, the playbook ranks, a review and the release. No
new code paths. The two new-model scripts (`scripts/audit-new-models-coverage.ts`,
`scripts/check-new-models-browser.mjs`) get a model-set argument (`gpt-6.2`, `hydrogen`) instead of a new copy each, so the Hydrogen checks keep running
until that release is live.

## Models (in the 2026-11-18 capture)

| Name on the leaderboard | AA name in the captures | Evaluations with a score (of 18) |
|---|---|---|
| GPT-6.2 Astra (Low / Medium / High / Xhigh / Max) | `GPT-6.2 Astra (low)` … `(max)` | 17 (legacy CritPt absent on AA) |
| GPT-6.2 Sol (Low / Medium / High / Xhigh / Max) | `GPT-6.2 Sol (low)` … `(max)` | 16 (legacy CritPt and MMMU-Pro absent on AA) |

Checked 2026-11-18 with `aggregateMaster` on the bundled data: each of the ten is exactly one master row, provider
OpenAI. Older rows (GPT-6 Astra, GPT-6 Sol, GPT-6.1 Sol, GPT-5.6 Sol) stay as they are.

## Decisions (defaults, so no task stops to ask)

- **AA is the source; invent nothing.** A model joins an evaluation only where AA scores it. A gap where AA shows no
  score stays a dash and the audit names it with the page checked.
- **Recapture only if AA has moved.** If 1.1 finds AA now shows a GPT-6.2 Astra or Sol score or configuration our
  17 Nov capture lacks (a CritPt or MMMU-Pro score, a Non-reasoning or other new effort), 1.2 runs the full refresh.
  Otherwise 1.2 is ticked "not needed" in its first minutes.
- **Search terms:** the master search splits on commas and matches substrings, so "GPT-6.2 Astra" and "GPT-6.2 Sol"
  each find exactly five rows.
- **Local checks use bundled data.** `.env.local` sets no `DATA_SOURCE`, so builds and browser checks read the files,
  not Firestore.
- **Playbook:** the GPT table there already uses the 17 Nov ranks; the Claude, free-model and Hydrogen tables and the
  prose figures that cite them still use 16 Nov. 1.4 moves them to 17 Nov from `docs/model-table-ranks-2026-11-17.md`
  so one file never mixes two captures. No pick changes without the owner's word; the task lists any pick the new
  numbers would suggest.

## Before the run

- [x] Branch `gemini-4-hydrogen-qwen4` pushed with upstream; GPT-6.2 capture committed (`217fd80`, ranks `39679dd`).

## Phase 1: check and release

| # | Task | Pick | Why | Done |
|---|---|---|---|---|
| 1.1 | **AA gap check and coverage audit** [no look]. Give `scripts/audit-new-models-coverage.ts` a model-set argument (`--set gpt-6.2`, `--set hydrogen`; today's Hydrogen, Argon and Qwen list becomes the `hydrogen` set, unchanged) and add the ten GPT-6.2 rows (provider OpenAI) as `gpt-6.2`, writing `docs/GPT_6_2_ASTRA_SOL_COVERAGE.md`: one row per evaluation in `data/leaderboards.json`, one column per model, each cell the stored value and its rank (`source_rank`) or "not on AA (captured 2026-11-17)", traced to its capture file; plus Intelligence Index cost per task, Time per Task and First Answer per model. Its fuzzy check lists every master row matching `/gpt-6\.2/i` and fails unless that list is exactly the set. Then on live AA: open each model's page and the CritPt, MMMU-Pro, Terminal-Bench 4.0 and FrontierCode pages, list every GPT-6.2 Astra or Sol configuration AA shows (efforts, Non-reasoning, minis), and compare our stored Intelligence Index, Terminal-Bench 4.0 and FrontierCode scores for all ten with AA's. Read: Models and Decisions above; `docs/GEMINI_4_HYDROGEN_QWEN4_COVERAGE.md` for the layout. **Done when**: `--set gpt-6.2` and `--set hydrogen` both pass; the "not on AA" cells are exactly CritPt for all ten and MMMU-Pro for the five Sol (15 and 14 scores), or each other gap is confirmed on its AA page and named; the fuzzy list is exactly the ten; the doc ends with a "What AA shows now that we lack" list, holding every configuration, score or difference beyond rounding the live check found (empty if none). | Sol Max | Checks facts against AA (Omniscience 29; xHigh and High 37, 38) and changes a script | 2026-11-18 · both sets pass, 15 gaps confirmed, CritPt v2 scores listed |
| 1.2 | **Refresh if AA moved** [no look]. If 1.1's last list is empty, tick this row "not needed" and stop. Otherwise run the full refresh: capture all AA pages and both Briefcase tabs, `capture:aa-speed`, `import:briefcase-components`, `import:aa-index-costs`, `import:aa-evaluations` last (steps and `PLAYWRIGHT_MODULE` in `docs/DATA_DICTIONARY.md` and `docs/AA_BRIEFCASE_RUBRIC_REFRESH_PROMPT.md`), update the capture date in `docs/DATA_DICTIONARY.md` and `src/app/about/data/page.tsx`, run `scripts/model-table-ranks.ts` into `docs/model-table-ranks-<date>.md`. A new GPT-6.2 configuration goes into this plan's Models table, the `gpt-6.2` set in both scripts and 1.3's search counts. **Done when**: every item on 1.1's list is on the leaderboard or named as still missing on AA; both audit sets pass again; `validate-master.ts`, the rubric, suitability and model-speed tests and `tsc` pass; a second `import:aa-evaluations` changes no file; no model or evaluation row count shrinks unless the commit body names why; the commit body lists row counts before → after. | Sol Max | Imports can corrupt every leaderboard; the last refreshes ran cleanly on Sol | 2026-11-18 · both CritPt v2 subsets imported, checks passed, repeat import identical |
| 1.3 | **Browser check** [look]. Give `scripts/check-new-models-browser.mjs` the same `gpt-6.2` / `hydrogen` sets (the Hydrogen pass, Qwen spaced search included, stays as it is) with groups `GPT-6.2 Astra` ×5 and `GPT-6.2 Sol` ×5. Production build (`next build`; webpack if Turbopack hits the sandbox port limit), `next start` via the node `next` bin so killing `$!` frees the port, run `scripts/check-master-browser.mjs` with both sets (confirm both passes ran in its output), stop the server by its PID. Screenshots to `docs/screenshots/new-models-gpt-6-2/`. **Done when**: both passes pass, including the per-evaluation row check on every evaluation 1.1 lists for the ten, and asserting each of them shows a dash (not 0 or blank) in the master's CritPt cell and that no Sol row is on the MMMU-Pro page; the searches "gpt-6.2 sol" (lowercase) find five and "GPT-6.2 Astra, GPT-6.2 Sol" find ten (whether "GPT 6.2 Sol" finds them is recorded in the commit body, not fixed); shots at 1440px and 390px of the master searched for "GPT-6.2 Astra" and "GPT-6.2 Sol" show five rows or cards each, the full name with its effort readable, so no two look alike and none could be GPT-6 Astra; shots of Intelligence Index and Terminal-Bench 4.0 at both widths show the ten at the ranks the audit gives, names fitting their column, cost, Time per Task and First Answer filled or a dash; a shot of `/about/data` shows 2026-11-17 (or 1.2's date), fixed here if it doesn't. | Sol High | A check run (build, server, browser, shots): Terminal Bench 17 for $0.56 | 2026-11-18 · both sets passed all 18 evaluations, 1440px and 390px screenshots checked |
| 1.4 | **Playbook on one capture** [no look]. In `~/.claude/playbooks/plans-and-models.md`: redo every rank in "Model choice for coding implementation" (Claude table and its Fable 5.2 table), "Free models: backup only" and "Gemini 4 Hydrogen: compare only" from `docs/model-table-ranks-2026-11-17.md` (or 1.2's newer file), with their "capture of" dates and "out of N" counts, then every prose figure in the file that cites a Claude, Fable, free or Hydrogen rank (such as "Opus 5.5 High: 16, 24" in the GPT bullets). Leave the GPT table's numbers unless 1.2 ran. Grep `~/.claude/playbooks/new-app.md` and `blank-slate-redesign.md` for rank figures and update any that moved. Commit only those files in `~/.claude` (branch `main`, upstream `origin/main`; leave its untracked `__pycache__` folders alone) and push. If the Codex sandbox refuses the write or the push outside this repo, don't work around it: save the edited files to `docs/playbook-1.4/` here, commit them on this branch, and say so in the final message; R1 copies them into `~/.claude` and pushes. Read: those sections only. **Done when**: every table cell matches the rank file; the commit body lists each prose figure changed (old → new) and each "out of N" count; the two other playbooks are grepped and any moved figure changed; the final message lists any pick the new numbers would change, and changes none. | Sol Max | Mostly copying ranks from the rank file, checked cell by cell in R1 | 2026-11-18 · 18 Nov ranks verified, R1 handoff in `docs/playbook-1.4/` |
| R1 | **Phase 1 review**: the diff from `main` (Hydrogen work and GPT-6.2 capture included), the 1.1 audit against the captures, the 1.3 shots, the 1.4 tables against the rank file. Quick fixes only; the rest become fix rows under this one. **Done when**: if `docs/playbook-1.4/` exists, its files are copied into `~/.claude/playbooks/`, committed and pushed there, and the folder is deleted here; three of the ten models' "What AA shows now" checks are redone on live AA and agree with 1.1; the 1.4 tables match the rank file cell by cell; every FINDING is fixed or has a fix row; if a fix touched data or a page, both browser passes run again and pass. | Opus 5.5 High | Other family from most of the build || 2026-11-18 · playbook pushed (`~/.claude` 5b00d26), 444 cells match, 3 prose figures fixed, 3 models agree live; F1–F2 |
| 1.F1 | **Fix: capture completeness** [no look]. `scripts/capture-aa-evaluations.mjs` `expandSelectors` swallows every failure and only the two CritPt v2 pages check that the score chart holds all "N of M models"; a failed "Select all" on any other page silently captures a partial list, and the importer rebuilds that evaluation from it (rows dropped, ranks shifted). Make every page's score chart pass the same check (selector reads "M of M", chart length M) and throw otherwise, reading the selector that belongs to the score chart, not `.first()`. Don't recapture into `data/`: prove it on a temp folder (`cd` into an empty folder so `data/aa-captures` lands there). **Done when**: a live run of all 14 pages into a temp folder passes; with the "Select all" click forced to fail (env flag or a one-off edit, reverted) the run throws naming the page; `tests/aa-evaluations-import.test.ts` and `tsc` pass. | Sol Max | Capture feeds every leaderboard | 2026-11-18 · 14 live pages verified, forced click rejected, import tests and tsc passed |
| 1.F2 | **Fix: master dash and browser checks** [look]. (a) `src/components/master-leaderboard.tsx` `MissingEvaluationRank`: the CritPt dash's only text is `title="Not ranked"`, so screen readers hear a dash; keep the visible dash, hide it from assistive tech and add an `sr-only` "Not ranked", and update the dash assertions in `scripts/check-new-models-browser.mjs` (lines ~265-310) to read the visible text. (b) `scripts/check-master-browser.mjs` ~118: after ArrowRight also assert the region's `scrollLeft` grew; read `aria-sort` and row text with retrying `expect`-style waits, not once after the URL changes. (c) `src/components/leaderboard.tsx:109`: the static "Scroll sideways for all columns ↔" hint shows beside the frame's own "More columns →" cue (Intelligence Index at 1440px); drop the static hint or show it only when the cue doesn't, and stop `.table-overflow-cue-slot` reserving an empty line when no cue shows (keep the layout from jumping on scroll). **Done when**: both browser passes (`gpt-6.2`, `hydrogen`) and `check-master-browser.mjs` pass on a production build; an axe or accessibility-tree read of a master CritPt cell gives "Not ranked"; shots of Intelligence Index at 1440px and 390px show one scroll cue, no empty gap above the table. | Sol Max | Page change, checked in the browser | 2026-11-18 · local production build, both model sets and master passed · CritPt accessibility tree and 1440px/390px shots checked |
| O1 | *owner*: release with `git push origin gemini-4-hydrogen-qwen4:main`, then straight away in a Claude session in this folder say "publish the data" (checks, `npm run publish:data`, Firestore read-back per `CLAUDE.md`); production reads Firestore, so the new models show only after the publish. On the live site, search the master for "GPT-6.2 Astra", "GPT-6.2 Sol" and "Hydrogen", open Terminal-Bench 4.0, and check `/about/data` shows the capture date. | — | — | 2026-11-18 · `e2d9b70` live, 18 snapshots verified, phone and desktop checks passed |

---

# New models: Gemini 4 Hydrogen (four efforts), Gemini 4 Argon (Medium), Qwen4 Max

Adds six Artificial Analysis (AA) model configurations to the master leaderboard and to every individual
evaluation where AA scores them, then adds Gemini 4 Hydrogen to `~/.claude/playbooks/plans-and-models.md`.
Earlier plans: [IMPLEMENTATION_PLAN-done.md](IMPLEMENTATION_PLAN-done.md) (Fable 5.2 and Muse Ember, live since
2026-11-10; speed columns before it).

Working branch: `gemini-4-hydrogen-qwen4` (from `main` = `aa674d2`). Every task commits and pushes there. `main`
deploys to production and moves only on the owner's release line.

## What the owner asked (2026-11-16)

"Make sure the Gemini 4 family (from low to xhigh), and then Gemini 4 Argon Medium and Qwen 4 Max go into the main
leaderboard and the individual eval indexes", and "by the end make sure the Hydrogen ones get into the global model
playbooks."

Simplest design that meets it: the same refresh the Fable 5.2 plan ran (recapture every AA page, re-import, audit,
browser check), then one playbook edit. No new code paths. The two Fable-specific scripts
(`scripts/audit-new-models-coverage.ts`, `scripts/check-new-models-browser.mjs`) get the new model list instead of a
new copy each.

## Models (checked on AA 2026-11-16)

| AA name | AA profile | Name on the leaderboard |
|---|---|---|
| Gemini 4 Hydrogen (Xhigh) (Google, released 2026-11-12) | `/models/gemini-4-hydrogen` (efforts on that page) | Gemini 4 Hydrogen (Xhigh) |
| Gemini 4 Hydrogen (High) | same | Gemini 4 Hydrogen (High) |
| Gemini 4 Hydrogen (Medium) | same | Gemini 4 Hydrogen (Medium) |
| Gemini 4 Hydrogen (Low) | same | Gemini 4 Hydrogen (Low) |
| Gemini 4 Argon (Medium) (second effort of Argon, released 2026-09-30) | `/models/gemini-4-argon` | Gemini 4 Argon (Medium) |
| Qwen4 Max (Alibaba; AA spells it without a space) | `/models/qwen4-max` | Qwen4 Max |

AA's model pages on 2026-11-16 gave Intelligence Index 54 / 51 / 41 / 27 for Hydrogen Xhigh / High / Medium / Low and
43 for Qwen4 Max ($3.27 a task). Our 10 Nov capture has Gemini 4 Argon (High) and Gemini 4 Carbon (Low, Medium, High)
but none of the six above.

## Decisions (defaults, so no task stops to ask)

- **Import everything AA shows at capture time; invent nothing.** A model joins an evaluation only where AA scores it.
  Hydrogen is four days old, so some evaluations may not list it yet: a missing result stays a dash and the coverage
  audit names it. The next AA refresh fills it in.
- **Full refresh, not a patch.** The capture and import scripts redo every page, so every model's scores, ranks and
  costs move to the new capture date. That's expected.
- **Names** follow `canonicalModelName` in `scripts/import-aa-evaluations.ts` and the existing Gemini convention
  (`Gemini 4 Carbon (High)`). Qwen4 Max keeps AA's spelling. If AA spells one differently on some page, add a rule
  there (with a test) so each configuration is one master row. Search finds Qwen4 Max for "Qwen4"; whether "Qwen 4"
  (with a space) also finds it is only recorded, and a fix is a follow-up for the owner, not part of this plan.
- **Local checks use bundled data.** `.env.local` sets no `DATA_SOURCE`, so builds and browser checks read the new
  files, not Firestore.
- **Playbook:** Gemini 4 Hydrogen goes in as a compare-only table (like "Free models: backup only"), not as a pick:
  `autorun` runs only Claude and Codex, so no plan row can pick it. Ranks in every existing table are redone (new models
  shift them). No pick changes without the owner's word; the task lists any pick the new numbers would suggest.

## Before the run

- [x] Branch `gemini-4-hydrogen-qwen4` created from `main` (`aa674d2`) and pushed with upstream (2026-11-16).

## Phase 1: import and check

| # | Task | Pick | Why | Done |
|---|---|---|---|---|
| 1.1 | **Capture and import** [no look]. Recapture all 16 AA pages (`scripts/capture-aa-evaluations.mjs`, with `PLAYWRIGHT_MODULE=/home/ubuntu/projects-steps-documentation/node_modules/playwright/index.mjs`) and the AA-Briefcase rubric and quality-Elo tabs (no committed script: read `docs/AA_BRIEFCASE_RUBRIC_REFRESH_PROMPT.md`), then run `import:briefcase-components`, `import:aa-index-costs` (also writes `data/aa-model-speed.json`) and `import:aa-evaluations` last. Update the capture date in `docs/DATA_DICTIONARY.md` and `src/app/about/data/page.tsx`. Read: Models and Decisions above. **Done when**: all six names appear in the captures (list any AA doesn't show at all); Argon (High) and Carbon (Low, Medium, High) are still one row each; `node --import tsx scripts/validate-master.ts`, `node --import tsx --test tests/rubric-snapshot.test.ts tests/suitability*.test.ts tests/model-speed.test.ts` and `npx tsc --noEmit -p tsconfig.json` pass; a second `import:aa-evaluations` run changes no file; every capture file (the hand-run Briefcase tabs too) carries the new capture date; no model in the 10 Nov data disappears and no evaluation's row count shrinks unless the commit body names why (AA dropped it, with the page checked); the commit body lists row counts before → after per evaluation, like `44fe61f`. | Sol Max | Imports can corrupt every leaderboard; the last two refreshes ran cleanly on Sol | 2026-11-16; 16 pages + both Briefcase tabs refreshed; 5,075 rows; master, 38 tests, tsc and repeat import pass; speed refresh split to 1.1b (10 Nov speed retained) |
| 1.1b | **Repair and refresh AA speed capture** [no look]. Finish the speed portion split from 1.1 at its session budget. The 16 Nov profile URL now serves a family comparison: its public model manifest supplies overall task time and first answer but omits `intelligenceIndexEvaluations`; a trial import erased all 108 models’ per-evaluation times and failed the existing slug-map test. `data/aa-model-speed.json` therefore deliberately remains the verified 10 Nov capture (398 records). Inspect current official evaluation-page Time per Task charts or another complete official payload, repair the capture/import path, and refresh speed values without guessing or relabeling stale values as fresh. Keep the existing data and mapping checks; do not relax them merely to accept empty timing data. Run `import:aa-index-costs`, then `import:aa-evaluations` last; the 16 Nov evaluation/Briefcase captures already exist and need no repeat unless the repair requires extra fields. **Done when**: current overall, first-answer and available per-evaluation timings are captured with the actual retrieval date and source evidence; any AA removal is verified on its evaluation page and named in the commit; every speed record has honest provenance; master validation, rubric/suitability/model-speed tests and TypeScript pass; a repeat evaluation import changes no file. Update source documentation for any capture-format change. | Sol Max | AA changed its public timing payload; keep the working evaluation refresh separate from the speed-source repair | 2026-11-16; 399 records / 1,570 evaluation times; provenance saved; master, 47 tests + 17 final speed checks, tsc and repeat import pass |
| 1.2 | **Coverage audit** [no look]. Change the model list in `scripts/audit-new-models-coverage.ts` to the six above (provider Google or Alibaba; keep the Fable doc's spot-check rows out) and have it write `docs/GEMINI_4_HYDROGEN_QWEN4_COVERAGE.md`: one row per evaluation (all 20 in `data/leaderboards.json`), one column per model; each cell the stored value or "not on AA (captured <date>)", traced to its capture file. Add the Intelligence Index cost per task, Time per Task and First Answer per model (dash where AA has none). The script already confirms each model is exactly one master row via `aggregateMaster`; also have it list every master row matching `/hydrogen|argon|qwen\s?4/i` and fail unless that list is exactly the six plus Argon (High), so a spelling variant can't hide. Read: `docs/FABLE_5_2_MUSE_EMBER_COVERAGE.md` for the layout. **Done when**: every cell is filled; five hand spot-checks (at least one per model family) match the capture JSON; the stored Intelligence Index for each Hydrogen effort and Qwen4 Max matches AA's model pages (54 / 51 / 41 / 27 and 43 on 2026-11-16, or AA's current figure, named); any duplicate or misnamed row goes back into the importer with a test. | Sonnet 5.5 High | Completeness is the job |  2026-11-16; 96 cells filled, 24 not on AA; IIdx 53.9/50.8/41.2/26.9, Qwen4 42.9 match AA 54/51/41/27/43; 6 spot checks match; no duplicate rows |
| 1.3 | **Browser check** [look]. Point `scripts/check-new-models-browser.mjs` at the new groups (`Gemini 4 Hydrogen` ×4, `Gemini 4 Argon` ×2 now that High and Medium both exist, `Qwen4` ×1; expected count 7 in the bundled Intelligence Index, or fewer only where 1.2 shows AA has no index score). Production build (`next build`; webpack if Turbopack hits the sandbox port limit), `next start` via the node `next` bin so killing `$!` frees the port, run `scripts/check-master-browser.mjs` (it calls the new-models pass in `check-new-models-browser.mjs`; confirm that pass ran in its output), stop the server by its PID. Extend the new-models pass to open every evaluation page where the bundled data has one of the six and assert the row is there. Screenshots to `docs/screenshots/new-models-hydrogen/`. **Done when**: the check passes; shots show the master table at 1440px searched for "Hydrogen" (four rows), "Argon" (two) and "Qwen4" (one), names inside the frozen Model column with no overlap; the same searches at 390px as cards with their scores; whether "Qwen 4" (with a space) finds Qwen4 Max is written in the commit body; the scripted per-evaluation check passes on every evaluation the audit lists for them; shots of Intelligence Index and one evaluation (e.g. Terminal-Bench 4.0) at 1440px and 390px show them at the rank the audit gives, with cost, Time per Task and First Answer cells filled or a dash; a shot of `/about/data` shows the new capture date. | Sol Max | A pass/fail script plus shots | 2026-11-16; checks pass; 20 evals ×2 / 230 rows; fresh-eyes fixes and 29 shots reviewed |
| 1.4 | **Global model tables** [no look]. In `~/.claude/playbooks/plans-and-models.md`: redo every rank in the Claude, GPT and free-model tables from the new data (method: `aggregateMaster`, `cells[evalId].entry.source_rank`; row names like `Claude Opus 5.5 (Adaptive Reasoning, High Effort, Default Fallback)`, `GPT-6.1 Sol (Max)`), update the "out of N models" counts and capture dates, and recheck the prose figures; save the script output the ranks came from to `docs/model-table-ranks-<capture date>.md` in this repo so R1 can compare cell by cell. Grep `~/.claude/playbooks/new-app.md` and `blank-slate-redesign.md` for rank figures and update any that moved. Add a section **"Gemini 4 Hydrogen: compare only (owner, 2026-11-16)"** after "Free models: backup only", with the same columns as that table: one row per Hydrogen effort, plus *Opus 5.5 High (compare)* and *Sol Max (compare)* rows; two or three bullets on where Hydrogen beats or trails those two, and one line that it is never a pick in a plan, an autorun row, a retry or a review (autorun can't run it). Commit and push in the `~/.claude` repo. Read: that file's "Model choice for coding implementation", "Analysis work", "GPT models (Codex)" and "Free models: backup only" sections only. **Done when**: every cell matches the saved rank output; the Hydrogen table has four rows (a dash where AA has no score); the final message lists any pick the new numbers would change. | Opus 5.5 High | Model notes every future pick reads; writes outside this repo | 2026-11-16; `~/.claude` 261023b; ranks from `scripts/model-table-ranks.ts` (reproduces 10 Nov table on `main`); no pick changes |
| R1 | **Phase 1 review**: the diff from `main`, the 1.2 audit against the captures, the 1.3 shots, the 1.4 tables against `docs/model-table-ranks-<date>.md` (if a fix changes the import, redo the affected playbook cells and push `~/.claude` again). Quick fixes only; the rest become fix rows under this one. | Opus 5.5 High | Other family from most of the build | 2026-11-16; checks pass; audit and 480 playbook cells match; About history copy fixed; no fix rows |
| O1 | *owner*: moved to the GPT-6.2 plan's O1 (one release covers both, same branch). | — | — | 2026-11-18 |

---

# New models: Claude Fable 5.2 (five efforts) and Muse Ember (Max, Xhigh)

Adds seven Artificial Analysis (AA) model configurations to the master leaderboard and to every individual
evaluation where AA scores them, then updates the model tables in `~/.claude/playbooks/plans-and-models.md`.
Earlier plan below: speed columns, live since 2026-11-09.

Working branch: `fable-5-2-muse-ember`. Every task commits and pushes there. `main` deploys to production and moves
only on the owner's release line.

## Models (checked on AA 2026-11-09)

| AA name | AA profile | Name on the leaderboard |
|---|---|---|
| Claude Fable 5.2 (Max, Default Fallback) | `/models/claude-fable-5-2` | Claude Fable 5.2 (Adaptive Reasoning, Max Effort, Default Fallback) |
| Claude Fable 5.2 (Xhigh, Default Fallback) | `/models/claude-fable-5-2-xhigh` | … Xhigh Effort … |
| Claude Fable 5.2 (High, Default Fallback) | `/models/claude-fable-5-2-high` | … High Effort … |
| Claude Fable 5.2 (Medium, Default Fallback) | `/models/claude-fable-5-2-medium` | … Medium Effort … |
| Claude Fable 5.2 (Low, Default Fallback) | `/models/claude-fable-5-2-low` | … Low Effort … |
| Muse Ember (Max) (Meta, released 2026-11-09) | `/models/muse-ember` | Muse Ember (Max) |
| Muse Ember (Xhigh) | `/models/muse-ember-xhigh` | Muse Ember (Xhigh) |

A test capture on 2026-11-10 (four pages) found all seven on AA-Briefcase, Terminal-Bench 4.0 and FrontierCode 2.0,
and the five Fable 5.2 rows on GDPval-AA (Muse Ember isn't listed there). Charts label them in lower case
(`Claude Fable 5.2 (max)`, `Muse Ember (xhigh)`); the full names above come from the same captures.

## Decisions (defaults, so no task stops to ask)

- **Import everything AA shows at capture time; invent nothing.** A model joins an evaluation only where AA
  scores it. A missing result stays a dash, and the coverage audit names it. The next AA refresh fills it in.
- **Full refresh, not a patch.** The capture and import scripts redo every page, so every model's scores, ranks and
  costs move to the new capture date. That's expected.
- **Names** follow `canonicalModelName` in `scripts/import-aa-evaluations.ts` (the Fable rows need no new rule) and
  the existing Muse convention (`Muse Spark 1.3 (Max)`). If AA spells one differently on some page, add a rule there
  so each configuration is one master row.
- **Local checks use bundled data.** `.env.local` sets no `DATA_SOURCE`, so builds and browser checks read the new
  files, not Firestore.
- **Model tables:** ranks are redone for every row (new models shift them). No pick changes without the owner's
  word; the task writes a Fable 5.2 note like the Fable 5.1 one and lists any pick it would suggest.

## Before the run

- [x] Branch `fable-5-2-muse-ember` created from `speed-columns` (= `origin/main`) and pushed with upstream (2026-11-09).

## Phase 1: import and check

| # | Task | Pick | Why | Done |
|---|---|---|---|---|
| 1.1 | **Capture and import** [no look]. Recapture all 16 AA pages (`scripts/capture-aa-evaluations.mjs`, with `PLAYWRIGHT_MODULE=/home/ubuntu/projects-steps-documentation/node_modules/playwright/index.mjs`) and the AA-Briefcase rubric and quality-Elo tabs (no committed script: read `docs/AA_BRIEFCASE_RUBRIC_REFRESH_PROMPT.md`), then run `import:briefcase-components`, `import:aa-index-costs` (also writes `data/aa-model-speed.json`) and `import:aa-evaluations` last. Update the capture date in `docs/DATA_DICTIONARY.md` and `src/app/about/data/page.tsx`. Read: Models and Decisions above. **Done when** all seven names appear in the captures (list any AA doesn't show at all); `node --import tsx scripts/validate-master.ts`, `node --import tsx --test tests/rubric-snapshot.test.ts tests/suitability*.test.ts tests/model-speed.test.ts` and `npx tsc --noEmit -p tsconfig.json` pass; a second `import:aa-evaluations` run changes no file; the commit body lists row counts before → after per evaluation, like `44fe61f`. | Sol Max | Imports can corrupt every leaderboard; the 7 Nov refresh ran cleanly on it | 2026-11-10; checks pass; repeat import unchanged |
| 1.2 | **Coverage audit** [no look]. Write `docs/FABLE_5_2_MUSE_EMBER_COVERAGE.md`: one row per evaluation (all 20 in `data/leaderboards.json`), one column per model; each cell the stored value or "not on AA (captured <date>)", traced to its capture file. Add the Intelligence Index cost per task, Time per Task and First Answer per model (dash where AA has none). Use `aggregateMaster` on the merged local data (as in `src/lib/data.ts`) to confirm each model is exactly one master row. Read: `docs/CLAUDE_HAIKU_5_5_COVERAGE_AUDIT.md` for the layout. **Done when** every cell is filled and spot-checks of five cells match the capture JSON; any duplicate or misnamed row goes back into the importer with a test. | Sonnet 5.5 High | Completeness is the job (Rubric 12) | 2026-11-10; 140 cells (125 stored, 15 not on AA), one master row each, 5 spot-checks match |
| 1.3 | **Browser check** [look]. Production build (`next build`; webpack if Turbopack hits the sandbox port limit, as on 7 Nov), `next start`, run `scripts/check-master-browser.mjs`, stop the server by its PID. Screenshots to `docs/screenshots/new-models-nov/`. **Done when** the check passes and shots show: the master table at 1440px searched for "Fable 5.2" with five rows and "Muse Ember" with two, long names wrapping inside the frozen Model column with no overlap; the same searches at 390px as cards with their scores; Intelligence Index and one evaluation page where AA scores them (e.g. Terminal-Bench 4.0) listing them at the right rank. | Sol xHigh | A pass/fail script plus shots | 2026-11-10; fresh-eyes fixes checked; webpack build, 14 unit tests and browser checks pass; 13 shots reviewed, 5/2 rows and both evaluation ranks match; server stopped |
| 1.4 | **Global model tables** [no look]. Redo every rank in both tables of `~/.claude/playbooks/plans-and-models.md` from the new data (method: `aggregateMaster`, `cells[evalId].entry.source_rank`; row names like `Claude Opus 5.5 (Adaptive Reasoning, High Effort, Default Fallback)`, `GPT-6.1 Sol (Max)`), update the "out of N models" counts and capture date, and recheck the prose figures. Add a **Fable 5.2** note next to the Fable 5.1 one: cost and ranks per effort against Opus 5.5 High and xHigh. A 2026-11-10 test capture put Fable 5.2 Low and Medium above Opus 5.5 High on Strategy & Ops, Finance and Omniscience (about 63 against 42) for about the same AA cost, and below it on AA-Briefcase and GDPval. So the note also weighs Fable 5.2 Low and Medium for the steps in "Analysis work" (framing, strategy and finance analysis, final recommendation, red-teaming), using the Briefcase Presentation, Rubric and Analytical Elo ranks too. It also notes that the owner sees Fable draw down the weekly and 5-hour limits faster than Opus. Commit and push in the `~/.claude` repo. Read: that file's "Model choice for coding implementation", "Analysis work" and "GPT models (Codex)" sections only. **Done when** every cell traces to the new data, and the final message lists any pick the new numbers would change. | Opus 5.5 High | Model-choice notes every future pick reads; writes outside this repo | 2026-11-10; claude-config e3cab87; every rank redone, Fable 5.2 note added, no pick changed |
| R1 | **Phase 1 review** and its fixes: the diff from `main`, the 1.2 audit against the captures, the 1.3 shots, the 1.4 tables. | Opus 5.5 High | Other family from most of the build | 2026-11-10 · 5 fixed (Haiku 5.5 speeds, II source link, phone timings fold, cue over text, audit layout); audit and 1.4 tables match; full check passes |
| O1 | *owner*: release with `git push origin fable-5-2-muse-ember:main`, then in a Claude session in this folder say "publish the data" (checks, `npm run publish:data`, Firestore read-back per `CLAUDE.md`). Open the live master and search "Fable 5.2" and "Muse Ember". | — | — | released (`origin/main` = aa674d2); owner saw both models on the live site, ticked 2026-11-16 |

---

# Speed columns: Time per Task and First Answer

Adds two speed measures from Artificial Analysis (AA) to the master leaderboard (frozen columns), the individual
evaluation pages, and the model tables in `~/.claude/playbooks/plans-and-models.md`.

Working branch: `speed-columns`. Every task commits and pushes there. `main` deploys to production and moves only
on the owner's release line.

## Data (checked 2026-11-09)

AA's model records, which `scripts/import-aa-intelligence-index-costs.ts` already fetches and decrypts, carry:

| Measure | AA field | Unit |
|---|---|---|
| Time per Task (Intelligence Index) | `intelligenceIndexTimePerTask` | seconds |
| Time per Task (one evaluation) | `intelligenceIndexEvaluations[].timePerTask`, keyed by AA `slug` (e.g. `terminalbench-4-0`, `aa-briefcase`, `frontiercode-2-0`, `omniscience`) | seconds |
| First Answer | `performance.headline.timeToFirstAnswerToken` (time to first answer token, from the creator's API) | seconds |

No value is estimated. A missing value shows as a dash and sorts last.

## Decisions (defaults, so no task stops to ask)

- **Aggregate Score stays quality-only.** Speed is shown and sortable, like cost. It isn't averaged into the rank.
- **Master columns, in this order:** Model, Provider, Cost, Time per Task (minutes, 1 decimal), First Answer
  (seconds, 1 decimal), Aggregate Score, then the evaluations.
- **Frozen at 1280px and wider:** Model, Provider, Cost, Time per Task and First Answer. From 768 to 1279px, five
  frozen columns would cover most of the table, so only today's three stay frozen and the two new columns sit
  right after them. Below 768px the cards show both values.
- **Evaluation pages:** Time per Task uses that evaluation's own AA value where AA reports one (header "Time per
  task"). Otherwise it uses the Intelligence Index value (header "Time per Intelligence Index task"), chosen per
  page and never mixed per row. First Answer is the same model-level value on every page. These columns aren't frozen.
- **Storage:** a new bundled file, `data/aa-model-speed.json`. Firestore and `data/leaderboards.json` don't change,
  so the release needs no `publish:data`. Rerunning the importer also refreshes `data/intelligence-index-costs.json`
  to the same capture date. That's expected.
- **Global tables:** add two columns. Speed only breaks ties between rows that are close on quality. No pick changes
  without the owner's word; the task lists any it would suggest.

## Before the run

- [x] Branch `speed-columns` created from `main` and pushed with upstream (done with this plan, 2026-11-09).

## Phase 1: speed columns

| # | Task | Pick | Why | Done |
|---|---|---|---|---|
| 1.1 | **Speed data and master logic** [no look]. Extend `scripts/import-aa-intelligence-index-costs.ts` to also write `data/aa-model-speed.json` (slug, name, provider, url, `time_per_task_s`, `first_answer_s`, `evaluation_times_s` by AA slug, captured_at). Keep a record when any one value exists. Run it. New `src/lib/model-speed.ts`: lookup by `masterIdentityKey`, same rules as `src/lib/intelligence-index-costs.ts`; a map from our evaluation ids to AA slugs (list AA's slugs from the file, map every one we have); formatters. In `src/lib/master.ts`: a `speed` field on master rows, sort keys `time-per-task` and `first-answer`, two CSV columns after cost. New `tests/model-speed.test.ts`. Update the `docs/DATA_DICTIONARY.md` table row. Read: the Data and Decisions sections above. **Done when** the importer prints its counts; tests cover lookup (Claude Opus 5.5 High and GPT-6.1 Sol rows), the slug map, formatting, sort order (fastest first, missing last) and the CSV header; `npx tsc --noEmit -p tsconfig.json` passes. | Sol xHigh | Import and logic judged by tests | 2026-11-09 · 392 speeds; tests, tsc, build pass |
| 1.2 | **Master table: two frozen columns** [look]. `src/components/master-leaderboard.tsx`, `src/app/globals.css` (`.master` widths and sticky rules), `src/app/page.tsx` (capture label). Header buttons match the Cost header (label, small "Minutes · AA · date" or "Seconds · AA · date", sort arrow). Mobile: both values in the card metrics and both in the Sort by options. Update the master intro text (desktop and mobile). Read: Decisions above, the AGENTS.md UI rule. **Done when** screenshots of a production build show: at 1440 and 1280px, scrolled right to the last evaluation column, all five columns stay in place with no gap, overlap or see-through cell, and the divider sits after First Answer. At 1024 and 768px, three columns are frozen and the new two follow them. At 390px each card shows Time / task and First answer. Sorting by each new column puts the fastest first and dashes last. `scripts/check-master-browser.mjs` passes. | Opus 5.5 High | Frozen-column widths and breakpoints are a look decision | 2026-11-09 · shots in `docs/screenshots/speed-columns`; browser check passes |
| 1.3 | **Evaluation pages** [look]. `src/components/leaderboard.tsx`, `src/lib/contract.ts` (sort enum `time_per_task`, `first_answer`), `src/app/leaderboards/[evaluationSlug]/page.tsx` (intro line), `src/app/about/data/` page and `README.md` (one line each). Read: Decisions above. **Done when** screenshots at 1440 and 390px show both columns on Terminal Bench (header "Time per task"), Analytical Quality Elo (AA-Briefcase time) and Finance and Accounting (header "Time per Intelligence Index task"); `?sort=time_per_task` and `?sort=first_answer` sort fastest first with dashes last; tsc and unit tests pass. | Sol xHigh | Copies the cost column's pattern; pass/fail checks | 2026-11-09 · fresh-eyes fixes; tests/tsc/build/browser pass; 1440/390 looked ([evidence](screenshots/speed-columns/evaluation-look.md)) |
| 1.4 | **End-to-end check**. Extend `scripts/check-master-browser.mjs` to assert both master headers, the CSV columns and fastest-first sorting on each, and one evaluation page's two columns. Run it once against a production build (`next build`, `next start`), then stop the server by its PID. **Done when** it passes, or the failures are listed in this row for R1. | Sol xHigh | A pass/fail script | 2026-11-09 · single production-build browser run passes; both speed sorts cover 629 rows, missing last; phone sorts and Terminal Bench columns pass; server stopped by PID; 10 unit tests and tsc pass |
| 1.5 | **Global model tables** [no look]. In `~/.claude/playbooks/plans-and-models.md`, add "Time / task" (min) and "First answer" (s) columns to the Claude table and the GPT table, copied from `data/aa-model-speed.json` (dash where AA has no row, e.g. Terra xHigh). Add one bullet under each table's notes: what the two measure, and that speed breaks ties only. Commit and push in the `~/.claude` repo. Read: that file's two tables and their notes only. **Done when** every row has both values or a dash, each traceable to a record in the JSON, and the final message lists any pick the speed numbers would change. | Haiku 5.5 Max | Exact copy from a given file | 2026-11-09 · ~/.claude `f9e8904`; 16 rows match the JSON |
| R1 | **Phase 1 review** and its fixes: the diff from `main`, all screenshots from 1.2 and 1.3, the 1.4 result, the 1.5 table against the JSON. | Opus 5.5 High | Other family from most of the build | 2026-11-09 · 4 fixed (Fable 5 Max speed match, master header detail and arrow wrap, page height under 1024px); 1.5 table matches; browser check passes |
| O1 | *owner*: release with `git push origin speed-columns:main`, then open the master leaderboard on the live site at desktop and phone width. | — | — | 2026-11-09 · origin/main at 1cf72a6 |
