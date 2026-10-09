# Master leaderboard mobile plan

Status: plan only. Nothing in this document has been implemented.

Scope: the master leaderboard on the home page (`#master-leaderboard`) at viewports of 767px and narrower. Tablet and desktop keep the current table.

Sources inspected: a phone screenshot of the production site, `src/components/master-leaderboard.tsx`, the master rules in `src/app/globals.css`, and `scripts/check-master-browser.mjs`. No rendered measurements have been taken yet; the dimensions below are estimates from the screenshot and CSS, and are targets to verify.

## Goal

Make the master leaderboard comfortable to read and compare on a phone while keeping its purpose: rank models across evaluations, show the Aggregate Score and Cost per Intelligence Index task, sort by any column, filter, favorite, export, and link to each source leaderboard.

## Problems on mobile today

1. **Sticky columns consume the screen.** At 767px and below, Model (5.5rem), Provider (4rem) and Cost (5.75rem) are all pinned. That is about 15rem of a ~24rem viewport, so only a narrow strip scrolls.
2. **Model names wrap badly.** A name such as "Claude Opus 5.5 (Adaptive Reasoning, Max Effort, Default Fallback)" takes about nine lines in the 5.5rem column. Each row is roughly 450px tall, so about one and a half models fit per screen.
3. **Headers waste space.** "Cost Per Intelligence Index Task" with its caption takes about 190px. "Provider" breaks into "Provid / er".
4. **The core purpose is hidden.** The 19 evaluation ranks sit offscreen to the right, behind the frozen columns, with no cue that they exist.
5. **The favorite star sits on its own line** above the model name and adds row height.
6. **The toolbar is crowded.** Search, provider, favorites select, favorite count, Clear filters, Link to this view and Export CSV all stack above the table, followed by a long intro paragraph.

## Decisions

These were left to the recommendation and are now fixed for implementation.

1. **Pattern:** cards below 768px; the table is unchanged at 768px and above.
2. **Collapsed card contents:** Aggregate Score, Cost per Intelligence Index task, and the rank for the currently sorted column.
3. **Filters:** provider, favorites filter, Clear filters, Link to this view and Export CSV go behind a "Filters" control. Search stays visible.

## Design

### Card

```
☆  Claude Opus 5.5 (Adaptive Reasoning,
   Max Effort, Default Fallback)
   Anthropic
 ┌──────────────┬──────────────┬──────────────┐
 │ Aggregate    │ Cost / task  │ Sorted by    │
 │ 1.6 · 9/9    │ $5.98        │ Omniscience  │
 │              │              │ #3           │
 └──────────────┴──────────────┴──────────────┘
 ▸ All 19 ranks
```

- **Header row:** favorite star (44px touch target) inline with the full model name, which wraps freely. The provider is a caption beneath. The model name keeps its current link to the filtered master view.
- **Metric strip:** three cells.
  - Aggregate Score with the `n/9 dims` caption. Lower is better; keep the existing `aria-label`.
  - Cost per Intelligence Index task, linking to the Artificial Analysis profile as today. A missing cost shows a muted dash.
  - The sorted-column cell. It shows the label and the model's value for whichever column is currently sorted, so scanning one column down the list still works. When the sort is Model or Provider, the cell falls back to the model's best (lowest) source rank with its evaluation label, or is omitted if that adds noise; decide during implementation after seeing it rendered.
- **"All 19 ranks" disclosure:** a native `<details>` element. When open it shows a two-column grid of evaluation label and `#rank`. Each rank keeps its current link to the source leaderboard, its `title`, and its `aria-label`. A missing entry shows a muted "Not ranked". Evaluation order follows `orderMasterEvaluations`.
- **Visual style:** reuse the existing tokens, surface, border, radius and spacing. No new colors; the sorted metric is emphasized with weight, not a new hue. Zebra striping and hover backgrounds do not apply to cards.
- **Height target:** a collapsed card stays near or under 150px so four to five models fit per screen. To be measured.

### Sort control

The column-header buttons do not exist in card view, so add:

