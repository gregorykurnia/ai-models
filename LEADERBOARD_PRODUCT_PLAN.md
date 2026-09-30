# Artificial Analysis Leaderboards

## Product plan

**Status:** Planning only. This document defines the first build and rollout; it does not launch or deploy the app.

**Source snapshot:** `Benchmark Leaderboards Sept 29 2026 (4).xlsx`, captured 29 Sep 2026.

## 1. Product definition

Build a read-only web app for browsing Artificial Analysis evaluation leaderboards. A visitor should be able to choose an evaluation, see the source ranking in a fast table, filter models by provider, search model names, and sort the available columns.

The first release should make the workbook easy to browse and establish a clean data foundation for future model pages. It should preserve the source ranking and display labels exactly where precision or missing values matter. It should not invent an overall model score across evaluations.

### First-release outcome

- A catalog of the 15 consistently structured leaderboard tabs in the workbook.
- A reusable leaderboard page for every catalog entry.
- Provider filtering, model search, column sorting, pagination, and shareable URL state.
- Source URL, capture date, metric name, row count, and data coverage shown on every leaderboard.
- Raw score and cost labels preserved alongside sortable numeric values.
- A database-backed schema that can accept future snapshots and model-level detail.

The `Intelligence Index` tab should be treated as a separate ingestion adapter. It has 669 ranked rows after a header-like first row, but it has no provider column, no source metadata, and no standard table header. It can be added after its provenance and provider mapping are resolved.

## 2. Workbook audit

The workbook contains 17 sheets:

- `Start Here`: a summary table and source notes.
- 15 standard leaderboard tabs with a rank, provider, model, metric, and cost shape.
- `Intelligence Index`: an independently scored list with a different shape.

Parsing the numeric rank rows from the 15 standard tabs yields 4,948 leaderboard entries, 66 provider labels, and 739 distinct raw model labels. The workbook summary says 4,772 rows because its `SciCode` count is 31 while the current `SciCode` tab contains 207 ranked rows. The importer should calculate counts from parsed rows and regenerate the summary rather than treating `Start Here` as the source of truth.

| Evaluation | Metric shown in workbook | Ranked rows | Cost labels | Precise USD values |
| --- | --- | ---: | ---: | ---: |
| Briefcase v1.1 | Elo | 202 | 176 | 176 |
| GDPval-AA v2.1 | Elo | 261 | 207 | 207 |
| AutomationBench-AA | Score (%) | 198 | 175 | 175 |
| Terminal-Bench 4.0 | Score (%) | 194 | 173 | 173 |
| SciCode | Score (%) | 207 | 30 | 30 |
| Humanity's Last Exam | Score (%) | 642 | 30 | 30 |
| GDP.pdf | All-pass rate (%) | 190 | 173 | 173 |
| CritPt | Score (%) | 557 | 399 | 399 |
| AA-Omniscience Accuracy | Accuracy (%) | 554 | 399 | 228 |
| AA-LCR v1.1 | Score (%) | 553 | 368 | 368 |
| MMMU-Pro | Score (%) | 279 | 224 | 185 |
| Finance & Accounting Index | Index Score | 181 | 167 | 167 |
| Economics Index | Index Score | 195 | 176 | 176 |
| Strategy & Ops Index | Index Score | 181 | 143 | 143 |
| AA-Omniscience Index | AA-Omniscience Index | 554 | 399 | 228 |

Across these tabs there are 3,239 displayed cost labels and 2,858 precise numeric USD values. Some source labels such as `<0.1¢` have no precise numeric value. The app must preserve that label, store the numeric value as null, and avoid estimating a cost.

Two tabs add fields that are not present in the others:

- `Briefcase v1.1` and `GDPval-AA v2.1` include `Elo CI` and `Release Date`.
- The percentage and index tabs use different score units. For example, `AA-Omniscience Accuracy` is a percent-correct metric, while `AA-Omniscience Index` is a signed index from -100 to 100. They must remain separate evaluations even though their source URL is the same.

## 3. Users and jobs to support

### Primary users

- People comparing current model performance across benchmarks.
- Developers choosing a model for a task and checking the cost/performance tradeoff.
- Researchers who need the source rank, metric definition, and capture date without manually opening a spreadsheet.

