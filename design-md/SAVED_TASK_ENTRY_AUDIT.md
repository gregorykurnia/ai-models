# Saved task entry UI audit

Date: 2 October 2026. Scope: entries in `/suitability/saved`, using the supplied UI Migration screenshot, current source, compiled CSS, and the existing Ultramarine Ledger direction. This is an audit and proposed design, not an application change.

## Recommendation

Turn each entry into a compact, structured summary: task identity first; leading candidate, suitability, and captured cost second; provenance and actions third. Keep a single-column library so expanded comparison tables have enough room. Reuse the current warm canvas, white surface, neutral borders, and ultramarine actions.

The current palette already fits the product. The largest improvement will come from grouping, spacing, and action priority rather than adding decoration.

## Findings, ordered by impact

| Priority | Finding and evidence | Proposed change |
| --- | --- | --- |
| High | Vertical spacing accumulates: `.ui-card` adds a 12px flex gap and 24px outer margins; `.toolbar` adds a 20px bottom margin; `.taskMeta` adds 20px above and below. The screenshot shows large blank intervals between related content. | Give the entry its own layout classes, reset its outer margin, and let the list own 16px spacing. Use 16–24px padding and deliberate 12–16px internal gaps. |
| High | The leading model, score, cost, and cost capture date form one paragraph. Users must parse prose to find the result. | Use three aligned regions: leading candidate; `Suitability` with `93.0 / 100`; `Cost per Intelligence Index task` with `$0.72` and its capture date. Use tabular numbers. Stack these regions when they no longer fit. |
| High | Download backup is a bordered button while Open comparison is a text link. The recovery action has more visual weight than the principal action. | Make Open comparison the strongest entry action, using an outlined LinkButton with an arrow. Make Download backup a quiet, visibly labeled action. Keep Review inline secondary. Avoid making the entire card clickable because it contains several controls. |
| High | The intended toolbar overrides do not match the DOM. CSS modules compile `.toolbar` in `.savedList > article .toolbar` to a generated local class, but the JSX supplies the global literal `toolbar`. This was confirmed in `.next/static/css/c826974fe1606b07.css`. | Prefer dedicated module classes such as `taskHeader`, `taskActions`, and `taskDescription`. A scoped `:global(.toolbar)` would repair the selector, but a dedicated entry layout avoids inheriting unrelated toolbar margins. |
| Medium | Last updated, evaluations, and candidates occupy three large metric blocks, while the decisive suitability score has no numeric hierarchy. | Replace the blocks with a compact, wrapping metadata line: `Updated 1 Oct 2026 · 5 evaluations · 20 candidates`. Reserve larger numbers for suitability and cost. |
| Medium | Pinned captures repeats five full evaluation names and ISO dates in one semicolon-separated line. The line dominates horizontally and will wrap extensively on narrow screens. | Show `Pinned captures · 29–30 Sep 2026` with a labeled source disclosure. Inside, use one evaluation/date row per source, retain full names, and include selected weights where available. Compute the range from the selected pinned snapshots. Keep individual dates discoverable beside the summary. |
| Medium | Shared sits near the title/description instead of occupying a stable status position. | Use a header grid with a flexible title column and a right-aligned neutral badge. Allow the badge to wrap below at narrow widths. Preserve an explicit browser-only state and its pending-sync context. |
| Medium | Card titles inherit the 24px section-heading size. Description, metadata, result, and actions have insufficient typographic separation. | Use the existing 18px card-title role, 14px supporting text, and 12–13px secondary metadata. Keep exact model effort labels. Limit the collapsed request preview to two lines, with an accessible way to reveal the full request. |
| Medium | The preview has the cost URL in its data, but renders cost as unlinked prose. Score coverage is absent from the summary schema even though full comparisons use it. | Link the cost value to the captured model profile and keep its date visible. Preserve the full cost label and explain once at library level that it is a benchmark cost, not a quote for the custom task. For a later summary enhancement, include actual coverage so partial evidence is visible; do not infer coverage from evaluation count. |
| Medium | Expanded result content is placed inside native details, but comparison calculations and the table are created whenever comparison data exists, including browser saves and previously loaded shared entries that are collapsed. | Track disclosure state and compute/mount the full comparison only when open. Memoize derived rows by immutable comparison inputs. Keep the existing lightweight shared summaries, deferred detail fetch, and request deduplication. |

## Proposed entry structure

