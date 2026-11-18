// Rebuilds the Artificial Analysis evaluation leaderboards from the captures in data/aa-captures/.
// Replaces the Sep 29 workbook rows for these evaluations, keeps the AA-Briefcase component
// evaluations and the rest of the dataset, and rewrites data/intelligence-index-costs.json.
import { createHash } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
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
  // Some score charts supply fractions even though their display uses percentages.
  scoreMultiplier?: number;
  // The chart reports the benchmark's total cost; the leaderboard stores the cost per task.
  costDivisor?: number;
  // Exact AA setup names mapped to master model names for agent-run evaluations.
  expectedRows?: ReadonlyMap<string, string>;
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

const critptV2Subsets = [
  { id: "critpt-v2-full", name: "CritPt v2 (Full Set)", chart: "CritPt v2: Score", url: "https://artificialanalysis.ai/evaluations/critpt-v2" },
  { id: "critpt-v2-hard", name: "CritPt v2 (Hard Subset)", chart: "CritPt v2 (Hard Subset): Score", url: "https://artificialanalysis.ai/evaluations/critpt-v2?critpt-subset=hard" },
];

const evaluationConfigs: EvaluationConfig[] = [
  // AA-Briefcase lists 91 tasks; its cost series (totalCost) is the total for the run, so divide to get cost per task.
  { id: "briefcase-v1-1", capture: "aa-briefcase", chart: "AA-Briefcase Elo", costChart: "AA-Briefcase Elo vs. Cost per Task", eloSeries: true, costDivisor: 91 },
  { id: "automationbench-aa", capture: "automationbench-aa", chart: "AutomationBench-AA: Score", costChart: "AutomationBench-AA: Score vs. Cost per Task" },
  { id: "terminal-bench-4-0", capture: "terminalbench-4-0", chart: "Terminal-Bench 4.0: Score", costChart: "Terminal-Bench 4.0: Score vs. Cost per Task" },
  { id: "frontiercode-2-0", capture: "frontiercode-2-0", chart: "FrontierCode-AA 2.0: Score", costChart: "FrontierCode-AA 2.0: Score vs. Cost per Task", definition: percentageEvaluation("frontiercode-2-0", "FrontierCode 2.0", "https://artificialanalysis.ai/evaluations/frontiercode-2-0") },
  { id: "gdp-pdf", capture: "gdp-pdf", chart: "GDP.pdf: All-pass Rate", costChart: "GDP.pdf: All-pass Rate vs. Cost per Task" },
  { id: "critpt", capture: "critpt", chart: "CritPt: Score", costChart: "CritPt: Score vs. Cost per Task" },
  ...critptV2Subsets.map(({ id, name, chart, url }) => ({
    id, capture: id, chart, costChart: `${chart} vs. Cost per Task`,
    scoreMultiplier: 100,
    definition: percentageEvaluation(id, name, url),
  })),
  { id: "aa-omniscience-accuracy", capture: "omniscience", chart: "AA-Omniscience Accuracy", costChart: "AA-Omniscience Net Score vs. Cost per Task" },
  { id: "aa-omniscience-index", capture: "omniscience", chart: "AA-Omniscience v1.1: Net Score", costChart: "AA-Omniscience Net Score vs. Cost per Task" },
  { id: "mmmu-pro", capture: "mmmu-pro", chart: "MMMU-Pro: Score", costChart: "MMMU-Pro: Score vs. Cost per Task" },
  { id: "finance-accounting", capture: "finance-and-accounting", chart: "Artificial Analysis Finance & Accounting Index", costChart: "Artificial Analysis Finance & Accounting Index vs. Cost per Task" },
  { id: "economics-index", capture: "economics", chart: "Artificial Analysis Economics Index", costChart: "Artificial Analysis Economics Index vs. Cost per Task" },
  { id: "strategy-ops-index", capture: "strategy-and-ops", chart: "Artificial Analysis Strategy & Ops Index", costChart: "Artificial Analysis Strategy & Ops Index vs. Cost per Task" },
  { id: "intelligence-index", capture: "artificial-analysis-intelligence-index", chart: "Artificial Analysis Intelligence Index: Score" },
  {
    id: "swe-atlas-qna-aa",
    capture: "swe-atlas-qna-aa",
    chart: "SWE-Atlas-QnA-AA: Score",
    scoreMultiplier: 100,
    definition: {
      ...percentageEvaluation("swe-atlas-qna-aa", "SWE-Atlas-QnA", "https://artificialanalysis.ai/agents/coding-agents"),
      metric_label: "Pass rate (%)",
      notes: "Scored inside the coding agent AA ran each model in (Claude Code, Codex, …). Ranks compare the model configurations included on this leaderboard.",
    },
    // The setup-to-model inventory is in docs/SWE_ATLAS_QNA_CAPTURE.md. Process this after the model evaluations.
    expectedRows: new Map([
      ["Claude Code - Claude Fable 5.2 (Xhigh, Default Fallback)", "Claude Fable 5.2 (Adaptive Reasoning, Xhigh Effort, Default Fallback)"],
      ["Claude Code - Claude Fable 5.2 (High, Default Fallback)", "Claude Fable 5.2 (Adaptive Reasoning, High Effort, Default Fallback)"],
      ["Claude Code - Claude Opus 5.5 (Max, Default Fallback)", "Claude Opus 5.5 (Adaptive Reasoning, Max Effort, Default Fallback)"],
      ["Claude Code - Claude Sonnet 5.5 (Max, Default Fallback)", "Claude Sonnet 5.5 (Adaptive Reasoning, Max Effort, Default Fallback)"],
      ["Claude Code - Claude Fable 5.2 (Max, Default Fallback)", "Claude Fable 5.2 (Adaptive Reasoning, Max Effort, Default Fallback)"],
      ["Antigravity CLI - Gemini 4 Carbon (High)", "Gemini 4 Carbon (High)"],
      ["Muse Code - Muse Wonder Full (Max)", "Muse Wonder Full (Max)"],
      ["Codex - GPT-6.2 Astra (Max)", "GPT-6.2 Astra (Max)"],
      ["Codex - GPT-6.2 Astra (Xhigh)", "GPT-6.2 Astra (Xhigh)"],
      ["Codex - GPT-6 Astra (Max)", "GPT-6 Astra (Max)"],
      ["Claude Code - Claude Fable 5.2 (Medium, Default Fallback)", "Claude Fable 5.2 (Adaptive Reasoning, Medium Effort, Default Fallback)"],
      ["Claude Code - Claude Fable 5.1 (Max, Default Fallback)", "Claude Fable 5.1 (Adaptive Reasoning, Max Effort, Default Fallback)"],
      ["Antigravity CLI - Gemini 4 Hydrogen (Xhigh)", "Gemini 4 Hydrogen (Xhigh)"],
      ["Codex - GPT-6.2 Astra (High)", "GPT-6.2 Astra (High)"],
      ["Codex - GPT-6.1 Sol (Max)", "GPT-6.1 Sol (Max)"],
      ["Codex - GPT-6.2 Sol (Xhigh)", "GPT-6.2 Sol (Xhigh)"],
      ["Codex - GPT-6.2 Astra (Medium)", "GPT-6.2 Astra (Medium)"],
      ["Codex - GPT-6.1 Terra (Max)", "GPT-6.1 Terra (Max)"],
      ["Kimi Code CLI - Kimi K3.1 Pro", "Kimi K3.1 Pro"],
      ["Codex - GPT-6.2 Sol (Max)", "GPT-6.2 Sol (Max)"],
      ["Claude Code - Claude Fable 5.2 (Low, Default Fallback)", "Claude Fable 5.2 (Adaptive Reasoning, Low Effort, Default Fallback)"],
      ["Codex - GPT-6.2 Sol (High)", "GPT-6.2 Sol (High)"],
      ["Antigravity CLI - Gemini 4 Argon (High)", "Gemini 4 Argon (High)"],
      ["Codex - GPT-6.2 Sol (Medium)", "GPT-6.2 Sol (Medium)"],
      ["Muse Code - Muse Wonder (Max)", "Muse Wonder (Max)"],
      ["Grok Build - Grok 4.7 (Xhigh)", "Grok 4.7 (Xhigh)"],
      ["Mistral Vibe - Mistral Large 4 (High)", "Mistral Large 4 (High)"],
      ["Opencode - GLM-5.3 (Max)", "GLM-5.3 (Max)"],
      ["Muse Code - Muse Ember (Max)", "Muse Ember (Max)"],
      ["Codex - GPT-6.2 Sol (Low)", "GPT-6.2 Sol (Low)"],
      ["DeepSeek Harness - DeepSeek V4.1 Flash 1017 (Max)", "DeepSeek V4.1 Flash 1017 (Max)"],
      ["Muse Code - Muse Spark 1.3 (Max)", "Muse Spark 1.3 (Max)"],
      ["Claude Code - Step 5 Preview", "Step 5 Preview"],
      ["Codex - GPT-6.2 Astra (Low)", "GPT-6.2 Astra (Low)"],
      ["Claude Code - Qwen3.8 Max", "Qwen3.8 Max"],
      ["Mistral Vibe - Mistral Large 4 (Medium)", "Mistral Large 4 (Medium)"],
      ["Claude Code - Claude Haiku 5.5 (Max)", "Claude Haiku 5.5 (Adaptive Reasoning, Max Effort, Default Fallback)"],
      ["Codex - GPT-6 Luna (Max)", "GPT-6 Luna (Max)"],
      ["Mirror - Beam 1.0", "Beam 1.0"],
    ]),
  },
];

