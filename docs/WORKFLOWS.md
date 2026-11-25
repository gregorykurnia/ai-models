# Add a workflow to Model Atlas

Give the coding chat the source workflow and ask it to add or update the workflow in Workflows. For each step, carry over its goal, the traits or indexes to aim for, and any evaluation or manual check. The shipped example has both trait and index targets. [Sales proposal workflow](../workflows/sales-proposal.json)

## Format

Create `workflows/<slug>.json`. Use a short, URL-friendly filename. Set `slug` to that filename without `.json`, and write `updated` as `YYYY-MM-DD`.

```json
{
  "slug": "client-recap",
  "title": "Client recap",
  "summary": "Turn meeting notes into a recap for the client.",
  "updated": "2026-11-19",
  "steps": [
    {
      "id": "1",
      "title": "Write the recap",
      "goal": "Summarize decisions and list next steps with their owners.",
      "targets": [
        { "trait": "providesActionableGuidance", "aim": "high" },
        { "index": "warmth", "aim": "moderate" },
        { "trait": "slop", "aim": "low" }
      ],
      "evaluations": ["briefcase-v1-1"],
      "other_checks": "Check the Briefcase Word breakdown.",
      "note": "Send the recap to the meeting owner for review."
    }
  ]
}
```

- Write a title, summary and ordered `steps`. Give each step a unique `id` using lowercase letters, digits and hyphens. IDs become page anchors such as `#step-1`.
- Give each step a title, a goal and at least one target. Each target has exactly one `trait` or `index` key from the tables below, plus the `aim` `high`, `moderate` or `low`. List each trait or index once per step.
- Add `evaluations` as an optional list of slugs to set the step's benchmark bar and show each model’s ranks. Use `other_checks` for checks outside the evaluation catalog, such as the AA-Omniscience hallucination rate. Use `note` for optional instructions from the source. Both fields accept a text string.
- Fit averages the target scores. A raw percentile `p` scores `p` for `high`, `100 − p` for `low`, and `100 − 2 × |p − 50|` for `moderate`. Aim low for less Slop or Sycophantic behavior. Evaluation ranks appear alongside Fit.

## Trait keys

| Key | Label |
|---|---|
| `lexicallyVaried` | Lexically Varied |
| `eloquent` | Eloquent |
| `literate` | Literate |
| `naturalSounding` | Natural Sounding |
| `metaphorical` | Metaphorical |
| `structured` | Structured |
| `scannable` | Scannable |
| `summarizesBottomLine` | Bottom-Line Summary |
| `answerFirst` | Answer First |
| `informationDense` | Information Dense |
| `evidenceBased` | Evidence-Based |
| `resourceSpecific` | Resource-Specific |
| `providesActionableGuidance` | Actionable Guidance |
| `pragmatic` | Pragmatic |
| `truthful` | Truthful |
| `admitsUncertainty` | Admits Uncertainty |
| `disclaimsWithAssumptions` | Disclaims Assumptions |
| `flagsNuances` | Flags Nuances |
| `sycophantic` | Sycophantic |
| `friendly` | Friendly |
| `humorous` | Humorous |
| `sincere` | Sincere |
| `emotionallyIntelligent` | Emotionally Intelligent |
| `direct` | Direct |
| `confident` | Confident |
| `opinionated` | Opinionated |
| `constructivelyPushesBack` | Constructive Pushback |
| `creative` | Creative |
| `openEnded` | Open-Ended |
| `slop` | Slop |

## Index keys

The `trait` and `index` fields each have a `slop` key. Each reads a different percentile. [AA-PersonalityBench data](../data/aa-personalitybench.json)

| Key | Label |
|---|---|
| `expressiveness` | Expressiveness |
| `organization` | Organization |
| `informativeness` | Informativeness |
| `transparency` | Transparency |
| `warmth` | Warmth |
| `conviction` | Conviction |
| `imagination` | Imagination |
| `slop` | Slop |

## Evaluation slugs

