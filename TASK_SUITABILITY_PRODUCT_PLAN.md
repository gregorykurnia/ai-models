# Task Suitability Planner

Product prompt and rollout plan for letting a user describe a task, choose the evaluations that matter, assign their weights, select any number of candidate models, and compare the resulting suitability scores.

**Status:** Phases 0–3 implemented locally; Phase 3 audit covers the imported 29 Sep 2026 workbook snapshot. Central analytics, refresh, sharing, and accounts remain future work.

**Related plans:** [LEADERBOARD_PRODUCT_PLAN.md](LEADERBOARD_PRODUCT_PLAN.md) · [MASTER_LEADERBOARD_ROLLOUT_PLAN.md](MASTER_LEADERBOARD_ROLLOUT_PLAN.md)

## 1. Copy-ready implementation prompt

```text
Build a new Task Suitability Planner for the model benchmark app.

Add a separate `/suitability` experience and a compact entry card on the home page. Keep the existing master leaderboard focused on showing original source ranks; do not add a synthetic overall score to that table.

The planner should let a user:

1. Enter a task request such as “Ask for stock analysis”. Treat the text as the task label and saved context. Do not infer or auto-select evaluations from the text in the first release.
2. Search and select one or more published evaluations. Group options by category and show the metric, row count, and capture date.
3. Assign a weight to every selected evaluation. Start with equal weights. Show weights as percentages, require a positive total, provide an “Equal weights” reset, and make it clear when the total is not 100%.
4. Search, filter by provider, and select any number of candidate model variants. There is no product maximum. Preserve the existing model identity rules: provider, model, reasoning effort, and fallback variants remain distinct.
5. Save the task configuration and calculate a result for every selected candidate.
6. Review a results table sorted by suitability score, with a per-evaluation breakdown available for every row.

Results must show:

- model and provider;
- suitability score from 0 to 100, where higher is better;
- coverage of the selected evaluation weight, such as “3 of 4 evaluations · 75% weight”;
- weighted average source rank, where lower is better;
- one cell per selected evaluation showing the source rank or “Not ranked”.

Use rank-based scoring because the source evaluations use different score units. For evaluation e with N ranked rows, calculate a model’s component score as:

  component(e, model) = 100 × (1 - (source_rank - 1) / max(1, N - 1))

Rank 1 is therefore 100 and the last ranked row is approximately 0. The task score is the weighted average of the available component scores. If a model has no entry in a selected evaluation, omit that component from the calculation, show the missing cell, and reduce the displayed coverage. Never invent a rank or treat “Not ranked” as a source score. If no selected evaluation has a rank for the model, show “No score”.

Show the raw weighted average source rank as a supporting value because users may expect rank 5 and rank 20 to average to 12.5. Use the normalized suitability score for the primary comparison so evaluations with different list sizes remain comparable. Explain this in the planner’s methodology note.

Sort results by complete weight coverage first, then suitability score descending, coverage descending, weighted average rank ascending, and model name. Add a filter for “Complete coverage” so users can hide partial results.

Pin the published snapshot ID and capture date for every selected evaluation when the task is saved. Display the snapshot date in the task summary. A later refresh can offer to recalculate against the newest published snapshots, but it must not silently change an existing saved result.

Reuse the current dataset, evaluation metadata, entry ranks, provider filters, model IDs, source links, and visual language. Make the flow keyboard accessible, responsive on small screens, and explicit about missing coverage. Keep the first release read-only with local browser persistence for saved tasks; defer accounts, public sharing, semantic task classification, and live model recommendations.

Acceptance criteria:

- A user can create and save “Ask for stock analysis”, select several evaluations, edit their weights, select an unlimited number of candidates, and see results without leaving the planner.
- The Save/Run action is disabled until the task text, at least one evaluation, valid weights, and at least one candidate are present.
- Changing a weight changes the score deterministically and the UI shows the updated total.
- Every result can be expanded to show evaluation, weight, source rank, cohort size, normalized component score, and contribution.
- Missing source entries remain visible as “Not ranked” and are reflected in coverage.
- The saved task can be reopened from the browser without losing its selected evaluations, weights, candidates, or snapshot dates.
- Existing master leaderboard and individual evaluation behavior remain unchanged.
```