// Evaluations Artificial Analysis no longer publishes. The rebuild drops their rows; production hides them once
// their Firestore evaluation doc loses its published_snapshot_id. HLE-Diamond replaced Humanity's Last Exam.
// The owner retired GDPval-AA, SciCode, HLE-Diamond and AA-LCR on 2026-11-16 so they no longer factor in.
const retiredEvaluationIds = new Set(["humanity-s-last-exam", "gdpval-aa-v2-1", "scicode", "hle-diamond", "aa-lcr-v1-1"]);

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

function mappedScoreItems(
  evaluationId: string,
  items: CaptureItem[],
  expectedRows: ReadonlyMap<string, string>,
  masterEntries: Entry[],
) {
  const setupNames = new Set(items.map(item => item.name));
  const missing = [...expectedRows.keys()].filter(name => !setupNames.has(name));
  if (missing.length) throw new Error(`${evaluationId}: missing expected AA setups: ${missing.join(", ")}`);

  const masterByIdentity = new Map(masterEntries.map(entry => [masterIdentityKey(entry.provider, entry.model), entry]));
  const seenIds = new Set<string>();
  const seenSetups = new Set<string>();
  const setupByModel = new Map<string, string>();
  return items.flatMap(item => {
    const { name, id, modelName, creatorName, effort } = item;
    if (typeof name !== "string" || !name.trim() || typeof id !== "string" || !id.trim()) {
      throw new Error(`${evaluationId}: missing AA setup name or ID`);
    }
    const setupKey = name.trim().toLowerCase().replace(/\s+/g, " ");
    const idKey = id.trim().toLowerCase();
    if (seenSetups.has(setupKey) || seenIds.has(idKey)) throw new Error(`${evaluationId}: duplicate AA setup "${name}"`);
    seenSetups.add(setupKey);
    seenIds.add(idKey);

    const modelKey = typeof modelName === "string" && modelName.trim()
      ? masterIdentityKey("", canonicalModelName(modelName.trim()))
      : null;
    if (modelKey) {
      // Some setups report effort separately, such as Kimi K3.1 Pro at its default Max.
      const effortLabel = typeof effort === "string" ? effort.trim().toLowerCase() : "";
      const modelAndEffort = effortLabel
        && !modelKey.endsWith(` (${effortLabel})`) && !modelKey.endsWith(` (${effortLabel} with fallback)`)
        ? `${modelKey} (${effortLabel})` : modelKey;
      const otherSetup = setupByModel.get(modelAndEffort);
      if (otherSetup) throw new Error(`${evaluationId}: duplicate model and effort in "${otherSetup}" and "${name}"`);
      setupByModel.set(modelAndEffort, name);
    }

    const model = expectedRows.get(name);
    if (!model) {
      console.warn(`${evaluationId}: skipping unmapped AA setup "${name}"`);
      return [];
    }
    if (modelKey !== masterIdentityKey("", model)) throw new Error(`${evaluationId}: unexpected model name for "${name}"`);
    const master = typeof creatorName === "string" ? masterByIdentity.get(masterIdentityKey(creatorName, model)) : undefined;
    if (!master) throw new Error(`${evaluationId}: no master row for "${model}" from AA setup "${name}"`);
    return [{ item, master }];
  });
}

