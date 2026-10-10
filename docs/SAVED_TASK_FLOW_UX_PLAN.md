# Saved tasks flow UX plan

Date: 10 October 2026. Scope: the Saved tasks library (`/suitability/saved`), the saved-task review page (`/suitability/[taskId]`), and the create/edit form (`/suitability`).

This is a plan only. No application code, stored data, or API behavior has been changed. Line references are to `src/components/suitability-planner.tsx` unless another file is named.

## Problems and current paths

| Problem | Steps today | Why it happens | Evidence |
| --- | --- | --- | --- |
| Editing settings takes too many steps | Open comparison → Edit settings → Save → Saved tasks library (4 clicks, 3 page changes) | Edit exists only on the review page. Saving returns to the review page, not to the library. | `:1191` Edit settings; `:827-829` save returns to review; `:1209` library link |
| Implementor needs a detour and cannot be set while creating or editing | Review comparison in place → optional model pick → Choose as implementor | The only writer is `handleSetImplementor`, reached only from the in-place panel. The editor already reads and saves `implementorModelId`, but has no control to change it. | `:475` state; `:565` load; `:694` cleared on deselect; `:785` saved; `:935` writer; `:237` button |
| No way to delete a saved task | None | No delete control exists. The tasks API has GET and POST, and PATCH exists only for category. `removeBrowserTask` runs only after sync, and only removes a copy whose `updated_at` matches. No earlier plan specified deletion. | `src/app/api/suitability/tasks/route.ts`; `src/app/api/suitability/tasks/[taskId]/category/route.ts`; `src/lib/browser-suitability-tasks.ts` |

Also, the card has three routes to one comparison table: the title link (`:377`), Open comparison (`:418`), and Review comparison in place (`:434`). The first two both open the full page.

## Recommended changes

### A. Edit settings from the library card

- Add an **Edit settings** button to each library card, beside Open comparison. It links to `/suitability/{id}?edit=1&returnTo={libraryPath}`. This works for browser-only tasks too.
- The planner opens the editor when `edit=1` is present. The mount effect at `:546` calls `setEditing(false)` on every path change, so the flag must be applied after that effect runs. Setting it only in the initial `useState` value is overwritten.
- When the editor was opened from the library, Save returns to `returnTo` (the library with its search and category filters), not to the review page. The confirmation appears there (see risk 1).
- Cancel editing returns to the library when that is where the user came from.
- Direct visits to the review page keep their current Edit settings button.

Result: Edit settings → change → Save, with the user back in the library. This replaces four clicks and two page changes.

### B. Implementor: set it while creating and editing

**Phase 1 (recommended, UI only):** add an **Implementor** select in step 3, under the selected-model chips. Options: "None: show leading candidate", then each currently selected model. Deselecting the chosen model already clears it (`:694`).

- The state (`:475`), dirty check (`:664`), and save payload (`:785`) already handle the implementor. Only the control is missing.
- Use a select, not a radio on each chip. The chips are compact buttons with a × control, and a select matches the Model select in `SelectedModelDetails`.
- Keep the in-place "Choose as implementor" path working unchanged.

**Phase 2 (optional):** a card-level picker. This needs candidate options in the library summary (`savedTaskSummarySchema` in `src/lib/suitability-storage.ts`), written by POST. Legacy tasks without that field would fall back to loading the comparison. Until this exists, Edit settings is the card's route to a new implementor.

### C. Delete a saved task

Soft-delete on the shared side, plus an unconditional local removal.

**Shared side:** new `DELETE /api/suitability/tasks/[taskId]`.

- Body: `expected_updated_at`, the value the card shows. If the stored value differs, return 409 with "This task changed in another tab. Reload the library before deleting." This stops a delete from removing a version someone just edited.
- In one transaction: remove `active_version` and set `deleted_at`. Removing `active_version` takes the task out of the library (GET filters on it, `tasks/route.ts:74`), out of layout membership (`layout/route.ts:44`), and makes GET by ID return 404 (`tasks/route.ts:64`). No layout write is needed.
- After the transaction commits, purge every `versions/*` document and its `entryChunks`. The existing `removeVersion` helper handles one version, so the purge must list all versions first.
- Keep the top-level document as a tombstone. A stale tab or another browser's copy must not recreate the task (risk 3).

