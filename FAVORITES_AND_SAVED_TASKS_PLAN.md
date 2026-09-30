# Model Favorites and Saved Task Comparisons

Product plan for starring models on the master leaderboard, using those favorites as task-suitability candidates, and reviewing saved comparisons with cost and evaluation detail.

**Status:** Proposed. This plan extends the existing master leaderboard and Task Suitability Planner.

**Related plans:** [MASTER_LEADERBOARD_ROLLOUT_PLAN.md](MASTER_LEADERBOARD_ROLLOUT_PLAN.md) · [TASK_SUITABILITY_PRODUCT_PLAN.md](TASK_SUITABILITY_PRODUCT_PLAN.md)

## Product intent

Let a user build a shortlist once, reuse it when configuring a task, and return to saved task comparisons without rebuilding the setup. The comparison should make each model’s suitability score easy to scan, show its cost beside that score, and preserve the existing per-evaluation rank and calculation breakdown.

## Current behavior

- The master leaderboard has search, provider filtering, sorting, and pagination, but no favorites.
- The Task Suitability Planner supports candidate search, provider filtering, selecting all visible models, and clearing visible models.
- Saving a task stores the selected evaluations, candidate models, and pinned evaluation snapshots. The result table shows suitability, coverage, weighted average rank, and one source-rank column per selected evaluation.
- Saved tasks currently appear as links at the top of the planner. Opening a saved task returns to the same combined setup and results page.
- Shared task saves require no sign-in. They are visible to every visitor and an edit to a saved task updates that shared task.
- The app already captures Artificial Analysis’s **Cost per Intelligence Index task** for leaderboard rows. The workbook also contains some separate evaluation-specific task costs.

## Planned experience

### 1. Star favorites on the master leaderboard

Add a star control in each model cell so the table does not gain another wide column. The control must have a clear accessible name and state, such as “Add GPT-6 to favorites” and “Remove GPT-6 from favorites.” Add a **Favorites only** filter and show the current favorite count near the controls. Keep every source-rank cell and its sort behavior unchanged.

Favorites are personal browser data stored in local storage. They do not change the published leaderboard or the shared task list. Store each favorite by the same normalized provider/model identity used to group known alternate sheet labels in the master table. This keeps known label variants together while leaving different reasoning effort and fallback variants separate. Reflect favorite changes across tabs in the same browser and handle unavailable or malformed local storage without breaking the leaderboard.

### 2. Use favorites as candidate models

Add an **All models / Favorites** filter to the candidate picker. Show how many favorites are available, how many match the current filters, and how many candidates are selected. Keep favorite stars visible in the picker so a user can update the shortlist there too.

Provide two explicit bulk actions:

- **Add all favorites** adds every favorited model that exists in the current candidate catalog, regardless of the current search or provider filter.
- **Replace selection with all favorites** makes the candidate set exactly the currently available favorites. This is the quick path for using the shortlist as the entire comparison cohort.

Keep the existing select-all-visible and clear-visible actions. Do not impose a candidate limit. Preserve the current selection when a user searches or changes filters. If a favorite cannot be matched to a current candidate, report how many are unavailable and leave them favorited; never substitute a different model variant silently. An empty Favorites view should link back to the master leaderboard to build a shortlist.

### 3. Separate setup, saved-task library, and comparison review

Treat the current form as the task setup view. After **Save task and compare models**, open the saved comparison. Keep an **Edit settings** action on that page; saving edits updates that task, while **New task** creates a separate saved comparison.

Add a **Saved tasks** library that lists every shared saved task and any older tasks that exist only in the current browser. Each task entry should show its title, task description, last updated date, evaluation and candidate counts, pinned evaluation capture dates, and a compact preview of its leading candidate with suitability and cost. Let a user expand an entry to review its full comparison in place or open the dedicated comparison page. Include search by task title or description and a clear empty state.

Use these routes:

| Route | Purpose |
| --- | --- |
| `/suitability` | Create and configure a task |
| `/suitability/saved` | Browse all saved tasks and their comparison previews |
| `/suitability/[taskId]` | Review or edit one saved task and its full comparison |

On the comparison page, keep the current result-table organization and add a **Cost per Intelligence Index task** column beside suitability. The full table should contain:

1. Model and provider.
2. Suitability score, with higher values better.
3. Coverage of selected evaluation weight.
4. Weighted average source rank, with lower values better.
5. Cost per Intelligence Index task in USD.
6. One source-rank column for each selected evaluation.

Keep the comparison sortable by suitability and cost. Missing costs show a dash. Each published cost links to the Artificial Analysis model profile and displays the cost capture date. Cost is context alongside suitability and does not enter the suitability formula.

Keep the existing expandable calculation breakdown. For every selected evaluation it shows the evaluation name, weight, source rank or “Not ranked,” cohort size, normalized component score, contribution, pinned capture date, and source link. Where a pinned source entry includes an evaluation-specific workbook task cost, show that cost and its original display label in the breakdown as a separate value. Do not combine that evaluation-specific cost with Cost per Intelligence Index task.

### Cost meaning and saved snapshots

Label the main cost column **Cost per Intelligence Index task** everywhere. It is Artificial Analysis’s captured weighted-average cost for one Intelligence Index task, not a prediction of the user’s custom task text or a quote for an arbitrary prompt. Link to the source profile and show the capture date so users can interpret it correctly.

