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
| 1.3 | **Browser check** [look]. Point `scripts/check-new-models-browser.mjs` at the new groups (`Gemini 4 Hydrogen` ×4, `Gemini 4 Argon` ×2 now that High and Medium both exist, `Qwen4` ×1; expected count 7 in the bundled Intelligence Index, or fewer only where 1.2 shows AA has no index score). Production build (`next build`; webpack if Turbopack hits the sandbox port limit), `next start` via the node `next` bin so killing `$!` frees the port, run `scripts/check-master-browser.mjs` (it calls the new-models pass in `check-new-models-browser.mjs`; confirm that pass ran in its output), stop the server by its PID. Extend the new-models pass to open every evaluation page where the bundled data has one of the six and assert the row is there. Screenshots to `docs/screenshots/new-models-hydrogen/`. **Done when**: the check passes; shots show the master table at 1440px searched for "Hydrogen" (four rows), "Argon" (two) and "Qwen4" (one), names inside the frozen Model column with no overlap; the same searches at 390px as cards with their scores; whether "Qwen 4" (with a space) finds Qwen4 Max is written in the commit body; the scripted per-evaluation check passes on every evaluation the audit lists for them; shots of Intelligence Index and one evaluation (e.g. Terminal-Bench 4.0) at 1440px and 390px show them at the rank the audit gives, with cost, Time per Task and First Answer cells filled or a dash; a shot of `/about/data` shows the new capture date. | Sol Max | A pass/fail script plus shots | |
| 1.4 | **Global model tables** [no look]. In `~/.claude/playbooks/plans-and-models.md`: redo every rank in the Claude, GPT and free-model tables from the new data (method: `aggregateMaster`, `cells[evalId].entry.source_rank`; row names like `Claude Opus 5.5 (Adaptive Reasoning, High Effort, Default Fallback)`, `GPT-6.1 Sol (Max)`), update the "out of N models" counts and capture dates, and recheck the prose figures; save the script output the ranks came from to `docs/model-table-ranks-<capture date>.md` in this repo so R1 can compare cell by cell. Grep `~/.claude/playbooks/new-app.md` and `blank-slate-redesign.md` for rank figures and update any that moved. Add a section **"Gemini 4 Hydrogen: compare only (owner, 2026-11-16)"** after "Free models: backup only", with the same columns as that table: one row per Hydrogen effort, plus *Opus 5.5 High (compare)* and *Sol Max (compare)* rows; two or three bullets on where Hydrogen beats or trails those two, and one line that it is never a pick in a plan, an autorun row, a retry or a review (autorun can't run it). Commit and push in the `~/.claude` repo. Read: that file's "Model choice for coding implementation", "Analysis work", "GPT models (Codex)" and "Free models: backup only" sections only. **Done when**: every cell matches the saved rank output; the Hydrogen table has four rows (a dash where AA has no score); the final message lists any pick the new numbers would change. | Opus 5.5 High | Model notes every future pick reads; writes outside this repo | |
| R1 | **Phase 1 review**: the diff from `main`, the 1.2 audit against the captures, the 1.3 shots, the 1.4 tables against `docs/model-table-ranks-<date>.md` (if a fix changes the import, redo the affected playbook cells and push `~/.claude` again). Quick fixes only; the rest become fix rows under this one. | Opus 5.5 High | Other family from most of the build | |
| O1 | *owner*: release with `git push origin gemini-4-hydrogen-qwen4:main`, then in a Claude session in this folder say "publish the data" (checks, `npm run publish:data`, Firestore read-back per `CLAUDE.md`). Open the live master and search "Hydrogen", "Argon" and "Qwen4". | — | — | |
