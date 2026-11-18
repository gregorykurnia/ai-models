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

## What AA publishes (checked 2026-11-18)

- **No evaluation page of its own.** `/evaluations/swe-atlas-qna` is a 404, and the 40-page `/evaluations` list
  doesn't include it. It appears only on the **Coding Agent Index** page (`https://artificialanalysis.ai/agents/coding`)
  as one of the index's three equally weighted parts (with FrontierCode and Terminal-Bench 4.0).
- **What it measures:** 124 technical Q&A tasks built by Scale AI, with grading adjusted by AA: read a real
  codebase, trace its behaviour, give a correct technical answer. Each answer is pass or fail. Grading data:
  `huggingface.co/datasets/ArtificialAnalysis/SWE-Atlas-QnA-AA`.
- **Rows are agent setups, not models:** an agent (Claude Code, Codex, Gemini CLI, Cursor, …) running a model at a
  setting, about 39 in all ("15 of 39 models" selector), mostly at max effort. The playbook already notes that no
  Claude row under the High cap and no GPT-6.2 row is measured yet.
- The page's charts load from script, so a plain fetch shows no scores. The capture has to read them in Playwright,
  the way the Briefcase tabs are read (React props behind the chart, every variant selected).

## Decisions (defaults, so no task stops to ask)

- **Import only first-party agent setups that map to exactly one master row.** That covers each maker's own agent
  running its own model: Claude Code + Claude, Codex + GPT, Gemini CLI + Gemini, and so on. Such a row is stored
  under that model row's exact name, so it joins the master row. Third-party agents (Cursor, Devin, …) and setups
  with no matching row are left out. They would otherwise create agent-named master rows next to the model rows.
  1.1 lists what's left out, and the evaluation's notes say "N of M AA agent setups; first-party agents only".
- **A setup maps only when AA names its model and effort** and a master row with that model and effort exists. No two
  setups may map to one master row. A setup with no stated effort, or an effort with no master row, is left out.
- **Ranks are among the imported rows:** rank 1 is the highest pass rate, and equal scores share a rank. They are not
  AA's ranks among every setup. The notes say so.
- **Not in the master's average rank.** `aggregateDimensionIds` in `src/lib/master.ts` stays as it is, so every existing
  master cell, average and order is unchanged. Saved tasks weight evaluations by id, so they aren't touched.
- **Names:** id and slug `swe-atlas-qna-aa`; display name "SWE-Atlas-QnA"; master label "SWE-Atlas QnA"; metric:
  pass rate in percent (`percentageEvaluation`); master column right after FrontierCode 2.0. Source link:
  `https://artificialanalysis.ai/agents/coding` (no slug-built AA link). Timing: none (`null` in
  `src/lib/model-speed.ts`). No cost per task: the page's cost figures are for the whole index.
- **Coding Agent Index itself stays out** (not asked); it goes in the final message as a follow-up.
- **No recapture of the other pages.** This plan captures only the Coding Agent Index page and imports it alongside the
  18 Nov captures. The next normal AA refresh picks the new target up.
