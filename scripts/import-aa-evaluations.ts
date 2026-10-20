// Rebuilds the Artificial Analysis evaluation leaderboards from the captures in data/aa-captures/.
// Replaces the Sep 29 workbook rows for these evaluations, keeps the AA-Briefcase component
// evaluations and the rest of the dataset, and rewrites data/intelligence-index-costs.json.
import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { entrySchema, type Dataset, type Entry, type Evaluation } from "../src/lib/contract";
import { masterIdentityKey } from "../src/lib/master";
import { mergeBriefcaseComponents, type BriefcaseComponentsSource } from "../src/lib/aa-briefcase";
import { mergeBriefcaseRubricRefresh, type BriefcaseRubricRefreshSource } from "../src/lib/aa-briefcase-rubric-refresh";

type CaptureItem = Record<string, any>;
type Capture = {
  key: string;
  source_url: string;
  captured_at: string;
  charts: { title: string; items: CaptureItem[] }[];
  tables: { headers: string[]; rows: string[][] }[];
};

type EvaluationConfig = {
  id: string;
  capture: string;
  // Exact title of the score chart on the capture page.
  chart: string;
  // Chart holding the per-task cost; optional. The "Cost per Task" bar charts no longer expose their values,
  // so this reads the "vs. Cost per Task" scatter chart, which plots the same cost.
  costChart?: string;
  // Value and confidence interval come from "mid/lower/upper" series when true, otherwise "value".
  eloSeries?: boolean;
  // The chart reports the benchmark's total cost; the leaderboard stores the cost per task.
  costDivisor?: number;
  // Metadata for an evaluation the dataset doesn't hold yet. Existing evaluations keep their stored record.
  definition?: NewEvaluation;
};

// The fields the import fills in on every rebuild; a new evaluation starts with them empty.
type NewEvaluation = Omit<Evaluation, "captured_at" | "source_asset_id" | "published_snapshot_id" | "row_count" | "cost_label_count" | "precise_cost_count" | "has_confidence_interval" | "has_release_date">;

const percentageEvaluation = (id: string, displayName: string, sourceUrl: string): NewEvaluation => ({
  id,
  slug: id,
  display_name: displayName,
  source_title: `${displayName} Benchmark Leaderboard`,
  source_url: sourceUrl,
  category: "benchmark",
  metric_key: "score",
  metric_label: "Score (%)",
  score_kind: "percentage",
  score_unit: "%",
  score_min: 0,
  score_max: 100,
  notes: "",
});

const evaluationConfigs: EvaluationConfig[] = [
  // AA-Briefcase lists 91 tasks; its cost series (totalCost) is the total for the run, so divide to get cost per task.
  { id: "briefcase-v1-1", capture: "aa-briefcase", chart: "AA-Briefcase Elo", costChart: "AA-Briefcase Elo vs. Cost per Task", eloSeries: true, costDivisor: 91 },
  { id: "gdpval-aa-v2-1", capture: "gdpval-aa", chart: "GDPval-AA v2.1 Leaderboard", costChart: "GDPval-AA v2.1: Elo vs. Cost per Task", eloSeries: true },
  { id: "automationbench-aa", capture: "automationbench-aa", chart: "AutomationBench-AA: Score", costChart: "AutomationBench-AA: Score vs. Cost per Task" },
  { id: "terminal-bench-4-0", capture: "terminalbench-4-0", chart: "Terminal-Bench 4.0: Score", costChart: "Terminal-Bench 4.0: Score vs. Cost per Task" },
  { id: "scicode", capture: "scicode", chart: "SciCode: Score", costChart: "SciCode: Score vs. Cost per Task" },
  { id: "humanity-s-last-exam", capture: "humanitys-last-exam", chart: "Humanity's Last Exam: Score", costChart: "Humanity's Last Exam: Score vs. Cost per Task" },
  { id: "gdp-pdf", capture: "gdp-pdf", chart: "GDP.pdf: All-pass Rate", costChart: "GDP.pdf: All-pass Rate vs. Cost per Task" },
  { id: "critpt", capture: "critpt", chart: "CritPt: Score", costChart: "CritPt: Score vs. Cost per Task" },
  { id: "aa-omniscience-accuracy", capture: "omniscience", chart: "AA-Omniscience Accuracy", costChart: "AA-Omniscience Index vs. Cost per Task" },
  { id: "aa-omniscience-index", capture: "omniscience", chart: "AA-Omniscience Index: Score", costChart: "AA-Omniscience Index vs. Cost per Task" },
  { id: "aa-lcr-v1-1", capture: "artificial-analysis-long-context-reasoning", chart: "AA-LCR v1.1: Score", costChart: "AA-LCR v1.1: Score vs. Cost per Task" },
  { id: "mmmu-pro", capture: "mmmu-pro", chart: "MMMU-Pro: Score", costChart: "MMMU-Pro: Score vs. Cost per Task" },
  { id: "finance-accounting", capture: "finance-and-accounting", chart: "Artificial Analysis Finance & Accounting Index", costChart: "Artificial Analysis Finance & Accounting Index vs. Cost per Task" },
  { id: "economics-index", capture: "economics", chart: "Artificial Analysis Economics Index", costChart: "Artificial Analysis Economics Index vs. Cost per Task" },
  { id: "strategy-ops-index", capture: "strategy-and-ops", chart: "Artificial Analysis Strategy & Ops Index", costChart: "Artificial Analysis Strategy & Ops Index vs. Cost per Task" },
  { id: "intelligence-index", capture: "artificial-analysis-intelligence-index", chart: "Artificial Analysis Intelligence Index: Score" },
];