Use the `slug` field from the bundled evaluation catalog. [Leaderboard catalog](../data/leaderboards.json)

| Slug | Evaluation |
|---|---|
| `briefcase-v1-1` | Briefcase v1.1 |
| `automationbench-aa` | AutomationBench-AA |
| `terminal-bench-4-1` | Terminal-Bench 4.1 |
| `gdp-pdf` | GDP.pdf |
| `critpt` | CritPt |
| `aa-omniscience-accuracy` | AA-Omniscience Accuracy |
| `mmmu-pro` | MMMU-Pro |
| `finance-accounting` | Finance & Accounting |
| `economics-index` | Economics Index |
| `strategy-ops-index` | Strategy & Ops Index |
| `aa-omniscience-index` | AA-Omniscience Index |
| `intelligence-index` | Intelligence Index |
| `frontiercode-2-0` | FrontierCode 2.0 |
| `critpt-v2-full` | CritPt v2 (Full Set) |
| `critpt-v2-hard` | CritPt v2 (Hard Subset) |
| `swe-atlas-qna-aa` | SWE-Atlas-QnA |
| `aa-briefcase-rubric-score` | AA-Briefcase Rubric Score (%) |
| `aa-briefcase-analytical-quality-elo` | AA-Briefcase Analytical Quality Elo |
| `aa-briefcase-presentation-elo` | AA-Briefcase Presentation Elo |

## Your models and the benchmark bar

Edit `workflows/models.json` and set `updated` to the date of the change. To add every model from a provider, put its exact `provider` label from the data in `providers`. To add one family, put a `label` and `family` entry in `models`. Remove the corresponding entry to take it off the list. A family stays eligible if its provider is still in `providers`. To keep only some of that provider's families, remove the provider entry and list those families individually. [Shared model list](../workflows/models.json)

Find the model by `name` in `data/aa-personalitybench.json` and copy its `identity_key`. Remove the final parenthesized variant and the space before it. Replace the NUL separator, written `\u0000` in the JSON, with one ordinary space. For a model found only in `data/leaderboards.json`, use the entry's `provider` and `model`. Lowercase both, trim and collapse whitespace, remove the same trailing variant, and join them with a space. A family needs a personality row to receive a pick. [Personality data](../data/aa-personalitybench.json) · [Leaderboard data](../data/leaderboards.json)

For example, Grok 4.5 (High) has the identity key `spacexai\u0000grok 4.5 (high)`. Its model list entry covers all efforts in that family.

```json
{ "label": "Grok 4.5", "family": "spacexai grok 4.5" }
```

Fit orders the listed models that clear every benchmark the step uses. The top-25% bar is `max(1, floor(cohort size × 0.25))`, where the cohort counts master rows with a rank for that evaluation. Rank 39 of 157 clears the bar and rank 40 misses. An unranked model misses the bar for that evaluation. If the master data has zero ranked rows for an evaluation, the app skips that evaluation. A step with no evaluations has no bar. The shared fraction is `BENCHMARK_BAR` in `src/lib/workflows.ts`. [Benchmark bar constant](../src/lib/workflows.ts)

## Register, check and ship

Import the JSON in the registry and add its path as a key in `sources`. An existing workflow already has this entry. [Workflow registry](../src/lib/workflow-registry.ts)

```ts
import clientRecap from "../../workflows/client-recap.json";

// Inside sources
"workflows/client-recap.json": clientRecap,
```

Compare each target and aim against the source. To inspect the pick and runners-up, call `stepPicks(step, getPersonalityDataset(), workflowModelList, (await getMasterDataset()).rows)` with `workflowModelList` from the registry. Run the workflow tests to check schema validation, registry coverage and scoring, then type-check the project.

```sh
node --import tsx --test tests/workflows.test.ts
npx tsc --noEmit -p tsconfig.json
git diff --check
```

Commit and push the workflow to your branch. Its JSON ships with the app, and it reaches the live site on the next release.
