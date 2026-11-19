# Sales proposal check

| Step | JSON targets | Source targets | Match |
|---|---|---|---|
| 0 | **High** `truthful`, `naturalSounding`, `organization` (index)<br>**Low** `slop`, `sycophantic` | **High** Truthful, Natural Sounding, Organization (index)<br>**Low** Slop, Sycophantic | Same |
| 1 | **High** `truthful`, `flagsNuances`, `disclaimsWithAssumptions`, `admitsUncertainty` | **High** Truthful, Flags Nuances, Disclaims Assumptions, Admits Uncertainty | Same |
| 2 | **High** `creative`, `structured`<br>**Low** `openEnded` | **High** Creative, Structured<br>**Low** Open-Ended | Same |
| 3a | **High** `sincere`, `emotionallyIntelligent`, `evidenceBased`<br>**Moderate** `metaphorical`<br>**Low** `humorous` | **High** Sincere, Emotionally Intelligent, Evidence-Based<br>**Moderate** Metaphorical<br>**Low** Humorous | Same |
| 3b | **High** `structured`, `pragmatic`, `confident`, `direct`<br>**Low** `openEnded` | **High** Structured, Pragmatic, Confident, Direct<br>**Low** Open-Ended | Same |
| 3c | **High** `evidenceBased`, `truthful` | **High** Evidence-Based, Truthful | Same |
| 3d | **High** `disclaimsWithAssumptions`<br>**Moderate** `flagsNuances` | **High** Disclaims Assumptions<br>**Moderate** Flags Nuances | Same |
| 3e | **High** `providesActionableGuidance`, `direct` | **High** Actionable Guidance, Direct | Same |
| 3f | **High** `answerFirst`, `summarizesBottomLine`, `confident`, `scannable`<br>**Low** `slop` | **High** Answer First, Bottom-Line Summary, Confident, Scannable<br>**Low** Slop | Same |
| 4 | **High** `evidenceBased`, `pragmatic`, `truthful`, `admitsUncertainty`<br>**Low** `slop` | **High** Evidence-Based, Pragmatic, Truthful, Admits Uncertainty<br>**Low** Slop | Same |
| 5 | **High** `flagsNuances`, `structured` | **High** Flags Nuances, Structured | Same |
| 6 | **High** `constructivelyPushesBack`, `direct`, `flagsNuances`<br>**Low** `sycophantic`, `warmth` (index) | **High** Constructive Pushback, Direct, Flags Nuances<br>**Low** Sycophantic, Warmth (index) | Same |
| 7 | **High** `naturalSounding`, `eloquent`, `scannable`, `answerFirst`<br>**Moderate** `lexicallyVaried`, `metaphorical`, `admitsUncertainty`<br>**Low** `creative`, `openEnded` | **High** Natural Sounding, Eloquent, Scannable, Answer First<br>**Moderate** Lexically Varied, Metaphorical, Admits Uncertainty<br>**Low** Creative, Open-Ended | Same |
| 8 | **Low** `slop` | **Low** Slop | Same |

