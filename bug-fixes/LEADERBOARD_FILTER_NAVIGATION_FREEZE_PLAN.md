# Individual leaderboard filter and navigation freeze

Status: Planned. This document records the proposed fix; application code has not been changed.

## Reported behavior

On an individual evaluation leaderboard, such as AA-Briefcase Presentation Elo:

1. Enter a model search or select a provider from the dropdown.
2. Click a sidebar link, such as **Evaluations**.
3. The browser becomes unresponsive and can crash.

A single dropdown selection can trigger the problem, so repeated search requests alone do not explain it.

## Diagnosis and evidence

In `src/components/leaderboard.tsx`, the filtered and sorted data are memoized, but the displayed rows are created with `sorted.slice(...)` directly during every render. This produces a new array reference on each render and passes it to `useReactTable` as `data`.

The installed TanStack Table v8 implementation recalculates its core row model when the data array reference changes. That recalculation calls its automatic pagination reset. The React adapter stores the resulting table state update, causing another render. The next render creates another sliced array, triggering another reset.

The resulting cycle is:

`filter change → new rows array → automatic page reset → React render → new rows array → another reset`

The initial row-model calculation registers the automatic reset behavior. A later render, including one caused by filtering, can start the reset loop. The loop can consume browser processing time and prevent subsequent navigation from completing.

A bounded diagnostic against the installed library reproduced this mechanism:

| Data supplied after a filter change | Renders | Page resets | Outcome |
| --- | ---: | ---: | --- |
| A newly sliced array on every render | 21 | 20 | Stopped at the diagnostic safety limit |
| A stable filtered array | 3 | 1 | Settled without further resets |

This confirms the library-level feedback loop. The full browser sequence has not yet been reproduced in a connected browser, so that reproduction remains part of verification.

References:

- Application: `src/components/leaderboard.tsx`, particularly the displayed-row calculation and `useReactTable` options.
- Installed library: `node_modules/@tanstack/table-core/src/utils/getCoreRowModel.ts`, `node_modules/@tanstack/table-core/src/features/RowPagination.ts`, and `node_modules/@tanstack/react-table/src/index.tsx`.
- [TanStack Table v8 FAQ: preventing infinite rendering loops](https://tanstack.com/table/v8/docs/faq).

## Proposed implementation

1. Inspect the current individual leaderboard visually before editing. Record the existing search, provider dropdown, sorting controls, pagination, empty state, and sticky header behavior.
2. Keep the displayed rows stable between relevant changes. Move the `sorted.slice(...)` calculation into `useMemo`, depending on `sorted`, the effective page, and the page size.
3. Configure TanStack Table for the pagination already performed by the component. Set `manualPagination: true` and explicitly disable `autoResetPageIndex`. The component's URL state and existing pagination controls remain responsible for selecting and resetting the displayed page.
4. Review the diff to ensure filtering, sorting, page clamping, row rendering, and URL query behavior remain consistent with their current semantics.
5. Inspect the result visually, then commit and push only the bug fix to the current branch's configured upstream, following `AGENTS.md`.

The root-cause fix does not require a visual redesign. Search debouncing and changing URL synchronization to the native history API are separate potential improvements and are outside this fix's initial scope.

## Verification

First reproduce the reported sequence on the current application when a browser is available. Capture any console errors and confirm whether repeated renders or pagination resets occur after filtering.

After the fix, check:

- Search on Presentation Elo, then click **Evaluations** in the sidebar. Navigation completes and the tab remains responsive.
- Select one provider, then click **Evaluations**. Repeat with other sidebar destinations.
- Combine search and provider filtering, clear filters, and navigate away.
- Change sorting, page size, and pages, then navigate away.
- Filter while viewing a later page. The existing reset-to-first-page and page-clamping behavior still works.
- Search for a value with no matches. The empty state renders and sidebar navigation remains responsive.
- Open a URL with existing filter and pagination parameters, and use browser back/forward navigation.
- Repeat the essential filtering and navigation checks on another individual evaluation to confirm the shared component is fixed.
- Compare the layout before and after at desktop and mobile widths, including the sticky header, table overflow, and mobile navigation drawer.

Use a bounded regression check that exercises a filter change and detects continued render/reset activity. If browser automation is available, cover the actual filter-then-sidebar-navigation sequence with a timeout. Run the relevant TypeScript/build checks and inspect the console for errors.

## Acceptance criteria

- A search or dropdown change produces a finite number of renders and no recurring pagination reset loop.
- Sidebar navigation completes after either interaction without an unresponsive-page warning.
- Search, provider filtering, sorting, pagination, shared URLs, and empty states retain their intended behavior.
- The UI remains visually consistent with the existing application.
- The reviewed fix is committed and pushed without including unrelated working-tree changes.

## If the browser still freezes

If the table loop is removed but the reported crash persists, collect a browser performance trace and inspect pending route requests and sticky-header observer activity. Treat any additional cause as a separate finding supported by that evidence; the earlier search-request-backlog hypothesis has not been established as the crash's cause.
