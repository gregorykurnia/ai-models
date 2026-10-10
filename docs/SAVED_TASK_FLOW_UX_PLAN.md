# Saved tasks flow UX plan

Date: 10 October 2026. Scope: the Saved tasks library (`/suitability/saved`), the saved-task review page (`/suitability/[taskId]`), and the create/edit form (`/suitability`).

Status: Phases 1–3 are implemented and pushed to `main`. Phase 4 is parked (decision 4). Line references describe the code before this work and may have moved. Shipping record and open issues are at the end of this document.

## Problems and current paths

| Problem | Steps today | Why it happens | Evidence |
| --- | --- | --- | --- |
| Editing settings takes too many steps | Open comparison → Edit settings → Save → Saved tasks library (4 clicks, 3 page changes) | Edit exists only on the review page. Saving returns to the review page, not to the library. | `:1191` Edit settings; `:827-829` save returns to review; `:1209` library link |
| Implementor needs a detour and cannot be set while creating or editing | Review comparison in place → optional model pick → Choose as implementor | The only writer is `handleSetImplementor`, reached only from the in-place panel. The editor already reads and saves `implementorModelId`, but has no control to change it. | `:475` state; `:565` load; `:694` cleared on deselect; `:785` saved; `:935` writer; `:237` button |
| No way to delete a saved task | None | No delete control exists. The tasks API has GET and POST, and PATCH exists only for category. `removeBrowserTask` runs only after sync, and only removes a copy whose `updated_at` matches. No earlier plan specified deletion. | `src/app/api/suitability/tasks/route.ts`; `src/app/api/suitability/tasks/[taskId]/category/route.ts`; `src/lib/browser-suitability-tasks.ts` |

Also, the card has three routes to one comparison table: the title link (`:377`), Open comparison (`:418`), and Review comparison in place (`:434`). The first two both open the full page.

## Recommended changes

### A. Edit settings from the library card

- Add an **Edit settings** button to each library card, beside Open comparison at the same weight (decision 1). It links to `/suitability/{id}?edit=1&returnTo={libraryPath}`. This works for browser-only tasks too.
- The planner opens the editor when `edit=1` is present. The mount effect at `:546` calls `setEditing(false)` on every path change, so the flag must be applied after that effect runs. Setting it only in the initial `useState` value is overwritten.
- When the editor was opened from the library, Save returns to `returnTo` (the library with its search and category filters), not to the review page. The confirmation appears there (see risk 1).
- Cancel editing returns to the library when that is where the user came from.
- Direct visits to the review page keep their current Edit settings button.

Result: Edit settings → change → Save, with the user back in the library. This replaces four clicks and two page changes.

### B. Implementor: set it while creating and editing

**Phase 1 (recommended, UI only):** add an **Implementor** select in step 3, under the selected-model chips. The first option is "None: show leading candidate", which is the default (decision 2). The other options are each currently selected model. Deselecting the chosen model already clears it (`:694`).

- The state (`:475`), dirty check (`:664`), and save payload (`:785`) already handle the implementor. Only the control is missing.
- Use a select, not a radio on each chip. The chips are compact buttons with a × control, and a select matches the Model select in `SelectedModelDetails`.
- Keep the in-place "Choose as implementor" path working unchanged.

**Card-level picker (parked, decision 4):** a picker on the card itself. It would need candidate options in the library summary (`savedTaskSummarySchema` in `src/lib/suitability-storage.ts`), written by POST. Legacy tasks without that field would fall back to loading the comparison. Until this exists, Edit settings is the card's route to a new implementor.

### C. Delete a saved task

Soft-delete on the shared side, plus an unconditional local removal.

**Shared side:** new `DELETE /api/suitability/tasks/[taskId]`.