The source lists 14 steps, and the JSON keeps all 14 (the plan's "15" was a miscount). [Proposal source](proposal-source.md)

AA-Briefcase, its presentation quality, and GDP.pdf map to `briefcase-v1-1`, `aa-briefcase-presentation-elo`, and `gdp-pdf`. The Word and PDF breakdown, AA-Omniscience hallucination rate, and GDPval-AA v2 stay in `other_checks`.

## Independent calculation

Run this block from the repository root for the 14 proposal steps. It runs the shared calculation from the meeting check with the sales proposal targets. [Independent calculation](client-meeting-followup-check.md#independent-calculation)

```sh
check=$(awk '/^```sh$/ { script = 1; next } script && /^```$/ { exit } script { print }' docs/workflows/client-meeting-followup-check.md)
test -n "$check" && WORKFLOW_CHECK=sales-proposal sh -eu -c "$check"
```

## Hand, script and app picks

Data checked with the 19 Nov 2026 leaderboard refresh and the 16:51 UTC PersonalityBench capture. The pick and both runners-up kept their order on all 14 steps. The refresh column compares bars and ranks in pick order with the earlier 19 Nov data.

The independent calculation includes all 14 proposal steps and agrees with the app on every model variant, unrounded Fit and rank. The script and app columns show the pick in bold, then its runners-up in order. Fit is shown to two decimals, followed by ranks in the benchmark order for the step. A hand pick that omits the effort matches by family. The Claude Max names here refer to the adaptive-reasoning variants with default fallback. [Proposal source](proposal-source.md#hand-picks-rank-1-then-runners-up)

| Step | Benchmarks (bar rank / cohort) | Hand picks | Independent script | App | Comparison | Moved in the 19 Nov 2026 refresh |
|---|---|---|---|---|---|---|
| 0 | Briefcase #72/289<br>GDP.pdf #70/283 | — | **Fable 5.1 Max** 81.32 (#13/289, #50/283)<br>Sonnet 5.5 Max 75.23 (#1/289, #55/283)<br>Fable 5.2 Max 74.09 (#3/289, #67/283) | **Fable 5.1 Max** 81.32 (#13/289, #50/283)<br>Sonnet 5.5 Max 75.23 (#1/289, #55/283)<br>Fable 5.2 Max 74.09 (#3/289, #67/283) | The source leaves this step open. Fable 5.1 leads the eligible models at Fit 81.32. | Briefcase bar #70/281 → #72/289, ranks (12, 1, 3) → (13, 1, 3).<br>GDP.pdf bar #68/275 → #70/283, ranks (46, 51, 63) → (50, 55, 67). |
| 1 | GDP.pdf #70/283<br>Briefcase #72/289 | Sonnet 5.5 Max<br>Opus 5.5 Max<br>Fable 5.2 Max | **Sonnet 5.5 Max** 95.24 (#55/283, #1/289)<br>Opus 5.5 Max 91.43 (#50/283, #2/289)<br>GPT-6 Astra Max 90.48 (#10/283, #38/289) | **Sonnet 5.5 Max** 95.24 (#55/283, #1/289)<br>Opus 5.5 Max 91.43 (#50/283, #2/289)<br>GPT-6 Astra Max 90.48 (#10/283, #38/289) | Fable 5.2 clears GDP.pdf at #67/283 and Briefcase at #3/289. GPT-6 Astra takes third on Fit, 90.48 to 75.73. | GDP.pdf bar #68/275 → #70/283, ranks (51, 46, 7) → (55, 50, 10).<br>Briefcase bar #70/281 → #72/289, ranks (1, 2, 36) → (1, 2, 38). |
| 2 | No bar | Opus 5.5 Max<br>Gemini 3.8 Flash High<br>Fable 5.1 Max | **Gemini 3.8 Flash High** 94.59<br>Gemini 3.1 Pro Preview 86.34<br>Fable 5.1 Max 73.01 | **Gemini 3.8 Flash High** 94.59<br>Gemini 3.1 Pro Preview 86.34<br>Fable 5.1 Max 73.01 | Gemini 3.8 moves to first at Fit 94.59. Gemini 3.1 takes second at 86.34. Both beat Opus at 71.11, as does Fable 5.1 at 73.01. | — |
| 3a | Briefcase #72/289 | Fable 5.1<br>Muse Spark 1.3<br>GLM-5.3 Max | **Fable 5.2 Max** 72.57 (#3/289)<br>Haiku 5.5 Max 72.18 (#34/289)<br>Fable 5.1 Max 68.00 (#13/289) | **Fable 5.2 Max** 72.57 (#3/289)<br>Haiku 5.5 Max 72.18 (#34/289)<br>Fable 5.1 Max 68.00 (#13/289) | Fable 5.2 (72.57) and Haiku (72.18) move Fable 5.1 (68.00) to third on Fit. Muse (50.86, Briefcase #31) and GLM (66.47, #59) clear the bar and trail Fable 5.1 on Fit. | Briefcase bar #70/281 → #72/289, ranks (3, 32, 12) → (3, 34, 13). |
| 3b | Briefcase #72/289 | Gemini 3.8 Flash High<br>GPT-6.2 Sol<br>Opus 5.5 Max | **GPT-6.2 Sol High** 71.24 (#45/289)<br>Fable 5.1 Max 70.48 (#13/289)<br>DeepSeek V4.1 Flash 1017 Max 67.43 (#36/289) | **GPT-6.2 Sol High** 71.24 (#45/289)<br>Fable 5.1 Max 70.48 (#13/289)<br>DeepSeek V4.1 Flash 1017 Max 67.43 (#36/289) | Gemini's Fit is 76.19 and its Briefcase rank #132/289 misses bar #72. Sol High leads the eligible rows at 71.24. Fable 5.1 (70.48) and DeepSeek 1017 (67.43) beat Opus (60.96) on Fit. | Briefcase bar #70/281 → #72/289, ranks (43, 12, 34) → (45, 13, 36). |
| 3c | Briefcase #72/289 | Opus 5.5<br>Fable 5.1<br>Sonnet 5.5 | **Opus 5.5 Max** 99.05 (#2/289)<br>Fable 5.1 Max 97.14 (#13/289)<br>Sonnet 5.5 Max 96.19 (#1/289) | **Opus 5.5 Max** 99.05 (#2/289)<br>Fable 5.1 Max 97.14 (#13/289)<br>Sonnet 5.5 Max 96.19 (#1/289) | Match | Briefcase bar #70/281 → #72/289, ranks (2, 12, 1) → (2, 13, 1). |
| 3d | Briefcase #72/289 | GPT-6.1 Sol Max<br>GPT-6 Astra Max<br>Sonnet 5.5 Max | **Fable 5.2 Max** 85.22 (#3/289)<br>GPT-6.1 Sol Max 84.27 (#43/289)<br>GPT-6 Astra Max 77.61 (#38/289) | **Fable 5.2 Max** 85.22 (#3/289)<br>GPT-6.1 Sol Max 84.27 (#43/289)<br>GPT-6 Astra Max 77.61 (#38/289) | Fable 5.2 leads at Fit 85.22, ahead of Sol Max at 84.27. Sonnet clears Briefcase at #1 and its Fit of 55.71 puts it behind Astra Max at 77.61. | Briefcase bar #70/281 → #72/289, ranks (3, 41, 36) → (3, 43, 38). |
| 3e | Briefcase #72/289 | Muse Spark 1.3<br>Gemini 3.8 Flash High<br>GPT-6.2 Astra | **DeepSeek V4.1 Flash 1017 Max** 70.49 (#36/289)<br>Haiku 5.5 Max 61.92 (#34/289)<br>GPT-6.2 Sol High 60.97 (#45/289) | **DeepSeek V4.1 Flash 1017 Max** 70.49 (#36/289)<br>Haiku 5.5 Max 61.92 (#34/289)<br>GPT-6.2 Sol High 60.97 (#45/289) | DeepSeek 1017 (70.49), Haiku (61.92) and Sol High (60.97) beat Muse (57.16) on Fit. Gemini misses Briefcase at #132/289. Astra's best eligible Fit is 53.36 (High at Briefcase #37 and Xhigh at #30). | Briefcase bar #70/281 → #72/289, ranks (34, 32, 43) → (36, 34, 45). |
| 3f | Briefcase #72/289 | GPT-6.2 Sol<br>GPT-6.2 Astra<br>Gemini 3.8 Flash | **DeepSeek V4.1 Flash 1017 Max** 68.96 (#36/289)<br>GPT-6.2 Sol Medium 62.10 (#63/289)<br>Fable 5.1 Max 57.53 (#13/289) | **DeepSeek V4.1 Flash 1017 Max** 68.96 (#36/289)<br>GPT-6.2 Sol Medium 62.10 (#63/289)<br>Fable 5.1 Max 57.53 (#13/289) | DeepSeek 1017 leads Sol Medium (the source's Answer First variant) on Fit, 68.96 to 62.10. Fable 5.1 (57.53) beats Astra's best eligible row, Xhigh (54.87, Briefcase #30). Gemini misses Briefcase at #132/289. | Briefcase bar #70/281 → #72/289, ranks (34, 57, 12) → (36, 63, 13). |
| 4 | No bar | Sonnet 5.5<br>Muse Spark 1.3<br>Haiku 5.5 | **Opus 5.5 Max** 88.76<br>Fable 5.1 Max 87.62<br>Sonnet 5.5 Max 81.52 | **Opus 5.5 Max** 88.76<br>Fable 5.1 Max 87.62<br>Sonnet 5.5 Max 81.52 | Opus (88.76) and Fable 5.1 (87.62) move Sonnet (81.52) to third on Fit. Haiku (79.62) and Muse (56.01) trail. | — |
| 5 | Briefcase #72/289<br>GDP.pdf #70/283 | Opus 5.5 Max<br>Sonnet 5.5 Max<br>Fable 5.2 Max | **Opus 5.5 Max** 94.29 (#2/289, #50/283)<br>Sonnet 5.5 Max 90.48 (#1/289, #55/283)<br>Fable 5.1 Max 89.53 (#13/289, #50/283) | **Opus 5.5 Max** 94.29 (#2/289, #50/283)<br>Sonnet 5.5 Max 90.48 (#1/289, #55/283)<br>Fable 5.1 Max 89.53 (#13/289, #50/283) | Both Fables clear both bars. Fable 5.1 takes third on Fit, 89.53 to 68.59. | Briefcase bar #70/281 → #72/289, ranks (2, 1, 12) → (2, 1, 13).<br>GDP.pdf bar #68/275 → #70/283, ranks (46, 51, 46) → (50, 55, 50). |
| 6 | No bar | Fable 5.1<br>DeepSeek V4.1 Flash 1017 Max<br>GLM-5.3 Flash | **DeepSeek V4.1 Flash 1017 Max** 81.80<br>Grok 4.5 High 71.04<br>Fable 5.1 Max 69.52 | **DeepSeek V4.1 Flash 1017 Max** 81.80<br>Grok 4.5 High 71.04<br>Fable 5.1 Max 69.52 | DeepSeek 1017 moves to first at Fit 81.80. Grok takes second at 71.04, ahead of Fable 5.1 at 69.52 and GLM Flash at 63.81. | — |
| 7 | Presentation #72/289 | GPT-6.2 Sol<br>GPT-6.2 Astra<br>Gemini 3.8 Flash | **GPT-6.2 Sol Medium** 62.03 (#36/289)<br>Fable 5.2 Max 61.37 (#5/289)<br>GPT-6.2 Astra Xhigh 56.75 (#16/289) | **GPT-6.2 Sol Medium** 62.03 (#36/289)<br>Fable 5.2 Max 61.37 (#5/289)<br>GPT-6.2 Astra Xhigh 56.75 (#16/289) | Sol Medium keeps first at Fit 62.03. Fable 5.2 beats Astra's top eligible row, Xhigh, on Fit (61.37 to 56.75). Gemini misses the Presentation bar #72 at #128/289. | Presentation bar #70/281 → #72/289, ranks (33, 3, 15) → (36, 5, 16). |
| 8 | No bar | — | **GPT-6.2 Astra Medium** 99.00<br>GPT-6.2 Sol Xhigh 89.48<br>GPT-6 Sol Max 79.96 | **GPT-6.2 Astra Medium** 99.00<br>GPT-6.2 Sol Xhigh 89.48<br>GPT-6 Sol Max 79.96 | The source leaves this step open. Astra Medium leads on low Slop (percentile 1, Fit 99.00). | — |

### Step 2 worked by hand

For high aims the score equals the percentile. For low Open-Ended subtract the percentile from 100. Average the three scores, using the displayed percentiles here to two decimals.

| Model | Creative score | Structured score | Open-Ended score | Fit |
|---|---:|---:|---:|---:|
| Opus 5.5 Max | 98.10 | 94.29 | 100 − 79.06 = 20.94 | (98.10 + 94.29 + 20.94) / 3 = 71.11 |
| Gemini 3.8 Flash High | 86.67 | 100.00 | 100 − 2.90 = 97.10 | (86.67 + 100.00 + 97.10) / 3 = 94.59 |

Gemini ranks eighth in Creative and second for low Open-Ended. The full percentiles bring its three-target Fit to 94.59.
