import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { Dataset } from "../src/lib/contract";
import { calculateSuitability } from "../src/lib/suitability";
import { buildPlannerData } from "../src/lib/suitability-data";

const dataset = JSON.parse(await readFile("data/leaderboards.json", "utf8")) as Dataset;
const evaluations = dataset.evaluations;
const entries = dataset.entries;
const candidates = new Map<string, { model_id: string; model: string; provider: string }>();
for (const entry of entries) {
  const candidate = { model_id: entry.model_id, model: entry.model, provider: entry.provider };
  const previous = candidates.get(entry.model_id);
  if (previous) assert.deepEqual(previous, candidate, `model_id collision: ${entry.model_id}`);
  else candidates.set(entry.model_id, candidate);
}
const byEvaluation = evaluations.map(evaluation => {
  const rows = entries.filter(entry => entry.evaluation_id === evaluation.id);
  assert.equal(rows.length, evaluation.row_count, `${evaluation.display_name} row count changed`);
  assert(rows.every(entry => entry.snapshot_id === evaluation.published_snapshot_id), `${evaluation.display_name} has rows from a different snapshot`);
  assert(rows.every(entry => entry.source_rank >= 1 && entry.source_rank <= rows.length), `${evaluation.display_name} has out-of-range ranks`);
  const modelIds = new Set(rows.map(entry => entry.model_id));
  assert.equal(modelIds.size, rows.length, `${evaluation.display_name} has duplicate exact model IDs`);
  return { evaluation, rows, modelIds };
});
const weights = evaluations.map(e => ({ evaluation_id: e.id, weight: 100 / evaluations.length, snapshot_id: e.published_snapshot_id, captured_at: e.captured_at }));
const plannerData = buildPlannerData(evaluations, entries);
assert.equal(new Set(evaluations.map(e => e.slug)).size, evaluations.length, "Duplicate evaluation slug");
const started = performance.now();
const results = calculateSuitability({ ...plannerData, weights });
const elapsedMs = performance.now() - started;
assert.equal(results.length, plannerData.candidates.length);
assert.deepEqual(results.filter(r => r.score === null), []);
for (const result of results) for (const cell of result.breakdown) {
  if (cell.source_rank === null) continue;
  assert(entries.some(e => e.evaluation_id === cell.evaluation_id && e.snapshot_id === cell.snapshot_id
    && e.source_rank === cell.source_rank && e.model === cell.source_model), "Breakdown source link has no matching source model");
}
const coverage = Object.fromEntries(Array.from({ length: evaluations.length + 1 }, (_, count) => [count, results.filter(r => r.ranked_evaluations === count).length]));
const intelligence = byEvaluation.find(({ evaluation }) => evaluation.id === "intelligence-index");
assert(intelligence, "Intelligence Index is missing");
const exampleIds = new Set(["briefcase-v1-1", "finance-accounting", "intelligence-index"]);
const exampleEvals = evaluations.filter(e => exampleIds.has(e.id));
const exampleRows = calculateSuitability({ ...plannerData, evaluations: exampleEvals,
  weights: exampleEvals.map(e => ({ evaluation_id: e.id, weight: 100 / exampleEvals.length, snapshot_id: e.published_snapshot_id, captured_at: e.captured_at })),
});
const partial = exampleRows.filter(r => !r.complete_coverage);
const report = {
  source_capture: dataset.sourceAsset.captured_at,
  evaluations: evaluations.length,
  accepted_rank_rows: entries.length,
  exact_model_ids: candidates.size,
  selectable_variants: plannerData.candidates.length,
  known_label_alias_groups: plannerData.candidates.filter(c => c.source_model_ids!.length > 1).length,
  unknown_provider_rows: entries.filter(e => e.provider === "Unknown").length,
  intelligence_index_rows: intelligence.rows.length,
  intelligence_index_scoring_status: Object.fromEntries([...new Set(intelligence.rows.map(e => e.scoring_status ?? "Unlabeled"))].map(status => [status, intelligence.rows.filter(e => (e.scoring_status ?? "Unlabeled") === status).length])),
  exact_id_provider_or_label_collisions: 0,
  duplicate_model_ids_within_evaluation: 0,
  capture_dates: [...new Set(evaluations.map(e => e.captured_at))],
  all_evaluation_coverage_distribution: coverage,
  sample_task_evaluations: exampleEvals.map(e => e.display_name),
  sample_task_partial_candidates: partial.length,
  sample_task_complete_candidates: exampleRows.length - partial.length,
  sample_task_not_ranked_cells: partial.reduce((sum, r) => sum + r.breakdown.filter(b => b.source_rank === null).length, 0),
  sample_task_top_results: exampleRows.slice(0, 5).map(r => ({ model: r.model, provider: r.provider, score: Number(r.score?.toFixed(2)), coverage: `${r.ranked_evaluations}/${r.selected_evaluations}`, average_rank: Number(r.weighted_average_rank?.toFixed(2)) })),
  full_catalog_calculation_ms: Number(elapsedMs.toFixed(2)),
};
console.log(JSON.stringify(report, null, 2));