- **If the scores can't be read per setup** (only the index total on the page, nothing usable on Hugging Face), 1.1
  writes in its doc what it tried (each props path, the page's network JSON, each Hugging Face file) and what each held, and 1.2 to 1.4 are ticked "not possible: see `docs/SWE_ATLAS_QNA_CAPTURE.md`".
- **Playbook:** no pick changes without the owner's word; 1.4 lists any pick the scores would suggest. Its scores are
  AA's, so they hold whether or not O1 has happened. They carry their capture date, and R1 rechecks them.

## Before the run

- [x] Branch `swe-atlas-qna` pushed with upstream.

## Phase 1: build and release

| # | Task | Pick | Why | Done |
|---|---|---|---|---|
| 1.1 | **Capture and inventory** [no look]. Add a `swe-atlas-qna-aa` target to `scripts/capture-aa-evaluations.mjs` for `https://artificialanalysis.ai/agents/coding`. Read the per-setup SWE-Atlas-QnA score from the chart data behind the Performance breakdown, with every setup selected. Name in the doc the series key read, so it's clearly not the index total or the FrontierCode or Terminal-Bench part. It passes the same completeness check as the other pages ("M of M" selected, item count M) and throws otherwise. Add a `--only <key>` flag so this run captures just this page into `data/aa-captures/swe-atlas-qna-aa.json`. Write `docs/SWE_ATLAS_QNA_CAPTURE.md`: each AA setup with its score, the master row it maps to by Decisions above (exact name) or "left out" with the reason. Read: "What AA publishes" and Decisions above; "Capture" in `docs/DATA_DICTIONARY.md`. **Done when**: the capture holds every setup the selector counts; the doc has one row per setup; the scores of three named setups (Claude Code + Opus 5.5 Max included) match what AA's live page shows for SWE-Atlas-QnA, read in the browser; every first-party setup that has a matching master row is mapped, each left-out one gives its reason, and no master row gets two setups; a forced "Select all" failure throws naming the page; a full capture run without `--only` into a temp folder (`cd` into an empty folder) passes. | Sol Max | New scrape that feeds a leaderboard: Terminal Bench 9, FrontierCode 9 | |
| 1.2 | **Import, master column, ranks** [no look]. In `scripts/import-aa-evaluations.ts`, add the config: the mapped rows only, under their master names, re-ranked 1..N, with notes per Decisions. In `src/lib/master.ts`, add the column after `frontiercode-2-0` with label "SWE-Atlas QnA". Add `null` timing in `src/lib/model-speed.ts`. Add "SWE-Atlas QnA" to `scripts/model-table-ranks.ts` and write `docs/model-table-ranks-2026-11-18.md` again with it. The importer throws if a mapped name has no master row, so a renamed setup fails instead of dropping out quietly. Run `import:aa-evaluations`. Extend `tests/aa-evaluations-import.test.ts`: the evaluation exists and has only mapped names; rank 1 holds the highest pass rate and equal scores share a rank; scores are percents (Claude Opus 5.5 Max matches the 1.1 doc, not a 0–1 fraction); third-party setups are absent from master rows; every master row's other cells and average rank equal those built without it. Update the evaluation count and capture text in `src/app/about/data/page.tsx` and `docs/DATA_DICTIONARY.md`. **Done when**: `validate-master.ts`, the rubric, suitability, model-speed and import tests, and `tsc` pass; a second import changes no file; the master row count is unchanged (no agent-named rows); every other evaluation's row count is unchanged; the source link is `/agents/coding`. | Sol Max | Data import that can corrupt every leaderboard | |
| 1.3 | **Browser check** [look]. Production build, `next start` through the node `next` bin, stopped by its PID (memory `next-start-pid`). Add `swe-atlas-qna-aa` to the evaluations `scripts/check-evaluation-browser.mjs` covers, and run it and `scripts/check-master-browser.mjs`. Shots go to `docs/screenshots/swe-atlas-qna/`. **Done when**: both scripts pass; shots at 1440px and 390px of `/leaderboards/swe-atlas-qna-aa` show N rows, with model names, percent scores and ranks readable and the notes line visible; master shots at 1440px and 390px show the "SWE-Atlas QnA" header right after FrontierCode 2.0 (header fitting, the name column still pinned at 390px), a rank in the Claude Opus 5.5 Max row and a dash (not 0 or blank) in a row AA doesn't score, and sorted by that column the dashes come last; the leaderboards index lists SWE-Atlas-QnA and its link opens the page; in `/suitability`, a task weighting only SWE-Atlas-QnA shows the scored models ranked and the unscored ones as missing coverage, not 0; `/about/data` shows the new count. | Sol High | Build, server, browser and shots: Terminal Bench 17 for $0.56 | |
| 1.4 | **Playbook** [no look] [skills]. In `~/.claude/playbooks/plans-and-models.md`, "Model choice for coding implementation", turn "What the two coding benchmarks measure" into three and add SWE-Atlas-QnA. Say what it measures (see "What AA publishes"). Say what it's best for: **reading and explaining an existing codebase without changing it** (tracing a flow, answering "how does X work", the code-reading part of a review or a plan). Say where it should count: the `tracer` and `finder` subagent rows and the code-explorer mapping under "Subagents inside a session", and the read-the-code step before a plan or review. Then give its limits: it scores the agent at max effort only, so it can't rank efforts under the cap, and it has no GPT-6.2 row yet. Cite only Haiku 5.5 Max's score and rank (the `tracer` pick), with "AA capture of 2026-11-18". Add no table column while only Max rows exist. Commit and push in `~/.claude` (branch `main`, only that file). **Done when**: the bullet names the three uses above and both limits; every score it cites matches `data/leaderboards.json`; the final message lists any pick the scores would change (for example `tracer`) and changes none. | Opus 5.5 High | Judgment prose in a file every session reads; a Claude pick avoids Codex's sandbox refusing writes to `~/.claude` | |
| R1 | **Phase 1 review**: the diff from `main`, the 1.1 doc against the capture, the 1.3 shots, and the 1.4 bullet against the data. Quick fixes only; the rest become fix rows under this one. **Done when**: five mapped rows are rechecked on live AA and agree; no third-party setup appears on master; the playbook score matches; every FINDING is fixed or has a fix row; if a fix touched data or a page, 1.3's checks run again and pass. | Opus 5.5 High | Other family from most of the build | |
| O1 | *owner*: release with `git push origin swe-atlas-qna:main`, then say "publish the data" in a Claude session here (checks, `npm run publish:data`, Firestore read-back per `CLAUDE.md`). On the live site, open `/leaderboards/swe-atlas-qna-aa` and check the master column. | — | — | |
