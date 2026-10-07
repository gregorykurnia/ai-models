import {Card, PageHeader} from "@/components/ui/primitives";

export default function DataPage() {
  return <article className="prose">
    <PageHeader>
    <div className="eyebrow">Source and methodology</div>
    <h1>About the data</h1>
    <p>This app presents captured Artificial Analysis leaderboard snapshots, rather than a live feed. The initial workbook was captured on 29 Sep 2026; the AA-Briefcase component results were captured on 30 Sep 2026.</p>
    </PageHeader>
    <p><a href="/suitability#methodology">Read the Task Suitability scoring methodology</a>.</p>

    <Card>
      <h2>What each value means</h2>
      <ul>
        <li><strong>Rank:</strong> the source rank. Lower ranks are better. For the three AA-Briefcase component indexes, ranks are ordered by the source score, with tied scores sharing a rank.</li>
        <li><strong>Score:</strong> the source metric value. Elo, percentage, integer index scores, and the signed AA-Omniscience Index are distinct metrics. The master leaderboard shows source ranks.</li>
        <li><strong>Cost per Intelligence Index task:</strong> the source-reported weighted-average USD cost to complete one Artificial Analysis Intelligence Index task, weighted across its evaluations. Every leaderboard and task-comparison cost column uses this model-profile metric; it is not the cost of the individual evaluation or a custom user task. Saved comparisons pin their cost value, profile link, and capture date. A dash means no cost record could be attached. See the <a href="https://artificialanalysis.ai/methodology/" target="_blank" rel="noreferrer">Artificial Analysis methodology</a>.</li>
        <li><strong>Workbook cost fields:</strong> the source workbook also contains costs for individual evaluation tasks. Those original values remain separate from the Intelligence Index task cost in leaderboard and comparison columns; a saved comparison may show them as separate source values in its evaluation breakdown. Workbook cost label and precise USD counts are calculated from accepted rank rows.</li>
        <li><strong>Model variants:</strong> reasoning effort and fallback variants stay separate. Known differences in sheet formatting are matched to the same variant.</li>
      </ul>
    </Card>

    <h2>AA-Briefcase component indexes</h2>
    <p>The 30 Sep 2026 evaluation capture contains 208 models for each of three metrics: Rubric Score (%), Analytical Quality Elo, and Presentation Elo. Rubric scores for all 211 currently listed model configurations were refreshed from Artificial Analysis on 7 Oct 2026. The two Elo indexes retain the 30 Sep capture and include profile results for <a href="https://artificialanalysis.ai/models/gemini-4-argon" target="_blank" rel="noreferrer">Gemini 4 Argon (High)</a>, <a href="https://artificialanalysis.ai/models/ling-3-1-flash" target="_blank" rel="noreferrer">Ling 3.1 Flash</a>, and <a href="https://artificialanalysis.ai/models/mistral-large-4" target="_blank" rel="noreferrer">Mistral Large 4 Preview</a>, captured 7 Oct 2026. Rubric Score is the share of binary checks passed, converted from a fraction to a percentage. Analytical Quality and Presentation are separate Elo ratings from pairwise comparisons.</p>
    <p>Artificial Analysis places Analytical Quality and Presentation in one results tab and distinguishes them with separate graph indicators. This catalog keeps them as separate complete leaderboards and uses a circle for Analytical Quality and a diamond for Presentation, with their labels shown. The source supplied component Elo confidence bounds for 30 model profiles; rows without a supplied interval remain blank. These component tables do not include cost data.</p>

    <h2>Master leaderboard: ranks by evaluation</h2>
    <p>Each evaluation column displays that evaluation’s rank and links to the model’s results. The Cost per Intelligence Index task column links to the model’s Artificial Analysis profile. Workbook rankings and estimates retain their source ranks; the three AA-Briefcase component ranks follow their metric scores. There is no normalized score, combined mean, or overall master rank.</p>
    <p>Rows match provider, model, and reasoning/fallback variant across known label formats. For example, “Adaptive Reasoning, Max Effort, Default Fallback” matches “max with fallback”; Max Effort remains separate from Xhigh, High, Medium, and Low Effort. “Not ranked” means the source has no entry for the matched model and variant in that evaluation. Duplicate entries select the best source rank, then source row and entry ID, and generate validation issues. Sorting an index uses source ranks, best first by default, with missing entries last in either direction. Sorting and filtering never change source ranks.</p>

    <h2>Workbook corrections</h2>
    <p>The workbook summary reports 31 SciCode rows, while its leaderboard contains 207. Counts on this site come from parsed rank rows. The 15 standard workbook evaluations contain 4,948 entries, 3,239 evaluation-specific cost labels, and 2,858 precise USD values. Separately, the Artificial Analysis profile capture supplies the Cost per Intelligence Index task column, including on the Intelligence Index leaderboard.</p>
    <p>Intelligence Index has a different structure and lacks provider and source metadata. Its dedicated adapter imports the ranked rows, restores the first rank from “Int” to 1, and preserves scoring status, including estimates. Providers come from exact, unambiguous matches in other sheets; remaining providers are Unknown. The workbook rows contain no cost values; the separate model-profile snapshot supplies published Intelligence Index task costs where available.</p>

    <h2>Snapshot history and updates</h2>
    <p>The initial workbook capture is 29 Sep 2026. The base AA-Briefcase component capture is dated 30 Sep 2026; rubric scores for the 211 listed configurations and three supplemental component model profiles were captured 7 Oct 2026. The latest Cost per Intelligence Index task metrics were also captured 7 Oct 2026. The cost snapshot contains 173 published costs across 686 model records; each shown value links to its source profile. Later imports create immutable snapshots; failed imports preserve the last published data.</p>
  </article>;
}
