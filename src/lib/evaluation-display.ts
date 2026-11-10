import type { Entry, Evaluation } from "./contract";

export function evaluationScoreDisplay(evaluation: Pick<Evaluation, "id">, entry: Pick<Entry, "score_value" | "score_display">): string {
  // This captured benchmark stores fractions even though its source label is a percentage.
  // Format at the view boundary, preserving the captured values and their sort order.
  if (evaluation.id === "terminal-bench-4-0") return `${(entry.score_value * 100).toFixed(2)}%`;
  if (evaluation.id === "intelligence-index") return entry.score_value.toFixed(4);
  return entry.score_display;
}