## 2. Product definition

### User problem

The current app helps a visitor browse evaluations one at a time or scan source ranks across the master leaderboard. It does not help them answer a task-oriented question such as: “For stock analysis, which of these models performs best across the finance and reasoning evaluations I care about?”

### Product outcome

Give the user a transparent, repeatable way to turn their own priorities into a shortlist. The user chooses the task context, evaluations, weights, and candidate set. The app calculates the comparison and shows enough detail for the user to audit every result.

### Recommended information architecture

Use a separate route rather than embedding a large workflow inside the master table:

| Surface | Purpose |
| --- | --- |
| `/` | Existing master leaderboard, plus a compact “Find the best model for a task” entry card |
| `/suitability` | Create, configure, save, and review a task |
| `/suitability/[taskId]` | Reopen a saved task and its pinned results |
| `/leaderboards/[evaluationSlug]` | Existing source leaderboard, opened from a result breakdown |

The planner has its own state, a multi-select evaluation picker, a multi-select model picker, and a wide result table. Keeping it separate leaves the master leaderboard legible and preserves the meaning of its source-rank columns.

## 3. User flow

### Step 1: Describe the task

Show a prominent text area with the label “What do you need a model to do?” and an example placeholder such as “Ask for stock analysis”. Add an optional short task name only if a saved task needs a different display title. The first release stores the text for context; it does not use an LLM to classify the task.

### Step 2: Choose evaluations and weights

Use a searchable multi-select picker. Group evaluations by category, display the metric and capture date, and show the selected items as rows with editable percentage weights.

Default behavior:

- Selecting the first evaluation assigns it 100%.
- Selecting more evaluations distributes the total equally.
- Users can edit individual weights.
- “Equal weights” restores an equal distribution.
- The total must equal 100% before saving; show the current total beside the control.

The picker should make clear that an evaluation is a source ranking. Avoid calling the normalized component a source score.

### Step 3: Select candidate models

Use the same provider and model labels as the existing data. Include search, provider filtering, selected-model chips, and “Select all visible” / “Clear visible” actions. There is no maximum candidate count. A candidate is the exact existing model variant identified by `model_id`, so reasoning effort and fallback differences remain separate.

Show a selected count and keep the selection when the user changes search or provider filters. The list may be paginated or virtualized for performance, but pagination must not limit the total selection.

### Step 4: Save and calculate

The primary action should read “Save task and compare models”. The preflight summary should show:

- task text;
- number of selected evaluations and their weights;
- number of candidates;
- snapshot capture dates;
- scoring method version.

After saving, keep the configuration visible above the results so a user can adjust it and rerun. A saved task should reopen with the same selections.

### Step 5: Read the results

The results table should make the primary decision easy while preserving the audit trail:

| Column | Meaning |
| --- | --- |
| Model / provider | Exact candidate variant |
| Suitability | Weighted normalized rank score from 0–100; higher is better |
| Coverage | Selected evaluation count and selected weight with a source rank |
| Weighted average rank | Weighted raw source rank; lower is better |
| Evaluation columns | Source rank, or “Not ranked”, for every selected evaluation |

Clicking or expanding a row reveals the calculation breakdown. Each breakdown row includes the evaluation, weight, source rank, ranked-row count, normalized component score, weighted contribution, capture date, and link to the source leaderboard.

Partial coverage must be visible in the table and in the details. Add a “Complete coverage only” filter. The default sort puts complete-coverage candidates first, then applies the score and tie-break rules in the implementation prompt.

## 4. Scoring and methodology

### Why normalize ranks

The source evaluations contain different numbers of rows and different metric types, including Elo, percentages, integer scores, and signed indexes. A raw average of ranks is easy to understand but can overvalue an evaluation with a smaller or larger ranked cohort. The planner therefore uses a normalized rank percentile for the primary suitability score.

