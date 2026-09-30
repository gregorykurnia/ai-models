import { z } from "zod";

export const SUITABILITY_EVENT_NAMES = [
  "planner_opened",
  "task_saved",
  "evaluations_selected",
  "weight_validation_failed",
  "comparison_calculated",
  "complete_coverage_filter_used",
  "result_breakdown_opened",
  "source_leaderboard_opened",
] as const;
export type SuitabilityEventName = typeof SUITABILITY_EVENT_NAMES[number];
export const SUITABILITY_EVENTS_KEY = "model-benchmarks:planner-events:v1";
const aggregateSchema = z.object({
  version: z.literal(1), counts: z.partialRecord(z.enum(SUITABILITY_EVENT_NAMES), z.number().int().nonnegative()),
});

/** Device-local event totals only. No event properties, identifiers, or task data are saved or sent.
 * The app currently has no central telemetry service configured.
 */
export function recordSuitabilityEvent(event: SuitabilityEventName): void {
  try {
    const raw = localStorage.getItem(SUITABILITY_EVENTS_KEY);
    const parsed = raw ? aggregateSchema.safeParse(JSON.parse(raw)) : null;
    const counts: Partial<Record<SuitabilityEventName, number>> = parsed?.success ? { ...parsed.data.counts } : {};
    counts[event] = Math.min(Number.MAX_SAFE_INTEGER, (counts[event] ?? 0) + 1);
    localStorage.setItem(SUITABILITY_EVENTS_KEY, JSON.stringify({ version: 1, counts }));
  } catch {
    // Telemetry storage is optional; it must not interfere with planner use or task saves.
  }
}

export function readSuitabilityEventCounts(raw: string | null): Partial<Record<SuitabilityEventName, number>> {
  if (!raw) return {};
  try {
    const result = aggregateSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data.counts : {};
  } catch { return {}; }
}
