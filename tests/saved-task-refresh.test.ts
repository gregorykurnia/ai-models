import assert from "node:assert/strict";
import { test } from "node:test";
import type { Entry, Evaluation } from "../src/lib/contract";
import { planSavedTaskRefresh, type StoredTask } from "../src/lib/saved-task-refresh";
import { calculateSuitability, type EvaluationWeight } from "../src/lib/suitability";
import { readSavedTasks } from "../src/lib/suitability-storage";

const now = "2026-10-12T00:00:00.000Z";
const evaluations = [{
  id: "ev-a", slug: "ev-a", display_name: "Eval A", published_snapshot_id: "ev-a-new", captured_at: "2026-10-11",
  category: "Coding", metric_label: "Score", row_count: 2,
}] as unknown as Evaluation[];
const currentEntries = [
  { id: "n1", evaluation_id: "ev-a", snapshot_id: "ev-a-new", model_id: "m-gemini-high", provider: "Google", model: "Gemini 3.6 Flash (High)", source_rank: 1, source_row: 1, scoring_status: null, cost_usd: null, cost_display: null, cost_status: "missing" },
  { id: "n2", evaluation_id: "ev-a", snapshot_id: "ev-a-new", model_id: "m-other", provider: "Acme", model: "Other Model", source_rank: 2, source_row: 2, scoring_status: null, cost_usd: null, cost_display: null, cost_status: "missing" },
] as unknown as Entry[];
const pinnedEntries = [
  { id: "o1", evaluation_id: "ev-a", snapshot_id: "ev-a-old", model_id: "c-gemini", source_rank: 3, source_row: 1, model: "Gemini 3.6 Flash", scoring_status: null, cost_usd: null, cost_display: null, cost_status: "missing" },
  { id: "o2", evaluation_id: "ev-a", snapshot_id: "ev-a-old", model_id: "c-other", source_rank: 1, source_row: 2, model: "Other Model", scoring_status: null, cost_usd: null, cost_display: null, cost_status: "missing" },
] as any[];

// A saved task as the shared store holds it, pinned to the pre-update snapshot. The candidate is the old Gemini name.
const top = {
  task: {
    id: "t1", title: "Pricing review", request: "Compare models",
    evaluation_weights: [{ evaluation_id: "ev-a", weight: 100, snapshot_id: "ev-a-old", captured_at: "2026-10-09" }],
    candidate_model_ids: ["c-gemini", "c-other"], implementor_model_id: "c-gemini",
    score_method: "rank_percentile_v1", missing_policy: "exclude_and_show_coverage",
    created_at: "2026-10-09T00:00:00.000Z", updated_at: "2026-10-09T00:00:00.000Z", last_calculated_at: "2026-10-09T00:00:00.000Z", schema_version: 1,
  },
  candidates: [
    { model_id: "c-gemini", model: "Gemini 3.6 Flash", provider: "Google", identity_key: "google\u0000gemini 3.6 flash", source_model_ids: ["c-gemini"] },
    { model_id: "c-other", model: "Other Model", provider: "Acme", identity_key: "acme\u0000other model", source_model_ids: ["c-other"] },
  ],
  evaluations: [{ id: "ev-a", published_snapshot_id: "ev-a-old", captured_at: "2026-10-09" }],
  availableSnapshotIds: ["ev-a-old"],
  active_version: "v1",
  category_revision: 0,
};
const stored: StoredTask = { id: "t1", top, entries: pinnedEntries };

test("a task pinned to older data moves to the latest snapshot, with a renamed candidate mapped to its current row", () => {
  const [plan] = planSavedTaskRefresh({ evaluations, entries: currentEntries, tasks: [stored], now });
  assert.equal(plan.status, "refresh");
  if (plan.status !== "refresh") return;
  assert.deepEqual(plan.task.evaluation_weights, [{ evaluation_id: "ev-a", weight: 100, snapshot_id: "ev-a-new", captured_at: "2026-10-11" }]);
  assert.deepEqual([...plan.task.candidate_model_ids].sort(), ["m-gemini-high", "m-other"]);
  assert.equal(plan.task.implementor_model_id, "m-gemini-high");
  assert.equal(plan.task.updated_at, now);
  assert.deepEqual(plan.changes, { gained: 0, lost: 0, changed: 2, same: 0 });
});

