# Client meeting follow-up check

## Independent calculation

Run this block from the repository root for the six meeting steps. The sales proposal check runs the same calculation with its own workflow slug. The target groups in each row are high, moderate, then low. `index:` marks an index target. The meeting rows come from item 4 and the proposal rows come from its source table. The seven evaluation slugs are also their cell IDs in the master rows. [Phase 2 brief](../IMPLEMENTATION_PLAN-done.md#phase-2-brief-your-models-a-benchmark-bar-and-the-meeting-follow-up-workflow) · [Proposal source](proposal-source.md)

```sh
node --import tsx --input-type=module - "${WORKFLOW_CHECK:-client-meeting-followup}" <<'NODE'
import { readFileSync } from "node:fs";
import { getMasterDataset } from "./src/lib/data.ts";

delete process.env.DATA_SOURCE;
const { rows } = await getMasterDataset();
const master = new Map(rows.map(row => [row.identity_key, row.cells]));
const { models } = JSON.parse(readFileSync("data/aa-personalitybench.json", "utf8"));
const list = JSON.parse(readFileSync("workflows/models.json", "utf8"));
const listedFamilies = new Set(list.models.map(({ family }) => family));

const briefcase = "briefcase-v1-1";
const omniscience = "aa-omniscience-index";
const strategy = "strategy-ops-index";
const presentation = "aa-briefcase-presentation-elo";
const pdf = "gdp-pdf";
const workflows = {
  "client-meeting-followup": [
    ["1", "truthful disclaimsWithAssumptions informationDense flagsNuances", "", "", [briefcase, omniscience]],
    ["2", "evidenceBased pragmatic constructivelyPushesBack flagsNuances", "", "sycophantic", [strategy, "aa-briefcase-analytical-quality-elo"]],
    ["3", "providesActionableGuidance pragmatic direct disclaimsWithAssumptions", "", "openEnded", [strategy, briefcase]],
    ["4", "index:organization", "", "slop", [presentation, "aa-briefcase-rubric-score"]],
    ["5", "naturalSounding sincere direct", "index:warmth", "slop sycophantic"],
    ["6", "index:transparency constructivelyPushesBack", "", "sycophantic", [omniscience]],
  ],
  "sales-proposal": [
    ["0", "truthful naturalSounding index:organization", "", "slop sycophantic", [briefcase, pdf]],
    ["1", "truthful flagsNuances disclaimsWithAssumptions admitsUncertainty", "", "", [pdf, briefcase]],
    ["2", "creative structured", "", "openEnded"],
    ["3a", "sincere emotionallyIntelligent evidenceBased", "metaphorical", "humorous", [briefcase]],
    ["3b", "structured pragmatic confident direct", "", "openEnded", [briefcase]],
    ["3c", "evidenceBased truthful", "", "", [briefcase]],
    ["3d", "disclaimsWithAssumptions", "flagsNuances", "", [briefcase]],
    ["3e", "providesActionableGuidance direct", "", "", [briefcase]],
    ["3f", "answerFirst summarizesBottomLine confident scannable", "", "slop", [briefcase]],
    ["4", "evidenceBased pragmatic truthful admitsUncertainty", "", "slop"],
    ["5", "flagsNuances structured", "", "", [briefcase, pdf]],
    ["6", "constructivelyPushesBack direct flagsNuances", "", "sycophantic index:warmth"],
    ["7", "naturalSounding eloquent scannable answerFirst", "lexicallyVaried metaphorical admitsUncertainty", "creative openEnded", [presentation]],
    ["8", "", "", "slop"],
  ],
};

const workflowToCheck = process.argv[2];
if (!Object.hasOwn(workflows, workflowToCheck)) throw new Error(`Unknown workflow: ${workflowToCheck}`);
for (const [workflow, steps] of Object.entries(workflows)) {
  if (workflow !== workflowToCheck) continue;
  for (const [step, high, moderate, low, evaluations = []] of steps) {
    const benchmarks = evaluations.map(slug => {
      const cohort = rows.filter(row => row.cells[slug]?.entry.source_rank != null).length;
      return { slug, cohort, bar: cohort ? Math.max(1, Math.floor(cohort / 4)) : null };
    });
    const targets = [[high, p => p], [moderate, p => 100 - 2 * Math.abs(p - 50)], [low, p => 100 - p]]
      .flatMap(([keys, points]) => keys.split(" ").filter(Boolean).map(key => ({ key, points })));
    const scored = models.map(model => {
      const family = model.identity_key.replace(/ \([^()]*\)$/, "");
      const listed = list.providers.includes(model.provider) || listedFamilies.has(family.replace("\0", " "));
      const scores = targets.flatMap(({ key, points }) => {
        const p = key.startsWith("index:") ? model.index_percentiles[key.slice(6)] : model.traits[key]?.percentile;
        return p == null ? [] : [points(p)];
      });
      const fit = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
      const ranks = benchmarks.map(({ slug }) => master.get(model.identity_key)?.[slug]?.entry.source_rank ?? null);
      return { name: model.name, family, listed, fit, ranks };
    });
    const ranked = scored.filter(({ listed, ranks }) => listed && benchmarks.every(({ bar }, i) =>
      bar === null || (ranks[i] !== null && ranks[i] <= bar)))
      .sort((a, b) => {
        const difference = (b.fit ?? -1) - (a.fit ?? -1);
        // Treat floating-point sum noise as a tie before sorting by name.
        return Math.abs(difference) <= 1e-12 ? a.name.localeCompare(b.name) : difference;
      });
    const picks = new Map();
    for (const { name, family, fit, ranks } of ranked) {
      if (!picks.has(family)) picks.set(family, { name, fit, ranks });
      if (picks.size === 3) break;
    }
    console.log(JSON.stringify({ workflow, step, benchmarks, picks: [...picks.values()] }));
  }
}
NODE
```

## Chat, script and app picks

Data checked with the 19 Nov 2026 leaderboard refresh and the 16:51 UTC PersonalityBench capture. The pick and both runners-up kept their order on all six steps. The refresh column compares bars and ranks in pick order with the earlier 19 Nov data.

The app column comes from `stepPicks`, `evaluationRanks` and `barRank` with the bundled master dataset. The script and app agree on the model variants, unrounded Fit and ranks for all six steps. Their columns show the pick in bold, then its runners-up in order. Fit is shown to two decimals, followed by ranks in the benchmark order for the step. The Claude Max names here refer to the adaptive-reasoning variants with default fallback. [Workflow scorer](../../src/lib/workflows.ts)

| Step | Benchmarks (bar rank / cohort) | Chat picks | Independent script | App | Comparison | Moved in the 19 Nov 2026 refresh |
|---|---|---|---|---|---|---|
| 1 | Briefcase #72/289<br>Omniscience #42/169 | Opus 5.5 Max<br>Fable 5.1 Max<br>GPT-6 Astra Max | **Opus 5.5 Max** 93.81 (#2/289, #13/169)<br>Fable 5.1 Max 93.34 (#13/289, #16/169)<br>GPT-6 Astra Max 75.25 (#38/289, #25/169) | **Opus 5.5 Max** 93.81 (#2/289, #13/169)<br>Fable 5.1 Max 93.34 (#13/289, #16/169)<br>GPT-6 Astra Max 75.25 (#38/289, #25/169) | Match | Briefcase bar #70/281 → #72/289, ranks (2, 12, 36) → (2, 13, 38).<br>Omniscience bar #39/157 → #42/169, ranks (9, 12, 21) → (13, 16, 25). |
| 2 | Strategy & Ops #42/168<br>Analytical Quality #72/289 | Fable 5.1 Max<br>Opus 5.5 Max<br>Sonnet 5.5 Max | **Fable 5.1 Max** 98.28 (#18/168, #11/289)<br>Opus 5.5 Max 85.71 (#10/168, #1/289)<br>Sonnet 5.5 Max 75.05 (#16/168, #3/289) | **Fable 5.1 Max** 98.28 (#18/168, #11/289)<br>Opus 5.5 Max 85.71 (#10/168, #1/289)<br>Sonnet 5.5 Max 75.05 (#16/168, #3/289) | Match | Strategy & Ops bar #39/156 → #42/168, ranks (15, 8, 13) → (18, 10, 16).<br>Analytical Quality bar #70/281 → #72/289. |
| 3 | Strategy & Ops #42/168<br>Briefcase #72/289 | Fable 5.1 Max<br>Opus 5.5 Max<br>GPT-6.2 Sol Max | **Fable 5.1 Max** 64.01 (#18/168, #13/289)<br>Opus 5.5 Max 62.48 (#10/168, #2/289)<br>GPT-6.2 Sol High 61.72 (#19/168, #45/289) | **Fable 5.1 Max** 64.01 (#18/168, #13/289)<br>Opus 5.5 Max 62.48 (#10/168, #2/289)<br>GPT-6.2 Sol High 61.72 (#19/168, #45/289) | Sol High and Max have the same unrounded Fit of 61.72307692307693. Max clears both bars at Strategy & Ops #14/168 and Briefcase #25/289. The model-name tiebreak puts High first. | Strategy & Ops bar #39/156 → #42/168, ranks (15, 8, 16) → (18, 10, 19).<br>Briefcase bar #70/281 → #72/289, ranks (12, 2, 43) → (13, 2, 45). |
| 4 | Presentation #72/289<br>Rubric Score #72/289 | GPT-6.1 Sol Max<br>Sonnet 5.5 Max<br>Opus 5.5 Max | **GPT-6.1 Sol Max** 78.04 (#58/289, #36/289)<br>Sonnet 5.5 Max 75.70 (#3/289, #2/289)<br>Opus 5.5 Max 71.89 (#4/289, #13/289) | **GPT-6.1 Sol Max** 78.04 (#58/289, #36/289)<br>Sonnet 5.5 Max 75.70 (#3/289, #2/289)<br>Opus 5.5 Max 71.89 (#4/289, #13/289) | Match | Presentation bar #70/281 → #72/289, ranks (56, 1, 2) → (58, 3, 4).<br>Rubric Score bar #70/281 → #72/289, ranks (34, 2, 12) → (36, 2, 13). |
| 5 | No bar | GPT-6.2 Astra Medium<br>GPT-6.2 Sol High<br>GPT-6 Sol Max | **GPT-6.2 Astra Medium** 87.88<br>GPT-6.2 Sol High 80.55<br>GPT-6 Sol Max 74.43 | **GPT-6.2 Astra Medium** 87.88<br>GPT-6.2 Sol High 80.55<br>GPT-6 Sol Max 74.43 | Match | — |
| 6 | Omniscience #42/169 | Fable 5.1 Max<br>Opus 5.5 Max<br>Fable 5.2 Max | **Fable 5.1 Max** 97.76 (#16/169)<br>Opus 5.5 Max 78.09 (#13/169)<br>Fable 5.2 Max 76.82 (#1/169) | **Fable 5.1 Max** 97.76 (#16/169)<br>Opus 5.5 Max 78.09 (#13/169)<br>Fable 5.2 Max 76.82 (#1/169) | Match | Omniscience bar #39/157 → #42/169, ranks (12, 9, 1) → (16, 13, 1). |
