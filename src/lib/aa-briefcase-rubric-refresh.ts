import { createHash } from "node:crypto";
import type { Dataset, Entry, Evaluation } from "./contract";

export type BriefcaseRubricRefreshSource = {
  source_url: string;
  source_title: string;
  captured_at: string;
  source_model_count: number;
  models: {
    id: string;
    provider: string;
    name: string;
    rubric_score: number;
    source_row: number;
  }[];
};

const evaluationId = "aa-briefcase-rubric-score";
const sourceBase = "https://artificialanalysis.ai/evaluations/aa-briefcase";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const id = (value: string) => hash(value).slice(0, 24);
const modelKey = (provider: string, name: string) => `${provider}\0${name}`;
const percent = (value: number) => `${Number(value.toFixed(2))}%`;

export function mergeBriefcaseRubricRefresh(dataset: Dataset, source: BriefcaseRubricRefreshSource): Dataset {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source.captured_at) || Number.isNaN(Date.parse(source.captured_at))) {
    throw new Error(`Invalid AA-Briefcase rubric capture date: ${source.captured_at}`);
  }
  if (source.source_url !== `${sourceBase}?results=rubric-score`) {
    throw new Error(`Unexpected AA-Briefcase rubric source URL: ${source.source_url}`);
  }

  const evaluation = dataset.evaluations.find(item => item.id === evaluationId);
  if (!evaluation) throw new Error("AA-Briefcase Rubric Score evaluation is missing");
  const entries = dataset.entries.filter(entry => entry.evaluation_id === evaluationId);
  const models = new Map<string, BriefcaseRubricRefreshSource["models"][number]>();
  for (const model of source.models) {
    const key = modelKey(model.provider, model.name);
    if (!model.id || !model.provider || !model.name || models.has(key)
      || !Number.isFinite(model.rubric_score) || model.rubric_score < 0 || model.rubric_score > 1
      || !Number.isInteger(model.source_row) || model.source_row < 1) {
      throw new Error(`Invalid or duplicate AA-Briefcase rubric result for ${model.name || model.id}`);
    }
    models.set(key, model);
  }

  if (models.size !== entries.length) {
    throw new Error(`AA-Briefcase rubric refresh has ${models.size} models for ${entries.length} existing entries`);
  }
  const existingKeys = new Set<string>();
  for (const entry of entries) {
    const key = modelKey(entry.provider, entry.model);
    if (existingKeys.has(key) || !models.has(key)) {
      throw new Error(`AA-Briefcase rubric refresh cannot match ${entry.provider} / ${entry.model}`);
    }
    existingKeys.add(key);
  }

  const sourceAssetId = hash(JSON.stringify(source));
  const snapshotId = `${evaluationId}-${sourceAssetId.slice(0, 16)}`;
  const refreshed = entries.map(entry => {
    const model = models.get(modelKey(entry.provider, entry.model))!;
    return {
      ...entry,
      id: id(`${snapshotId}:${model.id}:${evaluationId}`),
      snapshot_id: snapshotId,
      source_rank: 1,
      score_value: model.rubric_score * 100,
      score_display: percent(model.rubric_score * 100),
      confidence_interval_display: null,
      confidence_interval_low_delta: null,
      confidence_interval_high_delta: null,
      source_sheet: "AA-Briefcase Rubric Score (%)",
      source_row: model.source_row,
      source_asset_id: sourceAssetId,
    } satisfies Entry;
  }).sort((a, b) => b.score_value - a.score_value || a.source_row - b.source_row || a.model.localeCompare(b.model));

  let previousValue: number | null = null;
  let previousRank = 0;
  const ranked = refreshed.map((entry, index) => {
    const rank = entry.score_value === previousValue ? previousRank : index + 1;
    previousValue = entry.score_value;
    previousRank = rank;
    return { ...entry, source_rank: rank };
  });
  const refreshedEvaluation: Evaluation = {
    ...evaluation,
    source_title: source.source_title,
    source_url: source.source_url,
    captured_at: source.captured_at,
    source_asset_id: sourceAssetId,
    published_snapshot_id: snapshotId,
    row_count: ranked.length,
    notes: `The share of binary rubric checks passed across AA-Briefcase tasks. Scores are refreshed from Artificial Analysis data captured ${source.captured_at}; ${ranked.length} existing leaderboard configurations were matched by provider and model identity. ${source.source_model_count - ranked.length} additional source models were not added.`,
  };
  const snapshot = {
    id: snapshotId,
    evaluation_id: evaluationId,
    source_asset_id: sourceAssetId,
    captured_at: source.captured_at,
    status: "validated",
    row_count: ranked.length,
    cost_label_count: 0,
    precise_cost_count: 0,
  };
  const sourceAsset = {
    id: sourceAssetId,
    filename: "aa-briefcase-rubric-refresh.json",
    content_hash: sourceAssetId,
    captured_at: source.captured_at,
    imported_at: source.captured_at,
    source_kind: "artificial_analysis_evaluation_snapshot",
    source_urls: [source.source_url],
    notes: `Official rubric scores matched to ${ranked.length} existing model configurations. The source had ${source.source_model_count} rubric-scored models; unlisted leaderboard rows were not added.`,
  };
  const reportEvaluations = Array.isArray(dataset.report.evaluations)
    ? dataset.report.evaluations.map((row: Record<string, unknown>) => row.name === evaluation.display_name
      ? { ...row, rows: ranked.length }
      : row)
    : dataset.report.evaluations;

  return {
    ...dataset,
    sourceAssets: [...(dataset.sourceAssets ?? []).filter(asset => asset.id !== sourceAssetId), sourceAsset],
    evaluations: dataset.evaluations.map(item => item.id === evaluationId ? refreshedEvaluation : item),
    entries: [...dataset.entries.filter(entry => entry.evaluation_id !== evaluationId), ...ranked],
    snapshots: [...dataset.snapshots.filter(item => item.id !== snapshotId), snapshot],
    report: { ...dataset.report, evaluations: reportEvaluations },
  };
}
