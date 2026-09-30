import { z } from "zod";
import type { Entry, Evaluation } from "./contract";

export const evaluationWeightSchema = z.object({
  evaluation_id: z.string().min(1), weight: z.number().finite().nonnegative(),
  snapshot_id: z.string().min(1), captured_at: z.string().min(1),
});
export const suitabilityTaskSchema = z.object({
  id: z.string().min(1), title: z.string().trim().min(1), request: z.string().trim().min(1),
  evaluation_weights: z.array(evaluationWeightSchema).min(1),
  candidate_model_ids: z.array(z.string().min(1)).min(1),
  score_method: z.literal("rank_percentile_v1"),
  missing_policy: z.literal("exclude_and_show_coverage"),
  created_at: z.string().datetime(), updated_at: z.string().datetime(),
  last_calculated_at: z.string().datetime(), schema_version: z.literal(1),
}).superRefine((task, ctx) => {
  const total = task.evaluation_weights.reduce((sum, e) => sum + e.weight, 0);
  if (Math.abs(total - 100) > 0.000001) ctx.addIssue({ code: "custom", message: "Weights must total 100%" });
  if (new Set(task.evaluation_weights.map(e => e.evaluation_id)).size !== task.evaluation_weights.length)
    ctx.addIssue({ code: "custom", message: "Evaluations must be unique" });
  if (new Set(task.candidate_model_ids).size !== task.candidate_model_ids.length)
    ctx.addIssue({ code: "custom", message: "Candidates must be unique" });
});
export type SuitabilityTask = z.infer<typeof suitabilityTaskSchema>;
export type EvaluationWeight = z.infer<typeof evaluationWeightSchema>;
export type SuitabilityCandidate = { model_id: string; model: string; provider: string; source_model_ids?: string[] };
export type SuitabilityEntry = Pick<Entry, "id" | "evaluation_id" | "snapshot_id" | "model_id" | "source_rank" | "source_row"> & {
  identity_key?: string; model?: string; scoring_status?: string | null;
};
export type SuitabilityBreakdown = EvaluationWeight & {
  source_rank: number | null; cohort_size: number; component_score: number | null;
  source_model: string | null; scoring_status: string | null;
  /** Score points after renormalizing over this candidate's available weight. */
  contribution: number | null;
};
export type SuitabilityResult = SuitabilityCandidate & {
  score: number | null; weighted_average_rank: number | null;
  ranked_evaluations: number; selected_evaluations: number;
  covered_weight: number; total_weight: number; coverage_percent: number;
  complete_coverage: boolean; breakdown: SuitabilityBreakdown[];
};

export function rankComponent(rank: number, cohortSize: number): number {
  if (!Number.isInteger(rank) || rank < 1 || !Number.isInteger(cohortSize) || cohortSize < 1)
    throw new Error("Rank and cohort size must be positive integers");
  return Math.max(0, Math.min(100, 100 * (1 - (rank - 1) / Math.max(1, cohortSize - 1))));
}

/** Pure calculation. Entries must include the full cohort for each pinned snapshot.
 * An unavailable snapshot is an error, never a fallback to current data.
 * Empty cohorts are allowed only when explicitly listed in availableSnapshotIds.
 */
export function calculateSuitability(input: {
  evaluations: Pick<Evaluation, "id">[]; entries: SuitabilityEntry[]; weights: EvaluationWeight[];
  candidates: SuitabilityCandidate[]; availableSnapshotIds: string[];
}): SuitabilityResult[] {
  const weights = z.array(evaluationWeightSchema).min(1).parse(input.weights);
  const total = weights.reduce((sum, e) => sum + e.weight, 0);
  if (!Number.isFinite(total) || total <= 0) throw new Error("Total weight must be positive and finite");
  if (new Set(weights.map(e => e.evaluation_id)).size !== weights.length) throw new Error("Duplicate evaluation");
  if (new Set(input.candidates.map(c => c.model_id)).size !== input.candidates.length) throw new Error("Duplicate candidate");
  const cohorts = weights.map(weight => {
    if (!input.evaluations.some(e => e.id === weight.evaluation_id)) throw new Error(`Unknown evaluation: ${weight.evaluation_id}`);
    if (!input.availableSnapshotIds.includes(weight.snapshot_id)) throw new Error(`Pinned snapshot unavailable: ${weight.snapshot_id}`);
    const rows = input.entries.filter(e => e.evaluation_id === weight.evaluation_id && e.snapshot_id === weight.snapshot_id)
      .sort((a, b) => a.source_rank - b.source_rank || a.source_row - b.source_row || a.id.localeCompare(b.id));
    const accepted = new Map<string, SuitabilityEntry>();
    for (const row of rows) {
      const key = row.identity_key ?? row.model_id;
      if (!accepted.has(key)) accepted.set(key, row);
    }
    const byModelId = new Map<string, SuitabilityEntry>();
    for (const row of rows) byModelId.set(row.model_id, accepted.get(row.identity_key ?? row.model_id)!);
    return { weight, accepted, byModelId };
  });
  return input.candidates.map(candidate => {
    const breakdown: SuitabilityBreakdown[] = cohorts.map(({ weight, accepted, byModelId }) => {
      const entry = [candidate.model_id, ...(candidate.source_model_ids ?? [])].flatMap(id => {
        const row = byModelId.get(id); return row ? [row] : [];
      }).sort((a, b) => a.source_rank - b.source_rank || a.source_row - b.source_row || a.id.localeCompare(b.id))[0];
      return { ...weight, source_rank: entry?.source_rank ?? null, cohort_size: accepted.size,
        source_model: entry?.model ?? null, scoring_status: entry?.scoring_status ?? null,
        component_score: entry ? rankComponent(entry.source_rank, accepted.size) : null, contribution: null };
    });
    const available = breakdown.filter(b => b.source_rank !== null);
    const covered = available.reduce((sum, b) => sum + b.weight, 0);
    for (const b of available) b.contribution = covered > 0 ? b.component_score! * b.weight / covered : null;
    return { ...candidate, score: covered > 0 ? available.reduce((sum, b) => sum + b.contribution!, 0) : null,
      weighted_average_rank: covered > 0 ? available.reduce((sum, b) => sum + b.source_rank! * b.weight, 0) / covered : null,
      ranked_evaluations: available.length, selected_evaluations: weights.length,
      covered_weight: covered, total_weight: total, coverage_percent: covered / total * 100,
      complete_coverage: breakdown.every(b => b.weight === 0 || b.source_rank !== null), breakdown };
  }).sort((a, b) => Number(b.complete_coverage) - Number(a.complete_coverage)
    || (b.score ?? -Infinity) - (a.score ?? -Infinity)
    || b.coverage_percent - a.coverage_percent
    || (a.weighted_average_rank ?? Infinity) - (b.weighted_average_rank ?? Infinity)
    || a.model.localeCompare(b.model) || a.provider.localeCompare(b.provider) || a.model_id.localeCompare(b.model_id));
}
