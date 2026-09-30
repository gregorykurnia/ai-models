import assert from "node:assert/strict";
import { test } from "node:test";
import type { Entry, Evaluation } from "../src/lib/contract";
import { calculateSuitability, rankComponent, suitabilityTaskSchema } from "../src/lib/suitability";

const evaluations = ["a", "b"].map(id => ({ id, published_snapshot_id: "new", row_count: 999 } as Evaluation));
const weights = ["a", "b"].map(evaluation_id => ({ evaluation_id, weight: 50, snapshot_id: "old", captured_at: "2026-09-29" }));
const candidates = ["m", "partial", "none"].map(model_id => ({ model_id, model: model_id, provider: "Provider" }));
const entry = (evaluation_id: string, model_id: string, source_rank: number, extra: Partial<Entry> = {}) =>
  ({ id: `${evaluation_id}-${model_id}`, evaluation_id, model_id, source_rank, source_row: source_rank, snapshot_id: "old", ...extra } as Entry);
const entries = [entry("a", "m", 1), entry("a", "partial", 2), entry("b", "x", 1), entry("b", "y", 2), entry("b", "m", 3)];
const run = (changes: Partial<Parameters<typeof calculateSuitability>[0]> = {}) =>
  calculateSuitability({ evaluations, weights, candidates, entries, availableSnapshotIds: ["old"], ...changes });

test("equal weights, different cohort sizes, missing and absent ranks", () => {
  const result = run();
  assert.deepEqual(result.map(r => r.model_id), ["m", "partial", "none"]);
  assert.equal(result[0].score, 50);
  assert.equal(result[0].weighted_average_rank, 2);
  assert.deepEqual(result[0].breakdown.map(b => b.cohort_size), [2, 3]);
  assert.equal(result[1].coverage_percent, 50);
  assert.equal(result[1].ranked_evaluations, 1);
  assert.equal(result[1].breakdown[1].source_rank, null);
  assert.equal(result[1].breakdown[1].contribution, null);
  assert.equal(result[2].score, null);
  assert.equal(result[2].weighted_average_rank, null);
});
test("unequal weights and contribution points", () => {
  const result = run({ weights: weights.map((w, i) => ({ ...w, weight: i ? 25 : 75 })) });
  assert.equal(result[0].score, 75);
  assert.equal(result[0].weighted_average_rank, 1.5);
  assert.equal(result[0].score, result[0].breakdown.reduce((sum, b) => sum + (b.contribution ?? 0), 0));
});
test("rank 1, one-row cohorts, ties and clamping", () => {
  assert.equal(rankComponent(1, 1), 100);
  assert.equal(rankComponent(20, 3), 0);
  const tied = run({ entries: [entry("a", "m", 1), entry("a", "partial", 1), entry("b", "m", 1)] });
  assert.equal(tied[0].score, 100);
  assert.equal(tied[1].score, 100);
  assert.throws(() => rankComponent(0, 2));
});
test("duplicates retain best rank then row then ID, without mutating inputs", () => {
  const rows = [...entries, entry("a", "m", 2), entry("a", "m", 1, { id: "z", source_row: 99 })];
  const before = JSON.stringify(rows);
  assert.deepEqual(run({ entries: rows }), run());
  assert.deepEqual(run({ entries: [...rows].reverse(), candidates: [...candidates].reverse() }), run());
  assert.equal(JSON.stringify(rows), before);
});
test("pinned snapshots ignore current ranks and fail when unavailable", () => {
  assert.deepEqual(run({ entries: [...entries, entry("b", "m", 1, { snapshot_id: "new" })] }), run());
  assert.throws(() => run({ availableSnapshotIds: ["new"] }), /Pinned snapshot unavailable/);
  assert.equal(run({ entries: [] })[0].score, null);
});
test("zero weights do not create a score or incomplete weight coverage", () => {
  const result = run({ weights: weights.map((w, i) => ({ ...w, weight: i ? 0 : 100 })) });
  const partial = result.find(r => r.model_id === "partial")!;
  assert.equal(partial.complete_coverage, true);
  assert.equal(partial.coverage_percent, 100);
  assert.equal(partial.ranked_evaluations, 1);
  assert.throws(() => run({ weights: weights.map(w => ({ ...w, weight: 0 })) }), /Total weight/);
  assert.throws(() => run({ weights: [weights[0], weights[0]] }), /Duplicate evaluation/);
});
test("saved task validation requires context, candidates, unique selections and 100%", () => {
  const task = { id: "task", title: "Stock analysis", request: "Ask for stock analysis", evaluation_weights: weights,
    candidate_model_ids: ["m"], score_method: "rank_percentile_v1", missing_policy: "exclude_and_show_coverage",
    created_at: "2026-09-30T00:00:00Z", updated_at: "2026-09-30T00:00:00Z", last_calculated_at: "2026-09-30T00:00:00Z", schema_version: 1 };
  assert.equal(suitabilityTaskSchema.safeParse(task).success, true);
  for (const change of [{ request: " " }, { candidate_model_ids: [] }, { candidate_model_ids: ["m", "m"] },
    { evaluation_weights: [weights[0]] }, { evaluation_weights: [weights[0], weights[0]] }])
    assert.equal(suitabilityTaskSchema.safeParse({ ...task, ...change }).success, false);
});
