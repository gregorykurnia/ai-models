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

## Trait scores by index

Each table shows one index (bold) next to the traits it averages. Trait scores are percentile ranks from 1 to 100 across every model tested, and models are in the same order as the Results table. Higher means more of that trait, except **Sycophantic**, where lower is better: Transparency counts it inverted. Slop is a single trait, so its score is the Slop column above.

### Expressiveness

| Model | **Index** | Lexically Varied | Eloquent | Literate | Natural Sounding | Metaphorical |
|---|--:|--:|--:|--:|--:|--:|
| Claude Fable 5.1 (max with fallback) | **100** | 100 | 100 | 95 | 97 | 75 |
| Claude Opus 5.5 (max with fallback) | **90** | 95 | 77 | 97 | 77 | 64 |
| Muse Wonder (max) | **87** | 87 | 87 | 39 | 90 | 82 |
| Claude Sonnet 5.5 (max with fallback) | **70** | 82 | 54 | 85 | 64 | 52 |
| Muse Spark 1.3 (max) | **64** | 80 | 70 | 9 | 75 | 87 |
| GLM-5.3 (max) | **97** | 97 | 97 | 72 | 100 | 77 |
| GLM-5.3-Flash | **95** | 90 | 92 | 80 | 95 | 72 |
| Kimi K3 (max) | **92** | 92 | 95 | 82 | 92 | 67 |
| Inkling (xhigh) | **77** | 75 | 85 | 54 | 54 | 90 |
| Claude Haiku 5.5 (max) | **80** | 85 | 57 | 100 | 85 | 42 |
| DeepSeek V4.1 Flash (max) | **57** | 47 | 59 | 64 | 62 | 44 |
| Mistral Large 4 Preview | **85** | 67 | 90 | 31 | 70 | 85 |
| Muse Spark Open (xhigh) | **52** | 59 | 62 | 6 | 42 | 97 |
| DeepSeek V4.1 Flash 1017 (max) | **44** | 57 | 44 | 67 | 39 | 31 |
| GPT-6 Astra (max) | **54** | 49 | 42 | 87 | 72 | 21 |
| Gemini 3.8 Flash (high) | **75** | 72 | 82 | 62 | 26 | 95 |
| Gemini 4 Argon (high) | **82** | 64 | 72 | 52 | 52 | 100 |
| GPT-6.1 Sol (max) | **47** | 42 | 29 | 90 | 67 | 19 |
| Beam 1.0 | **37** | 54 | 64 | 34 | 21 | 54 |
| Claude Sonnet 5.5 (medium with fallback) | **39** | 39 | 24 | 59 | 47 | 47 |
| Nemotron 3.5 Super VL | **67** | 52 | 75 | 75 | 34 | 70 |
| Grok 4.5 (high) | **42** | 62 | 37 | 49 | 16 | 57 |
| Grok 4.7 (xhigh) | **72** | 77 | 80 | 92 | 80 | 34 |
| Step 5 Preview | **31** | 21 | 52 | 44 | 44 | 29 |
| Grok 4.6 (xhigh) | **62** | 70 | 39 | 77 | 59 | 39 |
| MiniMax-M3 | **49** | 44 | 67 | 29 | 57 | 59 |
| Gemini 3.1 Pro Preview | **59** | 37 | 49 | 42 | 31 | 92 |
| Qwen3.8 Max (0902) | **16** | 14 | 19 | 37 | 24 | 26 |
| Muse Glimmer (high) | **24** | 26 | 31 | 11 | 49 | 62 |
| MiMo-V2.6-Pro | **29** | 24 | 47 | 26 | 29 | 49 |
| MiniMax-M3.1-Flash | **19** | 29 | 16 | 47 | 37 | 14 |
| GPT-6 Luna (max) | **34** | 31 | 21 | 70 | 82 | 4 |
| K2 Horizon 375B A23B | **21** | 34 | 34 | 14 | 11 | 80 |
| Qwen3.8 27B (xhigh) | **14** | 11 | 26 | 19 | 19 | 37 |
| GPT-6 Sol (max) | **26** | 19 | 14 | 57 | 87 | 6 |
| GPT-5.4 mini (non-reasoning) | **11** | 9 | 11 | 24 | 14 | 16 |
| Nemotron 3 Ultra | **9** | 16 | 6 | 21 | 1 | 24 |
| GPT-4o (Nov) | **6** | 6 | 9 | 16 | 6 | 11 |
| Llama 4 Maverick | **4** | 4 | 4 | 4 | 4 | 9 |
| GPT-3.5 Turbo | **1** | 1 | 1 | 1 | 9 | 1 |

