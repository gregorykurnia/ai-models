# Individual leaderboard filter and navigation freeze

Status: Implemented in commits `6f7abed` and `d053479`; live browser verification remains pending.

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

Typing also had a separate performance issue: the individual leaderboard called `router.replace` for every input event. That starts a Next.js navigation on each keystroke. The main leaderboard already avoids this with a local search draft and a 300 ms debounce, then synchronizes the URL with the native History API.

References:

- Application: `src/components/leaderboard.tsx`, particularly the displayed-row calculation and `useReactTable` options.
- Installed library: `node_modules/@tanstack/table-core/src/utils/getCoreRowModel.ts`, `node_modules/@tanstack/table-core/src/features/RowPagination.ts`, and `node_modules/@tanstack/react-table/src/index.tsx`.
- [TanStack Table v8 FAQ: preventing infinite rendering loops](https://tanstack.com/table/v8/docs/faq).
- [Next.js native History API](https://nextjs.org/docs/app/getting-started/linking-and-navigating).

## Implemented fix

- Memoized the visible page slice using the sorted rows, effective page, and page size as dependencies.
- Set `manualPagination: true` and `autoResetPageIndex: false` because the component already slices and selects the current page from URL state.
- Added a local search draft with a 300 ms debounce. It updates visible results after typing pauses and synchronizes the query with `window.history.replaceState`, without routing on each keystroke.
- Kept the existing controls and rendered markup unchanged.
- Commits pushed: `6f7abed` (`fix: stop leaderboard filter render loop`) and `d053479` (`perf: debounce individual leaderboard search`).

The fix does not require a visual redesign. The search input retains the existing styling and updates its text immediately; only result filtering and URL synchronization wait for the debounce.

## Verification

`./node_modules/.bin/tsc --noEmit` passed after both code changes. The bounded TanStack Table diagnostic described above established that unstable row data repeatedly resets pagination and stable row data settles after one reset.

Live browser and visual verification could not be run in this workspace session: the connected browser surface is disabled, and Playwright and local browser executables are unavailable. Complete these checks in a browser:

Browser checks to complete:

- Search on Presentation Elo, then click **Evaluations** in the sidebar. Navigation completes and the tab remains responsive.
- Type continuously in the search field. Text entry remains immediate, results update after the 300 ms pause, and the URL query matches the completed search.
- Select one provider, then click **Evaluations**. Repeat with other sidebar destinations.
- Combine search and provider filtering, clear filters, and navigate away.
- Change sorting, page size, and pages, then navigate away.
- Filter while viewing a later page. The existing reset-to-first-page and page-clamping behavior still works.
- Search for a value with no matches. The empty state renders and sidebar navigation remains responsive.
- Open a URL with existing filter and pagination parameters, and use browser back/forward navigation.
- Repeat the essential filtering and navigation checks on another individual evaluation to confirm the shared component is fixed.
- Compare the layout before and after at desktop and mobile widths, including the sticky header, table overflow, and mobile navigation drawer.

Inspect the console during these checks for errors and confirm the page remains responsive after each interaction.

## Acceptance criteria

- A search or dropdown change produces a finite number of renders and no recurring pagination reset loop.
- Sidebar navigation completes after either interaction without an unresponsive-page warning.
- Search, provider filtering, sorting, pagination, shared URLs, and empty states retain their intended behavior.
- The UI remains visually consistent with the existing application.
- The reviewed fix is committed and pushed without including unrelated working-tree changes.

## If the browser still freezes

If the table loop is removed but the reported crash persists, collect a browser performance trace and inspect pending route requests and sticky-header observer activity. Treat any additional cause as a separate finding supported by that evidence; the earlier search-request-backlog hypothesis has not been established as the crash's cause.