// Models whose creator isn't listed in any chart on their evaluation page. The creator is taken from
// the model's own AA page (captured 11 Oct 2026).
const creatorOverrides: Record<string, string> = {
  "nex-n2-pro": "Nex AGI",
};

// The page gives an estimated flag. The leaderboard also distinguishes estimates still awaiting independent
// scoring, so keep the earlier wording when a model is still estimated.
function scoringStatus(estimated: boolean | null, previous: string | null) {
  if (estimated === null) return previous;
  if (!estimated) return "Independently scored";
  return previous?.startsWith("Estimate") ? previous : "Estimated";
}

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const id = (value: string) => hash(value).slice(0, 24);

const monthLabel = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" })
  .format(new Date(`${value}T00:00:00Z`));
// Matches the cost display convention used by the profile overlays.
function costDisplay(value: number) {
  if (value >= 1) return `$${value.toFixed(2)}`;
  const cents = value * 100;
  return `${Number(cents.toPrecision(cents < 1 ? 2 : 3))}¢`;
}
function signed(value: number, places: number) {
  const rounded = Number(value.toFixed(places));
  const amount = Number.isInteger(rounded)
    ? String(Math.abs(rounded))
    : String(Math.abs(rounded)).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return `${rounded < 0 ? "-" : "+"}${amount}`;
}

// Claude fallback labels: the AA model name is "Claude X (Max, Default Fallback)"; the rest of the
// leaderboard stores the same variant as "Adaptive Reasoning, Max Effort, Default Fallback" so the
// master identity matches across evaluations.
export function canonicalModelName(name: string) {
  const fallback = name.match(/^(.*) \((Max|Xhigh|High|Medium|Low), Default Fallback\)$/);
  if (fallback) return `${fallback[1]} (Adaptive Reasoning, ${fallback[2]} Effort, Default Fallback)`;
  // Claude Haiku 5.5 is listed without its suffix on some pages; its configurations are the same default-fallback ones.
  const haiku = name.match(/^(Claude Haiku 5\.5) \((Max|Xhigh|High|Medium|Low)\)$/);
  if (haiku) return `${haiku[1]} (Adaptive Reasoning, ${haiku[2]} Effort, Default Fallback)`;
  const opusFallback = name.match(/^(Claude Fable 5) \((Max|Xhigh|High|Medium|Low), Opus 4\.8 Fallback\)$/);
  if (opusFallback) return `${opusFallback[1]} (Adaptive Reasoning, ${opusFallback[2]} Effort, Opus 4.8 Fallback)`;
  return name;
}

function costOf(item: CaptureItem, divisor = 1): number | null {
  const raw = typeof item.intelligenceIndexCostPerTask === "number" ? item.intelligenceIndexCostPerTask
    : typeof item.costPerTask === "number" ? item.costPerTask
    : typeof item.costPerTask?.total === "number" ? item.costPerTask.total
    : typeof item.cost?.total === "number" ? item.cost.total
    : typeof item.totalCost === "number" ? item.totalCost
    : null;
  return raw === null ? null : raw / divisor;
}

