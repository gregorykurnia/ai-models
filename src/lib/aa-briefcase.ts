import { createHash } from "node:crypto";
import type { Dataset, Entry, Evaluation } from "./contract";

type ConfidenceInterval = {
  elo: number;
  lower95ci: number;
  upper95ci: number;
} | null;

export type BriefcaseSourceModel = {
  id: string;
  provider: string;
  name: string;
  release_date: string | null;
  rubric_score: number;
  analytical_quality_elo: number;
  analytical_quality_ci: ConfidenceInterval;
  presentation_elo: number;
  presentation_ci: ConfidenceInterval;
};

export type BriefcaseComponentsSource = {
  source_url: string;
  source_title: string;
  captured_at: string;
  source_tabs: { rubric: string; quality_elos: string };
  models: BriefcaseSourceModel[];
};

type MetricDefinition = {
  id: string;
  metric_key: string;
  display_name: string;
  metric_label: string;
  score_kind: string;
  score_unit: string;
  source_tab: (source: BriefcaseComponentsSource) => string;
  source_url: (source: BriefcaseComponentsSource) => string;
  metric_indicator: "bar" | "circle" | "diamond";
  metric_color: string;
  value: (model: BriefcaseSourceModel) => number;
  confidence: (model: BriefcaseSourceModel) => ConfidenceInterval;
  format: (value: number) => string;
  notes: string;
};

const briefcaseSourceBase = "https://artificialanalysis.ai/evaluations/aa-briefcase";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const id = (value: string) => hash(value).slice(0, 24);
const percent = (value: number) => `${Number(value.toFixed(2))}%`;
const signed = (value: number) => {
  const rounded = Number(value.toFixed(2));
  const magnitude = Number.isInteger(rounded)
    ? String(Math.abs(rounded))
    : String(Math.abs(rounded)).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return `${rounded < 0 ? "-" : "+"}${magnitude}`;
};
const releaseMonth = (value: string | null) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
};

const metricDefinitions: MetricDefinition[] = [
  {
    id: "aa-briefcase-rubric-score",
    metric_key: "rubric-score",
    display_name: "AA-Briefcase Rubric Score (%)",
    metric_label: "Rubric Score (%)",
    score_kind: "percentage",
    score_unit: "%",
    source_tab: source => source.source_tabs.rubric,
    source_url: source => source.source_url,
    metric_indicator: "bar",
    metric_color: "#14866d",
    value: model => model.rubric_score * 100,
    confidence: () => null,
    format: percent,
    notes: "The share of binary rubric checks passed across AA-Briefcase tasks. The source fraction is displayed as a percentage.",
  },
  {
    id: "aa-briefcase-analytical-quality-elo",
    metric_key: "analytical-quality-elo",
    display_name: "AA-Briefcase Analytical Quality Elo",
    metric_label: "Analytical Quality Elo",
    score_kind: "elo",
    score_unit: "points",
    source_tab: source => source.source_tabs.quality_elos,
    source_url: source => `${source.source_url.split("?")[0]}?results=quality-elos`,
    metric_indicator: "circle",
    metric_color: "#315cdd",
    value: model => model.analytical_quality_elo,
    confidence: model => model.analytical_quality_ci,
    format: value => String(Math.round(value)),
    notes: "Elo from pairwise comparisons of analytical quality. This is a separate indicator within the source's shared Analytical Quality & Presentation Elo tab.",
  },
  {
    id: "aa-briefcase-presentation-elo",
    metric_key: "presentation-elo",
    display_name: "AA-Briefcase Presentation Elo",
    metric_label: "Presentation Elo",
    score_kind: "elo",
    score_unit: "points",
    source_tab: source => source.source_tabs.quality_elos,
    source_url: source => `${source.source_url.split("?")[0]}?results=quality-elos`,
    metric_indicator: "diamond",
    metric_color: "#d05d3b",
    value: model => model.presentation_elo,
    confidence: model => model.presentation_ci,
    format: value => String(Math.round(value)),
    notes: "Elo from pairwise comparisons of professional presentation. This is a separate indicator within the source's shared Analytical Quality & Presentation Elo tab.",
  },
];