### Organization

| Model | **Index** | Structured | Scannable | Bottom-Line Summary | Answer First |
|---|--:|--:|--:|--:|--:|
| Claude Fable 5.1 (max with fallback) | **54** | 77 | 37 | 54 | 39 |
| Claude Opus 5.5 (max with fallback) | **77** | 90 | 57 | 39 | 67 |
| Muse Wonder (max) | **90** | 80 | 52 | 82 | 52 |
| Claude Sonnet 5.5 (max with fallback) | **82** | 87 | 80 | 37 | 59 |
| Muse Spark 1.3 (max) | **59** | 42 | 47 | 80 | 54 |
| GLM-5.3 (max) | **21** | 52 | 24 | 26 | 37 |
| GLM-5.3-Flash | **37** | 47 | 29 | 49 | 49 |
| Kimi K3 (max) | **34** | 67 | 31 | 24 | 47 |
| Inkling (xhigh) | **92** | 57 | 87 | 97 | 31 |
| Claude Haiku 5.5 (max) | **39** | 75 | 21 | 11 | 64 |
| DeepSeek V4.1 Flash (max) | **100** | 72 | 49 | 100 | 95 |
| Mistral Large 4 Preview | **87** | 59 | 77 | 72 | 57 |
| Muse Spark Open (xhigh) | **31** | 34 | 44 | 59 | 26 |
| DeepSeek V4.1 Flash 1017 (max) | **85** | 54 | 39 | 95 | 75 |
| GPT-6 Astra (max) | **67** | 97 | 19 | 52 | 62 |
| Gemini 3.8 Flash (high) | **70** | 100 | 97 | 21 | 24 |
| Gemini 4 Argon (high) | **52** | 82 | 62 | 42 | 16 |
| GPT-6.1 Sol (max) | **80** | 92 | 26 | 67 | 80 |
| Beam 1.0 | **72** | 39 | 92 | 90 | 29 |
| Claude Sonnet 5.5 (medium with fallback) | **47** | 70 | 54 | 31 | 42 |
| Nemotron 3.5 Super VL | **97** | 95 | 95 | 85 | 44 |
| Grok 4.5 (high) | **49** | 21 | 34 | 57 | 100 |
| Grok 4.7 (xhigh) | **26** | 44 | 11 | 29 | 90 |
| Step 5 Preview | **95** | 62 | 70 | 87 | 77 |
| Grok 4.6 (xhigh) | **14** | 14 | 9 | 14 | 87 |
| MiniMax-M3 | **24** | 29 | 90 | 19 | 19 |
| Gemini 3.1 Pro Preview | **42** | 85 | 64 | 34 | 11 |
| Qwen3.8 Max (0902) | **64** | 16 | 67 | 77 | 72 |
| Muse Glimmer (high) | **16** | 37 | 16 | 9 | 34 |
| MiMo-V2.6-Pro | **29** | 26 | 100 | 47 | 9 |
| MiniMax-M3.1-Flash | **75** | 64 | 42 | 70 | 82 |
| GPT-6 Luna (max) | **19** | 49 | 4 | 44 | 92 |
| K2 Horizon 375B A23B | **44** | 24 | 75 | 75 | 21 |
| Qwen3.8 27B (xhigh) | **57** | 9 | 59 | 92 | 70 |
| GPT-6 Sol (max) | **11** | 19 | 6 | 16 | 97 |
| GPT-5.4 mini (non-reasoning) | **62** | 11 | 85 | 62 | 85 |
| Nemotron 3 Ultra | **9** | 31 | 82 | 64 | 1 |
| GPT-4o (Nov) | **6** | 6 | 72 | 6 | 6 |
| Llama 4 Maverick | **4** | 4 | 14 | 4 | 4 |
| GPT-3.5 Turbo | **1** | 1 | 1 | 1 | 14 |

