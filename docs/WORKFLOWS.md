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
- Add `evaluations` as an optional list of slugs to show each model’s ranks. Use `other_checks` for checks outside the evaluation catalog, such as the AA-Omniscience hallucination rate. Use `note` for optional instructions from the source. Both fields accept a text string.
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
| `terminal-bench-4-0` | Terminal-Bench 4.0 |
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

## Register, check and ship

Import the JSON in the registry and add its path as a key in `sources`. An existing workflow already has this entry. [Workflow registry](../src/lib/workflow-registry.ts)

```ts
import clientRecap from "../../workflows/client-recap.json";

// Inside sources
"workflows/client-recap.json": clientRecap,
```

Compare each target and aim against the source. To inspect the pick and runners-up, call `stepPicks` with the step and `getPersonalityDataset()`. Run the workflow tests to check schema validation, registry coverage and scoring, then type-check the project.

```sh
node --import tsx --test tests/workflows.test.ts
npx tsc --noEmit -p tsconfig.json
git diff --check
```

Commit and push the workflow to your branch. Its JSON ships with the app, and it reaches the live site on the next release.