1. Header: linked task title, neutral Shared / This browser badge, and a concise request preview.
2. Context: one wrapping line for updated date, evaluation count, candidate count, and a compact pinned-capture disclosure.
3. Result: leading model identity, suitability on a 0–100 scale, and captured benchmark cost with its source link and date. A pale read-only inset is optional; use no nested bordered card or default shadow.
4. Provenance: the capture disclosure reveals every evaluation and its pinned date without adding another permanent row to the entry.
5. Actions: Open comparison, Review inline, and quiet Download backup. Keep backups visible for browser-only recovery.
6. Expanded comparison: a separated, full-width region within the entry, retaining the existing comparison table and horizontal scrolling.

The proposed visual uses only values shown in the supplied screenshot. Its comparison disclosure illustrates the leading row; it does not invent the other 19 candidates or unknown coverage. Navigation and export controls are illustrative, while the disclosures work locally.

## Responsive and state behavior

- At wide widths, align model, score, and cost horizontally. Use the content width, including the navigation rail, to decide when this stops fitting.
- On mobile, stack the model above a score/cost grid; at very narrow widths stack all three. Keep 16px surface padding, wrapping metadata, complete model names, and 44px touch targets.
- Keep source names and dates readable inside the disclosure. Do not replace them with a hover-only tooltip.
- Keep title navigation and the disclosure controls separate, with visible keyboard focus and clear expanded state. Native details/summary remains suitable.
- Shared-summary loading, inline-detail loading, and backup preparation need distinct feedback. A download request should not make Review inline look like the loading action.
- Put a detail-load error beside its disclosure and a backup failure beside the backup action. Avoid showing the same failure both above the action row and inside the expanded section.
- A missing preview should say that saved results are unavailable and provide Open comparison. A null score remains No score; missing cost remains Unavailable rather than `$0.00`.
- A partial result should display its actual coverage when that data is available. Do not label a candidate Recommended or imply complete evidence without the underlying fields.
- Preserve the existing shared-library explanation, browser-sync workflow, import/export, pinned snapshots, and exact cost meaning.

## Implementation sequence

1. Extract a focused `SavedTaskEntry` component from the library map. Give its header, metadata, result, source disclosure, and actions module-owned classes. Repair the scoping mismatch and accumulated margins in this slice.
2. Restructure the existing summary data into the proposed layout. This can use the current schema: model, score, cost source/date, counts, and pinned evaluation dates are already available.
3. Make full comparison rendering depend on open state, retain lazy loading and request deduplication, and localize loading/error feedback. Evaluate larger-library pagination only after measuring actual library size and performance.
4. If evidence completeness is added to the collapsed result, extend the persisted preview with real coverage data and handle older summaries explicitly.

The library route also builds and passes the published planner dataset today. That may be unnecessary payload for browsing summaries, but it supports browser-task migration and should be measured and separated carefully in a later optimization, rather than removed as a styling change.

## Acceptance checks for implementation

- Compare collapsed and expanded entries at 320, 375, 768, 1024px, wide desktop, and 200% zoom; confirm there is no page-wide horizontal overflow.
- Check long task titles, long requests, long model effort labels, and many evaluations. Keep request expansion and every pinned source available.
- Exercise Shared and This browser states, a missing preview, No score, missing cost, partial coverage where supplied, loading, failure, and retry.
- Open and close inline comparison, open the dedicated route, download/import a backup, and sync a browser save. Verify the pinned ranks and costs remain unchanged.
- Verify keyboard order, visible focus, disclosure operation, source links, meaningful accessible names, and numeric/text contrast.
- Target a materially shorter collapsed card, roughly 260–320 CSS pixels for this example at ordinary desktop widths. This is a design target, not a measured improvement; allow extra height for long content and narrow layouts.
- Profile several collapsed browser saves and previously expanded shared entries to confirm their full result tables are not mounted and recalculated during search.

## Source references and limits

- [Saved-task library markup](../src/components/suitability-planner.tsx), lines 362–415.
- [Entry CSS](../src/components/suitability-planner.module.css), lines 311–391.
- [Global toolbar and card styles](../src/app/globals.css), lines 554–560 and 1299–1322.
- [Saved-summary schema](../src/lib/suitability-storage.ts), lines 8–32.
- [Saved-library route](../src/app/suitability/saved/page.tsx).
- [Existing product requirements](../docs/FAVORITES_AND_SAVED_TASKS_PLAN.md) and [Ultramarine direction](ULTRAMARINE_LEDGER_DIRECTION.md).

The supplied screenshot and source were inspected. Live browser inspection was unavailable because the computer-use tool reported `CUA_REPL_ENABLED_SURFACES is required`. No usability timing, rendered mobile measurements, or runtime performance measurements are claimed. No application files were changed.
