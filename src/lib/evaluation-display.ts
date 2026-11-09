import type { Entry, Evaluation } from "./contract";

export function evaluationScoreDisplay(evaluation: Pick<Evaluation, "id">, entry: Pick<Entry, "score_value" | "score_display">): string {
  // This captured benchmark stores fractions even though its source label is a percentage.
  // Format at the view boundary, preserving the captured values and their sort order.
  return evaluation.id === "terminal-bench-4-0" ? `${(entry.score_value * 100).toFixed(2)}%` : entry.score_display;
}
