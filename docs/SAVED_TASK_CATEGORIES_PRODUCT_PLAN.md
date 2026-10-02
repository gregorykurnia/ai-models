# Saved Task Categories

**Status:** Proposed product plan; implementation has not started.

## Product goal

Let users organize Saved tasks into categories they can create, rename, and delete. Display saved tasks grouped by category and let users filter the library by category while continuing to search task titles and descriptions.

Example: a user creates **Coding**, **Research**, and **Writing**, assigns saved tasks to them, and chooses **Coding** to see only coding tasks.

## Current experience

The library at `/suitability/saved` shows a single list ordered by the task's latest update. It supports title/description search, comparison previews, opening full comparisons, backup import, and syncing older browser saves. It has no task category field, category management, grouping, or category filter.

Shared tasks are visible and editable by every site visitor without signing in. Categories should follow this existing shared model: creating, renaming, deleting, or assigning a shared category affects the shared library across browsers and devices. Older browser-only tasks remain local until synced.

## Proposed product decisions

These defaults make the feature concrete and can be revised before implementation.

| Decision | Proposed behavior |
| --- | --- |
| Categories per task | A task has one category or is Uncategorized. |
| Category structure | A flat list of user-created categories. |
| Initial categories | Users create their own; example names are suggestions only. |
| Uncategorized | A built-in fallback for tasks with no category; it cannot be renamed or deleted. |
| Category management | Create, rename, and delete categories from Saved tasks. |
| Removing a task from a category | Set its category to Uncategorized. |
| Deleting a category | Keep all its tasks and move them to Uncategorized. |
| Default library view | All tasks, grouped by category. |
| Category filter | Select one or more categories; a task matches any selected category. |
| Group order | Category name alphabetically, with Uncategorized last. |
| Task order within a group | Most recently updated first, with task ID as a stable tie-breaker. |

Multiple categories per task, nested categories, manual group ordering, and bulk task assignment are possible later extensions.

## User experience

### 1. Create and manage categories

Add a **Manage categories** action in the Saved tasks toolbar. It opens a management panel showing category names and the number of shared tasks assigned to each category, including categories with zero tasks.

- **Add category:** enter a name and save. The category becomes available in task pickers and filters immediately after a successful save.
- **Rename category:** edit its name. Every assigned task displays the new name automatically.
- **Delete category:** show the category name and affected shared-task count before confirmation. Copy: “Delete Coding? Its 8 tasks will move to Uncategorized.” Deleting an empty category uses the same confirmation with no affected tasks.

Names must be trimmed, 1–60 characters long, and unique ignoring case and repeated whitespace. Reserve **Uncategorized** for the built-in fallback. Show validation beside the field and keep the entered name when saving fails.

Category IDs stay stable when names change. Renaming a category must not require reassigning its tasks.

### 2. Assign, change, or remove a task's category

Add a **Category** picker to task creation and editing, with **Uncategorized** as the default. Keep this optional so users can save a comparison before organizing it.

Show the category on each saved-task entry and on the comparison page. Provide a **Change category** action on a library entry so users can organize an existing task directly from Saved tasks. The picker lists existing categories and Uncategorized; **Create category** opens the category creation flow and selects the new category after creation succeeds.

Changing the category moves the task into the corresponding group. Choosing Uncategorized removes its assignment. Preserve the task's ID, comparison inputs, pinned evaluations, pinned costs, and calculated results. Record a successful assignment change in the task's update timestamp; a category rename does not change individual task timestamps.

For browser-only tasks, category assignment is saved locally and retains the existing browser-save indicator. Sync validates the category against the shared registry before uploading.

### 3. Group the Saved tasks page

Keep task creation, search, backup import, and browser sync available. Add the category filter and Manage categories beside the library controls.

Render a section for each category that contains matching tasks. Each section has the category name, matching-task count, and the existing task entries. Display Uncategorized last. Hide empty groups in the library; empty categories remain available in management and filtering.

Example display:

```text
Saved tasks
[Create a task] [Search tasks…] [Categories: All] [Manage categories]

Coding · 2 tasks
  API implementation comparison
  Code review comparison

Research · 1 task
  Literature review comparison

Uncategorized · 1 task
  General model comparison
```

Keep the existing leading-model preview, comparison expansion, full comparison link, and backup actions on each entry. Use the same grouping on mobile, with toolbar controls wrapping to fit the screen.

### 4. Filter and search together

The category filter defaults to **All categories**. Users can select multiple categories, including Uncategorized. No selected categories means All categories.

