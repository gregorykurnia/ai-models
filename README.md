# Model Benchmarks

Read-only Artificial Analysis leaderboard browser, using the Utility grid design direction. The initial workbook capture is 29 September 2026.

## Local development

Requires Node.js 20.9 or later. Install dependencies with `npm install`.

```sh
npm run import:workbook -- '/path/to/Benchmark Leaderboards Sept 29 2026 (4).xlsx'
npm run dev
```

Open http://localhost:3000. Local mode reads the validated JSON produced by the importer. Without imported data the app starts with an empty catalog. No credentials are required in local mode.

`npm run build` creates the production build; `npm start` serves it.

## Deployed environment

The app is linked to the Vercel environment at [ai-models-nine-livid.vercel.app](https://ai-models-nine-livid.vercel.app/). Task Suitability saves use a shared database, so saved tasks appear across browsers and devices without signing in.

## Trusted Firestore import

Project: `ai-models-72d27`. The default database is confirmed as Firestore Native mode in `asia-southeast1` (Singapore).

Provide Application Default Credentials through `GOOGLE_APPLICATION_CREDENTIALS`, pointing to a service account JSON outside the repository, or your environment's managed identity. Never commit credentials.

```sh
FIREBASE_PROJECT_ID=ai-models-72d27 npm run import:workbook -- '/path/to/snapshot.xlsx' --publish
```

For future snapshots specify `CAPTURED_AT=YYYY-MM-DD`. The initial capture defaults to `2026-09-29`.

After successful publishing, set `DATA_SOURCE=firestore` and `FIREBASE_PROJECT_ID=ai-models-72d27` in `.env.local`. Server reads use the Admin SDK and credentials. There is no client write path or admin upload screen.

The publisher uses deterministic IDs for snapshots and entries. Already published snapshots are skipped on re-import. Entries are staged before all evaluation pointers are published in one transaction; a failed staging operation leaves existing published pointers intact. Publication rejects a capture older than the currently visible snapshot. Concurrent staging of the same workbook requires operator coordination.

`firestore.rules` permits anonymous reads of published evaluations and snapshots, denies client writes, and keeps ingestion logs private. Suitability tasks are written by a server route with the Admin SDK to a shared collection. These rules are configuration only until explicitly deployed. No deployment is performed by the importer.

## Data contract

See [docs/DATA_DICTIONARY.md](docs/DATA_DICTIONARY.md). The importer and publisher live in `scripts/`; the application reads through `src/lib/data.ts`. Source workbooks remain outside this repository. Generated local data and the validation report are under `data/`.

The catalog includes Intelligence Index through a dedicated adapter. Its 670 rows retain scoring status (including estimates); providers use exact, unambiguous model matches in standard sheets, otherwise Unknown. The first rank cell “Int” is restored to 1 and recorded in the report. The workbook rows have no Intelligence Index task cost, so the app captures those metrics separately from public [Artificial Analysis model profiles](https://artificialanalysis.ai/models/) in `data/intelligence-index-costs.json`. The master and individual leaderboard cost columns use that metric and link to its source profile; the 30 Sep 2026 capture records 173 costs across 686 listed models, with unavailable values shown as a dash. Refresh the snapshot with `npm run import:aa-index-costs`. SciCode counts are computed from ranked rows, replacing the inaccurate workbook summary count. Every source model variant remains distinct.

AA-Briefcase v1.1 Rubric Score, Analytical Quality Elo, and Presentation Elo are captured separately in `data/aa-briefcase-components.json`, with all 208 source models. `npm run import:briefcase-components` merges these indexes into the local dataset. Workbook imports add the same captured supplement automatically. Firestore mode reads these three indexes from the bundled snapshot until they have published Firestore snapshots. Add `-- --publish` to either import command to publish the combined dataset to Firestore.

## Implementation scope

Implementation covers the application shell, workbook importer, evaluation catalog, data definitions, reusable leaderboards, and the Task Suitability Planner with shared database saves. Automated refresh remains a later phase. Production launch is outside the product plan's initial implementation scope.

## Task suitability planner beta

Open `/suitability` to describe a task, select evaluations and weights, and compare model variants. Saved tasks reopen at `/suitability/[taskId]` across browsers and devices. Weights must total 100%; missing ranks are excluded and coverage stays visible. The primary suitability score normalizes source ranks, while weighted average source rank provides a secondary comparison.

Saved tasks are shared with everyone who visits the site, and visitors can change them. Existing browser-saved tasks stay local until you choose “Add browser-saved tasks to shared list.” Firestore stores each shared task and its full pinned source cohorts, so later imports cannot silently change saved results. Configure `FIREBASE_SERVICE_ACCOUNT_JSON` and `FIREBASE_PROJECT_ID` in Vercel for the server route. Source links open current leaderboards, which may differ from pinned results. See [the methodology](docs/TASK_SUITABILITY_METHODOLOGY.md).

`npm run audit:suitability` verifies the imported snapshot and runs a full-catalog score, identity, source-link, and coverage audit. [Review its findings](docs/TASK_SUITABILITY_DATA_AUDIT.md). Known alternate sheet labels match the same variant; source IDs remain intact. Earlier saved tasks retain their original matching. Planner event counters stay in the browser and are not sent to an analytics service.

Run planner fixtures with `npx tsx --test tests/suitability*.test.ts`. With the dev server on port 3180, run `node scripts/check-suitability-browser.mjs` using an installed Playwright module (or set `PLAYWRIGHT_MODULE` to its absolute module path).

Repository setup, branch protection, and pushes require a known Git repository and configured upstream. This directory initially had no `.git` directory.
