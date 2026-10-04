# Saved tasks: collapsible categories and task ordering

Status: proposed implementation brief only. No application changes yet.

## Intended behavior

- Make every category heading, including Uncategorized, a collapse/expand button with a chevron and the existing task count. Collapsing hides its task boxes; expanding restores them in their saved order. Categories start expanded until a preference is saved.
- Add compact up/down arrow buttons to each task box using the existing quiet-button styling. Each click moves the entire box one position within its category. Repeated clicks can move it to the very top or bottom; disable the corresponding arrow at either boundary. A one-task category has both arrows disabled.
- Save both task order and category collapse state automatically. Restore the saved layout after hard refresh and in another browser.
- Preserve existing category sequence (alphabetical, Uncategorized last), card design, comparison previews, search, filters, and category management. Moving category headings themselves is outside this scope.

## Persistence and scope

The current library has shared Firestore tasks and categories without user accounts. Proposed default: the layout is also shared across browsers and all visitors. A private per-person preset would require an identity/account feature and is outside this brief.

Store layout metadata separately from task comparison data: one record per stable category ID, including a reserved Uncategorized key, containing ordered shared-task IDs, collapsed state, and a revision. Use a server API with uncached reads and transactional writes. Send move operations and explicit collapsed-state values with the expected revision; reject stale changes, reload the latest layout, and show a retry message rather than silently overwriting another browser's changes. Update only the relevant layout fields.

Browser-only tasks retain their local-save status and local order until synced. Explain that their order cannot follow them to another browser until shared sync succeeds; never claim a local save is a cross-browser save.

## Implementation outline

1. Extend the grouping logic in `src/lib/suitability-categories.ts` to apply stored order before search/filtering. For categories without a preset, retain today's latest-update-first order with task ID as a tie-breaker. When first saving an order, capture the full category sequence. Append newly saved or newly assigned tasks at the bottom; ordinary task edits must not change an established order.
2. Add layout storage and an API under `src/app/api/suitability/`. Validate IDs, category membership, revisions, and request size. Reconcile missing/new IDs against current membership; remove obsolete references and append tasks entering a category. Category renames preserve layout through stable IDs; deleted categories' tasks append to Uncategorized. Keep layout writes separate from comparison saves and pinned results.
3. Load the layout in `src/components/suitability-planner.tsx`. Add accessible heading buttons (`aria-expanded`, `aria-controls`) and labeled task arrows, preserving keyboard focus after movement. Match existing typography, spacing, colors, borders, and responsive controls in `suitability-planner.module.css`; inspect the live screen before UI implementation.
4. Disable task reordering while text search is active, with a short “Clear search to reorder tasks” hint, so hidden tasks cannot make a move ambiguous. Category filtering alone can retain reordering because the full selected category remains visible. Searching temporarily expands matching groups without changing their saved collapse preference.
5. Apply moves/toggles immediately with a pending indicator, prevent overlapping saves for the same category, and confirm only after the server succeeds. On failure, restore the last confirmed layout and show a retryable error. If layout data is unavailable, show the library with default ordering and allow temporary local collapse without claiming persistence; disable shared order writes until recovery.

## Verification before release

- Move tasks repeatedly from bottom to top and back within each category; verify boundary buttons and that tasks never cross categories.
- Collapse/expand several categories, then hard refresh and open another browser: confirmed shared order and collapse preferences must match.
- Check search, category filtering, new tasks, task edits, category reassignment/rename/deletion, and browser-task sync against the ordering rules above.
- Test failed saves and conflicting edits from two browsers; preserve the last confirmed layout and comparison data.
- Verify keyboard operation, focus, accessible button names, narrow-screen layout, spacing, and visual consistency; run focused grouping/API checks and the project build.
