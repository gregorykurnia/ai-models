# Model picks and implementation plans

Moved out of `~/.claude/CLAUDE.md` on 2026-11-08 so the always-loaded rules stay short. Read this file before
picking a model or effort for a task, writing or reviewing an implementation plan, or answering which model to use.
Claude and Codex both read it from here; the playbooks point here.

## Model choice for coding implementation
Reference data for picking a model + effort level for a task. Lower rank = better.
When a task is cheap/simple, prefer the cheaper rows; for hard implementation or
anything visual/presentation-heavy, prefer the higher-ranked rows. If the current
model/effort looks wrong for the task, say so before starting and suggest a switch.

| Model + effort     | Cost / task | Terminal Bench rank | Presentation Elo rank | Analytical Elo rank | Strategy & Ops rank | Finance rank | Omniscience rank | FrontierCode rank | Rubric rank | Time / task (min) | First answer (s) |
|--------------------|-------------|---------------------|-----------------------|---------------------|---------------------|--------------|------------------|-------------------|-------------|-------------------|------------------|
| Opus 5.5 xHigh     | $6.05       | 16                  | 15                    | 4                   | 15                  | 25           | 24               | 11                | 16          | 16.1              | 57.6             |
| Sonnet 5.5 xHigh   | $4.09       | 22                  | 14                    | 6                   | 44                  | 52           | 71               | 37                | 8           | 14.5              | 27.4             |
| Opus 5.5 High      | $3.46       | 25                  | 31                    | 10                  | 27                  | 37           | 26               | 35                | 21          | 9.4               | 19.2             |
| Opus 5.5 Medium    | $2.45       | 40                  | 45                    | 23                  | 35                  | 44           | 37               | 43                | 29          | 7.0               | 13.2             |
| Sonnet 5.5 High    | $1.64       | 52                  | 50                    | 21                  | 54                  | 64           | 73               | 64                | 18          | 7.2               | 9.6              |
| Haiku 5.5 Max      | $0.41       | 71                  | 70                    | 19                  | 104                 | 69           | 78               | 39                | 54          | 14.8              | 182.3            |
| Opus 5.5 Low       | $0.98       | 79                  | 149                   | 100                 | 71                  | 74           | 39               | 99                | 99          | 3.1               | 4.9              |
| Sonnet 5.5 Medium  | $0.78       | 82                  | 111                   | 64                  | 77                  | 82           | 74               | 110               | 65          | 3.8               | 4.9              |
| Haiku 5.5 xHigh    | $0.25       | 85                  | 83                    | 27                  | 103                 | 81           | 80               | 51                | 62          | 9.5               | 42.1             |
| Haiku 5.5 High     | $0.16       | 100                 | 109                   | 47                  | 109                 | 94           | 87               | 74                | 84          | 6.5               | 19.4             |
| Haiku 5.5 Medium   | $0.09       | 116                 | 129                   | 75                  | 118                 | 100          | 89               | 98                | 94          | 4.0               | 9.2              |

