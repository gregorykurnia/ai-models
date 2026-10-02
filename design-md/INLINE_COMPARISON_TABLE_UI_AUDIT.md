# Inline comparison table UI audit and improvement plan

Date: 2 October 2026. Scope: the table revealed by **Review comparison in place** in the saved-task library, including its disclosure, explanatory copy, header, scrolling, and immediately related row presentation. Evidence: the supplied screenshot and current component/CSS source. This document proposes application changes; it does not implement them.

## Recommendation

Give the expanded comparison a deliberate table layout: a compact introduction, clearly separated summary metrics and evaluation ranks, consistent header padding, bounded column widths, and wrapped labels. Retain the existing Ultramarine Ledger palette, flat surfaces, source links, and sticky model column.

The most urgent issue is structural. Plain headers have zero padding, while sortable headers contain padded buttons. Long labels cannot wrap, and the cost button mixes its title and metadata inside an inline flex layout. These rules produce the uneven baselines, crowded labels, and excessive width visible in the screenshot. Correcting that layout will contribute more than adding color or decoration.

## Findings and priority

| Priority | Finding and evidence | Proposed treatment |
| --- | --- | --- |
| P0 | **Headers collide.** The screenshot reads `CoverageWeighted average rank`. `.results th { padding: 0; }` removes spacing from static headers; only `.results th > button` receives 12px padding. | Give every header the same inner wrapper and spacing. Static and sortable headers must reserve their own label area. |
| P0 | **Header baselines differ.** Model, coverage, rank, and evaluation labels sit at the top edge; suitability and cost sit inside controls. | Use one shared label/subtitle stack with top alignment, identical type, and identical insets. Sorting adds an icon and interaction without changing the label's position. |
| P0 | **Long names consume uncontrolled width.** Global `th { white-space: nowrap; }` applies to the complete cost label and evaluation names, including AA-Briefcase Analytical Quality Elo. | Override wrapping locally, set explicit column widths, and allow complete names to occupy two or three lines. Keep the full cost label visible. |
| P1 | **Rank has a false sort affordance.** `Weighted average rank ↓` is a static header; only suitability and cost have handlers. | Remove the arrow from rank. Show `Lower is better` as supporting text. Reserve sort icons for working controls. |
| P1 | **Evaluation values are ambiguous.** Headers use evaluation names ending in `Elo`, but cells render `source_rank`, not Elo scores. | Group these columns under `Evaluation source ranks` and label them `Source rank`. Consider displaying values as `#12` to reinforce their meaning. |
| P1 | **Cost metadata is not a reliable second line.** The button has text and `<small>` as children of `.ui-button`, which uses inline flex. `display: block` on `<small>` does not establish a vertical stack inside that flex container. | Put title and subtitle inside one explicit vertical label container; place the sort icon in a separate, fixed-width slot. |
| P1 | **The expanded section opens with a dense paragraph.** The cost caveat dominates the space immediately before the table. | Use a concise persistent cost note and a labeled methodology disclosure for the longer explanation. Keep benchmark-versus-custom-task meaning visible without requiring expansion. |
| P1 | **Horizontal overflow is available but poorly signposted.** `TableScroll` provides a keyboard-focusable region and the model column is sticky, but this component has no visible overflow hint or edge cue. | Add a subtle divider/shadow at the sticky column boundary and a visible `Scroll horizontally for evaluation ranks` hint when the table overflows. |
| P2 | **Row content also contributes to width.** Coverage combines evaluation count and weighted coverage in one line. Calculation details expand within the model cell. | Stack count and covered weight on separate lines. Keep expanded calculation content wrapping within its established column width. |
| P2 | **The table lacks its own caption.** The scroll region is labeled, but `SuitabilityComparison` does not render a `<caption>`. | Add an accessible caption identifying the saved comparison and the distinction between summary metrics, captured costs, and source ranks. |

P0 repairs should ship together. P1 completes the visual and interaction treatment. P2 improves scanning and robustness after the header layout is stable.

## Proposed expanded-section layout

1. Keep the native **Review comparison in place** disclosure with a visible focus state and a comfortably sized click target. Use its border and spacing to establish the expanded section's boundary.
2. Add a compact toolbar: candidate count, evaluation count, and the existing complete-coverage filter only where its callback is supplied. Inline library comparisons currently do not receive that filter callback.
3. Place a short cost note between toolbar and table: `Costs are captured USD averages for an Intelligence Index task, not estimates for your task. Cost does not affect suitability.` Add `About this cost metric` as an accessible disclosure for the full explanation.
4. Use a two-row table header to distinguish the column families. Keep group headings quiet and use a subtle separator before evaluation columns.
5. Keep values, provider names, coverage qualifiers, and per-model capture dates close to their respective columns.

