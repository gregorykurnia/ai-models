# UI Surface Inventory

Scope: code-based inventory of the current Model Benchmarks app, using the route files, shared shell, primary components, and checked-in leaderboard catalog. This is an inventory only; no design changes are proposed here.

## High-level summary

- **App type:** public, data-heavy Artificial Analysis benchmark and model comparison app, with a task-suitability planner and shared saved comparisons.
- **Surfaces identified:** 38 inventory entries across 8 page templates, 1 layout, 0 modals, 0 drawers, 3 menu patterns, 4 feedback patterns, 4 forms/input flows, 6 data views, and 12 empty/loading/error states. Counts are of distinct inventory entries, not rendered instances.
- **Main UI patterns:** global header/navigation and footer; card/panel sections; dense sortable and filterable tables; a four-section task configuration flow; inline expandable calculation details; browser/shared task save and backup flows; inline status and error messages.
- **Most important surfaces:** home/master leaderboard, individual evaluation leaderboard, suitability task builder, saved task library, and saved comparison detail. These cover most browsing, comparison, and task-management activity.
- **Unclear / needs verification:** mobile navigation and narrow-screen behavior need visual confirmation. No sign-in or permission-denied UI is present in the reviewed routes; verify deployed access policy because shared tasks are described and implemented as accessible to all visitors. Runtime evaluation count may differ from the checked-in catalog.

The checked-in `data/leaderboards.json` contains 19 evaluation slugs. `/leaderboards/[evaluationSlug]` is one page template with those 19 current instances. `/suitability/[taskId]` is a parameterized template whose number of instances depends on saved tasks. No authored dialog, modal, drawer, sheet, toast, custom popover, or custom dropdown component was found in the reviewed UI. Native `<select>` controls are inventoried as menu patterns; `<details>` elements expand content inline.

## Part 1: Full page details

### PAGE-001 — Home and model catalog

- **Route/path:** `/`
- **Purpose:** Introduce the benchmark catalog and let visitors compare ranks across evaluations or open a specific evaluation.
- **User roles:** Public visitor; no account required in the UI.
- **Main sections and key UI elements:** Intro heading and copy; Task Suitability Planner callout; master leaderboard with search, provider/favorites filters, sortable columns and pagination; individual evaluation catalog cards; data note linking to methodology.
- **Available actions and outcomes:** Search/filter/sort/page through the master table; toggle browser-local model favorites; open a filtered master view from a model link; open one of the 19 current evaluation detail routes; navigate to suitability or data notes. The master view state is reflected in query parameters.
- **Associated overlays / inline companion surfaces:** FORM-002, MENU-001, MENU-002, MENU-003, FEEDBACK-003, FEEDBACK-004. No modal, drawer, or popover found.
- **Relevant loading states:** STATE-001, STATE-002.
- **Relevant empty states:** STATE-003, STATE-004.
- **Relevant error states:** PAGE-008; FEEDBACK-003 for favorite persistence failure.
- **Relevant permission/restricted states:** None found; public view. Deployed data-access policy needs verification.
- **Redesign priority:** High.
- **Complexity:** High.
- **Notes:** Main entry point and highest-density cross-evaluation data view. Primary evidence: `src/app/page.tsx`, `src/components/master-leaderboard.tsx`.

### PAGE-002 — Individual evaluation leaderboard

- **Route/path:** `/leaderboards/[evaluationSlug]` (19 slugs in the checked-in catalog)
- **Purpose:** Show one source evaluation's ranking and model-level metrics.
- **User roles:** Public visitor.
- **Main sections and key UI elements:** Breadcrumb; evaluation title, source, capture date and row count; optional AA-Briefcase component-index navigation; source notes; filter/search toolbar; sortable data table with source rank, provider, model, score and applicable evaluation-specific columns; Intelligence Index task-cost links; pagination.
- **Available actions and outcomes:** Search model names; filter by provider; clear filters; sort by available columns; change page size and page; follow source-rank, model-cost, source, or related-component links. An unknown evaluation slug calls the not-found page.
- **Associated overlays / inline companion surfaces:** FORM-003, MENU-001, MENU-003, FEEDBACK-004. No modal, drawer, or popover found.
- **Relevant loading states:** STATE-001.
- **Relevant empty states:** STATE-004.
- **Relevant error states:** PAGE-008; unknown slug resolves to PAGE-007.
- **Relevant permission/restricted states:** None found; public read surface. Data-source availability in deployment needs verification.
- **Redesign priority:** High.
- **Complexity:** High.
- **Notes:** A single data-driven template covers 19 current slugs; optional columns vary by evaluation. Primary evidence: `src/app/leaderboards/[evaluationSlug]/page.tsx`, `src/components/leaderboard.tsx`.

