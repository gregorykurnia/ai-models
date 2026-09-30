import assert from "node:assert/strict";
import { test } from "node:test";
import type { Entry, Evaluation } from "../src/lib/contract";
import { buildPlannerData } from "../src/lib/suitability-data";
import { calculateSuitability, type SuitabilityTask } from "../src/lib/suitability";
import { pinComparison, readSavedTasks } from "../src/lib/suitability-storage";

const evaluations = ["a", "b"].map(id => ({ id, slug: id, display_name: id, category: "benchmark", metric_label: "Score", captured_at: "2026-09-29", published_snapshot_id: `${id}-old`, row_count: 2 } as Evaluation));
const entry = (evaluation_id: string, model_id: string, model: string, source_rank = 1, extra: Partial<Entry> = {}) =>
  ({ id: `${evaluation_id}-${model_id}`, evaluation_id, model_id, provider: "Anthropic", model, source_rank, source_row: source_rank, snapshot_id: `${evaluation_id}-old`, ...extra } as Entry);
const entries = [entry("a", "long", "Claude (Adaptive Reasoning, Max Effort, Default Fallback)"),
  entry("b", "short", "Claude (max with fallback)", 2, { scoring_status: "Estimate" }),
  entry("a", "high", "Claude (high with fallback)", 2), entry("b", "high", "Claude (high with fallback)")];
const weights = evaluations.map(e => ({ evaluation_id: e.id, snapshot_id: e.published_snapshot_id, captured_at: e.captured_at, weight: 50 }));
const task: SuitabilityTask = { id: "task", title: "Fixture", request: "Compare models", evaluation_weights: weights, candidate_model_ids: ["long"],
  score_method: "rank_percentile_v1", missing_policy: "exclude_and_show_coverage", schema_version: 1,
  created_at: "2026-09-30T00:00:00Z", updated_at: "2026-09-30T00:00:00Z", last_calculated_at: "2026-09-30T00:00:00Z" };

test("known formatting aliases share coverage, preserve effort variants and source labels", () => {
  const data = buildPlannerData(evaluations, entries);
  assert.equal(data.candidates.length, 2);
  assert.deepEqual(data.candidates, buildPlannerData([...evaluations].reverse(), [...entries].reverse()).candidates);
  const row = calculateSuitability({ ...data, weights }).find(r => r.model_id === "long")!;
  assert.equal(row.complete_coverage, true);
  assert.equal(row.score, 50);
  assert.equal(row.breakdown[1].source_model, "Claude (max with fallback)");
  assert.equal(row.breakdown[1].scoring_status, "Estimate");
  assert.deepEqual(row.breakdown.map(b => b.cohort_size), [2, 2]);
  assert.equal(entries[1].model_id, "short", "Source IDs must remain immutable");
});
test("canonical duplicates retain the best rank and count once in the cohort", () => {
  const data = buildPlannerData(evaluations, [...entries, entry("a", "short", "Claude (max with fallback)", 2)]);
  const row = calculateSuitability({ ...data, weights }).find(r => r.model_id === "long")!;
  assert.equal(row.breakdown[0].source_rank, 1);
  assert.equal(row.breakdown[0].cohort_size, 2);
});
test("alias mappings and source status survive reload; earlier exact-ID saves retain their score", () => {
  const data = buildPlannerData(evaluations, entries);
  const [restored] = readSavedTasks(JSON.stringify([pinComparison(task, data)]));
  assert.deepEqual(calculateSuitability({ ...restored, weights }), calculateSuitability({ ...data, candidates: data.candidates.filter(c => c.model_id === "long"), weights }));
  const legacyEntries = entries.map(({ id, evaluation_id, snapshot_id, model_id, source_rank, source_row }) => ({ id, evaluation_id, snapshot_id, model_id, source_rank, source_row }));
  const legacy = pinComparison(task, { ...data, entries: legacyEntries, candidates: [{ model_id: "long", model: entries[0].model, provider: entries[0].provider }] });
  const [old] = readSavedTasks(JSON.stringify([legacy]));
  const row = calculateSuitability({ ...old, weights })[0];
  assert.equal(row.score, 100);
  assert.equal(row.coverage_percent, 50);
});
