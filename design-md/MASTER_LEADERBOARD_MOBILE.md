# Master leaderboard phone pattern

Applies to the master leaderboard on the home page. Full plan: `docs/MASTER_LEADERBOARD_MOBILE_PLAN.md`.

## Breakpoint

- Below 768px: model cards replace the table.
- 768px and above: the table is unchanged.

## Phone layout

- **Search** stays visible at full width.
- **Sort by** select with an ascending/descending toggle. Both write the existing `ms` and `md` URL parameters.
- **Filters** button opens the existing `Drawer` with provider, favorites filter, Clear filters, Link to this view and Export CSV. The button shows a count of active provider and favorites filters.
- **Intro** shows the first sentence; the rest sits in an "About these ranks" disclosure.

## Card

- Header: favorite star (44px target) beside the model name, with the provider as a caption.
- Metric tiles on `--bg-muted`: Aggregate (with `n/9 dims`), Cost / task, and the sorted evaluation's rank when sorting by an evaluation.
- "All N ranks" disclosure lists every evaluation with its rank link.
- Surface, border and radius use the same tokens as `.ui-card`.

## Verification

- `scripts/check-master-browser.mjs` covers the card list, sort select, favorites toggle, rank links, Filters drawer and horizontal overflow at 320, 360 and 390px.
- Desktop screenshot at 1280px is byte-identical to the pre-change capture.

## Tradeoffs

- Both views are in the DOM and switched with CSS, so server rendering does not flash the wrong layout.
- Collapsed cards are about 300px tall when model names wrap to three lines. That is taller than the 150px target in the plan.