- Body: `expected_updated_at`, the value the card shows. If the stored value differs, return 409 with "This task changed in another tab. Reload the library before deleting." This stops a delete from removing a version someone just edited.
- In one transaction: remove `active_version` and set `deleted_at`. Removing `active_version` takes the task out of the library (GET filters on it, `tasks/route.ts:74`), out of layout membership (`layout/route.ts:44`), and makes GET by ID return 404 (`tasks/route.ts:64`). No layout write is needed.
- After the transaction commits, purge every `versions/*` document and its `entryChunks`. The existing `removeVersion` helper handles one version, so the purge must list all versions first.
- Keep the top-level document as a tombstone. A stale tab or another browser's copy must not recreate the task (risk 3).

**Local side:** add `deleteBrowserTask(taskId)`, which removes the IndexedDB record and the legacy localStorage record without the `updated_at` guard. Do not reuse `removeBrowserTask`, since that guard exists to protect newer copies during sync.

**UI:**

- Add **Delete** to each card and to the review page toolbar. Style and placement follow "Design guidelines" below: quiet compact with danger text on cards, the shared `destructive` variant on the review page. Never put it next to Edit settings.
- Confirm with `window.confirm`, matching the category delete at `:892`. Copy: `Delete "{title}"? Its shared copy and any copy saved in this browser will be removed. This cannot be undone.`
- On the review page, go to the library after delete and show "Deleted {title}." On the library, remove the card immediately.

**Not chosen:** a hard delete with Firestore `recursiveDelete`. The installed `@google-cloud/firestore` 7.11.6 supports it, but a hard delete would also erase the tombstone that prevents resurrection. It can be used later for a purge.

## Risks found in the current code

1. **Notices are lost on navigation.** The planner clears `notice` on every path change (`:546`), and the library and review pages are separate routes. A "Saved" or "Deleted" message shown after returning to the library needs a query parameter, such as `?notice=saved`, or sessionStorage, read on mount.
2. **Sync stops at the first error.** `syncBrowserTasks` (`:711-762`) wraps the whole loop in one try. If one task is rejected, every later browser copy is left unsynced. Sync must handle a per-task "deleted" response: skip that copy and report it.
3. **Deleted tasks can come back.** POST writes the whole document when none exists (`tasks/route.ts:178`), and nothing checks for a deleted task. Two paths would recreate one: a browser copy from another device syncing later, and an editor open in another tab that saves. POST should return 409 when `deleted_at` is set, and the editor should say "This task was deleted from the shared library."
4. **Save writes a browser copy before the shared POST.** `save()` writes locally first (`:800`), then calls the shared save (`:807`). If the shared save returns 409, the current message would still read "Saved in this browser · shared sync pending." The 409 path must remove the copy just written, or report the deletion clearly.
5. **Browser copies of deleted tasks on other devices (decision 3: keep local-only, with a notice).** The copy cannot sync (risk 2). It is never discarded automatically, since it may hold edits. Required behavior:
   - Sync skips these copies instead of failing. The sync notice reports how many were kept because they were deleted from the shared library.
   - The sync result (409 "deleted") must mark the local copy, and the marker must survive reloads. The shared list alone cannot tell a deleted copy from one that has never synced.
   - The library labels the card "Deleted from shared library · kept in this browser," not "Sync pending."
   - Its actions are Download backup and Delete. Delete removes only this browser's copy and makes no server call.
   - Editing it keeps it local. The save message must say so and must not promise a shared sync.
   - Out of scope for phase 3: a "Save as new shared task" action. The existing copy-on-conflict path (`:727-733`, " (browser copy)" suffix) could support it later.
6. **Layout depends on `active_version`.** Layout membership checks that field (`layout/route.ts:44`). Soft-delete relies on this. Changing the field name or its check requires updating `collectMembership` too.

## Design guidelines (AGENTS.md UI rule)

Sources: `design-md/ULTRAMARINE_LEDGER_FOUNDATION.md`, `ULTRAMARINE_LEDGER_COMPONENTS.md`, `SAVED_TASK_ENTRY_AUDIT.md`, and the existing card CSS (`src/components/suitability-planner.module.css`, `.taskActions` at ~1178). The goal is that every new control looks like it was always part of the card. Inspect the current screen before each phase, and stop and propose an alternative if a change weakens the layout.

