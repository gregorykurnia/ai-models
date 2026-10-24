# AA-PersonalityBench: 8 personality indexes

Captured 2026-10-24 from [Artificial Analysis](https://artificialanalysis.ai/evaluations/aa-personalitybench), with all 41 models selected. 40 came back with index scores; the model selector lists 41, so one model seems to have no index data.

## How to read it

AA-PersonalityBench measures how models write, not whether they're right. 30 traits (30 questions each, 900 total) are judged pairwise by a panel of models and scored as Elo ratings. Each index takes the mean of its traits' Elo z-scores (inverting traits where needed), then percentile ranks it from 1 to 100 across every model tested.

Higher means "more of that trait". **Slop is the exception: lower is better.** AA doesn't rank models overall; the table is sorted by the sum of the first seven indexes only to make it easier to scan.

| Index | What it measures | Traits |
|---|---|---|
| Expressiveness | Rich, varied, well-crafted language | Lexically Varied, Eloquent, Literate, Natural Sounding, Metaphorical |
| Organization | Well-structured, scannable, answer-first | Structured, Scannable, Bottom-Line Summary, Answer First |
| Informativeness | Practical depth, evidence, actionable content | Information Dense, Evidence-Based, Resource-Specific, Actionable Guidance, Pragmatic |
| Transparency | Truthful, acknowledges uncertainty, non-sycophantic | Truthful, Admits Uncertainty, Disclaims Assumptions, Flags Nuances, Sycophantic |
| Warmth | Friendly, humorous, sincere, emotionally attuned | Friendly, Humorous, Sincere, Emotionally Intelligent |
| Conviction | Direct, confident positions and constructive pushback | Direct, Confident, Opinionated, Constructive Pushback |
| Imagination | Creative, exploratory, open-ended thinking | Creative, Open-Ended |
| Slop | Use of filler and generic language | Slop |

## Results

| Model | Expressiveness | Organization | Informativeness | Transparency | Warmth | Conviction | Imagination | Slop ↓ |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| Claude Fable 5.1 (max with fallback) | 100 | 54 | 97 | 97 | 97 | 100 | 80 | 21 |
| Claude Opus 5.5 (max with fallback) | 90 | 77 | 92 | 90 | 82 | 70 | 95 | 19 |
| Muse Wonder (max) | 87 | 90 | 95 | 57 | 100 | 77 | 90 | 54 |
| Claude Sonnet 5.5 (max with fallback) | 70 | 82 | 85 | 100 | 70 | 54 | 82 | 16 |
| Muse Spark 1.3 (max) | 64 | 59 | 100 | 39 | 95 | 75 | 100 | 80 |
| GLM-5.3 (max) | 97 | 21 | 54 | 82 | 90 | 90 | 92 | 29 |
| GLM-5.3-Flash | 95 | 37 | 59 | 72 | 85 | 80 | 77 | 31 |
| Kimi K3 (max) | 92 | 34 | 49 | 75 | 92 | 72 | 87 | 34 |
| Inkling (xhigh) | 77 | 92 | 62 | 54 | 47 | 67 | 67 | 49 |
| Claude Haiku 5.5 (max) | 80 | 39 | 72 | 80 | 67 | 64 | 57 | 9 |
| DeepSeek V4.1 Flash (max) | 57 | 100 | 77 | 62 | 31 | 97 | 24 | 39 |
| Mistral Large 4 Preview | 85 | 87 | 64 | 34 | 77 | 34 | 59 | 62 |
| Muse Spark Open (xhigh) | 52 | 31 | 90 | 52 | 87 | 24 | 97 | 87 |
| DeepSeek V4.1 Flash 1017 (max) | 44 | 85 | 67 | 87 | 19 | 95 | 31 | 42 |
| GPT-6 Astra (max) | 54 | 67 | 21 | 95 | 72 | 42 | 72 | 14 |
| Gemini 3.8 Flash (high) | 75 | 70 | 82 | 19 | 52 | 82 | 37 | 77 |
| Gemini 4 Argon (high) | 82 | 52 | 80 | 16 | 75 | 59 | 44 | 70 |
| GPT-6.1 Sol (max) | 47 | 80 | 19 | 92 | 62 | 52 | 54 | 11 |
| Beam 1.0 | 37 | 72 | 87 | 70 | 29 | 37 | 64 | 52 |
| Claude Sonnet 5.5 (medium with fallback) | 39 | 47 | 47 | 85 | 59 | 39 | 75 | 26 |
| Nemotron 3.5 Super VL | 67 | 97 | 57 | 49 | 44 | 21 | 52 | 64 |
| Grok 4.5 (high) | 42 | 49 | 52 | 67 | 26 | 87 | 42 | 67 |
| Grok 4.7 (xhigh) | 72 | 26 | 24 | 64 | 39 | 85 | 29 | 6 |
| Step 5 Preview | 31 | 95 | 44 | 37 | 37 | 57 | 39 | 44 |
| Grok 4.6 (xhigh) | 62 | 14 | 37 | 77 | 21 | 92 | 14 | 37 |
| MiniMax-M3 | 49 | 24 | 26 | 26 | 80 | 19 | 62 | 57 |
| Gemini 3.1 Pro Preview | 59 | 42 | 39 | 11 | 57 | 44 | 19 | 82 |
| Qwen3.8 Max (0902) | 16 | 64 | 31 | 47 | 34 | 29 | 49 | 75 |
| Muse Glimmer (high) | 24 | 16 | 42 | 21 | 64 | 9 | 85 | 72 |
| MiMo-V2.6-Pro | 29 | 29 | 16 | 44 | 54 | 16 | 70 | 59 |
| MiniMax-M3.1-Flash | 19 | 75 | 34 | 29 | 11 | 62 | 11 | 24 |
| GPT-6 Luna (max) | 34 | 19 | 14 | 59 | 42 | 47 | 16 | 4 |
| K2 Horizon 375B A23B | 21 | 44 | 70 | 14 | 14 | 11 | 47 | 95 |
| Qwen3.8 27B (xhigh) | 14 | 57 | 29 | 31 | 24 | 31 | 34 | 85 |
| GPT-6 Sol (max) | 26 | 11 | 11 | 42 | 49 | 49 | 26 | 1 |
| GPT-5.4 mini (non-reasoning) | 11 | 62 | 9 | 24 | 16 | 26 | 21 | 47 |
| Nemotron 3 Ultra | 9 | 9 | 75 | 9 | 1 | 14 | 6 | 92 |
| GPT-4o (Nov) | 6 | 6 | 6 | 6 | 9 | 6 | 9 | 97 |
| Llama 4 Maverick | 4 | 4 | 4 | 4 | 6 | 1 | 4 | 100 |
| GPT-3.5 Turbo | 1 | 1 | 1 | 1 | 4 | 4 | 1 | 90 |

## What stands out

- **Claude models:** Fable 5.1, Opus 5.5 and Sonnet 5.5 (max) are high across the board and have little slop (16–21). Haiku 5.5 has the lowest slop of any Claude model (9).
- **GPT-6 models:** they have the least slop overall (Sol 1, Luna 4, Astra 14) and high Transparency. They're low on Informativeness and Expressiveness, so their answers are plain and sparse.
- **Muse Spark models:** they're top for Informativeness and Imagination but also have a lot of slop (80–87).
- **DeepSeek V4.1 Flash:** it's the most organized and opinionated (Organization 100, Conviction 97) but low on Warmth.

## Just for fun: MBTI and Enneagram guesses

These are a playful reading of the scores, not something AA measures. Each model's types come from fixed rules over its index and trait percentiles, so the same scores always give the same type.

**MBTI**
- **E / I:** E if the average of Warmth, Expressiveness and Humorous is 50 or more.
- **N / S:** N if Imagination and Metaphorical average at least as high as Pragmatic, Actionable Guidance and Resource-Specific.
- **F / T:** F if Friendly, Emotionally Intelligent and Sincere average higher than Direct, Evidence-Based and Truthful.
- **J / P:** J if Structured, Answer First and Bottom-Line Summary average at least as high as Open-Ended.

**Enneagram:** each type scores the average of four traits, and the highest wins. The wing is whichever neighbouring type scores higher.

| Type | Traits averaged |
|---|---|
| 1 Reformer | Truthful, Structured, Direct, low Slop |
| 2 Helper | Friendly, Emotionally Intelligent, Sincere, Sycophantic |
| 3 Achiever | Answer First, Confident, Actionable Guidance, Scannable |
| 4 Individualist | Eloquent, Metaphorical, Sincere, Creative |
| 5 Investigator | Information Dense, Evidence-Based, Resource-Specific, low Friendly |
| 6 Loyalist | Admits Uncertainty, Disclaims Assumptions, Flags Nuances, low Confident |
| 7 Enthusiast | Humorous, Creative, Open-Ended, Friendly |
| 8 Challenger | Direct, Opinionated, Constructive Pushback, Confident |
| 9 Peacemaker | low Direct, low Opinionated, low Constructive Pushback, Sycophantic |

The "Why" column lists each model's strongest and weakest indexes (not counting Slop).

| Model | MBTI | Enneagram | Why |
|---|---|---|---|
| Claude Fable 5.1 (max with fallback) | ENFJ | 4w5 Individualist | Strongest: Expressiveness (100) and Conviction (100); weakest: Organization (54) |
| Claude Opus 5.5 (max with fallback) | ENTP | 1w2 Reformer | Strongest: Imagination (95) and Informativeness (92); weakest: Conviction (70) |
| Muse Wonder (max) | ESFP | 7w8 Enthusiast | Strongest: Warmth (100) and Informativeness (95); weakest: Transparency (57) |
| Claude Sonnet 5.5 (max with fallback) | ENTP | 1w2 Reformer | Strongest: Transparency (100) and Informativeness (85); weakest: Conviction (54) |
| Muse Spark 1.3 (max) | ESFP | 7w8 Enthusiast | Strongest: Informativeness (100) and Imagination (100); weakest: Transparency (39) |
| GLM-5.3 (max) | ENFP | 4w5 Individualist | Strongest: Expressiveness (97) and Imagination (92); weakest: Organization (21) |
| GLM-5.3-Flash | ENFP | 4w5 Individualist | Strongest: Expressiveness (95) and Warmth (85); weakest: Organization (37) |
| Kimi K3 (max) | ENFP | 4w5 Individualist | Strongest: Expressiveness (92) and Warmth (92); weakest: Organization (34) |
| Inkling (xhigh) | ENTP | 4w5 Individualist | Strongest: Organization (92) and Expressiveness (77); weakest: Warmth (47) |
| Claude Haiku 5.5 (max) | ESTP | 1w2 Reformer | Strongest: Expressiveness (80) and Transparency (80); weakest: Organization (39) |
| DeepSeek V4.1 Flash (max) | ISTJ | 8w7 Challenger | Strongest: Organization (100) and Conviction (97); weakest: Imagination (24) |
| Mistral Large 4 Preview | ENFJ | 4w3 Individualist | Strongest: Organization (87) and Expressiveness (85); weakest: Transparency (34) |
| Muse Spark Open (xhigh) | ENFP | 7w6 Enthusiast | Strongest: Imagination (97) and Informativeness (90); weakest: Conviction (24) |
| DeepSeek V4.1 Flash 1017 (max) | ISTJ | 8w7 Challenger | Strongest: Conviction (95) and Transparency (87); weakest: Warmth (19) |
| GPT-6 Astra (max) | ENTP | 1w2 Reformer | Strongest: Transparency (95) and Warmth (72); weakest: Informativeness (21) |
| Gemini 3.8 Flash (high) | ESTJ | 3w4 Achiever | Strongest: Informativeness (82) and Conviction (82); weakest: Transparency (19) |
| Gemini 4 Argon (high) | ESFJ | 4w3 Individualist | Strongest: Expressiveness (82) and Informativeness (80); weakest: Transparency (16) |
| GPT-6.1 Sol (max) | ENTP | 1w2 Reformer | Strongest: Transparency (92) and Organization (80); weakest: Informativeness (19) |
| Beam 1.0 | ISTP | 5w6 Investigator | Strongest: Informativeness (87) and Organization (72); weakest: Warmth (29) |
| Claude Sonnet 5.5 (medium with fallback) | INTP | 6w7 Loyalist | Strongest: Transparency (85) and Imagination (75); weakest: Expressiveness (39) |
| Nemotron 3.5 Super VL | ENFJ | 3w4 Achiever | Strongest: Organization (97) and Expressiveness (67); weakest: Conviction (21) |
| Grok 4.5 (high) | ISTJ | 8w7 Challenger | Strongest: Conviction (87) and Transparency (67); weakest: Warmth (26) |
| Grok 4.7 (xhigh) | ISTJ | 1w2 Reformer | Strongest: Conviction (85) and Expressiveness (72); weakest: Informativeness (24) |
| Step 5 Preview | ISFJ | 3w2 Achiever | Strongest: Organization (95) and Conviction (57); weakest: Expressiveness (31) |
| Grok 4.6 (xhigh) | ISTJ | 8w9 Challenger | Strongest: Conviction (92) and Transparency (77); weakest: Organization (14) |
| MiniMax-M3 | ENFP | 7w6 Enthusiast | Strongest: Warmth (80) and Imagination (62); weakest: Conviction (19) |
| Gemini 3.1 Pro Preview | ENFJ | 9w8 Peacemaker | Strongest: Expressiveness (59) and Warmth (57); weakest: Transparency (11) |
| Qwen3.8 Max (0902) | ISTJ | 9w8 Peacemaker | Strongest: Organization (64) and Imagination (49); weakest: Expressiveness (16) |
| Muse Glimmer (high) | INFP | 9w1 Peacemaker | Strongest: Imagination (85) and Warmth (64); weakest: Conviction (9) |
| MiMo-V2.6-Pro | INFP | 7w6 Enthusiast | Strongest: Imagination (70) and Warmth (54); weakest: Informativeness (16) |
| MiniMax-M3.1-Flash | ISTJ | 1w9 Reformer | Strongest: Organization (75) and Conviction (62); weakest: Warmth (11) |
| GPT-6 Luna (max) | ISTJ | 1w9 Reformer | Strongest: Transparency (59) and Conviction (47); weakest: Informativeness (14) |
| K2 Horizon 375B A23B | ISFJ | 9w8 Peacemaker | Strongest: Informativeness (70) and Imagination (47); weakest: Conviction (11) |
| Qwen3.8 27B (xhigh) | ISFJ | 9w8 Peacemaker | Strongest: Organization (57) and Imagination (34); weakest: Expressiveness (14) |
| GPT-6 Sol (max) | ISTP | 1w9 Reformer | Strongest: Warmth (49) and Conviction (49); weakest: Organization (11) |
| GPT-5.4 mini (non-reasoning) | ISTP | 9w1 Peacemaker | Strongest: Organization (62) and Conviction (26); weakest: Informativeness (9) |
| Nemotron 3 Ultra | ISTJ | 5w6 Investigator | Strongest: Informativeness (75) and Conviction (14); weakest: Warmth (1) |
| GPT-4o (Nov) | ISFP | 9w1 Peacemaker | Strongest: Warmth (9) and Imagination (9); weakest: Expressiveness (6) |
| Llama 4 Maverick | ISFP | 9w1 Peacemaker | Strongest: Warmth (6) and Expressiveness (4); weakest: Conviction (1) |
| GPT-3.5 Turbo | INTJ | 9w1 Peacemaker | Strongest: Warmth (4) and Conviction (4); weakest: Expressiveness (1) |

**Fun patterns**
- **Claude models:** mostly 1w2 Reformers (Opus, Sonnet, Haiku): truthful, careful and low on slop. Fable 5.1 is the odd one out as an ENFJ 4w5 Individualist, the most expressive and opinionated model tested.
- **GPT-6 models:** all Reformers too, but the quieter kind. Astra and Sol 6.1 come out as ENTP; Luna and Sol come out as introverted ISTJ/ISTP 1w9s.
- **DeepSeek and Grok:** mostly ISTJ 8 Challengers. They're structured and blunt, with little warmth.
- **GLM and Kimi:** ENFP 4w5 Individualists, the expressive, imaginative, loosely organized writers.
- **Muse models:** the Enthusiasts (7w8 for Wonder and Spark 1.3).
- **Older models (GPT-4o, Llama 4 Maverick, GPT-3.5 Turbo):** 9w1 Peacemakers. They're agreeable, generic and full of slop.
