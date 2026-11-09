import assert from "node:assert/strict";
import { test } from "node:test";
import { parseQueryParams } from "../src/lib/contract";
import {
  evaluationTimePerTask, evaluationTimePerTaskLabel, getModelSpeed, type ModelSpeed,
} from "../src/lib/model-speed";

const speed: ModelSpeed = {
  slug: "fixture", model: "Fixture", provider: "Fixture", url: "https://example.com",
  captured_at: "2026-11-09", time_per_task_s: 600, first_answer_s: 3,
  evaluation_times_s: { "terminalbench-4-0": 120, "aa-briefcase": 240 },
};

test("evaluation time uses Terminal Bench and shared AA-Briefcase timings, with page-wide Index fallback", () => {
  assert.equal(evaluationTimePerTask("terminal-bench-4-0", speed), 120);
  for (const id of ["aa-briefcase-analytical-quality-elo", "aa-briefcase-presentation-elo", "aa-briefcase-rubric-score"]) {
    assert.equal(evaluationTimePerTask(id, speed), 240);
    assert.equal(evaluationTimePerTaskLabel(id), "Time per task");
  }
  assert.equal(evaluationTimePerTaskLabel("terminal-bench-4-0"), "Time per task");
  for (const id of ["finance-accounting", "intelligence-index", "critpt", "unknown"]) {
    assert.equal(evaluationTimePerTask(id, speed), 600);
    assert.equal(evaluationTimePerTaskLabel(id), "Time per Intelligence Index task");
  }
});

test("missing evaluation times never fall back per row; zero and missing records survive", () => {
  assert.equal(evaluationTimePerTask("terminal-bench-4-0", { ...speed, evaluation_times_s: {} }), null);
  assert.equal(evaluationTimePerTask("terminal-bench-4-0", { ...speed, evaluation_times_s: { "terminalbench-4-0": 0 } }), 0);
  assert.equal(evaluationTimePerTask("finance-accounting", { ...speed, time_per_task_s: 0 }), 0);
  for (const missing of [null, undefined, { ...speed, time_per_task_s: null, evaluation_times_s: {} }]) {
    assert.equal(evaluationTimePerTask("terminal-bench-4-0", missing), null);
    assert.equal(evaluationTimePerTask("finance-accounting", missing), null);
  }
});

test("real Opus and Sol variants use the AA-Briefcase timing on Analytical Quality Elo", () => {
  for (const [provider, model] of [["Anthropic", "Claude Opus 5.5 (high with fallback)"], ["OpenAI", "GPT-6.1 Sol (Max)"]]) {
    const record = getModelSpeed(provider, model)!;
    assert.ok(record);
    assert.ok(record.evaluation_times_s["aa-briefcase"] > 0);
    assert.equal(evaluationTimePerTask("aa-briefcase-analytical-quality-elo", record), record.evaluation_times_s["aa-briefcase"]);
    assert.equal(evaluationTimePerTask("finance-accounting", record), record.time_per_task_s);
  }
});

test("speed URL sorts are accepted and default to fastest first", () => {
  for (const sort of ["time_per_task", "first_answer"]) {
    const state = parseQueryParams(new URLSearchParams({ sort }));
    assert.equal(state.sort, sort);
    assert.equal(state.direction, "asc");
    assert.equal(parseQueryParams(new URLSearchParams({ sort, direction: "desc" })).direction, "desc");
  }
  assert.equal(parseQueryParams(new URLSearchParams("sort=not-a-sort")).sort, "source_rank");
});
