import type { Entry, Evaluation } from "./contract";
import { getEvaluationDataset, getEvaluations, getMasterDataset } from "./data";
import { evaluationMetricLabel, evaluationScoreDisplay } from "./evaluation-display";
import { averageMasterRank, masterEvaluationLabel, masterTableRows, orderMasterEvaluations, sortMaster } from "./master";
import { formatPercentile, getPersonalityDataset } from "./personality";
import { workflows } from "./workflow-registry";

// Plain-text views of the site for AI assistants (llms.txt convention). Claude and other
// chat tools fetch pages without running JavaScript, so these carry the data as Markdown.

export function siteUrl() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "ai-models-nine-livid.vercel.app";
  return host.startsWith("http") ? host.replace(/\/$/, "") : `https://${host}`;
}

const cell = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === "" ? "—" : String(value).replaceAll("|", "\\|").replace(/\s+/g, " ");
const row = (values: (string | number | null | undefined)[]) => `| ${values.map(cell).join(" | ")} |`;
const table = (header: string[], rows: (string | number | null | undefined)[][]) =>
  [row(header), `| ${header.map(() => "---").join(" | ")} |`, ...rows.map(row)].join("\n");

export async function llmsIndex() {
  const base = siteUrl();
  const evaluations = orderMasterEvaluations(await getEvaluations());
  return [
    "# Model Atlas",
    "",
    "> Compares AI models across published evaluations (mostly Artificial Analysis): one master leaderboard, a leaderboard per evaluation, a personality leaderboard (AA PersonalityBench) and task workflows that recommend models.",
    "",
    "The data is available as Markdown tables: start with the full-text file below, and use the evaluation links for complete rankings. Read it instead of the HTML pages, whose tables are interactive.",
    "",
    "## Data",
    "",
    `- [All leaderboard data](${base}/llms-full.txt): master ranking of every model, the top ${combinedTopRows} of each evaluation, personality scores and workflows in one file`,
    "",
    "## Pages",
    "",
    `- [Master leaderboard](${base}/): every model across all evaluations, with an aggregate rank`,
    `- [Personality](${base}/personality): AA PersonalityBench trait and index percentiles`,
    `- [Workflows](${base}/workflows): model picks for specific work tasks`,
    `- [About the data](${base}/about/data): sources and method`,
    "",
    "## Evaluation leaderboards",
    "",
    "Each link is the full ranking as Markdown; the HTML page is linked after it.",
    "",
    ...evaluations.map(e => `- [${masterEvaluationLabel(e)}](${base}${evaluationTextPath(e.slug)}): ${e.row_count} models, ${evaluationMetricLabel(e)}, captured ${e.captured_at.slice(0, 10)} (page: ${base}/leaderboards/${e.slug})`),
    "",
  ].join("\n");
}

// Top rows per evaluation in the combined file; the full ranking is on each evaluation's own text page.
const combinedTopRows = 10;
const evaluationTextPath = (slug: string) => `/llms/leaderboards/${slug}`;

function evaluationSection(base: string, evaluation: Evaluation, entries: Entry[], limit?: number) {
  const all = entries.filter(e => e.evaluation_id === evaluation.id && e.snapshot_id === evaluation.published_snapshot_id)
    .sort((a, b) => a.source_rank - b.source_rank || a.source_row - b.source_row);
  const rows = limit ? all.slice(0, limit) : all;
  const header = ["Rank", "Model", "Provider", evaluationMetricLabel(evaluation)];
  if (evaluation.has_confidence_interval) header.push("95% CI");
  if (evaluation.cost_label_count > 0) header.push("Cost");
  if (evaluation.has_release_date) header.push("Released");
  return [
    `### ${masterEvaluationLabel(evaluation)}`,
    "",
    `Page: ${base}/leaderboards/${evaluation.slug} · Full ranking as text: ${base}${evaluationTextPath(evaluation.slug)} · Source: ${evaluation.source_url ?? evaluation.source_title} · Captured: ${evaluation.captured_at.slice(0, 10)} · Category: ${evaluation.category}`,
    limit && all.length > rows.length ? `\nTop ${rows.length} of ${all.length} models. The full ranking is at the text link above.` : "",
    "",
    table(header, rows.map(entry => {
      const values: (string | number | null)[] = [entry.source_rank, entry.model, entry.provider, evaluationScoreDisplay(evaluation, entry)];
      if (evaluation.has_confidence_interval) values.push(entry.confidence_interval_display);
      if (evaluation.cost_label_count > 0) values.push(entry.cost_display);
      if (evaluation.has_release_date) values.push(entry.release_date_label);
      return values;
    })),
    "",
  ].join("\n");
}

