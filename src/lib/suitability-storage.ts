import { z } from "zod";
import { suitabilityTaskSchema, type SuitabilityCandidate, type SuitabilityEntry } from "./suitability";
import type { Evaluation } from "./contract";

export type PlannerData = { evaluations: Evaluation[]; entries: SuitabilityEntry[]; candidates: SuitabilityCandidate[]; availableSnapshotIds: string[] };
export const savedComparisonSchema = z.object({
  task: suitabilityTaskSchema,
  evaluations: z.array(z.object({ id: z.string(), slug: z.string(), display_name: z.string(), category: z.string(), metric_label: z.string(), captured_at: z.string(), published_snapshot_id: z.string(), row_count: z.number() }).passthrough()),
  entries: z.array(z.object({ id: z.string(), evaluation_id: z.string(), snapshot_id: z.string(), model_id: z.string(), source_rank: z.number().int().positive(), source_row: z.number().int(), identity_key: z.string().optional(), model: z.string().optional(), scoring_status: z.string().nullable().optional() })),
  candidates: z.array(z.object({ model_id: z.string(), model: z.string(), provider: z.string(), source_model_ids: z.array(z.string()).optional() })),
  availableSnapshotIds: z.array(z.string()),
});
export type SavedComparison = PlannerData & { task: z.infer<typeof suitabilityTaskSchema> };
export const TASK_STORAGE_KEY = "model-benchmarks:suitability:v1";
export function readSavedTasks(raw: string | null): SavedComparison[] {
  if (!raw) return [];
  const parsed = z.array(savedComparisonSchema).parse(JSON.parse(raw));
  return parsed as SavedComparison[];
}

/** Cache authoritative pinned inputs, not derived scores, for reloads after a dataset update. */
export function pinComparison(task: SavedComparison["task"], data: PlannerData): SavedComparison {
  const pairs = new Set(task.evaluation_weights.map(w => `${w.evaluation_id}\0${w.snapshot_id}`));
  const ids = new Set(task.evaluation_weights.map(w => w.evaluation_id));
  return { task, evaluations: data.evaluations.filter(e => ids.has(e.id)),
    entries: data.entries.filter(e => pairs.has(`${e.evaluation_id}\0${e.snapshot_id}`)),
    candidates: data.candidates.filter(c => task.candidate_model_ids.includes(c.model_id)),
    availableSnapshotIds: [...new Set(task.evaluation_weights.map(w => w.snapshot_id))] };
}