### Informativeness

| Model | **Index** | Information Dense | Evidence-Based | Resource-Specific | Actionable Guidance | Pragmatic |
|---|--:|--:|--:|--:|--:|--:|
| Claude Fable 5.1 (max with fallback) | **97** | 100 | 100 | 75 | 42 | 97 |
| Claude Opus 5.5 (max with fallback) | **92** | 97 | 97 | 72 | 52 | 90 |
| Muse Wonder (max) | **95** | 87 | 90 | 87 | 100 | 100 |
| Claude Sonnet 5.5 (max with fallback) | **85** | 95 | 92 | 57 | 44 | 59 |
| Muse Spark 1.3 (max) | **100** | 85 | 95 | 97 | 97 | 95 |
| GLM-5.3 (max) | **54** | 75 | 85 | 19 | 14 | 85 |
| GLM-5.3-Flash | **59** | 70 | 80 | 21 | 24 | 87 |
| Kimi K3 (max) | **49** | 62 | 82 | 31 | 16 | 72 |
| Inkling (xhigh) | **62** | 67 | 70 | 62 | 59 | 64 |
| Claude Haiku 5.5 (max) | **72** | 92 | 87 | 44 | 47 | 80 |
| DeepSeek V4.1 Flash (max) | **77** | 77 | 54 | 85 | 77 | 82 |
| Mistral Large 4 Preview | **64** | 54 | 52 | 80 | 62 | 54 |
| Muse Spark Open (xhigh) | **90** | 64 | 72 | 90 | 92 | 70 |
| DeepSeek V4.1 Flash 1017 (max) | **67** | 80 | 39 | 67 | 85 | 57 |
| GPT-6 Astra (max) | **21** | 19 | 59 | 6 | 37 | 67 |
| Gemini 3.8 Flash (high) | **82** | 52 | 75 | 77 | 90 | 77 |
| Gemini 4 Argon (high) | **80** | 42 | 67 | 82 | 87 | 92 |
| GPT-6.1 Sol (max) | **19** | 21 | 57 | 9 | 26 | 52 |
| Beam 1.0 | **87** | 90 | 49 | 92 | 80 | 62 |
| Claude Sonnet 5.5 (medium with fallback) | **47** | 49 | 64 | 37 | 39 | 37 |
| Nemotron 3.5 Super VL | **57** | 44 | 26 | 64 | 67 | 39 |
| Grok 4.5 (high) | **52** | 72 | 44 | 70 | 57 | 24 |
| Grok 4.7 (xhigh) | **24** | 37 | 19 | 16 | 29 | 75 |
| Step 5 Preview | **44** | 31 | 21 | 59 | 70 | 47 |
| Grok 4.6 (xhigh) | **37** | 59 | 16 | 52 | 31 | 42 |
| MiniMax-M3 | **26** | 39 | 34 | 42 | 19 | 29 |
| Gemini 3.1 Pro Preview | **39** | 24 | 29 | 54 | 64 | 44 |
| Qwen3.8 Max (0902) | **31** | 16 | 24 | 34 | 75 | 14 |
| Muse Glimmer (high) | **42** | 47 | 37 | 49 | 49 | 31 |
| MiMo-V2.6-Pro | **16** | 29 | 47 | 29 | 11 | 21 |
| MiniMax-M3.1-Flash | **34** | 34 | 42 | 24 | 54 | 26 |
| GPT-6 Luna (max) | **14** | 14 | 31 | 11 | 21 | 34 |
| K2 Horizon 375B A23B | **70** | 57 | 62 | 95 | 82 | 16 |
| Qwen3.8 27B (xhigh) | **29** | 26 | 14 | 39 | 72 | 19 |
| GPT-6 Sol (max) | **11** | 11 | 11 | 4 | 9 | 49 |
| GPT-5.4 mini (non-reasoning) | **9** | 6 | 4 | 14 | 34 | 11 |
| Nemotron 3 Ultra | **75** | 82 | 77 | 100 | 95 | 9 |
| GPT-4o (Nov) | **6** | 9 | 6 | 47 | 6 | 6 |
| Llama 4 Maverick | **4** | 4 | 9 | 26 | 4 | 4 |
| GPT-3.5 Turbo | **1** | 1 | 1 | 1 | 1 | 1 |