const dataset = JSON.parse(await readFile("data/leaderboards.json", "utf8")) as Dataset;
const captureDate = new Date().toISOString().slice(0, 10);
const captures = new Map<string, Capture>();
for (const config of evaluationConfigs) {
  if (captures.has(config.capture)) continue;
  const raw = await readFile(`data/aa-captures/${config.capture}.json`, "utf8");
  captures.set(config.capture, JSON.parse(raw) as Capture);
}

const replacedEvaluationIds = new Set(evaluationConfigs.map(config => config.id));
const providers = new Map(dataset.providers.map(provider => [String(provider.id), provider]));
const models = new Map(dataset.models.map(model => [String(model.id), model]));
const previousEntries = dataset.entries.filter(entry => replacedEvaluationIds.has(entry.evaluation_id));
const previousStatus = new Map(previousEntries.map(entry => [`${entry.evaluation_id}\0${masterIdentityKey(entry.provider, entry.model)}`, entry]));
const previousRelease = new Map<string, string | null>();
for (const entry of previousEntries) {
  const key = masterIdentityKey(entry.provider, entry.model);
  if (entry.release_date_label && !previousRelease.has(key)) previousRelease.set(key, entry.release_date_label);
}

const newEntries: Entry[] = [];
const newEvaluations: Evaluation[] = [];
const newSnapshots: Record<string, unknown>[] = [];
const newSourceAssets: Record<string, unknown>[] = [];
const intelligenceIndexCosts: Record<string, unknown>[] = [];
const evaluationById = new Map(dataset.evaluations.map(evaluation => [evaluation.id, evaluation]));

// AA model ids are shared across pages, so names, creators, and release dates are looked up across every capture.
const nameById = new Map<string, string>();
const providerById = new Map<string, string>();
const releaseById = new Map<string, string>();
const estimatedById = new Map<string, boolean>();
const creatorByLogo = new Map<string, string>();
for (const capture of captures.values()) {
  for (const chart of capture.charts) {
    for (const row of chart.items) {
      if (typeof row.name === "string" && !nameById.has(row.id)) nameById.set(row.id, row.name);
      const creator = typeof row.creatorName === "string" ? row.creatorName : typeof row.creator?.name === "string" ? row.creator.name : undefined;
      if (creator && !providerById.has(row.id)) providerById.set(row.id, creator);
      if (typeof row.releaseDate === "string" && !releaseById.has(row.id)) releaseById.set(row.id, row.releaseDate);
      if (typeof row.intelligenceIndexIsEstimated === "boolean" && !estimatedById.has(row.id)) estimatedById.set(row.id, row.intelligenceIndexIsEstimated);
    }
  }
}
for (const capture of captures.values()) {
  for (const chart of capture.charts) {
    for (const row of chart.items) {
      if (typeof row.creatorLogo === "string" && providerById.has(row.id)) creatorByLogo.set(row.creatorLogo, providerById.get(row.id)!);
    }
  }
}

