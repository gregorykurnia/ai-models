# Master leaderboard rollout plan

## Feature

## Rollout status — 30 September 2026

- Phase 0: scoring policy v1 implemented and documented. Beta uses source-bounded percentages and signed indices; Elo, unbounded indices, and estimates are excluded pending product review. Product approval of additional scales remains open.
- Phase 1: shared local/Firestore aggregation, Zod contracts, deterministic duplicate selection, retained provenance, and importer validation issues implemented. Live Firestore behavior and read costs have not been measured.
- Phase 2: home beta table implemented with all 16 evaluation columns, normalized mean, coverage, dynamic rank, immutable source rank links, filters, pagination, sticky columns, and URL state.
- Phase 3: importer passed with 5,618 source entries; 850 master rows validated. Ten high-coverage rows reconciled against the original workbook re-import. Focused fixtures, TypeScript, production build, desktop/mobile screenshots, sorting, source navigation, browser return state, keyboard focus, and mobile overflow checks passed. No individual evaluation implementation was changed.
- Phase 4: guarded release is implemented as a clearly labeled beta and pushed to the configured upstream. Production deployment, live load/read monitoring, user feedback, and promotion remain open; they cannot be validated from local checks.

Verification: `npx tsx scripts/validate-master.ts`, `npx tsc --noEmit`, `npm run build`, and `npm run import:workbook -- <original workbook>`. Browser smoke checks: `BASE_URL=http://localhost:3180 PLAYWRIGHT_MODULE=<installed Playwright module> node scripts/check-master-browser.mjs`.

The compact table payload is 1,295,691 JSON bytes, excluding evaluation metadata and framework overhead. Full source provenance stays server-side. The report contains 302 master warnings for duplicate selection, excluded scales, and low coverage, with no master errors. These are review signals rather than fabricated replacement values.

Add a master leaderboard section to the home page beneath the individual evaluation cards. It should show one row per model and one column for each evaluation, so a visitor can compare a model across the full workbook from one place.

The master table should include:

- A dynamic `Rank` column immediately beside the model name. It is the model's current position in the master table, so it changes when the user sorts by an evaluation or the mean. The number links to the evaluation represented by the active sort, or to the master view when the mean is selected.
- Model name, linked to the future model detail view or the model's filtered results.
- Provider, when the source mapping is available.
- One score column for each evaluation, including `Intelligence Index`.
- A mean score across the available evaluation dimensions.
- A rank link beside each displayed evaluation score. The link opens that evaluation's leaderboard with the model search already applied.
- Coverage information showing how many evaluation scores contributed to the mean.

The feature must preserve source values and make the cross-evaluation average understandable. The workbook mixes Elo, percentages, integer index scores, a signed index, and estimates, so a raw arithmetic average would imply comparability that the data does not have.

## Product decisions

### Placement and navigation

1. Keep the existing evaluation cards and place a new `Master leaderboard` section after them on `/`.
2. Add a compact introduction explaining that scores are normalized for comparison and that missing evaluations are excluded from a model's mean.
3. Give the section a stable anchor, such as `#master-leaderboard`, so it can be linked directly.
4. Keep individual evaluation pages unchanged except for links coming from the master table.

### Master row identity

Use the existing provider-plus-exact-model identity as the initial row key. Do not merge variants such as different reasoning effort, fallback settings, or model labels unless an explicit canonicalization rule is later approved.

The row should retain:

- `model_id`, provider, and exact source model label.
- All source entries that contributed to the row.
- A per-evaluation source row and source rank for auditability.

Models that appear in more than one provider label remain separate rows when the current identity data cannot prove they are the same model.

### Evaluation columns

Create columns from evaluation metadata rather than hardcoding workbook names. Include all published evaluations, currently 16, and preserve each evaluation's display name, metric label, score kind, score limits, and capture date.

Each cell should contain:

- The original score display, including an em dash when no row exists.
- A small linked source rank, for example `84`, linking to `/leaderboards/{evaluationSlug}?q={exact-model}`.
- An indication for estimates where the source provides one, especially for `Intelligence Index`.

If the same model has multiple entries for one evaluation, do not silently average them. Apply a deterministic duplicate rule and report it in the data notes; the preferred first rule is to select the best source rank and preserve the discarded entries as an ingestion issue.

### Comparable mean

Store and display two distinct concepts:

1. `mean_normalized_score`: the cross-evaluation comparison value.
2. `mean_coverage`: the count of evaluations contributing to that value.

Normalize each score to a 0–100 comparison scale using evaluation metadata:

- Percentage scores: keep their 0–100 value.
- Known bounded index scores: map from `score_min`/`score_max` to 0–100.
- Elo: use a documented bounded transform or exclude it from the comparable mean until a stable scale is approved. The first implementation should use an explicit configuration table rather than placing a hidden formula in the UI.
- Unknown or unbounded score ranges: exclude from the normalized mean and show the reason in the data notes.
- Missing scores: exclude from both the numerator and denominator; never treat them as zero.

The UI should label the result `Mean normalized score` rather than simply `Average`, and show `x / 16 evaluations` beside it. If product review chooses raw means later, that is a separate decision and schema version.

### Sorting and rank links

Default sort is mean normalized score descending, with source rank and exact model label as deterministic tie-breakers. Users can sort by any evaluation score, mean, provider, or model.

When a score column is sorted:

- Reorder master rows by that evaluation's normalized numeric score, with missing values last.
- Recalculate the dynamic `Rank` column for every row in the current master-table order. This is the rank number beside the model name and is allowed to change with the selected sort.
- Keep each cell's linked source rank as the original rank from that evaluation. Do not replace source rank with the master-table position.
- The rank link must continue to open the relevant evaluation with the exact model query, regardless of master-table sort.

