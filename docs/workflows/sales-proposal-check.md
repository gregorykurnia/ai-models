# Sales proposal check (9 of 12 hand picks differ)

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
| 8a | **Low** `slop` | **Low** Slop (source step 8) | Same |

The source lists 14 step IDs. To reach 15 entries, step 8 covers the slop sweep and 8a covers the human read. Both carry step 8’s low Slop target. [Proposal source](proposal-source.md)

AA-Briefcase, its presentation quality, and GDP.pdf map to `briefcase-v1-1`, `aa-briefcase-presentation-elo`, and `gdp-pdf`. The Word and PDF breakdown, AA-Omniscience hallucination rate, and GDPval-AA v2 stay in `other_checks`.

## Hand picks and app picks

Fit uses all 53 model rows from the 2026-11-19 capture. Each Fit is shown to two decimals. Percentiles in the reasons are raw, in hand-pick then app-pick order unless labeled. The step 3f hand pick uses Medium for its cited Answer First score. The source names the GPT-6.2 Sol family for step 7, so the comparison uses its highest-Fit row, Medium. [AA-PersonalityBench data](../../data/aa-personalitybench.json)

| Step | Hand pick | Hand Fit | App pick | App Fit | App runners-up, in order | Reason |
|---|---|---:|---|---:|---|---|
| 1 | Sonnet 5.5 Max | 95.24 | Claude Sonnet 5.5 (Adaptive Reasoning, Max Effort, Default Fallback) | 95.24 | Claude Opus 5.5 (Adaptive Reasoning, Max Effort, Default Fallback)<br>Kimi K3.1 Pro | Same pick. The Max row scores 98.10 Truthful and 100.00 Admits Uncertainty. |
| 2 | Opus 5.5 Max | 71.11 | Gemini 3.8 Flash (High) | 94.59 | Gemini 4 Argon (High)<br>Gemini 3.1 Pro Preview | Gemini’s Creative 86.67 is outside the top five (Opus 98.10). Gemini gains more from low Open-Ended (79.06 vs 2.90) and high Structured (94.29 vs 100.00). See the calculation below. |
| 3a | Fable 5.1 | 68.00 | Claude Fable 5.2 (Adaptive Reasoning, Max Effort, Default Fallback) | 72.57 | Claude Haiku 5.5 (Adaptive Reasoning, Max Effort, Default Fallback)<br>Claude Fable 5.1 (Adaptive Reasoning, Max Effort, Default Fallback) | Fable 5.2 gains on both restraint targets. Metaphorical is closer to 50 (80.96 vs 50.50) and Humorous is lower (96.19 vs 79.06). Those gains outweigh the drop in Sincere (100.00 vs 79.06), Emotionally Intelligent (98.10 vs 80.96) and Evidence-Based (100.00 vs 82.87). |
| 3b | Gemini 3.8 Flash High | 76.19 | DeepSeek V4.1 Flash (Max) | 78.10 | Gemini 3.8 Flash (High)<br>Gemini 4 Argon (High) | DeepSeek’s Direct 65.73 is outside the top five, yet it gains 51.40 points on Gemini’s 14.33, enough to offset Gemini’s stronger Structured, Confident and Open-Ended scores. |
| 3c | Opus 5.5 | 99.05 | Claude Opus 5.5 (Adaptive Reasoning, Max Effort, Default Fallback) | 99.05 | Claude Fable 5.1 (Adaptive Reasoning, Max Effort, Default Fallback)<br>Claude Sonnet 5.5 (Adaptive Reasoning, Max Effort, Default Fallback) | Same pick. The bundled Opus row has 98.10 Evidence-Based and 100.00 Truthful. |
| 3d | GPT-6.1 Sol Max | 84.27 | Claude Fable 5.2 (Adaptive Reasoning, Max Effort, Default Fallback) | 85.22 | GPT-6.1 Sol (Max)<br>GPT-6 Luna (Max) | Fable is outside the top five on Disclaims Assumptions (100.00 vs 86.67). Its Flags Nuances is closer to 50 (65.73 vs 58.12), worth 83.77 points for moderate against Sol’s 68.54. |
| 3e | Muse Spark 1.3 | 57.16 | DeepSeek V4.1 Flash (Max) | 75.25 | DeepSeek V4.1 Flash 1017 (Max)<br>MiniMax-M3.1-Flash | Both models’ Direct percentiles are outside the top five. DeepSeek’s 65.73 against Muse’s 16.23 more than offsets its lower Actionable Guidance (98.10 vs 84.77). |
| 3f | GPT-6.2 Sol (Medium row) | 62.10 | DeepSeek V4.1 Flash (Max) | 75.81 | DeepSeek V4.1 Flash 1017 (Max)<br>Step 5 Preview | Sol’s cited Answer First 100.00 comes from Medium, and Slop 11 matches Xhigh (10.52). Medium’s Slop is 14.33. DeepSeek gains on Bottom-Line Summary (40.98 vs 100.00), Confident (60.02 vs 94.29) and Scannable (23.85 vs 60.02, both outside the top five). |
| 4 | Sonnet 5.5 (Max row) | 81.52 | Claude Opus 5.5 (Adaptive Reasoning, Max Effort, Default Fallback) | 88.76 | Claude Fable 5.1 (Adaptive Reasoning, Max Effort, Default Fallback)<br>Claude Sonnet 5.5 (Adaptive Reasoning, Max Effort, Default Fallback) | Sonnet’s cited 100.00 Admits Uncertainty and 98.10 Truthful match the Max row. Opus’s advantage in Pragmatic (48.60 vs 92.38) outweighs its lower Admits Uncertainty (100.00 vs 88.58). |
| 5 | Opus 5.5 Max | 94.29 | Claude Opus 5.5 (Adaptive Reasoning, Max Effort, Default Fallback) | 94.29 | Claude Sonnet 5.5 (Adaptive Reasoning, Max Effort, Default Fallback)<br>Claude Fable 5.1 (Adaptive Reasoning, Max Effort, Default Fallback) | Same pick. Opus has 94.29 in both Flags Nuances and Structured. The hand pick also wanted fresh eyes after Sonnet in step 1. |
| 6 | Fable 5.1 | 69.52 | DeepSeek V4.1 Flash 1017 (Max) | 81.80 | DeepSeek V4.1 Flash (Max)<br>Grok 4.6 (Xhigh) | The low Warmth index target rewards DeepSeek’s 23.35 against Fable’s 94.29 (76.65 vs 5.71 target points). DeepSeek also gains on Direct (48.60 vs 58.12), with both percentiles outside the top five. |
| 7 | GPT-6.2 Sol (Medium row) | 62.03 | DeepSeek V4.1 Flash (Max) | 68.77 | Grok 4.7 (Xhigh)<br>Step 5 Preview | DeepSeek gets closer to 50 on Lexically Varied (25.75 vs 56.21) and Metaphorical (14.33 vs 60.02) and scores better on low Open-Ended (37.17 vs 16.23). DeepSeek’s moderate percentiles fall outside the top five. |

### Step 2 worked by hand

For high aims the score equals the percentile. For low Open-Ended subtract the percentile from 100. Average the three scores, using the displayed percentiles here to two decimals.

| Model | Creative score | Structured score | Open-Ended score | Fit |
|---|---:|---:|---:|---:|
| Opus 5.5 Max | 98.10 | 94.29 | 100 − 79.06 = 20.94 | (98.10 + 94.29 + 20.94) / 3 = 71.11 |
| Gemini 3.8 Flash High | 86.67 | 100.00 | 100 − 2.90 = 97.10 | (86.67 + 100.00 + 97.10) / 3 = 94.59 |

Gemini ranks eighth in Creative and second for low Open-Ended. The full percentiles bring its three-target Fit to 94.59.
