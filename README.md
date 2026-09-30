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

The app is linked to the Vercel environment at [ai-models-nine-livid.vercel.app](https://ai-models-nine-livid.vercel.app/). Task Suitability saves are still browser-local; opening this URL from another device or browser does not sync them.

## Trusted Firestore import

Project: `ai-comparison-6b522`. The default database is confirmed as Firestore Native mode in `asia-southeast1` (Singapore).

Provide Application Default Credentials through `GOOGLE_APPLICATION_CREDENTIALS`, pointing to a service account JSON outside the repository, or your environment's managed identity. Never commit credentials.

```sh
FIREBASE_PROJECT_ID=ai-comparison-6b522 npm run import:workbook -- '/path/to/snapshot.xlsx' --publish
```

For future snapshots specify `CAPTURED_AT=YYYY-MM-DD`. The initial capture defaults to `2026-09-29`.

After successful publishing, set `DATA_SOURCE=firestore` and `FIREBASE_PROJECT_ID=ai-comparison-6b522` in `.env.local`. Server reads use the Admin SDK and credentials. There is no client write path or admin upload screen.

The publisher uses deterministic IDs for snapshots and entries. Already published snapshots are skipped on re-import. Entries are staged before all evaluation pointers are published in one transaction; a failed staging operation leaves existing published pointers intact. Publication rejects a capture older than the currently visible snapshot. Concurrent staging of the same workbook requires operator coordination.

`firestore.rules` permits anonymous reads of published evaluations and snapshots, denies client writes, and keeps ingestion logs private. These files are configuration only until explicitly deployed. No deployment is performed by the importer.

## Data contract

See [docs/DATA_DICTIONARY.md](docs/DATA_DICTIONARY.md). The importer and publisher live in `scripts/`; the application reads through `src/lib/data.ts`. Source workbooks remain outside this repository. Generated local data and the validation report are under `data/`.

The catalog includes Intelligence Index through a dedicated adapter. Its 670 rows retain scoring status (including estimates); providers use exact, unambiguous model matches in standard sheets, otherwise Unknown. The first rank cell “Int” is restored to 1 and recorded in the report. Source URL and costs remain absent. SciCode counts are computed from ranked rows, replacing the inaccurate workbook summary count. Every source model variant remains distinct.

## Implementation scope

Implementation covers the application shell, workbook importer, evaluation catalog, data definitions, reusable leaderboards, and the local Task Suitability Planner beta. Automated refresh and account-backed saves remain later phases. Production launch is outside the product plan's initial implementation scope.

## Task suitability planner beta

Open `/suitability` to describe a task, select evaluations and weights, and compare any number of exact model variants. Saved tasks reopen at `/suitability/[taskId]` in the same browser. Weights must total 100%; missing ranks are excluded and coverage stays visible. The primary suitability score normalizes source ranks, while weighted average source rank provides a secondary comparison.

Browser storage preserves the configuration and full pinned source cohorts, so later imports cannot silently change saved results. No benchmark writes or account setup are required. Storage failures are shown explicitly; saves are limited by the browser's storage capacity. Source links open current leaderboards, which may differ from pinned results. See [the methodology](docs/TASK_SUITABILITY_METHODOLOGY.md).

`npm run audit:suitability` verifies the imported snapshot and runs a full-catalog score, identity, source-link, and coverage audit. [Review its findings](docs/TASK_SUITABILITY_DATA_AUDIT.md). Known alternate sheet labels match the same variant; source IDs remain intact. Earlier saved tasks retain their original matching. Planner event counters stay in the browser and are not sent to an analytics service.

Run planner fixtures with `npx tsx --test tests/suitability*.test.ts`. With the dev server on port 3180, run `node scripts/check-suitability-browser.mjs` using an installed Playwright module (or set `PLAYWRIGHT_MODULE` to its absolute module path).

Repository setup, branch protection, and pushes require a known Git repository and configured upstream. This directory initially had no `.git` directory.
