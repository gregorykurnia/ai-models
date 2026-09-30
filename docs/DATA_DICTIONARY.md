# Leaderboard data dictionary

The schema is declared in `src/lib/contract.ts`. All nullable source values remain null when absent. Document IDs are deterministic SHA-256 based identifiers; evaluation IDs use sheet slugs.

| Collection | Identity and fields | Meaning |
| --- | --- | --- |
| sourceAssets | content hash, filename, captured_at, imported_at, source_kind | Original workbook provenance. SHA-256 covers the original input bytes. |
| evaluations | slug, display_name, source_title, source_url, category, metric_key, metric_label, score_kind, score_unit, score_min/max, captured_at, source_asset_id, notes | One distinct evaluation. `published_snapshot_id` points to its visible immutable snapshot. Row and coverage counts are copied from that validated snapshot for catalog reads. |
| providers | provider-label hash, slug, display_name, aliases | Exact source provider labels. No implicit normalization. |
| models | provider and model-label hash, provider_id, canonical_name, display_name, release_date_label, aliases, created_at | Provider plus exact model variant. Canonical name initially equals the source model label. |
| snapshots | evaluation and workbook hash, captured_at, status, row_count, cost_label_count, precise_cost_count | One capture per evaluation. Importing and validated snapshots stay hidden until published. |
| snapshots/{id}/entries | snapshot and source-row hash, evaluation_id, model_id, provider_id, source_rank, score_value/display, confidence interval, release label, cost_usd/display/status, source_sheet/row/asset | Immutable source result. Source row is the one-based Excel row. Provider and model labels are denormalized for display. |
| ingestionRuns | run ID, source_asset_id, started_at, completed_at, status, accepted_rows, error | Trusted publishing run and failure reason. |
| ingestionIssues | run_id, sheet, message, severity | Reviewable source anomalies and normalization backlog. |

## Numeric semantics

## Master comparison policy v1 (beta)

`src/lib/master.ts` declares Zod scoring and row contracts. Configuration is explicit by score kind, with source metadata bounds and higher-is-better direction. Percentages and bounded indices normalize as `100 * (score - min) / (max - min)`; percentages therefore retain their values. Signed indices map -100 to 0 and 100 to 100. Elo, unsupported kinds, absent/invalid bounds, out-of-range scores, and estimates are excluded with reasons. Intelligence Index remains visible, including status and Unknown providers, but has no approved source bounds. No empirical scale is invented.

`mean_normalized_score` is the arithmetic mean of included values, or null if none; `mean_coverage` counts contributing evaluations. Missing values never become zero. Equal weights and different coverage limit comparisons; fewer than three dimensions generates a low-coverage warning. Estimates can contribute only when configuration explicitly permits them.

Master rows retain `model_id`, exact provider/model labels, selected per-evaluation entries, source ranks/rows, and every contributing/discarded source entry. Duplicate selection uses ascending source rank, source row, then entry ID and emits an issue. Source links use evaluation slugs and encoded exact model queries. Source rank is immutable; displayed master rank is the position after filtering and sorting, including pagination offset. Null normalized scores sort last in both directions. Ties use best source rank, exact model, provider, then model ID. Local JSON and Firestore use the same aggregation after loading published evaluations.

Home URL keys `mq`, `mp`, `ms`, `md`, `mi`, and `mz` store search, provider, sort, direction, page, and size. The section anchor is `master-leaderboard`. Beta promotion requires product feedback; runtime performance and Firestore reads should be measured in the deployed environment.

- `score_value` stores the workbook's numeric value without cross-evaluation normalization. `score_display` retains the source label.
- `score_kind` distinguishes Elo, percentage, integer scores, and the signed index. Signed index limits are -100 to 100. Percentage limits are 0 to 100.
- `cost_usd` is precise only when the numeric workbook cell supplies a value. Bounded cost labels remain display text with null numeric cost. No estimated values are created.
- `cost_status` is `exact`, `bound`, or `missing`. Exact cost can exist with no label; the UI then formats the supplied USD number.
- Confidence interval deltas are parsed only from supplied Elo interval labels. Source interval text remains intact. Interval sorting uses the upper delta.
- Release dates retain source month/year labels. Sorting uses the parsed date and places missing/unparseable dates last.

## Ordering and ingestion

Default rank sorting preserves workbook row order for tied ranks. Alternate sorts use source rank then model label and source row as deterministic tie breakers. Null costs remain last in both directions.

The parser locates headers by name and imports numeric rank rows. Missing required values, invalid numeric values, decreasing source ranks, missing provenance, or absent standard sheet structure reject the import. Reports are generated from parsed rows. The initial source should reconcile to 15 standard evaluations, 4,948 standard entries, 66 provider labels, 739 raw model labels, 3,239 cost labels, and 2,858 precise costs.

Local data is replaced only after validation succeeds. Firestore publication is atomic across evaluation pointers after staging; published snapshots remain immutable. Re-importing the same file preserves deterministic row IDs.

Intelligence Index uses a dedicated A–D adapter (rank, model, score, scoring status), adding 670 rows and a sixteenth evaluation. Row 1’s “Int” rank is restored to 1 only when row 2 has rank 2. Exact model matches across standard sheets supply providers only when unambiguous; other providers are Unknown. `source_url` is null, costs are missing, and optional `scoring_status` preserves independent scoring versus estimates. The UI displays workbook provenance and the adapter notes.
