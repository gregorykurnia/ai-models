# Ultramarine Ledger migration plan

Scope: migrate the current app incrementally to **light mode only**. This is an implementation sequence, not a new design specification or a product/data rewrite.

## Reference baseline

- Old brief: [leaderboard product plan](../docs/LEADERBOARD_PRODUCT_PLAN.md) and [Utility grid direction](../design-directions/README.md); also reviewed the earlier [Signal Ledger direction](../design-md/SIGNAL_LEDGER_DIRECTION.md).
- Target: all five Ultramarine documents — [direction](../design-md/ULTRAMARINE_LEDGER_DIRECTION.md), [foundation](../design-md/ULTRAMARINE_LEDGER_FOUNDATION.md), [tokens](../design-md/ULTRAMARINE_LEDGER_TOKENS.md), [components](../design-md/ULTRAMARINE_LEDGER_COMPONENTS.md), and [overlays](../design-md/ULTRAMARINE_LEDGER_OVERLAYS.md). Use canonical tokens for implementation; Ultramarine supersedes the earlier palettes and audit styling suggestions.
- Current scope: [surface inventory](../design-md/UI_SURFACE_INVENTORY.md), [consistency audit](../design-md/DESIGN_CONSISTENCY_AUDIT.md), and current shell/CSS/components. The app has native selects and inline disclosures, but no authored modals or drawers. Treat evaluation routes as one variable-column template, not separate redesigns.

## 1. Migration principles

| Priority | Practical rule |
| --- | --- |
| Standardize first | Semantic tokens, typography, spacing, focus/state treatments; then buttons, fields, table framing, page containers, and navigation. Fix repeated patterns before local decoration. |
| Migrate in small slices | Ship one shared family or one surface per change. Pilot the master leaderboard, verify it, then reuse its patterns. A page includes its controls, tables, and states. |
| Contain coexistence | Add canonical tokens alongside legacy variables; temporarily alias `--ink`, `--muted`, `--line`, and `--accent`. Scope new components so broad `button`, `input`, `.panel`, or table rules cannot leak into them. Remove legacy rules only after their consumers migrate. |
| Preserve behavior | Keep routes/query parameters, source ranks, exact model identities, score units, missing-data labels, cost provenance, favorites, 100% weight validation, pinned comparisons, browser saves, shared sync, and backups working. |
| Keep the target light-only | Use the limestone canvas, white evidence sheets, and Ultramarine action/selection roles. No dark tokens, toggle, or system-theme branch. |
| Defer | Methodology article and secondary catalog polish until core workflows work. Defer unused components, new model/compare pages, charts, backend changes, and auth changes. Keep the planner on-page; retain native selects and inline calculation disclosures where sufficient. |
| Avoid legacy patterns | Repeated nested white cards; mixed blue/evergreen/gold accents for UI state; tiny uppercase hierarchy; route-specific control sizes and spacing; opacity-only disabled states; unlabeled icons; page-wide horizontal overflow; floating layers with arbitrary z-index. |

## 2. Migration phases

Risk reflects regression exposure, not visual ambition. Complete each slice's checks before expanding its consumers.

| Phase | Build/change | Why it matters | Dependencies | Expected visual impact | Risk |
| --- | --- | --- | --- | --- | --- |
| **Phase 1: tokens/theme foundation** | Add canonical variables and Tailwind bridge in `globals.css`; load Source Sans 3 / IBM Plex Mono; establish light-only defaults, semantic state roles, responsive constants, and temporary legacy aliases. Inventory literals in both CSS modules. | Gives every later change one source of truth. | Existing Ultramarine specs; baseline screenshots and key interaction checks. | Low–medium initially: consistent palette/type; avoid a blanket selector rewrite. | Medium: global CSS and font metrics affect every route. |
| **Phase 2: core primitives** | Build Button/link-button, IconButton, FormField, Input, TextArea, Select, Checkbox, Badge/Tag, Alert, EmptyState, and basic loading feedback. Establish evidence-sheet, table-scroll/header/cell, filter-toolbar, and pagination contracts; pilot a small home slice. | Removes duplicated control and state treatments. | Phase 1; isolate primitives from legacy selectors. | Medium: coherent controls, density, focus, and feedback. | Medium: semantics and disabled/loading behavior must survive adoption. |
| **Phase 3: app shell/navigation/page containers** | Replace `layout.tsx` header with responsive rail/topbar, active navigation, shared page header/container and prose width. Below desktop, add the modal navigation drawer using a minimal shared portal/focus/scroll-lock base. Align footer and route boundaries. | Improves orientation and every page's framing. | Phases 1–2; modal behavior from the overlay spec is required here. | High across all routes: stable navigation, warm canvas, aligned content. | High: scrolling, sticky layers, focus restoration, and narrow widths. |
| **Phase 4: high-impact pages** | Migrate `/` master region first, then `/leaderboards/[evaluationSlug]`, then `/suitability` configuration/picker/preview. Compose one dominant sheet per workflow with shared controls, table contracts, metadata, and all associated states. | Improves entry, browsing, and model-selection decisions. | Phases 1–3; reusable table/field contracts from Phase 2. | Very high: clear hierarchy and consistent evidence workflows. | High: URL sorting/filtering, variable columns, favorites, weights, and saving. |
| **Phase 5: overlays/popups/forms/tables** | Consolidate table/field adapters across `master-leaderboard`, `leaderboard`, and `suitability-comparison`; finish saved detail/edit and library search/import/sync flows. Extend the overlay base to dialogs, form modals, drawers/sheets, menus/popovers, tooltips, and toasts **only for needed interactions**. | Closes inconsistencies in reused interactions and recovery. | Phase 4 pilots; Phase 3 overlay base. No page waits until this phase for usable forms/tables. | High within workflows: matching forms, table states, and contextual feedback. | High: storage failures, import/sync, dirty dismissal, keyboard and touch behavior. |
| **Phase 6: remaining pages and polish** | Finish evaluation catalog, saved-library secondary details, `/about/data`, loading/error/not-found boundaries, and remaining CSS consumers. Remove unused legacy aliases/styles; check all routes and states. | Makes the system complete and prevents drift. | Phases 1–5; consumer audit before deleting CSS. | Medium locally; high consistency across the finished app. | Low–medium: CSS cleanup and overlooked edge states. |