test("a task already on the latest data is left alone", () => {
  const current = { ...top, task: { ...top.task, evaluation_weights: [{ ...top.task.evaluation_weights[0], snapshot_id: "ev-a-new" }] } };
  const [plan] = planSavedTaskRefresh({ evaluations, entries: currentEntries, tasks: [{ id: "t1", top: current, entries: [] }], now });
  assert.equal(plan.status, "current");
});

test("a candidate with no current row blocks the task instead of being dropped", () => {
  const withVanished = {
    ...top,
    task: { ...top.task, candidate_model_ids: ["c-gemini", "c-vanished"] },
    candidates: [...top.candidates, { model_id: "c-vanished", model: "Vanished Model", provider: "Acme", identity_key: "acme\u0000vanished model", source_model_ids: ["c-vanished"] }],
  };
  const [plan] = planSavedTaskRefresh({ evaluations, entries: currentEntries, tasks: [{ id: "t1", top: withVanished, entries: pinnedEntries }], now });
  assert.equal(plan.status, "blocked");
  assert.match(plan.reason, /not on the latest leaderboards/);
});

test("a deleted task is skipped", () => {
  const [plan] = planSavedTaskRefresh({ evaluations, entries: currentEntries, tasks: [{ id: "t1", top: { ...top, deleted_at: "2026-10-10T00:00:00.000Z" }, entries: pinnedEntries }], now });
  assert.equal(plan.status, "skipped");
});

test("running the refresh again after it has moved a task changes nothing", () => {
  const [first] = planSavedTaskRefresh({ evaluations, entries: currentEntries, tasks: [stored], now });
  assert.equal(first.status, "refresh");
  if (first.status !== "refresh") return;
  const moved: StoredTask = {
    id: "t1",
    top: { ...top, task: first.task, evaluations: first.evaluations, candidates: first.candidates, availableSnapshotIds: first.availableSnapshotIds, active_version: "v2" },
    entries: first.entries,
  };
  const [second] = planSavedTaskRefresh({ evaluations, entries: currentEntries, tasks: [moved], now });
  assert.equal(second.status, "current");
});

const bench40: Evaluation = {
  ...evaluations[0], id: "terminal-bench-4-0", slug: "terminal-bench-4-0", display_name: "Terminal-Bench 4.0",
  published_snapshot_id: "bench-40-snapshot", captured_at: "2026-10-09",
};
const bench41: Evaluation = {
  ...bench40, id: "terminal-bench-4-1", slug: "terminal-bench-4-1", display_name: "Terminal-Bench 4.1",
  published_snapshot_id: "bench-41-snapshot", captured_at: "2026-10-11",
};

function weightFor(evaluation: Evaluation, weight: number): EvaluationWeight {
  return { evaluation_id: evaluation.id, weight, snapshot_id: evaluation.published_snapshot_id, captured_at: evaluation.captured_at };
}

function savedWithWeights(...weights: EvaluationWeight[]): StoredTask {
  const pinned = [bench40, bench41, ...evaluations].filter(evaluation => weights.some(weight => weight.evaluation_id === evaluation.id));
  return {
    ...stored,
    top: {
      ...top,
      task: { ...top.task, evaluation_weights: weights },
      evaluations: pinned,
      availableSnapshotIds: pinned.map(evaluation => evaluation.published_snapshot_id),
    },
    entries: pinned.flatMap(evaluation => pinnedEntries.map((entry, index) => ({
      ...entry,
      id: `${evaluation.id}-${entry.id}`,
      evaluation_id: evaluation.id,
      snapshot_id: evaluation.published_snapshot_id,
      source_rank: evaluation.id === bench40.id ? entry.source_rank : currentEntries[index].source_rank,
    }))),
  };
}