### Primary score

For an evaluation `e` with `N_e` accepted ranked rows and a candidate with source rank `r_e`:

```text
component(e, candidate) = 100 × (1 - (r_e - 1) / max(1, N_e - 1))
```

Clamp the result to the range 0–100. Rank 1 maps to 100. The last ranked row maps to 0 when the ranks cover the full cohort. If the cohort contains one row, its component is 100.

For selected evaluations `E`, with user weights `w_e` and available ranks `A(candidate)`:

```text
suitability(candidate) =
  Σ(component(e, candidate) × w_e) / Σ(w_e), for e in A(candidate)
```

Weights are normalized to their total in the calculation. Missing entries are excluded from both sums, never converted into a fabricated rank or score.

### Coverage and missing values

Show both:

- `ranked evaluations / selected evaluations`, and
- `covered weight / selected weight`.

Example: “3 of 4 evaluations · 75% weight”. A candidate with no available rank shows “No score”. The score is labeled “partial” when covered weight is below 100%.

The default view sorts complete-coverage candidates before partial-coverage candidates. The “Complete coverage only” filter provides a strict comparison set. This keeps missing data transparent without pretending that lack of a source entry is poor performance.

### Supporting raw average

For users who expect direct rank averaging, show this secondary value for the same available evaluations:

```text
weighted average rank = Σ(r_e × w_e) / Σ(w_e)
```

For equal weights, rank 5 and rank 20 produce a raw average rank of 12.5. If both evaluations have 100 ranked rows, their normalized components are approximately 96.0 and 80.8, producing a suitability score of approximately 88.4. The UI should explain that lower raw rank is better while higher suitability score is better.

### Reproducibility

Every saved task stores:

- scoring method, such as `rank_percentile_v1`;
- missing-data policy, such as `exclude_and_show_coverage`;
- selected evaluation IDs and weights;
- the published snapshot ID and capture date for each evaluation;
- selected candidate model IDs.

If the published dataset changes, an existing task continues to reference its pinned snapshots until the user explicitly refreshes it.

## 5. Data model

The first release can store task configurations in `localStorage` so the existing read-only app remains read-only. Use the same shape for a future Firestore collection.

### `SuitabilityTask`

| Field | Meaning |
| --- | --- |
| `id` | Stable local or server task ID |
| `title` | Short display title, derived from or entered beside the request |
| `request` | User-entered task text, such as “Ask for stock analysis” |
| `evaluation_weights` | Array of `{ evaluation_id, weight, snapshot_id, captured_at }` |
| `candidate_model_ids` | Unlimited array of exact existing `model_id` values |
| `score_method` | Versioned method, initially `rank_percentile_v1` |
| `missing_policy` | Initially `exclude_and_show_coverage` |
| `created_at` / `updated_at` | Local or server timestamps |
| `last_calculated_at` | Time the visible result set was calculated |
| `schema_version` | Saved-task migration version |

Results should be derived from the pinned entries rather than stored as a second source of truth. A later server-backed implementation may cache result rows for faster loading, but the task inputs and snapshot IDs remain authoritative.

### Future Firestore collection

When account-backed saves are needed, add `/suitabilityTasks/{taskId}` with an owner or share token, then keep the evaluation weights and candidate model IDs in the document or subcollections depending on query needs. Do not allow anonymous client writes to the existing benchmark collections. Public sharing should use a read-only share token or published task document with explicit privacy behavior.

## 6. Rollout plan

### Phase 0: Product and scoring lock

Decide the visible terms and publish the methodology note before implementation. Confirm that the primary score is normalized rank percentile, raw weighted average rank is secondary, missing entries are excluded with coverage shown, and saved tasks pin snapshot IDs.

**Exit criteria:** approved copy, formula examples, task schema, and result sort order.

### Phase 1: Calculation and data foundation

Add a pure scoring module that accepts evaluations, entries, weights, candidate IDs, and snapshot IDs. Reuse the current `Entry`, `Evaluation`, and `model_id` contracts. Return score, raw weighted rank, coverage, per-evaluation breakdown, and deterministic tie-break fields.