### Core jobs

1. Find a benchmark or capability index.
2. Scan the highest-ranked models.
3. Narrow the list to one or more providers such as OpenAI, Anthropic, Google, or DeepSeek.
4. Search for a model family or exact model variant.
5. Sort by rank, score, provider, model, cost, or release date when that field exists.
6. Open a stable URL that preserves the selected evaluation and table state.
7. Later, open a model and compare its results across multiple evaluations.

## 4. Information architecture

### Initial routes

| Route | Purpose | First release |
| --- | --- | --- |
| `/` | Master leaderboard first, followed by compact links to individual evaluations | Yes |
| `/leaderboards/[evaluationSlug]` | Reusable ranking table for one evaluation | Yes |
| `/about/data` | Definitions, source notes, coverage rules, and update history | Yes, compact version |
| `/models/[modelSlug]` | One model across all evaluations | Later |
| `/compare` | Side-by-side model or provider comparison | Later |

### Home page and evaluation links

The home page should lead with the master leaderboard so visitors can compare model ranks across evaluations immediately. Place a compact evaluation catalog beneath it for opening individual leaderboards. Each catalog card should include:

- Evaluation name and category.
- Metric label and number of ranked rows.
- Link to the individual leaderboard.

Generate the catalog from database metadata so it stays current when a new snapshot is imported. Keep source, capture date, and coverage details on the individual leaderboard and data notes.

### Leaderboard page

Each page should use the same table shell with evaluation-specific metadata and columns. The top section should show:

- Evaluation title.
- Metric name and unit.
- `As of` date.
- Source link.
- Short note about missing or bounded cost values.
- Result count after filters.

The table should start with these columns:

1. Rank.
2. Provider.
3. Model.
4. Metric value using the evaluation's display format.
5. Confidence interval when supplied.
6. Release date when supplied.
7. Cost per task using the original source label, with precise USD used for sorting when available.

Columns that do not exist for an evaluation should be omitted instead of showing empty placeholder columns.

### Controls

- Provider filter: single-select first, multi-select when the data and layout support it.
- Model search: case-insensitive substring search over the display name, with later alias support.
- Sort: rank ascending by default; metric descending is the primary alternate sort. Provider, model, cost, release date, and confidence interval can be enabled when the field exists.
- Pagination: default 50 rows with 25, 50, 100, and 250 options.
- Clear filters action.
- URL query parameters for evaluation, provider, search, sort, direction, page, and page size.

Sorting needs deterministic tie handling. Use the selected column first, then source rank, then model label. The default view must preserve the source rank order, including source tie order.

## 5. Data model

Use Firestore Native mode in the Singapore database, with immutable snapshot documents so a model can appear in many evaluations and later have multiple attributes without overwriting past results.

### Core collections

#### `/sourceAssets/{sourceAssetId}`

- `id`
- `filename`
- `content_hash`
- `captured_at`
- `imported_at`
- `source_kind` such as `xlsx_snapshot` or `artificial_analysis_source`

#### `/evaluations/{evaluationId}`

- `id`
- `slug`
- `display_name`
- `source_title`
- `source_url`
- `category` such as `benchmark` or `capability_index`
- `metric_key`
- `metric_label`
- `score_kind` such as `elo`, `percentage`, `integer_score`, or `signed_index`
- `score_unit`
- `score_min` and `score_max` when known
- `captured_at`
- `source_asset_id`
- `notes`

#### `/providers/{providerId}`

- `id`
- `slug`
- `display_name`
- `aliases`

The first release can use the workbook's provider labels as display values. Provider normalization should be explicit and reviewable because a source label may change over time.

#### `/models/{modelId}`

- `id`
- `provider_id`
- `canonical_name`
- `display_name`
- `release_date_label`
- `aliases`
- `created_at`

Do not merge model variants such as different reasoning effort or fallback settings until a canonicalization rule exists. Preserve the exact source model label in every entry.

#### `/snapshots/{snapshotId}`

- `evaluation_id`
- `source_asset_id`
- `captured_at`
- `status` such as `validated`, `published`, or `rejected`
- `row_count`
- `cost_label_count`
- `precise_cost_count`

#### `/snapshots/{snapshotId}/entries/{entryId}`

