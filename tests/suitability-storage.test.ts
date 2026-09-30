import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import type { Dataset } from "../src/lib/contract";
import { calculateSuitability, type SuitabilityTask } from "../src/lib/suitability";
import { pinComparison, readSavedTasks, type PlannerData } from "../src/lib/suitability-storage";

test("saved tasks retain full cohorts and results when published data changes", async () => {
  const dataset = JSON.parse(await readFile("data/leaderboards.json", "utf8")) as Dataset;
  const evaluations = dataset.evaluations.slice(0, 2);
  const entries = dataset.entries.filter(e => evaluations.some(v => v.id === e.evaluation_id));
  const model = entries[0];
  const data = { evaluations, entries, candidates: [{ model_id: model.model_id, model: model.model, provider: model.provider }],
    availableSnapshotIds: evaluations.map(e => e.published_snapshot_id) };
  const task: SuitabilityTask = { id: "fixture", title: "Stock analysis", request: "Ask for stock analysis",
    evaluation_weights: evaluations.map(e => ({ evaluation_id: e.id, weight: 50, snapshot_id: e.published_snapshot_id, captured_at: e.captured_at })),
    candidate_model_ids: [model.model_id], score_method: "rank_percentile_v1", missing_policy: "exclude_and_show_coverage",
    created_at: "2026-09-30T00:00:00Z", updated_at: "2026-09-30T00:00:00Z", last_calculated_at: "2026-09-30T00:00:00Z", schema_version: 1 };
  const pinned = pinComparison(task, data);
  const [restored] = readSavedTasks(JSON.stringify([pinned]));
  assert(restored.entries.some(e => e.model_id !== model.model_id), "Full cohort, not just selected candidates, must be cached");
  const run = (value: PlannerData) => calculateSuitability({ ...value, weights: task.evaluation_weights });
  assert.deepEqual(run(restored), run(data));
  data.entries = [];
  data.evaluations = evaluations.map(e => ({ ...e, published_snapshot_id: "new", captured_at: "2026-10-01" }));
  assert.deepEqual(restored.task.evaluation_weights, task.evaluation_weights);
  assert.equal(run(restored)[0].breakdown[0].source_rank, model.source_rank);
  assert.throws(() => readSavedTasks("invalid"));
  assert.deepEqual(readSavedTasks(null), []);
});
