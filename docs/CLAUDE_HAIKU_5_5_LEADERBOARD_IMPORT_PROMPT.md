# Prompt: add all five Claude Haiku 5.5 variants

Copy and run the following prompt when ready to implement:

---

Add all five Anthropic Claude Haiku 5.5 effort configurations from Artificial Analysis to this app's master leaderboard, Intelligence Index, and every existing individual capability index and evaluation leaderboard for which the source publishes a result. Ensure their results also appear consistently in model details, comparisons, search, filters, and exports that consume the same data.

## Official sources and identity

Start with the official release page:
https://artificialanalysis.ai/models/releases/claude-haiku-5-5

Use these five official model profiles:

| Effort | Official configuration | Profile URL |
| --- | --- | --- |
| Low | Claude Haiku 5.5 (Low, Default Fallback) | https://artificialanalysis.ai/models/claude-haiku-5-5-low |
| Medium | Claude Haiku 5.5 (Medium, Default Fallback) | https://artificialanalysis.ai/models/claude-haiku-5-5-medium |
| High | Claude Haiku 5.5 (High, Default Fallback) | https://artificialanalysis.ai/models/claude-haiku-5-5-high |
| Xhigh | Claude Haiku 5.5 (Xhigh, Default Fallback) | https://artificialanalysis.ai/models/claude-haiku-5-5-xhigh |
| Max | Claude Haiku 5.5 (Max, Default Fallback) | https://artificialanalysis.ai/models/claude-haiku-5-5/ |

These pages were verified while preparing this prompt on October 8, 2026. Fetch current results at implementation time; do not treat this document as a score snapshot. The Max profile uses the base slug, not an assumed `-max` slug. Resolve source profile IDs and exact reasoning/effort/fallback metadata from the actual profiles. Use the app's existing naming convention, retaining the fallback distinction. Keep all five configurations separate and do not merge them with older Haiku models, other effort levels, or configurations without fallback.

## Capture and coverage

Inventory the existing evaluation catalog and current Haiku entries before editing. Build a coverage matrix with one row per existing evaluation and five variant columns. For each cell, record the verified score or an explicit missing/unavailable/unresolved status, source URL, metric key, units, benchmark version, and capture date. Use rendered source pages or their public underlying data when static HTML omits the tables.

Capture all available results that map to existing evaluations, including the Intelligence Index, capability indexes, individual benchmarks, and AA-Briefcase metrics/components where published. Follow evaluation-specific pages when a profile omits a result. Distinguish combined Briefcase Elo, analytical quality Elo, presentation Elo, and rubric percentage; do not substitute one for another. Preserve raw precision, confidence intervals, estimated-score status, release metadata, and relevant per-evaluation costs when available.

Do not fabricate results, copy scores between variants, extrapolate from the Intelligence Index, or replace missing scores with zero. A verified zero is a valid result. Missing results remain absent from that individual leaderboard and empty in the master table, following existing behavior. Report any source-access blocker or unresolved mapping. Do not add unrelated models or new benchmark definitions merely because the source contains them.

## Repository implementation

Read `AGENTS.md` and inspect the complete data path, especially:

- `data/aa-model-profile-overlays.json` and `src/lib/aa-model-profile-overlays.ts`
- `data/aa-briefcase-components.json` and `src/lib/aa-briefcase.ts`
- `data/intelligence-index-costs.json` and its consumers
- `data/leaderboards.json`, `data/validation-report.json`, and `src/lib/contract.ts`
- `scripts/import-aa-model-profiles.ts`, `scripts/import-aa-briefcase-components.ts`, and `scripts/import-aa-intelligence-index-costs.ts`
- `src/lib/data.ts`, `src/lib/master.ts`, and the master and individual leaderboard components/routes
- `scripts/publish-firestore.ts` and the configured runtime data source, if publication is needed

Extend the existing authoritative inputs and import workflow rather than introducing hardcoded UI rows. Preserve other model profiles and results. Check overlay precedence, identity normalization, model/provider records, published snapshot references, source provenance, row counts, and rank recalculation across the affected evaluations. Ensure re-running the import is idempotent and does not create duplicate entries or erase unrelated results.

Use consistent numeric/display units and existing rounding. In particular, store and convert source fractions correctly for rubric percentages, and preserve actual Elo values rather than normalized chart values. Verify source benchmark versions are compatible with the app's existing snapshots before mixing results; explicitly report incompatible versions instead of silently combining them.

Capture Intelligence Index cost per task for each effort separately when available; token prices are not task costs. The current profile importer requires a valid task cost for every profile. If a verified variant lacks one, make the smallest justified change to support the existing missing-cost behavior without inventing a number or blocking valid scores. Preserve accurate per-profile capture dates so adding these models does not falsely mark older model results as newly verified.

Regenerate affected data using the appropriate import path. Determine whether the running site serves bundled JSON or Firestore and ensure the updated data reaches every applicable view through the configured source. Perform publication only within the authorization provided for the implementation task, and report any remaining publication or access blocker precisely.

## Verification and completion

Before any UI-affecting implementation, inspect the current master and individual evaluation screens and model details as required by `AGENTS.md`. Keep the existing design and verify the resulting screens visually, including the longer fallback labels, alignment, overflow, empty cells, and filtering behavior.

Verify that:

- The master leaderboard contains exactly one row for each of the five configurations.
- Each variant appears exactly once in every existing individual index/evaluation with a verified result, with no fabricated rows for unavailable results.
- Every imported score, unit, status, confidence interval, and available cost matches its source and effort configuration.
- Rankings, ties, sorting, row counts, snapshot references, model details, search, provider filters, links, and exports remain correct.
- Existing unrelated model scores and metadata are preserved, and a repeated import does not duplicate rows.

Run the appropriate existing validators, including `npx tsx scripts/validate-master.ts`, and `npm run build` where relevant. Use targeted browser verification for the master leaderboard and representative individual evaluations, checking all five variants. Retain a reviewable coverage audit with source references and missing/unresolved cells.

Report the five imported identities, affected evaluations and row counts, missing results, validation performed, and whether the live site received the update. Review the working tree and diff, commit only task changes, and push to the current branch's configured upstream as required by `AGENTS.md`. Preserve unrelated user changes, never force-push, and report any exact commit/push blocker.

---

This document prepares the implementation prompt only. Creating it does not execute the model import or publish data.
