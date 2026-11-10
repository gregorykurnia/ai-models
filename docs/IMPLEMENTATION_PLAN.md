# New models: Claude Fable 5.2 (five efforts) and Muse Ember (Max, Xhigh)

Adds seven Artificial Analysis (AA) model configurations to the master leaderboard and to every individual
evaluation where AA scores them, then updates the model tables in `~/.claude/playbooks/plans-and-models.md`.
Earlier plan: [IMPLEMENTATION_PLAN-done.md](IMPLEMENTATION_PLAN-done.md) (speed columns, live since 2026-11-09).

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
| 1.2 | **Coverage audit** [no look]. Write `docs/FABLE_5_2_MUSE_EMBER_COVERAGE.md`: one row per evaluation (all 20 in `data/leaderboards.json`), one column per model; each cell the stored value or "not on AA (captured <date>)", traced to its capture file. Add the Intelligence Index cost per task, Time per Task and First Answer per model (dash where AA has none). Use `aggregateMaster` on the merged local data (as in `src/lib/data.ts`) to confirm each model is exactly one master row. Read: `docs/CLAUDE_HAIKU_5_5_COVERAGE_AUDIT.md` for the layout. **Done when** every cell is filled and spot-checks of five cells match the capture JSON; any duplicate or misnamed row goes back into the importer with a test. | Sonnet 5.5 High | Completeness is the job (Rubric 12) | |
| 1.3 | **Browser check** [look]. Production build (`next build`; webpack if Turbopack hits the sandbox port limit, as on 7 Nov), `next start`, run `scripts/check-master-browser.mjs`, stop the server by its PID. Screenshots to `docs/screenshots/new-models-nov/`. **Done when** the check passes and shots show: the master table at 1440px searched for "Fable 5.2" with five rows and "Muse Ember" with two, long names wrapping inside the frozen Model column with no overlap; the same searches at 390px as cards with their scores; Intelligence Index and one evaluation page where AA scores them (e.g. Terminal-Bench 4.0) listing them at the right rank. | Sol xHigh | A pass/fail script plus shots | |
| 1.4 | **Global model tables** [no look]. Redo every rank in both tables of `~/.claude/playbooks/plans-and-models.md` from the new data (method: `aggregateMaster`, `cells[evalId].entry.source_rank`; row names like `Claude Opus 5.5 (Adaptive Reasoning, High Effort, Default Fallback)`, `GPT-6.1 Sol (Max)`), update the "out of N models" counts and capture date, and recheck the prose figures. Add a **Fable 5.2** note next to the Fable 5.1 one: cost and ranks per effort against Opus 5.5 High and xHigh. A 2026-11-10 test capture put Fable 5.2 Low and Medium above Opus 5.5 High on Strategy & Ops, Finance and Omniscience (about 63 against 42) for about the same AA cost, and below it on AA-Briefcase and GDPval. So the note also weighs Fable 5.2 Low and Medium for the steps in "Analysis work" (framing, strategy and finance analysis, final recommendation, red-teaming), using the Briefcase Presentation, Rubric and Analytical Elo ranks too. It also notes that the owner sees Fable draw down the weekly and 5-hour limits faster than Opus. Commit and push in the `~/.claude` repo. Read: that file's "Model choice for coding implementation", "Analysis work" and "GPT models (Codex)" sections only. **Done when** every cell traces to the new data, and the final message lists any pick the new numbers would change. | Opus 5.5 High | Model-choice notes every future pick reads; writes outside this repo | |
| R1 | **Phase 1 review** and its fixes: the diff from `main`, the 1.2 audit against the captures, the 1.3 shots, the 1.4 tables. | Opus 5.5 High | Other family from most of the build | |
| O1 | *owner*: release with `git push origin fable-5-2-muse-ember:main`, then in a Claude session in this folder say "publish the data" (checks, `npm run publish:data`, Firestore read-back per `CLAUDE.md`). Open the live master and search "Fable 5.2" and "Muse Ember". | — | — | |
