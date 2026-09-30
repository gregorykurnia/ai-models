import type { Entry, Evaluation } from "./contract";
import { masterIdentityKey } from "./master";
import type { PlannerData } from "./suitability-storage";
import type { SuitabilityCandidate } from "./suitability";

/** Match the master's known label aliases without rewriting source IDs or snapshots.
 * A deterministic representative existing model_id identifies each selectable variant.
 * Pin all alias IDs and identity keys alongside the rows when saving a task.
 */
export function buildPlannerData(evaluations: Evaluation[], sourceEntries: Entry[]): PlannerData {
  const published = new Map(evaluations.map(e => [e.id, e.published_snapshot_id]));
  const rows = sourceEntries.filter(e => published.get(e.evaluation_id) === e.snapshot_id);
  const candidates = new Map<string, SuitabilityCandidate>();
  for (const entry of [...rows].sort((a, b) => a.model_id.localeCompare(b.model_id) || a.id.localeCompare(b.id))) {
    const identity = masterIdentityKey(entry.provider, entry.model);
    let candidate = candidates.get(identity);
    if (!candidate) {
      candidate = { model_id: entry.model_id, model: entry.model, provider: entry.provider, source_model_ids: [] };
      candidates.set(identity, candidate);
    }
    if (!candidate.source_model_ids!.includes(entry.model_id)) candidate.source_model_ids!.push(entry.model_id);
  }
  return {
    evaluations,
    entries: rows.map(({ id, evaluation_id, snapshot_id, model_id, source_rank, source_row, provider, model, scoring_status }) =>
      ({ id, evaluation_id, snapshot_id, model_id, source_rank, source_row, model, scoring_status,
        identity_key: candidates.get(masterIdentityKey(provider, model))!.model_id })),
    candidates: [...candidates.values()].sort((a, b) => a.model.localeCompare(b.model) || a.provider.localeCompare(b.provider) || a.model_id.localeCompare(b.model_id)),
    availableSnapshotIds: evaluations.map(e => e.published_snapshot_id),
  };
}