**General rules**
- Reuse existing components and tokens only. No new colors, radii, shadows, or type sizes; use `var(--space-*)`, `var(--text-*)`, `var(--danger-text)`, and the shared font-size tokens already used in the module.
- No new patterns: no modal, menu, or toast component. Confirmations use `window.confirm` (as for categories), and messages use the existing `Alert`.
- Cards stay white, 1px border, 12px radius, no shadow, with no nested cards.
- Button text is a short verb phrase, 14px/20px, no capitals styling. One emphasis level per action group.

**Card action area (library)**
- Keep the existing `.taskActions` flex-wrap row (gap `--space-2` / `--space-4`). Order: Edit settings, Open comparison, Download backup, then Change category and Order, as today.
- Edit settings and Open comparison are both `secondary` at the default 44px size. Download backup stays `quiet`, compact. Do not add a primary button to the card (decision 1).
- Delete goes in its own row below the actions, separated by the card's normal 16px gap, aligned to the end. A filled red `destructive` button repeated on every card would be loud, so use a `quiet` compact button with `--danger-text` colour, the same token the inline category error uses. The review-page toolbar may use the shared `destructive` variant because it appears once. If the quiet red looks weak or off-style when checked in the browser, fall back to `destructive` rather than inventing a style.
- Keep the card compact. The audit targets roughly 260–320px collapsed height on desktop; adding a row must not push it far past that. If it does, drop the separate Delete row and place Delete at the end of the existing action row instead.
- Errors (failed delete or save) use the existing `.taskActionError` Alert directly under the actions, never a second copy elsewhere in the card.
- Loading uses the button's own `loading` state, which preserves width. Disable the card's other actions while a delete is pending.

**Implementor select (form, step 3)**
- Use `FormField` with a persistent label "Implementor" and helper text "Optional. Shown on the saved task card." Place it directly under the selected-model chips with 16px between fields.
- Default `Select` height 44px, full field width, with options "None: show leading candidate" and then selected models as "Model · Provider", matching the Model select in `SelectedModelDetails`.
- Disable it, with helper text "Select at least one model first", when no model is selected. Never show an empty chooser.
- In step 4 (the summary), add one line "Implementor: {model or leading candidate}" in the same style as the existing evaluation and candidate count line.

**Edit entry and return flow**
- The editor opened from the library keeps its current layout. Change only the top toolbar link to "Back to saved tasks" and have Cancel editing use the same destination.
- After Save from the library flow, the confirmation is the existing `Alert` (tone success, `role="status"`) at the top of the library list, above the results status row. It disappears on the next navigation; no new toast.
- Preserve focus: after returning, focus lands on the edited task's title link, so keyboard users keep their place.

**Kept-local copy (risk 5)**
- Use the existing neutral `Badge` in the card header in place of "This browser", reading "Kept in this browser", with an info `Alert` line in the card explaining it was deleted from the shared library. Do not use warning/error tones for a state the user chose.

**Responsive and accessibility checks**
- Verify at 320, 375, 768, 1024, and wide desktop, and at 200% zoom. No page-wide horizontal overflow; actions wrap onto new lines rather than shrinking.
- Touch targets stay at least 44px (compact 40px only with enough spacing, as on desktop). On phones, stack the action row and let Edit settings and Open comparison fill the row width.
- Every new control has a task-specific accessible name, for example "Edit settings for {title}" and "Delete {title}", since many cards share the same labels.
- Keyboard order follows visual order; focus rings are the shared ones; announce results of edit, implementor change, and delete through the existing `role="status"` alert.
- Check light-mode contrast for the danger-text colour on the white card.

**Visual verification before each phase is called done**
- Screenshot the library, review page, and editor before and after at the widths above, and compare against the current design: spacing, alignment, button sizes, and card height. Fix any drift before committing.

