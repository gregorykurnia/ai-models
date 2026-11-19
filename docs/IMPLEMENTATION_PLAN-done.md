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