| Group heading | Column labels beneath it | Purpose |
| --- | --- | --- |
| Candidate | Model / provider | Keep identity visible during horizontal scrolling. |
| Comparison metrics | Suitability; Coverage; Weighted average rank; Cost per Intelligence Index task | Bring the decision inputs together while explaining their different meanings. |
| Evaluation source ranks | Full name of every selected evaluation | Make clear that these values are original ranks, including columns whose evaluation names contain Elo. |

Use a one-column Candidate group, a four-column Comparison metrics group, and an evaluation group spanning the selected evaluation count. Omit the evaluation group when there are no selected evaluation columns. Put `scope="colgroup"` on spanning group headers and `scope="col"` on individual column headers; verify associations with assistive technology. Put `aria-sort` on the individual sortable header, not its group heading.

Avoid adding another card around the table. The saved-task entry and existing table border already supply sufficient framing.

## Header and column specification

These dimensions are implementation starting points in CSS pixels at a 16px root size, not measurements from the screenshot. Validate them against actual content and zoom.

| Column | Initial desktop width | Label and supporting text | Alignment |
| --- | --- | --- | --- |
| Model / provider | 270–300px | One label; model and provider remain separate in rows. | Left; sticky. |
| Suitability | 128px | `Suitability` / `Score out of 100` | Right, matching numbers. |
| Coverage | 160px | `Coverage` / `Selected evaluations · weight` | Right; row count and weight on separate lines. |
| Weighted average rank | 176px | Full label, wrapped / `Lower is better` | Right; static. |
| Cost per Intelligence Index task | 232–256px | Full label, wrapped / `USD · captured per model` | Right; sortable. |
| Each evaluation | 176–208px | Full evaluation name, wrapped / `Source rank` | Right, matching ranks. |

- Use a `<colgroup>` or a column descriptor list to assign widths. A locally scoped fixed table layout with an explicit total width can keep row text from widening the header unpredictably. Preserve internal horizontal scrolling when the total exceeds available space.
- Use 12px vertical and 16px horizontal header insets. Every static header and sort control follows the same spacing contract; do not add padding to both the cell and its wrapper.
- Use the existing 14px/20px UI type role with semibold primary labels and the 12px/16px caption role for helper text. Preserve 13px/18px table values and tabular figures.
- Make the group row compact, approximately 28–32px. Let the main header grow naturally for two- or three-line names; do not clamp, truncate, or force a height that clips content.
- Model, metric, and evaluation labels share a top alignment within the main header row. Helpers follow their own labels with a 4px gap.
- Give the sortable wrapper a text column and a 16px icon column separated by 8px. The text column must be able to shrink and wrap. Align the icon with the first line, rather than centering it against the combined title and subtitle.
- Use `--bg-muted` for the header, `--text-primary` for labels, `--text-secondary` for helper text, and `--border-default` for separators. Use `--primary` to signal the active sort, paired with its directional icon.
- Keep the cost capture date beneath each source-linked price. Do not replace per-model dates with one table-wide date; saved comparisons can contain different captures.

## Sorting and meaning

Keep the current sortable columns: suitability and cost. Replace loose text arrows with consistent icons hidden from assistive technology, and keep each button's accessible name meaningful. Only working sort controls receive hover and focus treatment. Give them at least a 44px interaction height.

The current default suitability order is **complete coverage first**, then descending suitability, coverage, weighted average rank, and model/provider ties. It is not a pure highest-score-first order. Describe the default order accurately in supporting help. Preserve the existing comparator and its reverse behavior during this visual change; revising ranking behavior is a separate product decision.

Maintain `aria-sort` on the active column, update it on interaction, and provide a short live announcement if sorting feedback is otherwise unclear. Preserve the current cost behavior: switching to cost begins with lower costs first, and unavailable cost values remain last in either direction.

Use `Lower is better` for weighted average rank and explain once that evaluation cells are original source ranks. The header must not suggest that the Elo-named columns contain Elo scores or that cost contributes to suitability.

## Responsive layout and scrolling

- Size the table against its container, including the saved-card padding and navigation rail. A wide viewport does not guarantee a wide table region.
- Preserve all comparison columns in the horizontal scroll region. At narrow widths, use a 170–200px model column, wrap complete model names, and retain usable numeric columns. At 320px, verify that the sticky column leaves a visible portion of the next column.
- Keep the model column sticky in both header rows and body. Replace `:first-child` positioning with explicit identity-column classes before introducing group rows; a group-row first cell and an individual-column first cell need distinct treatment.
- Use opaque backgrounds and controlled stacking so moving columns never show through the sticky model cells. The corner header cells must remain above scrolling body cells. Match sticky body backgrounds to row hover/focus treatment.
- Show the overflow hint only when needed. An edge cue should disappear when the relevant scroll boundary is reached and must not cover data or receive pointer events. Recheck overflow when the disclosure opens, the container resizes, or columns change.
- Keep the default inline section in the page's normal vertical flow. Do not introduce a second vertical scrollbar for ordinary comparisons. If unusually large comparisons justify a bounded-height table later, pair that change with sticky group/header rows and verify their offsets.
- Keep calculation details usable on mobile. They must wrap within the model cell; expanding them must not change the established column widths.