Pin the cost value, profile URL, and cost capture timestamp when a comparison is saved, alongside the evaluation snapshot IDs already stored. This keeps a saved comparison stable when new cost data is imported. Store the workbook’s evaluation-specific cost label, precise value when available, and cost status in the pinned entry data so the breakdown can reproduce the source value. Do not estimate values for missing or bounded source costs.

For existing saved tasks that predate cost pinning, use the first available cost snapshot during migration where possible and record its real capture date. If no cost record can be attached, show a dash. Do not imply that a backfilled cost was captured when the task itself was first saved.

## Data and behavior decisions

| Concern | Decision |
| --- | --- |
| Favorite identity | Normalized provider/model identity shared by the master table and candidate catalog; reasoning and fallback variants remain distinct. |
| Favorite persistence | Browser-local storage, shared across tabs in that browser. Favorites are not uploaded with a shared task. Cross-device favorites require a later account-backed feature. |
| Bulk favorite selection | Offer both additive selection and an explicit replace-selection action; counts and unavailable favorites remain visible. |
| Saved task behavior | Continue the current shared, no-sign-in task model. The saved library lists shared tasks; task edits remain visible to all visitors. |
| Comparison reproducibility | Pin evaluation snapshots and the Artificial Analysis cost snapshot used at save time. |
| Cost and scoring | Show cost as an independent comparison dimension. It does not change suitability or its sort tie-breaks unless the user explicitly sorts by cost. |
| Existing tasks | Preserve task inputs and scores; add cost only from an identified captured source snapshot. |

## Rollout

### Phase 1: Shared model identity and favorite storage

Expose a stable identity on master rows and suitability candidates using the existing master identity rules. Add a versioned local-storage record for favorites, resilient parsing, same-browser cross-tab updates, and a Favorites-only leaderboard filter.

**Exit criteria:** starring and unstarring works from the master table; known alternate labels resolve to one favorite; effort and fallback variants remain separate; invalid local storage does not block either page.

### Phase 2: Favorite-driven candidate selection

Add the favorites filter and both bulk selection actions to the candidate picker. Preserve the existing search, provider filter, selected chips, and visible-row actions.

**Exit criteria:** a user can build a shortlist on the master leaderboard, open Task Suitability, select exactly those favorites in one action, and see a correct selected count. Unavailable favorites are reported without changing identity.

### Phase 3: Cost pinning and saved comparison library

Extend saved-comparison data with the cost snapshot metadata and evaluation-specific costs needed for display. Add a schema migration for existing local and shared tasks. Build the saved-task library and give each task a dedicated review state with edit and new-task actions.

**Exit criteria:** the library includes every saved task; each task opens with its original scores and pinned evaluation dates; cost is visible beside suitability, source-linked, and tied to a displayed capture date; older tasks without an attachable value show a dash.

### Phase 4: Full evaluation breakdown and usability pass

Keep the current per-evaluation columns and expandable calculation details. Add evaluation-specific source costs to the breakdown when present, and make the wide result table usable with keyboard navigation and horizontal scrolling on smaller screens.

**Exit criteria:** users can scan suitability and cost, sort by either, inspect each evaluation’s contribution and source, and distinguish missing ranks and costs from numeric values.

## Acceptance criteria

- A model can be starred or unstarred from the master leaderboard with an accessible control.
- A Favorites-only filter shows the user’s saved shortlist without changing leaderboard ranks or other users’ view.
- Favorites map consistently into the task candidate picker using existing model-variant identity rules.
- The candidate picker can add all favorites or replace its selection with all available favorites in one action; the user can still select all visible models or clear visible models.
- Search, provider filters, and favorite filters do not silently discard selected candidates.
- The saved-task library lists every shared saved task, supports opening or expanding each comparison, and shows a clear leading-model suitability and cost preview.
- Saving a new task opens its comparison. Editing an existing task preserves its ID and updates that task; starting a new task creates a distinct saved task.
- Each comparison shows suitability, coverage, weighted average rank, Cost per Intelligence Index task, and one rank column for every selected evaluation.
- Cost is sortable, links to its source profile, and shows its capture date. Missing cost is shown as unavailable and never estimated.
- The suitability formula remains unchanged by cost.
- Each evaluation breakdown retains the current rank and score details and identifies the pinned snapshot. Evaluation-specific task costs appear only as separately labeled source values when available.
- Saved evaluations and costs remain stable after later imports. Legacy tasks show a cost only when a captured value and its actual capture date can be attached.
- Favorites remain local to the browser; the library explains that current saved tasks are shared and visible to site visitors.

## Risks and product notes

- The current shared task API has no owner identity. This plan keeps that behavior and makes it visible in the library; private task lists would require authentication and are outside this feature’s scope.
- Browser-local favorites do not follow a user to a different browser or device. Add account sync only if cross-device personal lists become a requirement.
- Cost per Intelligence Index task is a useful common comparison value, but it is not the price of every user-defined task. The full label, source link, and capture date must stay visible.
- Adding pinned cost data increases saved-task size. Keep the existing chunked entry storage and store a shared cost snapshot reference or per-candidate cost record without duplicating unrelated source data.