### PAGE-003 — About the data / methodology

- **Route/path:** `/about/data`
- **Purpose:** Explain source snapshots, metric meanings, matching rules, corrections, and update behavior.
- **User roles:** Public visitor.
- **Main sections and key UI elements:** Prose article; metric definitions; AA-Briefcase component methodology; master leaderboard explanation; workbook corrections; snapshot history and external methodology/source links.
- **Available actions and outcomes:** Follow the planner methodology, leaderboard, and external source links.
- **Associated overlays:** None found.
- **Relevant loading states:** STATE-001.
- **Relevant empty states:** None specific to this page.
- **Relevant error states:** PAGE-008.
- **Relevant permission/restricted states:** None found.
- **Redesign priority:** Medium.
- **Complexity:** Low.
- **Notes:** Long-form, mostly static content in a constrained prose layout. Primary evidence: `src/app/about/data/page.tsx`.

### PAGE-004 — Create a task suitability comparison

- **Route/path:** `/suitability`
- **Purpose:** Configure a task, select evaluation weights and candidate models, preview suitability results, and save a pinned comparison.
- **User roles:** Public visitor. Shared tasks can be seen and changed by any visitor; local browser save is also available.
- **Main sections and key UI elements:** Four numbered sections: task title/description; searchable evaluation checkbox picker and weight inputs; candidate model search/provider/favorites filters and selection list; save actions and comparison preview. A methodology section follows. Existing browser-saved tasks may show a sync-pending panel.
- **Available actions and outcomes:** Add/remove evaluations (which redistributes weights equally); manually edit weights, which must total 100%; search/filter candidate models; add/remove candidates and favorites; select/clear visible candidates or add favorites; calculate a live preview; save to shared storage, save only in the browser, or download a JSON backup. Saving routes to PAGE-006.
- **Associated overlays / inline companion surfaces:** FORM-001, DATA-003, DATA-006, MENU-001, MENU-002, FEEDBACK-001, FEEDBACK-002, FEEDBACK-003, FEEDBACK-004. No modal, drawer, or popover found.
- **Relevant loading states:** STATE-001, STATE-005.
- **Relevant empty states:** STATE-009; preview is withheld while the configuration is invalid (STATE-010).
- **Relevant error states:** STATE-010, STATE-012; save and favorite failures use FEEDBACK-002/003.
- **Relevant permission/restricted states:** No sign-in gate or permission-denied UI found. Shared-save availability depends on server configuration; needs verification in deployment.
- **Redesign priority:** High.
- **Complexity:** High.
- **Notes:** This is a four-section flow on one page, not separate wizard routes and not a native `<form>`. Primary evidence: `src/app/suitability/page.tsx`, `src/components/suitability-planner.tsx`, `src/components/suitability-comparison.tsx`.

### PAGE-005 — Saved tasks library

- **Route/path:** `/suitability/saved`
- **Purpose:** Find, reopen, back up, import, and sync shared or browser-local task comparisons.
- **User roles:** Public visitor. Shared library contents are visible to visitors; browser-only saves remain local to the current browser.
- **Main sections and key UI elements:** Library heading and explanation; create-task link; saved-task search; JSON backup file input; browser-save sync panel when applicable; saved task cards showing source captures, counts, leading candidate, preview status, open/download actions, and an inline `<details>` comparison disclosure.
- **Available actions and outcomes:** Search task titles/descriptions; import a JSON backup to browser storage; sync browser saves to the shared library; open a comparison at PAGE-006; download a backup; expand an individual comparison in place and retry loading its pinned results.
- **Associated overlays / inline companion surfaces:** FORM-004, DATA-004, FEEDBACK-001, FEEDBACK-002. File selection opens the browser/OS file picker, not an app-authored modal. No app modal, drawer, or popover found.
- **Relevant loading states:** STATE-001, STATE-005, STATE-007.
- **Relevant empty states:** STATE-006.
- **Relevant error states:** STATE-006, STATE-007; backup import and sync errors use FEEDBACK-002.
- **Relevant permission/restricted states:** None found. Shared list is presented as public; deployed policy needs verification.
- **Redesign priority:** High.
- **Complexity:** High.
- **Notes:** The card list combines task metadata, preview, on-demand detail loading, and recovery actions. No delete action is present in the reviewed UI. Primary evidence: `src/app/suitability/saved/page.tsx`, `src/components/suitability-planner.tsx`.