### Transparency

| Model | **Index** | Truthful | Admits Uncertainty | Disclaims Assumptions | Flags Nuances | Sycophantic ↓ |
|---|--:|--:|--:|--:|--:|--:|
| Claude Fable 5.1 (max with fallback) | **97** | 92 | 82 | 80 | 97 | 6 |
| Claude Opus 5.5 (max with fallback) | **90** | 100 | 87 | 82 | 92 | 49 |
| Muse Wonder (max) | **57** | 75 | 49 | 49 | 85 | 67 |
| Claude Sonnet 5.5 (max with fallback) | **100** | 97 | 100 | 92 | 87 | 29 |
| Muse Spark 1.3 (max) | **39** | 54 | 26 | 87 | 80 | 87 |
| GLM-5.3 (max) | **82** | 70 | 77 | 72 | 77 | 26 |
| GLM-5.3-Flash | **72** | 64 | 64 | 37 | 82 | 16 |
| Kimi K3 (max) | **75** | 67 | 72 | 64 | 64 | 24 |
| Inkling (xhigh) | **54** | 34 | 24 | 77 | 59 | 9 |
| Claude Haiku 5.5 (max) | **80** | 85 | 90 | 67 | 70 | 57 |
| DeepSeek V4.1 Flash (max) | **62** | 59 | 67 | 34 | 75 | 21 |
| Mistral Large 4 Preview | **34** | 26 | 37 | 42 | 49 | 64 |
| Muse Spark Open (xhigh) | **52** | 47 | 39 | 95 | 90 | 80 |
| DeepSeek V4.1 Flash 1017 (max) | **87** | 77 | 92 | 70 | 95 | 11 |
| GPT-6 Astra (max) | **95** | 95 | 97 | 97 | 62 | 47 |
| Gemini 3.8 Flash (high) | **19** | 39 | 6 | 16 | 26 | 31 |
| Gemini 4 Argon (high) | **16** | 31 | 4 | 31 | 19 | 82 |
| GPT-6.1 Sol (max) | **92** | 90 | 95 | 100 | 57 | 54 |
| Beam 1.0 | **70** | 44 | 62 | 62 | 100 | 39 |
| Claude Sonnet 5.5 (medium with fallback) | **85** | 82 | 85 | 90 | 67 | 34 |
| Nemotron 3.5 Super VL | **49** | 42 | 52 | 47 | 54 | 42 |
| Grok 4.5 (high) | **67** | 52 | 47 | 85 | 72 | 19 |
| Grok 4.7 (xhigh) | **64** | 72 | 54 | 21 | 37 | 1 |
| Step 5 Preview | **37** | 49 | 34 | 29 | 42 | 44 |
| Grok 4.6 (xhigh) | **77** | 62 | 42 | 59 | 52 | 4 |
| MiniMax-M3 | **26** | 21 | 29 | 19 | 29 | 37 |
| Gemini 3.1 Pro Preview | **11** | 24 | 1 | 9 | 14 | 90 |
| Qwen3.8 Max (0902) | **47** | 57 | 80 | 44 | 44 | 75 |
| Muse Glimmer (high) | **21** | 11 | 21 | 54 | 34 | 77 |
| MiMo-V2.6-Pro | **44** | 37 | 70 | 26 | 24 | 14 |
| MiniMax-M3.1-Flash | **29** | 16 | 75 | 39 | 31 | 62 |
| GPT-6 Luna (max) | **59** | 87 | 59 | 75 | 21 | 59 |
| K2 Horizon 375B A23B | **14** | 4 | 11 | 14 | 39 | 92 |
| Qwen3.8 27B (xhigh) | **31** | 14 | 57 | 57 | 47 | 72 |
| GPT-6 Sol (max) | **42** | 80 | 44 | 52 | 9 | 52 |
| GPT-5.4 mini (non-reasoning) | **24** | 29 | 31 | 24 | 11 | 70 |
| Nemotron 3 Ultra | **9** | 1 | 14 | 11 | 16 | 85 |
| GPT-4o (Nov) | **6** | 19 | 19 | 6 | 4 | 100 |
| Llama 4 Maverick | **4** | 6 | 16 | 4 | 6 | 97 |
| GPT-3.5 Turbo | **1** | 9 | 9 | 1 | 1 | 95 |

