import {Card, PageHeader} from "@/components/ui/primitives";

export default function DataPage() {
  return <article className="prose">
    <PageHeader>
    <div className="eyebrow">Source and methodology</div>
    <h1>About the data</h1>
    <p>This app presents captured Artificial Analysis leaderboard snapshots, rather than a live feed. The evaluation leaderboards and AA-Briefcase component indexes were captured from Artificial Analysis on 11 Oct 2026.</p>
    </PageHeader>
    <p><a href="/suitability#methodology">Read the Task Suitability scoring methodology</a>.</p>

    <Card>
      <h2>What each value means</h2>
      <ul>
        <li><strong>Rank:</strong> the source rank. Lower ranks are better. For the three AA-Briefcase component indexes, ranks are ordered by the source score, with tied scores sharing a rank.</li>
        <li><strong>Score:</strong> the source metric value. Elo, percentage, integer index scores, and the signed AA-Omniscience Index are distinct metrics. The master leaderboard shows source ranks and an Aggregate Score that averages ranks across nine dimensions.</li>
        <li><strong>Cost per Intelligence Index task:</strong> the source-reported weighted-average USD cost to complete one Artificial Analysis Intelligence Index task, weighted across its evaluations. Every leaderboard and task-comparison cost column uses this model-profile metric; it is not the cost of the individual evaluation or a custom user task. Saved comparisons pin their cost value, profile link, and capture date. A dash means no cost record could be attached. See the <a href="https://artificialanalysis.ai/methodology/" target="_blank" rel="noreferrer">Artificial Analysis methodology</a>.</li>
        <li><strong>Evaluation task cost:</strong> each evaluation's cost per task, as shown on its Artificial Analysis page. These values stay separate from the Intelligence Index task cost in leaderboard and comparison columns; a saved comparison may show them as separate source values in its evaluation breakdown.</li>
        <li><strong>Model variants:</strong> reasoning effort and fallback variants stay separate. Known differences in sheet formatting are matched to the same variant.</li>
      </ul>
    </Card>

    <h2>AA-Briefcase component indexes</h2>
    <p>The 11 Oct 2026 evaluation capture contains all 224 listed models for each of three metrics: Rubric Score (%), Analytical Quality Elo, and Presentation Elo. Elo ratings move as pairwise comparisons accumulate, so the values were refreshed together with the rubric scores rather than kept from the 30 Sep capture. Rubric Score is the share of binary checks passed, converted from a fraction to a percentage. Analytical Quality and Presentation are separate Elo ratings from pairwise comparisons.</p>
    <p>Artificial Analysis places Analytical Quality and Presentation in one results tab and distinguishes them with separate graph indicators. This catalog keeps them as separate complete leaderboards and uses a circle for Analytical Quality and a diamond for Presentation, with their labels shown. The 11 Oct capture does not include component Elo confidence bounds, so those fields remain blank. These component tables do not include cost data.</p>

    <h2>Master leaderboard: ranks by evaluation</h2>
    <p>Each evaluation column displays that evaluation’s rank and links to the model’s results. The Cost per Intelligence Index task column links to the model’s Artificial Analysis profile. Ranks are the source ranks from each Artificial Analysis page, and estimates keep their label; the three AA-Briefcase component ranks follow their metric scores. Aggregate Score is the arithmetic mean of a model’s available source ranks across Analytical Quality Elo, Presentation Elo, Rubric Score, Omniscience Index, Economics Index, Finance &amp; Accounting, Intelligence Index, Strategy &amp; Ops Index, and Terminal-Bench 4.0. Missing dimensions are excluded, and the table shows how many of the nine dimensions contributed. Lower average ranks are better. This is not a normalized composite score or an overall master rank.</p>
    <p>Rows match provider, model, and reasoning/fallback variant across known label formats. For example, “Adaptive Reasoning, Max Effort, Default Fallback” matches “max with fallback”; Max Effort remains separate from Xhigh, High, Medium, and Low Effort. “Not ranked” means the source has no entry for the matched model and variant in that evaluation. Duplicate entries select the best source rank, then source row and entry ID, and generate validation issues. Sorting an evaluation uses its source rank; sorting Aggregate Score uses the mean rank. Both sort best first by default, with missing values last in either direction. Sorting and filtering never change source ranks.</p>

    <h2>How the evaluations are built</h2>
    <p>Each evaluation is rebuilt from the chart and table data on its Artificial Analysis page. Models use Artificial Analysis’s current names, with reasoning and fallback variants kept separate. A model appears in an evaluation only if the page scores it there, so a model that Artificial Analysis no longer scores is not shown.</p>
    <p>Intelligence Index scoring status follows Artificial Analysis’s estimated flag. Estimates still awaiting independent scoring keep that wording. The Cost per Intelligence Index task comes from the Intelligence Index page.</p>

    <h2>Snapshot history and updates</h2>
    <p>The evaluation leaderboards and AA-Briefcase component indexes were captured on 11 Oct 2026. Earlier snapshots, including the 29 Sep 2026 workbook and the 30 Sep and 7 Oct AA-Briefcase captures, remain in the published history. Later imports create immutable snapshots; failed imports preserve the last published data.</p>
  </article>;
}