Apply category filtering and text search together: a task must match the search text and one of the selected categories. Search continues to match task titles and descriptions. Group only the resulting tasks, and display “Showing 3 of 12 tasks” to explain the visible count. Group counts reflect the current search and category selection.

Show selected categories as removable filter chips and provide **Clear filters** to reset both category selection and search. Store search and category IDs in the library URL so refresh, shared links, and returning from a comparison preserve the view. Renaming a category keeps its selection because the URL uses its ID. If a selected category is deleted, remove that filter and notify the user; if none remain, return to All categories.

## Empty, loading, and failure states

| State | Experience |
| --- | --- |
| No saved tasks | Show the existing create-first-task action and allow category creation. |
| No categories created | Show tasks under Uncategorized and offer Add category in management. |
| Selected category is empty | Explain that it has no saved tasks; offer Clear filters or Create a task with that category selected. |
| Search/filter has no matches | Show “No matching saved tasks” and Clear filters. |
| Category save fails | Keep the existing category/assignment visible, retain pending input, and offer retry. |
| Category list fails to load | Keep tasks accessible with “Category unavailable”; allow task search and comparison review, and offer retry. Do not overwrite assignments with Uncategorized. |
| Another visitor removes a category during assignment | Reject the stale assignment, refresh categories, and ask the user to choose again. |

Use labeled, keyboard-accessible controls. Announce successful changes and errors, preserve focus after management actions, and disable duplicate submissions while a save is pending.

## Data and persistence requirements

- Create a shared category registry containing stable ID, display name, normalized unique name, creation timestamp, and update timestamp.
- Add an optional nullable `category_id` to saved-task metadata and library summaries. Missing or null means Uncategorized. Return category metadata alongside the summary list or through a lightweight category endpoint.
- Treat categories as organization metadata, separate from pinned comparison snapshots. Category-only changes must not fetch/recalculate full comparisons or rewrite entry chunks.
- Preserve the latest category assignment when saving edited comparison settings; prevent stale comparison saves from silently overwriting a newer assignment. Use revision checks for conflicting metadata writes.
- Enforce category existence and normalized-name uniqueness on the server, including concurrent create and rename requests.
- Category deletion must become visible consistently: affected tasks resolve to Uncategorized, and new assignments to the deleted category are rejected. Use a deletion marker with safe cleanup if the affected tasks exceed transaction limits. Renaming or deleting a category does not reorder tasks by changing their individual update timestamps.
- Existing shared and browser-saved tasks need no forced rewrite: a missing category reads as Uncategorized. An assignment referencing a confirmed deleted/missing category also resolves to Uncategorized; a failed registry request is a separate unavailable state.
- Preserve category ID and name in new task backups. On import or browser sync, reuse a live matching shared ID, otherwise match by normalized category name. Ask the user before creating an unmatched category or choose Uncategorized. Older backups import as Uncategorized.
- Keep the category registry shared and server-backed so categories survive reloads and appear across devices. Cache names for browser-only task display without silently creating shared categories.

## Implementation sequence

1. **Category persistence and compatibility:** add category records, validation, task metadata, summary support, safe deletion behavior, and legacy/backup handling.
2. **Category management and task assignment:** build the management panel and category pickers in creation, editing, and library entries.
3. **Grouped library and filtering:** add category sections, combined search/filter behavior, URL state, counts, and empty/error states.

Deliver these together as the first complete category release so users can create a category, assign tasks, see the group, and filter it in one workflow.

## Acceptance criteria

- Users can create, rename, and delete categories from Saved tasks; blank, reserved, and duplicate names are rejected.
- New tasks can be saved with a category or as Uncategorized. Existing tasks can be reassigned or returned to Uncategorized directly from the library.
- Renaming a category updates all displayed labels while preserving assignments and selected filters.
- Deleting a category preserves every task and moves affected tasks to Uncategorized after confirmation.
- The default library groups tasks by category, shows matching counts, and places Uncategorized last.
- Selecting Coding and Research shows tasks in either category; adding search narrows that result further.
- Clear filters restores the full grouped library. Reloading or returning from a comparison preserves the URL's search and category selection.
- Category changes persist across browsers for shared tasks; browser-only assignments stay local until sync.
- Existing tasks and older backups remain usable as Uncategorized. Backup import and browser sync handle unmatched categories explicitly.
- Assignment changes preserve comparison data and scores, and never rebuild pinned source data.
- Failed writes leave the saved state intact. Failed category reads keep tasks accessible and do not clear valid assignments.
- Category management and filtering work with a keyboard and on mobile.