## Phases

1. **Implementor select in the editor.** UI only; the data path already exists.
2. **Edit settings from the library**, including return to the library and a notice that survives navigation.
3. **Delete.** Add the DELETE route, the tombstone guard on POST and GET, the local delete helper, per-task sync handling, the local-only label for kept copies (risk 5), and the card and review-page controls.
4. **Parked:** card-level implementor picker (decision 4). Revisit after phases 1–3 ship.

Phases 1 and 2 do not touch the server. Each phase can ship on its own.

## Verification

- **Unit tests** (`node:test`, in `tests/`, matching the existing suites): the tombstone guard in POST; per-task handling in sync; `deleteBrowserTask` removing both IndexedDB and localStorage copies; deleted tasks excluded from layout membership.
- **Manual flows:** edit from the library, then Save returns to the library with the notice; set the implementor during create and during edit; delete with and without a browser copy; delete a task that is open in another tab; sync with a tombstoned browser copy, which should be skipped, labeled, and kept; download backup still works.
- **Regression:** pinned ranks and costs are unchanged after an edit or implementor change, which both go through `saveSharedTask`. Category revision conflicts still return 409.

## Decisions

Recorded 10 October 2026.

1. **Edit settings weight: equal to Open comparison.** Both are `secondary`, with Edit settings beside Open comparison. The card's main job is showing the result, and the entry audit makes Open comparison the principal action. Equal weight still gives one-click access from the first screen.
2. **Implementor default for new tasks: none.** The form starts with "None: show leading candidate." A stored default would turn a computed guess into a permanent choice, and the card would keep saying "Chosen implementor" even though nobody chose it. When no implementor is set, the saved preview falls back to the leader (`src/app/api/suitability/tasks/route.ts:134-136`).
3. **Browser copies of a deleted task on another device: keep local-only, with a notice.** Required behavior is listed under risk 5.
4. **Card-level implementor picker: parked.** Revisit after phases 1–3 ship. It needs candidate options in the library summary and a backfill for existing tasks, and Edit settings already covers the job from the card.

## Shipped

| Change | Commit |
| --- | --- |
| Phase 1: implementor select in the editor | `16c9110` |
| Phase 2: Edit settings from the library, with return and notice | `68d4e59` |
| Phase 3, shared side: DELETE route, tombstone guard, layout exclusion | `e8363b1` |
| Phase 3, local side and UI: deleteBrowserTask, per-copy sync, kept copies, delete controls | `abc54f2` |
| Sync: a failed copy is reported by title and the rest still sync; a 503 stops the run | `b4248de` |
| Inline category error uses the defined `--error` token | `2035970` |
| Emulator check for the shared saved-task routes | `89a1e42` |
| Planner browser check updated; saves stay in this browser | `a6cb6bc` |

Verification:
- Unit tests: `npx tsx --test tests/suitability*.test.ts` (28 pass).
- `npm run build` passes.
- Firestore emulator (`scripts/check-suitability-emulator.ts`): 9 checks pass, covering save, library and layout membership, stale and current delete, tombstone guard, repeated delete, and purge of active and leftover versions and their chunks.
- Browser checks run with shared writes mocked, so no shared data was written.
- Not yet run against the live database.

## Open issues found while shipping

- **Uncategorized layout writes fail.** The layout document stores the Uncategorized group under the key `__uncategorized__`. Firestore reserves field names that begin and end with double underscores, so reordering or collapsing the Uncategorized group returns 503 (`INVALID_ARGUMENT`). Fixing it means changing the stored key format, so it's not done.
- **Category assignment on a deleted or missing task returns 503, not 404.** The route throws "could not be found", and its status mapping matches "not found". The refusal is correct; only the status code is wrong.
- **Sync still has a long wait on network failure.** A network failure is recorded per copy, so an outage runs through every copy, each up to the 30-second request timeout.
- **Phase 4 (card-level implementor picker)** remains parked.
