# Client meeting follow-up check

## Independent calculation

Run this block from the repository root. The target groups in each row are high, moderate, then low. `index:` marks an index target. The meeting rows come from item 4 and the proposal rows come from its source table. The seven evaluation slugs are also their cell IDs in the master rows. [Phase 2 brief](../IMPLEMENTATION_PLAN.md#phase-2-brief-your-models-a-benchmark-bar-and-the-meeting-follow-up-workflow) · [Proposal source](proposal-source.md)

```sh
node --import tsx --input-type=module <<'NODE'
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

for (const [workflow, steps] of Object.entries(workflows)) {
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

The app column comes from `stepPicks`, `evaluationRanks` and `barRank` with the bundled master dataset. The script and app agree on the model variants, unrounded Fit and ranks for all six steps. Their columns show the pick in bold, then its runners-up in order. Fit is shown to two decimals, followed by ranks in the benchmark order for the step. The Claude Max names here refer to the adaptive-reasoning variants with default fallback. [Workflow scorer](../../src/lib/workflows.ts)

| Step | Benchmarks (bar rank / cohort) | Chat picks | Independent script | App | Comparison |
|---|---|---|---|---|---|
| 1 | Briefcase #70/281<br>Omniscience #39/157 | Opus 5.5 Max<br>Fable 5.1 Max<br>GPT-6 Astra Max | **Opus 5.5 Max** 93.81 (#2/281, #9/157)<br>Fable 5.1 Max 93.34 (#12/281, #12/157)<br>GPT-6 Astra Max 75.25 (#36/281, #21/157) | **Opus 5.5 Max** 93.81 (#2/281, #9/157)<br>Fable 5.1 Max 93.34 (#12/281, #12/157)<br>GPT-6 Astra Max 75.25 (#36/281, #21/157) | Match |
| 2 | Strategy & Ops #39/156<br>Analytical Quality #70/281 | Fable 5.1 Max<br>Opus 5.5 Max<br>Sonnet 5.5 Max | **Fable 5.1 Max** 98.28 (#15/156, #11/281)<br>Opus 5.5 Max 85.71 (#8/156, #1/281)<br>Sonnet 5.5 Max 75.05 (#13/156, #3/281) | **Fable 5.1 Max** 98.28 (#15/156, #11/281)<br>Opus 5.5 Max 85.71 (#8/156, #1/281)<br>Sonnet 5.5 Max 75.05 (#13/156, #3/281) | Match |
| 3 | Strategy & Ops #39/156<br>Briefcase #70/281 | Fable 5.1 Max<br>Opus 5.5 Max<br>GPT-6.2 Sol Max | **Fable 5.1 Max** 64.01 (#15/156, #12/281)<br>Opus 5.5 Max 62.48 (#8/156, #2/281)<br>GPT-6.2 Sol High 61.72 (#16/156, #43/281) | **Fable 5.1 Max** 64.01 (#15/156, #12/281)<br>Opus 5.5 Max 62.48 (#8/156, #2/281)<br>GPT-6.2 Sol High 61.72 (#16/156, #43/281) | Sol High and Max have the same unrounded Fit of 61.72307692307693. Max clears both bars at Strategy & Ops #11/156 and Briefcase #23/281. The model-name tiebreak puts High first. |
| 4 | Presentation #70/281<br>Rubric Score #70/281 | GPT-6.1 Sol Max<br>Sonnet 5.5 Max<br>Opus 5.5 Max | **GPT-6.1 Sol Max** 78.04 (#56/281, #34/281)<br>Sonnet 5.5 Max 75.70 (#1/281, #2/281)<br>Opus 5.5 Max 71.89 (#2/281, #12/281) | **GPT-6.1 Sol Max** 78.04 (#56/281, #34/281)<br>Sonnet 5.5 Max 75.70 (#1/281, #2/281)<br>Opus 5.5 Max 71.89 (#2/281, #12/281) | Match |
| 5 | No bar | GPT-6.2 Astra Medium<br>GPT-6.2 Sol High<br>GPT-6 Sol Max | **GPT-6.2 Astra Medium** 87.88<br>GPT-6.2 Sol High 80.55<br>GPT-6 Sol Max 74.43 | **GPT-6.2 Astra Medium** 87.88<br>GPT-6.2 Sol High 80.55<br>GPT-6 Sol Max 74.43 | Match |
| 6 | Omniscience #39/157 | Fable 5.1 Max<br>Opus 5.5 Max<br>Fable 5.2 Max | **Fable 5.1 Max** 97.76 (#12/157)<br>Opus 5.5 Max 78.09 (#9/157)<br>Fable 5.2 Max 76.82 (#1/157) | **Fable 5.1 Max** 97.76 (#12/157)<br>Opus 5.5 Max 78.09 (#9/157)<br>Fable 5.2 Max 76.82 (#1/157) | Match |