**Local side:** add `deleteBrowserTask(taskId)`, which removes the IndexedDB record and the legacy localStorage record without the `updated_at` guard. Do not reuse `removeBrowserTask`, since that guard exists to protect newer copies during sync.

**UI:**

- Add **Delete** to each card and to the review page toolbar. Use the existing `destructive` button variant, compact size. Put it in its own footer row, never next to Edit settings.
- Confirm with `window.confirm`, matching the category delete at `:892`. Copy: `Delete "{title}"? Its shared copy and any copy saved in this browser will be removed. This cannot be undone.`
- On the review page, go to the library after delete and show "Deleted {title}." On the library, remove the card immediately.

**Not chosen:** a hard delete with Firestore `recursiveDelete`. The installed `@google-cloud/firestore` 7.11.6 supports it, but a hard delete would also erase the tombstone that prevents resurrection. It can be used later for a purge.

## Risks found in the current code

1. **Notices are lost on navigation.** The planner clears `notice` on every path change (`:546`), and the library and review pages are separate routes. A "Saved" or "Deleted" message shown after returning to the library needs a query parameter, such as `?notice=saved`, or sessionStorage, read on mount.
2. **Sync stops at the first error.** `syncBrowserTasks` (`:711-762`) wraps the whole loop in one try. If one task is rejected, every later browser copy is left unsynced. Sync must handle a per-task "deleted" response: skip that copy and report it.
3. **Deleted tasks can come back.** POST writes the whole document when none exists (`tasks/route.ts:178`), and nothing checks for a deleted task. Two paths would recreate one: a browser copy from another device syncing later, and an editor open in another tab that saves. POST should return 409 when `deleted_at` is set, and the editor should say "This task was deleted from the shared library."
4. **Save writes a browser copy before the shared POST.** `save()` writes locally first (`:800`), then calls the shared save (`:807`). If the shared save returns 409, the current message would still read "Saved in this browser · shared sync pending." The 409 path must remove the copy just written, or report the deletion clearly.
5. **Browser copies of deleted tasks on other devices.** They cannot sync (risk 2). Plan: they stay as "This browser" with a notice and a Delete action that removes them locally. Whether to discard them automatically is an open question below.
6. **Layout depends on `active_version`.** Layout membership checks that field (`layout/route.ts:44`). Soft-delete relies on this. Changing the field name or its check requires updating `collectMembership` too.

## Visual and interaction consistency (AGENTS.md)

- Use only existing components: `secondary` for Edit settings, `destructive` for Delete, `quiet` for Download backup, and `Select` for the implementor. Add no new patterns.
- The card already has five action controls. Adding Edit settings and Delete makes spacing and wrapping important. Check against `design-md/SAVED_TASK_ENTRY_AUDIT.md`, which makes Open comparison the principal action. Edit settings should sit beside it at the same weight, not above it.
- Verify at 320, 375, 768, and 1024 px. Check for horizontal overflow, that buttons wrap cleanly, and that touch targets are at least 44 px.

## Phases

1. **Implementor select in the editor.** UI only; the data path already exists.
2. **Edit settings from the library**, including return to the library and a notice that survives navigation.
3. **Delete.** Add the DELETE route, the tombstone guard on POST and GET, the local delete helper, per-task sync handling, and the card and review-page controls.
4. **Optional:** card-level implementor picker, with candidate options in the summary.

Phases 1 and 2 do not touch the server. Each phase can ship on its own.

## Verification

- **Unit tests** (`node:test`, in `tests/`, matching the existing suites): the tombstone guard in POST; per-task handling in sync; `deleteBrowserTask` removing both IndexedDB and localStorage copies; deleted tasks excluded from layout membership.
- **Manual flows:** edit from the library, then Save returns to the library with the notice; set the implementor during create and during edit; delete with and without a browser copy; delete a task that is open in another tab; sync with a tombstoned browser copy; download backup still works.
- **Regression:** pinned ranks and costs are unchanged after an edit or implementor change, which both go through `saveSharedTask`. Category revision conflicts still return 409.

## Decisions for you

1. **Edit settings weight:** equal to Open comparison (recommended), or the primary action?
2. **Implementor default for new tasks:** none, which keeps the "Leading candidate" label (recommended), or the leader?
3. **Browser copies of a deleted task on another device:** keep them as local-only with a notice (recommended), or discard them automatically?
4. **Phase 4 (card-level picker):** build now, or later?