- `id`
- `evaluation_id`
- `snapshot_id`
- `model_id`
- `provider_id`
- `source_rank`
- `score_value`
- `score_display`
- `confidence_interval_display`
- `confidence_interval_low_delta`
- `confidence_interval_high_delta`
- `cost_usd`
- `cost_display`
- `cost_status` such as `exact`, `bound`, or `missing`
- `source_sheet`
- `source_row`
- `source_asset_id`

`score_value` is used for sorting, while `score_display` preserves the workbook label. Percentage values should remain in their extracted numeric form and be formatted from evaluation metadata. `cost_usd` must remain nullable when the source only gives a bound or no value.

Use collection-group queries on `entries` for model detail pages. Add Firestore composite indexes when server-side filtering combines provider, score, cost, or release date. Keep published snapshots immutable; a new import creates a new snapshot and entries.

#### `/ingestionRuns/{runId}` and `/ingestionIssues/{issueId}`

Record when a snapshot was imported, how many rows were accepted, and any issues that need review. A failed or partial import must not replace the last valid snapshot.

### Import rules

1. Locate the row containing `Rank`, `Provider`, and `Model` instead of relying on a fixed row number.
2. Read rows with a numeric rank as leaderboard entries.
3. Derive evaluation metadata from the sheet title and the first four metadata rows.
4. Preserve the raw score and cost labels.
5. Parse numeric score and numeric USD columns only when the source supplies a precise value.
6. Treat blank provider/model/rank fields as ingestion issues.
7. Preserve source row and sheet references for audits.
8. Recompute row counts and cost coverage from accepted rows.
9. Give `Intelligence Index` its own adapter and keep it out of the standard catalog until provider and provenance fields are available.

## 6. Recommended stack

### Application

- Next.js App Router with React and TypeScript.
- Tailwind CSS for layout and visual tokens.
- TanStack Table for typed column definitions, sorting, filters, and pagination.
- Zod for validating importer input and query parameters.

The App Router supports file-system routing and server/client component boundaries, which fits a catalog plus dynamic leaderboard pages. TanStack Table lets each evaluation supply typed column definitions while sharing the same table behavior.

### Data

- Cloud Firestore Native mode in `asia-southeast1` (Singapore).
- Firebase Web SDK for browser reads and future authenticated client features.
- Firebase Admin SDK in a trusted server-side importer for workbook ingestion and publishing snapshots.
- `exceljs` in a Node/TypeScript importer for the initial workbook seed.

The database should be the read source for the web app after import. Keep the original workbook as an input artifact and store a content hash and ingestion record so later snapshots can be compared. Client writes should remain disabled; only the importer or an admin-only workflow should publish data.

### Hosting and operations later

- Vercel or Firebase App Hosting for the Next.js app; choose after the app shell exists.
- Firebase Authentication only if an admin import screen is needed.
- A scheduled worker, Cloud Function, or GitHub Actions job for future source refreshes.
- GitHub Actions or the chosen hosting scheduler for import validation and snapshot loading.

Do not add a live Artificial Analysis scraper in the first build. First establish a source adapter, legal/terms review, rate limits, and a snapshot validation process. The app should make the source URL and capture date visible so visitors can distinguish a workbook snapshot from a live feed.

