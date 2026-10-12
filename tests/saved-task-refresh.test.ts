import assert from "node:assert/strict";
import { test } from "node:test";
import type { Entry, Evaluation } from "../src/lib/contract";
import { planSavedTaskRefresh, type StoredTask } from "../src/lib/saved-task-refresh";

const now = "2026-10-12T00:00:00.000Z";
const evaluations = [{ id: "ev-a", slug: "ev-a", display_name: "Eval A", published_snapshot_id: "ev-a-new", captured_at: "2026-10-11" }] as unknown as Evaluation[];
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
