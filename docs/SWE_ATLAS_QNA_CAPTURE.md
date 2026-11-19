# SWE-Atlas-QnA capture

Captured on 2026-11-19 UTC. At **Performance → Score by Benchmark**, **Select all** changed the selector to **40 of 40 models**. The capture holds one score for each of those setups. The page redirects from `/agents/coding` to `/agents/coding-agents`, the URL recorded in the capture. AA lists the mixed-model Devin Fusion CLI setup behind the separate **Router models** toggle. [Artificial Analysis Coding Agent Index](https://artificialanalysis.ai/agents/coding-agents)

The capture reads the chart's `items[].components[]` entry with `key === "swe-atlas-qna"` and stores its `meanReward` fraction as `value` in the `SWE-Atlas-QnA-AA: Score` chart. Each score and setup name come from the same chart item. FrontierCode and Terminal-Bench have separate keys, `frontiercode-v2.0` and `terminal-bench-v4`. The composite score appears on the **Index** tab. The inventory converts the raw fraction to a percentage. [Capture JSON](../data/aa-captures/swe-atlas-qna-aa.json)

In the 18 Nov capture, hovering each matching bar on the **SWE-Atlas-QnA-AA** tab confirmed AA's whole-number score. Claude Code showed **66** for Opus 5.5 Max (Default Fallback), **64** for Sonnet 5.5 Max (Default Fallback), and **34** for Haiku 5.5 Max. The same check showed **36** for Codex with GPT-6.2 Astra Low, **46** for Codex with GPT-6.2 Sol Max, **60** for Antigravity CLI with Gemini 4 Hydrogen Xhigh, and **69** for Muse Code with Muse Wonder Full Max. [Artificial Analysis Coding Agent Index](https://artificialanalysis.ai/agents/coding-agents)

**All 40 setups map to distinct master rows by model and effort.** The 19 Nov capture adds Neon Xhigh and retains the 39 earlier scores. Step 5 Preview, Qwen3.8 Max, and Beam 1.0 use the same names on AA and the master. AA reports Max effort for Kimi Code CLI's Kimi K3.1 Pro, whose master row uses the model name without an effort suffix. Max is the model's API default. [AA run settings](https://artificialanalysis.ai/agents/coding-agents/comparisons/deepseek-harness-vs-kimi-code-cli), [Moonshot model card](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/blob/main/README.md)

| AA setup (agent and model) | SWE-Atlas-QnA pass rate | Master row |
| --- | ---: | --- |
| Antigravity CLI - Gemini 4 Neon (Xhigh) | 67.7419% | Gemini 4 Neon (Xhigh) |
| Claude Code - Claude Fable 5.2 (Xhigh, Default Fallback) | 62.0968% | Claude Fable 5.2 (Adaptive Reasoning, Xhigh Effort, Default Fallback) |
| Claude Code - Claude Fable 5.2 (High, Default Fallback) | 61.8280% | Claude Fable 5.2 (Adaptive Reasoning, High Effort, Default Fallback) |
| Claude Code - Claude Opus 5.5 (Max, Default Fallback) | 65.8602% | Claude Opus 5.5 (Adaptive Reasoning, Max Effort, Default Fallback) |
| Claude Code - Claude Sonnet 5.5 (Max, Default Fallback) | 64.2473% | Claude Sonnet 5.5 (Adaptive Reasoning, Max Effort, Default Fallback) |
| Claude Code - Claude Fable 5.2 (Max, Default Fallback) | 60.4839% | Claude Fable 5.2 (Adaptive Reasoning, Max Effort, Default Fallback) |
| Antigravity CLI - Gemini 4 Carbon (High) | 63.7097% | Gemini 4 Carbon (High) |
| Muse Code - Muse Wonder Full (Max) | 68.8172% | Muse Wonder Full (Max) |
| Codex - GPT-6.2 Astra (Max) | 55.1075% | GPT-6.2 Astra (Max) |
| Codex - GPT-6.2 Astra (Xhigh) | 53.7634% | GPT-6.2 Astra (Xhigh) |
| Codex - GPT-6 Astra (Max) | 59.1398% | GPT-6 Astra (Max) |
| Claude Code - Claude Fable 5.2 (Medium, Default Fallback) | 63.7097% | Claude Fable 5.2 (Adaptive Reasoning, Medium Effort, Default Fallback) |
| Claude Code - Claude Fable 5.1 (Max, Default Fallback) | 66.3978% | Claude Fable 5.1 (Adaptive Reasoning, Max Effort, Default Fallback) |
| Antigravity CLI - Gemini 4 Hydrogen (Xhigh) | 60.2151% | Gemini 4 Hydrogen (Xhigh) |
| Codex - GPT-6.2 Astra (High) | 54.5699% | GPT-6.2 Astra (High) |
| Codex - GPT-6.1 Sol (Max) | 59.9462% | GPT-6.1 Sol (Max) |
| Codex - GPT-6.2 Sol (Xhigh) | 51.3441% | GPT-6.2 Sol (Xhigh) |
| Codex - GPT-6.2 Astra (Medium) | 53.7634% | GPT-6.2 Astra (Medium) |
| Codex - GPT-6.1 Terra (Max) | 54.0323% | GPT-6.1 Terra (Max) |
| Kimi Code CLI - Kimi K3.1 Pro | 56.7204% | Kimi K3.1 Pro |
| Codex - GPT-6.2 Sol (Max) | 46.2366% | GPT-6.2 Sol (Max) |
| Claude Code - Claude Fable 5.2 (Low, Default Fallback) | 59.9462% | Claude Fable 5.2 (Adaptive Reasoning, Low Effort, Default Fallback) |
| Codex - GPT-6.2 Sol (High) | 50.5376% | GPT-6.2 Sol (High) |
| Antigravity CLI - Gemini 4 Argon (High) | 55.1075% | Gemini 4 Argon (High) |
| Codex - GPT-6.2 Sol (Medium) | 50.2688% | GPT-6.2 Sol (Medium) |
| Muse Code - Muse Wonder (Max) | 61.5591% | Muse Wonder (Max) |
| Grok Build - Grok 4.7 (Xhigh) | 62.9032% | Grok 4.7 (Xhigh) |
| Mistral Vibe - Mistral Large 4 (High) | 58.8710% | Mistral Large 4 (High) |
| Opencode - GLM-5.3 (Max) | 58.6022% | GLM-5.3 (Max) |
| Muse Code - Muse Ember (Max) | 54.8387% | Muse Ember (Max) |
| Codex - GPT-6.2 Sol (Low) | 42.4731% | GPT-6.2 Sol (Low) |
| DeepSeek Harness - DeepSeek V4.1 Flash 1017 (Max) | 61.5591% | DeepSeek V4.1 Flash 1017 (Max) |
| Muse Code - Muse Spark 1.3 (Max) | 58.6022% | Muse Spark 1.3 (Max) |
| Claude Code - Step 5 Preview | 58.6022% | Step 5 Preview |
| Codex - GPT-6.2 Astra (Low) | 36.2903% | GPT-6.2 Astra (Low) |
| Claude Code - Qwen3.8 Max | 56.1828% | Qwen3.8 Max |
| Mistral Vibe - Mistral Large 4 (Medium) | 44.6237% | Mistral Large 4 (Medium) |
| Claude Code - Claude Haiku 5.5 (Max) | 33.8710% | Claude Haiku 5.5 (Adaptive Reasoning, Max Effort, Default Fallback) |
| Codex - GPT-6 Luna (Max) | 38.4409% | GPT-6 Luna (Max) |
| Mirror - Beam 1.0 | 37.6344% | Beam 1.0 |