for (const config of evaluationConfigs) {
  const capture = captures.get(config.capture)!;
  const chart = capture.charts.find(item => item.title === config.chart);
  if (!chart) throw new Error(`${config.id}: chart "${config.chart}" is missing from ${config.capture}`);
  const costChart = config.costChart ? capture.charts.find(item => item.title === config.costChart) : undefined;
  const costById = new Map<string, number>();
  for (const row of costChart?.items ?? []) {
    const cost = costOf(row, config.costDivisor);
    if (cost !== null) costById.set(row.id, cost);
  }
  const rows = chart.items.map(item => {
    const mid = config.eloSeries ? item.mid : null;
    const value = mid ? Number(mid.value) : Number(item.value);
    const rawName = nameById.get(item.id) ?? item.tooltipLabel ?? item.label;
    const slug = typeof item.url === "string" ? item.url.split("/").pop() : undefined;
    const provider = providerById.get(item.id)
      ?? (item.logo ? creatorByLogo.get(item.logo) : undefined)
      ?? (slug ? creatorOverrides[slug] : undefined);
    if (!provider) throw new Error(`${config.id}: no creator for ${rawName} (${item.id})`);
    if (!Number.isFinite(value)) throw new Error(`${config.id}: invalid value for ${rawName}`);
    const ci = mid && item.lower && item.upper
      ? { low: Number(item.lower.value) - value, high: Number(item.upper.value) - value }
      : null;
    const cost = costById.get(item.id) ?? null;
    const estimated = config.id === "intelligence-index" ? estimatedById.get(item.id) ?? null : null;
    return {
      id: item.id as string,
      provider,
      name: canonicalModelName(rawName),
      value,
      cost,
      ci,
      release: releaseById.has(item.id) ? monthLabel(releaseById.get(item.id)!) : null,
      estimated,
    };
  });

  // Competition ranking: equal values share a rank, as the AA leaderboard shows them.
  rows.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  const identities = new Set<string>();
  const sourceAssetId = hash(JSON.stringify(capture));
  const snapshotId = `${config.id}-${sourceAssetId.slice(0, 16)}`;
  const stored = evaluationById.get(config.id) ?? (config.definition && {
    ...config.definition,
    captured_at: "",
    source_asset_id: "",
    published_snapshot_id: "",
    row_count: 0,
    cost_label_count: 0,
    precise_cost_count: 0,
    has_confidence_interval: false,
    has_release_date: false,
  });
  if (!stored) throw new Error(`${config.id}: no stored evaluation and no definition`);
  const evaluation: Evaluation = stored;
  let previousValue: number | null = null;
  let previousRank = 0;
  rows.forEach((row, index) => {
    const identity = masterIdentityKey(row.provider, row.name);
    if (identities.has(identity)) throw new Error(`${config.id}: duplicate model ${row.provider} / ${row.name}`);
    identities.add(identity);
    const rank = row.value === previousValue ? previousRank : index + 1;
    previousValue = row.value;
    previousRank = rank;
    const providerId = id(row.provider);
    const modelId = id(`${row.provider}\0${row.name}`);
    if (!providers.has(providerId)) providers.set(providerId, { id: providerId, slug: row.provider.toLowerCase().replace(/[^a-z0-9]+/g, "-"), display_name: row.provider, aliases: [] });
    if (!models.has(modelId)) models.set(modelId, { id: modelId, provider_id: providerId, canonical_name: row.name, display_name: row.name, release_date_label: row.release, aliases: [], created_at: captureDate });
    const cost = row.cost;
    const entry = entrySchema.parse({
      id: id(`${snapshotId}:${row.id}:${config.id}`),
      evaluation_id: config.id,
      snapshot_id: snapshotId,
      model_id: modelId,
      provider_id: providerId,
      provider: row.provider,
      model: row.name,
      source_rank: rank,
      score_value: row.value,
      score_display: String(Number(row.value.toPrecision(6))),
      scoring_status: scoringStatus(row.estimated, previousStatus.get(`${config.id}\0${identity}`)?.scoring_status ?? null),
      confidence_interval_display: row.ci ? `${signed(row.ci.low, 0)} / ${signed(row.ci.high, 0)}` : null,
      confidence_interval_low_delta: row.ci ? row.ci.low : null,
      confidence_interval_high_delta: row.ci ? row.ci.high : null,
      release_date_label: row.release ?? previousRelease.get(identity) ?? null,
      cost_usd: cost,
      cost_display: cost === null ? null : costDisplay(cost),
      cost_status: cost === null ? "missing" : "exact",
      source_sheet: `Artificial Analysis: ${config.chart}`,
      source_row: index + 1,
      source_asset_id: sourceAssetId,
    });
    newEntries.push(entry);
  });

  const withCost = rows.filter(row => row.cost !== null).length;
  const withCi = rows.filter(row => row.ci).length;
  const withRelease = rows.filter(row => row.release).length;
  const evaluationRecord: Evaluation = {
    ...evaluation,
    source_url: evaluation.source_url,
    captured_at: capture.captured_at,
    source_asset_id: sourceAssetId,
    published_snapshot_id: snapshotId,
    row_count: rows.length,
    cost_label_count: withCost,
    precise_cost_count: withCost,
    has_confidence_interval: withCi > 0,
    has_release_date: withRelease > 0,
    notes: `${evaluation.notes.replace(/\s*Values refreshed from (?:the )?Artificial Analysis[^]*$/, "")} Values refreshed from the Artificial Analysis evaluation page captured ${capture.captured_at}.`.trim(),
  };
  newEvaluations.push(evaluationRecord);
  newSnapshots.push({
    id: snapshotId,
    evaluation_id: config.id,
    source_asset_id: sourceAssetId,
    captured_at: capture.captured_at,
    status: "validated",
    row_count: rows.length,
    cost_label_count: withCost,
    precise_cost_count: withCost,
  });
  if (!newSourceAssets.some(asset => asset.id === sourceAssetId)) {
    newSourceAssets.push({
      id: sourceAssetId,
      filename: `aa-captures/${config.capture}.json`,
      content_hash: sourceAssetId,
      captured_at: capture.captured_at,
      imported_at: captureDate,
      source_kind: "artificial_analysis_evaluation_page",
      source_urls: [capture.source_url],
      notes: `Chart and table data captured from ${capture.source_url} on ${capture.captured_at}.`,
    });
  }
  console.log(`${config.id}: ${rows.length} rows, ${withCost} with cost, ${withCi} with CI, ${withRelease} with release date`);
}