Reference documentation for the proposed stack: [Next.js App Router](https://nextjs.org/docs/app), [TanStack Table column definitions](https://tanstack.com/table/latest/docs/guide/column-defs), [Firebase Firestore](https://firebase.google.com/docs/firestore), and [Firebase Web setup](https://firebase.google.com/docs/web/setup).

## 7. Rollout plan

### Phase 0 — Repository and product setup

**Deliverables**

- Git repository with a configured remote and protected main branch.
- Next.js TypeScript application shell.
- Local development instructions.
- Data dictionary based on this plan.
- Firebase project selection, Firestore region, and read/write security policy.

**Exit criteria**

- A clean local app can start without a database connection.
- The repo has a known branch and push target.
- The importer and app are treated as separate modules.

### Phase 1 — Workbook importer and data contract

**Deliverables**

- Import script that reads the 15 standard leaderboard tabs.
- Evaluation metadata records and normalized Firestore snapshot documents.
- Source asset and ingestion run records.
- Validation report with sheet count, row counts, rank sequences, provider counts, and cost coverage.
- Explicit issue record for the `SciCode` summary mismatch and the non-standard `Intelligence Index` tab.

**Exit criteria**

- All 4,948 standard leaderboard entries are imported from rank rows.
- Precise costs and bounded labels remain distinguishable.
- Re-running the same workbook does not create duplicate snapshot rows.
- An invalid import cannot replace the latest valid snapshot.

### Phase 2 — Evaluation catalog

**Deliverables**

- Home page listing all 15 standard evaluations.
- Cards or table rows with metric, as-of date, row count, and coverage.
- Links to the original source pages.
- Compact data definitions page.

**Exit criteria**

- Counts on the site come from the database, not hardcoded workbook summary cells.
- Users can reach every imported leaderboard within two clicks from the home page.

### Phase 3 — Reusable leaderboard page

**Deliverables**

- One route driven by evaluation metadata.
- Rank-preserving table with adaptive columns.
- Provider filter.
- Model search.
- Sortable columns.
- Pagination and URL-persisted state.
- Empty states for no results and missing optional fields.
- Source and capture metadata in the page header.

**Exit criteria**

- A user can answer “which Anthropic models rank highest on this evaluation?” without downloading the workbook.
- Sorting numeric scores and precise costs does not sort by formatted text.
- Bounded costs remain visible as their source label and do not become zero.
- The table remains usable on a narrow screen with horizontal scrolling or a deliberate responsive layout.

### Phase 4 — Model and comparison views

**Deliverables**

- Model detail page showing one model's entries across evaluations.
- Provider summary page with counts and top ranks by evaluation.
- Compare view for a small set of models.
- Optional score-versus-cost visualization where both values are precise.

**Exit criteria**

- Model variants remain distinguishable.
- Missing evaluation results are shown as missing, not as zero.
- Cross-evaluation views label each metric and unit clearly.

### Phase 5 — Snapshot history and refresh workflow

**Deliverables**

- Upload or job-based import of a new workbook snapshot.
- Diff view for rank, score, provider, and cost changes.
- Snapshot selector or “latest” policy.
- Ingestion logs and alerting for schema changes.
- Source adapter for any permitted Artificial Analysis refresh path.

**Exit criteria**

- A new snapshot can be validated before it becomes visible.
- Historical data is queryable without overwriting prior snapshots.
- Schema changes such as a renamed metric or new column create a review issue.

### Phase 6 — Production readiness and launch

**Deliverables**

- Accessibility review, responsive QA, query performance checks, error handling, and basic analytics.
- Firestore export and restore procedure.
- Source attribution and update policy.
- Deployment configuration, domain, and launch checklist.

**Exit criteria**

- The current snapshot is reproducible from its source asset and import configuration.
- Slow or failed queries return a useful state.
- The owner has reviewed source terms, update frequency, and the final launch copy.

This phase is intentionally outside the current request. No deployment or launch should happen during the planning and initial implementation work.

## 8. Initial acceptance criteria

The first usable release is complete when:

- The evaluation catalog lists all 15 standard leaderboard tabs.
- Each leaderboard displays the source rank, provider, model, metric value, and cost fields where present.
- Provider filtering works across all standard tabs.
- The user can sort by rank, score, provider, model, and precise cost where the column exists.
- Search and filters are reflected in the URL and survive refresh.
- The app shows the source URL and `29 Sep 2026` capture date.
- The app distinguishes percentage metrics, Elo, integer index scores, and the signed AA-Omniscience Index.
- Missing or bounded costs are displayed honestly and are never estimated.
- `Intelligence Index` is either clearly marked as pending normalization or imported through a documented special adapter.
- The workbook can be re-imported without silently changing source labels or creating duplicate rows.

## 9. Decisions to make before implementation

1. Confirm whether the `Intelligence Index` should be in the first public catalog after provider mapping, or remain in the data backlog.
2. Choose the trusted server-side import path: Firebase Admin SDK, Cloud Function, or GitHub Actions with a service identity.
3. Decide whether the site is public and anonymous at launch, or whether an admin-only import screen is needed.
4. Define the update cadence after the initial workbook snapshot.
5. Confirm the canonical model naming policy before adding cross-evaluation model pages.
