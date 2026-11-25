import type { Entry, Evaluation } from "./contract";

export const omniscienceBusinessEvaluationId = "aa-omniscience-business";
export const terminalBenchEvaluationId = "terminal-bench-4-1";

const taskDollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const fractionalTaskDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 20,
});

export function evaluationTaskCostDisplay(cost: number | null): string {
  if (cost === null) return "—";
  return cost > 0 && cost < 1
    ? fractionalTaskDollars.format(Number(cost.toPrecision(3)))
    : taskDollars.format(cost);
}

export function evaluationMetricLabel(evaluation: Pick<Evaluation, "id" | "metric_label">): string {
  return evaluation.id === omniscienceBusinessEvaluationId ? "Net Score" : evaluation.metric_label;
}

export function evaluationScoreDisplay(evaluation: Pick<Evaluation, "id">, entry: Pick<Entry, "score_value" | "score_display">): string {
  // This captured benchmark stores fractions even though its source label is a percentage.
  // Format at the view boundary, preserving the captured values and their sort order.
  if (evaluation.id === terminalBenchEvaluationId) return `${(entry.score_value * 100).toFixed(2)}%`;
  if (evaluation.id === "intelligence-index" || evaluation.id === "swe-atlas-qna-aa" || evaluation.id === omniscienceBusinessEvaluationId) {
    return entry.score_value.toFixed(4);
  }
  return entry.score_display;
}