### Warmth

| Model | **Index** | Friendly | Humorous | Sincere | Emotionally Intelligent |
|---|--:|--:|--:|--:|--:|
| Claude Fable 5.1 (max with fallback) | **97** | 67 | 95 | 100 | 97 |
| Claude Opus 5.5 (max with fallback) | **82** | 72 | 87 | 85 | 77 |
| Muse Wonder (max) | **100** | 95 | 92 | 75 | 100 |
| Claude Sonnet 5.5 (max with fallback) | **70** | 64 | 67 | 77 | 59 |
| Muse Spark 1.3 (max) | **95** | 100 | 82 | 42 | 95 |
| GLM-5.3 (max) | **90** | 80 | 75 | 97 | 92 |
| GLM-5.3-Flash | **85** | 77 | 77 | 92 | 90 |
| Kimi K3 (max) | **92** | 87 | 80 | 95 | 87 |
| Inkling (xhigh) | **47** | 44 | 54 | 52 | 54 |
| Claude Haiku 5.5 (max) | **67** | 59 | 47 | 87 | 64 |
| DeepSeek V4.1 Flash (max) | **31** | 16 | 57 | 59 | 24 |
| Mistral Large 4 Preview | **77** | 82 | 72 | 57 | 82 |
| Muse Spark Open (xhigh) | **87** | 97 | 85 | 31 | 85 |
| DeepSeek V4.1 Flash 1017 (max) | **19** | 11 | 31 | 54 | 19 |
| GPT-6 Astra (max) | **72** | 57 | 64 | 80 | 75 |
| Gemini 3.8 Flash (high) | **52** | 26 | 97 | 21 | 49 |
| Gemini 4 Argon (high) | **75** | 70 | 100 | 16 | 67 |
| GPT-6.1 Sol (max) | **62** | 54 | 49 | 72 | 70 |
| Beam 1.0 | **29** | 34 | 42 | 44 | 29 |
| Claude Sonnet 5.5 (medium with fallback) | **59** | 85 | 44 | 67 | 52 |
| Nemotron 3.5 Super VL | **44** | 52 | 59 | 37 | 37 |
| Grok 4.5 (high) | **26** | 24 | 52 | 26 | 21 |
| Grok 4.7 (xhigh) | **39** | 14 | 29 | 90 | 39 |
| Step 5 Preview | **37** | 39 | 26 | 47 | 57 |
| Grok 4.6 (xhigh) | **21** | 9 | 24 | 64 | 26 |
| MiniMax-M3 | **80** | 90 | 70 | 62 | 72 |
| Gemini 3.1 Pro Preview | **57** | 75 | 90 | 14 | 47 |
| Qwen3.8 Max (0902) | **34** | 49 | 39 | 29 | 34 |
| Muse Glimmer (high) | **64** | 92 | 34 | 34 | 80 |
| MiMo-V2.6-Pro | **54** | 62 | 62 | 49 | 62 |
| MiniMax-M3.1-Flash | **11** | 6 | 11 | 39 | 11 |
| GPT-6 Luna (max) | **42** | 21 | 21 | 70 | 42 |
| K2 Horizon 375B A23B | **14** | 47 | 14 | 11 | 14 |
| Qwen3.8 27B (xhigh) | **24** | 31 | 19 | 24 | 31 |
| GPT-6 Sol (max) | **49** | 19 | 37 | 82 | 44 |
| GPT-5.4 mini (non-reasoning) | **16** | 42 | 16 | 19 | 16 |
| Nemotron 3 Ultra | **1** | 1 | 6 | 1 | 1 |
| GPT-4o (Nov) | **9** | 37 | 9 | 6 | 9 |
| Llama 4 Maverick | **6** | 29 | 4 | 4 | 6 |
| GPT-3.5 Turbo | **4** | 4 | 1 | 9 | 4 |

