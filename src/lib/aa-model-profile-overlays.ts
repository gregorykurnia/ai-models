import { createHash } from "node:crypto";
import { entrySchema, type Dataset, type Entry, type Evaluation } from "./contract";
import { masterIdentityKey } from "./master";

export type AaModelProfileScore = {
  score: number | null;
  confidence_interval?: { lower95ci: number; upper95ci: number } | null;
};

export type AaModelProfile = {
  profile_id: string;
  profile_url: string;
  provider: string;
  name: string;
  release_date: string;
  scores: Record<string, AaModelProfileScore>;
  metadata: Record<string, unknown> & { intelligence_index_is_estimated?: boolean };
};

export type AaModelProfileOverlay = {
  captured_at: string;
  source_title: string;
  notes: string;
  models: AaModelProfile[];
};

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const id = (value: string) => hash(value).slice(0, 24);

function releaseMonth(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid Artificial Analysis release date: ${value}`);
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function rounded(value: number) {
  return String(Math.round(value));
}

function signed(value: number, places: number) {
  const roundedValue = Number(value.toFixed(places));
  const amount = Number.isInteger(roundedValue)
    ? String(Math.abs(roundedValue))
    : String(Math.abs(roundedValue)).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return `${roundedValue < 0 ? "-" : "+"}${amount}`;
}

function scoreDisplay(evaluation: Evaluation, score: number) {
  if (evaluation.id === "aa-briefcase-rubric-score") return `${Number((score * 100).toFixed(2))}%`;
  if (evaluation.score_kind === "elo"
    || evaluation.category === "capability_index"
    || evaluation.id === "aa-omniscience-index"
    || evaluation.id === "intelligence-index"
    || evaluation.id === "aa-briefcase-analytical-quality-elo"
    || evaluation.id === "aa-briefcase-presentation-elo") return rounded(score);
  return String(score);
}

function confidenceInterval(evaluation: Evaluation, score: number, interval?: AaModelProfileScore["confidence_interval"]) {
  if (!interval) return {
    confidence_interval_display: null,
    confidence_interval_low_delta: null,
    confidence_interval_high_delta: null,
  };
  const low = interval.lower95ci - score;
  const high = interval.upper95ci - score;
  const places = evaluation.id === "briefcase-v1-1" ? 0 : 2;
  return {
    confidence_interval_display: `${signed(low, places)} / ${signed(high, places)}`,
    confidence_interval_low_delta: low,
    confidence_interval_high_delta: high,
  };
}

function modelEntry(
  profile: AaModelProfile,
  evaluation: Evaluation,
  score: AaModelProfileScore,
  sourceAssetId: string,
  sourceRow: number,
): Entry | null {
  if (score.score === null) return null;
  if (!Number.isFinite(score.score)) throw new Error(`Invalid ${evaluation.display_name} score for ${profile.name}`);
  const providerId = id(profile.provider);
  const modelId = id(`${profile.provider}\0${profile.name}`);
  return entrySchema.parse({
    id: id(`${evaluation.published_snapshot_id}:${profile.profile_id}:${evaluation.id}`),
    evaluation_id: evaluation.id,
    snapshot_id: evaluation.published_snapshot_id,
    model_id: modelId,
    provider_id: providerId,
    provider: profile.provider,
    model: profile.name,
    source_rank: 1,
    score_value: score.score,
    score_display: scoreDisplay(evaluation, score.score),
    scoring_status: evaluation.id === "intelligence-index"
      ? profile.metadata.intelligence_index_is_estimated === false ? "Independently scored" : "Estimated"
      : null,
    ...confidenceInterval(evaluation, score.score, score.confidence_interval),
    release_date_label: releaseMonth(profile.release_date),
    cost_usd: null,
    cost_display: null,
    cost_status: "missing",
    source_sheet: "Artificial Analysis model profile",
    source_row: sourceRow,
    source_asset_id: sourceAssetId,
  });
}

function profileModelRecord(profile: AaModelProfile, capturedAt: string) {
  const providerId = id(profile.provider);
  return {
    id: id(`${profile.provider}\0${profile.name}`),
    provider_id: providerId,
    canonical_name: profile.name,
    display_name: profile.name,
    release_date_label: releaseMonth(profile.release_date),
    aliases: [],
    created_at: capturedAt,
    artificial_analysis_profile_url: profile.profile_url,
    artificial_analysis_profile_id: profile.profile_id,
    profile_captured_at: capturedAt,
    profile_metadata: profile.metadata,
  };
}

export function mergeAaModelProfileOverlays(dataset: Dataset, source: AaModelProfileOverlay): Dataset {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source.captured_at) || Number.isNaN(Date.parse(source.captured_at))) {
    throw new Error(`Invalid Artificial Analysis profile capture date: ${source.captured_at}`);
  }
  const assetId = hash(JSON.stringify(source));
  const profileIds = new Set(source.models.map(profile => profile.profile_id));
  const sourceAssets = dataset.sourceAssets ?? [];
  const replacedAssetIds = new Set(sourceAssets.flatMap(asset => {
    const ids = asset.profile_ids;
    return asset.source_kind === "artificial_analysis_model_profile_overlay"
      && Array.isArray(ids) && ids.length > 0 && ids.every(id => profileIds.has(String(id)))
      ? [String(asset.id)]
      : [];
  }));
  const replacedRows = dataset.entries.filter(entry => replacedAssetIds.has(entry.source_asset_id));
  const replacedRowIds = new Set(replacedRows.map(entry => entry.id));
  const removedCounts = new Map<string, number>();
  for (const entry of replacedRows) removedCounts.set(entry.evaluation_id, (removedCounts.get(entry.evaluation_id) ?? 0) + 1);
  const restoredEntries = dataset.entries.flatMap(entry => {
    if (replacedRowIds.has(entry.id)) return [];
    const undoShift = replacedRows.filter(previous => previous.evaluation_id === entry.evaluation_id
      && previous.score_value > entry.score_value).length;
    return [undoShift ? { ...entry, source_rank: entry.source_rank - undoShift } : entry];
  });
  const baseEvaluations = dataset.evaluations.map(evaluation => {
    const removed = removedCounts.get(evaluation.id) ?? 0;
    return removed ? { ...evaluation, row_count: evaluation.row_count - removed } : evaluation;
  });
  const baseSnapshots = dataset.snapshots.map(snapshot => {
    const removed = removedCounts.get(String(snapshot.evaluation_id)) ?? 0;
    return removed ? { ...snapshot, row_count: Number(snapshot.row_count ?? 0) - removed } : snapshot;
  });
  const baseDataset: Dataset = {
    ...dataset,
    sourceAssets: sourceAssets.filter(asset => !replacedAssetIds.has(String(asset.id))),
    evaluations: baseEvaluations,
    snapshots: baseSnapshots,
    entries: restoredEntries,
  };
  const evaluationById = new Map(baseDataset.evaluations.map(evaluation => [evaluation.id, evaluation]));
  const existingIdentities = new Set(baseDataset.entries.map(entry => `${entry.evaluation_id}\0${masterIdentityKey(entry.provider, entry.model)}`));
  const newEntries: Entry[] = [];
  const profileById = new Map<string, AaModelProfile>();

  for (const profile of source.models) {
    if (!profile.profile_id || !profile.profile_url.startsWith("https://artificialanalysis.ai/models/")) {
      throw new Error(`Invalid Artificial Analysis profile source for ${profile.name || "unnamed model"}`);
    }
    if (profileById.has(profile.profile_id)) throw new Error(`Duplicate Artificial Analysis profile id: ${profile.profile_id}`);
    profileById.set(profile.profile_id, profile);
    releaseMonth(profile.release_date);
    for (const [evaluationId, score] of Object.entries(profile.scores)) {
      const evaluation = evaluationById.get(evaluationId);
      if (!evaluation) throw new Error(`Unknown evaluation ${evaluationId} in ${profile.name} profile overlay`);
      const key = `${evaluation.id}\0${masterIdentityKey(profile.provider, profile.name)}`;
      if (existingIdentities.has(key)) continue;
      const entry = modelEntry(profile, evaluation, score, assetId, newEntries.length + 1);
      if (entry) {
        newEntries.push(entry);
        existingIdentities.add(key);
      }
    }
  }

  if (newEntries.length === 0) return baseDataset;

  const newEntriesByEvaluation = new Map<string, Entry[]>();
  for (const entry of newEntries) {
    const rows = newEntriesByEvaluation.get(entry.evaluation_id) ?? [];
    rows.push(entry);
    newEntriesByEvaluation.set(entry.evaluation_id, rows);
  }
  const updatedEvaluations = dataset.evaluations.map(evaluation => {
    const additions = newEntriesByEvaluation.get(evaluation.id) ?? [];
    if (additions.length === 0) return evaluation;
    const previousEntries = baseDataset.entries.filter(entry => entry.evaluation_id === evaluation.id);
    return { ...evaluation, row_count: previousEntries.length + additions.length };
  });

  const updatedSnapshots = baseDataset.snapshots.map(snapshot => {
    const additions = newEntriesByEvaluation.get(String(snapshot.evaluation_id)) ?? [];
    return additions.length ? { ...snapshot, row_count: Number(snapshot.row_count ?? 0) + additions.length } : snapshot;
  });
  const mergedEntries = baseDataset.entries.map(entry => {
    const additions = newEntriesByEvaluation.get(entry.evaluation_id);
    if (!additions) return entry;
    const shift = additions.filter(addition => addition.score_value > entry.score_value).length;
    return shift ? { ...entry, source_rank: entry.source_rank + shift } : entry;
  });
  for (const [evaluationId, additions] of newEntriesByEvaluation) {
    const evaluation = evaluationById.get(evaluationId)!;
    const existing = baseDataset.entries.filter(item => item.evaluation_id === evaluationId);
    const maxSourceRow = existing.reduce((max, item) => Math.max(max, item.source_row), 0);
    const alphaRows = [...additions].sort((a, b) => a.model.localeCompare(b.model));
    for (const entry of additions) {
      const olderAtOrAbove = existing.filter(item => item.score_value >= entry.score_value).length;
      const newerAbove = additions.filter(item => item.id !== entry.id && item.score_value > entry.score_value).length;
      const alphaIndex = alphaRows.findIndex(item => item.id === entry.id);
      mergedEntries.push({
        ...entry,
        source_rank: olderAtOrAbove + newerAbove + 1,
        source_row: maxSourceRow + alphaIndex + 1,
        snapshot_id: evaluation.published_snapshot_id,
      });
    }
  }

  const providers = new Map(baseDataset.providers.map(provider => [String(provider.id), provider]));
  const models = new Map(baseDataset.models.map(model => [String(model.id), model]));
  for (const profile of profileById.values()) {
    const record = profileModelRecord(profile, source.captured_at);
    const providerId = String(record.provider_id);
    if (!providers.has(providerId)) providers.set(providerId, {
      id: providerId,
      slug: profile.provider.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      display_name: profile.provider,
      aliases: [],
    });
    models.set(String(record.id), record);
  }

  const updatedSourceAssets = new Map((baseDataset.sourceAssets ?? []).map(asset => [String(asset.id), asset]));
  updatedSourceAssets.set(assetId, {
    id: assetId,
    filename: "aa-model-profile-overlays.json",
    content_hash: assetId,
    captured_at: source.captured_at,
    imported_at: source.captured_at,
    source_kind: "artificial_analysis_model_profile_overlay",
    source_urls: source.models.map(profile => profile.profile_url),
    profile_ids: source.models.map(profile => profile.profile_id),
    notes: source.notes,
  });

  const updatedReports = Array.isArray(baseDataset.report.evaluations)
    ? baseDataset.report.evaluations.map((row: Record<string, unknown>) => {
      const evaluation = updatedEvaluations.find(item => item.display_name === row.name);
      return evaluation ? { ...row, rows: evaluation.row_count } : row;
    })
    : baseDataset.report.evaluations;
  const report = {
    ...baseDataset.report,
    row_count: mergedEntries.length,
    provider_count: providers.size,
    distinct_raw_model_labels: new Set(mergedEntries.map(entry => entry.model)).size,
    cost_label_count: mergedEntries.filter(entry => entry.cost_display !== null).length,
    precise_cost_count: mergedEntries.filter(entry => entry.cost_usd !== null).length,
    evaluations: updatedReports,
  };

  return {
    ...baseDataset,
    sourceAssets: [...updatedSourceAssets.values()],
    evaluations: updatedEvaluations,
    snapshots: updatedSnapshots,
    entries: mergedEntries,
    providers: [...providers.values()],
    models: [...models.values()],
    report,
  };
}
