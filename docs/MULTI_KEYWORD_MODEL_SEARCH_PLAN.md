# Comma-separated model search plan

Status: Implemented. This document records the behavior and acceptance criteria.

## Intended behavior

Every model search field accepts comma-separated keywords. Typing `sol, haiku` shows the combined results for models whose names contain `sol` OR `haiku`, case-insensitively. A model does not need to contain both keywords, and a row matching multiple keywords appears only once.

## Scope

- Master leaderboard: `src/components/master-leaderboard.tsx`.
- All individual evaluation leaderboards using `src/components/leaderboard.tsx`.
- Task suitability planner model picker: `src/components/suitability-planner.tsx`. Preserve its existing ability to search provider names as well as model names.
- Saved-task search and evaluation search are outside this change.

## Search rules

1. Split the input on commas, trim each term, lowercase it, discard empty terms, and deduplicate terms.
2. Include a row when at least one term is a literal substring of the searchable text. Do not interpret regex, wildcards, or operators.
3. If there are no nonempty terms, show all rows permitted by the other active filters.
4. Keep spaces within a term: `claude haiku, sol` searches for the phrase `claude haiku` or the substring `sol`.
5. A comma is always a separator; quoted phrases containing commas are not supported in this version.
6. Provider, favorites, and planner mode filters continue to intersect with the combined keyword results.

Examples:

| Input | Expected behavior |
| --- | --- |
| `sol` | Existing single-keyword substring search |
| `sol, haiku` | All matching Sol and Haiku rows |
| ` SOL , HaIkU ` | Same results as `sol, haiku` |
| `sol,,haiku,` | Same results as `sol, haiku` |
| `sol, sol` | Same results as `sol`, without repeated rows |
| `sol, nonexistent-term` | Matching Sol rows still appear |
| Empty input, spaces, or `,,` | All rows allowed by the other filters |

## Implementation steps

1. Add a shared helper in `src/lib/model-search.ts` to parse terms and match searchable text. Parse once per query, then use `some()` inside the existing row filter.
2. Replace the single-string substring checks in the master and evaluation leaderboards with the shared matching logic. Keep searching model names only on these surfaces.
3. Apply the same helper to the planner's existing model/provider searchable text. Searching must not change selected models or calculated suitability scores.
4. Preserve the existing 300 ms leaderboard debounce, 200-character input limits, sorting, pagination reset, clear actions, and raw query persistence in `q` and `mq`. Reloaded and shared URLs must reproduce the combined results. Master CSV exports must use the same filtered result set.
5. Make the syntax discoverable using a short hint such as “Separate keywords with commas, e.g. sol, haiku.” Inspect the affected screens first and use their existing typography and spacing. Preserve the current input styling, toolbar layout, and responsive behavior; connect any hint using `aria-describedby`.

## Verification and acceptance

- Add focused helper tests for the examples above, literal punctuation, overlapping terms, and no-match queries.
- Verify combined results on the master leaderboard, multiple evaluation pages, and the planner model picker.
- Check provider/favorites combinations, result counts, sorting, pagination reset, clear filters, URL reload/share, and master CSV export.
- Confirm the planner still searches providers and preserves model selections while its visible results change.
- Visually verify desktop and mobile layouts, hint wrapping, input sizing, alignment, and keyboard accessibility against the existing design.
- Run the repository's relevant checks, inspect the diff, and commit/push only feature-related files.

Done when all in-scope model search fields support the same comma-separated OR behavior and existing filters and result actions remain consistent.