export async function llmsFull() {
  const base = siteUrl();
  const { evaluations, entries, rows } = await getMasterDataset();
  const ordered = orderMasterEvaluations(evaluations);
  const masterRows = sortMaster(masterTableRows(rows), "aggregate-score", "asc");
  const personality = getPersonalityDataset();

  const masterTable = table(
    ["Model", "Provider", "Aggregate rank (avg, lower is better)", "Dimensions", "Cost per Intelligence Index task (USD)", "Time per task (min)", ...ordered.map(masterEvaluationLabel)],
    masterRows.map(r => {
      const aggregate = averageMasterRank(r);
      const minutes = r.speed?.time_per_task_s;
      return [
        r.model, r.provider, aggregate?.score, aggregate ? `${aggregate.count}/9` : null,
        r.intelligence_index_cost ? r.intelligence_index_cost.cost_usd.toFixed(2) : null,
        minutes === null || minutes === undefined ? null : (minutes / 60).toFixed(1),
        ...ordered.map(e => {
          const c = r.cells[e.id];
          return c ? `#${c.entry.source_rank}${c.entry.score_display ? ` (${c.entry.score_display})` : ""}` : null;
        }),
      ];
    }),
  );

  const personalitySections = personality.indexes.map(index => [
    `### ${index.label}`,
    "",
    index.description,
    "",
    "Values are percentiles (0–100) among the models tested." + (index.traits.some(t => t.lower_is_better) ? " For traits marked (lower is better), a low percentile is the good result." : ""),
    "",
    table(
      ["Model", "Provider", `${index.label} index`, ...index.traits.map(t => t.label + (t.lower_is_better ? " (lower is better)" : ""))],
      [...personality.models]
        .sort((a, b) => (b.index_percentiles[index.key] ?? -1) - (a.index_percentiles[index.key] ?? -1))
        .map(m => [m.name, m.provider, formatPercentile(m.index_percentiles[index.key] ?? null), ...index.traits.map(t => formatPercentile(m.traits[t.key]?.percentile ?? null))]),
    ),
    "",
  ].join("\n"));

  const workflowSections = workflows.map(w => [
    `### ${w.title}`,
    "",
    `Page: ${base}/workflows/${w.slug} · Updated: ${w.updated}`,
    "",
    w.summary,
    "",
    ...w.steps.map(s => `- **${s.title}**: ${s.goal}`),
    "",
  ].join("\n"));

  return [
    "# Model Atlas: all leaderboard data",
    "",
    `Source site: ${base}. Generated ${new Date().toISOString().slice(0, 10)} from the published data. Scores come from the linked evaluations, mostly Artificial Analysis.`,
    "",
    "## Contents",
    "",
    "1. Master leaderboard (all models, all evaluations)",
    `2. Evaluation leaderboards (top ${combinedTopRows} each, with links to full rankings)`,
    "3. Personality (AA PersonalityBench)",
    "4. Workflows",
    "",
    "## 1. Master leaderboard",
    "",
    "Sorted by aggregate rank: the average of a model's rank across up to 9 core evaluations (lower is better). Evaluation columns show the model's rank in that evaluation; a dash means it was not evaluated there.",
    "",
    masterTable,
    "",
    "## 2. Evaluation leaderboards",
    "",
    ...ordered.map(e => evaluationSection(base, e, entries, combinedTopRows)),
    "## 3. Personality (AA PersonalityBench)",
    "",
    `Source: ${personality.source_url} · Captured: ${personality.captured_at.slice(0, 10)} · Page: ${base}/personality`,
    "",
    ...personalitySections,
    "## 4. Workflows",
    "",
    ...workflowSections,
  ].join("\n");
}

export async function llmsEvaluation(slug: string) {
  const dataset = await getEvaluationDataset(slug);
  if (!dataset) return null;
  const base = siteUrl();
  return [`# ${masterEvaluationLabel(dataset.evaluation)} leaderboard`, "", `From Model Atlas (${base}). Index of all data: ${base}/llms.txt`, "", evaluationSection(base, dataset.evaluation, dataset.entries).replace(/^### .*\n\n/, "")].join("\n");
}