### Conviction

| Model | **Index** | Direct | Confident | Opinionated | Constructive Pushback |
|---|--:|--:|--:|--:|--:|
| Claude Fable 5.1 (max with fallback) | **100** | 62 | 85 | 100 | 100 |
| Claude Opus 5.5 (max with fallback) | **70** | 67 | 54 | 72 | 77 |
| Muse Wonder (max) | **77** | 24 | 87 | 92 | 82 |
| Claude Sonnet 5.5 (max with fallback) | **54** | 70 | 44 | 57 | 57 |
| Muse Spark 1.3 (max) | **75** | 21 | 75 | 97 | 95 |
| GLM-5.3 (max) | **90** | 49 | 59 | 95 | 97 |
| GLM-5.3-Flash | **80** | 54 | 72 | 85 | 87 |
| Kimi K3 (max) | **72** | 57 | 70 | 67 | 90 |
| Inkling (xhigh) | **67** | 47 | 62 | 59 | 92 |
| Claude Haiku 5.5 (max) | **64** | 82 | 57 | 54 | 52 |
| DeepSeek V4.1 Flash (max) | **97** | 85 | 92 | 90 | 75 |
| Mistral Large 4 Preview | **34** | 31 | 42 | 39 | 54 |
| Muse Spark Open (xhigh) | **24** | 4 | 16 | 70 | 72 |
| DeepSeek V4.1 Flash 1017 (max) | **95** | 75 | 90 | 77 | 85 |
| GPT-6 Astra (max) | **42** | 77 | 21 | 31 | 26 |
| Gemini 3.8 Flash (high) | **82** | 19 | 100 | 87 | 80 |
| Gemini 4 Argon (high) | **59** | 14 | 97 | 80 | 39 |
| GPT-6.1 Sol (max) | **52** | 87 | 37 | 37 | 24 |
| Beam 1.0 | **37** | 34 | 34 | 26 | 70 |
| Claude Sonnet 5.5 (medium with fallback) | **39** | 64 | 24 | 24 | 59 |
| Nemotron 3.5 Super VL | **21** | 26 | 52 | 14 | 47 |
| Grok 4.5 (high) | **87** | 72 | 77 | 82 | 64 |
| Grok 4.7 (xhigh) | **85** | 95 | 82 | 49 | 42 |
| Step 5 Preview | **57** | 52 | 67 | 62 | 44 |
| Grok 4.6 (xhigh) | **92** | 97 | 80 | 75 | 49 |
| MiniMax-M3 | **19** | 42 | 14 | 11 | 62 |
| Gemini 3.1 Pro Preview | **44** | 6 | 95 | 64 | 31 |
| Qwen3.8 Max (0902) | **29** | 39 | 39 | 29 | 34 |
| Muse Glimmer (high) | **9** | 11 | 9 | 16 | 29 |
| MiMo-V2.6-Pro | **16** | 44 | 11 | 9 | 67 |
| MiniMax-M3.1-Flash | **62** | 90 | 64 | 47 | 21 |
| GPT-6 Luna (max) | **47** | 92 | 47 | 44 | 19 |
| K2 Horizon 375B A23B | **11** | 1 | 29 | 52 | 16 |
| Qwen3.8 27B (xhigh) | **31** | 37 | 49 | 42 | 37 |
| GPT-6 Sol (max) | **49** | 100 | 31 | 34 | 9 |
| GPT-5.4 mini (non-reasoning) | **26** | 80 | 26 | 19 | 11 |
| Nemotron 3 Ultra | **14** | 29 | 19 | 21 | 14 |
| GPT-4o (Nov) | **6** | 16 | 6 | 6 | 6 |
| Llama 4 Maverick | **1** | 9 | 4 | 1 | 4 |
| GPT-3.5 Turbo | **4** | 59 | 1 | 4 | 1 |