This distinguishes the dynamic master rank beside the model name from the source rank shown beside an evaluation score. The column headers and accessible labels should make that distinction clear.

### Missing data and estimates

- Missing evaluation: em dash, no rank link, excluded from the mean.
- Bounded cost: irrelevant to score aggregation; preserve it only on individual evaluation pages.
- Estimated score: include it in the mean only if the evaluation's metadata explicitly permits estimates; otherwise show the estimate but exclude it and explain why.
- `Intelligence Index`: include its score status in the cell and use the adapter's provider value, including `Unknown` where mapping is unresolved.

## Rollout phases

### Phase 0: data and metric design

- Confirm the normalization policy and the treatment of Elo and estimates with product review.
- Add a versioned evaluation scoring configuration with direction, scale, bounds, and inclusion policy.
- Define duplicate handling and write representative fixtures for a model with full coverage, partial coverage, duplicate variants, an estimate, and a negative signed index.
- Document the formula and limitations in `/about/data`.

Exit criteria: the team can calculate the same normalized value by hand for every supported score kind, and no evaluation is silently mixed onto an incompatible scale.

### Phase 1: server-side master dataset

- Add a master aggregation function in `src/lib/data.ts` that groups entries by the existing model identity.
- Return evaluation cells, source rank links, score status, normalized values, mean, and coverage.
- Keep the local JSON path and Firestore path behaviorally equivalent.
- Add Zod types for master rows and scoring configuration.
- Add validation issues for duplicates, unsupported score kinds, missing metadata, and low coverage.

Exit criteria: local data produces deterministic rows and repeated imports produce the same model keys and means.

### Phase 2: home-page table

- Add a client table component below the evaluation cards.
- Implement horizontal scrolling, sticky model columns, compact evaluation headers, search, provider filter, pagination, and shareable URL state.
- Render score plus source rank link in each populated evaluation cell.
- Implement mean and coverage columns and clear empty states.
- Add accessible labels that distinguish source rank from current table position.

Exit criteria: a visitor can search a model, sort by any supported evaluation or mean, follow a rank link, and return without losing the selected master-table state.

### Phase 3: validation and visual QA

- Compare at least 10 master rows against the source workbook and individual leaderboard pages.
- Verify that source ranks remain unchanged while displayed row positions change with sorting.
- Verify missing values, estimates, signed indices, ties, and duplicate model labels.
- Test narrow screens and keyboard navigation across the wide table.
- Run the TypeScript check, production build, and the importer validation report.

Exit criteria: no formula or link errors, no accidental changes to the existing 16 evaluation pages, and the table remains usable at normal desktop and mobile widths.

### Phase 4: guarded release

- Release behind a feature flag or a clearly labeled beta section.
- Monitor load time, client payload size, Firestore reads, and search/sort interactions.
- Gather feedback specifically on whether the normalized mean is understood and whether model rows feel over-split or over-merged.
- Promote to the default home page after metric and identity feedback is resolved.

## Acceptance criteria

- The home page contains the existing evaluation cards plus a master leaderboard section.
- The table includes all currently published evaluations and a mean normalized score.
- A dynamic linked rank appears beside each model name and changes with the active sort column.
- Every populated score cell shows its original source rank as a link to the matching evaluation and model.
- Sorting changes the master row order and visible positions without changing source ranks.
- Missing scores are not treated as zero and the coverage count is visible.
- Score normalization is data-driven, documented, and tested for every supported score kind.
- Intelligence Index scores and scoring statuses are represented without inventing provider, source, or cost data.
- Existing evaluation routes and source-order behavior remain unchanged.
- The feature passes `npm run build`, importer validation, and targeted master-table checks.

## Implementation prompt

> Implement the master leaderboard described in `MASTER_LEADERBOARD_ROLLOUT_PLAN.md` for the existing Next.js/TypeScript app.
>
> Start by inspecting the current contracts, local dataset, importer output, evaluation pages, and table styles. Do not change the existing evaluation ranking semantics or merge exact model variants. Add a server-side master aggregation based on the existing provider-plus-exact-model identity, with deterministic duplicate handling and explicit validation issues.
>
> Add versioned, data-driven score normalization metadata. Preserve raw display values and source ranks. Implement a documented normalized 0–100 mean with coverage, missing-value exclusion, explicit handling for Elo and estimates, and support for the signed and estimated `Intelligence Index` data already in the repository. Do not invent scores, providers, source URLs, costs, or canonical model matches.
>
> Add a master leaderboard section to the home page below the evaluation cards. Include a dynamic linked rank column beside the model name, sticky model/provider columns, one generated column per published evaluation, a mean normalized score, coverage, search, provider filtering, pagination, shareable URL state, and accessible horizontal scrolling. Sorting by an evaluation or the mean must reorder master rows and recalculate the linked rank beside the name. Each populated evaluation cell must also show the original score and source rank; that source rank must remain unchanged and link to the corresponding evaluation leaderboard with the exact model filter applied.
>
> Update `/about/data` and the data dictionary with the normalization formula, inclusion rules, duplicate policy, coverage meaning, and limitations. Keep local JSON and Firestore reads consistent. Add focused tests or validation scripts for full coverage, partial coverage, missing values, ties, duplicate model entries, signed indices, estimates, sorting, and rank links. Run the importer, targeted checks, TypeScript validation, and production build. Review the diff, commit the complete change with a concise message, and push it to the configured upstream.
