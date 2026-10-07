# Prompt: refresh AA-Briefcase rubric percentages

Copy and run the following prompt when ready to implement the refresh:

---

Refresh the **AA-Briefcase Rubric Score (%)** values for models already present on our leaderboard using the current official source:

https://artificialanalysis.ai/evaluations/aa-briefcase?results=rubric-score

The stored rubric percentages appear outdated across the leaderboard, including the model details shown when exploring the site in depth. Audit every existing rubric entry, with particular attention to **Gemini 4 Argon (High)**, **Mistral Large 4 Preview**, and **Ling 3.1 Flash**. These three are priorities, not the limit of the refresh.

## Source and matching

- Open the live source and explicitly select **AA-Briefcase Rubric Score (%)**. Verify the active metric; the URL alone or a static HTML response may still show the default combined Elo results.
- Read the current official rubric results, using the rendered table/chart or its underlying public page data. Do not infer rubric percentages from combined Briefcase Elo, analytical quality Elo, presentation Elo, normalized file type results, or example-task grading.
- Capture the retrieval date, benchmark version, source model identifiers, exact model names/configurations, and available raw precision. Preserve evidence sufficient to review each updated value.
- Inventory the existing site entries before changing anything. Match by source ID where available, then verified provider, model, and reasoning/effort configuration. Resolve shortened display names explicitly; do not merge different variants.
- Refresh existing entries only. Do not add models simply because the source now lists them. If an existing model has no verified current rubric result, report it as unresolved and preserve its previous value without labeling it freshly verified. Do not guess or replace missing scores with zero.

## Repository implementation

Inspect the complete data path before editing, including:

- `data/aa-briefcase-components.json`
- `data/aa-model-profile-overlays.json`
- `src/lib/aa-briefcase.ts`
- `src/lib/aa-model-profile-overlays.ts`
- `scripts/import-aa-briefcase-components.ts`
- `scripts/import-aa-model-profiles.ts`
- `data/leaderboards.json`
- The loaders, persisted data, caches, and selectors that serve the rubric leaderboard and model details.

Update every authoritative input that supplies these existing rubric entries. Pay attention to import/overlay precedence so stale profile values cannot overwrite refreshed source values. Keep verified identity mappings and prevent duplicate rows for the same configuration.

Check percentage units carefully: `aa-briefcase.ts` converts the stored `rubric_score` fraction to a 0–100 `score_value`, whereas `aa-model-profile-overlays.ts` currently assigns the profile score directly to `score_value` while multiplying it by 100 for `score_display`. Investigate and fix this inconsistency for the rubric metric if confirmed. Use one consistent contract: source fractions stay in 0–1 where expected; rubric entry `score_value` uses 0–100; display formatting converts exactly once. Numeric sorting, ranks, comparisons, and model details must agree with the displayed percentage. Retain source precision and use the existing display rounding.

Regenerate the affected dataset through the appropriate import path after correcting the inputs and any necessary rubric-specific logic. Ensure regenerated rubric ranks and row counts are correct. Scope changes to rubric values, necessary rubric conversion/matching fixes, and accurate associated provenance. Preserve other benchmark scores, other Briefcase metrics, and existing model metadata. If shared snapshot metadata covers multiple metrics, do not falsely imply that untouched metrics were recaptured.

## Verification and completion

Follow repository `AGENTS.md`, including inspecting the existing UI before any change that affects its behavior or appearance and visually verifying the resulting rubric leaderboard and model details. Preserve the current design.

Verify every matched rubric entry against the source, not just the three highlighted models. Check fraction conversion, numeric/display agreement, ordering, ties, valid ranges, unchanged model membership, and consistency across leaderboard and detail views. Inspect whether the running site reads local JSON or Firestore; establish what is needed for the refreshed data to reach that site and perform any already-authorized publication steps. Report any remaining publication or access blocker precisely.

Produce a reviewable audit of existing models with old percentage, verified new percentage, source identity, and match status, including unchanged and unresolved entries. Summarize how many were checked, changed, unchanged, and unresolved; explicitly report the results for Gemini 4 Argon (High), Mistral Large 4 Preview, and Ling 3.1 Flash. Report the validation performed and whether the live site received the refresh.

Review the working tree and diff, keep unrelated user changes out of the commit, then commit and push to the current branch's configured upstream as required by `AGENTS.md`. Never force-push. Report an exact commit or push blocker if one occurs.

---

This file prepares the implementation prompt only; creating it does not authorize executing the data refresh.
