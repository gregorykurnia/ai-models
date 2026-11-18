# New evaluation: SWE-Atlas-QnA (AA)

Adds Artificial Analysis's (AA) SWE-Atlas-QnA scores as a leaderboard of their own and a master column, and writes
into `~/.claude/playbooks/plans-and-models.md` what it measures and which picks it should inform. Earlier plans:
[IMPLEMENTATION_PLAN-done.md](IMPLEMENTATION_PLAN-done.md) (GPT-6.2 Astra and Sol, live since 2026-11-18).

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
| O1 | *owner*: release with `git push origin swe-atlas-qna:main`, then say "publish the data" in a Claude session here (checks, `npm run publish:data`, Firestore read-back per `CLAUDE.md`). On the live site, open `/leaderboards/swe-atlas-qna-aa` and check the master column. | — | — | |
