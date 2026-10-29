# Leaderboard data dictionary

The schema is declared in `src/lib/contract.ts`. All nullable source values remain null when absent. Document IDs are deterministic SHA-256 based identifiers; evaluation IDs use sheet slugs.

| Collection | Identity and fields | Meaning |
| --- | --- | --- |
| sourceAssets | content hash, filename, captured_at, imported_at, source_kind | Provenance for workbook imports and supplementary Artificial Analysis result captures. SHA-256 covers the captured source data. |
| evaluations | slug, display_name, source_title, source_url, category, metric_key, metric_label, score_kind, score_unit, score_min/max, captured_at, source_asset_id, notes | One distinct evaluation. `published_snapshot_id` points to its visible immutable snapshot. Row and coverage counts are copied from that validated snapshot for catalog reads. Optional `metric_group`, `metric_indicator`, `metric_color`, and `source_tab` identify separately ranked metrics that share a source results tab. |
| providers | provider-label hash, slug, display_name, aliases | Exact source provider labels. No implicit normalization. |
| models | provider and model-label hash, provider_id, canonical_name, display_name, release_date_label, aliases, created_at | Provider plus exact model variant. Canonical name initially equals the source model label. |
| snapshots | evaluation and workbook hash, captured_at, status, row_count, cost_label_count, precise_cost_count | One capture per evaluation. Cost counts refer to evaluation-specific workbook cost fields. Importing and validated snapshots stay hidden until published. |
| snapshots/{id}/entries | snapshot and source-row hash, evaluation_id, model_id, provider_id, source_rank, score_value/display, confidence interval, release label, cost_usd/display/status, source_sheet/row/asset | Immutable source result. Source row is the one-based Excel row. Provider and model labels are denormalized for display. |
| data/intelligence-index-costs.json | source URL, capture time, model slug/name/provider, cost_usd | Dated capture of the Intelligence Index page's `intelligenceIndexCostPerTask` values; linked from cost cells in the master and individual evaluation tables. |
| ingestionRuns | run ID, source_asset_id, started_at, completed_at, status, accepted_rows, error | Trusted publishing run and failure reason. |
| ingestionIssues | run_id, sheet, message, severity | Reviewable source anomalies and normalization backlog. |

## Numeric semantics

## Master comparison policy v1 (beta)

`src/lib/master.ts` groups entries by provider, model, and reasoning/fallback variant. It accounts for known differences in how evaluation sheets format the same variant (for example, “Adaptive Reasoning, Max Effort, Default Fallback” and “max with fallback”). Effort and fallback variants remain distinct. Each evaluation cell contains the selected source entry and a link to its original label in that evaluation. The master table displays original source ranks, including Elo, unbounded indices, and estimates, plus a separate Cost per Intelligence Index task column linked to each matched Artificial Analysis model profile. There is no score normalization, mean, coverage score, or overall master rank.

Duplicate selection uses ascending source rank, source row, then entry ID and emits an issue. Full source entries remain server-side for provenance. “Not ranked” appears only when there is no entry for the matched model and variant in that evaluation. Index sorting uses source rank ascending by default, with missing entries last in both directions. Ties use best source rank, exact model, provider, then model ID. Local JSON and Firestore share the same aggregation.

Home URL keys `mq`, `mp`, `ms`, `md`, `mi`, and `mz` store search, provider, sort, direction, page, and size. The section anchor is `master-leaderboard`. Beta promotion requires product feedback; runtime performance and Firestore reads should be measured in the deployed environment.

- `score_value` stores the Artificial Analysis value as captured, without cross-evaluation normalization. `score_display` formats it to six significant figures.
- `score_kind` distinguishes Elo, percentage, integer scores, and the signed index. Signed index limits are -100 to 100. Percentage limits are 0 to 100.
- Entry `cost_usd` and `cost_display` hold the cost per task shown on that evaluation's Artificial Analysis page. Costs are read from each page's “vs. Cost per Task” chart, because the “Cost per Task” bar charts no longer expose their values. The AA-Briefcase cost series reports the whole run, so it is divided by the 91 tasks. They are not the values shown in leaderboard cost columns. Those columns use the separate `data/intelligence-index-costs.json` snapshot: the weighted-average USD cost per Artificial Analysis Intelligence Index task. See the [Artificial Analysis methodology](https://artificialanalysis.ai/methodology/) and [Intelligence Index cost definition](https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index). The displayed value links to its model profile and sorts by the captured precise USD value; a missing profile value displays as a dash. No costs are estimated.
- `cost_status` is `exact` or `missing` for the evaluation-specific cost. Exact cost can exist with no label; this status does not control the separate Intelligence Index task cost column.
- Confidence interval deltas are parsed only from supplied Elo interval labels. Source interval text remains intact. Interval sorting uses the upper delta.
- Release dates retain source month/year labels. Sorting uses the parsed date and places missing/unparseable dates last.

## Ordering and ingestion

Ranks are assigned by descending score. Exact score ties share a rank and keep source row order. Alternate rank sorts use source rank then model label and source row as deterministic tie breakers. Cost sorts use the separate Intelligence Index profile value and keep missing values last in both directions.

`scripts/capture-aa-evaluations.mjs` saves the chart and table data behind each Artificial Analysis evaluation page to `data/aa-captures/`. `scripts/import-aa-evaluations.ts` rebuilds the evaluations from those captures. Missing creators, unknown chart titles, and duplicate models within an evaluation reject the import. The Sep 29 workbook remains in the published history only.

Local data is replaced only after validation succeeds. Firestore publication is atomic across evaluation pointers after staging; published snapshots remain immutable. Re-importing the same file preserves deterministic row IDs.

Intelligence Index rows come from the Intelligence Index page. `scoring_status` follows Artificial Analysis's estimated flag: “Independently scored” or “Estimated”. Where the source flags a model as estimated and an earlier capture said the independent evaluation is still forthcoming, that wording is kept. Models with no flag keep their earlier status, or none. The Intelligence Index has no per-task cost on its rows; its cost column comes from `data/intelligence-index-costs.json`.

The AA-Briefcase component indexes come from `data/aa-briefcase-components.json` and `data/aa-briefcase-rubric-refresh.json`, captured 29 Oct 2026. They add 242 rows each for Rubric Score (%), Analytical Quality Elo, and Presentation Elo, one per listed model. Rubric fractions are converted to percentages. The two Elo evaluations share the source tab “Analytical Quality & Presentation Elo” and retain separate graph indicator metadata. Component Elo confidence bounds are included when the source capture supplies them; unavailable bounds remain null. Costs are absent from this source capture. Firestore mode uses a published snapshot when available and falls back to this bundled capture until then.