function planWithPublished(task: StoredTask, published: Evaluation[] = [bench41, ...evaluations]) {
  const entries = published.flatMap(evaluation => currentEntries.map(entry => ({
    ...entry, id: `${evaluation.id}-${entry.id}`, evaluation_id: evaluation.id, snapshot_id: evaluation.published_snapshot_id,
  })));
  return planSavedTaskRefresh({ evaluations: published, entries, tasks: [task], now })[0];
}

for (const [state, published] of [
  ["published", [bench40, bench41, ...evaluations]],
  ["retired", [bench41, ...evaluations]],
] as const) {
  test(`a saved 4.0 weight moves to 4.1 while 4.0 is ${state}`, () => {
    const otherWeight = weightFor(evaluations[0], 62.5);
    const saved = savedWithWeights(weightFor(bench40, 37.5), otherWeight);
    const plan = planWithPublished(saved, [...published]);
    assert.ok(plan.status === "refresh", plan.reason);
    assert.deepEqual(plan.task.evaluation_weights, [weightFor(bench41, 37.5), otherWeight]);
    assert.deepEqual(plan.changes, { gained: 0, lost: 0, changed: 2, same: 2 });
  });
}

test("4.0 and 4.1 weights merge into one 4.1 pin that survives reload and retry", () => {
  const saved = savedWithWeights(weightFor(bench40, 37.5), weightFor(bench41, 62.5));
  const plan = planWithPublished(saved);
  assert.ok(plan.status === "refresh", plan.reason);
  assert.deepEqual(plan.task.evaluation_weights, [weightFor(bench41, 100)]);
  assert.deepEqual(plan.changes, { gained: 0, lost: 0, changed: 0, same: 2 });
  assert.equal(plan.activeVersion, saved.top.active_version);

  const [restored] = readSavedTasks(JSON.stringify([plan]));
  assert.deepEqual(restored.task.evaluation_weights, [weightFor(bench41, 100)]);
  assert.deepEqual(restored.availableSnapshotIds, [bench41.published_snapshot_id]);
  const results = calculateSuitability({ ...restored, weights: restored.task.evaluation_weights });
  assert.equal(results.find(result => result.model_id === restored.task.implementor_model_id)?.score, 100);
  const retry = planWithPublished({ id: saved.id, top: { ...restored, active_version: "v2" }, entries: restored.entries });
  assert.equal(retry.status, "current");
});

test("an unrelated unpublished evaluation still blocks a refresh with its original reason", () => {
  for (const evaluation_id of ["ev-retired", "Terminal-Bench-4-0", "", "ev-".padEnd(160, "x")]) {
    const saved = savedWithWeights(weightFor(bench40, 40), { ...weightFor(bench41, 60), evaluation_id });
    const plan = planWithPublished(saved);
    assert.equal(plan.status, "blocked");
    assert.equal(plan.reason, `evaluation ${evaluation_id} is no longer published`);
  }
});

test("a repeated original evaluation remains invalid when repinning", () => {
  const weight = { ...top.task.evaluation_weights[0], weight: 50 };
  const [plan] = planSavedTaskRefresh({
    evaluations, entries: currentEntries, now,
    tasks: [{ ...stored, top: { ...top, task: { ...top.task, evaluation_weights: [weight, { ...weight }] } } }],
  });
  assert.equal(plan.status, "blocked");
  assert.match(plan.reason, /Evaluations must be unique/);
});

test("a 4.0 weight blocks if 4.1 has no published snapshot yet", () => {
  const plan = planWithPublished(savedWithWeights(weightFor(bench40, 100)), [bench40]);
  assert.equal(plan.status, "blocked");
  assert.equal(plan.reason, "evaluation terminal-bench-4-1 is no longer published");
});

test("a task already on the latest 4.1 snapshot is current", () => {
  const plan = planWithPublished(savedWithWeights(weightFor(bench41, 100)), [bench40, bench41]);
  assert.equal(plan.status, "current");
});
