# Master leaderboard: ranks by evaluation

The master leaderboard shows one row per matched model variant and one column per published evaluation, including Economics Index, MMMU-Pro, and Intelligence Index. Each populated cell displays the original source rank as a link to that model in the individual evaluation. No raw scores, normalized scores, average, coverage score, or synthetic overall rank appear in this table.

## Behavior

- Match provider, model, and reasoning/fallback variant across known label formats; keep different effort and fallback configurations distinct.
- Include source ranks for every score kind and scoring status, including estimates.
- Display “Not ranked” only when no source entry exists for that matched model variant. Never invent a rank or borrow a different variant’s rank.
- Select duplicate entries by best source rank, then source row and entry ID; retain provenance and report duplicates.
- Default to model name ascending. Selecting an index sorts by source rank ascending first (best rank first). Missing entries remain last in either direction.
- Keep model search, provider filters, pagination, shareable URL state, sticky columns, and accessible horizontal scrolling.
- Keep individual evaluation pages unchanged.

## Validation

Run `npx tsx scripts/validate-master.ts`, `npx tsc --noEmit`, and `npm run build`. Reconcile source ranks across all evaluation cells, including estimates, unbounded indices, missing entries, duplicates, and ties. Browser checks cover sorting, source navigation, return state, keyboard focus, and mobile overflow.

This plan supersedes the earlier normalized-score beta design following the user’s correction on 30 September 2026.