function makeComponentEvaluation(
  source: BriefcaseComponentsSource,
  sourceAssetId: string,
  definition: MetricDefinition,
): { evaluation: Evaluation; entries: Entry[]; snapshot: Record<string, unknown> } {
  const snapshotId = `${definition.id}-${sourceAssetId.slice(0, 16)}`;
  const ranked = source.models
    .map((model, sourceIndex) => ({ model, sourceIndex, value: definition.value(model) }))
    .sort((a, b) => b.value - a.value || a.sourceIndex - b.sourceIndex);
  let previousValue: number | null = null;
  let previousRank = 0;
  const entries = ranked.map(({ model, sourceIndex, value }, index): Entry => {
    const sourceRank = value === previousValue ? previousRank : index + 1;
    previousValue = value;
    previousRank = sourceRank;
    const interval = definition.confidence(model);
    const lowDelta = interval ? interval.lower95ci - value : null;
    const highDelta = interval ? interval.upper95ci - value : null;
    const providerId = id(model.provider);
    const modelId = id(`${model.provider}\0${model.name}`);
    return {
      id: id(`${snapshotId}:${model.id}:${definition.id}`),
      evaluation_id: definition.id,
      snapshot_id: snapshotId,
      model_id: modelId,
      provider_id: providerId,
      provider: model.provider,
      model: model.name,
      source_rank: sourceRank,
      score_value: value,
      score_display: definition.format(value),
      confidence_interval_display: interval && lowDelta !== null && highDelta !== null
        ? `${signed(lowDelta)} / ${signed(highDelta)}`
        : null,
      confidence_interval_low_delta: lowDelta,
      confidence_interval_high_delta: highDelta,
      release_date_label: releaseMonth(model.release_date),
      cost_usd: null,
      cost_display: null,
      cost_status: "missing",
      source_sheet: definition.source_tab(source),
      source_row: sourceIndex + 1,
      source_asset_id: sourceAssetId,
    };
  });
  const evaluation: Evaluation = {
    id: definition.id,
    slug: definition.id,
    display_name: definition.display_name,
    source_title: source.source_title,
    source_url: definition.source_url(source),
    category: "benchmark",
    metric_key: definition.metric_key,
    metric_label: definition.metric_label,
    score_kind: definition.score_kind,
    score_unit: definition.score_unit,
    score_min: definition.score_kind === "percentage" ? 0 : null,
    score_max: definition.score_kind === "percentage" ? 100 : null,
    captured_at: source.captured_at,
    source_asset_id: sourceAssetId,
    notes: definition.notes,
    published_snapshot_id: snapshotId,
    row_count: entries.length,
    cost_label_count: 0,
    precise_cost_count: 0,
    has_confidence_interval: entries.some(entry => entry.confidence_interval_display !== null),
    has_release_date: entries.some(entry => entry.release_date_label !== null),
    metric_group: "aa-briefcase-components",
    metric_indicator: definition.metric_indicator,
    metric_color: definition.metric_color,
    source_tab: definition.source_tab(source),
  };
  const snapshot = {
    id: snapshotId,
    evaluation_id: definition.id,
    source_asset_id: sourceAssetId,
    captured_at: source.captured_at,
    status: "validated",
    row_count: entries.length,
    cost_label_count: 0,
    precise_cost_count: 0,
  };
  return { evaluation, entries, snapshot };
}