const dataset = JSON.parse(await readFile("data/leaderboards.json", "utf8")) as Dataset;
const captureDate = new Date().toISOString().slice(0, 10);
const captures = new Map<string, Capture>();
for (const config of evaluationConfigs) {
  if (captures.has(config.capture)) continue;
  const raw = await readFile(`data/aa-captures/${config.capture}.json`, "utf8");
  captures.set(config.capture, JSON.parse(raw) as Capture);
}

const replacedEvaluationIds = new Set([...evaluationConfigs.map(config => config.id), ...retiredEvaluationIds]);
const mappedEvaluationIds = new Set(evaluationConfigs.filter(config => config.expectedRows).map(config => config.id));
const providers = new Map(dataset.providers.map(provider => [String(provider.id), provider]));
const models = new Map(dataset.models.map(model => [String(model.id), model]));
const keptEntries = dataset.entries.filter(entry => !replacedEvaluationIds.has(entry.evaluation_id));
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
const sourceAssets = new Map((dataset.sourceAssets ?? []).map(asset => [asset.id, asset]));
const intelligenceIndexCosts: Record<string, unknown>[] = [];
const evaluationById = new Map(dataset.evaluations.map(evaluation => [evaluation.id, evaluation]));

// AA model ids are shared across pages, so names, creators, and release dates are looked up across every capture.
// Agent setup IDs are not AA model IDs.
const modelCaptureKeys = new Set(evaluationConfigs.filter(config => !config.expectedRows).map(config => config.capture));
const modelCaptures = [...modelCaptureKeys].map(key => captures.get(key)!);
const nameById = new Map<string, string>();
const providerById = new Map<string, string>();
const releaseById = new Map<string, string>();
const estimatedById = new Map<string, boolean>();
const creatorByLogo = new Map<string, string>();
for (const capture of modelCaptures) {
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
for (const capture of modelCaptures) {
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
  if (!chart.items.length) throw new Error(`${config.id}: chart "${config.chart}" has no scores`);
  if (config.definition?.source_url && capture.source_url !== config.definition.source_url) {
    throw new Error(`${config.id}: unexpected capture URL ${capture.source_url}`);
  }
  const costChart = config.costChart ? capture.charts.find(item => item.title === config.costChart) : undefined;
  if (config.costChart && !costChart) throw new Error(`${config.id}: cost chart "${config.costChart}" is missing from ${config.capture}`);
  const costById = new Map<string, number>();
  for (const row of costChart?.items ?? []) {
    const cost = costOf(row, config.costDivisor);
    if (cost !== null) costById.set(row.id, cost);
  }
  const scoreItems = config.expectedRows
    ? mappedScoreItems(config.id, chart.items, config.expectedRows, [...keptEntries, ...newEntries])
    : chart.items.map(item => ({ item, master: null }));
  const rows = scoreItems.map(({ item, master }) => {
    const mid = config.eloSeries ? item.mid : null;
    const rawValue = mid ? mid.value : item.value;
    const value = rawValue * (config.scoreMultiplier ?? 1);
    const rawName = master?.model ?? nameById.get(item.id) ?? item.tooltipLabel ?? item.label;
    const slug = typeof item.url === "string" ? item.url.split("/").pop() : undefined;
    const provider = master?.provider ?? providerById.get(item.id)
      ?? (item.logo ? creatorByLogo.get(item.logo) : undefined)
      ?? (slug ? creatorOverrides[slug] : undefined);
    if (typeof rawName !== "string" || !rawName.trim()) throw new Error(`${config.id}: missing model name for ${item.id}`);
    if (!provider) throw new Error(`${config.id}: no creator for ${rawName} (${item.id})`);
    if (!Number.isFinite(rawValue) || (config.definition?.score_kind === "percentage" && (value < 0 || value > 100))) {
      throw new Error(`${config.id}: invalid value for ${rawName}`);
    }
    const ci = mid && item.lower && item.upper
      ? { low: Number(item.lower.value) - value, high: Number(item.upper.value) - value }
      : null;
    const cost = costById.get(item.id) ?? null;
    const estimated = config.id === "intelligence-index" ? estimatedById.get(item.id) ?? null : null;
    return {
      id: item.id as string,
      provider,
      name: canonicalModelName(rawName),
      providerId: master?.provider_id,
      modelId: master?.model_id,
      value,
      cost,
      ci,
      release: master ? master.release_date_label : releaseById.has(item.id) ? monthLabel(releaseById.get(item.id)!) : null,
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
    const providerId = row.providerId ?? id(row.provider);
    const modelId = row.modelId ?? id(`${row.provider}\0${row.name}`);
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
    source_url: evaluation.source_url ?? capture.source_url,
    captured_at: capture.captured_at,
    source_asset_id: sourceAssetId,
    published_snapshot_id: snapshotId,
    row_count: rows.length,
    cost_label_count: withCost,
    precise_cost_count: withCost,
    has_confidence_interval: withCi > 0,
    has_release_date: withRelease > 0,
    notes: config.expectedRows ? config.definition?.notes ?? evaluation.notes
      : `${evaluation.notes.replace(/\s*Values refreshed from (?:the )?Artificial Analysis[^]*$/, "")} Values refreshed from the Artificial Analysis evaluation page captured ${capture.captured_at} (${rows.length} models).${config.id === "intelligence-index" ? " Intelligence Index v5.0.1 re-scoring replaces v5.0 scores, ranks, and task costs." : ""}`.trim(),
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
  if (!sourceAssets.has(sourceAssetId)) {
    sourceAssets.set(sourceAssetId, {
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

// Old rows and snapshots for the rebuilt evaluations are replaced; everything else is kept.
const keptSnapshots = dataset.snapshots.filter(snapshot => !replacedEvaluationIds.has(String(snapshot.evaluation_id)));
const replacedById = new Map(newEvaluations.map(evaluation => [evaluation.id, evaluation]));
const evaluations = [
  ...dataset.evaluations.filter(evaluation => !retiredEvaluationIds.has(evaluation.id)).map(evaluation => replacedById.get(evaluation.id) ?? evaluation),
  ...newEvaluations.filter(evaluation => !evaluationById.has(evaluation.id)),
];
const rebuilt: Dataset = {
  ...dataset,
  sourceAssets: [...sourceAssets.values()],
  evaluations,
  entries: [...keptEntries, ...newEntries],
  snapshots: [...keptSnapshots, ...newSnapshots],
  providers: [...providers.values()],
  models: [...models.values()],
};
const reportRows = new Map(evaluations.map(evaluation => [evaluation.display_name, evaluation.row_count]));
const retiredNames = new Set(dataset.evaluations.filter(evaluation => retiredEvaluationIds.has(evaluation.id)).map(evaluation => evaluation.display_name));
rebuilt.report = {
  ...dataset.report,
  row_count: rebuilt.entries.length,
  provider_count: providers.size,
  evaluations: Array.isArray(dataset.report.evaluations)
    ? dataset.report.evaluations
      .filter((row: Record<string, unknown>) => !retiredNames.has(String(row.name)))
      .map((row: Record<string, unknown>) => reportRows.has(String(row.name)) ? { ...row, rows: reportRows.get(String(row.name)) } : row)
    : dataset.report.evaluations,
};

// The AA-Briefcase rubric and Elo evaluations come from their own captures; reapply them so every
// evaluation in the bundled file reads the same model names.
const componentSource = JSON.parse(await readFile("data/aa-briefcase-components.json", "utf8")) as BriefcaseComponentsSource;
const rubricSource = JSON.parse(await readFile("data/aa-briefcase-rubric-refresh.json", "utf8")) as BriefcaseRubricRefreshSource;
const complete = mergeBriefcaseRubricRefresh(mergeBriefcaseComponents(rebuilt, componentSource), rubricSource);

// A Briefcase component refresh can remove a row that was present while resolving the mapping.
const masterIdentities = new Set(complete.entries.filter(entry => !mappedEvaluationIds.has(entry.evaluation_id))
  .map(entry => masterIdentityKey(entry.provider, entry.model)));
for (const entry of complete.entries.filter(entry => mappedEvaluationIds.has(entry.evaluation_id))) {
  if (!masterIdentities.has(masterIdentityKey(entry.provider, entry.model))) {
    throw new Error(`${entry.evaluation_id}: no master row for "${entry.model}" after rebuilding the evaluations`);
  }
}

const outputs = [
  { path: "data/intelligence-index-costs.json", text: `${JSON.stringify(costSnapshot, null, 2)}\n` },
  { path: "data/leaderboards.json", text: JSON.stringify(complete) },
];
const changedOutputs = [];
for (const output of outputs) {
  const existing = await readFile(output.path, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (existing !== output.text) changedOutputs.push({ ...output, staging: `${output.path}.${process.pid}.tmp` });
}
try {
  for (const { staging, text } of changedOutputs) await writeFile(staging, text);
  for (const { staging, path } of changedOutputs) await rename(staging, path);
} finally {
  await Promise.all(changedOutputs.map(({ staging }) => rm(staging, { force: true })));
}
console.log(`Rebuilt ${newEvaluations.length} capture evaluations with ${newEntries.length} rows; ${complete.evaluations.length} evaluations in the catalog; ${intelligenceIndexCosts.length} intelligence index task costs.`);
