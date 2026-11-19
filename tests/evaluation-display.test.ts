import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluationMetricLabel, evaluationScoreDisplay } from "../src/lib/evaluation-display";

test("Terminal Bench fractions display as percentages with consistent precision without mutating scores", () => {
  for (const [value, expected] of [[0.671717171717172, "67.17%"], [0.59596, "59.60%"], [0, "0.00%"], [1, "100.00%"]] as const) {
    const entry = { score_value: value, score_display: String(value) };
    assert.equal(evaluationScoreDisplay({ id: "terminal-bench-4-0" }, entry), expected);
    assert.equal(entry.score_value, value);
    assert.equal(entry.score_display, String(value));
  }
});

test("other evaluation displays retain their captured units and precision", () => {
  for (const [id, display] of [["finance-accounting", "62.6176"], ["aa-briefcase-analytical-quality-elo", "2133"], ["aa-briefcase-rubric-score", "65.15%"]]) {
    assert.equal(evaluationScoreDisplay({ id }, { score_value: 1, score_display: display }), display);
  }
});

test("Intelligence Index scores align at four decimals without changing stored values", () => {
  for (const [value, expected] of [[64.563595756626, "64.5636"], [34.11496086, "34.1150"], [0, "0.0000"]] as const) {
    const captured = String(Number(value.toFixed(4)));
    const entry = { score_value: value, score_display: captured };
    assert.equal(evaluationScoreDisplay({ id: "intelligence-index" }, entry), expected);
    assert.equal(entry.score_value, value);
    assert.equal(entry.score_display, captured);
  }
});

test("SWE-Atlas QnA pass rates keep four decimals, including trailing zeros", () => {
  for (const [value, expected] of [[61.8279569, "61.8280"], [58.8709677, "58.8710"], [33.8709677, "33.8710"], [0, "0.0000"], [100, "100.0000"]] as const) {
    assert.equal(evaluationScoreDisplay({ id: "swe-atlas-qna-aa" }, { score_value: value, score_display: String(value) }), expected);
  }
});

test("Omniscience Business shows signed Net Scores at four decimal places", () => {
  const evaluation = { id: "aa-omniscience-business", metric_label: "AA-Omniscience Index" };
  assert.equal(evaluationMetricLabel(evaluation), "Net Score");
  assert.equal(evaluationMetricLabel({ ...evaluation, id: "aa-omniscience-index" }), "AA-Omniscience Index");
  for (const [value, expected] of [[46, "46.0000"], [0, "0.0000"], [6.44444444, "6.4444"], [-0.44444444, "-0.4444"], [-76.22222222, "-76.2222"]] as const) {
    const entry = { score_value: value, score_display: String(value) };
    assert.equal(evaluationScoreDisplay(evaluation, entry), expected);
    assert.deepEqual(entry, { score_value: value, score_display: String(value) });
  }
});