export function mergeBriefcaseComponents(
  dataset: Dataset,
  source: BriefcaseComponentsSource,
): Dataset {
  if (source.models.length !== 208) {
    throw new Error(`AA-Briefcase component capture must contain 208 models; found ${source.models.length}`);
  }
  for (const model of source.models) {
    if (!model.provider || !model.name || !Number.isFinite(model.rubric_score)
      || model.rubric_score < 0 || model.rubric_score > 1
      || !Number.isFinite(model.analytical_quality_elo) || !Number.isFinite(model.presentation_elo)) {
      throw new Error(`Invalid AA-Briefcase component result for ${model.name || model.id}`);
    }
    for (const interval of [model.analytical_quality_ci, model.presentation_ci]) {
      if (interval && (!Number.isFinite(interval.elo) || !Number.isFinite(interval.lower95ci)
        || !Number.isFinite(interval.upper95ci) || interval.lower95ci > interval.elo || interval.upper95ci < interval.elo)) {
        throw new Error(`Invalid AA-Briefcase Elo interval for ${model.name}`);
      }
    }
  }

  const sourceAssetId = hash(JSON.stringify(source));
  const sourceAsset = {
    id: sourceAssetId,
    filename: "aa-briefcase-components.json",
    content_hash: sourceAssetId,
    captured_at: source.captured_at,
    imported_at: new Date().toISOString(),
    source_kind: "artificial_analysis_evaluation_snapshot",
    source_urls: [source.source_url, `${briefcaseSourceBase}?results=quality-elos`],
    notes: "Public AA-Briefcase results capture. Includes rubric pass rate, analytical quality Elo, and presentation Elo for all 208 listed models.",
  };
  const components = metricDefinitions.map(definition => makeComponentEvaluation(source, sourceAssetId, definition));
  const componentIds = new Set(metricDefinitions.map(definition => definition.id));
  const evaluations = [
    ...dataset.evaluations.filter(evaluation => !componentIds.has(evaluation.id)),
    ...components.map(component => component.evaluation),
  ];
  const entries = [
    ...dataset.entries.filter(entry => !componentIds.has(entry.evaluation_id)),
    ...components.flatMap(component => component.entries),
  ];
  const providers = new Map<string, Record<string, unknown>>();
  for (const provider of dataset.providers) providers.set(String(provider.id), provider);
  const models = new Map<string, Record<string, unknown>>();
  for (const model of dataset.models) models.set(String(model.id), model);
  for (const model of source.models) {
    const providerId = id(model.provider);
    const modelId = id(`${model.provider}\0${model.name}`);
    if (!providers.has(providerId)) providers.set(providerId, { id: providerId, slug: model.provider.toLowerCase().replace(/[^a-z0-9]+/g, "-"), display_name: model.provider, aliases: [] });
    if (!models.has(modelId)) models.set(modelId, { id: modelId, provider_id: providerId, canonical_name: model.name, display_name: model.name, release_date_label: releaseMonth(model.release_date), aliases: [], created_at: source.captured_at });
  }
  const snapshots = [
    ...dataset.snapshots.filter(snapshot => !componentIds.has(String(snapshot.evaluation_id))),
    ...components.map(component => component.snapshot),
  ];
  const issues = dataset.issues;
  const sourceAssets = new Map<string, Record<string, unknown>>();
  for (const asset of dataset.sourceAssets ?? []) sourceAssets.set(String(asset.id), asset);
  sourceAssets.set(sourceAssetId, sourceAsset);
  const reportEvaluations = evaluations.map(evaluation => ({
    name: evaluation.display_name,
    rows: evaluation.row_count,
    cost_labels: evaluation.cost_label_count,
    precise_costs: evaluation.precise_cost_count,
  }));
  const report = {
    ...dataset.report,
    evaluation_count: evaluations.length,
    row_count: entries.length,
    provider_count: providers.size,
    distinct_raw_model_labels: new Set(entries.map(entry => entry.model)).size,
    cost_label_count: entries.filter(entry => entry.cost_display !== null).length,
    precise_cost_count: entries.filter(entry => entry.cost_usd !== null).length,
    evaluations: reportEvaluations,
    issues,
  };
  return {
    ...dataset,
    sourceAssets: [...sourceAssets.values()],
    evaluations,
    entries,
    providers: [...providers.values()],
    models: [...models.values()],
    snapshots,
    issues,
    report,
  };
}

export function briefcaseComponentDataset(source: BriefcaseComponentsSource): Dataset {
  return mergeBriefcaseComponents({
    sourceAsset: {
      id: "bundled-briefcase-component-source",
      filename: "aa-briefcase-components.json",
      content_hash: "",
      captured_at: source.captured_at,
      imported_at: source.captured_at,
      source_kind: "bundled_component_capture",
    },
    sourceAssets: [],
    evaluations: [],
    providers: [],
    models: [],
    snapshots: [],
    entries: [],
    issues: [],
    report: {},
  }, source);
}
