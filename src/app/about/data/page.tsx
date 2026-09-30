export default function DataPage() {
  return <article className="prose">
    <div className="eyebrow">Source and methodology</div>
    <h1>About the data</h1>
    <p>This app presents captured Artificial Analysis leaderboard snapshots, rather than a live feed. The initial workbook was captured on 29 Sep 2026; the AA-Briefcase component results were captured on 30 Sep 2026.</p>
    <p><a href="/suitability#methodology">Read the Task Suitability scoring methodology</a>.</p>

    <section className="panel">
      <h2>What each value means</h2>
      <ul>
        <li><strong>Rank:</strong> the source rank. Lower ranks are better. For the three AA-Briefcase component indexes, ranks are ordered by the source score, with tied scores sharing a rank.</li>
        <li><strong>Score:</strong> the source metric value. Elo, percentage, integer index scores, and the signed AA-Omniscience Index are distinct metrics. The master leaderboard shows source ranks.</li>
        <li><strong>Cost:</strong> the original source label. Labels such as &lt;0.1¢ remain bounds and have no precise USD sorting value. A dash means the source supplied no value.</li>
        <li><strong>Coverage:</strong> cost label count and precise USD count are independently calculated from accepted rank rows.</li>
        <li><strong>Model variants:</strong> reasoning effort and fallback variants stay separate. Known differences in sheet formatting are matched to the same variant.</li>
      </ul>
    </section>

    <h2>AA-Briefcase component indexes</h2>
    <p>The 30 Sep 2026 capture contains 208 models for each of three metrics: Rubric Score (%), Analytical Quality Elo, and Presentation Elo. Rubric Score is the share of binary checks passed, converted from a fraction to a percentage. Analytical Quality and Presentation are separate Elo ratings from pairwise comparisons.</p>
    <p>Artificial Analysis places Analytical Quality and Presentation in one results tab and distinguishes them with separate graph indicators. This catalog keeps them as separate complete leaderboards and uses a circle for Analytical Quality and a diamond for Presentation, with their labels shown. The source supplied component Elo confidence bounds for 30 model profiles; rows without a supplied interval remain blank. These component tables do not include cost data.</p>

    <h2>Master leaderboard: ranks by evaluation</h2>
    <p>Each evaluation column displays that evaluation’s rank and links to the model’s results. Workbook rankings and estimates retain their source ranks; the three AA-Briefcase component ranks follow their metric scores. There is no normalized score, combined mean, or overall master rank.</p>
    <p>Rows match provider, model, and reasoning/fallback variant across known label formats. For example, “Adaptive Reasoning, Max Effort, Default Fallback” matches “max with fallback”; Max Effort remains separate from Xhigh, High, Medium, and Low Effort. “Not ranked” means the source has no entry for the matched model and variant in that evaluation. Duplicate entries select the best source rank, then source row and entry ID, and generate validation issues. Sorting an index uses source ranks, best first by default, with missing entries last in either direction. Sorting and filtering never change source ranks.</p>

    <h2>Workbook corrections</h2>
    <p>The workbook summary reports 31 SciCode rows, while its leaderboard contains 207. Counts on this site come from parsed rank rows. The 15 standard workbook evaluations contain 4,948 entries, 3,239 cost labels, and 2,858 precise USD values.</p>
    <p>Intelligence Index has a different structure and lacks provider and source metadata. Its dedicated adapter imports the ranked rows, restores the first rank from “Int” to 1, and preserves scoring status, including estimates. Providers come from exact, unambiguous matches in other sheets; remaining providers are Unknown. No source URL or cost values are invented.</p>

    <h2>Snapshot history and updates</h2>
    <p>The initial workbook capture is 29 Sep 2026. AA-Briefcase component scores are a separate source capture dated 30 Sep 2026. Later imports create immutable snapshots; failed imports preserve the last published data.</p>
  </article>;
}
