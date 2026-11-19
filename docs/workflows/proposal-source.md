# Source: Multi-Model Sales Proposal Collab, section 1 (owner's hand picks)

Copied on 2026-11-19 from the owner's Claude Doc "Multi-Model Sales Proposal Collab"
(https://claude.ai/artifact/MGAXKCZV8L4yHQC84LGt79), section 1 "Proposal workflow". The owner picked these models by hand
from AA's top-5 trait lists. Task 1.2 of `docs/IMPLEMENTATION_PLAN.md` turns it into `workflows/sales-proposal.json` and
compares the app's picks with the hand picks below. Scores are AA-PersonalityBench percentiles unless named.

Hedging and nuance-flagging aim high in the internal steps and moderate in client-facing copy.

## Steps and targets

| Step | Goal | Aim high | Aim moderate | Aim low | Evals to check |
|---|---|---|---|---|---|
| 0. Pick the model (once, not per proposal) | Choose models fit for proposal work | Truthful, Natural Sounding, Organization (index) | — | Slop, Sycophantic | AA-Briefcase (Word and PDF breakdown), AA-Omniscience hallucination rate (Business domain), GDP.pdf for long RFPs, GDPval-AA v2 as tiebreaker |
| 1. Gather inputs and extract requirements | Turn RFP, meeting notes and client emails into a requirement checklist, the client's pains in their own words, and open questions | Truthful, Flags Nuances, Disclaims Assumptions, Admits Uncertainty | — | — | GDP.pdf, AA-Briefcase |
| 2. Outline and pick the angle | Map each requirement to a section and choose one value-prop angle | Creative, Structured | — | Open-Ended | — |
| 3a. Situation and pain points | Mirror the client's pain in their own words and numbers | Sincere, Emotionally Intelligent, Evidence-Based | Metaphorical | Humorous | AA-Briefcase |
| 3b. Solution and scope | A clear, firm, closed scope | Structured, Pragmatic, Confident, Direct | — | Open-Ended | AA-Briefcase |
| 3c. Proof | Claims you'll be held to | Evidence-Based, Truthful | — | — | AA-Briefcase |
| 3d. Pricing and assumptions | Every price with the conditions it depends on | Disclaims Assumptions | Flags Nuances | — | AA-Briefcase |
| 3e. Next steps | Concrete actions with dates and owners | Actionable Guidance, Direct | — | — | AA-Briefcase |
| 3f. Executive summary (written last, placed first) | What a skimming buyer reads | Answer First, Bottom-Line Summary, Confident, Scannable | — | Slop | AA-Briefcase |
| 4. Substance passes | Proofing, practicality, then fact-check every claim; flag what can't be verified, don't silently fix it | Evidence-Based, Pragmatic, Truthful, Admits Uncertainty | — | Slop | AA-Omniscience hallucination rate |
| 5. Compliance check | Tick off every item on the step 1 checklist | Flags Nuances, Structured | — | — | AA-Briefcase, GDP.pdf |
| 6. Critique (fresh chat, skeptical buyer) | Rank the top problems, then fix them | Constructive Pushback, Direct, Flags Nuances | — | Sycophantic, Warmth (index) | — |
| 7. Linguistic final edit | Polish without rewriting; list what changed | Natural Sounding, Eloquent, Scannable, Answer First | Lexically Varied, Metaphorical, Admits Uncertainty | Creative, Open-Ended | AA-Briefcase presentation quality |
| 8. Slop sweep and human read | Remove filler; final check on numbers, names and tone | — | — | Slop | — |

## Hand picks (rank 1, then runners-up)

| Step | Pick | Runners-up | Owner's reason, in short |
|---|---|---|---|
| 1 | Sonnet 5.5 Max | Opus 5.5 Max, Fable 5.2 Max | Only model in the top 5 on all four lists; leads AA-Briefcase (1815). Some scores were from the non-Max or 5.1 variant |
| 2 | Opus 5.5 Max | Gemini 3.8 Flash High, Fable 5.1 Max | Only model in the top 5 for both Creative (98) and Structured (94) |
| 3a | Fable 5.1 | Muse Spark 1.3, GLM-5.3 Max | First or tied first on Sincere, Emotionally Intelligent and Evidence-Based |
| 3b | Gemini 3.8 Flash High | GPT-6.2 Sol, Opus 5.5 Max | Leads Structured and Confident, least open-ended |
| 3c | Opus 5.5 | Fable 5.1, Sonnet 5.5 | Truthful 100, Evidence-Based 98 |
| 3d | GPT-6.1 Sol Max | GPT-6 Astra Max, Sonnet 5.5 Max | Disclaims Assumptions 100 |
| 3e | Muse Spark 1.3 | Gemini 3.8 Flash High, GPT-6.2 Astra | Actionable Guidance 98; no model in the top 5 of both lists |
| 3f | GPT-6.2 Sol | GPT-6.2 Astra, Gemini 3.8 Flash | Answer First 100 (Medium), Slop 11 |
| 4 | Sonnet 5.5 | Muse Spark 1.3, Haiku 5.5 | Admits Uncertainty 100, Truthful 98 |
| 5 | Opus 5.5 Max | Sonnet 5.5 Max, Fable 5.2 Max | Top 5 on both Flags Nuances and Structured; a different model from step 1 for fresh eyes |
| 6 | Fable 5.1 | DeepSeek V4.1 Flash 1017 Max, GLM-5.3 Flash | Constructive Pushback 100, Flags Nuances 98, Sycophantic 5 |
| 7 | GPT-6.2 Sol | GPT-6.2 Astra, Gemini 3.8 Flash | On six of ten lists; meets all three restraint targets |
| 0, 8 | — | — | No pick in the doc |

The owner's doc often says "Not in top 5" or takes a score from another variant (non-Max, Fable 5.1 for 5.2): AA's
lists show only the top 5. Model Atlas holds every model's percentile, so the app's picks can differ for that reason.