Notes:
- Ranks are from Model Atlas (https://ai-models-nine-livid.vercel.app, the master leaderboard),
  Artificial Analysis captures of 2026-11-25 (Terminal-Bench 4.1) and 2026-11-19 (other columns). Out of 282 models on
  Terminal Bench, 289 each on Presentation, Analytical Elo, Rubric and Briefcase, 168 on Strategy & Ops, 164 each on Finance and Economics, and 169 on Omniscience.
  The rebuilt domain and Omniscience indexes are comparable with captures from 2026-10-29 on.
  Cost / task is the Intelligence Index v5.0.1 cost per task (156 scored models), about 1.7–2× the v4 figures.
- FrontierCode 2.0 is out of 157 models (column added 2026-11-09). All ranks below use Model Atlas's master rows
  (`aggregateMaster`, each cell's `source_rank`) from `docs/model-table-ranks-2026-11-25.md` in the ai-models repo.
  Against the 18 Nov capture, the Claude rows shown here fell by up to 7 places on Terminal Bench.
- **SWE-Atlas QnA (AA capture of 2026-11-19), no column here:** AA measures the Claude 5.5 models at Max only. Haiku 5.5 Max
  appears in this table. Rank among the 40 imported rows, then pass rate: Opus 5.5 Max 4 (66%), Sonnet 5.5 Max
  5 (64%), Haiku 5.5 Max 40 (34%, the lowest of all 40). The Fable 5.2 and GPT tables below carry the column.
- **Retired (owner, 2026-11-16):** GDPval-AA, AA-LCR, SciCode and HLE-Diamond (Humanity's Last Exam) were taken out of
  Model Atlas and this file, so no pick or reason here rests on them.
- **Fable 5.1 (checked 2026-11-10, ranks from the captures above, not used):** it costs more than Opus 5.5 at the same efforts.
  Fable 5.1 High ($7.54) ranks 41 on Terminal Bench, 76 on Presentation, 25 on Analytical Elo, 50 on FrontierCode and 27 on
  Rubric. Opus 5.5 High ($3.46) ranks 25, 31, 10, 35 and 21. Fable 5.1 Max ($12.99) trails Opus 5.5 xHigh ($6.05)
  on all of those but Rubric. Being the newest model doesn't make it the pick: a session running on Fable switches to Opus 5.5 High.
- **Fable 5.2 (checked 2026-11-10, ranks from the captures above):** Low and Medium cost about what Opus 5.5 High does on AA.
  High and up cost more than Opus 5.5 xHigh and sit outside the normal session cap. Briefcase means AA-Briefcase overall.
  SWE-Atlas QnA is our rank among the 40 imported rows, then AA's pass rate in whole percent (AA capture of
  2026-11-19; ranks come from the unrounded scores); AA doesn't measure Opus 5.5 High or xHigh (–).

  | Model + effort | Cost / task | Terminal Bench | Presentation | Analytical Elo | Strategy & Ops | Finance | Omniscience | FrontierCode | SWE-Atlas QnA | Rubric | Briefcase | Time / task (min) |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|
  | Fable 5.2 Low | $3.10 | 33 | 51 | 38 | 11 | 14 | 5 | 27 | 15 (60) | 30 | 41 | 5.5 |
  | Fable 5.2 Medium | $3.80 | 33 | 33 | 30 | 7 | 10 | 4 | 19 | 6 (64) | 15 | 23 | 6.5 |
  | Fable 5.2 High | $9.08 | 13 | 18 | 24 | 4 | 5 | 3 | 1 | 10 (62) | 5 | 11 | 15.1 |
  | Fable 5.2 xHigh | $14.83 | 10 | 11 | 14 | 2 | 4 | 2 | 4 | 9 (62) | 2 | 6 | 24.4 |
  | Fable 5.2 Max | $26.54 | 10 | 5 | 5 | 1 | 2 | 1 | 3 | 13 (60) | 1 | 3 | 41.6 |
  | Opus 5.5 High | $3.46 | 25 | 31 | 10 | 27 | 37 | 26 | 35 | – | 21 | 10 | 9.4 |
  | Opus 5.5 xHigh | $6.05 | 16 | 15 | 4 | 15 | 25 | 24 | 11 | – | 16 | 4 | 16.1 |

  - *Where it leads:* knowledge and judgment. Fable 5.2 Low and Medium beat Opus 5.5 High on Strategy & Ops (11 and 7
    against 27), Finance (14 and 10 against 37), Omniscience (5 and 4 against 26) and FrontierCode (27 and 19 against 35).
    Medium also leads on Rubric (15 against 21).
  - *Where it trails:* judged agentic work. Analytical Elo scores are 1731 and 1782 against Opus 5.5 High's 1960
    (178–229 Elo, far outside the ±20 margin). AA-Briefcase ranks are 41 and 23 against 10, and Terminal Bench ranks are
    33 and 33 against 25. Presentation is close for Medium (33 against 31) and clearly worse for Low (51).
  - *Limits:* the owner sees Fable draw down the weekly and 5-hour limits faster than Opus, so the AA cost column
    understates what it costs on the subscription. That is why it's picked only as a single call with no tools (the
    red-team row below, 2026-11-15, and /model-pass reading and reviewing); a session on Fable still switches to Opus 5.5 High. Where it would help analysis is in "Analysis work" below.
- **What the three coding benchmarks measure** (read on artificialanalysis.ai and cognition.com, 2026-11-06;
  SWE-Atlas-QnA 18 Nov):
  - *FrontierCode 2.0* (Cognition, run by AA): 132 private tasks in real open-source repos, built with their
    maintainers; scored on whether a maintainer would merge the change. Hidden tests plus a rubric whose blocking
    checks (any failure scores 0) are mostly thoroughness (unstated requirements the code implies), core behaviour,
    no regressions, good tests, lint/typecheck and scope (no stray files or broken APIs). Its examples are bug fixes.
    **Best guide for bug fixes and changes inside an existing codebase.**
  - *Terminal-Bench 4.1*: the same 66 mostly fully specified terminal tasks (software, ML, science, ops, security,
    media), rescored with updated verifiers. **Best guide for tool-heavy, multi-step terminal work** (setup, scripts,
    builds, servers, debugging an environment), less for whether a fix fits the codebase.
  - *SWE-Atlas-QnA* (Scale AI's tasks, grading adjusted and run by AA; the SWE-Atlas-QnA-AA tab of AA's Coding Agent
    Index page): 124 technical questions on real codebases. The model reads the code, traces its behaviour and gives a
    technical answer, which passes or fails. **Best guide for reading and explaining an existing codebase without
    changing it** (tracing a flow, answering "how does X work", the code-reading part of a review or a plan). Limits:
    AA runs each model inside a coding agent (Claude Code, Codex, …), so it scores the agent and model together; and
    only the Max efforts of Opus, Sonnet and Haiku 5.5 are measured, so no Claude row under the Opus 5.5 High cap is
    (all ten GPT-6.2 rows and the five Fable 5.2 rows are). Scores: the GPT and Fable 5.2 tables and the note under the
    Claude table (AA capture of 2026-11-19). **Where it should count:** the `tracer` and `finder` rows (Claude and Codex
    picks) in "Subagents inside a session", that section's code-explorer mapping, and the read-the-code step before a
    plan or a review. The owner moved `tracer` (2026-11-18): Claude from Haiku 5.5 Max (34%, last) to Opus 5.5 Medium
    (unmeasured; Opus 5.5 Max scores 66%), Codex from Sol Max (46%) to Sol High (51%).
  - *AA Coding Agent Index* scores the model inside its own agent, equal weights, max efforts only: v2.0 (Oct 2026, the
    figures below) used FrontierCode v1.1, the previous terminal benchmark and SWE-Atlas-QnA; v2.1 uses
    FrontierCode-AA 2.0, Terminal-Bench 4.1 and SWE-Atlas-QnA. **Best single guide for overall coding implementation** (it scores the tool as used). Index, cost per task:
    Claude Code Opus 5.5 Max 62 ($11.42), Sonnet 5.5 Max 59 ($13.30), Haiku 5.5 Max 37 ($2.67). No Claude row under the
    High cap is measured. Every GPT-6.2 effort is scored on SWE-Atlas-QnA (AA capture of 2026-11-19); its index figures aren't
    captured here, and its older GPT rows aren't used here.
  - None of them sees a visual or timing bug: a person checks those in the app, or a screenshot or recording shows it.
- Haiku 5.5 Max beats Opus 5.5 Low, Sonnet 5.5 Medium and Sonnet 5.5 Low ($0.51, Terminal Bench 106, Presentation 155,
  FrontierCode 118) on the Terminal Bench, Presentation and FrontierCode ranks for less. Prefer it over those three.
- **Every pick is capped at Opus 5.5 High** (2026-11-03: the xHigh rows used too many tokens and too
  much money). Two standing exceptions: the write step of a `/model-pass` (one tool-less call) runs on Opus 5.5 xHigh
  (owner, 2026-11-15; the rule lives in that skill's step 1), and **heavy plans** (next bullet). No other session, plan
  task, autorun retry, design-studio step or analysis step picks Sonnet 5.5 xHigh or Opus 5.5 xHigh; their rows stay in
  the table for reference only. Visual build tasks
  that set the look and design-studio steps (directions, prototype, design guide, design gaps) use
  Opus 5.5 High, judged from screenshots, as do light product and implementation plans. Who does the
  rest (risky code, build tasks, reviews, retries) is in "Claude or Codex: one pick per task" below. What a row
  above the cap would buy, if the owner lifts it for one job, is in "When the cap may lift" below.
- **Heavy and light plans (owner, 2026-11-17; this is the rule's one home):** a *heavy* plan is a product or
  implementation plan for a new app or a blank-slate redesign, any plan of two or more phases, or a plan with a
  migration or a change to scoring, money or sign-in. Opus 5.5 xHigh writes it, then one
  `fable-redteam.sh --heavy` call (Fable 5.2 High, no tools, $4 cap) attacks it. Everything else is *light*: Opus 5.5
  High writes it and the usual Fable 5.2 Medium call attacks it. Why: writing a plan is long agentic work in the repo,
  where Opus xHigh leads (Analytical Elo 4, Briefcase 4; Opus High 10 and 10; Fable 5.2 High 24 and 11), and reviewing a
  finished plan needs completeness and no invented facts, where Fable High leads (Rubric 5, Omniscience 3; Fable Medium
  15 and 4). Fable stays one call, never the writer: it trails on agentic work and drains the limits faster. Only the
  writing session runs on xHigh: a session that is about to write a heavy plan on Opus 5.5 High says so and asks the
  owner to switch (`/effort xhigh`), then back to High once the plan is committed. Plan reviews, the build and every
  other step keep their picks. When unsure whether a plan is heavy, ask the owner in the same line as the plan summary.
- Opus 5.5 Low is poor for presentation/UI work (rank 149).
- The blank-slate redesign and new-app playbooks read this table for their per-step and
  per-task model picks, so keep the heading and the column names when you update it.
- **Time / task** is the minutes per task in Artificial Analysis's Intelligence Index runs, and **First answer** is the seconds until the first answer token (its headline figure). Speed breaks ties only: the ranks and the rules still decide every pick.

### Analysis work (strategy, research, finance, reports): picks per step
The analysis columns measure: **Analytical Elo** (AA-Briefcase: judged quality of analysis on agentic
knowledge-work tasks), **Strategy & Ops** and **Finance** (domain indexes; Economics ranks the
same way), **Omniscience** (factual accuracy that penalizes wrong answers over "I don't know", so
it measures how much a model makes things up), **Rubric** (share of a
brief's checks passed, i.e. completeness). What they show:
- **Opus beats Sonnet on analysis at every price.** Opus 5.5 Medium ($2.45) beats Sonnet 5.5 xHigh
  ($4.09) on Strategy & Ops, Finance, Economics and Omniscience.
  Sonnet 5.5 xHigh leads on the deliverable-quality indexes (Presentation, Rubric, Analytical Elo),
  with a 40-point Analytical Elo lead over Opus 5.5 High, about twice the error margin (about ±20).
- **Sonnet and Haiku make up facts much more often.** Omniscience v1.1 score: every Opus 5.5 effort is
  39–48 (Low included), Sonnet 5.5 is 19–31 even at Max, Haiku 5.5 is 2–12. Where numbers must
  not be invented, Sonnet and Haiku only write from cited sources.
- **Haiku 5.5 Max is strong on work grounded in the files it's given** (Analytical Elo rank 19, above
  Opus 5.5 Medium's 23) but weak on domain judgment (Strategy & Ops rank 104 of 168).

| Analysis step | Pick | Why |
|---|---|---|
| Framing the question and the final recommendation or go / no-go (short judgment calls) | Astra xHigh (GPT-6.2, in Codex) | Strategy & Ops 8, Finance 8, Omniscience 12 against Opus 5.5 High's 27, 37 and 26, for $2.52 (owner, 2026-11-17). Once the recommendation or verdict is written, it gets the red-team call in the next row before the owner sees it |
| Final synthesis and storyline (long judged work) | Opus 5.5 High | Analytical Elo 10 and Rubric 21. Astra Max reaches 37 and 20 |
| Red-teaming a written plan or verdict (one file): new-app Steps 2b and 12, every implementation plan (`--impl`, rule under "Implementation plans are written for `autorun all`"), and every analysis recommendation or verdict | Fable 5.2 Medium, one call via `~/.claude/scripts/fable-redteam.sh` (`--verdict` for a recommendation); a heavy plan adds `--heavy` (Fable 5.2 High, "Heavy and light plans" above) | Strategy & Ops 7, Omniscience 4 (Opus 5.5 High: 27, 26), and a different model from the author. One call with no tools and a $1.50 cap: $0.11 on a short plan (owner, 2026-11-15). Each point is taken (the text changes) or declined with a reason the owner sees |
| Framework analyses and domain judgment (market, competitors, pricing, unit economics, org, portfolio) | Opus 5.5 High | Rank 24–37 on the domain indexes, 10 Analytical Elo, 26 Omniscience; beats Sonnet 5.5 xHigh on domain and Omniscience for less |
| Web research with citations, checking a draft against its sources, well-scoped single questions | Opus 5.5 Medium inside a Claude session (the `fact-checker` role); Sol Max as a plan row | Opus 5.5 Medium: Strategy & Ops 35 and Omniscience 37 (Sonnet 5.5 High: 54 and 73). In a plan Opus 5.5 Medium drops out while Codex has limit ("Claude or Codex" below): Sol Max ranks 14 and 33 for $1.01 |
| Writing the report from findings already checked | Opus 5.5 High | Analytical Elo 10, the best of every row under the cap, with Omniscience 26. Sonnet 5.5 High leads on Rubric (18 against 21, scores 60.2 against 58.9) and ranks 73 on Omniscience |
| Building the deck from findings already checked | Sol Max | Presentation scores reports and decks: Sol Max ranks 6 against Opus 5.5 High's 31, Omniscience 33 against 26. Opus 5.5 High checks the facts on the finished deck |
| Extracting and summarizing provided files, fact sheets, interview notes, data-gap lists | Haiku 5.5 Max | Analytical Elo 19 for $0.41; every fact cited to a file, no recall or estimates |
| Mechanical (folder setup, renaming, copying, ticking checklists) | Haiku 5.5 High | Cheapest that is reliable |

Keep analysis and write-up in separate sessions: the analysis session saves its findings to a file, and
a fresh write-up session writes from that file. Don't use Sonnet 5.5 High, Sonnet 5.5 Medium or Opus 5.5 Low as
the analyst (Opus 5.5 Medium beats Sonnet 5.5 High by 4.8 points on Strategy & Ops, 6.2 on Finance and
21.1 on Omniscience for $0.81 more). At 1.7× the cost, Opus 5.5 Max ($10.04) adds 2.4 points of
Strategy & Ops, 3.7 of Finance and 45 Analytical Elo over xHigh (the one-job exception the owner can
name is in "When the cap may lift"). Not used: science and academic benchmarks
(CritPt, MMMU-Pro), AutomationBench (SaaS workflows; Sonnet leads at Max and
xHigh, Opus by 4–6 points at High and Medium) and GDP.pdf (every 5.5 and Fable 5.2 model scores 0.29 or less; Opus 5.5
High is best).

**Fable 5.2 Low and Medium for these steps (weighed 2026-11-10, ranks in the Fable 5.2 note above):** the evidence splits.
On the closed-answer indexes they lead Opus 5.5 High by a wide margin (Strategy & Ops 11 and 7, Finance 14 and 10,
Omniscience 5 and 4, against 27, 37 and 26), for about its AA cost ($3.10 and $3.80 against $3.46). On the judged
agentic work these steps actually produce they trail it (Analytical Elo 38 and 30 against 10, AA-Briefcase 41 and 23
against 10). Rubric is mixed (Low 30, Medium 15, Opus 21) and Presentation favours Opus
(Low 51, Medium 33, Opus 31). Medium beats Low on every one of these for $0.70 more, so Medium is the one to weigh:
- *Framing the question, the final recommendation and red-teaming a verdict:* Fable 5.2 Medium would be the better
  pick. These are short, judgment-heavy outputs where domain knowledge and not inventing facts count most, and a
  red-team on a different model than the analyst sees more.
- *Strategy and finance analysis:* stays Opus 5.5 High. The output is a long piece of agentic work, where Opus leads by
  178 Analytical Elo; Fable 5.2 Medium is worth a check pass on the numbers and domain claims.
- *Storyline and write-up:* stays Opus 5.5 High (Presentation, AA-Briefcase).
Owner, 2026-11-15: red-teaming moved to Fable 5.2 Medium, only as one capped call with no tools (`fable-redteam.sh`), never
a session or subagent. Framing and writing the recommendation stay Opus 5.5 High: the owner sees Fable draw down the weekly
and 5-hour limits faster than Opus, so its real cost on the subscription is higher than the AA column says. The middle path
(owner, 2026-11-15): Opus writes the recommendation, then one `fable-redteam.sh --verdict` call attacks it before the owner
sees it, so Fable's judgment reaches the recommendation for cents instead of a session.
Owner, 2026-11-17: framing and the final recommendation moved to Astra xHigh (GPT-6.2), which beats Opus 5.5 High on
Strategy & Ops, Finance and Omniscience for less; the synthesis and storyline stay Opus 5.5 High (Analytical Elo, Rubric).
The Fable red-team call still attacks the recommendation, now from a third family.

### GPT models (Codex): picks per kind of work
For a project's "Codex model choices" table, or when I ask which GPT model to use. Ranks are from Model Atlas
(AA captures of 2026-11-25 for Terminal Bench and 2026-11-19 for the other columns). Lower rank = better. FrontierCode
is out of 157. SWE-Atlas QnA is our rank among the 40 imported rows (ties share a rank), then AA's pass rate in whole percent (AA capture of 2026-11-19); ranks come from the unrounded scores.
Every row is a pick (owner, 2026-11-18, below the table).

**Names (owner, 2026-11-18):** every GPT pick is GPT-6.2; GPT-6 Astra, GPT-6.1 Sol and GPT-6.1 Terra are no longer
picked anywhere. `Astra xHigh` is GPT-6.2 Astra xHigh, `Sol Max` GPT-6.2 Sol Max, and so on. autorun still runs an older
plan's `GPT-6.1 …` or `Terra …` row as written; change it to a 6.2 row when that plan is next edited.

**Token prices** (Artificial Analysis model pages, 2026-11-17; USD per million tokens, input / output, cached input at
a 95% discount): GPT-6.2 Astra $8 / $40 ($0.40 cached); GPT-6.2 Sol $2 / $10 ($0.10). autorun and AI Build Log estimate Codex costs from these.

| GPT + effort | Cost / task | Terminal Bench | Presentation | Analytical Elo | Strategy & Ops | Finance | Omniscience | Rubric | FrontierCode | SWE-Atlas QnA | Time / task (min) | First answer (s) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| GPT-6.2 Sol Low | $0.18 | 63 | 131 | 117 | 68 | 73 | 63 | 128 | 48 | 36 (42) | 1.6 | 2.0 |
| GPT-6.2 Sol Medium | $0.41 | 36 | 36 | 68 | 34 | 41 | 47 | 76 | 18 | 33 (50) | 3.3 | 3.3 |
| GPT-6.2 Sol High | $0.56 | 20 | 22 | 56 | 19 | 29 | 42 | 70 | 22 | 32 (51) | 4.7 | 11.2 |
| GPT-6.2 Sol xHigh | $0.65 | 30 | 10 | 48 | 21 | 26 | 41 | 58 | 13 | 31 (51) | 5.4 | 32.3 |
| GPT-6.2 Sol Max (`gpt-6.2-sol`) | $1.01 | 13 | 6 | 41 | 14 | 17 | 33 | 50 | 10 | 34 (46) | 8.9 | 78.6 |
| GPT-6.2 Astra Low | $0.66 | 42 | 176 | 160 | 65 | 61 | 40 | 155 | 44 | 39 (36) | 1.9 | 2.8 |
| GPT-6.2 Astra Medium | $1.62 | 17 | 79 | 93 | 28 | 31 | 19 | 80 | 6 | 29 (54) | 4.6 | 3.7 |
| GPT-6.2 Astra High | $2.07 | 8 | 27 | 52 | 9 | 13 | 14 | 37 | 5 | 27 (55) | 6.0 | 28.6 |
| GPT-6.2 Astra xHigh (`gpt-6.2-astra`) | $2.52 | 2 | 16 | 49 | 8 | 8 | 12 | 32 | 2 | 29 (54) | 7.6 | 71.1 |
| GPT-6.2 Astra Max | $4.00 | 6 | 9 | 37 | 5 | 7 | 10 | 20 | 8 | 24 (55) | 13.8 | 207.1 |

**Every GPT-6.2 effort is a pick (owner, 2026-11-18):** nothing measured on GPT-6 or 6.1 carries over to 6.2, so no 6.2
effort is ruled out. Pick the cheapest 6.2
row whose ranks fit the task's kind of work, Astra Max included (owner, 2026-11-18). Where each one fits on today's ranks:

| 6.2 row | Cost / task | Fits | On the ranks |
|---|---|---|---|
| Sol Low | $0.18 | Tiny mechanical edits with a strict check (renames, config, copying a pattern line for line) | Terminal Bench 63, FrontierCode 48; nothing read or looked at (Presentation 131, Rubric 128) |
| Sol Medium | $0.41 | Mechanical code with a build or screenshot check | FrontierCode 18, Terminal Bench 36, 3.3 min per task |
| Sol High | $0.56 | Tool-heavy terminal work: builds, servers, browser and screenshot checks, scripts, data runs | Terminal Bench 20 (better than xHigh's 30), Presentation 22, Strategy & Ops 19 |
| Sol xHigh | $0.65 | Build tasks judged by a pass/fail check inside the codebase, pages from templates, bug fixes | FrontierCode 13 and Presentation 10, close to Max's 10 and 6 for two thirds of the cost |
| Sol Max | $1.01 | Risky code (saved data, scores, data imports, migrations, money, sign-in, permissions, the router, a change every screen shows), facts checked against sources, decks. Importing art or other assets is build work (Sol xHigh) | Terminal Bench 13, FrontierCode 10, Omniscience 33 (xHigh and High: 41, 42) |
| Astra Low | $0.66 | Short fact lookups where invented facts hurt, no writing | Omniscience 40; Sol Medium beats it on every other column for less |
| Astra Medium | $1.62 | A hard bug fix inside an existing codebase that doesn't need Astra xHigh | FrontierCode 6, Terminal Bench 17, Omniscience 19 |
| Astra High | $2.07 | The Astra xHigh jobs (strategy and finance judgment, hardest code) when the weekly limit is tight | Terminal Bench 8, FrontierCode 5, Strategy & Ops 9, Finance 13, Omniscience 14 |
| Astra xHigh | $2.52 | Hardest risky code, judgment calls, the retry (bullets below) | Terminal Bench 2, FrontierCode 2 |
| Astra Max | $4.00 | Final GPT judgment calls and written work where completeness and facts both count (a final recommendation, a plan review that must miss nothing); not code, where xHigh leads | Rubric 20 (the most complete GPT, Opus 5.5 High 21), Presentation 9, Strategy & Ops 5, Finance 7, Omniscience 10; FrontierCode 8 against xHigh's 2 |

- **Start cheap, climb with a reason (owner, 2026-11-18):** every GPT task starts at the cheapest row above that fits
  its kind of work, and moves up only for a reason its pick names. Sol Max needs one of the risks in its row; an Astra
  row needs a job its own row names. Build tasks with a pass/fail check, art imports included, are Sol xHigh;
  end-to-end runs and other check runs are Sol High; repeating a built pattern is Sol Medium. Writing a plan, reviewing
  one and checking a queue all re-sort every Sol Max row this way. (The 18 Nov HoAFL queue check had all 34 GPT rows
  on Sol Max out of habit, and 24 fit cheaper rows.) The saving is small per task. It matters because the Codex
  weekly limit is shared by every project, and the cheaper rows finish sooner.
- **Measure, then move:** these rows rest on AA's ranks; how much of the weekly limit and how many retries each takes
  in autorun isn't measured yet for 6.2. `autorun picks` shows tasks, retries, cost, time and bugs per pick; after a few
  tasks of the same kind on a row, write here whether it held up (a 6.2 row that costs as much as Sol Max in practice
  loses its slot). **Switch back:** after three or more tasks of one kind on a cheaper row, if its retries or its
  bugs per task in `autorun picks` are above Sol Max's on like tasks, that kind goes back to Sol Max. Write it here
  with the numbers. A queue of plans that changes to cheaper rows before they have a record can have its set-up
  scripts switch them back by themselves after two failed tasks (HoAFL's `gpt-guard.sh`, 18 Nov).

- **Range:** every GPT-6.2 effort from Sol Low up to Astra Max (table above; Astra Max: owner, 2026-11-18).
- **Most build and check work:** Sol xHigh, or Sol High for check runs (table above). **Risky code (saved data, scores,
  router, every-page changes):** Sol Max (GPT-6.2):
  Terminal Bench 13, FrontierCode 10 and Presentation 6 for $1.01 and 8.9 minutes a task. Codex time follows output
  tokens (1.5–2.3k a minute).
- **The hardest risky code, tool-heavy terminal work (a major framework upgrade), the retry:** Astra xHigh (GPT-6.2):
  Terminal Bench 2 and FrontierCode 2, the best combined ranks for those two benchmarks (Opus 5.5 xHigh ranks 16 and
  11), at about six times Sol Max's share of the weekly limit.
- **Plan reviews, inventories and implementation-plan drafts when GPT stands in (reading where nothing may be
  missed):** Astra Max: Rubric 20 and Analytical Elo 37, the most complete GPT (Opus 5.5 High: 21 and 10), for $4.00.
  **Feasibility checks, plan updates, specs:** Astra xHigh (Rubric 32, Omniscience 12, $2.52); Sol Max (Rubric 50) only
  for short ones.
- **Strategy, pricing, market or finance judgment, anything where invented facts hurt, when the step runs in Codex**
  (framing and the final recommendation always do; the long framework analysis stays Opus 5.5 High, "Analysis work"
  above): Astra xHigh (Strategy & Ops 8,
  Finance 8 and Omniscience 12). Opus 5.5 High ranks 27, 37 and 26. Sol Max is the cheaper second (14, 17, 33).
- **Design and visual work:** on the ranks Sol Max leads (Presentation 6, Astra xHigh 16, Opus 5.5 High 31), but
  Presentation Elo scores reports and decks, not app screens. Sol Max was fourth on the prior capture. Decks: Sol Max.
  App screens and design directions: Opus 5.5 High decides and writes the specs; Sol Max builds three of the six
  directions from them (blind tests 17–18 Nov, `design-build-kit.md`).
- **Phase reviews of Claude-built work:** Sol Max (FrontierCode 10, Terminal Bench 13). `autorun picks` counts their
  FINDING lines; if they find fewer than the reviews before them, reviews move to Astra xHigh. Looks are covered by
  autorun's fresh-eyes check, which runs on the family that didn't build the task: Opus 5.5 High after a GPT-built
  task, Astra xHigh after a Claude-built one (`retry_model` in `autorun.sh`).
- **Mechanical code with a build or screenshot check:** Sol Medium (FrontierCode 18 for $0.41, 3.3 minutes a task); Sol Low for the
  tiniest edits, Sol High when the work is mostly running builds, servers or browser checks.
- **Not for planning or write-ups:** Sol Medium (Rubric 76, Analytical Elo 68).
- **Against Claude:** Opus 5.5 High ($3.46) leads every GPT row on Analytical Elo (10 against Astra Max's 37) and stays
  the pick for long written work. Astra Max leads it on Rubric (20 against 21). GPT-6.2 leads on Terminal Bench,
  FrontierCode, Presentation and the domain indexes. Picks follow "Claude or Codex: one pick per task" below.
- **The weekly limit drains with the cost column:** measured on earlier GPT versions and scaled by AA's cost per task,
  a 6.2 task takes about 7% of the ChatGPT plan's weekly Codex limit on Astra Max, 4.5% on the other Astra rows, 0.7% on
  Sol Max and 0.4% on the other Sol rows; `autorun check` uses those until 6.2 is measured. Sol Low and Astra Low and
  Medium will come in under those.
- **Time / task** is the minutes per task in Artificial Analysis's Intelligence Index runs, and **First answer** is the seconds until the first answer token (its headline figure). Speed breaks ties only: the ranks and the rules still decide every pick.

**When GPT stands in for Opus 5.5 High** (only when I say so, e.g. Claude is out of usage):

| Opus 5.5 High step | GPT pick | Why |
|---|---|---|
| Market, pricing, finance, competitor analysis | Astra xHigh | Finance 8 (Opus 5.5 High: 37) |
| Web research with citations (the Opus 5.5 Medium step) | Sol Max | Strategy & Ops 14, Omniscience 33 (Opus 5.5 Medium: 35, 37), $1.01 |
| Product and implementation plans | Astra Max drafts, Astra xHigh critiques in a fresh session | Astra Max is the most complete GPT (Rubric 20); Astra xHigh adds risk and judgment |
| Design: directions, screens, look passes, design guide | Sol Max, with an Astra xHigh direction beside it | Presentation 6 and 16 (Opus 5.5 High: 31) |
| Written report | Astra Max | Best GPT on Analytical Elo (37) and Rubric (20) |
| Deck | Sol Max | Presentation 6 |
| Risky code, autorun retries | Astra xHigh | Terminal Bench 2, FrontierCode 2 (Opus 5.5 High: 25, 35) |
| Phase reviews | Sol Max | See the phase-review trial above |

The habits that cover GPT's gaps (plan completeness, write-up quality):
- **Requirements list first:** one session turns the brief into numbered requirements; the plan maps each to a task, and a
  separate pass ticks them off.
- **Storyline before writing:** settle the answer and its support in its own step, then write; fact-check against the
  sources in a separate session.
- **Design is judged from screenshots:** give it the guide and a reference picture, ask for two or three directions, pick
  from shots.
- **On a subscription, spend Max effort only at the end:** the final recommendation and the design direction.

### Claude or Codex: one pick per task
The default when both tools are available (2026-11-05): every step and task gets exactly one pick, a Claude
or a GPT row, chosen from the numbers in both tables rather than by tool. A GPT pick runs in Codex and a
Claude pick in Claude; `autorun` starts the right one for each task. The playbooks' step picks follow this.

| Kind of work | Pick | Why (ranks from the tables above) |
|---|---|---|
| What people look at or read closely: product plan, design directions and guide, implementation plan, the component library, app shell and first page of each kind with no template | Opus 5.5 High (a heavy product or implementation plan: Opus 5.5 xHigh, "Heavy and light plans" above) | Analytical Elo 10 and Rubric 21. Astra Max leads on Rubric (20) and reaches 37 on Analytical Elo. Design trial result (owner, 2026-11-18, three blind tests in `~/design-blind-test`): built alone, Sol Max lost clearly; built from an Opus spec with `design-build-kit.md` and a screenshot loop, the owner preferred Sol's build in one of two pairs. So each round of directions is three by Opus plus three Opus specs built by Sol Max and reviewed by Opus (design-preferences.md, "Design directions: who makes them"); the specs, the guide and look-setting screens stay Opus |
| Can lose data or break production: schema, migrations, auth, permissions, money, imports, router, sync, switch-overs | Sol Max | FrontierCode 10 and Terminal Bench 13 for $1.01 (Opus 5.5 High: 35, 25). Astra xHigh (FrontierCode 2, Terminal Bench 2) for the hardest of these and for a major framework upgrade, at about six times Sol Max's share of the weekly limit |
| Most build and check work, judged by a pass/fail check: pages from templates, forms, logic, states, end-to-end specs and check runs, release checks, bug fixes | Sol xHigh for building, Sol High for check runs (builds, servers, browser and screenshot checks), Sol Max when it also touches saved data | Sol xHigh: FrontierCode 13, Presentation 10 for $0.65; Sol High: Terminal Bench 20 for $0.56; Sol Max: FrontierCode 10, Terminal Bench 13 for $1.01. `autorun picks` checks the cheaper rows hold up |
| Written work where completeness is checked by reading: plan reviews, feasibility checks, inventories, feature plan updates, specs | Astra Max for plan reviews and inventories, Astra xHigh for feasibility checks, plan updates and specs | Astra Max: Rubric 20, Analytical Elo 37 (Opus 5.5 High: 21, 10) for $4.00; Astra xHigh: Rubric 32, Omniscience 12 for $2.52 |
| Mechanical code with a build or screenshot check: repeating a built pattern, scripts, config, upgrades, deleting old code | Sol Medium | FrontierCode 18, Terminal Bench 36 for $0.41, 3.3 minutes a task |
| Completeness is the job: coverage audits, leak reviews, rewriting a project's rules | Sonnet 5.5 High | Rubric 18, the best of every row under the cap |
| Exact copies and short write-ups from given material: setup, tokens, icons, interviews, scans | Haiku 5.5 Max or High | Cheapest reliable; Analytical Elo 19 at Max |
| Fact-heavy scans (upkeep: versions, end-of-life dates, plan limits) | Sol Max | Strategy & Ops 14, Omniscience 33 for $1.01 |
| Phase reviews | the other family from whoever built the work: Opus 5.5 High after Codex-built work, Sol Max after Claude-built work (GPT-6.2 on trial, see the GPT bullets) | A second family catches different mistakes: when Astra reviewed GPT-built work it found almost nothing (delami-demo R4: 0 findings in 8 tasks), while crossed reviews found real bugs both ways (2026-11-11). `autorun check` warns when an open review row is on the family that built most of its phase. Sol over Astra (owner, 2026-11-07): better Rubric for a fraction of the weekly limit |
| The one retry after a failed try | the other family's top row: Opus 5.5 High or Astra xHigh | `autorun` picks the retry itself |

- While Codex has limit left, Opus 5.5 Medium drops out of plan picks (Sol Max beats it on six of eight measures,
  Presentation included, at under half its cost), and so does Sonnet 5.5 High as a builder (Terminal Bench 52 against
  Sol Max's 13). In autorun 9 of its 131 tasks needed a retry, the most of any pick, and wedding-planning's reviews sent
  back 10 of its 39 tasks.
  Sonnet 5.5 builds no code at all, whatever the limits: a git-blame study of every fix in every project
  (2026-11-15) found 29 % of its commits needed a later fix against 11–12 % for Opus, Haiku and Sol, worse than Opus
  in 6 of 9 shared projects, and Opus found and fixed most of its bugs; the kinds it repeats are in
  `catching-bugs.md` §3, "Repeat bugs per model".
- **When Codex's weekly limit runs low** (`autorun check` says the open GPT rows won't fit), Sol build rows
  judged by a pass/fail check move to **Opus 5.5 Medium**. Its Terminal Bench, FrontierCode, Presentation and Omniscience
  ranks are 40, 43, 45 and 37, against Sonnet 5.5 High's 52, 64, 50 and 73. It costs $0.81 more and both take about
  7 minutes a task. Sonnet 5.5 High keeps only completeness work (Rubric 18 against 29). The other Sol Max rows
  (risky code, written work) and Astra xHigh rows move to Opus 5.5 High, the same row autorun falls back to when the
  limit is used up mid-run (owner, 2026-11-09).
- **A fix keeps the pick that built the code.** A fix task (review fixes, a bug split off a review) in code that saves
  or loads data, money, sync, sign-in or permissions takes the pick that built that code or the row above it, never a
  cheaper one. (wedding-planning's Opus 5.5 Medium fixes in one area of simultaneous saves had 2.7 bugs a task, the
  most of any pick, the same kinds coming back from Phase 4 to Phase 8; 2026-11-11.)
- **Picks are checked against results, not only benchmarks.** Reviews write a FINDING line per problem and fresh eyes a
  WRONG line per picture fault; autorun files both with the pick that built the task. `autorun picks` (this project) or
  `autorun picks all` shows tasks, retries, cost, time and bugs per task for each pick. Move a pick on a pattern across
  several tasks of the same kind, not one bad task: the risky tasks go to the strongest picks, so their raw bug counts
  run higher (2026-11-11: Opus 5.5 High had 1.8 bugs a task on saving, sync and money work, Haiku 5.5 Max 0.3 on ports).
- **Interactive Claude sessions** (outside autorun, the owner watching): mid-size fixes and small features run well
  on **Opus 5.5 Medium**: $2.45 against Opus 5.5 High's $3.46, first answer in 13.2 s against 19.2 s, 7.0 minutes a task
  against 9.4. Work that saves or loads data, touches scores, money, sign-in or permissions, or sets the look stays
  on Opus 5.5 High (FrontierCode 35 and Presentation 31 against Medium's 43 and 45). Not for written deliverables
  (Presentation 45, Rubric 29) (owner, 2026-11-09). When the owner is happy to work in Codex instead, Sol Max beats
  Opus 5.5 Medium on six of eight measures for $1.01 on these captures.
- Interactive work that needs Claude Code stays there: AskUserQuestion interviews, and the blank-slate design
  studio (its firewall is built for Claude).

### Subagents inside a session (owner, 2026-11-13)
A session (interactive or autorun) may hand a narrow, read-only job to a subagent when the handoff saves more than it
costs: a subagent starts with no context, and only a summary comes back. Fresh sessions stay the way work is split. A
Claude subagent is the same family as its session, so it never replaces autorun's tasks, a phase review, plan review
or autorun's fresh eyes.

**Roles.** Each job has a dedicated agent in `~/.claude/agents/` (synced with this repo) whose frontmatter fixes its
model, effort, tools (read-only, no shell) and turn limit, so the pick happens without anyone remembering it. Start
the role by name (`subagent_type: "finder"`) and don't pass `model` or `effort`: the frontmatter is the pick. Roles
marked "no CLAUDE.md" skip the instruction files (about 4.5k tokens a call) because the brief carries everything
they need; the look checker skips them so it stays unanchored.

| Role | Job | Example | Claude pick | Codex pick | Why |
|---|---|---|---|---|---|
| `finder` (no CLAUDE.md) | Find code in a big codebase | "every place that writes MoMs, with file:line" | Haiku 5.5 High | Sol Medium | Locating, not judging; $0.16 |
| `tracer` (no CLAUDE.md) | Trace or summarize given files or logs | "trace a MoM save from editor to database"; "group a long Playwright log's failures by cause" | Opus 5.5 Medium | Sol High | Reading code: SWE-Atlas QnA put Haiku 5.5 Max last (34%) and Sol Max (46%) below Sol High (51%), owner 2026-11-18; Analytical Elo 23, $2.45; every claim cites file:line |
| `coverage-auditor` | Check work against a list | "does this diff meet every Done when bullet?"; "is every requirement mapped to a task?" | Sonnet 5.5 High | Astra Max | Rubric 18, the best under the cap |
| `fact-checker` (no CLAUDE.md) | One docs or web question, with sources | "is this library version still supported?"; "does the SDK we use support X?" | Opus 5.5 Medium | Sol Max | Omniscience 37 (Sonnet 5.5 High ranks 73) |
| `look-checker` (no CLAUDE.md) | Unanchored look check, outside autorun | gets only screenshot paths, writes `LOOKED:` and `WRONG:` lines (`catching-bugs.md` §1) | Opus 5.5 High | Astra xHigh | Presentation 31. Autorun's fresh eyes covers its own tasks |
| `red-team` | Attack a plan, design or verdict before the owner sees it, outside autorun | "what in this plan will break or isn't needed?" | Opus 5.5 High | Astra xHigh | It needs tools to read code or several files; a written plan in one file goes to `fable-redteam.sh` instead (the analysis table's red-team row) |

- **One home for a pick:** this table. When a row's pick changes, change that role's `model`/`effort` frontmatter in
  the same commit. A new role needs a job none of these covers, a row here and a file there.
- **Other agents** (built-in `Explore`, `general-purpose` or `Plan`, and plugin agents a skill starts): use the role
  instead where one fits. Where a skill needs its own agent, pass `model` and `effort` from the closest row (this rule
  is the explicit ask the Agent tool's `effort` setting needs): research analysts and scouts → `fact-checker`'s row;
  critics and devil's advocates → `red-team`'s; validators → `coverage-auditor`'s; code explorers → `tracer`'s; code
  architects and reviewers → Opus 5.5 High. Never a `fork`: it copies the whole conversation and runs at the session's
  own effort. Never above Opus 5.5 High, never xHigh, never Fable.
- **Codex:** `spawn_agent` with the role file's body as its prompt, on the Codex pick where it can set the model.
- **Not to build or fix code**, unless the owner asks (new-app §7.4 "Exceptions"). Not for a lookup the session can do
  in a few tool calls. At most two subagents at once, and none running checks while a build or test run uses the
  machine ("Builds fit the machine" in `~/.claude/CLAUDE.md`).
- **Brief it without your conclusion:** a check gets the material (pictures, diff, requirements), never "confirm that
  X works". The session checks what comes back before acting on it: a subagent's mistakes sound as sure as its findings.

### Free models: backup only (owner, 2026-11-16)
Three open-weight models cost nothing through free routes. Ranks from Model Atlas (AA captures listed above, same
columns and counts as the tables above); the cost column is what AA paid on the paid API, shown only to compare. Routes
and limits from the owner's "Free Coding Backups" page (https://claude.ai/artifact/NZSAqDmcLXKfqGboWnRKHt, 2026-11-16).

| Model + effort | AA cost / task | Terminal Bench | Presentation | Analytical Elo | Strategy & Ops | Finance | Omniscience | Rubric | FrontierCode | Time / task (min) | First answer (s) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| DeepSeek V4.1 Flash 1017 Max | $0.60 | 76 | 19 | 31 | 61 | 75 | 98 | 81 | 55 | 14.0 | 43.8 |
| DeepSeek V4.1 Flash 1017 High | $0.46 | 83 | 24 | 101 | 67 | 84 | 96 | 104 | 94 | 10.8 | 18.4 |
| GLM 5.3 Max | $5.01 | 58 | 94 | 34 | 73 | 76 | 85 | 63 | 81 | 24.4 | 71.5 |
| GLM 5.3 Flash | $0.58 | 74 | 77 | 69 | 84 | 89 | 99 | 87 | 90 | 39.7 | 90.2 |
| *Haiku 5.5 Max (compare)* | $0.41 | 71 | 70 | 19 | 104 | 69 | 78 | 54 | 39 | 14.8 | 182.3 |
| *Opus 5.5 High (compare)* | $3.46 | 25 | 31 | 10 | 27 | 37 | 26 | 21 | 35 | 9.4 | 19.2 |

- **About Haiku 5.5 Max level, far below Opus 5.5 High and Sol Max.** DeepSeek V4.1 Flash 1017 Max is the strongest of
  the three. It beats Haiku 5.5 Max on Presentation (19 against 70) and Strategy & Ops (61 against 104). Haiku leads
  on FrontierCode (39 against 55) and Omniscience (78 against 98). GLM 5.3 Max leads the three on Terminal Bench (58),
  Rubric (63) and Omniscience (85). GLM 5.3 Flash is the easiest to reach and the slowest (39.7 minutes a task, 90.2 s to
  first answer).
- **Free routes don't say which effort or build they serve.** GLM 5.3 Low is far weaker (Terminal Bench 67, FrontierCode
  105, Presentation 172). The plain DeepSeek V4.1 Flash Max build ranks 86 on Terminal Bench and 98 on Presentation.
  The non-reasoning builds rank 140–150 on Terminal Bench. Expect Haiku 5.5 High to Max quality.

| Model | Free route | Watch for |
|---|---|---|
| DeepSeek V4.1 Flash | opencode's built-in free model (`opencode models opencode --refresh`), no key; Freebuff lists the 1017 build | The name must say V4.1 (plain V4 Flash is much weaker); the free period may end without notice |
| GLM 5.3 | AIHubMix key (no card), OpenAI-compatible base URL `https://aihubmix.com/v1`, model `coding-glm-5.3-free` (1M context) | About 5 requests a minute (reported); only ids ending `-free` (some `:free` ids bill) |
| GLM 5.3 Flash | opencode `opencode/glm-5.3-flash-free` (no key, 200K); NVIDIA NIM free key; AIHubMix `coding-glm-5.3-flash-free` | opencode route 7–196 s a reply and called temporary; AIHubMix about 100 requests and 1M tokens a day (reported) |

- **Only when I say so** (Claude and Codex both out, or a job I name). Never a pick in a plan, an autorun row, a retry or
  a review: autorun can't start them and they're in neither table.
- **Never on DEUS or client code, secrets, `.env` files, portfolio or other personal data.** NVIDIA's free endpoints may
  train on prompts; AIHubMix (a reseller in China) and Freebuff are small resellers. Personal projects with nothing
  private only.
- **As a stand-in:** code and fixes on DeepSeek V4.1 Flash in opencode, GLM 5.3 for tool-heavy terminal work. No saved
  data, money, sign-in, permissions or migrations on them: that waits for Claude or Codex, which also review whatever
  they built before it's released.
- Free offers change every few weeks: check the route still works before counting on it.

### Gemini 4 Hydrogen: compare only (owner, 2026-11-16)
Google's Gemini 4 Hydrogen (released 2026-11-12), four efforts. Ranks from Model Atlas (AA captures listed above, same
columns and counts as the tables above); the cost column is what AA paid, shown only to compare.

| Model + effort | AA cost / task | Terminal Bench | Presentation | Analytical Elo | Strategy & Ops | Finance | Omniscience | Rubric | FrontierCode | Time / task (min) | First answer (s) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Gemini 4 Hydrogen xHigh | $3.16 | 30 | 17 | 70 | 24 | 15 | 16 | 34 | 25 | 15.2 | 45.2 |
| Gemini 4 Hydrogen High | $1.87 | 25 | 23 | 94 | 39 | 21 | 22 | 53 | 34 | 8.6 | 20.1 |
| Gemini 4 Hydrogen Medium | $0.80 | 86 | 62 | 141 | 53 | 42 | 29 | 98 | 46 | 4.2 | 14.2 |
| Gemini 4 Hydrogen Low | $0.29 | 146 | 146 | 206 | 94 | 80 | 46 | 194 | 114 | 1.5 | 6.4 |
| *Opus 5.5 High (compare)* | $3.46 | 25 | 31 | 10 | 27 | 37 | 26 | 21 | 35 | 9.4 | 19.2 |
| *Sol Max (compare)* | $1.01 | 13 | 6 | 41 | 14 | 17 | 33 | 50 | 10 | 8.9 | 78.6 |

- **Where it leads:** Presentation and knowledge. xHigh and High rank 17 and 23 on Presentation (Opus 5.5 High 31),
  15 and 21 on Finance (37), 16 and 22 on Omniscience (26) and 25 and 34 on FrontierCode (35). xHigh also beats Opus
  on Strategy & Ops (24 against 27) for $3.16 a task against Opus's $3.46.
- **Where it trails:** judged agentic work. Analytical Elo ranks 70 and 94 (scores 1611 and 1475
  against Opus 5.5 High's 1960), Rubric 34 and 53 against 21. Terminal Bench ranks are 30 and 25 against 25.
- **GPT-6.2 beats it for less:** Sol Max ($1.01) leads Hydrogen xHigh on Terminal Bench (13 against 30),
  Presentation (6 against 17), Analytical Elo, Strategy & Ops and FrontierCode. Astra xHigh ($2.52) leads on
  all eight ranks, including Omniscience (12 against 16) and Presentation
  (16 against 17).
- **Medium and Low fall away fast:** Terminal Bench 86 and 146, Analytical Elo 141 and 206.
- Never a pick in a plan, an autorun row, a retry or a review: autorun runs only Claude and Codex, so it can't start
  Hydrogen. Otherwise the table is here to compare when a new model or a price change comes up.
- **Two trial slots (owner, 2026-11-16), Hydrogen High through the owner's Gemini plan, its top effort there.** Optional
  extras run by the owner in Gemini (CLI or app), never in place of a plan's row:
  1. *A fourth design direction* at new-app Step 5 or redesign Step 4a: the same brief and #1 screen, one static HTML
     file in the same folder shape, shot by the same script, shown on the same page next to Opus's three (Presentation
     23 against Opus 5.5 High's 31).
  2. *A second look check* of the screenshots, after the usual one: given only the pictures, it writes `LOOKED:` and
     `WRONG:` lines the `catching-bugs.md` §1 way. A different family catches different faults.
  Presentation Elo scores reports and decks, not app screens, so this is a trial. After the first project that tries
  a slot, write one line here: whether it won (a direction picked or mixed in, or a real fault the Claude check missed)
  and keep or drop the slot. Not for plans, code, reviews or red-teams: Opus, Sol and Fable beat it there (Rubric 53,
  FrontierCode 34, Strategy & Ops 39). For DEUS or client work, check the Gemini plan's data terms before sending a brief.

### When the cap may lift (owner, 2026-11-16)
The cap above still holds: no plan row, autorun task, retry, review or subagent picks these rows, except Astra Max,
which the owner made an ordinary GPT pick on 2026-11-18 (its row stays here for comparison). They're for when the
owner lifts the cap for one named job, or asks what a top row would buy. Suggest one only for a single, final,
high-stakes step, never the work leading up to it. Ranks from Model Atlas (AA captures listed above).

| Row | Cost / task | Where it leads | The one job it's worth it for |
|---|---|---|---|
| Opus 5.5 Max | $10.04 | Analytical Elo 1, Presentation 4, Briefcase 2, FrontierCode 7; top of AA's Coding Agent Index in Claude Code (62) | One analysis the owner will act on (an investment or strategy memo), or a coding problem Opus 5.5 High and Sol Max both failed |
| Sonnet 5.5 Max | $10.02 | Presentation 3, Briefcase 1, Rubric 2, Terminal Bench 4 | A polished client deck or report written only from facts already checked; Omniscience 51, so it never sources facts |
| Fable 5.2 High | $9.08 | FrontierCode 1, Strategy & Ops 4, Finance 5, Omniscience 3 | The hardest bug fix inside an existing codebase; the red-team call on a heavy plan (`fable-redteam.sh --heavy`) |
| Fable 5.2 Max | $26.54, 42 min | Strategy & Ops, Omniscience and Rubric 1, Finance 2 | One tool-less judgment call where a wrong or invented fact costs real money (a final go / no-go on a deal) |
| Astra Max (GPT-6.2) | $4.00 | Strategy & Ops 5, Finance 7, Presentation 9, Omniscience 10, Rubric 20 | One final GPT judgment call or plan where completeness and facts both count |

- **Not worth it:** Fable 5.2 xHigh ($14.83): High already leads on code and Max beats it on judgment. Opus 5.5 xHigh
  stays the `/model-pass` write step and heavy plans (both under the cap bullet above).
- **Fable costs more than its column:** it draws down the weekly and 5-hour limits faster than Opus, so a Fable row runs
  as one call with no tools, never a session.

## Implementation plans are written for `autorun all`
Any implementation plan (a new app, a redesign, a feature or a fix list in an existing project) is written
so `autorun all` can build it from the first task to the last with nobody watching. No parallel lanes or
worktrees: one folder, one task per fresh session.
- **Where and how:** `IMPLEMENTATION_PLAN.md`, `docs/IMPLEMENTATION_PLAN.md` or
  `redesign/ui-implementation-plan.md`. One task per table row (one cell exactly the pick, such as
  `Sonnet 5.5 High` or `Sol Max`, and an empty last cell for Done) or per checklist line
  (`- [ ] <task> · Sol Max: <why>`). Picks only from the Claude and GPT tables in this file, by "Claude or Codex:
  one pick per task"; a GPT pick (any GPT-6.2 row: `Astra Max`, `Astra xHigh`, `Sol Max`, `Sol High`, `Sol Medium` and so on; older plans'
  `GPT-6.1` and `Terra` rows still run as written) runs in Codex.
  Claude sessions under autorun start without skills, MCP servers or the business plugins (27k tokens at start instead
  of 40k); a task that needs a connector or a skill says `[mcp]` or `[skills]` in its line, or the plan has an
  `Autorun extras: mcp` line (deus-evaluation's Claude Docs reports).
- **Red-teamed before the owner approves it** (owner, 2026-11-15): after the plan is written (Opus 5.5 High, or
  Opus 5.5 xHigh for a heavy plan) and its plan review is done where the playbook has one (Astra Max), run
  `~/.claude/scripts/fable-redteam.sh <plan> <out> --impl` (add `--heavy` for a heavy plan, "Heavy and light plans"):
  one Fable 5.2 Medium call (High with `--heavy`), no tools, $1.50 cap ($4 with `--heavy`). It hunts what a task's Done when lets through (a size pinned with no
  "must still fit", a screen task judged by tests alone, a guard for one case of a wider kind). For a long plan, send
  only the new or changed tasks and their brief (12,000-word limit). Each point is taken (the plan changes) or declined
  with a reason the owner sees in the approval message. Not for a one-line fix list or a plan re-tick. (HoAFL DP4b's
  empty outcome caption, 2026-11-15.)
- **Each task stands alone and stays small:** it names its files, the sections to read (by heading, never a
  whole doc) and its Done when, and needs only tasks above it. Size it to finish in about 100 tool calls and
  under about 200k of context: one area of the app per task, and never art, code and a playthrough in one task
  (J2.10a did all three: 58M tokens, 413k context). A slow check (a browser matrix, a full suite, playthroughs) and
  the fixes and doc updates it leads to are separate rows: run it and list what fails, then fix by area, then update
  the docs (OC5 did all of it in one Sol Max task: 137 calls, 42 minutes, 2026-11-07). Anything bigger becomes
  `a`/`b` rows when the plan is written (autorun also cuts a task off at 4 hours, and splits one itself after ~100 calls;
  its split rows follow the check-rerun rule below: one that only reruns checks takes Sol High, owner 2026-11-24).
- **Smallest design first:** before the task rows, the plan quotes what the owner asked and states the simplest
  design that meets it ("Features stay the size asked" in `~/.claude/CLAUDE.md`). Each safeguard or module beyond
  that (signed tokens, expiry, receipts, retry rules, extra layers) names the risk the simple design leaves open,
  in one line, or is cut. (deus-team-tasks' chat connector, 2026-11-10: a preview token and saved receipts took a task
  of their own plus most of the save task's 62 cases; nothing in the request asked for them.)
- **Too small is waste too:** each fresh session costs about 5 minutes of startup and checks. Rows that would each
  take under about 10 minutes in the same file or area merge into one (the same plan's G01 and G02: 16 and 10
  minutes, same file). Keep apart only what the rules split: slow check from its fixes, screen work, saved-data code.
- **The owner can read it:** each brief section opens with one plain sentence on what it adds for the owner, and its
  Done when is short bullets, one checkable fact each, not a paragraph.
- **Screen tasks say what the picture shows:** a task that changes what shows on screen has a Done when a
  screenshot can answer ("both figures stand on the hillside, clear of the army, on laptop, turned phone and
  upright phone"), never "looks good". autorun runs the look check and a fresh-eyes session on it
  (`~/.claude/playbooks/catching-bugs.md`); `[look]` or `[no look]` in the line overrides its guess. A task that
  changes what shows on screen is never "judged by tests" alone, even when its pick is a logic model: it gets at
  least one look.
- **A pinned size names what it must still fit.** When a task fixes a size or place for consistency ("the same size
  for every outcome"), its Done when also says what that must still satisfy and shoots both ends: "the caption fits
  the longest and the shortest line in both languages, text centred, no empty band". (HoAFL DP4b, 2026-11-15.)
- **A number gate is measured before it gates.** A Done when with a threshold (memory, speed, size, error rate)
  names where the number comes from and is first measured on the current build in that same setup. If the build
  is already far off, the plan says whether the gap is a real bug or the setup (an emulator, a server engine
  standing in for a phone), and a setup that can't stand in for the real device gets a real-device check instead.
  Repairing the test tool and fixing the app are separate rows with separate finish lines, and a row that only
  reruns checks takes the test-run pick (Sol High) and no `[look]` unless it changes a screen. autorun parks a task's
  third split row (SPLIT_MAX). (HoAFL RH3.F4: a 50 MB-per-chapter memory rule on Linux WebKit, never met even
  before the fixes, split 8 times in a day with the driver repairs, 2026-11-24.)
- **Keep the live plan short:** once a phase's review is ticked, and only while no run is going (autorun
  tracks tasks by line number), move that phase's rows to `<plan>-done.md`, leaving one line ("Phase N: done,
  see …"). Every task reads the live plan.
- **Phases:** one heading per phase (autorun treats a new heading as the end of a phase), each ending with
  its end-to-end task and a review row of its own (`R<n>` or "Phase N review").
- **A review splits off its fixes.** It reviews, runs its checks and fixes only what is quick (a few lines each,
  under about 15 minutes in all). The rest become fix rows `N.F1`, `N.F2`… directly under the review row, one per
  area, each with its Done when (the failing check that must pass) and the pick of the row that built that code or
  a stronger one, except that a GPT fix row is Sol xHigh, or Sol Max in code that saves or loads data, scores, money,
  sign-in or permissions (owner, 2026-11-18); Astra xHigh only for a look decision with no approved design,
  never just for a `[look]` tag (deus-team-tasks R1b.F1 and F2, two plain fixes, ran on Astra in four long sessions,
  2026-11-11). autorun runs them next, each in a fresh session, before the next phase; one it can't finish stops
  `autorun all` like an unfinished review. Every session re-reads its whole context each turn, so a review that also
  fixed everything was the costliest kind of session (R3 $27.58 over 110 turns, R4 $20 over 210; 2026-11-11). The
  autorun prompt tells reviews this, so older plans that say "review and its fixes" work the same way.
- **The owner's part is settled up front:** every open question has a written default, so no task stops to
  ask. Work only the owner can do (production data or settings, accounts, secrets, merging to `main`,
  real-device checks) is a line with no pick, marked *owner*, with its safe parts (scripts, dry runs) as
  tasks of their own. Anything that has to happen before the run (logins, connection strings, console
  settings) is listed first, under a "Before the run" heading; `autorun all` refuses to start while a line
  there is unticked.
- **Owner steps gate the release, never a build task.** Unattended sessions can't read or write production
  (the permission classifier blocks it), so no task may wait on production data, console settings or a
  rules deploy. In a project whose pushes deploy to production, the plan names a working branch (`staging`,
  or one for the plan) so tasks build and test on the emulator or test database, and only the owner's merge
  or release line waits on those steps. A task whose text says "if O<n> isn't ticked, stop" is a planning
  bug: move the gate to the release line. (A run stopped after 63 minutes with four tasks waiting on two
  owner steps, 2026-10-26.)
- Before handing over a plan, run `autorun check` to make sure it finds the first task and its pick. The fresh-session
  critique of a plan checks the three rules above (smallest design, no tiny rows, readable) as well as gaps.

## `autorun codex`: Codex runs the plan
Plans whose task rows carry GPT picks don't need this: plain `autorun` runs those tasks in Codex. This runner is
for projects set up earlier with a separate "Codex model choices" table. Some projects can hand their plan to Codex: `autorun codex [start|status|stop|watch]` runs the project's own runner
(`scripts/` or `tools/codex_autorun.py`, through `.autorun-logs/codex-takeover/takeover.py`), one `codex exec` per task,
with the picks in the plan's "Codex model choices" table. Codex reads this file when planning; Codex's every-task rules are in its own header.
- **Claude sessions:** while `autorun codex status` says working, change no files and make no commits in that
  project: the runner stops a task when files change under it. `scripts/codex-guard.py` refuses Edit and Write then;
  shell edits and git aren't covered. A feature added outside the plan while a phase is open gets a short section in
  that phase, so its end-to-end and review rows cover it. (delami-demo 4.7 waited two hours on both, 2026-11-05.)
- **Codex, every task:** its rules are in `~/.claude/codex/AGENTS.header.md` (Codex loads them every session).
- **Project tooling:** a light check Codex runs does its work in-process, not in a child process.
- **Runner copies** differ per project. The newest is delami-demo-1's `tools/codex_autorun.py` (2026-11-05: table or
  checklist rows, branch and remote from env, the result limits above, a phone ping through `autorun notify-setup`'s
  ntfy topic when it stops or finishes). Update a project's copy from it in that project's own session.