### PAGE-006 — Saved comparison detail and edit

- **Route/path:** `/suitability/[taskId]`
- **Purpose:** Review a saved comparison, inspect pinned results, download or sync it, and edit its configuration.
- **User roles:** Public visitor; saved records are shared and editable by visitors, with browser-local fallback when a shared record cannot be loaded or saved.
- **Main sections and key UI elements:** Breadcrumb; task title/description and counts; save-location status; edit/new-task/library links; backup and sync actions; suitability results table with expandable calculation breakdowns. Edit mode reuses the task-builder flow from PAGE-004.
- **Available actions and outcomes:** Enter edit mode; change and save settings (then remain on the task route); create another task; return to the library; download backup; sync a local copy; follow source leaderboard links; sort suitability or cost in the results table.
- **Associated overlays / inline companion surfaces:** FORM-001 (edit mode), DATA-003, MENU-001 (edit mode), FEEDBACK-001, FEEDBACK-002. Calculation breakdowns are inline disclosures, not popovers. No modal or drawer found.
- **Relevant loading states:** STATE-001, STATE-005.
- **Relevant empty states:** STATE-008 when the task ID cannot be resolved; STATE-010 while editing an invalid configuration. STATE-011 occurs in the unsaved preview on PAGE-004.
- **Relevant error states:** STATE-008, STATE-012; save/sync errors use FEEDBACK-002.
- **Relevant permission/restricted states:** No authorization UI found. A visitor can edit shared records per the app copy; confirm that this matches intended deployment policy.
- **Redesign priority:** High.
- **Complexity:** High.
- **Notes:** Detail is loaded by task ID, with a browser-local copy used as fallback. Primary evidence: `src/app/suitability/[taskId]/page.tsx`, `src/components/suitability-planner.tsx`, `src/components/suitability-comparison.tsx`.

### PAGE-007 — Not-found page

- **Route/path:** Next.js not-found boundary (also reached for an unknown evaluation slug)
- **Purpose:** Explain that a requested evaluation cannot be found and return the visitor to the catalog.
- **User roles:** Public visitor.
- **Main sections and key UI elements:** Panel with “Evaluation not found” heading and a link to `/`.
- **Available actions and outcomes:** Browse evaluations returns to PAGE-001.
- **Associated overlays:** None found.
- **Relevant loading states:** STATE-001 before resolution, where applicable.
- **Relevant empty states:** Not applicable.
- **Relevant error states:** This is the not-found response itself; PAGE-008 is a separate runtime error boundary.
- **Relevant permission/restricted states:** None found.
- **Redesign priority:** Medium.
- **Complexity:** Low.
- **Notes:** Copy refers specifically to evaluations even when Next.js uses the page for other unmatched paths. Primary evidence: `src/app/not-found.tsx`.

### PAGE-008 — Application error boundary

- **Route/path:** `src/app/error.tsx` boundary for route rendering/data errors
- **Purpose:** Provide a retry action when the page cannot load snapshot data.
- **User roles:** Public visitor.
- **Main sections and key UI elements:** Error panel, explanatory text, “Try again” button.
- **Available actions and outcomes:** Retry invokes the route boundary reset.
- **Associated overlays:** None found.
- **Relevant loading states:** STATE-001 may precede an error.
- **Relevant empty states:** Not applicable.
- **Relevant error states:** The boundary is the error surface; inline workflow errors are FEEDBACK-002.
- **Relevant permission/restricted states:** No permission-specific variant found.
- **Redesign priority:** Medium.
- **Complexity:** Low.
- **Notes:** Shared route error UI. Primary evidence: `src/app/error.tsx`.

## Part 2: Surface inventory tables

### App Shell / Layouts

