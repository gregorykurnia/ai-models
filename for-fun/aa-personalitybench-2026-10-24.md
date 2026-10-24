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
