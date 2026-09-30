# AA-Briefcase component leaderboards

## Goal

Add three complete, independently sortable AA-Briefcase v1.1 leaderboards to the evaluation catalog:

1. Rubric Score (%)
2. Analytical Quality Elo
3. Presentation Elo

Source: [AA-Briefcase results](https://artificialanalysis.ai/evaluations/aa-briefcase?results=rubric-score), captured 30 Sep 2026. The source page exposes 208 models. Rubric is the share of binary checks passed. Analytical quality and presentation are Elo ratings from separate pairwise comparisons.

## Product behavior

- Preserve all 208 source model variants and their providers.
- Rank each leaderboard independently, highest score first; preserve source order for ties.
- Show provider, model, metric value, and release date when supplied. Show 95% confidence intervals for the two Elo metrics when available.
- Keep the existing combined AA-Briefcase Elo evaluation intact.
- Treat the two Elo metrics as separate indexes while grouping them under the source's shared “Analytical Quality & Presentation Elo” tab. Give each metric a distinct visual indicator so the two series remain distinguishable.
- Link every leaderboard to the source page and document the capture date and metric definitions.

## Acceptance criteria

- The catalog and master leaderboard include all three component indexes.
- Each index opens a searchable, sortable, paginated leaderboard with all 208 models and no invented values.
- Rubric scores display as percentages; both Elo scores display in points, with source confidence intervals retained when available.
- Analytical Quality and Presentation remain separately selectable and visually identifiable while retaining their shared source-tab grouping.
- The original AA-Briefcase Elo leaderboard and other evaluations continue to work.