### Imagination

| Model | **Index** | Creative | Open-Ended |
|---|--:|--:|--:|
| Claude Fable 5.1 (max with fallback) | **80** | 100 | 52 |
| Claude Opus 5.5 (max with fallback) | **95** | 97 | 70 |
| Muse Wonder (max) | **90** | 92 | 72 |
| Claude Sonnet 5.5 (max with fallback) | **82** | 64 | 90 |
| Muse Spark 1.3 (max) | **100** | 77 | 100 |
| GLM-5.3 (max) | **92** | 95 | 75 |
| GLM-5.3-Flash | **77** | 87 | 62 |
| Kimi K3 (max) | **87** | 85 | 77 |
| Inkling (xhigh) | **67** | 72 | 64 |
| Claude Haiku 5.5 (max) | **57** | 67 | 59 |
| DeepSeek V4.1 Flash (max) | **24** | 49 | 16 |
| Mistral Large 4 Preview | **59** | 75 | 54 |
| Muse Spark Open (xhigh) | **97** | 80 | 97 |
| DeepSeek V4.1 Flash 1017 (max) | **31** | 44 | 24 |
| GPT-6 Astra (max) | **72** | 47 | 85 |
| Gemini 3.8 Flash (high) | **37** | 82 | 4 |
| Gemini 4 Argon (high) | **44** | 90 | 11 |
| GPT-6.1 Sol (max) | **54** | 39 | 82 |
| Beam 1.0 | **64** | 62 | 67 |
| Claude Sonnet 5.5 (medium with fallback) | **75** | 26 | 95 |
| Nemotron 3.5 Super VL | **52** | 52 | 44 |
| Grok 4.5 (high) | **42** | 34 | 37 |
| Grok 4.7 (xhigh) | **29** | 31 | 29 |
| Step 5 Preview | **39** | 37 | 34 |
| Grok 4.6 (xhigh) | **14** | 24 | 21 |
| MiniMax-M3 | **62** | 54 | 80 |
| Gemini 3.1 Pro Preview | **19** | 70 | 6 |
| Qwen3.8 Max (0902) | **49** | 29 | 49 |
| Muse Glimmer (high) | **85** | 59 | 92 |
| MiMo-V2.6-Pro | **70** | 42 | 87 |
| MiniMax-M3.1-Flash | **11** | 16 | 14 |
| GPT-6 Luna (max) | **16** | 14 | 42 |
| K2 Horizon 375B A23B | **47** | 57 | 31 |
| Qwen3.8 27B (xhigh) | **34** | 21 | 39 |
| GPT-6 Sol (max) | **26** | 19 | 47 |
| GPT-5.4 mini (non-reasoning) | **21** | 9 | 57 |
| Nemotron 3 Ultra | **6** | 11 | 9 |
| GPT-4o (Nov) | **9** | 6 | 26 |
| Llama 4 Maverick | **4** | 4 | 19 |
| GPT-3.5 Turbo | **1** | 1 | 1 |

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
