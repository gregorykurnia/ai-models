import type { Entry, Evaluation } from "./contract";

export const omniscienceBusinessEvaluationId = "aa-omniscience-business";

export function evaluationMetricLabel(evaluation: Pick<Evaluation, "id" | "metric_label">): string {
  return evaluation.id === omniscienceBusinessEvaluationId ? "Net Score" : evaluation.metric_label;
}

export function evaluationScoreDisplay(evaluation: Pick<Evaluation, "id">, entry: Pick<Entry, "score_value" | "score_display">): string {
  // This captured benchmark stores fractions even though its source label is a percentage.
  // Format at the view boundary, preserving the captured values and their sort order.
  if (evaluation.id === "terminal-bench-4-1") return `${(entry.score_value * 100).toFixed(2)}%`;
  if (evaluation.id === "intelligence-index" || evaluation.id === "swe-atlas-qna-aa" || evaluation.id === omniscienceBusinessEvaluationId) {
    return entry.score_value.toFixed(4);
  }
  return entry.score_display;
}
