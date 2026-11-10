import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluationScoreDisplay } from "../src/lib/evaluation-display";

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
