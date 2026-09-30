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

The catalog excludes Intelligence Index pending provenance and provider mapping. SciCode counts are computed from ranked rows, replacing the inaccurate workbook summary count. Every source model variant remains distinct.

## Implementation scope

Initial implementation covers the application shell, workbook importer, evaluation catalog, data definitions, and reusable leaderboard. Model comparison and automated refresh are later phases. Production launch is outside the product plan's initial implementation scope.

Repository setup, branch protection, and pushes require a known Git repository and configured upstream. This directory initially had no `.git` directory.