| ID | Name | Type | Route/path or trigger | Where used / related page IDs | Current implementation type | Redesign priority | Complexity | Notes |
|---|---|---|---|---|---|---|---|---|
| LAYOUT-001 | Global site shell | Layout | Every app route | PAGE-001–PAGE-008 | Shared component/layout | High | Medium | Brand link, four-link main navigation, centered main region, footer. No separate auth/settings layout or mobile navigation drawer found. Narrow-screen behavior needs visual verification. |

### Modals / Dialogs / Popups

| ID | Name | Type | Route/path or trigger | Where used / related page IDs | Current implementation type | Redesign priority | Complexity | Notes |
|---|---|---|---|---|---|---|---|---|
| — | No authored modal/dialog/popup found | None identified | Reviewed routes and components | PAGE-001–PAGE-008 | Unknown / none found | — | — | No `<dialog>`, dialog role, confirmation dialog, or modal wrapper found. Preview and errors render inline. |

### Drawers / Sheets / Side Panels

| ID | Name | Type | Route/path or trigger | Where used / related page IDs | Current implementation type | Redesign priority | Complexity | Notes |
|---|---|---|---|---|---|---|---|---|
| — | No drawer/sheet/side panel found | None identified | Reviewed routes and components | PAGE-001–PAGE-008 | Unknown / none found | — | — | Navigation and filters remain in page flow; no slide-in panel implementation found. |

### Menus / Dropdowns / Popovers

| ID | Name | Type | Route/path or trigger | Where used / related page IDs | Current implementation type | Redesign priority | Complexity | Notes |
|---|---|---|---|---|---|---|---|---|
| MENU-001 | Provider filter select | Native dropdown | Provider filter control | PAGE-001, PAGE-002, PAGE-004 | One-off | Medium | Low | Browser-native `<select>` with provider options; no custom popover/menu layer. |
| MENU-002 | Model view select | Native dropdown | Choose all/favorites view | PAGE-001, PAGE-004 | One-off | Medium | Low | Master table uses “All models / Favorites only”; candidate picker uses “All models / Favorites.” |
| MENU-003 | Page-size select | Native dropdown | Rows-per-page control | PAGE-001, PAGE-002 | One-off | Low | Low | Options differ slightly by table. Column sorting uses header buttons rather than a dropdown. |

### Notifications / Feedback

| ID | Name | Type | Route/path or trigger | Where used / related page IDs | Current implementation type | Redesign priority | Complexity | Notes |
|---|---|---|---|---|---|---|---|---|
| FEEDBACK-001 | Informational and success status | Inline status message | Selection changes, saves, imports, sync, save-location state | PAGE-004–PAGE-006 | One-off | High | Medium | Uses inline text and `role="status"`; no toast/snackbar system found. |
| FEEDBACK-002 | Workflow and data error | Inline alert | Shared load/save, browser storage, backup import, pinned comparison errors | PAGE-004–PAGE-006 | One-off | High | Medium | Uses inline text/panels and `role="alert"`; retry controls appear for selected load failures. |
| FEEDBACK-003 | Favorite persistence error | Inline status | Browser favorite write fails | PAGE-001, PAGE-004 | One-off | Medium | Low | Separate local-storage failure message; favorites remain browser-local. |
| FEEDBACK-004 | Live result and selection count | Live count feedback | Search/filter/selection changes | PAGE-001, PAGE-002, PAGE-004 | One-off | Medium | Low | Result totals, favorite totals, weight total, and candidate selection count use live text, including `aria-live` in key locations. |

### Forms / Inputs / Multi-step Flows

| ID | Name | Type | Route/path or trigger | Where used / related page IDs | Current implementation type | Redesign priority | Complexity | Notes |
|---|---|---|---|---|---|---|---|---|
| FORM-001 | Task suitability configuration flow | Multi-section create/edit flow | Create task or edit saved comparison | PAGE-004, PAGE-006 | One-off | High | High | Four numbered sections: title/description; evaluation selection/weights; candidate selection; save/compare. Inline controls; no separate wizard steps or `<form>` wrapper. |
| FORM-002 | Master leaderboard search and filters | Search/filter/sort/page controls | Master leaderboard toolbar and table | PAGE-001 | One-off | High | Medium | Search, provider, favorites-only, sortable columns, page size, pagination, clear filters, and shareable URL state (“Link to this view”). |
| FORM-003 | Individual leaderboard search and filters | Search/filter/sort/page controls | Evaluation leaderboard toolbar and table | PAGE-002 | One-off | High | Medium | Search, provider, sortable columns, page size, pagination, and clear filters; query parameters preserve the view. |
| FORM-004 | Saved task search and backup import | Search and file input | Library toolbar | PAGE-005 | One-off | Medium | Medium | Search titles/descriptions and import JSON backup into local browser storage; import validation errors are inline. |

