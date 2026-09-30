# Implementation status

30 September 2026

| Phase | Completed locally | Outstanding |
| --- | --- | --- |
| 0: Setup | Next.js / TypeScript shell, local instructions, data dictionary, Firestore project and Singapore region confirmed, read-only rules prepared; Git initialized on main with the owner-specified GitHub remote | Branch protection; security rules not deployed |
| 1: Import | Workbook parser, deterministic source/snapshot/entry identities, validation report, local dataset, trusted publisher | Trusted credentials and Firestore publication |
| 2: Catalog | Master leaderboard first on the home page, followed by compact links to all 16 evaluation pages; source and coverage details remain on individual pages | Switch app to database reads after publication |
| 3: Leaderboards | Adaptive columns, source order, provider filter, model search, numeric sorting, pagination, shareable URL parameters, empty state, horizontally scrollable table | Browser interaction and accessibility review |
| 4: Models and comparison | Schema preserves exact provider/model variants for later views | Planned later product expansion |
| 5: Refresh and history | Immutable snapshot publisher and new-workbook CLI; source hashes and ingestion logs | History selector, diff view, automated refresh and alerts |
| 6: Launch | None | Outside the initial implementation scope in the product plan |

## Executed checks

The importer completed against `Benchmark Leaderboards Sept 29 2026 (4).xlsx`, reconciling 17 sheets, 15 standard evaluations, 4,948 entries, 66 provider labels, 739 distinct raw model labels, 3,239 cost labels, and 2,858 precise costs. The report records the SciCode summary discrepancy and the Intelligence Index rank correction and missing metadata. The dedicated adapter adds 670 rows, for 5,618 total entries, and preserves estimate labels.

The optimized Next.js build and TypeScript compilation passed. The development server starts at http://localhost:3000 using imported local data.

## External blockers

The initial directory had no Git repository. The owner subsequently supplied `https://github.com/gregorykurnia/ai-models`, and Git was initialized on `main` with that remote. The earlier Git setup blocker is resolved. Branch protection remains to be configured.

Application Default Credentials are not configured for the Admin SDK. The Firebase CLI can inspect the selected database, but its existing login does not automatically configure credentials for the trusted Node importer. No data or rules have been published to Firestore.

## Master leaderboard correction — 30 September 2026

The master table now shows original source ranks in every evaluation column. The normalized-score policy, mean, coverage score, and dynamic overall position have been removed. Known differences in evaluation sheet labels map to the same model and variant, while effort and fallback variants stay separate. “Not ranked” appears only when no matching entry exists. The corrected requirements are in `MASTER_LEADERBOARD_ROLLOUT_PLAN.md`.
