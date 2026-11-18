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