// Intelligence Index task costs feed the master's "Cost per Intelligence Index task" column.
const intelligenceCapture = captures.get("artificial-analysis-intelligence-index")!;
const costRecords = new Map<string, Record<string, unknown>>();
for (const chart of intelligenceCapture.charts) {
  for (const row of chart.items) {
    if (typeof row.intelligenceIndexCostPerTask !== "number" || !row.creatorName) continue;
    const name = canonicalModelName(row.name);
    if (costRecords.has(row.id)) continue;
    costRecords.set(row.id, {
      slug: row.slug,
      name,
      provider: row.creatorName,
      cost_usd: row.intelligenceIndexCostPerTask,
      url: `https://artificialanalysis.ai/models/${row.slug}`,
      profile_captured_at: intelligenceCapture.captured_at,
    });
  }
}
intelligenceIndexCosts.push(...costRecords.values());
const costSnapshot = {
  source_url: intelligenceCapture.source_url,
  captured_at: `${intelligenceCapture.captured_at}T00:00:00.000Z`,
  metric: "Cost per Intelligence Index task",
  metric_path: "intelligenceIndexCostPerTask",
  model_count: intelligenceCapture.charts.reduce((max, chart) => Math.max(max, chart.items.length), 0),
  cost_count: intelligenceIndexCosts.length,
  records: intelligenceIndexCosts,
};
await writeFile("data/intelligence-index-costs.json", `${JSON.stringify(costSnapshot, null, 2)}\n`);

// Old rows and snapshots for the rebuilt evaluations are replaced; everything else is kept.
const keptEntries = dataset.entries.filter(entry => !replacedEvaluationIds.has(entry.evaluation_id));
const keptSnapshots = dataset.snapshots.filter(snapshot => !replacedEvaluationIds.has(String(snapshot.evaluation_id)));
const replacedById = new Map(newEvaluations.map(evaluation => [evaluation.id, evaluation]));
const evaluations = [
  ...dataset.evaluations.map(evaluation => replacedById.get(evaluation.id) ?? evaluation),
  ...newEvaluations.filter(evaluation => !evaluationById.has(evaluation.id)),
];
const rebuilt: Dataset = {
  ...dataset,
  sourceAssets: [...(dataset.sourceAssets ?? []), ...newSourceAssets],
  evaluations,
  entries: [...keptEntries, ...newEntries],
  snapshots: [...keptSnapshots, ...newSnapshots],
  providers: [...providers.values()],
  models: [...models.values()],
};
const reportRows = new Map(evaluations.map(evaluation => [evaluation.display_name, evaluation.row_count]));
rebuilt.report = {
  ...dataset.report,
  row_count: rebuilt.entries.length,
  provider_count: providers.size,
  evaluations: Array.isArray(dataset.report.evaluations)
    ? dataset.report.evaluations.map((row: Record<string, unknown>) => reportRows.has(String(row.name)) ? { ...row, rows: reportRows.get(String(row.name)) } : row)
    : dataset.report.evaluations,
};

// The AA-Briefcase rubric and Elo evaluations come from their own captures; reapply them so every
// evaluation in the bundled file reads the same model names.
const componentSource = JSON.parse(await readFile("data/aa-briefcase-components.json", "utf8")) as BriefcaseComponentsSource;
const rubricSource = JSON.parse(await readFile("data/aa-briefcase-rubric-refresh.json", "utf8")) as BriefcaseRubricRefreshSource;
const complete = mergeBriefcaseRubricRefresh(mergeBriefcaseComponents(rebuilt, componentSource), rubricSource);

await writeFile("data/leaderboards.json.tmp", JSON.stringify(complete));
await rename("data/leaderboards.json.tmp", "data/leaderboards.json");
console.log(`Rebuilt ${replacedEvaluationIds.size} evaluations with ${newEntries.length} rows; ${intelligenceIndexCosts.length} intelligence index task costs.`);
