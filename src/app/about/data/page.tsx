import {Card, PageHeader} from "@/components/ui/primitives";

export default function DataPage() {
  return <article className="prose">
    <PageHeader>
    <div className="eyebrow">Source and methodology</div>
    <h1>About the data</h1>
    <p>The 18 Nov 2026 Artificial Analysis capture supplies 19 evaluation leaderboards, including the three AA-Briefcase component indexes.</p>
    </PageHeader>
    <p><a href="/suitability#methodology">Read the Task Suitability scoring methodology</a>.</p>

    <Card>
      <h2>What each value means</h2>
      <ul>
        <li>Lower <strong>ranks</strong> are better. SWE-Atlas-QnA and the three AA-Briefcase component indexes rank the models included on each leaderboard by score, with tied scores sharing a rank.</li>
        <li><strong>Score:</strong> the source metric value. Elo, percentage, integer index scores, and the signed AA-Omniscience Index are distinct metrics. The master leaderboard shows source ranks and an Aggregate Score that averages ranks across nine dimensions.</li>
        <li><strong>Cost per Intelligence Index task:</strong> the source-reported weighted-average USD cost to complete one Artificial Analysis Intelligence Index task, weighted across its evaluations. Every leaderboard and task-comparison cost column uses this model-profile metric; it is not the cost of the individual evaluation or a custom user task. Saved comparisons pin their cost value, profile link, and capture date. A dash means no cost record could be attached. See the <a href="https://artificialanalysis.ai/methodology/" target="_blank" rel="noreferrer">Artificial Analysis methodology</a>.</li>
        <li><strong>Evaluation task cost:</strong> each evaluation's cost per task, as shown on its Artificial Analysis page. These values stay separate from the Intelligence Index task cost in leaderboard and comparison columns; a saved comparison may show them as separate source values in its evaluation breakdown.</li>
        <li><strong>Time per task / First Answer:</strong> Artificial Analysis timings in minutes per task and seconds to the first answer token on the creator’s API. Evaluation pages use their own evaluation time where AA reports it; otherwise the entire page uses “Time per Intelligence Index task”, without mixing sources per row. The master always uses Intelligence Index time. Dashes mean missing values and sort last; speed does not affect Aggregate Score.</li>
        <li><strong>Model variants:</strong> reasoning effort and fallback variants stay separate. Known differences in sheet formatting are matched to the same variant.</li>
      </ul>
    </Card>

    <h2>AA-Briefcase component indexes</h2>
    <p>The 18 Nov 2026 capture contains all 281 listed models for Rubric Score (%), Analytical Quality Elo, and Presentation Elo. Elo ratings move as pairwise comparisons accumulate, so the values were refreshed together with the rubric scores. Rubric Score is the percentage of binary checks passed. Analytical Quality and Presentation are separate Elo ratings from pairwise comparisons.</p>
    <p>Artificial Analysis places Analytical Quality and Presentation in one results tab and distinguishes them with separate graph indicators. This catalog keeps them as separate complete leaderboards and uses a circle for Analytical Quality and a diamond for Presentation, with their labels shown. The 18 Nov capture includes the 95% confidence bounds for both component Elo ratings. These component tables omit costs because their source tabs supply scores and confidence bounds.</p>

    <h2>Master leaderboard: ranks by evaluation</h2>
    <p>Each evaluation column displays that evaluation’s rank and links to the model’s results. The Cost per Intelligence Index task column links to the model’s Artificial Analysis profile. Ranks are the source ranks from each Artificial Analysis page, and estimates keep their label; the three AA-Briefcase component ranks follow their metric scores. Aggregate Score is the arithmetic mean of a model’s available source ranks across Analytical Quality Elo, Presentation Elo, Rubric Score, Omniscience Index, Economics Index, Finance &amp; Accounting, Intelligence Index, Strategy &amp; Ops Index, and Terminal-Bench 4.0. Missing dimensions are excluded, and the table shows how many of the nine dimensions contributed. Lower average ranks are better. This is not a normalized composite score or an overall master rank.</p>
    <p>Rows match provider, model, and reasoning/fallback variant across known label formats. For example, “Adaptive Reasoning, Max Effort, Default Fallback” matches “max with fallback”; Max Effort remains separate from Xhigh, High, Medium, and Low Effort. “Not ranked” means the source has no entry for the matched model and variant in that evaluation. Duplicate entries select the best source rank, then source row and entry ID, and generate validation issues. Sorting an evaluation uses its source rank; sorting Aggregate Score uses the mean rank. Both sort best first by default, with missing values last in either direction. Sorting and filtering never change source ranks.</p>

    <h2>How the evaluations are built</h2>
    <p>Evaluations are rebuilt from Artificial Analysis’s chart and table data. Models use Artificial Analysis’s current names, with reasoning and fallback variants kept separate. A model appears in an evaluation only if the source scores it there.</p>
    <p>SWE-Atlas-QnA measures the pass rate on technical questions about existing codebases. The 18 Nov 2026 capture maps 39 coding-agent setups to master model and effort names. SWE-Atlas QnA appears after FrontierCode 2.0 in the master table. Aggregate Score still uses its nine existing dimensions.</p>
    <p>Intelligence Index v5.0.1 contains all 143 listed models in the 18 Nov 2026 capture, with re-scored results replacing v5.0. Scoring status follows Artificial Analysis’s estimated flag. Estimates still awaiting independent scoring keep that wording. The Cost per Intelligence Index task comes from the same page, with 134 available cost records.</p>

    <h2>Personality: AA-PersonalityBench</h2>
    <p>The <a href="/personality">Personality</a> page shows how models write, not whether they are right. Artificial Analysis judges 900 prompts pairwise with a panel of LLM judges and turns them into an Elo per trait for 30 traits, grouped into 8 indexes (Expressiveness, Organization, Informativeness, Transparency, Warmth, Conviction, Imagination and Slop). Each index and trait is a percentile from 1 to 100 across every model tested; higher means more of it, and for Slop and Sycophantic lower is better. The 19 Nov 2026 capture covers 53 models. These values sit outside the evaluation ranks: they don’t change the Aggregate Score, the master leaderboard or task suitability.</p>

    <h2>Snapshot history and updates</h2>
    <p>The 18 Nov 2026 capture adds SWE-Atlas-QnA and separate leaderboards for the CritPt v2 Full Set and Hard Subset alongside legacy CritPt. Earlier snapshots, including the 29 Sep 2026 workbook, the 30 Sep and 7 Oct AA-Briefcase captures, the 11, 20, 25 and 29 Oct evaluation captures, and the 7 and 10 Nov captures, remain in the published history. Later imports create immutable snapshots. Failed imports preserve the last published data.</p>
  </article>;
}
