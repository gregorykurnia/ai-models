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
| R1 | **Phase 1 review** and its fixes: the diff from `main`, all screenshots from 1.2 and 1.3, the 1.4 result, the 1.5 table against the JSON. | Opus 5.5 High | Other family from most of the build | |
| O1 | *owner*: release with `git push origin speed-columns:main`, then open the master leaderboard on the live site at desktop and phone width. | — | — | |