### Tables / Lists / Data Views

| ID | Name | Type | Route/path or trigger | Where used / related page IDs | Current implementation type | Redesign priority | Complexity | Notes |
|---|---|---|---|---|---|---|---|---|
| DATA-001 | Master leaderboard | Cross-evaluation data table | Home page | PAGE-001 | Shared component | High | High | Models by rows, evaluations by columns; source-rank and cost links, favorites, filters, sorting, pagination, and horizontal scrolling. |
| DATA-002 | Individual evaluation leaderboard | Source ranking table | Evaluation detail route | PAGE-002 | Shared component | High | High | Columns vary by evaluation; includes rank, provider, model, score, optional status/interval/date, cost, sorting and pagination. |
| DATA-003 | Suitability comparison results | Comparison data table | Preview, saved comparison, or expanded library detail | PAGE-004–PAGE-006 | Shared component | High | High | Sort by suitability/cost, optional complete-coverage filter, evaluation columns, and inline calculation breakdown disclosures. |
| DATA-004 | Saved task library | Card/list view | Saved tasks route | PAGE-005 | One-off | High | High | Cards combine task summary, pinned capture metadata, leading model preview, backup/open actions, and optional inline result disclosure. No delete action found. |
| DATA-005 | Evaluation catalog | Card list | Home page below master table | PAGE-001 | One-off | Medium | Medium | Card per evaluation, with category, metric/source label, row count, and detail link. Current checked-in catalog has 19 routes. |
| DATA-006 | Candidate model picker | Searchable selectable list | Step 3 of task builder | PAGE-004, PAGE-006 edit mode | One-off | High | High | Model/provider text, selection checkbox, favorite control, visible/selected bulk actions and selected-model chips. |

### Empty / Loading / Error States

| ID | Name | Type | Route/path or trigger | Where used / related page IDs | Current implementation type | Redesign priority | Complexity | Notes |
|---|---|---|---|---|---|---|---|---|
| STATE-001 | Route data loading | Loading | Next.js route loading boundary | PAGE-001–PAGE-008 | One-off | Medium | Low | `src/app/loading.tsx` shows “Loading leaderboard data…”. |
| STATE-002 | Home master table loading | Loading | Home Suspense fallback | PAGE-001 | One-off | Medium | Low | Text fallback “Loading master leaderboard…”. |
| STATE-003 | No evaluation snapshot | Empty catalog | Home when evaluations are empty | PAGE-001 | One-off | Medium | Low | Explains that an import is needed to populate the catalog. |
| STATE-004 | No matching leaderboard rows | Empty results | Search/filter yields zero models | PAGE-001, PAGE-002 | One-off pattern | Medium | Low | Inline table row asks visitor to clear filters or broaden the query. |
| STATE-005 | Suitability task data loading | Loading | Planner initializes browser/shared task data | PAGE-004–PAGE-006 | One-off | Medium | Medium | Plain loading text before the task builder, library, or detail content appears. |
| STATE-006 | Saved library empty/unavailable | Empty/error variants | No saved tasks, no search matches, or shared library unavailable | PAGE-005 | One-off | High | Medium | Distinct copy for no tasks, no search results, and shared-list failure; browser copies may still be shown. |
| STATE-007 | Deferred library comparison loading/error | Inline loading/error | Expand a saved task's comparison or request its backup | PAGE-005 | One-off | Medium | Medium | Per-card loading text, error alert, and retry action. |
| STATE-008 | Saved comparison unavailable | Missing-data error | Task ID does not resolve from shared or browser storage | PAGE-006 | One-off | High | Medium | Offers a return link to the saved task library. |
| STATE-009 | Candidate picker has no matches | Empty picker | Search/provider/favorites filters yield no candidates | PAGE-004, PAGE-006 edit mode | One-off | Medium | Low | Inline message links to the master leaderboard to build a favorites list. |
| STATE-010 | Suitability configuration incomplete/invalid | Validation state | Missing title, request, evaluation, candidate, or valid 100% weights | PAGE-004, PAGE-006 edit mode | One-off | High | Medium | Inline requirements explain what is needed; preview and save buttons remain disabled until valid. |
| STATE-011 | No complete-coverage candidates | Empty filtered results | Enable “Complete coverage only” with no full-coverage result | PAGE-004 preview | One-off | Medium | Low | Inline message below comparison table. |
| STATE-012 | Pinned comparison calculation unavailable | Data error | Calculation fails for missing/corrupt pinned data | PAGE-004–PAGE-006 | One-off | High | Medium | Error is shown inline; no dedicated full-screen failure state. |