## Implementation plan

### 1. Repair the existing header layout

In [suitability-comparison.tsx](../src/components/suitability-comparison.tsx), introduce a shared header-content pattern for static and sortable labels. Give cost its explicit title/subtitle stack, and remove the nonfunctional rank arrow.

In [suitability-planner.module.css](../src/components/suitability-planner.module.css), replace the zero-padding/button-only contract with scoped comparison-header classes. Override global nowrap locally, establish wrapping and consistent label colors, and split coverage row content into two readable lines. Keep existing values, formulas, and source links intact.

### 2. Add column structure and visual hierarchy

Create a small column descriptor list with IDs, full labels, helper text, widths, and sortability. Add the group row, column widths, caption, and explicit sticky-column classes. Add the summary/evaluation separator. Reuse the same component on the planner and dedicated saved-comparison route so its layout stays consistent across contexts.

Derive evaluation metadata once per comparison rather than repeatedly calling `data.evaluations.find(...)` across headers and every row. If headers must remain visible when there are zero candidate rows, pass the selected evaluation IDs/weights explicitly; do not derive the selection from every evaluation in the published dataset. Generate the empty-state `colSpan` from the same column list.

### 3. Refine the expanded section

Add the compact counts and cost methodology disclosure, then implement overflow detection and its visible cue. In [suitability-planner.tsx](../src/components/suitability-planner.tsx), restrict the outer disclosure styling to `.inlineComparison > summary`; the existing descendant selector also reaches nested calculation summaries.

Retain the current open-state computation/mounting, shared-detail lazy loading, request deduplication, and local loading/error feedback. Those optimizations already exist in `SavedTaskEntry`; do not present them as new work.

### 4. Verify and release the focused change

Check inline library comparisons, the task planner, and dedicated saved-comparison pages. Keep comparison-specific CSS in the module. If a shared primitive adjustment proves necessary, also inspect master and individual leaderboards for regressions.

No scoring, persisted snapshot, storage schema, data import, or API changes are needed for the header redesign. Do not add virtualization, pagination, or a new table dependency for this fix. Profile large comparisons before selecting a heavier optimization.

## Acceptance checks

- At 320, 375, 768, 1024, and 1440px viewport widths and 200% zoom, labels remain readable and the page has no horizontal overflow outside the table region.
- Coverage and weighted average rank have visible separation. Static and sortable headers use the same insets and label alignment.
- Full cost and evaluation names remain visible, including AA-Briefcase Analytical Quality Elo and Terminal-Bench 4.0. Test unusually long names rather than only the screenshot's examples.
- Every arrow belongs to a functioning sort control. Sorting updates the active visual state and `aria-sort`; weighted average rank remains static and says lower is better.
- Suitability order, scores, cost null ordering, pinned source ranks, profile URLs, and capture dates match the current behavior.
- Evaluation columns are clearly identified as source ranks. Partial scores, missing costs, `No score`, `No rank`, and `Not ranked` remain explicit and never become zero values.
- Horizontal scrolling preserves model identity, reveals every evaluation, and keeps the keyboard focus ring visible. Test the start and end of the scroll range.
- The caption and group/column header associations make sense in a screen reader. Disclosure, sorting, source links, and scroll-region keyboard operation remain usable.
- Opening calculation breakdowns does not distort header widths; collapsing the outer section still unmounts its full comparison content.
- Test one and many selected evaluations, no candidate rows, complete-coverage filtering where supported, and inline loading/error/retry states. No empty evaluation group or incorrect spanning cell is rendered.
- Use before/after browser screenshots for layout QA and focused interaction checks for sorting. Run the existing suitability checks if calculation or comparator code changes. A documentation-only addition does not require an application build.

## Evidence and limits

- [Comparison markup, sorting, and row rendering](../src/components/suitability-comparison.tsx).
- [Comparison and disclosure CSS](../src/components/suitability-planner.module.css): `.results`, `.results small`, `.inlineComparison`, and mobile sticky-column rules.
- [Global table and button contracts](../src/app/globals.css): `th`, `th button`, `.ui-button`, and `.ui-table th > .ui-button`.
- [Table primitives](../src/components/ui/primitives.tsx): `TableScroll` and `Table`.
- [Saved-task disclosure and existing deferred rendering](../src/components/suitability-planner.tsx): `SavedTaskEntry`.
- [Suitability calculation](../src/lib/suitability.ts) and [cost/product requirements](../docs/FAVORITES_AND_SAVED_TASKS_PLAN.md).
- [Ultramarine Ledger direction](ULTRAMARINE_LEDGER_DIRECTION.md) and [table component guidance](ULTRAMARINE_LEDGER_COMPONENTS.md).

The screenshot establishes desktop header appearance; source inspection establishes the CSS and behavior described above. Mobile behavior, rendered dimensions, screen-reader results, and performance have not been measured in this audit. Proposed dimensions and efficiency improvements are targets for implementation, not verified results.