- A "Sort by" select listing Model, Provider, Cost per Intelligence Index task, Aggregate Score, and every evaluation using `masterEvaluationLabel`.
- An ascending/descending toggle button beside it, with `aria-label` and a visible arrow.
- Both write the existing `ms` and `md` URL parameters through the existing `update` function, so state, links and the table stay in sync.

### Filters and toolbar

- Search remains visible at full width with its helper text.
- A "Filters" button shows an active-filter count. It opens the existing `ui-drawer` if that primitive fits; otherwise an inline disclosure.
- The drawer or disclosure contains: provider multi-select, favorites filter and favorite count, Clear filters, Link to this view, Export CSV.
- The result count line (`aria-live`) stays visible under the controls.

### Intro copy

Keep the first sentence visible. Move the remaining explanation (how Aggregate Score is computed, cost source, "Not ranked" meaning, data notes link) into an "About these ranks" disclosure.

### Tablet and desktop

No change at 768px and above. Remove only the mobile-only sticky-width overrides that become dead code.

## Implementation plan

1. **`src/components/master-leaderboard.tsx`**
   - Extract the per-row values (aggregate, cost, sorted-column rank) into small helpers shared by the table and the card.
   - Add a `MasterCard` component and a mobile controls block (sort select, direction toggle, Filters control).
   - Render both the table and the card list, and switch between them with CSS rather than a JS media query, so server rendering does not flash the wrong layout during hydration. The hidden view is removed from the accessibility tree by `display: none`.
2. **`src/app/globals.css`**
   - Add `.master-cards`, `.master-card` and mobile toolbar rules.
   - At 767px and below, hide the table and `TableScroll`. At 768px and above, hide the card list and mobile controls.
   - Remove the mobile sticky-width overrides and `.master th button { min-width: 8.125rem }` that only served the phone table.
3. **`scripts/check-master-browser.mjs`**
   - Scope the existing `tbody .source-rank` and table selectors to the desktop view.
   - Add a 390px pass that verifies: cards render and the table is hidden; the sort select changes `ms`/`md` and the card order; a rank link inside a card navigates and back-navigation preserves state; the favorite star toggles; and there is no page-level horizontal overflow at 320, 360 and 390px.
4. **Visual verification** (required by `AGENTS.md`)
   - Screenshots at 320, 390 and 430px in light and dark mode.
   - Check long model names, "Not ranked" cells, missing cost, the empty state, the open and closed "All ranks" disclosure, the Filters drawer, and the pagination bar.
   - Confirm 44px touch targets, focus order, and that the desktop table is unchanged.
5. **Docs**
   - Add a short mobile-pattern note under `design-md/`.
   - Update the browser-checks line in `MASTER_LEADERBOARD_ROLLOUT_PLAN.md` to mention the mobile pass.
6. **Validation before commit:** `npx tsx scripts/validate-master.ts`, `npx tsc --noEmit`, `npm run build`, and the updated browser check.

## Risks and open items

- **Duplicate DOM.** Both views are in the DOM, with 25 to 100 rows each. This is cheap, but selectors in the browser check need scoping, and any test that counts rows must target one view.
- **Card height.** If collapsed cards exceed about 150px, tighten the metric strip before shipping.
- **Sorted-column cell.** The fallback for Model and Provider sorts needs a visual check; it may be better to omit the third cell in those cases.
- **Aggregate-only ranks.** Only 9 of the 19 evaluations feed the Aggregate Score. The expanded grid does not mark them, matching the table today. Marking them is optional and out of scope unless requested.
- **Drawer fit.** If `ui-drawer` does not suit the filter controls, use an inline disclosure instead of adding a new overlay pattern.

## Alternative considered: minimal table-only fix

Make only Model sticky at about 9rem, show the provider as a caption under the model name, drop the sticky Cost and Aggregate columns, shorten headers to two lines with captions moved into tooltips, and add a right-edge fade as a scroll cue. This is about a third of the work and roughly doubles rows per screen, but still requires horizontal swiping across 19 columns on a phone. It is the fallback if the card pattern proves too costly.

## Out of scope

- Any change to ranking data, aggregate calculation, cost data, or the CSV export contents.
- Tablet and desktop table design.
- The other leaderboard pages and the suitability planner.
