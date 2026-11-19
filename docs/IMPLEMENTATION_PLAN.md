# Gemini 4 Neon (four efforts) and a new evaluation: AA-Omniscience Net Score, Business

Adds Google's Gemini 4 Neon at Low, Medium, High and Xhigh to the master leaderboard and to every evaluation where
Artificial Analysis (AA) scores it. Also adds AA-Omniscience's Business Net Score as a new evaluation with its own
leaderboard and a master column. Earlier plans: [IMPLEMENTATION_PLAN-done.md](IMPLEMENTATION_PLAN-done.md)
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
| 1.4 | **Neon coverage audit** [no look]. In `scripts/audit-new-models-coverage.ts`, add a `neon` set with the four efforts and their slugs ("What AA publishes"), the pattern `/neon/i` and the report `docs/GEMINI_4_NEON_COVERAGE.md`. Add the same set to `scripts/check-new-models-browser.mjs` (group "Neon", 4), with a fixture test like the existing sets. Leave the `hydrogen` and `gpt-6.2` sets and their docs as they are. Read: `docs/GEMINI_4_HYDROGEN_QWEN4_COVERAGE.md` for the layout. **Done when**:<br>• The report has one row per evaluation (all 20, Business included) and one column per Neon effort. Every cell holds a stored value or "not on AA (captured <date>)", plus the cost, Time per Task and First Answer table.<br>• The pattern check lists exactly the four Neon rows.<br>• Every Neon "not on AA" cell is checked against the live AA page, so an importer name mismatch can't hide as a gap. The commit lists each cell checked. If AA does list that effort, the importer gets a name rule and a test, and the cell is redone.<br>• Five spot-checks by hand match the capture JSON, covering every effort and the Business evaluation.<br>• Each effort's stored Intelligence Index matches AA's model page; each figure is named in the commit.<br>• The tests and `tsc` pass. | Sol xHigh | Adds a set to a built script whose own checks pass or fail: FrontierCode 11 | |
| 1.5 | **Browser check** [look]. Make a production build and run `next start` through the node `next` bin, stopping it by its PID (memory `next-start-pid`). Add `aa-omniscience-business` to the evaluations `scripts/check-evaluation-browser.mjs` covers. Run it, `scripts/check-master-browser.mjs` with the new-models pass on the `neon` set (confirm in its output that the pass ran), `scripts/check-workflows-browser.mjs` and `scripts/check-personality-browser.mjs`. Their expectations change only where 1.2–1.4 changed the data, each change named in the commit body. Shots go to `docs/screenshots/neon-omniscience-business/`. **Done when**:<br>• All four scripts pass.<br>• Shots at 1440px and 390px of `/leaderboards/aa-omniscience-business` show:<br>&nbsp;&nbsp;– as many rows as the capture;<br>&nbsp;&nbsp;– a negative score with its minus sign, if the data has one;<br>&nbsp;&nbsp;– the heading "AA-Omniscience Net Score: Business" wrapping inside the page at 390px;<br>&nbsp;&nbsp;– the longest model name readable at 390px;<br>&nbsp;&nbsp;– the notes.<br>• The page's source link opens AA on the "Net Score by Domain" tab.<br>• The master at 1440px, searched for "Neon", shows four rows with their names inside the frozen Model column. The "Omniscience Business" header sits right after "Omniscience Index" and fits.<br>• The same search at 390px shows four cards, each with its Omniscience Business score or a dash.<br>• Sorted by Omniscience Business in both directions, dashes come last and negative scores sit below positive ones.<br>• The leaderboards index lists the new evaluation, and its link opens it.<br>• In `/suitability`, a task that weights only Omniscience Business ranks the scored models, with a negative-score model below a positive one. Unscored models show as missing coverage, not 0, and the evaluation's name fits at 390px.<br>• Shots at 1440px of the meeting workflow overview and `/personality` show the picks and model count that 1.3 recorded.<br>• `/about/data` shows 20 evaluations and the new capture dates. | Sol High | Build, server, browser and shots: Terminal Bench 17 | |
| R1 | **Phase 1 review** of the diff from `db678a2`, the 1.4 report against the captures, both check docs and the 1.5 shots. Quick fixes only; the rest become fix rows under this one. **Done when**:<br>• Five Business rows not among 1.1's five are hovered on live AA and agree with the stored scores (one of them negative, if any are).<br>• Five Neon cells in the report match the captures.<br>• One workflow step whose pick moved is worked out by hand from the bundled data, and the page matches.<br>• Every FINDING is fixed or has a fix row.<br>• If a fix touched data or a page, 1.5's checks run again and pass. | Opus 5.5 High | The other family from the build (all GPT) | |
| O1 | *owner*: release with `git push origin neon-omniscience-business:main`. Then say "publish the data" in a Claude session in this folder, which runs the checks, `npm run publish:data` and the Firestore read-back per `CLAUDE.md` (20 evaluations now). Publish straight after the release: in between, the live site shows the old Firestore data without the new evaluation, as it did between the SWE-Atlas-QnA release and its publish on 2026-11-18. On the live site, open `/leaderboards/aa-omniscience-business` and search the master for "Neon". | — | — | |
