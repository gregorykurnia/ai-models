# GPT-6.1 Sol rank impact

Artificial Analysis released five GPT-6.1 Sol effort variants on 29 September 2026: max, xhigh, high, medium, and low. This note inserts their published evaluation scores into the project’s 29 September 2026 leaderboard capture and records each resulting position across all 16 evaluation columns.

These are insertion ranks against the captured cohort, rather than a refreshed copy of every live Artificial Analysis leaderboard. Existing source order is preserved for equal captured scores; new rows with equal scores are ordered by model name. Each existing row with a lower score than a new model moves down one place for that insertion. “Existing rows shifted” counts models whose position changes at least once in that evaluation; a model can move down by more than one place when several Sol variants score above it.

**Implementation status:** Applied to the bundled leaderboard snapshot as 80 model/evaluation rows (five effort variants across all 16 evaluations). Existing ranks are shifted to match the positions below. The live data overlay and its Artificial Analysis source profiles are recorded in `data/leaderboards.json`.

| Evaluation | Max | Xhigh | High | Medium | Low | Existing rows shifted |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| [Briefcase v1.1](https://artificialanalysis.ai/evaluations/aa-briefcase) | 20 | 29 | 37 | 51 | 88 | 183 / 202 |
| [GDPval-AA v2.1](https://artificialanalysis.ai/evaluations/gdpval-aa) | 31 | 40 | 42 | 54 | 85 | 231 / 261 |
| [AutomationBench-AA](https://artificialanalysis.ai/evaluations/automationbench-aa) | 12 | 9 | 15 | 20 | 63 | 190 / 198 |
| [Terminal-Bench 4.0](https://artificialanalysis.ai/evaluations/terminalbench-4-0) | 8 | 10 | 15 | 18 | 38 | 187 / 194 |
| [SciCode](https://artificialanalysis.ai/evaluations/scicode) | 59 | 44 | 40 | 70 | 69 | 168 / 207 |
| [Humanity’s Last Exam](https://artificialanalysis.ai/evaluations/humanitys-last-exam) | 16 | 19 | 20 | 23 | 35 | 627 / 642 |
| [GDP.pdf](https://artificialanalysis.ai/evaluations/gdp-pdf) | 6 | 3 | 2 | 9 | 16 | 189 / 190 |
| [CritPt](https://artificialanalysis.ai/evaluations/critpt) | 2 | 3 | 17 | 27 | 42 | 556 / 557 |
| [AA-Omniscience Accuracy](https://artificialanalysis.ai/evaluations/omniscience) | 12 | 17 | 18 | 19 | 26 | 543 / 554 |
| [AA-LCR v1.1](https://artificialanalysis.ai/evaluations/artificial-analysis-long-context-reasoning) | 30 | 85 | 34 | 19 | 14 | 540 / 553 |
| [MMMU-Pro](https://artificialanalysis.ai/evaluations/mmmu-pro) | 9 | 10 | 19 | 24 | 25 | 271 / 279 |
| [Finance & Accounting](https://artificialanalysis.ai/models/capabilities/finance-and-accounting) | 14 | 15 | 17 | 24 | 46 | 168 / 181 |
| [Economics Index](https://artificialanalysis.ai/models/capabilities/economics) | 13 | 15 | 20 | 25 | 41 | 183 / 195 |
| [Strategy & Ops Index](https://artificialanalysis.ai/models/capabilities/strategy-and-ops) | 11 | 14 | 17 | 25 | 57 | 171 / 181 |
| [AA-Omniscience Index](https://artificialanalysis.ai/evaluations/omniscience) | 10 | 15 | 11 | 17 | 20 | 545 / 554 |
| [Intelligence Index](https://artificialanalysis.ai/models/releases/gpt-6-1-sol) | 10 | 11 | 16 | 24 | 44 | 661 / 670 |

Ranks use higher-is-better source scores. The captured dataset stores some index scores as rounded display values; when those values tie, the existing captured source order determines their order relative to the new rows.

## Artificial Analysis model profiles

The per-effort scores come from Artificial Analysis’s GPT-6.1 Sol profiles, checked 30 September 2026:

- [Max](https://artificialanalysis.ai/models/gpt-6-1-sol)
- [Xhigh](https://artificialanalysis.ai/models/gpt-6-1-sol-xhigh)
- [High](https://artificialanalysis.ai/models/gpt-6-1-sol-high)
- [Medium](https://artificialanalysis.ai/models/gpt-6-1-sol-medium)
- [Low](https://artificialanalysis.ai/models/gpt-6-1-sol-low)
