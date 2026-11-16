# AA speed refresh — 16 Nov 2026

The model payload was retrieved at **2026-11-16T07:19:05.483Z** from the
[GPT-6.1 Sol family page](https://artificialanalysis.ai/models/gpt-6-1-sol).
Its public model manifest contains overall Intelligence Index task time and first-answer time,
but no `intelligenceIndexEvaluations`. It supplies 742 model identities.

The evaluation payloads were retrieved between **07:17:14 and 07:17:48 UTC** on the same date.
[Raw timing evidence](../data/aa-speed-captures.json) keeps exact seconds, model IDs, page URLs,
retrieval times, complete selector counts and the official loader's unit definition.
[Imported speed data](../data/aa-model-speed.json) links every available metric to its source evidence.

## Official evaluation payload

After selecting all models, AA's `EvaluationDataProvider.selectedModels` supplies
`evalTimePerTask` in seconds. The official loader divides answer plus reasoning tokens by task count
and output speed, then adds tool milliseconds per task divided by 1,000 where supplied. The capture
reads the resulting public field directly; it does not recompute or estimate timings. The loader URL,
SHA-256 and defining excerpt are stored as `unit_evidence`.

All 226 Terminal-Bench Time per Task chart values, converted from their exact minutes, matched the
captured context values within 0.00000001 seconds (maximum difference 4.55 × 10⁻¹³ seconds).

| Official page | Models selected | Current timing values | Time per Task chart |
|---|---:|---:|---|
| [AA-Briefcase](https://artificialanalysis.ai/evaluations/aa-briefcase) | 269 / 269 | 229 | Present |
| [AutomationBench-AA](https://artificialanalysis.ai/evaluations/automationbench-aa) | 264 / 264 | 228 | Absent; payload retained |
| [Terminal-Bench 4.0](https://artificialanalysis.ai/evaluations/terminalbench-4-0) | 260 / 260 | 226 | Present |
| [FrontierCode 2.0](https://artificialanalysis.ai/evaluations/frontiercode-2-0) | 134 / 134 | 121 | Present |
| [AA-Omniscience](https://artificialanalysis.ai/evaluations/omniscience) | 143 / 143 | 132 | Absent; payload retained |
| [GDP.pdf](https://artificialanalysis.ai/evaluations/gdp-pdf) | 262 / 262 | 227 | Present |
| [HLE-Diamond](https://artificialanalysis.ai/evaluations/hle-diamond) | 170 / 170 | 155 | Present |
| [CritPt v2 Hard](https://artificialanalysis.ai/evaluations/critpt-v2?critpt-subset=hard) | 136 / 136 | 122 | Present |
| [Terminal-Bench-Science](https://artificialanalysis.ai/evaluations/terminal-bench-science) | 145 / 145 | 130 | Present |

The absent AutomationBench and Omniscience chart headings were checked on their evaluation pages.
Their timing payloads are populated, so no evaluation timing slug or mapping was removed.
Original CritPt continues to use the Intelligence Index fallback; it is not CritPt v2 Hard.

## Changes from the verified 10 Nov snapshot

| Coverage | 10 Nov | 16 Nov |
|---|---:|---:|
| Speed records | 398 | 399 |
| Overall task times | 108 | 118 |
| First-answer times | 398 | 399 |
| Models with evaluation timings | 108 | 233 |
| Individual evaluation timing values | 972 | 1,570 |

Every previously populated per-evaluation timing remains populated. No scoring captures, evaluation
rows or leaderboard models were removed or changed: all 20 evaluations and 5,075 rows are unchanged.

Eight previous records contained only a first-answer value. The current model manifest has no
headline performance for these slugs, and none has an available timing in the nine complete evaluation
payloads above. Their official profiles were also retrieved successfully at 07:22:09–07:22:11 UTC;
none displayed a first-answer metric. These old values are removed rather than dated as a new capture:

- [Apodex 1.1](https://artificialanalysis.ai/models/apodex-1-1)
- [Gemma 4 12B (Non-reasoning)](https://artificialanalysis.ai/models/gemma-4-12b-non-reasoning) — now redirects to the Gemma 4 12B family page.
- [Gemma 4 12B (Reasoning)](https://artificialanalysis.ai/models/gemma-4-12b)
- [Ling 3.1 Flash, old slug](https://artificialanalysis.ai/models/ling-3-1-flash) — AA separately supplies a fresh record under `ling-3-1-flash-1001`; no old value is transferred.
- [MiniMax-M2.1](https://artificialanalysis.ai/models/minimax-m2-1)
- [Nemotron 3 Nano Omni 30B A3B Reasoning](https://artificialanalysis.ai/models/nemotron-3-nano-omni-30b-a3b)
- [Grok 3](https://artificialanalysis.ai/models/grok-3)
- [Grok 3 mini Reasoning (High)](https://artificialanalysis.ai/models/grok-3-mini-reasoning)

## Verification

- `import:aa-index-costs` ran before `import:aa-evaluations`; the latter restored the unchanged canonical cost file.
- Every captured evaluation timing round-trips by AA model ID into the runtime reader; source hashes and dates match.
- Master validation: 645 models, 20 evaluations, 5,075 reconciled cells, zero issues.
- All 47 rubric, suitability, speed and import tests pass; the 17 affected speed tests also pass after the final guards. Regressions cover incomplete payloads, shared family URLs, invalid values, timeouts, staging failures, retries and overlapping writers.
- TypeScript passes; the existing nine-slug assertion and evaluation mapping checks are retained.
- A repeat evaluation import preserves SHA-256 hashes of every data file. Production publication remains owner step O1.
