import { z } from "zod";
import { evaluationWeightSchema, suitabilityTaskSchema, type SuitabilityCandidate, type SuitabilityEntry } from "./suitability";
import type { Evaluation } from "./contract";

const plannerEvaluationSchema = z.object({ id: z.string(), slug: z.string(), display_name: z.string(), category: z.string(), metric_label: z.string(), captured_at: z.string(), published_snapshot_id: z.string(), row_count: z.number() }).passthrough();
export const suitabilityCategorySchema = z.object({
  id: z.string().min(1), name: z.string().min(1), normalized_name: z.string().min(1),
  created_at: z.string().datetime(), updated_at: z.string().datetime(),
});
export type SuitabilityCategory = z.infer<typeof suitabilityCategorySchema>;
export type PlannerEvaluation = z.infer<typeof plannerEvaluationSchema>;
export type PlannerData = { evaluations: PlannerEvaluation[]; entries: SuitabilityEntry[]; candidates: SuitabilityCandidate[]; availableSnapshotIds: string[] };
const savedTaskPreviewSchema = z.object({
  model_id: z.string(), model: z.string(), provider: z.string(), score: z.number().nullable(),
  intelligence_index_cost: z.object({ slug: z.string(), cost_usd: z.number().nonnegative(), url: z.string().url(), captured_at: z.string().min(1) }).nullable(),
});
export type SavedTaskPreview = z.infer<typeof savedTaskPreviewSchema>;
const savedTaskSummaryTaskSchema = z.object({
  id: z.string(), title: z.string(), request: z.string(),
  evaluation_weights: z.array(evaluationWeightSchema),
  created_at: z.string().datetime(), updated_at: z.string().datetime(),
  category_id: z.string().nullable().optional(), category_name: z.string().nullable().optional(),
  category_revision: z.number().int().nonnegative().optional(),
});
const savedTaskSummaryEvaluationSchema = z.object({ id: z.string(), display_name: z.string() });
export const savedTaskSummarySchema = z.object({
  task: savedTaskSummaryTaskSchema,
  candidate_count: z.number().int().nonnegative(),
  evaluations: z.array(savedTaskSummaryEvaluationSchema),
  preview: savedTaskPreviewSchema.nullable().optional(),
});
export type SavedTaskSummary = z.infer<typeof savedTaskSummarySchema>;
export const savedComparisonSchema = z.object({
  task: suitabilityTaskSchema,
  category_id: z.string().nullable().optional(), category_name: z.string().nullable().optional(),
  category_revision: z.number().int().nonnegative().optional(),
  evaluations: z.array(plannerEvaluationSchema),
  entries: z.array(z.object({ id: z.string(), evaluation_id: z.string(), snapshot_id: z.string(), model_id: z.string(), source_rank: z.number().int().positive(), source_row: z.number().int(), identity_key: z.string().optional(), model: z.string().optional(), scoring_status: z.string().nullable().optional(), cost_usd: z.number().nonnegative().nullable().optional(), cost_display: z.string().nullable().optional(), cost_status: z.enum(["exact", "bound", "missing"]).optional() })),
  candidates: z.array(z.object({ model_id: z.string(), model: z.string(), provider: z.string(), identity_key: z.string().optional(), source_model_ids: z.array(z.string()).optional(), intelligence_index_cost: z.object({ slug: z.string(), cost_usd: z.number().nonnegative(), url: z.string().url(), captured_at: z.string().min(1) }).nullable().optional() })),
  availableSnapshotIds: z.array(z.string()),
});
export type SavedComparison = PlannerData & {
  task: z.infer<typeof suitabilityTaskSchema>;
  category_id?: string | null;
  category_name?: string | null;
  category_revision?: number;
};
export const TASK_STORAGE_KEY = "model-benchmarks:suitability:v1";
export function readSavedTasks(raw: string | null): SavedComparison[] {
  if (!raw) return [];
  const parsed = z.array(savedComparisonSchema).parse(JSON.parse(raw));
  return parsed as SavedComparison[];
}
export function readSavedTaskSummaries(raw: string | null): SavedTaskSummary[] {
  if (!raw) return [];
  return z.array(savedTaskSummarySchema).parse(JSON.parse(raw));
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
