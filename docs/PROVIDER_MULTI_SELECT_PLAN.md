# Provider multi-select plan

Status: Proposed. Planning only; no feature implementation is authorized yet.

## Goal

Allow users to select any number of providers wherever the application currently offers an “All providers” dropdown. Selecting Anthropic, OpenAI, and Alibaba should show models from any of those providers together, with no selection limit.

## Scope

- Master leaderboard: `src/components/master-leaderboard.tsx`.
- Every individual evaluation/index detail page through the shared component: `src/components/leaderboard.tsx`.
- Task suitability model picker: `src/components/suitability-planner.tsx`.

## Interaction and visual design

Before implementation, inspect the affected screens and existing controls. Preserve the current dropdown size, typography, colors, borders, radius, and toolbar placement.

Replace the single-select provider control with a reusable dropdown containing provider checkboxes:

- Keep the dropdown open while users select or deselect providers.
- Update the matching results immediately after each selection.
- Close the dropdown when clicking outside or pressing Escape.
- Use a scrollable provider list to prevent excessive dropdown height.
- Keep provider choices available while filtering; selecting one provider must not hide the others.
- Provide keyboard access, accessible labels, visible focus, and appropriate focus restoration.

The closed control displays:

| Selection | Label |
| --- | --- |
| No providers selected | All providers |
| One provider selected | The provider name, such as Anthropic |
| Multiple providers selected | A count, such as 3 providers selected |

An “All providers / Reset” action clears the provider selection and restores all providers. Deselecting the last provider also restores all providers. Existing “Clear filters” actions continue to clear the applicable filters.

## Filtering behavior

Replace the current single-provider equality comparison with membership in the selected provider collection.

- Providers combine with OR: Anthropic or OpenAI or Alibaba.
- Provider filtering combines with other active filters using AND, including model search and favorites where available.
- There is no application-imposed provider selection limit.
- Reset pagination to page 1 when providers change.
- Preserve current sorting and original source ranks.
- Display all matching rows through the existing pagination.
- Update result counts and selection summaries consistently.
- In the task suitability picker, changing provider filters must preserve models already selected for a task.

## URL state and compatibility

Use repeated query parameters for leaderboard provider selections:

- Master: `mp=Anthropic&mp=OpenAI&mp=Alibaba`.
- Evaluation: `provider=Anthropic&provider=OpenAI&provider=Alibaba`.

Existing single-provider links must continue to work. Refreshing, copying a link, and browser back/forward navigation must restore the provider selection. Clearing providers removes every occurrence of the applicable parameter while preserving other state according to the existing control behavior.

Read provider values with `URLSearchParams.getAll()` and serialize by deleting the previous provider parameters, then appending each selected value. Deduplicate repeated values. Keep unrelated query parameters intact.

The evaluation parser currently uses `Object.fromEntries(params.entries())`, which discards repeated parameter values. Update provider parsing explicitly, including the related contract in `src/lib/contract.ts`, while retaining validation for the other query fields.

The task suitability picker currently uses local provider state; retain its existing state lifecycle unless a separate persistence requirement is approved.

## Shared implementation approach

1. Build a reusable provider multi-select control using existing UI primitives and design tokens.
2. Add shared provider parsing, serialization, and matching helpers where useful.
3. Integrate the control into the master leaderboard and shared evaluation leaderboard.
4. Integrate the same interaction into the task suitability model picker.
5. Preserve master “Link to this view” behavior and existing single-provider model links.
6. Ensure master CSV exports include all matching models from the selected providers across all pages.

No data import, scoring, or provider identity changes are needed for this feature.

## Verification and acceptance criteria

- Zero selections show all providers.
- One selection shows only that provider's matching models.
- Selecting Anthropic, OpenAI, and Alibaba shows the union of their matching models.
- Users can select every available provider without a selection cap.
- Deselecting providers updates results correctly; deselecting the last restores all providers.
- Clear filters, combined model search, favorites, pagination, sorting, and empty results behave correctly.
- Existing single-provider URLs and repeated-provider URLs work after refresh and browser navigation.
- Master shared links retain all selected providers.
- Master CSV exports contain every filtered matching row, not only the current page.
- Task suitability filtering preserves already selected candidate models.
- Keyboard navigation, Escape, outside clicks, labels, focus, and result announcements work correctly.
- Visual verification on desktop and mobile confirms consistent styling, readable labels, proper alignment, and no overflow or dropdown clipping.

Implementation should begin only after the plan is approved. This document does not implement the feature.