**Rollout gate:** use focused commits; compare screenshots and exercise affected workflows before promoting a pattern to more routes. Fix regressions within the slice. Retain a page's legacy adapter until its replacement passes the definition of done.

## 3. First surfaces to migrate

Order balances visibility, reuse, inconsistency, and user impact; it is not based on measured traffic.

| Order | Surface | Why first / migration focus | Phase |
| --- | --- | --- | --- |
| 1 | Shared buttons, fields, filter toolbar, and feedback | Heavy reuse and inconsistent local styling; adopt first in home search/provider/favorites controls. | 2 |
| 2 | App shell + mobile navigation drawer | Visible everywhere; adds current-location cues and a deliberate mobile pattern. | 3 |
| 3 | Home master leaderboard (`/`) | Main entry and densest comparison surface; unify header, filters, favorite actions, sticky identity, pagination, source metadata, and loading/no-results states. | 4 |
| 4 | Evaluation leaderboard template | Reuses master patterns across all slugs; validate optional columns, metric units, component navigation, cost links, and empty results. | 4 |
| 5 | Suitability task configuration + candidate picker | High inconsistency and decision impact; normalize labels, evaluation weights, selection/bulk actions, validation, and save controls. | 4 |
| 6 | Suitability comparison table | Reused in preview, saved detail, and library disclosures; standardize numeric hierarchy, coverage, sorting, calculation expansion, and unavailable-data states. | 4 pilot → 5 reuse |
| 7 | Saved comparison detail/edit (`/suitability/[taskId]`) | Important continuation of create/save; preserve pinned evidence, edit values, backup, and browser/shared status. | 5 |
| 8 | Saved tasks library (`/suitability/saved`) | Repeated task cards and consequential recovery flows; align search/import/sync, deferred results, empty library, no matches, and load errors. | 5 |
| 9 | Shared loading/error/not-found surfaces | Low effort, broad reuse; clear next actions and consistent layout. Adopt primitives early, finish copy/layout coverage in polish. | 2–3 baseline → 6 completion |

Overlay scope: the navigation drawer is the first concrete overlay. Add a confirmation/form modal only when a focused workflow warrants it; keep long task editing and persistent validation inline. Use the shared overlay rules for any new popup, and avoid building the entire overlay catalog upfront.

## 4. Definition of done

A page is fully migrated only when its dependent surfaces pass too; a new header alone does not qualify.

- [ ] Uses the shared shell, page container/header, and evidence-sheet hierarchy; prose uses the shared readable width.
- [ ] Uses canonical tokens and shared components. No hardcoded color/spacing/type/radius/shadow values except documented exceptions with a reason; benchmark data colors remain a separate palette.
- [ ] Has no dependence on legacy visual overrides; any remaining legacy adapter is explicitly tracked as unfinished.
- [ ] Relevant rest, hover, active, focus, selected, disabled, readonly, expanded, and loading states are verified; selection/status never relies on color alone.
- [ ] Handles first-use empty, no results, loading, missing evidence, validation, success, and recoverable error separately. Provides reset/retry/next action where appropriate; preserves user input and prevents duplicate submission.
- [ ] Responsive behavior verified at 320/375px, 768px, 1024px, and wide desktop, plus 200% zoom. Long names wrap; horizontal scrolling stays inside labeled data regions; sticky identity and overflow cues work.
- [ ] Keyboard order, visible focus, labels/errors, live feedback, table semantics/sort state, touch targets, reduced motion, and WCAG AA contrast checked in the rendered UI.
- [ ] Any modal/drawer uses the shared overlay system: title, correct focus behavior, inert background and scroll lock for modal layers, safe dismissal/dirty handling, focus return, and mobile safe-area/keyboard behavior. Anchored popups stay within the viewport and use canonical layers.
- [ ] Existing behavior still works: deep links and refresh, filters/sort/pagination, exact ranks/units/cost labels, favorites, weights/selection, create/edit/save, browser fallback, sync, import/export, and pinned results as applicable.
- [ ] Screenshots reviewed for the page and its key states; affected workflow checks pass; obsolete styles removed only after checking all consumers.