No permission-denied or role-restricted state was found. Whether the deployed shared-task endpoint and published evaluation reads should be restricted is **Needs verification**.

## Final summary

### Total number of identified surfaces

**38 distinct inventory entries**: 8 page templates, 1 layout, 0 authored modals, 0 drawers, 3 menus, 4 feedback patterns, 4 forms, 6 data views, and 12 states. The 19 evaluation-detail slugs are instances of PAGE-002, not separate templates. The number of saved-task detail instances is data-dependent.

### Highest-priority pages

- PAGE-001 — Home and master leaderboard
- PAGE-002 — Individual evaluation leaderboard
- PAGE-004 — Task suitability builder
- PAGE-005 — Saved tasks library
- PAGE-006 — Saved comparison detail/edit

### Highest-priority overlays/popups

No authored overlays or popups were found. Highest-priority related interaction patterns are MENU-001 (provider select), MENU-002 (favorites/model view select), and the inline FEEDBACK-001/002 status and error messages. Native controls and inline disclosures are the current implementations.

### Shared patterns to standardize first

- Global page container, shell navigation, and responsive header behavior (LAYOUT-001)
- Search/filter toolbars and native select controls (FORM-002, FORM-003, MENU-001–003)
- Table wrapper, sortable headers, horizontal scrolling, pagination, and empty rows (DATA-001–003, STATE-004)
- Form field, validation, and helper/error message pattern for the suitability flow (FORM-001, STATE-010, FEEDBACK-002)
- Candidate selection list and bulk actions (DATA-006)
- Inline status/error feedback and live result counts (FEEDBACK-001–004)
- Saved-task card, deferred details, and backup/sync actions (DATA-004, STATE-006–007)

### Surfaces that need verification

- Responsive navigation and data-table behavior at real mobile widths.
- Whether production access rules intentionally allow every visitor to create and edit shared tasks and read published evaluation data.
- Whether the checked-in 19-evaluation catalog matches the deployed runtime catalog.
- The rendered behavior of browser-local storage failures, backup import errors, and shared database outages across supported browsers.

### Recommended migration groups

1. **App shell and navigation:** LAYOUT-001, PAGE-007, PAGE-008.
2. **Core browsing pages:** PAGE-001, PAGE-002, DATA-001, DATA-002, DATA-005, FORM-002, FORM-003, MENU-001–003, STATE-002–004.
3. **Suitability forms and picker:** PAGE-004, FORM-001, DATA-006, STATE-009–010, FEEDBACK-001–004.
4. **Comparison data view:** DATA-003, STATE-011–012, including inline calculation disclosures.
5. **Saved task library and detail:** PAGE-005, PAGE-006, DATA-004, FORM-004, STATE-005–008.
6. **Shared loading and recovery states:** STATE-001, PAGE-008, FEEDBACK-002; align retry and unavailable-data handling across routes.

## Evidence reviewed

Route and shell files: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/leaderboards/[evaluationSlug]/page.tsx`, `src/app/about/data/page.tsx`, `src/app/suitability/page.tsx`, `src/app/suitability/saved/page.tsx`, `src/app/suitability/[taskId]/page.tsx`, `src/app/loading.tsx`, `src/app/error.tsx`, `src/app/not-found.tsx`.

Primary UI components: `src/components/master-leaderboard.tsx`, `src/components/leaderboard.tsx`, `src/components/suitability-planner.tsx`, `src/components/suitability-comparison.tsx`.

Catalog count: checked-in `data/leaderboards.json` (19 evaluation records). The API route was consulted only to understand task-load/save error states: `src/app/api/suitability/tasks/route.ts`.