Add unit-level fixture cases for:

- equal and unequal weights;
- different evaluation cohort sizes;
- ties and rank 1;
- one-row evaluations;
- missing entries;
- no available entries;
- duplicate source entries after the existing duplicate policy;
- pinned versus current snapshots.

**Exit criteria:** the same input produces the same result, all numeric fields have documented semantics, and the calculation does not mutate master leaderboard behavior.

### Phase 2: Planner beta

Build `/suitability` and the home-page entry card. Implement the task text field, evaluation picker, weight editor, unlimited candidate picker, preflight summary, local save, results table, breakdown panel, complete-coverage filter, and source links.

Add responsive and keyboard behavior for searchable multi-select controls. Keep result rows usable when many evaluations are selected by allowing horizontal scrolling and a sticky model column.

**Exit criteria:** a tester can create the stock-analysis example from a fresh browser, close and reopen the app, recover the saved task, adjust a weight, and explain why the top result scored highest.

### Phase 3: Data-backed release

Run the planner against the current published dataset and show the capture date for every selected evaluation. Review model identity matches, Unknown providers, Intelligence Index estimates, and partial coverage cases. Add a methodology link to the data notes.

Instrument aggregate product events without logging task text or candidate lists:

- planner opened;
- task saved;
- evaluations selected;
- weight validation failed;
- comparison calculated;
- complete-coverage filter used;
- result breakdown opened;
- source leaderboard opened.

**Exit criteria:** no silent score changes, no broken source links, acceptable calculation latency for the full candidate set, and a review of partial-coverage behavior using real data.

### Phase 4: Refresh, sharing, and accounts

Only after the local workflow is useful, consider server-backed saved tasks, authenticated ownership, read-only sharing, snapshot refresh, and result history. A refresh must show what changed: new snapshot date, changed ranks, newly missing entries, and score movement.

Semantic task classification, custom evaluation recommendations, and natural-language explanations can follow only if users need them. The first release should keep the user in control of evaluation selection.

## 7. Acceptance criteria

- The home page offers a clear entry point to the planner without changing the master leaderboard’s source-rank meaning.
- A user can enter “Ask for stock analysis”, choose multiple evaluations, assign weights, select any number of models, save, and see a ranked comparison.
- The evaluation picker exposes metric, category, row count, and capture date.
- The candidate picker supports search, provider filtering, selected counts, select-all-visible, and clear-visible actions without imposing a maximum.
- Save is blocked for empty task text, zero evaluations, invalid weights, or zero candidates.
- Weight totals and score changes are visible and deterministic.
- The result table shows suitability score, coverage, weighted average rank, and each selected evaluation’s source rank.
- Every result breakdown includes the formula inputs and a source leaderboard link.
- “Not ranked” is preserved as missing data and never silently converted to a rank or score.
- Complete-coverage candidates are distinguishable from partial candidates, and partial results can be hidden.
- Saved tasks preserve selected options and pinned snapshot dates across a browser reload.
- Existing leaderboard routes, source ranks, filters, and data notes continue to work unchanged.
- The UI is usable with keyboard navigation, screen-reader labels, and horizontal scrolling on small screens.

## 8. Product risks and decisions

| Risk | Decision for first release |
| --- | --- |
| Raw ranks use different cohort sizes | Normalize ranks for the primary score; show raw weighted rank as a supporting value |
| A model is absent from one selected evaluation | Exclude the missing component, show covered weight, and offer a complete-coverage filter |
| New imports change old results | Pin snapshot IDs on save and require an explicit refresh |
| Model labels have reasoning or fallback variants | Reuse existing exact model IDs and keep variants separate |
| Users assume the task text changes the score | Label the text as context; evaluations and weights control the calculation |
| Many candidates or evaluations create a wide table | Paginate or virtualize the picker, use a sticky model column, and allow horizontal scrolling |
| Local saves do not follow a user across devices | Treat local persistence as beta; add account-backed saves only in the later phase |
